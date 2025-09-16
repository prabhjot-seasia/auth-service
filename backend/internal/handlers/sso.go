package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/auth"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type SSOHandler struct {
	userService *services.UserService
	jwtManager  *auth.JWTManager
}

func NewSSOHandler(userService *services.UserService, jwtManager *auth.JWTManager) *SSOHandler {
	return &SSOHandler{
		userService: userService,
		jwtManager:  jwtManager,
	}
}

type ValidateTokenRequest struct {
	Token        string `json:"token" binding:"required"`
	ClientID     string `json:"client_id" binding:"required"`
	ClientSecret string `json:"client_secret" binding:"required"`
}

type ValidateTokenResponse struct {
	Valid       bool                      `json:"valid"`
	UserID      string                    `json:"user_id,omitempty"`
	Username    string                    `json:"username,omitempty"`
	Email       string                    `json:"email,omitempty"`
	Roles       []string                  `json:"roles,omitempty"`
	Groups      []string                  `json:"groups,omitempty"`
	Permissions []EffectivePermission     `json:"permissions,omitempty"`
	ServiceID   string                    `json:"service_id,omitempty"`
	ServiceName string                    `json:"service_name,omitempty"`
	ExpiresAt   int64                     `json:"expires_at,omitempty"`
	Error       string                    `json:"error,omitempty"`
}

type EffectivePermission struct {
	Resource string `json:"resource"`
	Action   string `json:"action"`
}

// validateServiceCredentials validates client ID and secret
func (h *SSOHandler) validateServiceCredentials(clientID, clientSecret string) (*models.Service, error) {
	// Get service by client ID
	service, err := h.userService.GetServiceByClientID(clientID)
	if err != nil {
		return nil, err
	}

	// Check if service is active
	if !service.IsActive {
		return nil, errors.New("service disabled")
	}

	// Validate client secret
	err = bcrypt.CompareHashAndPassword([]byte(service.ClientSecret), []byte(clientSecret))
	if err != nil {
		return nil, errors.New("invalid client credentials")
	}

	return service, nil
}

// ValidateToken validates both JWT token and service credentials
// This ensures dual authentication: user token + service identity
func (h *SSOHandler) ValidateToken(c *gin.Context) {
	var req ValidateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ValidateTokenResponse{
			Valid: false,
			Error: "invalid request: " + err.Error(),
		})
		return
	}

	// First validate service credentials
	service, err := h.validateServiceCredentials(req.ClientID, req.ClientSecret)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "service authentication failed: " + err.Error(),
		})
		return
	}

	// Then validate the JWT token
	claims, err := h.jwtManager.ValidateToken(req.Token)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "invalid token",
		})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "invalid user ID in token",
		})
		return
	}

	// Get user to verify they still exist and are active
	user, err := h.userService.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "user not found",
		})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "user account disabled",
		})
		return
	}

	// Get user's effective permissions
	permissions, err := h.userService.GetUserEffectivePermissions(userID)
	if err != nil {
		// Log error but don't fail the validation
		permissions = []services.Permission{}
	}

	// Convert permissions to response format
	effectivePerms := make([]EffectivePermission, len(permissions))
	for i, perm := range permissions {
		effectivePerms[i] = EffectivePermission{
			Resource: perm.Resource,
			Action:   perm.Action,
		}
	}

	c.JSON(http.StatusOK, ValidateTokenResponse{
		Valid:       true,
		UserID:      claims.UserID,
		Username:    claims.Username,
		Email:       claims.Email,
		Roles:       claims.Roles,
		Groups:      claims.Groups,
		Permissions: effectivePerms,
		ServiceID:   service.ID.String(),
		ServiceName: service.Name,
		ExpiresAt:   claims.ExpiresAt.Unix(),
	})
}

// ValidateTokenFromHeader validates token from header + service credentials from headers
// This provides a RESTful endpoint for external services with dual authentication
func (h *SSOHandler) ValidateTokenFromHeader(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "no authorization header",
		})
		return
	}

	// Get service credentials from headers
	clientID := c.GetHeader("X-Client-ID")
	clientSecret := c.GetHeader("X-Client-Secret")
	if clientID == "" || clientSecret == "" {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "service credentials required (X-Client-ID and X-Client-Secret headers)",
		})
		return
	}

	// Validate service credentials first
	service, err := h.validateServiceCredentials(clientID, clientSecret)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "service authentication failed: " + err.Error(),
		})
		return
	}

	// Extract Bearer token
	tokenParts := strings.SplitN(authHeader, " ", 2)
	if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "invalid authorization header format",
		})
		return
	}

	token := tokenParts[1]

	// Validate the JWT token directly
	claims, err := h.jwtManager.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "invalid token",
		})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "invalid user ID in token",
		})
		return
	}

	// Get user to verify they still exist and are active
	user, err := h.userService.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "user not found",
		})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusOK, ValidateTokenResponse{
			Valid: false,
			Error: "user account disabled",
		})
		return
	}

	// Get user's effective permissions
	permissions, err := h.userService.GetUserEffectivePermissions(userID)
	if err != nil {
		// Log error but don't fail the validation
		permissions = []services.Permission{}
	}

	// Convert permissions to response format
	effectivePerms := make([]EffectivePermission, len(permissions))
	for i, perm := range permissions {
		effectivePerms[i] = EffectivePermission{
			Resource: perm.Resource,
			Action:   perm.Action,
		}
	}

	c.JSON(http.StatusOK, ValidateTokenResponse{
		Valid:       true,
		UserID:      claims.UserID,
		Username:    claims.Username,
		Email:       claims.Email,
		Roles:       claims.Roles,
		Groups:      claims.Groups,
		Permissions: effectivePerms,
		ServiceID:   service.ID.String(),
		ServiceName: service.Name,
		ExpiresAt:   claims.ExpiresAt.Unix(),
	})
}

