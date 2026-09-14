package menu

import (
	"errors"

	"order-system/domain/repository"
	"order-system/models"

	"gorm.io/gorm"
)

type MenuRepository struct {
	db *gorm.DB
}

func NewMenuRepository(db *gorm.DB) *MenuRepository {
	return &MenuRepository{
		db: db,
	}
}

func (r *MenuRepository) Create(menu *models.Menu) error {
	return r.db.Create(menu).Error
}

func (r *MenuRepository) FindAll() ([]models.Menu, error) {
	var menus []models.Menu

	if err := r.db.Find(&menus).Error; err != nil {
		return nil, err
	}

	return menus, nil
}

func (r *MenuRepository) FindByID(id uint) (*models.Menu, error) {
	var menu models.Menu

	if err := r.db.First(&menu, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrMenuNotFound
		}
		return nil, err
	}

	return &menu, nil
}

func (r *MenuRepository) Save(menu *models.Menu) error {
	return r.db.Save(menu).Error
}

func (r *MenuRepository) Delete(menu *models.Menu) error {
	return r.db.Delete(menu).Error
}
