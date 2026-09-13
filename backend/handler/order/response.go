package order

import "order-system/models"

type CreateOrderResponse struct {
	ID         uint               `json:"id"`
	Status     string             `json:"status"`
	OrderItems []models.OrderItem `json:"order_items"`
}

type GetOrdersResponse struct {
	Orders []models.Order `json:"orders"`
}

type UpdateOrderStatusResponse struct {
	ID         uint               `json:"id"`
	Status     string             `json:"status"`
	OrderItems []models.OrderItem `json:"order_items"`
}