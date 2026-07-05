package config

import (
	"fmt"
	"log"
	"os"

	"order-system/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	name := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, pass, host, port, name,
	)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("GORMの接続に失敗しました: %v", err)
	}

	log.Println("GORM: MySQLへの接続に成功しました！🎉")

	err = DB.AutoMigrate(&models.Menu{}, &models.Order{}, &models.OrderItem{})
	if err != nil {
		log.Fatalf("マイグレーションに失敗しました: %v", err)
	}
	log.Println("GORM: マイグレーション（テーブル自動生成）が完了しました！")
}
