package repository

import "order-system/models"

type OrderRepository interface {
	FindAll() ([]models.Order, error)
	FindByID(id uint) (*models.Order, error)
	FindMenuByID(id uint) (*models.Menu, error)
	CreateOrder(order *models.Order) error
	CreateOrderItem(orderItem *models.OrderItem) error
	Save(order *models.Order) error
}