package server

import (
	"errors"
	"os"
	"strings"
	"time"

	"order-system/config"
	"order-system/handler/menu"
	"order-system/handler/order"
	orderAccessHandler "order-system/handler/orderaccess"
	menuDB "order-system/infra/db/menu"
	orderDB "order-system/infra/db/order"
	orderSessionDB "order-system/infra/db/ordersession"
	"order-system/middleware"
	menuUsecase "order-system/usecase/menu"
	orderUsecase "order-system/usecase/order"
	orderSessionUsecase "order-system/usecase/ordersession"

	userHandler "order-system/handler/user"
	userDB "order-system/infra/db/user"
	userUsecase "order-system/usecase/user"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	accessSecret := os.Getenv("ORDER_ACCESS_SECRET")
	if accessSecret == "" {
		return errors.New("ORDER_ACCESS_SECRET must be set")
	}

	secret := os.Getenv("JWT_SECRET")
	if err := config.ValidateJWTSecret(secret); err != nil {
		return err
	}
	adminUsername := os.Getenv("ADMIN_USERNAME")

	if adminUsername == "" {
		return errors.New("ADMIN_USERNAME must be set")
	}

	auth := middleware.NewAuthMiddleware(db, secret, adminUsername)

	r := gin.Default()
	allowedOrigins := []string{"http://localhost:3000"}
	if configured := os.Getenv("FRONTEND_ORIGINS"); configured != "" {
		allowedOrigins = nil
		for _, o := range strings.Split(configured, ",") {
			if o = strings.TrimSpace(o); o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "X-Order-Session", "Authorization"},
	}))

	sessionRepo := orderSessionDB.NewOrderSessionRepository(db)

	accessUC := orderSessionUsecase.NewOrderAccessUsecase(
		sessionRepo,
		accessSecret,
	)

	go func() {
		ticker := time.NewTicker(10 * time.Minute)

		for range ticker.C {
			accessUC.DeleteExpiredSessions()
		}
	}()

	accessHandler := orderAccessHandler.NewHandler(accessUC)

	menuRepo := menuDB.NewMenuRepository(db)
	menuUC := menuUsecase.NewMenuUsecase(menuRepo)
	menuHandler := menu.NewMenuHandler(menuUC)

	orderRepo := orderDB.NewOrderRepository(db)
	orderUC := orderUsecase.NewOrderUsecase(orderRepo)
	orderHandler := order.NewOrderHandler(orderUC)

	userRepo := userDB.NewUserRepository(db)
	userUC := userUsecase.NewUserUsecase(userRepo)
	loginHandler := userHandler.NewUserHandler(userUC)

	menuGroup := r.Group("/api/menus")
	{
		menuGroup.GET("", menuHandler.GetMenus)
		menuGroup.POST("", auth.RequireAdmin, menuHandler.CreateMenu)
		menuGroup.PUT("/:id", auth.RequireAdmin, menuHandler.UpdateMenu)
		menuGroup.DELETE("/:id", auth.RequireAdmin, menuHandler.DeleteMenu)
	}

	orderGroup := r.Group("/api/orders")
	{
		orderGroup.POST("", accessHandler.RequireOrderSession, orderHandler.CreateOrder)
		orderGroup.GET("", orderHandler.GetOrders)
		orderGroup.PUT("/:id/status", auth.RequireAdmin, orderHandler.UpdateOrderStatus)
	}

	accessGroup := r.Group("/api/order-access")
	{
		accessGroup.GET("/qr", auth.RequireAdmin, accessHandler.GetQRToken)
		accessGroup.POST("/session", accessHandler.CreateSession)
	}
	r.POST("/api/login", loginHandler.Login)
	return r.Run(":8080")
}
