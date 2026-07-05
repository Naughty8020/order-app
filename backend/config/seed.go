package config

import (
	"log"
	"order-system/models"
)

// SeedMenus - メニューの初期データを投入する関数
func SeedMenus() {
	// 投入したいダミーデータのリスト
	menus := []models.Menu{
		{ID: 1, Name: "クラフト IPAビール (Craft IPA)", Price: 850, IsAvailable: true},
		{ID: 2, Name: "ハートランド・ドラフト (Heartland Beer)", Price: 700, IsAvailable: true},
		{ID: 3, Name: "特製ジントニック (Botanical Gin Tonic)", Price: 800, IsAvailable: true},
		{ID: 4, Name: "スモーキー・モヒート (Smoky Mojito)", Price: 900, IsAvailable: true},
		{ID: 5, Name: "エスプレッソ・マティーニ (Espresso Martini)", Price: 950, IsAvailable: true},
		{ID: 6, Name: "自家製サングリア (Homemade Sangria)", Price: 750, IsAvailable: true},
		{ID: 7, Name: "山崎 12年 シングルモルト (Yamazaki 12y)", Price: 1200, IsAvailable: true},
		{ID: 8, Name: "ヴァージン・ブリーズ (Virgin Breeze - Non-Alc)", Price: 650, IsAvailable: true},
		{ID: 9, Name: "クラフト・スパイス・コーラ (Craft Spice Cola)", Price: 600, IsAvailable: true},
		{ID: 10, Name: "燻製ミックスナッツ (Smoked Mixed Nuts)", Price: 500, IsAvailable: true},
		{ID: 11, Name: "トリュフ塩 of フライドポテト (Truffle French Fries)", Price: 700, IsAvailable: true},
		{ID: 12, Name: "3種のチーズ盛り合わせ (Assorted Cheese Platter)", Price: 1000, IsAvailable: true},
	}

	log.Println("シードデータの投入を開始します...")

	log.Println("既存メニューをクリアします...")
	if err := DB.Unscoped().Where("1 = 1").Delete(&models.Menu{}).Error; err != nil {
		log.Printf("メニューのクリアに失敗しました: %v", err)
	}

	for _, menu := range menus {
		err := DB.Create(&menu).Error
		if err != nil {
			log.Printf("メニュー ID %d のシードに失敗しました: %v", menu.ID, err)
		}
	}

	log.Println("シードデータの投入が完了しました！")
}

