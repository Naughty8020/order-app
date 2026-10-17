package user

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	userusecase "order-system/usecase/user"
	"strings"
	"testing"
)

type loginStub struct {
	login func(string, string) (string, error)
}

func (s loginStub) Login(name, password string) (string, error) { return s.login(name, password) }

func TestLoginHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name, body string
		usecaseErr error
		wantStatus int
		wantBody   map[string]string
		wantCalls  int
	}{
		{"成功", `{"userName":"admin","password":"password"}`, nil, 200, map[string]string{"token": "signed-token"}, 1},
		{"不正JSON", `{`, nil, 400, map[string]string{"error": "username and password are required"}, 0},
		{"空の本文", ``, nil, 400, map[string]string{"error": "username and password are required"}, 0},
		{"ユーザー名なし", `{"password":"password"}`, nil, 400, map[string]string{"error": "username and password are required"}, 0},
		{"パスワードなし", `{"userName":"admin"}`, nil, 400, map[string]string{"error": "username and password are required"}, 0},
		{"空のユーザー名", `{"userName":"","password":"password"}`, nil, 400, map[string]string{"error": "username and password are required"}, 0},
		{"空のパスワード", `{"userName":"admin","password":""}`, nil, 400, map[string]string{"error": "username and password are required"}, 0},
		{"型が不正", `{"userName":42,"password":"password"}`, nil, 400, map[string]string{"error": "username and password are required"}, 0},
		{"認証失敗", `{"userName":"admin","password":"password"}`, userusecase.ErrInvalidCredentials, 401, map[string]string{"error": "invalid username or password"}, 1},
		{"ラップされた認証失敗", `{"userName":"admin","password":"password"}`, fmt.Errorf("login: %w", userusecase.ErrInvalidCredentials), 401, map[string]string{"error": "invalid username or password"}, 1},
		{"内部エラーの詳細を隠す", `{"userName":"admin","password":"password"}`, errors.New("private database details"), 500, map[string]string{"error": "internal server error"}, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			handler := NewUserHandler(loginStub{login: func(name, password string) (string, error) {
				calls++
				if name != "admin" || password != "password" {
					t.Errorf("unexpected credentials: %q / %q", name, password)
				}
				return "signed-token", tt.usecaseErr
			}})
			router := gin.New()
			router.POST("/login", handler.Login)
			request := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(tt.body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", response.Code, tt.wantStatus, response.Body.String())
			}
			var body map[string]string
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if len(body) != len(tt.wantBody) {
				t.Errorf("body = %v, want %v", body, tt.wantBody)
			}
			for key, want := range tt.wantBody {
				if body[key] != want {
					t.Errorf("body[%s] = %q, want %q", key, body[key], want)
				}
			}
			if calls != tt.wantCalls {
				t.Errorf("Login calls = %d, want %d", calls, tt.wantCalls)
			}
		})
	}
}
