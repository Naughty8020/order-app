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

func UpdateMenu(c *gin.Context) {
	var input struct {
		Name        *string `json:"name"`
		Price       *int    `json:"price" binding:"omitempty,gt=0"`
		IsAvailable *bool   `json:"is_available"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var menu models.Menu
	if err := config.DB.First(&menu, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Menu not found"})
		return
	}

	if input.Name != nil {
		menu.Name = *input.Name
	}
	if input.Price != nil {
		menu.Price = *input.Price
	}
	if input.IsAvailable != nil {
		menu.IsAvailable = *input.IsAvailable
	}

	if err := config.DB.Save(&menu).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update menu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": menu})
}

func DeleteMenu(c *gin.Context) {
	var menu models.Menu
	if err := config.DB.First(&menu, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Menu not found"})
		return
	}

	if err := config.DB.Delete(&menu).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete menu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Menu deleted successfully"})
}
