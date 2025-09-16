package sso

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// GinMiddleware provides Gin-specific SSO middleware
type GinMiddleware struct {
	client *Client
}

// NewGinMiddleware creates a new Gin SSO middleware
func NewGinMiddleware(authServiceURL string) *GinMiddleware {
	return &GinMiddleware{
		client: NewClient(authServiceURL),
	}
}

// Authenticate is Gin middleware that validates SSO tokens
func (m *GinMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Validate token with auth service
		userInfo, err := m.client.ValidateTokenFromHeader(authHeader)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate token"})
			c.Abort()
			return
		}

		if !userInfo.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token", "details": userInfo.Error})
			c.Abort()
			return
		}

		// Store user info in Gin context
		c.Set("sso_user_info", userInfo)
		c.Next()
	}
}

// RequirePermission creates Gin middleware that requires a specific permission
func (m *GinMiddleware) RequirePermission(resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from header
		tokenParts := strings.SplitN(authHeader, " ", 2)
		if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := tokenParts[1]

		// Check permission
		allowed, err := m.client.CheckPermission(token, resource, action)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permission"})
			c.Abort()
			return
		}

		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		// Get user info for context
		userInfo, err := m.client.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate token"})
			c.Abort()
			return
		}

		// Store user info in Gin context
		c.Set("sso_user_info", userInfo)
		c.Next()
	}
}

// GetUserInfoFromGin extracts user info from Gin context
func GetUserInfoFromGin(c *gin.Context) (*UserInfo, bool) {
	userInfo, exists := c.Get("sso_user_info")
	if !exists {
		return nil, false
	}

	ssoUserInfo, ok := userInfo.(*UserInfo)
	return ssoUserInfo, ok
}

// Example usage for external Gin services:
//
// func main() {
//     // Create SSO middleware
//     ssoMiddleware := sso.NewGinMiddleware("http://auth-service:8080")
//     
//     // Create Gin router
//     r := gin.Default()
//     
//     // Protected endpoint that requires authentication
//     r.GET("/protected", ssoMiddleware.Authenticate(), protectedHandler)
//     
//     // Protected endpoint that requires specific permission
//     r.GET("/admin", ssoMiddleware.RequirePermission("admin", "read"), adminHandler)
//     
//     r.Run(":8081")
// }
//
// func protectedHandler(c *gin.Context) {
//     userInfo, ok := sso.GetUserInfoFromGin(c)
//     if !ok {
//         c.JSON(500, gin.H{"error": "No user info"})
//         return
//     }
//     
//     c.JSON(200, gin.H{
//         "message": "Hello " + userInfo.Username,
//         "roles":   userInfo.Roles,
//     })
// }