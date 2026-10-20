package order

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"order-system/domain/repository"
	"order-system/models"
)

func TestReceiptAuthorization(t *testing.T) {
	token := strings.Repeat("a", 43)
	for _, tc := range []struct {
		name, token, hash string
		expires           time.Time
		err               error
		want              error
	}{
		{"owner after order session expiry", token, receiptHash(token), time.Now().Add(time.Hour), nil, nil},
		{"another order key", strings.Repeat("b", 43), receiptHash(token), time.Now().Add(time.Hour), nil, ErrInvalidReceipt},
		{"missing key", "", receiptHash(token), time.Now().Add(time.Hour), nil, ErrInvalidReceipt},
		{"expired", token, receiptHash(token), time.Now().Add(-time.Second), nil, ErrInvalidReceipt},
		{"legacy order", token, "", time.Time{}, nil, ErrInvalidReceipt},
		{"unknown order", token, "", time.Time{}, repository.ErrNotFound, ErrInvalidReceipt},
	} {
		t.Run(tc.name, func(t *testing.T) {
			uc := NewOrderUsecase(&orderRepositoryMock{
				findByIDFn: func(id uint) (*models.Order, error) {
					var expiresAt *time.Time
					if !tc.expires.IsZero() {
						expiresAt = &tc.expires
					}
					return &models.Order{ID: id, Status: "completed", ReceiptTokenHash: tc.hash, ReceiptExpiresAt: expiresAt}, tc.err
				},
			})
			order, err := uc.GetReceipt(7, tc.token)
			if !errors.Is(err, tc.want) {
				t.Fatalf("error=%v want=%v", err, tc.want)
			}
			if tc.want == nil && (order == nil || order.ID != 7) {
				t.Fatal("owner cannot view completed order")
			}
			if tc.want != nil && order != nil {
				t.Fatal("unauthorized order exposed")
			}
		})
	}
}

func TestReceiptDatabaseFailureIsRetryable(t *testing.T) {
	dbErr := errors.New("database unavailable")
	uc := NewOrderUsecase(&orderRepositoryMock{findByIDFn: func(uint) (*models.Order, error) { return nil, dbErr }})
	_, err := uc.GetReceipt(7, strings.Repeat("a", 43))
	if !errors.Is(err, dbErr) {
		t.Fatalf("error = %v", err)
	}
}

func TestCreatedReceiptIsHashedAndNotSerializedInOrder(t *testing.T) {
	var saved models.Order
	uc := NewOrderUsecase(&orderRepositoryMock{
		createOrderFn: func(order *models.Order) error { order.ID = 1; saved = *order; return nil },
		findMenuByIDFn: func(uint) (*models.Menu, error) {
			return &models.Menu{IsAvailable: true, Name: "お茶", Price: 200}, nil
		},
		createOrderItemFn: func(item *models.OrderItem) error {
			if item.Name != "お茶" {
				t.Fatal("missing name snapshot")
			}
			return nil
		},
		findByIDFn: func(uint) (*models.Order, error) { copy := saved; return &copy, nil },
	})
	created, err := uc.CreateOrder([]CreateOrderItemInput{{MenuID: 1, Quantity: 1}})
	if err != nil {
		t.Fatal(err)
	}
	if len(created.ReceiptToken) != 43 || saved.ReceiptTokenHash != receiptHash(created.ReceiptToken) || saved.ReceiptToken != "" {
		t.Fatal("receipt is not stored as hash")
	}
	if saved.ReceiptExpiresAt == nil {
		t.Fatal("missing receipt expiry")
	}
	if remaining := time.Until(*saved.ReceiptExpiresAt); remaining < 23*time.Hour || remaining > ReceiptLifetime {
		t.Fatal("wrong receipt lifetime")
	}
	data, _ := json.Marshal(created)
	if strings.Contains(string(data), created.ReceiptToken) || strings.Contains(string(data), saved.ReceiptTokenHash) {
		t.Fatal("credential exposed in order JSON")
	}
}
