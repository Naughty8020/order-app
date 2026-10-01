package config

import (
	"log"
	"order-system/models"
)

// SeedMenus - メニューの初期データを投入する関数
func SeedMenus() {
	// 投入したいダミーデータのリスト
	menus := []models.Menu{
		{ID: 1, Name: "コーラ (Cola)", Price: 200, IsAvailable: true},
		{ID: 2, Name: "ファンタグレープ (Fanta Grape)", Price: 200, IsAvailable: true},
		{ID: 3, Name: "ファンタオレンジ (Fanta Orange)", Price: 200, IsAvailable: true},
		{ID: 4, Name: "三ツ矢サイダー (Mitsuya Cider)", Price: 200, IsAvailable: true},
		{ID: 5, Name: "アップルジュース (Apple Juice)", Price: 200, IsAvailable: true},
		{ID: 6, Name: "オレンジジュース (Orange Juice)", Price: 200, IsAvailable: true},
		{ID: 7, Name: "カシスオレンジ (Cassis Orange)", Price: 500, IsAvailable: true},
		{ID: 8, Name: "ジントニック (Gin Tonic)", Price: 500, IsAvailable: true},
		{ID: 9, Name: "モスコミュール (Moscow Mule)", Price: 500, IsAvailable: true},
	}

	log.Println("シードデータの投入を開始します...")

	for _, menu := range menus {
		// Save はIDが存在する場合は更新(Update)、存在しない場合は新規作成(Create)します
		err := DB.Save(&menu).Error
		if err != nil {
			log.Printf("メニュー ID %d のシードに失敗しました: %v", menu.ID, err)
		}
	}

	log.Println("シードデータの投入が完了しました！")
}

