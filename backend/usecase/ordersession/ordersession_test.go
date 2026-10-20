package ordersession

import (
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"testing"
	"time"

	"order-system/domain/repository"
	"order-system/models"
)

// DBの代役。設定していないメソッドが呼ばれた場合もテストを失敗させる。
type sessionRepositoryStub struct {
	createFn func(*models.OrderSession) error
	findFn   func(string) (*models.OrderSession, error)
	saveFn   func(*models.OrderSession) error
	deleteFn func() error
}

func (r *sessionRepositoryStub) Create(s *models.OrderSession) error { return r.createFn(s) }
func (r *sessionRepositoryStub) FindByTokenHash(hash string) (*models.OrderSession, error) {
	return r.findFn(hash)
}
func (r *sessionRepositoryStub) Save(s *models.OrderSession) error { return r.saveFn(s) }
func (r *sessionRepositoryStub) DeleteExpired() error              { return r.deleteFn() }

func TestExchangeQRToken(t *testing.T) {
	dbErr := errors.New("create failed")
	tests := []struct {
		name       string
		tokenKind  string
		createErr  error
		wantErr    error
		wantCreate bool
	}{
		{name: "有効なQRからセッションを発行", tokenKind: "valid", wantCreate: true},
		{name: "空のトークン", tokenKind: "empty", wantErr: ErrInvalidQRToken},
		{name: "区切りなし", tokenKind: "malformed", wantErr: ErrInvalidQRToken},
		{name: "区切りが多い", tokenKind: "extra", wantErr: ErrInvalidQRToken},
		{name: "時刻が数値ではない", tokenKind: "non-numeric", wantErr: ErrInvalidQRToken},
		{name: "署名の改ざん", tokenKind: "tampered", wantErr: ErrInvalidQRToken},
		{name: "別の秘密鍵", tokenKind: "other-secret", wantErr: ErrInvalidQRToken},
		{name: "前の時間枠", tokenKind: "expired", wantErr: ErrInvalidQRToken},
		{name: "未来の時間枠", tokenKind: "future", wantErr: ErrInvalidQRToken},
		{name: "DB保存失敗", tokenKind: "valid", createErr: dbErr, wantErr: dbErr, wantCreate: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 時計を固定し、QR更新の境界でも結果を安定させる。
			var saved *models.OrderSession
			calls := 0
			repo := &sessionRepositoryStub{createFn: func(s *models.OrderSession) error {
				calls++
				copy := *s
				saved = &copy
				return tt.createErr
			}}
			uc := NewOrderAccessUsecase(repo, "test-secret")
			now := time.Date(2026, 10, 11, 12, 5, 0, 0, time.UTC)
			uc.now = func() time.Time { return now }
			qr, _ := uc.CurrentQRToken()
			switch tt.tokenKind {
			case "empty":
				qr = ""
			case "malformed":
				qr = "invalid"
			case "extra":
				qr += ".extra"
			case "non-numeric":
				qr = "abc.signature"
			case "tampered":
				qr += "modified"
			case "other-secret":
				other := NewOrderAccessUsecase(repo, "other-secret")
				other.now = uc.now
				qr, _ = other.CurrentQRToken()
			case "expired", "future":
				bucket := now.Unix() / int64(QRRotationInterval/time.Second)
				if tt.tokenKind == "expired" {
					bucket--
				} else {
					bucket++
				}
				payload := fmt.Sprint(bucket)
				qr = payload + "." + uc.sign(payload)
			}

			token, expiresAt, err := uc.ExchangeQRToken(qr)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			wantCalls := 0
			if tt.wantCreate {
				wantCalls = 1
			}
			if calls != wantCalls {
				t.Fatalf("Create calls = %d, want %d", calls, wantCalls)
			}
			if tt.wantErr != nil {
				if token != "" || !expiresAt.IsZero() {
					t.Fatal("失敗時にセッションを返している")
				}
				return
			}
			raw, err := base64.RawURLEncoding.DecodeString(token)
			if err != nil || len(raw) != 32 {
				t.Fatalf("invalid session token: %q", token)
			}
			hash := sha256.Sum256([]byte(token))
			if saved.TokenHash != base64.RawURLEncoding.EncodeToString(hash[:]) {
				t.Fatal("DBに保存するトークンのハッシュが不正")
			}
			if !expiresAt.Equal(now.Add(30*time.Minute)) || !saved.ExpiresAt.Equal(expiresAt) {
				t.Fatal("セッションの有効期限が不正")
			}
			if saved.OrderCount != 0 || !saved.WindowStart.Equal(now) {
				t.Fatalf("初期状態が不正: %+v", saved)
			}
		})
	}
}

