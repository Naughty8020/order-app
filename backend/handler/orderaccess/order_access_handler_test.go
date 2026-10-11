package orderaccess

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"order-system/usecase/ordersession"
	"reflect"
	"strings"
	"testing"
	"time"
)

type accessStub struct {
	current  func() (string, time.Time)
	exchange func(string) (string, time.Time, error)
	consume  func(string) error
}

func (s accessStub) CurrentQRToken() (string, time.Time) { return s.current() }
func (s accessStub) ExchangeQRToken(token string) (string, time.Time, error) {
	return s.exchange(token)
}
func (s accessStub) ConsumeOrder(token string) error { return s.consume(token) }
func (s accessStub) DeleteExpiredSessions() error    { panic("unexpected DeleteExpiredSessions") }

func assertResponse(t *testing.T, response *httptest.ResponseRecorder, status int, want map[string]string) {
	t.Helper()
	if response.Code != status {
		t.Fatalf("status = %d, want %d: %s", response.Code, status, response.Body.String())
	}
	var got map[string]string
	if err := json.Unmarshal(response.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("body = %v, want %v", got, want)
	}
}

func TestGetQRToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	expires := time.Date(2026, 10, 11, 12, 0, 0, 0, time.UTC)
	calls := 0
	handler := NewHandler(accessStub{current: func() (string, time.Time) { calls++; return "qr-token", expires }})
	router := gin.New()
	router.GET("/qr", handler.GetQRToken)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/qr", nil))
	assertResponse(t, response, 200, map[string]string{"token": "qr-token", "expires_at": "2026-10-11T12:00:00Z"})
	if calls != 1 {
		t.Errorf("CurrentQRToken calls = %d, want 1", calls)
	}
}

func TestCreateSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name, body  string
		exchangeErr error
		wantStatus  int
		wantError   string
		wantCalls   int
	}{
		{"成功", `{"token":"qr-token"}`, nil, 201, "", 1},
		{"不正JSON", `{`, nil, 400, "invalid request body", 0},
		{"本文なし", ``, nil, 400, "invalid request body", 0},
		{"トークンなし", `{}`, nil, 400, "invalid request body", 0},
		{"空のトークン", `{"token":""}`, nil, 400, "invalid request body", 0},
		{"型が不正", `{"token":42}`, nil, 400, "invalid request body", 0},
		{"不正または期限切れQR", `{"token":"qr-token"}`, ordersession.ErrInvalidQRToken, 401, "invalid or expired QR token", 1},
		{"ラップされた不正QR", `{"token":"qr-token"}`, fmt.Errorf("exchange: %w", ordersession.ErrInvalidQRToken), 401, "invalid or expired QR token", 1},
		{"DBエラーは500", `{"token":"qr-token"}`, errors.New("private database details"), 500, "internal server error", 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			handler := NewHandler(accessStub{exchange: func(token string) (string, time.Time, error) {
				calls++
				if token != "qr-token" {
					t.Errorf("token = %q", token)
				}
				return "session-token", time.Date(2026, 10, 11, 12, 30, 0, 0, time.UTC), tt.exchangeErr
			}})
			router := gin.New()
			router.POST("/session", handler.CreateSession)
			request := httptest.NewRequest(http.MethodPost, "/session", strings.NewReader(tt.body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			want := map[string]string{"session_token": "session-token", "expires_at": "2026-10-11T12:30:00Z"}
			if tt.wantError != "" {
				want = map[string]string{"error": tt.wantError}
			}
			assertResponse(t, response, tt.wantStatus, want)
			if calls != tt.wantCalls {
				t.Errorf("ExchangeQRToken calls = %d, want %d", calls, tt.wantCalls)
			}
		})
	}
}

func TestRequireOrderSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name, token string
		consumeErr  error
		wantStatus  int
		wantError   string
	}{
		{"成功", "session-token", nil, 200, ""},
		{"ヘッダーなし", "", ordersession.ErrInvalidSession, 401, "a valid order session is required"},
		{"不正または期限切れ", "invalid", ordersession.ErrInvalidSession, 401, "a valid order session is required"},
		{"ラップされた無効セッション", "session-token", fmt.Errorf("consume: %w", ordersession.ErrInvalidSession), 401, "a valid order session is required"},
		{"回数超過", "session-token", ordersession.ErrRateLimited, 429, "too many orders; please wait before ordering again"},
		{"ラップされた回数超過", "session-token", fmt.Errorf("consume: %w", ordersession.ErrRateLimited), 429, "too many orders; please wait before ordering again"},
		{"DBエラー", "session-token", errors.New("private database details"), 500, "internal server error"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls, nextCalls := 0, 0
			handler := NewHandler(accessStub{consume: func(token string) error {
				calls++
				if token != tt.token {
					t.Errorf("token = %q, want %q", token, tt.token)
				}
				return tt.consumeErr
			}})
			router := gin.New()
			router.POST("/orders", handler.RequireOrderSession, func(c *gin.Context) { nextCalls++; c.JSON(200, gin.H{"result": "ok"}) })
			request := httptest.NewRequest(http.MethodPost, "/orders", nil)
			if tt.token != "" {
				request.Header.Set("X-Order-Session", tt.token)
			}
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			want, wantNext := map[string]string{"result": "ok"}, 1
			if tt.wantError != "" {
				want, wantNext = map[string]string{"error": tt.wantError}, 0
			}
			assertResponse(t, response, tt.wantStatus, want)
			if calls != 1 || nextCalls != wantNext {
				t.Errorf("consume calls = %d, next calls = %d; want 1, %d", calls, nextCalls, wantNext)
			}
		})
	}
}
