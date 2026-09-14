package server

import (
	"order-system/handler/menu"
	"order-system/handler/order"
	menuDB "order-system/infra/db/menu"
	orderDB "order-system/infra/db/order"
	menuUsecase "order-system/usecase/menu"
	orderUsecase "order-system/usecase/order"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	r := gin.Default()

	r.Use(cors.Default())

	menuRepo := menuDB.NewMenuRepository(db)
	menuUC := menuUsecase.NewMenuUsecase(menuRepo)
	menuHandler := menu.NewMenuHandler(menuUC)

	orderRepo := orderDB.NewOrderRepository(db)
	orderUC := orderUsecase.NewOrderUsecase(orderRepo)
	orderHandler := order.NewOrderHandler(orderUC)

	menuGroup := r.Group("/api/menus")
	{
		menuGroup.POST("", menuHandler.CreateMenu)
		menuGroup.GET("", menuHandler.GetMenus)
		menuGroup.PUT("/:id", menuHandler.UpdateMenu)
		menuGroup.DELETE("/:id", menuHandler.DeleteMenu)
	}

	orderGroup := r.Group("/api/orders")
	{
		orderGroup.POST("", orderHandler.CreateOrder)
		orderGroup.GET("", orderHandler.GetOrders)
		orderGroup.PUT("/:id/status", orderHandler.UpdateOrderStatus)
	}

	return r.Run(":8080")
}
