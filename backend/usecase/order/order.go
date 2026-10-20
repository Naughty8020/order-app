package order

import (
	"errors"
	"order-system/domain/repository"
	"order-system/models"
)

var ErrInvalidOrderStatus = errors.New("status must be pending, ready, or completed")
var ErrInvalidOrderOption = errors.New("invalid option for menu item")

func validOrderOption(menuID uint, option string) bool {
	switch menuID {
	case 7:
		return option == "ジュース：オレンジジュース" || option == "ジュース：リンゴジュース"
	case 8:
		return option == "ジュース：アップルジュース" || option == "ジュース：オレンジジュース"
	case 9:
		return option == ""
	case 10:
		return option == "コーラ垂らし：あり" || option == "コーラ垂らし：なし"
	default:
		return option == ""
	}
}

type OrderUsecase interface {
	CreateOrder(items []CreateOrderItemInput) (*models.Order, error)
	GetOrders() ([]models.Order, error)
	UpdateOrderStatus(id uint, status string) (*models.Order, error)
}

type CreateOrderItemInput struct {
	MenuID   uint
	Quantity int
	Option   string
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

	menus := make([]*models.Menu, len(items))
	for index, input := range items {
		menu, err := u.repo.FindMenuByID(input.MenuID)
		if err != nil {
			return nil, err
		}

		if !menu.IsAvailable {
			return nil, errors.New("menu item is not available")
		}
		if !validOrderOption(menu.ID, input.Option) {
			return nil, ErrInvalidOrderOption
		}
		menus[index] = menu
	}

	order := &models.Order{
		Status: "pending",
	}

	if err := u.repo.CreateOrder(order); err != nil {
		return nil, err
	}

	for index, input := range items {
		menu := menus[index]
		orderItem := &models.OrderItem{
			OrderID:  order.ID,
			MenuID:   input.MenuID,
			Quantity: input.Quantity,
			Price:    menu.Price,
			Option:   input.Option,
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

	switch status {
	case "pending", "ready", "completed":
	default:
		return nil, ErrInvalidOrderStatus
	}

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
