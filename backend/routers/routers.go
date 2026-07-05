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
		orderGroup.PUT("/:id/status", controllers.UpdateOrderStatus)
	}
}

func RegisterMenuRoutes(r *gin.Engine) {
	menuGroup := r.Group("/api/menus")
	{
		menuGroup.POST("", controllers.CreateMenu)
		menuGroup.GET("", controllers.GetMenus)
		menuGroup.PUT("/:id", controllers.UpdateMenu)
		menuGroup.DELETE("/:id", controllers.DeleteMenu)
	}
}
