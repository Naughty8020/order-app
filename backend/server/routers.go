package server

import (
	"order-system/handler/order"
	orderDB "order-system/infra/db/order"
	orderUsecase "order-system/usecase/order"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	r := gin.Default()

	r.Use(cors.Default())

	orderRepo := orderDB.NewOrderRepository(db)
	orderUC := orderUsecase.NewOrderUsecase(orderRepo)
	orderHandler := order.NewOrderHandler(orderUC)

	orderGroup := r.Group("/api/orders")
	{
		orderGroup.POST("", orderHandler.CreateOrder)
		orderGroup.GET("", orderHandler.GetOrders)
		orderGroup.PUT("/:id/status", orderHandler.UpdateOrderStatus)
	}

	return r.Run(":8080")
}


// func RegisterMenuRoutes(r *gin.Engine) {
// 	menuGroup := r.Group("/api/menus")
// 	{
// 		menuGroup.POST("", controllers.CreateMenu)
// 		menuGroup.GET("", controllers.GetMenus)
// 		menuGroup.PUT("/:id", controllers.UpdateMenu)
// 		menuGroup.DELETE("/:id", controllers.DeleteMenu)
// 	}
// }
