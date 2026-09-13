package order

import (
	"errors"
	"order-system/domain/repository"
	"order-system/models"
)

type OrderUsecase interface {
	CreateOrder(items []CreateOrderItemInput) (*models.Order, error)
	GetOrders() ([]models.Order, error)
	UpdateOrderStatus(id uint, status string) (*models.Order, error)
}

type CreateOrderItemInput struct {
	MenuID   uint
	Quantity int
}

type orderUsecaseImpl struct {
	repo repository.OrderRepository
}

func NewOrderUsecase(repo repository.OrderRepository) *orderUsecaseImpl {
	return &orderUsecaseImpl{
		repo: repo,
	}
}

func (u *orderUsecaseImpl) GetOrders() ([]models.Order, error) {
	return u.repo.FindAll()
}

func (u *orderUsecaseImpl) CreateOrder(
	items []CreateOrderItemInput,
) (*models.Order, error) {

	if len(items) == 0 {
		return nil, errors.New("order items cannot be empty")
	}

	order := &models.Order{
		Status: "pending",
	}

	if err := u.repo.CreateOrder(order); err != nil {
		return nil, err
	}

	for _, input := range items {
		menu, err := u.repo.FindMenuByID(input.MenuID)
		if err != nil {
			return nil, err
		}

		if !menu.IsAvailable {
			return nil, errors.New("menu item is not available")
		}

		orderItem := &models.OrderItem{
			OrderID:  order.ID,
			MenuID:   input.MenuID,
			Quantity: input.Quantity,
			Price:    menu.Price,
		}

		if err := u.repo.CreateOrderItem(orderItem); err != nil {
			return nil, err
		}
	}

	return u.repo.FindByID(order.ID)
}

func (u *orderUsecaseImpl) UpdateOrderStatus(
	id uint,
	status string,
) (*models.Order, error) {

	order, err := u.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	order.Status = status

	if err := u.repo.Save(order); err != nil {
		return nil, err
	}

	return u.repo.FindByID(id)
}