package order

import (
	"order-system/models"

	"gorm.io/gorm"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{
		db: db,
	}
}

func (r *OrderRepository) FindAll() ([]models.Order, error) {
	var orders []models.Order

	if err := r.db.
		Preload("OrderItems.Menu").
		Find(&orders).
		Error; err != nil {
		return nil, err
	}

	return orders, nil
}

func (r *OrderRepository) FindByID(id uint) (*models.Order, error) {
	var order models.Order

	if err := r.db.
		Preload("OrderItems.Menu").
		First(&order, id).
		Error; err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *OrderRepository) FindMenuByID(id uint) (*models.Menu, error) {
	var menu models.Menu

	if err := r.db.First(&menu, id).Error; err != nil {
		return nil, err
	}

	return &menu, nil
}

func (r *OrderRepository) CreateOrder(order *models.Order) error {
	return r.db.Create(order).Error
}

func (r *OrderRepository) CreateOrderItem(orderItem *models.OrderItem) error {
	return r.db.Create(orderItem).Error
}

func (r *OrderRepository) Save(order *models.Order) error {
	return r.db.Save(order).Error
}
