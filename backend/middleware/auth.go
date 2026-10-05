package middleware

import (
	"net/http"
	"order-system/models"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type AuthMiddleware struct {
	db            *gorm.DB
	secret        string
	adminUsername string
}

func NewAuthMiddleware(db *gorm.DB, secret string, adminUsername string) *AuthMiddleware {
	return &AuthMiddleware{db: db, secret: secret, adminUsername: adminUsername}
}

func (m *AuthMiddleware) RequireAdmin(c *gin.Context) {
	if m.secret == "" || m.adminUsername == "" {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "login required",
		})
		return
	}

	parts := strings.Fields(c.GetHeader("Authorization"))
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "login require",
		})
		return
	}

	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(
		parts[1],
		claims,
		func(_ *jwt.Token) (any, error) {
			return []byte(m.secret), nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "invalid or expired token",
		})
		return
	}

	id, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil || id == 0 {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "invalid token",
		})
		return
	}

	var count int64
	err = m.db.Model(&models.User{}).
		Where("id = ? AND user_name = ?", id, m.adminUsername).
		Count(&count).Error

	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
		return
	}
	if count != 1 {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "admin access required",
		})
		return
	}
	c.Next()
}
