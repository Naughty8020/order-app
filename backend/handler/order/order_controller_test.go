package order

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"order-system/models"
	orderUsecase "order-system/usecase/order"

	"github.com/gin-gonic/gin"
)

type orderUsecaseMock struct {
	createOrderFn       func(items []orderUsecase.CreateOrderItemInput) (*models.Order, error)
	getOrdersFn         func() ([]models.Order, error)
	updateOrderStatusFn func(id uint, status string) (*models.Order, error)
}

func (m *orderUsecaseMock) CreateOrder(items []orderUsecase.CreateOrderItemInput) (*models.Order, error) {
	return m.createOrderFn(items)
}

func (m *orderUsecaseMock) GetOrders() ([]models.Order, error) {
	return m.getOrdersFn()
}

func (m *orderUsecaseMock) UpdateOrderStatus(id uint, status string) (*models.Order, error) {
	return m.updateOrderStatusFn(id, status)
}

func TestCreateOrderHandler(t *testing.T) {
	usecase := &orderUsecaseMock{
		createOrderFn: func(items []orderUsecase.CreateOrderItemInput) (*models.Order, error) {
			if len(items) != 2 || items[0].MenuID != 1 || items[0].Quantity != 2 || items[1].MenuID != 2 || items[1].Quantity != 1 {
				t.Errorf("CreateOrder() items = %+v", items)
			}
			return &models.Order{
				ID:     10,
				Status: "pending",
				OrderItems: []models.OrderItem{
					{OrderID: 10, MenuID: 1, Quantity: 2, Price: 200},
					{OrderID: 10, MenuID: 2, Quantity: 1, Price: 300},
				},
			}, nil
		},
	}
	recorder := performOrderRequest(
		NewOrderHandler(usecase),
		http.MethodPost,
		"/api/orders",
		`{"items":[{"menu_id":1,"quantity":2},{"menu_id":2,"quantity":1}]}`,
	)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d; body = %s", recorder.Code, http.StatusCreated, recorder.Body.String())
	}
	var response CreateOrderResponse
	decodeOrderResponse(t, recorder, &response)
	if response.ID != 10 || response.Status != "pending" || len(response.OrderItems) != 2 {
		t.Errorf("response = %+v", response)
	}
}

func TestCreateOrderHandlerRejectsInvalidRequest(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "不正なJSON", body: `{"items":`},
		{name: "商品が空", body: `{"items":[]}`},
		{name: "メニューIDが0", body: `{"items":[{"menu_id":0,"quantity":1}]}`},
		{name: "数量が0", body: `{"items":[{"menu_id":1,"quantity":0}]}`},
		{name: "数量が負数", body: `{"items":[{"menu_id":1,"quantity":-1}]}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			usecase := &orderUsecaseMock{
				createOrderFn: func(items []orderUsecase.CreateOrderItemInput) (*models.Order, error) {
					t.Fatal("CreateOrder() should not be called")
					return nil, nil
				},
			}
			recorder := performOrderRequest(NewOrderHandler(usecase), http.MethodPost, "/api/orders", tt.body)
			if recorder.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d; body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
			}
		})
	}
}

func TestCreateOrderHandlerReturnsInternalServerError(t *testing.T) {
	usecase := &orderUsecaseMock{
		createOrderFn: func(items []orderUsecase.CreateOrderItemInput) (*models.Order, error) {
			return nil, errors.New("create failed")
		},
	}
	recorder := performOrderRequest(NewOrderHandler(usecase), http.MethodPost, "/api/orders", `{"items":[{"menu_id":1,"quantity":1}]}`)

	if recorder.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusInternalServerError)
	}
}

func TestGetOrdersHandler(t *testing.T) {
	usecase := &orderUsecaseMock{
		getOrdersFn: func() ([]models.Order, error) {
			return []models.Order{{ID: 1, Status: "pending"}}, nil
		},
	}
	recorder := performOrderRequest(NewOrderHandler(usecase), http.MethodGet, "/api/orders", "")

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	var response GetOrdersResponse
	decodeOrderResponse(t, recorder, &response)
	if len(response.Orders) != 1 || response.Orders[0].ID != 1 || response.Orders[0].Status != "pending" {
		t.Errorf("response = %+v", response)
	}
}

func TestGetOrdersHandlerReturnsInternalServerError(t *testing.T) {
	usecase := &orderUsecaseMock{
		getOrdersFn: func() ([]models.Order, error) { return nil, errors.New("find failed") },
	}
	recorder := performOrderRequest(NewOrderHandler(usecase), http.MethodGet, "/api/orders", "")

	if recorder.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusInternalServerError)
	}
}

func TestUpdateOrderStatusHandler(t *testing.T) {
	usecase := &orderUsecaseMock{
		updateOrderStatusFn: func(id uint, status string) (*models.Order, error) {
			if id != 1 || status != "preparing" {
				t.Errorf("UpdateOrderStatus() id = %d, status = %q", id, status)
			}
			return &models.Order{ID: id, Status: status}, nil
		},
	}
	recorder := performOrderRequest(NewOrderHandler(usecase), http.MethodPut, "/api/orders/1/status", `{"status":"preparing"}`)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var response UpdateOrderStatusResponse
	decodeOrderResponse(t, recorder, &response)
	if response.ID != 1 || response.Status != "preparing" {
		t.Errorf("response = %+v", response)
	}
}

func TestUpdateOrderStatusHandlerRejectsInvalidRequest(t *testing.T) {
	tests := []struct {
		name string
		path string
		body string
	}{
		{name: "不正なID", path: "/api/orders/abc/status", body: `{"status":"preparing"}`},
		{name: "不正なJSON", path: "/api/orders/1/status", body: `{"status":`},
		{name: "空のステータス", path: "/api/orders/1/status", body: `{"status":""}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			usecase := &orderUsecaseMock{
				updateOrderStatusFn: func(id uint, status string) (*models.Order, error) {
					t.Fatal("UpdateOrderStatus() should not be called")
					return nil, nil
				},
			}
			recorder := performOrderRequest(NewOrderHandler(usecase), http.MethodPut, tt.path, tt.body)
			if recorder.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d; body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
			}
		})
	}
}

func TestUpdateOrderStatusHandlerReturnsInternalServerError(t *testing.T) {
	usecase := &orderUsecaseMock{
		updateOrderStatusFn: func(id uint, status string) (*models.Order, error) {
			return nil, errors.New("update failed")
		},
	}
	recorder := performOrderRequest(NewOrderHandler(usecase), http.MethodPut, "/api/orders/1/status", `{"status":"preparing"}`)

	if recorder.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", recorder.Code, http.StatusInternalServerError)
	}
}

func performOrderRequest(handler Handler, method, path, body string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/orders", handler.CreateOrder)
	router.GET("/api/orders", handler.GetOrders)
	router.PUT("/api/orders/:id/status", handler.UpdateOrderStatus)

	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	return recorder
}

func decodeOrderResponse(t *testing.T, recorder *httptest.ResponseRecorder, value any) {
	t.Helper()
	if err := json.Unmarshal(recorder.Body.Bytes(), value); err != nil {
		t.Fatalf("failed to decode response: %v; body = %s", err, recorder.Body.String())
	}
}
