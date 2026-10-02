package server

import (
	"fmt"
	"log"
	"order-system/models"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func InitDB() (*gorm.DB, error) {
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	name := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, pass, host, port, name,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("GORMの接続に失敗しました: %w", err)
	}

	log.Println("GORM: MySQLへの接続に成功しました！🎉")

	err = db.AutoMigrate(&models.Menu{}, &models.Order{}, &models.OrderItem{}, &models.OrderSession{}, &models.User{})
	if err != nil {
		return nil, fmt.Errorf("マイグレーションに失敗しました: %w", err)
	}
	log.Println("GORM: マイグレーション（テーブル自動生成）が完了しました！")

	return db, nil
}
