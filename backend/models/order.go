package models

import "time"

type Order struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	MenuID     uint      `gorm:"not null" json:"menu_id"`
	Menu       Menu      `gorm:"foreignKey:MenuID" json:"menu"`
	Quantity   int       `gorm:"not null;default:1" json:"quantity"`
	TotalPrice int       `gorm:"not null" json:"total_price"`
	Status     string    `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}
