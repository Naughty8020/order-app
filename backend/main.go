package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// Ginのデフォルトルーターを作成
	r := gin.Default()

	// ルートURL (http://localhost:8080/) にアクセスしたときの処理
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World",
		})
	})

	// サーバーを起動 (ポート: 8080)
	r.Run("0.0.0.0:8080")
}
