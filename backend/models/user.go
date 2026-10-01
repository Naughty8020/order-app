package models

type User struct {
	ID uint `gorm:"primaryKey"`
	UserName string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
}