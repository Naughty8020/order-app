package controllers

import (
	"net/http"

	"order-system/config"
	"order-system/models"

	"github.com/gin-gonic/gin"
)

func CreateOrder(c *gin.Context) {
	var input struct {
		Items []struct {
			MenuID   uint `json:"menu_id" binding:"required"`
			Quantity int  `json:"quantity" binding:"required,gt=0"`
		} `json:"items" binding:"required,dive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(input.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order items cannot be empty"})
		return
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	order := models.Order{
		Status: "pending",
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	for _, itemInput := range input.Items {
		var menu models.Menu
		if err := tx.First(&menu, itemInput.MenuID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "Menu not found"})
			return
		}

		if !menu.IsAvailable {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Menu item " + menu.Name + " is not available"})
			return
		}

		orderItem := models.OrderItem{
			OrderID:  order.ID,
			MenuID:   itemInput.MenuID,
			Quantity: itemInput.Quantity,
			Price:    menu.Price,
		}

		if err := tx.Create(&orderItem).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order item"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	config.DB.Preload("OrderItems.Menu").First(&order, order.ID)
	c.JSON(http.StatusCreated, gin.H{"order": order})
}

func GetOrders(c *gin.Context) {
	var orders []models.Order
	if err := config.DB.Preload("OrderItems.Menu").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve orders"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

func UpdateOrderStatus(c *gin.Context) {
	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if err := config.DB.First(&order, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	order.Status = input.Status

	if err := config.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order status"})
		return
	}

	config.DB.Preload("OrderItems.Menu").First(&order, order.ID)
	c.JSON(http.StatusOK, gin.H{"order": order})
}


