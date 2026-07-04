package controllers

import (
	"net/http"

	"order-system/config"
	"order-system/models"

	"github.com/gin-gonic/gin"
)

func CreateOrder(c *gin.Context) {
	var input struct {
		MenuID   uint `json:"menu_id" binding:"required"`
		Quantity int  `json:"quantity" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := config.DB.Begin()

	var menu models.Menu
	if err := tx.First(&menu, input.MenuID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Menu not found"})
		return
	}

	if !menu.IsAvailable {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Menu item is not available"})
		return
	}

	totalPrice := menu.Price * input.Quantity

	order := models.Order{
		MenuID:     input.MenuID,
		Quantity:   input.Quantity,
		TotalPrice: totalPrice,
		Status:     "pending",
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}
	tx.Commit()

	config.DB.Preload("Menu").First(&order, order.ID)
	c.JSON(http.StatusCreated, gin.H{"order": order})
}

func GetOrders(c *gin.Context) {
	var orders []models.Order
	if err := config.DB.Preload("Menu").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve orders"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}
