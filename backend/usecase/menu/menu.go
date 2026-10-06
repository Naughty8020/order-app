package menu

import (
	"errors"

	"order-system/domain/repository"
	"order-system/models"
)

var ErrMenuNotFound = errors.New("menu not found")

type MenuUsecase interface {
	CreateMenu(input CreateMenuInput) (*models.Menu, error)
	GetMenus() ([]models.Menu, error)
	UpdateMenu(id uint, input UpdateMenuInput) (*models.Menu, error)
	DeleteMenu(id uint) error
}

type CreateMenuInput struct {
	Name          string
	Price         int
	IsRecommended bool
	IsFeatured    bool
	IsAvailable   bool
}

type UpdateMenuInput struct {
	Name          *string
	Price         *int
	IsRecommended *bool
	IsFeatured    *bool
	IsAvailable   *bool
}

type menuUsecaseImpl struct {
	repo repository.MenuRepository
}

func NewMenuUsecase(repo repository.MenuRepository) *menuUsecaseImpl {
	return &menuUsecaseImpl{
		repo: repo,
	}
}

func (u *menuUsecaseImpl) CreateMenu(input CreateMenuInput) (*models.Menu, error) {
	menu := &models.Menu{
		Name:          input.Name,
		Price:         input.Price,
		IsAvailable:   input.IsAvailable,
		IsRecommended: input.IsRecommended,
		IsFeatured:    input.IsFeatured,
	}

	if err := u.repo.Create(menu); err != nil {
		return nil, err
	}

	return menu, nil
}

func (u *menuUsecaseImpl) GetMenus() ([]models.Menu, error) {
	return u.repo.FindAll()
}

func (u *menuUsecaseImpl) UpdateMenu(id uint, input UpdateMenuInput) (*models.Menu, error) {
	menu, err := u.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrMenuNotFound) {
			return nil, ErrMenuNotFound
		}
		return nil, err
	}

	if input.IsRecommended != nil {
		menu.IsRecommended = *input.IsRecommended
	}
	if input.IsFeatured != nil {
		menu.IsFeatured = *input.IsFeatured
	}
	if input.Name != nil {
		menu.Name = *input.Name
	}
	if input.Price != nil {
		menu.Price = *input.Price
	}
	if input.IsAvailable != nil {
		menu.IsAvailable = *input.IsAvailable
	}

	if err := u.repo.Save(menu); err != nil {
		return nil, err
	}

	return menu, nil
}

func (u *menuUsecaseImpl) DeleteMenu(id uint) error {
	menu, err := u.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrMenuNotFound) {
			return ErrMenuNotFound
		}
		return err
	}

	return u.repo.Delete(menu)
}
