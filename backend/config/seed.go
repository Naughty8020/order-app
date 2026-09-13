package config

import (
	"log"
	"order-system/models"

	"gorm.io/gorm"
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

	log.Println("既存メニューをクリアします...")
	if err := db.Unscoped().Where("1 = 1").Delete(&models.Menu{}).Error; err != nil {
		log.Printf("メニューのクリアに失敗しました: %v", err)
		return
	}

	for _, menu := range menus {
		if err := db.Create(&menu).Error; err != nil {
			log.Printf("メニュー ID %d のシードに失敗しました: %v", menu.ID, err)
			return
		}
	}

	log.Println("シードデータの投入が完了しました！")
}