package order

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"order-system/models"
	orderUsecase "order-system/usecase/order"
)

func TestPublicOrdersExcludeDetailsAndCompletedOrders(t *testing.T) {
	uc := &orderUsecaseMock{getOrdersFn: func() ([]models.Order, error) {
		return []models.Order{
			{ID: 1, Status: "pending", ReceiptTokenHash: "secret", OrderItems: []models.OrderItem{{Name: "private item"}}},
			{ID: 2, Status: "ready"},
			{ID: 3, Status: "completed"},
		}, nil
	}}
	r := gin.New()
	r.GET("/public", NewOrderHandler(uc).GetPublicOrders)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/public", nil))
	if w.Code != 200 || w.Body.String() != `{"orders":[{"id":1,"status":"pending"},{"id":2,"status":"ready"}]}` {
		t.Fatalf("public response = %d %s", w.Code, w.Body)
	}
}

func TestReceiptHandlerUsesHeaderAndDisablesCaching(t *testing.T) {
	for _, tc := range []struct {
		err    error
		status int
	}{{nil, 200}, {orderUsecase.ErrInvalidReceipt, 404}, {errors.New("db error"), 500}} {
		uc := &orderUsecaseMock{getReceiptFn: func(id uint, token string) (*models.Order, error) {
			if id != 7 || token != "receipt-secret" {
				t.Fatal("missing receipt credentials")
			}
			return &models.Order{ID: 7, ReceiptTokenHash: "private-hash"}, tc.err
		}}
		r := gin.New()
		r.GET("/orders/:id/receipt", NewOrderHandler(uc).GetReceipt)
		req := httptest.NewRequest("GET", "/orders/7/receipt", nil)
		req.Header.Set("X-Order-Receipt", "receipt-secret")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != tc.status || w.Header().Get("Cache-Control") != "no-store" || strings.Contains(w.Body.String(), "private-hash") {
			t.Fatalf("response = %d %s", w.Code, w.Body)
		}
	}
}
