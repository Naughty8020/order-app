package models

import "time"

type OrderSession struct {
	ID          uint      `gorm:"primaryKey"`
	TokenHash   string    `gorm:"type:varchar(64);uniqueIndex;not null"`
	ExpiresAt   time.Time `gorm:"not null"`
	WindowStart time.Time `gorm:"not null"`
	OrderCount  int       `gorm:"not null;default:0"`
	CreatedAt   time.Time
}
