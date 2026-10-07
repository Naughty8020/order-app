package menu

import (
	"errors"
	"net/http"
	"strconv"

	menuUsecase "order-system/usecase/menu"

	"github.com/gin-gonic/gin"
)

type Handler interface {
	CreateMenu(c *gin.Context)
	GetMenus(c *gin.Context)
	UpdateMenu(c *gin.Context)
	DeleteMenu(c *gin.Context)
}

type menuHandlerImpl struct {
	menuUsecase menuUsecase.MenuUsecase
}

func NewMenuHandler(menuUC menuUsecase.MenuUsecase) Handler {
	return &menuHandlerImpl{
		menuUsecase: menuUC,
	}
}

func (h *menuHandlerImpl) CreateMenu(c *gin.Context) {
	var req CreateMenuDTO

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	createdMenu, err := h.menuUsecase.CreateMenu(menuUsecase.CreateMenuInput{
		Name:          req.Name,
		Price:         req.Price,
		IsAvailable:   req.IsAvailable,
		IsRecommended: req.IsRecommended,
		IsFeatured:    req.IsFeatured,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create menu"})
		return
	}

	c.JSON(http.StatusCreated, CreateMenuResponse{Data: *createdMenu})
}

func (h *menuHandlerImpl) GetMenus(c *gin.Context) {
	menus, err := h.menuUsecase.GetMenus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve menus"})
		return
	}

	c.JSON(http.StatusOK, GetMenusResponse{Data: menus})
}

func (h *menuHandlerImpl) UpdateMenu(c *gin.Context) {
	id, ok := parseMenuID(c)
	if !ok {
		return
	}

	var req UpdateMenuDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updatedMenu, err := h.menuUsecase.UpdateMenu(id, menuUsecase.UpdateMenuInput{
		Name:          req.Name,
		Price:         req.Price,
		IsAvailable:   req.IsAvailable,
		IsRecommended: req.IsRecommended,
		IsFeatured:    req.IsFeatured,
	})
	if err != nil {
		respondMenuError(c, err, "failed to update menu")
		return
	}

	c.JSON(http.StatusOK, UpdateMenuResponse{Data: *updatedMenu})
}

func (h *menuHandlerImpl) DeleteMenu(c *gin.Context) {
	id, ok := parseMenuID(c)
	if !ok {
		return
	}

	if err := h.menuUsecase.DeleteMenu(id); err != nil {
		respondMenuError(c, err, "failed to delete menu")
		return
	}

	c.JSON(http.StatusOK, DeleteMenuResponse{Message: "Menu deleted successfully"})
}

func parseMenuID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid menu id"})
		return 0, false
	}

	return uint(id), true
}

func respondMenuError(c *gin.Context, err error, fallbackMessage string) {
	if errors.Is(err, menuUsecase.ErrMenuNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "menu not found"})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": fallbackMessage})
}