type CheckPermissionRequest struct {
	Token        string `json:"token" binding:"required"`
	Resource     string `json:"resource" binding:"required"`
	Action       string `json:"action" binding:"required"`
	ClientID     string `json:"client_id" binding:"required"`
	ClientSecret string `json:"client_secret" binding:"required"`
}

type CheckPermissionResponse struct {
	Allowed bool   `json:"allowed"`
	Error   string `json:"error,omitempty"`
}

// CheckPermission validates token + service credentials and checks user permission
func (h *SSOHandler) CheckPermission(c *gin.Context) {
	var req CheckPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, CheckPermissionResponse{
			Allowed: false,
			Error:   "invalid request: " + err.Error(),
		})
		return
	}

	// First validate service credentials
	_, err := h.validateServiceCredentials(req.ClientID, req.ClientSecret)
	if err != nil {
		c.JSON(http.StatusOK, CheckPermissionResponse{
			Allowed: false,
			Error:   "service authentication failed: " + err.Error(),
		})
		return
	}

	// Then validate the JWT token
	claims, err := h.jwtManager.ValidateToken(req.Token)
	if err != nil {
		c.JSON(http.StatusOK, CheckPermissionResponse{
			Allowed: false,
			Error:   "invalid token",
		})
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		c.JSON(http.StatusOK, CheckPermissionResponse{
			Allowed: false,
			Error:   "invalid user ID in token",
		})
		return
	}

	// Check if user has the specific permission
	hasPermission, err := h.userService.CheckUserPermission(userID, req.Action, req.Resource)
	if err != nil {
		c.JSON(http.StatusInternalServerError, CheckPermissionResponse{
			Allowed: false,
			Error:   "failed to check permission: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, CheckPermissionResponse{
		Allowed: hasPermission,
	})
}

type ServiceLoginRequest struct {
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	ServiceID  string `json:"service_id" binding:"required"`
	RedirectURI string `json:"redirect_uri,omitempty"`
}

type ServiceLoginResponse struct {
	Success     bool   `json:"success"`
	AccessToken string `json:"access_token,omitempty"`
	RedirectURI string `json:"redirect_uri,omitempty"`
	Error       string `json:"error,omitempty"`
}

// ServiceLogin handles SSO login for external services
func (h *SSOHandler) ServiceLogin(c *gin.Context) {
	var req ServiceLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ServiceLoginResponse{
			Success: false,
			Error:   "invalid request: " + err.Error(),
		})
		return
	}

	// Validate service exists
	serviceUUID, err := uuid.Parse(req.ServiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, ServiceLoginResponse{
			Success: false,
			Error:   "invalid service ID",
		})
		return
	}

	service, err := h.userService.GetServiceByID(serviceUUID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{
			Success: false,
			Error:   "service not found",
		})
		return
	}

	if !service.IsActive {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{
			Success: false,
			Error:   "service disabled",
		})
		return
	}

	// Authenticate user
	user, err := h.userService.GetByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{
			Success: false,
			Error:   "invalid credentials",
		})
		return
	}

	// Validate password (simplified - use your existing password validation)
	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{
			Success: false,
			Error:   "account disabled",
		})
		return
	}

	// Check if user has access to this service through groups
	hasAccess, err := h.userService.CheckUserServiceAccess(user.ID, serviceUUID)
	if err != nil || !hasAccess {
		c.JSON(http.StatusForbidden, ServiceLoginResponse{
			Success: false,
			Error:   "access denied to this service",
		})
		return
	}

	// Generate roles and groups
	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	groupSet := make(map[string]bool)
	for _, role := range user.Roles {
		for _, group := range role.Groups {
			groupSet[group.Name] = true
		}
	}

	groups := make([]string, 0, len(groupSet))
	for groupName := range groupSet {
		groups = append(groups, groupName)
	}

	// Generate access token
	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.Username, user.Email, roles, groups)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ServiceLoginResponse{
			Success: false,
			Error:   "failed to generate token",
		})
		return
	}

	// Determine redirect URI
	redirectURI := req.RedirectURI
	if redirectURI == "" {
		redirectURI = service.RedirectURI
	}

	c.JSON(http.StatusOK, ServiceLoginResponse{
		Success:     true,
		AccessToken: accessToken,
		RedirectURI: redirectURI,
	})
}

type LogoutRequest struct {
	Token string `json:"token" binding:"required"`
}

type LogoutResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// Logout handles SSO logout - invalidates the token
func (h *SSOHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, LogoutResponse{
			Success: false,
			Error:   "invalid request: " + err.Error(),
		})
		return
	}

	// Validate the token first
	_, err := h.jwtManager.ValidateToken(req.Token)
	if err != nil {
		c.JSON(http.StatusOK, LogoutResponse{
			Success: false,
			Error:   "invalid token",
		})
		return
	}

	// For now, since we're using stateless JWTs, we'll just return success
	// In a production system, you might want to maintain a blacklist of invalidated tokens
	// or use shorter-lived tokens with a token refresh mechanism

	c.JSON(http.StatusOK, LogoutResponse{
		Success: true,
	})
}