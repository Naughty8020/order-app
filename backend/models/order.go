package models

import "time"

type Order struct {
	ID         uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	Status     string      `gorm:"type:varchar(20);default:'pending'" json:"status"`
	CreatedAt  time.Time   `json:"created_at"`
	OrderItems []OrderItem `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"order_items"`
}

type OrderItem struct {
	ID       uint `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID  uint `gorm:"not null;index" json:"order_id"`
	MenuID   uint `gorm:"not null" json:"menu_id"`
	Menu     Menu `gorm:"foreignKey:MenuID" json:"menu"`
	Quantity int  `gorm:"not null;default:1" json:"quantity"`
	Price    int  `gorm:"not null" json:"price"` // 注文時点の単価
}
