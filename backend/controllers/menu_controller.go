package controllers

import (
	"net/http"

	"order-system/config"
	"order-system/models"

	"github.com/gin-gonic/gin"
)

func CreateMenu(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		Price       int    `json:"price" binding:"required,gt=0"`
		IsAvailable bool   `json:"is_available" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	menu := models.Menu{
		Name:        input.Name,
		Price:       input.Price,
		IsAvailable: input.IsAvailable,
	}

	if err := config.DB.Create(&menu).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create menu"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": menu})
}

func GetMenus(c *gin.Context) {
	var menus []models.Menu
	if err := config.DB.Find(&menus).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve menus"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": menus})
}
