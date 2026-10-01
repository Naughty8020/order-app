package user

import (
	"order-system/models"

	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *userRepository{
	return &userRepository{db}
}

func (r *userRepository) FindByUserName(userName string) (*models.User, error){
	var user models.User 

	if err := r.db.Where("UserName = ?", userName).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
