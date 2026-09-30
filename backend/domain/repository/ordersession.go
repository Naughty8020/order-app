package repository

import (
	"errors"
	"order-system/models"
)

var ErrNotFound = errors.New("not found")

type OrderSessionRepository interface {
	Create(session *models.OrderSession) error
	FindByTokenHash(tokenHash string) (*models.OrderSession, error)
	Save(session *models.OrderSession) error
	DeleteExpired() error
}