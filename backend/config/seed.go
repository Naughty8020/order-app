package config

import (
	"errors"
	"fmt"
	"log"
	"os"

	"order-system/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedAdmin creates the initial login user without overwriting existing credentials.
func SeedAdmin(db *gorm.DB) error {
	username := os.Getenv("ADMIN_USERNAME")
	password := os.Getenv("ADMIN_PASSWORD")
	if username == "" && password == "" {
		log.Println("ADMIN_USERNAME / ADMIN_PASSWORD 未設定のため管理者seedをスキップします")
		return nil
	}
	if username == "" || password == "" {
		return errors.New("ADMIN_USERNAME and ADMIN_PASSWORD must both be set")
	}

	var existing models.User
	err := db.Where("user_name = ?", username).First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("find seed admin: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash seed admin password: %w", err)
	}
	admin := models.User{UserName: username, PasswordHash: string(hash)}
	if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&admin).Error; err != nil {
		return fmt.Errorf("create seed admin: %w", err)
	}
	return nil
}

// SeedMenus - メニューの初期データを投入する関数
func SeedMenus(db *gorm.DB) {
	menus := []models.Menu{
		{ID: 1, Name: "コーラ (Cola)", Price: 200, IsAvailable: true},
		{ID: 2, Name: "ファンタグレープ (Fanta Grape)", Price: 200, IsAvailable: true},
		{ID: 3, Name: "ファンタオレンジ (Fanta Orange)", Price: 200, IsAvailable: true},
		{ID: 4, Name: "三ツ矢サイダー (Mitsuya Cider)", Price: 200, IsAvailable: true},
		{ID: 5, Name: "アップルジュース (Apple Juice)", Price: 200, IsAvailable: true},
		{ID: 6, Name: "オレンジジュース (Orange Juice)", Price: 200, IsAvailable: true},
	}

	log.Println("シードデータの投入を開始します...")

	err := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "id"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"name",
			"price",
			"is_available",
		}),
	}).Create(&menus).Error

	if err != nil {
		log.Printf("シードデータの投入に失敗しました: %v", err)
		return
	}

	log.Println("シードデータの投入が完了しました！")
}
