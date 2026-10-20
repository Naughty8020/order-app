package order

import (
	"errors"
	"order-system/domain/repository"
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

func (r *OrderRepository) FindPublicOrders() ([]models.PublicOrder, error) {
	orders := make([]models.PublicOrder, 0)
	err := r.db.Model(&models.Order{}).
		Select("id", "status").
		Where("status IN ?", []string{"pending", "ready"}).
		Order("id ASC").
		Find(&orders).Error
	if err != nil {
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
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.Join(repository.ErrNotFound, err)
		}
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

func (r *OrderRepository) CreateOrderWithItems(
	order *models.Order,
	items []models.OrderItem,
) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}

		for index := range items {
			items[index].OrderID = order.ID
			if err := tx.Create(&items[index]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *OrderRepository) Save(order *models.Order) error {
	return r.db.Save(order).Error
}
