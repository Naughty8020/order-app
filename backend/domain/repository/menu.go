package repository

import (
	"errors"

	"order-system/models"
)

var ErrMenuNotFound = errors.New("menu not found")

type MenuRepository interface {
	Create(menu *models.Menu) error
	FindAll() ([]models.Menu, error)
	FindByID(id uint) (*models.Menu, error)
	Save(menu *models.Menu) error
	Delete(menu *models.Menu) error
}
