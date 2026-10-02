package models

type User struct {
	ID           uint   `gorm:"primaryKey"`
	UserName     string `gorm:"size:191;uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
}