func TestConsumeOrder(t *testing.T) {
	dbErr := errors.New("database failed")
	tests := []struct {
		name                      string
		count                     int
		expiresIn, windowAge      time.Duration
		findErr, saveErr, wantErr error
		wantSave                  bool
		wantCount                 int
		wantReset                 bool
	}{
		{name: "1回目は成功", expiresIn: time.Minute, wantSave: true, wantCount: 1},
		{name: "3回目は成功", count: 2, expiresIn: time.Minute, wantSave: true, wantCount: 3},
		{name: "4回目は拒否", count: 3, expiresIn: time.Minute, wantErr: ErrRateLimited},
		{name: "10分直前はリセットしない", count: 3, expiresIn: time.Minute, windowAge: 10*time.Minute - time.Nanosecond, wantErr: ErrRateLimited},
		{name: "10分ちょうどでリセット", count: 3, expiresIn: time.Minute, windowAge: 10 * time.Minute, wantSave: true, wantCount: 1, wantReset: true},
		{name: "10分経過後にリセット", count: 3, expiresIn: time.Minute, windowAge: 11 * time.Minute, wantSave: true, wantCount: 1, wantReset: true},
		{name: "期限直前は成功", expiresIn: time.Nanosecond, wantSave: true, wantCount: 1},
		{name: "期限ちょうどは拒否", wantErr: ErrInvalidSession},
		{name: "期限切れは拒否", expiresIn: -time.Minute, wantErr: ErrInvalidSession},
		{name: "回数枠が過ぎても期限切れは拒否", count: 3, expiresIn: -time.Minute, windowAge: 11 * time.Minute, wantErr: ErrInvalidSession},
		{name: "存在しないセッション", findErr: repository.ErrNotFound, wantErr: ErrInvalidSession},
		{name: "ラップされた未検出エラー", findErr: fmt.Errorf("lookup: %w", repository.ErrNotFound), wantErr: ErrInvalidSession},
		{name: "DB取得失敗", findErr: dbErr, wantErr: dbErr},
		{name: "DB保存失敗", expiresIn: time.Minute, saveErr: dbErr, wantErr: dbErr, wantSave: true, wantCount: 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			now := time.Date(2026, 10, 11, 12, 5, 0, 0, time.UTC)
			session := models.OrderSession{OrderCount: tt.count, ExpiresAt: now.Add(tt.expiresIn), WindowStart: now.Add(-tt.windowAge)}
			original := session
			findCalls, saveCalls := 0, 0
			repo := &sessionRepositoryStub{
				findFn: func(hash string) (*models.OrderSession, error) {
					findCalls++
					expected := sha256.Sum256([]byte("session-token"))
					if hash != base64.RawURLEncoding.EncodeToString(expected[:]) {
						t.Fatal("検索にトークンのハッシュを使用していない")
					}
					if tt.findErr != nil {
						return nil, tt.findErr
					}
					return &session, nil
				},
				saveFn: func(s *models.OrderSession) error {
					saveCalls++
					if s.OrderCount != tt.wantCount {
						t.Errorf("saved count = %d, want %d", s.OrderCount, tt.wantCount)
					}
					wantStart := original.WindowStart
					if tt.wantReset {
						wantStart = now
					}
					if !s.WindowStart.Equal(wantStart) {
						t.Errorf("window start = %v, want %v", s.WindowStart, wantStart)
					}
					if !s.ExpiresAt.Equal(original.ExpiresAt) {
						t.Error("注文によって有効期限が変更された")
					}
					return tt.saveErr
				},
			}

			uc := NewOrderAccessUsecase(repo, "test-secret")
			uc.now = func() time.Time { return now }
			err := uc.ConsumeOrder("session-token")

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			wantSaveCalls := 0
			if tt.wantSave {
				wantSaveCalls = 1
			}
			if findCalls != 1 || saveCalls != wantSaveCalls {
				t.Errorf("Find calls = %d, Save calls = %d; want 1, %d", findCalls, saveCalls, wantSaveCalls)
			}
			if !tt.wantSave && session != original {
				t.Error("拒否された注文でセッションが変更された")
			}
		})
	}
}

