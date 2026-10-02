package ordersession

import (
	"errors"
	"order-system/domain/repository"
	"order-system/models"

	"gorm.io/gorm"
)

type orderSessionRepository struct {
	db *gorm.DB
}

func NewOrderSessionRepository(db *gorm.DB) *orderSessionRepository {
	return &orderSessionRepository{db}
}

func (r *orderSessionRepository) Create(session *models.OrderSession) error {
	err := r.db.Create(session).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *orderSessionRepository) FindByTokenHash(tokenHash string) (*models.OrderSession, error) {
	var session models.OrderSession

	err := r.db.Where("token_hash = ?", tokenHash).First(&session).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, repository.ErrNotFound
	}

	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *orderSessionRepository) Save(session *models.OrderSession) error {
	err := r.db.Save(session).Error

	if err != nil {
		return err
	}
	return nil
}

func (r *orderSessionRepository) DeleteExpired() error {
	err := r.db.Where("expires_at <= NOW()").Delete(&models.OrderSession{}).Error
	if err != nil {
		return err
	}
	return nil
}
