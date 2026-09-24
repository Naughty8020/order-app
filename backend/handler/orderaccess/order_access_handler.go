package orderaccess

import (
	"net/http"
	"time"

	"order-system/security/orderaccess"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	manager *orderaccess.Manager
}

func NewHandler(manager *orderaccess.Manager) *Handler {
	return &Handler{manager: manager}
}

func (h *Handler) GetQRToken(c *gin.Context) {
	token, expiresAt := h.manager.CurrentQRToken()
	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_at": expiresAt.Format(time.RFC3339),
	})
}

func (h *Handler) CreateSession(c *gin.Context) {
	token := c.Query("token")
	sessionToken, expiresAt, err := h.manager.ExchangeQRToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired QR token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"session_token": sessionToken,
		"expires_at":    expiresAt.Format(time.RFC3339),
	})
}

func (h *Handler) RequireOrderSession(c *gin.Context) {
	err := h.manager.ConsumeOrder(c.GetHeader("X-Order-Session"))
	if err == orderaccess.ErrRateLimited {
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"error": "too many orders; please wait before ordering again",
		})
		return
	}
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "a valid order session is required",
		})
		return
	}

	c.Next()
}
