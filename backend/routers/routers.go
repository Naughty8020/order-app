package routers

import (
	"order-system/controllers"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	orderGroup := r.Group("/api/orders")
	{
		orderGroup.POST("", controllers.CreateOrder)
		orderGroup.GET("", controllers.GetOrders)
	}
}

func RegisterMenuRoutes(r *gin.Engine) {
	menuGroup := r.Group("/api/menus")
	{
		menuGroup.POST("", controllers.CreateMenu)
		menuGroup.GET("", controllers.GetMenus)
	}
}
