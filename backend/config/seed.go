package config

import (
	"log"

	"order-system/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SeedMenus - メニューの初期データを投入する関数
func SeedMenus(db *gorm.DB) {
	menus := []models.Menu{
		{ID: 1, Name: "コーラ (Cola)", Price: 400, IsAvailable: true},
		{ID: 2, Name: "ファンタグレープ (Fanta Grape)", Price: 400, IsAvailable: true},
		{ID: 3, Name: "ファンタオレンジ (Fanta Orange)", Price: 400, IsAvailable: true},
		{ID: 4, Name: "三ツ矢サイダー (Mitsuya Cider)", Price: 400, IsAvailable: true},
		{ID: 5, Name: "アップルジュース (Apple Juice)", Price: 400, IsAvailable: true},
		{ID: 6, Name: "オレンジジュース (Orange Juice)", Price: 400, IsAvailable: true},
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
