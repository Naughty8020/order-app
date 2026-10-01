package ordersession

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"order-system/domain/repository"
	"order-system/models"
	"strconv"
	"strings"
	"time"
)

type OrderAccessUsecase interface {
	CurrentQRToken() (string, time.Time)
	ExchangeQRToken(qrToken string) (string, time.Time, error)
	ConsumeOrder(sessionToken string) error
	DeleteExpiredSessions() error
}

type orderAccessUsecase struct {
	repo   repository.OrderSessionRepository
	secret []byte
}

func NewOrderAccessUsecase(repo repository.OrderSessionRepository, secret string) *orderAccessUsecase {
	return &orderAccessUsecase{repo: repo, secret: []byte(secret)}
}

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

func (u *orderAccessUsecase) CurrentQRToken() (string, time.Time) {
	now := time.Now()

	bucket := now.Unix() / int64(QRRotationInterval/time.Second)

	payload := strconv.FormatInt(bucket, 10)
	signature := u.sign(payload)

	expiresAt := time.Unix(
		(bucket+1)*int64(QRRotationInterval/time.Second),
		0,
	)

	return payload + "." + signature, expiresAt
}

func (u *orderAccessUsecase) ExchangeQRToken(
	qrToken string,
) (string, time.Time, error) {

	if !u.validateQRToken(qrToken) {
		return "", time.Time{}, ErrInvalidQRToken
	}

	// ユーザーに渡すランダムなSession Token
	sessionToken, err := generateSessionToken()
	if err != nil {
		return "", time.Time{}, err
	}

	now := time.Now()
	expiresAt := now.Add(SessionLifetime)

	// 生TokenではなくHashをDBに保存
	tokenHash := hashToken(sessionToken)

	session := &models.OrderSession{
		TokenHash:   tokenHash,
		ExpiresAt:   expiresAt,
		WindowStart: now,
		OrderCount:  0,
	}

	if err := u.repo.Create(session); err != nil {
		return "", time.Time{}, err
	}

	return sessionToken, expiresAt, nil
}

// 注文するときSessionが使えるか確認する
func (u *orderAccessUsecase) ConsumeOrder(
	sessionToken string,
) error {

	now := time.Now()

	tokenHash := hashToken(sessionToken)

	session, err := u.repo.FindByTokenHash(tokenHash)

	if errors.Is(err, repository.ErrNotFound) {
		return ErrInvalidSession
	}

	if err != nil {
		return err
	}

	// Session期限切れ
	if !now.Before(session.ExpiresAt) {
		return ErrInvalidSession
	}

	// Rate Limitの時間枠をリセット
	if now.Sub(session.WindowStart) >= RateLimitWindow {
		session.WindowStart = now
		session.OrderCount = 0
	}

	// 10分間に3回まで
	if session.OrderCount >= MaxOrdersPerWindow {
		return ErrRateLimited
	}

	session.OrderCount++

	if err := u.repo.Save(session); err != nil {
		return err
	}

	return nil
}

func (u *orderAccessUsecase) DeleteExpiredSessions() error {
	return u.repo.DeleteExpired()
}

func (u *orderAccessUsecase) validateQRToken(token string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false
	}

	bucket, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return false
	}

	currentBucket :=
		time.Now().Unix() / int64(QRRotationInterval/time.Second)

	if bucket != currentBucket {
		return false
	}

	want := u.sign(parts[0])

	return hmac.Equal(
		[]byte(parts[1]),
		[]byte(want),
	)
}

func (u *orderAccessUsecase) sign(payload string) string {
	mac := hmac.New(sha256.New, u.secret)

	_, _ = mac.Write([]byte(payload))

	return base64.RawURLEncoding.EncodeToString(
		mac.Sum(nil),
	)
}

func generateSessionToken() (string, error) {
	raw := make([]byte, 32)

	if _, err := rand.Read(raw); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(raw), nil
}

// DB保存用にSession TokenをHash化
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))

	return base64.RawURLEncoding.EncodeToString(hash[:])
}
