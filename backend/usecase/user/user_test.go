package user

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"order-system/models"
)

type userRepositoryStub struct {
	find func(string) (*models.User, error)
}

func (r userRepositoryStub) FindByUserName(name string) (*models.User, error) { return r.find(name) }

func TestLogin(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	dbErr := errors.New("database unavailable")
	tests := []struct {
		name, password, hash, secret string
		findErr, wantErr             error
		wantMessage                  string
	}{
		{name: "ログイン成功", password: "correct-password", hash: string(hash), secret: "test-secret"},
		{name: "パスワード不一致", password: "wrong", hash: string(hash), secret: "test-secret", wantErr: ErrInvalidCredentials},
		{name: "空のパスワード", hash: string(hash), secret: "test-secret", wantErr: ErrInvalidCredentials},
		{name: "壊れたパスワードハッシュ", password: "correct-password", hash: "invalid", secret: "test-secret", wantErr: ErrInvalidCredentials},
		{name: "ユーザー不在", findErr: gorm.ErrRecordNotFound, wantErr: ErrInvalidCredentials},
		{name: "ラップされたユーザー不在", findErr: fmt.Errorf("lookup: %w", gorm.ErrRecordNotFound), wantErr: ErrInvalidCredentials},
		{name: "DB取得失敗", findErr: dbErr, wantErr: dbErr},
		{name: "署名鍵未設定", password: "correct-password", hash: string(hash), wantMessage: "JWT_SECRET is not set"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("JWT_SECRET", tt.secret)
			calls := 0
			repo := userRepositoryStub{find: func(name string) (*models.User, error) {
				calls++
				if name != "admin" {
					t.Errorf("username = %q, want admin", name)
				}
				if tt.findErr != nil {
					return nil, tt.findErr
				}
				return &models.User{ID: 42, UserName: name, PasswordHash: tt.hash}, nil
			}}
			before := time.Now().Unix()
			token, err := NewUserUsecase(repo).Login("admin", tt.password)
			after := time.Now().Unix()
			if calls != 1 {
				t.Errorf("repository calls = %d, want 1", calls)
			}
			if tt.wantMessage != "" {
				if err == nil || err.Error() != tt.wantMessage {
					t.Fatalf("error = %v, want %s", err, tt.wantMessage)
				}
			} else if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil || tt.wantMessage != "" {
				if token != "" {
					t.Error("失敗時にトークンが返された")
				}
				return
			}
			claims := &jwt.RegisteredClaims{}
			parsed, err := jwt.ParseWithClaims(token, claims, func(_ *jwt.Token) (any, error) { return []byte(tt.secret), nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
			if err != nil || !parsed.Valid {
				t.Fatalf("JWT validation failed: %v", err)
			}
			if claims.Subject != "42" {
				t.Errorf("subject = %q, want 42", claims.Subject)
			}
			if claims.IssuedAt == nil || claims.IssuedAt.Unix() < before || claims.IssuedAt.Unix() > after {
				t.Errorf("issued at = %v", claims.IssuedAt)
			}
			lifetime := int64((24 * time.Hour) / time.Second)
			if claims.ExpiresAt == nil || claims.ExpiresAt.Unix() < before+lifetime || claims.ExpiresAt.Unix() > after+lifetime {
				t.Errorf("expiry = %v, want 24 hours after login", claims.ExpiresAt)
			}
		})
	}
}
