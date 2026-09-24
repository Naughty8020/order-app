package orderaccess

import (
	"errors"
	"testing"
	"time"
)

func TestQRTokenRotationAndSessionRateLimit(t *testing.T) {
	now := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)
	manager := NewManager("test-secret")
	manager.now = func() time.Time { return now }

	qrToken, qrExpiresAt := manager.CurrentQRToken()
	if !qrExpiresAt.Equal(now.Add(QRRotationInterval)) {
		t.Fatalf("QR expiry = %v, want %v", qrExpiresAt, now.Add(QRRotationInterval))
	}

	sessionToken, sessionExpiresAt, err := manager.ExchangeQRToken(qrToken)
	if err != nil {
		t.Fatalf("ExchangeQRToken() error = %v", err)
	}
	if sessionToken == "" || !sessionExpiresAt.Equal(now.Add(SessionLifetime)) {
		t.Errorf("session token = %q, expiry = %v", sessionToken, sessionExpiresAt)
	}

	for i := 0; i < MaxOrdersPerWindow; i++ {
		if err := manager.ConsumeOrder(sessionToken); err != nil {
			t.Fatalf("ConsumeOrder() attempt %d error = %v", i+1, err)
		}
	}
	if err := manager.ConsumeOrder(sessionToken); !errors.Is(err, ErrRateLimited) {
		t.Errorf("ConsumeOrder() error = %v, want %v", err, ErrRateLimited)
	}

	now = now.Add(RateLimitWindow)
	if err := manager.ConsumeOrder(sessionToken); err != nil {
		t.Errorf("ConsumeOrder() after rate window error = %v", err)
	}
}

func TestExpiredQRTokenAndSessionAreRejected(t *testing.T) {
	now := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)
	manager := NewManager("test-secret")
	manager.now = func() time.Time { return now }

	qrToken, _ := manager.CurrentQRToken()
	sessionToken, _, err := manager.ExchangeQRToken(qrToken)
	if err != nil {
		t.Fatalf("ExchangeQRToken() error = %v", err)
	}

	now = now.Add(QRRotationInterval)
	if _, _, err := manager.ExchangeQRToken(qrToken); !errors.Is(err, ErrInvalidQRToken) {
		t.Errorf("expired QR error = %v, want %v", err, ErrInvalidQRToken)
	}

	now = now.Add(SessionLifetime)
	if err := manager.ConsumeOrder(sessionToken); !errors.Is(err, ErrInvalidSession) {
		t.Errorf("expired session error = %v, want %v", err, ErrInvalidSession)
	}
}

func TestTamperedQRTokenIsRejected(t *testing.T) {
	manager := NewManager("test-secret")
	token, _ := manager.CurrentQRToken()

	if _, _, err := manager.ExchangeQRToken(token + "tampered"); !errors.Is(err, ErrInvalidQRToken) {
		t.Errorf("ExchangeQRToken() error = %v, want %v", err, ErrInvalidQRToken)
	}
}
