package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/auth"
	"github.com/seasia/auth-service/internal/services"
)

func AuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		claims, err := jwtManager.ValidateToken(bearerToken[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)
		c.Set("roles", claims.Roles)
		c.Set("groups", claims.Groups)
		c.Set("claims", claims)

		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("RequireRole called for roles: %v", roles)
		userRoles, exists := c.Get("roles")
		log.Printf("User roles exist: %v, roles: %v", exists, userRoles)
		if !exists {
			log.Printf("No roles found in context - access denied")
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			c.Abort()
			return
		}

		userRolesList := userRoles.([]string)
		log.Printf("Checking user roles: %v against required roles: %v", userRolesList, roles)
		for _, userRole := range userRolesList {
			for _, requiredRole := range roles {
				log.Printf("Comparing userRole=%s with requiredRole=%s", userRole, requiredRole)
				if userRole == requiredRole {
					log.Printf("Role match found - access granted")
					c.Next()
					return
				}
			}
		}

		log.Printf("No role match - insufficient permissions")
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		c.Abort()
	}
}

// RequirePermission checks if the user has a specific permission (action:resource)
func RequirePermission(userService *services.UserService, action, resource string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("RequirePermission: checking %s:%s", action, resource)
		log.Printf("Middleware executing for %s:%s", action, resource)
		
		// No hardcoded role checks - all permissions come from database
		// This ensures dynamic permission management through User->Role->Group->Service->Scopes

		// Get user ID from context
		userID, exists := c.Get("user_id")
		if !exists {
			log.Printf("User not authenticated")
			c.JSON(http.StatusForbidden, gin.H{"error": "user not authenticated"})
			c.Abort()
			return
		}

		userIDStr, ok := userID.(string)
		if !ok {
			log.Printf("Invalid user ID type")
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid user context"})
			c.Abort()
			return
		}

		// Parse user ID to UUID
		userUUID, err := uuid.Parse(userIDStr)
		if err != nil {
			log.Printf("Invalid user ID format: %v", err)
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid user context"})
			c.Abort()
			return
		}

		// Check permission through the user service
		hasPermission, err := userService.CheckUserPermission(userUUID, action, resource)
		if err != nil {
			log.Printf("Permission check error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "permission check failed", "details": err.Error()})
			c.Abort()
			return
		}

		if hasPermission {
			log.Printf("Permission granted: user %s has %s:%s", userIDStr, action, resource)
			c.Next()
			return
		}

		log.Printf("Permission denied: user %s lacks %s:%s", userIDStr, action, resource)
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions", "user_id": userIDStr, "action": action, "resource": resource, "debug": "permission_check_failed"})
		c.Abort()
	}
}

func RequireGroup(groups ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userGroups, exists := c.Get("groups")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			c.Abort()
			return
		}

		userGroupsList := userGroups.([]string)
		for _, userGroup := range userGroupsList {
			for _, requiredGroup := range groups {
				if userGroup == requiredGroup {
					c.Next()
					return
				}
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		c.Abort()
	}
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}