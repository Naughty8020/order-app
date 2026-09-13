package server

import (
	"net/http"
	orderHandler "order-system/handler/order"
	orderDB "order-system/infra/db/order"
	orderUsecase "order-system/usecase/order"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func Run(db *gorm.DB) error {
	r := chi.NewRouter()


OrderRepository := orderDB.NewOrderRepository(db)
orderUsecase := orderUsecase.NewOrderUsecase(OrderRepository)
orderHandler := orderHandler.NewOrderHandler(orderUsecase)

	r.Route("/api/orders", func(r chi.Router) {
		r.Post("/", orderHandler.CreateOrder)
		r.Get("/", orderHandler.GetOrders)
		r.Put("/{id}/status", orderHandler.UpdateOrderStatus)
	})

	return http.ListenAndServe(":8080", r)
}

// func RegisterRoutes(w http.ResponseWriter, r *http.Request) {
// 	{
// 		orderGroup.POST
// 		orderGroup.GET("", controllers.GetOrders)
// 		orderGroup.PUT("/:id/status", controllers.UpdateOrderStatus)
// 	}
// }

// func RegisterMenuRoutes(r *gin.Engine) {
// 	menuGroup := r.Group("/api/menus")
// 	{
// 		menuGroup.POST("", controllers.CreateMenu)
// 		menuGroup.GET("", controllers.GetMenus)
// 		menuGroup.PUT("/:id", controllers.UpdateMenu)
// 		menuGroup.DELETE("/:id", controllers.DeleteMenu)
// 	}
// }
