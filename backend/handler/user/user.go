package user

import (
	"errors"
	"net/http"
	"order-system/usecase/user"

	"github.com/gin-gonic/gin"
)

type UserUsecase interface {
	Login(userName, password string) (string, error)
}

type Handler struct {
	usecase UserUsecase
}

func NewUserHandler(usecase UserUsecase) *Handler {
	return &Handler{
		usecase: usecase,
	}
}

type loginRequest struct {
	UserName string `json:"userName" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "username and password are required",
		})
		return
	}

	token, err := h.usecase.Login(req.UserName, req.Password)
	if err != nil {
		if errors.Is(err, user.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid username or password",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token": token,
	})
}
