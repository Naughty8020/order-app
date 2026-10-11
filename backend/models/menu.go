package models

import (
	"gorm.io/gorm"
)

type Menu struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name          string         `gorm:"type:varchar(100);not null" json:"name"`
	Price         int            `gorm:"not null" json:"price"`
	IsAvailable   bool           `gorm:"default:true" json:"is_available"`
	IsRecommended bool           `gorm:"not null;default:false" json:"is_recommended"`
	IsFeatured    bool           `gorm:"not null;default:false" json:"is_featured"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}
