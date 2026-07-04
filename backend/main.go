package main

import (
	"log"
	"net/http"

	"order-system/config"
	"order-system/routers"

	"github.com/gin-gonic/gin"
)

func main() {
	config.InitDB()

	r := gin.Default()

	log.Println("サーバーを起動します...")

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World",
		})
	})

	config.SeedMenus()
	routers.RegisterRoutes(r)

	r.Run("0.0.0.0:8080")
}