func TestRefundOrder(t *testing.T) {
	dbErr := errors.New("database failed")
	for _, tt := range []struct {
		name      string
		count     int
		findErr   error
		saveErr   error
		wantErr   error
		wantSave  bool
		wantCount int
	}{
		{name: "予約した1回を戻す", count: 3, wantSave: true, wantCount: 2},
		{name: "0回なら変更しない", count: 0},
		{name: "存在しないセッション", findErr: repository.ErrNotFound, wantErr: ErrInvalidSession},
		{name: "DB取得失敗", findErr: dbErr, wantErr: dbErr},
		{name: "DB保存失敗", count: 1, saveErr: dbErr, wantErr: dbErr, wantSave: true, wantCount: 0},
	} {
		t.Run(tt.name, func(t *testing.T) {
			session := models.OrderSession{OrderCount: tt.count}
			saveCalls := 0
			repo := &sessionRepositoryStub{
				findFn: func(string) (*models.OrderSession, error) {
					if tt.findErr != nil {
						return nil, tt.findErr
					}
					return &session, nil
				},
				saveFn: func(saved *models.OrderSession) error {
					saveCalls++
					if saved.OrderCount != tt.wantCount {
						t.Errorf("saved count = %d, want %d", saved.OrderCount, tt.wantCount)
					}
					return tt.saveErr
				},
			}
			err := NewOrderAccessUsecase(repo, "test-secret").RefundOrder("session-token")
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			wantSaveCalls := 0
			if tt.wantSave {
				wantSaveCalls = 1
			}
			if saveCalls != wantSaveCalls {
				t.Errorf("Save calls = %d, want %d", saveCalls, wantSaveCalls)
			}
		})
	}
}

func TestQRRotation(t *testing.T) {
	for _, tt := range []struct {
		name      string
		offset    time.Duration
		wantValid bool
	}{
		{"期限の1ナノ秒前", -time.Nanosecond, true},
		{"期限ちょうど", 0, false},
		{"期限の1ナノ秒後", time.Nanosecond, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			uc := NewOrderAccessUsecase(nil, "test-secret")
			now := time.Date(2026, 10, 11, 12, 5, 0, 0, time.UTC)
			uc.now = func() time.Time { return now }
			token, expiresAt := uc.CurrentQRToken()
			wantExpiry := now.Truncate(10 * time.Minute).Add(10 * time.Minute)
			if !expiresAt.Equal(wantExpiry) {
				t.Fatalf("expiry = %v, want %v", expiresAt, wantExpiry)
			}
			now = expiresAt.Add(tt.offset)
			if got := uc.validateQRToken(token); got != tt.wantValid {
				t.Errorf("valid = %v, want %v", got, tt.wantValid)
			}
			next, _ := uc.CurrentQRToken()
			if (next == token) != tt.wantValid {
				t.Error("QRの更新タイミングが不正")
			}
		})
	}
}

func TestDeleteExpiredSessions(t *testing.T) {
	for _, wantErr := range []error{nil, errors.New("delete failed")} {
		t.Run(fmt.Sprint(wantErr), func(t *testing.T) {
			calls := 0
			repo := &sessionRepositoryStub{deleteFn: func() error { calls++; return wantErr }}
			err := NewOrderAccessUsecase(repo, "test-secret").DeleteExpiredSessions()
			if !errors.Is(err, wantErr) || calls != 1 {
				t.Errorf("error = %v, calls = %d; want %v, 1", err, calls, wantErr)
			}
		})
	}
}
