package middleware

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"order-system/models"
)

func TestRequireAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "test-secret"
	tests := []struct {
		name, headerKind, subject   string
		missingSecret, missingAdmin bool
		count                       int64
		dbErr                       error
		wantQuery                   bool
		wantStatus                  int
		wantError                   string
	}{
		{name: "管理者は許可", subject: "42", count: 1, wantQuery: true, wantStatus: 200},
		{name: "小文字bearerも許可", headerKind: "lowercase", subject: "42", count: 1, wantQuery: true, wantStatus: 200},
		{name: "署名鍵未設定", missingSecret: true, wantStatus: 500, wantError: "login required"},
		{name: "管理者名未設定", missingAdmin: true, wantStatus: 500, wantError: "login required"},
		{name: "ヘッダーなし", headerKind: "missing", wantStatus: 401, wantError: "login require"},
		{name: "Bearerのみ", headerKind: "bare", wantStatus: 401, wantError: "login require"},
		{name: "Basic認証", headerKind: "basic", wantStatus: 401, wantError: "login require"},
		{name: "余分なフィールド", headerKind: "extra", wantStatus: 401, wantError: "login require"},
		{name: "壊れたJWT", headerKind: "malformed", wantStatus: 401, wantError: "invalid or expired token"},
		{name: "署名不一致", headerKind: "wrong-secret", subject: "42", wantStatus: 401, wantError: "invalid or expired token"},
		{name: "未許可の署名方式", headerKind: "hs384", subject: "42", wantStatus: 401, wantError: "invalid or expired token"},
		{name: "有効期限なし", headerKind: "no-expiry", subject: "42", wantStatus: 401, wantError: "invalid or expired token"},
		{name: "期限切れ", headerKind: "expired", subject: "42", wantStatus: 401, wantError: "invalid or expired token"},
		{name: "まだ利用できないJWT", headerKind: "future", subject: "42", wantStatus: 401, wantError: "invalid or expired token"},
		{name: "ユーザーIDなし", wantStatus: 401, wantError: "invalid token"},
		{name: "数値でないID", subject: "abc", wantStatus: 401, wantError: "invalid token"},
		{name: "IDがゼロ", subject: "0", wantStatus: 401, wantError: "invalid token"},
		{name: "負のID", subject: "-1", wantStatus: 401, wantError: "invalid token"},
		{name: "IDの桁あふれ", subject: "18446744073709551616", wantStatus: 401, wantError: "invalid token"},
		{name: "管理者ではない", subject: "42", wantQuery: true, wantStatus: 403, wantError: "admin access required"},
		{name: "管理者が複数一致", subject: "42", count: 2, wantQuery: true, wantStatus: 403, wantError: "admin access required"},
		{name: "DBエラー", subject: "42", dbErr: errors.New("private database details"), wantQuery: true, wantStatus: 500, wantError: "internal server error"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 接続もSQL実行も行わず、GORMの検索コールバックを代役に置き換える。
			db, err := gorm.Open(mysql.New(mysql.Config{DSN: "unused:unused@tcp(127.0.0.1:1)/unused", SkipInitializeWithVersion: true}), &gorm.Config{DisableAutomaticPing: true})
			if err != nil {
				t.Fatal(err)
			}
			sqlDB, err := db.DB()
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = sqlDB.Close() })
			queries := 0
			err = db.Callback().Query().Replace("gorm:query", func(tx *gorm.DB) {
				queries++
				if _, ok := tx.Statement.Model.(*models.User); !ok {
					t.Errorf("unexpected query model: %T", tx.Statement.Model)
				}
				want := clause.Where{Exprs: []clause.Expression{clause.Expr{SQL: "id = ? AND user_name = ?", Vars: []any{uint64(42), "admin"}}}}
				if !reflect.DeepEqual(tx.Statement.Clauses["WHERE"].Expression, want) {
					t.Errorf("管理者検索条件が不正: %#v", tx.Statement.Clauses["WHERE"].Expression)
				}
				if tt.dbErr != nil {
					tx.AddError(tt.dbErr)
					return
				}
				dest, ok := tx.Statement.Dest.(*int64)
				if !ok {
					t.Fatalf("unexpected destination: %T", tx.Statement.Dest)
				}
				*dest = tt.count
				tx.RowsAffected = 1
			})
			if err != nil {
				t.Fatal(err)
			}
			claims := jwt.RegisteredClaims{Subject: tt.subject, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}
			key := secret
			var method jwt.SigningMethod = jwt.SigningMethodHS256
			switch tt.headerKind {
			case "wrong-secret":
				key = "different-secret"
			case "hs384":
				method = jwt.SigningMethodHS384
			case "no-expiry":
				claims.ExpiresAt = nil
			case "expired":
				claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Hour))
			case "future":
				claims.NotBefore = jwt.NewNumericDate(time.Now().Add(time.Hour))
			}
			token, err := jwt.NewWithClaims(method, claims).SignedString([]byte(key))
			if err != nil {
				t.Fatal(err)
			}
			header := "Bearer " + token
			switch tt.headerKind {
			case "missing":
				header = ""
			case "bare":
				header = "Bearer"
			case "basic":
				header = "Basic " + token
			case "extra":
				header += " extra"
			case "malformed":
				header = "Bearer invalid"
			case "lowercase":
				header = "bearer " + token
			}
			configuredSecret, admin := secret, "admin"
			if tt.missingSecret {
				configuredSecret = ""
			}
			if tt.missingAdmin {
				admin = ""
			}
			middleware := NewAuthMiddleware(db, configuredSecret, admin)
			nextCalls := 0
			router := gin.New()
			router.GET("/admin", middleware.RequireAdmin, func(c *gin.Context) { nextCalls++; c.JSON(200, gin.H{"result": "ok"}) })
			request := httptest.NewRequest(http.MethodGet, "/admin", nil)
			request.Header.Set("Authorization", header)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, tt.wantStatus, response.Body.String())
			}
			var body map[string]string
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			wantBody, wantNext := map[string]string{"result": "ok"}, 1
			if tt.wantError != "" {
				wantBody, wantNext = map[string]string{"error": tt.wantError}, 0
			}
			if !reflect.DeepEqual(body, wantBody) {
				t.Errorf("body = %v, want %v", body, wantBody)
			}
			wantQueries := 0
			if tt.wantQuery {
				wantQueries = 1
			}
			if queries != wantQueries || nextCalls != wantNext {
				t.Errorf("queries = %d, next calls = %d; want %d, %d", queries, nextCalls, wantQueries, wantNext)
			}
		})
	}
}
