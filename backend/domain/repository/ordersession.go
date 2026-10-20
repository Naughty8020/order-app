package repository

import (
	"errors"
	"order-system/models"
)

var ErrNotFound = errors.New("not found")

type OrderSessionRepository interface {
	Create(session *models.OrderSession) error
	UpdateWithLock(tokenHash string, update func(*models.OrderSession) (bool, error)) error
	DeleteExpired() error
}
