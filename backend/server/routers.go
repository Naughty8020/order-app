package server

import (
	"errors"
	"os"
	"strings"

	"order-system/handler/menu"
	"order-system/handler/order"
	orderAccessHandler "order-system/handler/orderaccess"
	menuDB "order-system/infra/db/menu"
	orderDB "order-system/infra/db/order"
	"order-system/security/orderaccess"
	menuUsecase "order-system/usecase/menu"
	orderUsecase "order-system/usecase/order"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	accessSecret := os.Getenv("ORDER_ACCESS_SECRET")
	staffKey := os.Getenv("STAFF_ACCESS_KEY")
	if accessSecret == "" || staffKey == "" {
		return errors.New("ORDER_ACCESS_SECRET and STAFF_ACCESS_KEY must be set")
	}

	r := gin.Default()
	allowedOrigins := []string{"http://localhost:3000"}
	if configured := os.Getenv("FRONTEND_ORIGINS"); configured != "" {
		allowedOrigins = strings.Split(configured, ",")
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "X-Order-Session", "X-Staff-Key"},
	}))

	accessManager := orderaccess.NewManager(accessSecret)
	accessHandler := orderAccessHandler.NewHandler(accessManager, staffKey)

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
		orderGroup.POST("", accessHandler.RequireOrderSession, orderHandler.CreateOrder)
		orderGroup.GET("", orderHandler.GetOrders)
		orderGroup.PUT("/:id/status", orderHandler.UpdateOrderStatus)
	}

	accessGroup := r.Group("/api/order-access")
	{
		accessGroup.GET("/qr", accessHandler.GetQRToken)
		accessGroup.POST("/session", accessHandler.CreateSession)
	}

	return r.Run(":8080")
}
