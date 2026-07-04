package config

import (
	"log"
	"order-system/models"
)

// SeedMenus - メニューの初期データを投入する関数
func SeedMenus() {
	// 投入したいダミーデータのリスト
	menus := []models.Menu{
		{ID: 1, Name: "ハンバーグ定食", Price: 980, IsAvailable: true},
		{ID: 2, Name: "から揚げ定食", Price: 850, IsAvailable: true},
		{ID: 3, Name: "チキン南蛮定食", Price: 900, IsAvailable: true},
		{ID: 4, Name: "生姜焼き定食", Price: 880, IsAvailable: true},
		{ID: 5, Name: "特製カレー", Price: 750, IsAvailable: true},
	}

	log.Println("シードデータの投入を開始します...")

	for _, menu := range menus {
		// FirstOrCreate: IDをキーにして検索し、存在しなければ作成する（重複防止）
		err := DB.FirstOrCreate(&menu, models.Menu{ID: menu.ID}).Error
		if err != nil {
			log.Printf("メニュー ID %d のシードに失敗しました: %v", menu.ID, err)
		}
	}

	log.Println("シードデータの投入が完了しました！")
}
