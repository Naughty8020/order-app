package repository

import "order-system/models"

type UserRepository interface {
	FindByUserName(username string)(*models.User, error)
}
