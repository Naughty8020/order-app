package orderaccess

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"order-system/usecase/ordersession"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	usecase ordersession.OrderAccessUsecase
}

func NewHandler(usecase ordersession.OrderAccessUsecase) *Handler {
	return &Handler{usecase: usecase}
}

func (h *Handler) GetQRToken(c *gin.Context) {
	token, expiresAt := h.usecase.CurrentQRToken()
	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_at": expiresAt.Format(time.RFC3339),
	})
}

func (h *Handler) CreateSession(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	sessionToken, expiresAt, err := h.usecase.ExchangeQRToken(req.Token)
	if err != nil {
		if errors.Is(err, ordersession.ErrInvalidQRToken) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired QR token"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"session_token": sessionToken,
		"expires_at":    expiresAt.Format(time.RFC3339),
	})
}

func (h *Handler) RequireOrderSession(c *gin.Context) {
	sessionToken := c.GetHeader("X-Order-Session")
	err := h.usecase.ConsumeOrder(sessionToken)
	if errors.Is(err, ordersession.ErrRateLimited) {
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"error": "too many orders; please wait before ordering again",
		})
		return
	}
	if errors.Is(err, ordersession.ErrInvalidSession) {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "a valid order session is required",
		})
		return
	}

	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}

	defer func() {
		if c.Writer.Status() == http.StatusCreated {
			return
		}
		if err := h.usecase.RefundOrder(sessionToken); err != nil {
			slog.Error("failed to refund order session", "err", err)
		}
	}()

	c.Next()
}
