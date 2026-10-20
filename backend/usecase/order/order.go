package order

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"order-system/domain/repository"
	"order-system/models"
	"time"
)

var ErrInvalidOrderStatus = errors.New("status must be pending, ready, or completed")
var ErrInvalidReceipt = errors.New("invalid or expired receipt")

const ReceiptLifetime = 24 * time.Hour

func receiptHash(token string) string {
	hash := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(hash[:])
}

type OrderUsecase interface {
	CreateOrder(items []CreateOrderItemInput) (*models.Order, error)
	GetOrders() ([]models.Order, error)
	GetPublicOrders() ([]models.PublicOrder, error)
	GetReceipt(id uint, token string) (*models.Order, error)
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

func (u *orderUsecaseImpl) GetPublicOrders() ([]models.PublicOrder, error) {
	return u.repo.FindPublicOrders()
}

func (u *orderUsecaseImpl) GetReceipt(id uint, token string) (*models.Order, error) {
	if len(token) != 43 {
		return nil, ErrInvalidReceipt
	}
	order, err := u.repo.FindByID(id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrInvalidReceipt
	}
	if err != nil {
		return nil, err
	}
	if order.ReceiptExpiresAt == nil || !time.Now().Before(*order.ReceiptExpiresAt) ||
		subtle.ConstantTimeCompare([]byte(receiptHash(token)), []byte(order.ReceiptTokenHash)) != 1 {
		return nil, ErrInvalidReceipt
	}
	return order, nil
}

func (u *orderUsecaseImpl) CreateOrder(
	items []CreateOrderItemInput,
) (*models.Order, error) {

	if len(items) == 0 {
		return nil, errors.New("order items cannot be empty")
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	expiresAt := time.Now().Add(ReceiptLifetime)
	order := &models.Order{
		Status:           "pending",
		ReceiptTokenHash: receiptHash(token),
		ReceiptExpiresAt: &expiresAt,
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
			Name:     menu.Name,
			OrderID:  order.ID,
			MenuID:   input.MenuID,
			Quantity: input.Quantity,
			Price:    menu.Price,
		}

		if err := u.repo.CreateOrderItem(orderItem); err != nil {
			return nil, err
		}
	}

	saved, err := u.repo.FindByID(order.ID)
	if err != nil {
		return nil, err
	}
	saved.ReceiptToken = token
	return saved, nil
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
