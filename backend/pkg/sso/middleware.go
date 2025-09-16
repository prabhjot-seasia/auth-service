package sso

import (
	"context"
	"net/http"
	"strings"
)

// ContextKey represents the key type for storing user info in context
type ContextKey string

const (
	// UserInfoKey is the context key for storing user information
	UserInfoKey ContextKey = "sso_user_info"
)

// Middleware provides SSO authentication middleware for external services
type Middleware struct {
	client *Client
}

// NewMiddleware creates a new SSO middleware
func NewMiddleware(authServiceURL string) *Middleware {
	return &Middleware{
		client: NewClient(authServiceURL),
	}
}

// Authenticate is HTTP middleware that validates SSO tokens
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Validate token with auth service
		userInfo, err := m.client.ValidateTokenFromHeader(authHeader)
		if err != nil {
			http.Error(w, "Failed to validate token", http.StatusInternalServerError)
			return
		}

		if !userInfo.Valid {
			http.Error(w, "Invalid token: "+userInfo.Error, http.StatusUnauthorized)
			return
		}

		// Store user info in context
		ctx := context.WithValue(r.Context(), UserInfoKey, userInfo)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequirePermission creates middleware that requires a specific permission
func (m *Middleware) RequirePermission(resource, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			// Extract token from header
			tokenParts := strings.SplitN(authHeader, " ", 2)
			if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			token := tokenParts[1]

			// Check permission
			allowed, err := m.client.CheckPermission(token, resource, action)
			if err != nil {
				http.Error(w, "Failed to check permission", http.StatusInternalServerError)
				return
			}

			if !allowed {
				http.Error(w, "Insufficient permissions", http.StatusForbidden)
				return
			}

			// Get user info for context
			userInfo, err := m.client.ValidateToken(token)
			if err != nil {
				http.Error(w, "Failed to validate token", http.StatusInternalServerError)
				return
			}

			// Store user info in context
			ctx := context.WithValue(r.Context(), UserInfoKey, userInfo)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserInfo extracts user info from request context
func GetUserInfo(r *http.Request) (*UserInfo, bool) {
	userInfo, ok := r.Context().Value(UserInfoKey).(*UserInfo)
	return userInfo, ok
}

// Example usage for external services:
//
// func main() {
//     // Create SSO middleware
//     ssoMiddleware := sso.NewMiddleware("http://auth-service:8080")
//     
//     // Create router
//     mux := http.NewServeMux()
//     
//     // Protected endpoint that requires authentication
//     mux.Handle("/protected", ssoMiddleware.Authenticate(http.HandlerFunc(protectedHandler)))
//     
//     // Protected endpoint that requires specific permission
//     mux.Handle("/admin", ssoMiddleware.RequirePermission("admin", "read")(http.HandlerFunc(adminHandler)))
//     
//     http.ListenAndServe(":8081", mux)
// }
//
// func protectedHandler(w http.ResponseWriter, r *http.Request) {
//     userInfo, ok := sso.GetUserInfo(r)
//     if !ok {
//         http.Error(w, "No user info", http.StatusInternalServerError)
//         return
//     }
//     
//     fmt.Fprintf(w, "Hello %s! Roles: %v", userInfo.Username, userInfo.Roles)
// }