package order

import (
	"errors"
	"net/http"
	"strconv"

	orderUsecase "order-system/usecase/order"

	"github.com/gin-gonic/gin"
)

type Handler interface {
	CreateOrder(c *gin.Context)
	GetOrders(c *gin.Context)
	UpdateOrderStatus(c *gin.Context)
}

type orderHandlerImpl struct {
	orderUsecase orderUsecase.OrderUsecase
}

func NewOrderHandler(
	orderUC orderUsecase.OrderUsecase,
) Handler {
	return &orderHandlerImpl{
		orderUsecase: orderUC,
	}
}

func (h *orderHandlerImpl) CreateOrder(c *gin.Context) {
	var req CreateOrderDTO

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "items is required",
		})
		return
	}

	items := make(
		[]orderUsecase.CreateOrderItemInput,
		0,
		len(req.Items),
	)

	for _, item := range req.Items {
		if item.MenuID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "menu_id is required",
			})
			return
		}

		if item.Quantity <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "quantity must be greater than 0",
			})
			return
		}

		items = append(items, orderUsecase.CreateOrderItemInput{
			MenuID:   item.MenuID,
			Quantity: item.Quantity,
		})
	}

	createdOrder, err := h.orderUsecase.CreateOrder(items)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	res := CreateOrderResponse{
		ID:         createdOrder.ID,
		Status:     createdOrder.Status,
		OrderItems: createdOrder.OrderItems,
	}

	c.JSON(http.StatusCreated, res)
}

func (h *orderHandlerImpl) GetOrders(c *gin.Context) {
	orders, err := h.orderUsecase.GetOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to retrieve orders",
		})
		return
	}

	res := GetOrdersResponse{
		Orders: orders,
	}

	c.JSON(http.StatusOK, res)
}

func (h *orderHandlerImpl) UpdateOrderStatus(c *gin.Context) {
	idStr := c.Param("id")

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid order id",
		})
		return
	}

	var req UpdateOrderStatusDTO

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request body",
		})
		return
	}

	if req.Status == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "status is required",
		})
		return
	}

	updatedOrder, err := h.orderUsecase.UpdateOrderStatus(
		uint(id),
		req.Status,
	)
	if err != nil {
		if errors.Is(err, orderUsecase.ErrInvalidOrderStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	res := UpdateOrderStatusResponse{
		ID:         updatedOrder.ID,
		Status:     updatedOrder.Status,
		OrderItems: updatedOrder.OrderItems,
	}

	c.JSON(http.StatusOK, res)
}
