package order

import (
	"order-system/models"
	"time"
)

type CreateOrderResponse struct {
	ReceiptToken     string             `json:"receipt_token"`
	ReceiptExpiresAt time.Time          `json:"receipt_expires_at"`
	CreatedAt        time.Time          `json:"created_at"`
	ID               uint               `json:"id"`
	Status           string             `json:"status"`
	OrderItems       []models.OrderItem `json:"order_items"`
}

type GetOrdersResponse struct {
	Orders []models.Order `json:"orders"`
}

type UpdateOrderStatusResponse struct {
	ID         uint               `json:"id"`
	Status     string             `json:"status"`
	OrderItems []models.OrderItem `json:"order_items"`
}
