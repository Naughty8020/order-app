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
var ErrInvalidOrderOption = errors.New("invalid option for menu item")
var ErrInvalidReceipt = errors.New("invalid or expired receipt")

const ReceiptLifetime = 24 * time.Hour

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

	orderItems := make([]models.OrderItem, len(items))
	for index, input := range items {
		menu := menus[index]
		orderItems[index] = models.OrderItem{
			Name:     menu.Name,
			MenuID:   input.MenuID,
			Quantity: input.Quantity,
			Price:    menu.Price,
			Option:   input.Option,
		}
	}

	if err := u.repo.CreateOrderWithItems(order, orderItems); err != nil {
		return nil, err
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
