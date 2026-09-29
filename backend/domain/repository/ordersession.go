package repository

import "order-system/models"

type OrderSessionRepository interface {
	Create(session *models.OrderSession) error
	FindByTokenHash(tokenHash string) (*models.OrderSession, error)
	Save(session *models.OrderSession) error
	DeleteExpired() error
}