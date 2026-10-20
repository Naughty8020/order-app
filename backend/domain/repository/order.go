package repository

import "order-system/models"

type OrderRepository interface {
	FindAll() ([]models.Order, error)
	FindPublicOrders() ([]models.PublicOrder, error)
	FindByID(id uint) (*models.Order, error)
	FindMenuByID(id uint) (*models.Menu, error)
	CreateOrderWithItems(order *models.Order, items []models.OrderItem) error
	Save(order *models.Order) error
}
