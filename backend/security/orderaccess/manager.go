package orderaccess

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	ErrInvalidQRToken = errors.New("invalid or expired QR token")
	ErrInvalidSession = errors.New("invalid or expired order session")
	ErrRateLimited    = errors.New("order rate limit exceeded")
)

const (
	QRRotationInterval = 10 * time.Minute
	SessionLifetime    = 30 * time.Minute
	RateLimitWindow    = 10 * time.Minute
	MaxOrdersPerWindow = 3
)

type session struct {
	expiresAt   time.Time
	windowStart time.Time
	orderCount  int
}

type Manager struct {
	secret []byte
	now    func() time.Time

	mu       sync.Mutex
	sessions map[string]*session
}

func NewManager(secret string) *Manager {
	return &Manager{
		secret:   []byte(secret),
		now:      time.Now,
		sessions: make(map[string]*session),
	}
}

func (m *Manager) CurrentQRToken() (string, time.Time) {
	now := m.now()
	bucket := now.Unix() / int64(QRRotationInterval/time.Second)
	payload := strconv.FormatInt(bucket, 10)
	signature := m.sign(payload)
	expiresAt := time.Unix((bucket+1)*int64(QRRotationInterval/time.Second), 0)
	return payload + "." + signature, expiresAt
}

func (m *Manager) ExchangeQRToken(token string) (string, time.Time, error) {
	if !m.validateQRToken(token) {
		return "", time.Time{}, ErrInvalidQRToken
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", time.Time{}, err
	}

	sessionToken := base64.RawURLEncoding.EncodeToString(raw)
	now := m.now()
	expiresAt := now.Add(SessionLifetime)

	m.mu.Lock()
	m.sessions[sessionToken] = &session{
		expiresAt:   expiresAt,
		windowStart: now,
	}
	m.removeExpiredSessions(now)
	m.mu.Unlock()

	return sessionToken, expiresAt, nil
}

func (m *Manager) ConsumeOrder(sessionToken string) error {
	now := m.now()

	m.mu.Lock()
	defer m.mu.Unlock()

	s, ok := m.sessions[sessionToken]
	if !ok || !now.Before(s.expiresAt) {
		delete(m.sessions, sessionToken)
		return ErrInvalidSession
	}

	if now.Sub(s.windowStart) >= RateLimitWindow {
		s.windowStart = now
		s.orderCount = 0
	}
	if s.orderCount >= MaxOrdersPerWindow {
		return ErrRateLimited
	}

	s.orderCount++
	return nil
}

func (m *Manager) validateQRToken(token string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false
	}

	bucket, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return false
	}
	currentBucket := m.now().Unix() / int64(QRRotationInterval/time.Second)
	if bucket != currentBucket {
		return false
	}

	want := m.sign(parts[0])
	return hmac.Equal([]byte(parts[1]), []byte(want))
}

func (m *Manager) sign(payload string) string {
	mac := hmac.New(sha256.New, m.secret)
	_, _ = mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (m *Manager) removeExpiredSessions(now time.Time) {
	for token, s := range m.sessions {
		if !now.Before(s.expiresAt) {
			delete(m.sessions, token)
		}
	}
}
