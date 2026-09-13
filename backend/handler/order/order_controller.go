package order

import (
	"encoding/json"
	"net/http"
	"strconv"

	orderUsecase "order-system/usecase/order"
)

type Handler interface {
	CreateOrder(w http.ResponseWriter, r *http.Request)
	GetOrders(w http.ResponseWriter, r *http.Request)
	UpdateOrderStatus(w http.ResponseWriter, r *http.Request)
}

type orderHandlerImpl struct {
	orderUsecase orderUsecase.OrderUsecase
}

func NewOrderHandler(
	orderUC orderUsecase.OrderUsecase,
) Handler {
	return &orderHandlerImpl{
		orderUsecase: orderUC,
	}
}

func (h *orderHandlerImpl) CreateOrder(w http.ResponseWriter,r *http.Request,) {
	var req CreateOrderDTO

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)
		return
	}

	if len(req.Items) == 0 {
		http.Error(
			w,
			"items is required",
			http.StatusBadRequest,
		)
		return
	}

	items := make([]orderUsecase.CreateOrderItemInput, 0, len(req.Items))

	for _, item := range req.Items {
		if item.MenuID == 0 {
			http.Error(
				w,
				"menu_id is required",
				http.StatusBadRequest,
			)
			return
		}

		if item.Quantity <= 0 {
			http.Error(
				w,
				"quantity must be greater than 0",
				http.StatusBadRequest,
			)
			return
		}

		items = append(items, orderUsecase.CreateOrderItemInput{
			MenuID:   item.MenuID,
			Quantity: item.Quantity,
		})
	}

	createdOrder, err := h.orderUsecase.CreateOrder(items)
	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusInternalServerError,
		)
		return
	}

	res := CreateOrderResponse{
		ID:         createdOrder.ID,
		Status:     createdOrder.Status,
		OrderItems: createdOrder.OrderItems,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(
			w,
			"failed to encode response",
			http.StatusInternalServerError,
		)
		return
	}
}

func (h *orderHandlerImpl) GetOrders(w http.ResponseWriter,r *http.Request,) {
	orders, err := h.orderUsecase.GetOrders()
	if err != nil {
		http.Error(
			w,
			"failed to retrieve orders",
			http.StatusInternalServerError,
		)
		return
	}

	res := GetOrdersResponse{
		Orders: orders,
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(
			w,
			"failed to encode response",
			http.StatusInternalServerError,
		)
		return
	}
}

func (h *orderHandlerImpl) UpdateOrderStatus(w http.ResponseWriter,r *http.Request,) {
	idStr := r.PathValue("id")

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		http.Error(
			w,
			"invalid order id",
			http.StatusBadRequest,
		)
		return
	}

	var req UpdateOrderStatusDTO

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)
		return
	}

	if req.Status == "" {
		http.Error(
			w,
			"status is required",
			http.StatusBadRequest,
		)
		return
	}

	updatedOrder, err := h.orderUsecase.UpdateOrderStatus(
		uint(id),
		req.Status,
	)
	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusInternalServerError,
		)
		return
	}

	res := UpdateOrderStatusResponse{
		ID:         updatedOrder.ID,
		Status:     updatedOrder.Status,
		OrderItems: updatedOrder.OrderItems,
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(res); err != nil {
		http.Error(
			w,
			"failed to encode response",
			http.StatusInternalServerError,
		)
		return
	}
}