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
	orderSessionDB "order-system/infra/db/ordersession"
	menuUsecase "order-system/usecase/menu"
	orderUsecase "order-system/usecase/order"
	orderSessionUsecase "order-system/usecase/ordersession"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	accessSecret := os.Getenv("ORDER_ACCESS_SECRET")
	if accessSecret == "" {
		return errors.New("ORDER_ACCESS_SECRET must be set")
	}

	r := gin.Default()
	allowedOrigins := []string{"http://localhost:3000"}
	if configured := os.Getenv("FRONTEND_ORIGINS"); configured != "" {
		allowedOrigins = strings.Split(configured, ",")
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "X-Order-Session"},
	}))

	sessionRepo := orderSessionDB.NewOrderSessionRepository(db)

	accessUC := orderSessionUsecase.NewOrderAccessUsecase(
		sessionRepo,
		accessSecret,
	)

	accessHandler := orderAccessHandler.NewHandler(accessUC)

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
