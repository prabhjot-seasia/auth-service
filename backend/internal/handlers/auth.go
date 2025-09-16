package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/auth"
	"github.com/seasia/auth-service/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userService     *services.UserService
	passwordService *services.PasswordService
	jwtManager      *auth.JWTManager
}

func NewAuthHandler(userService *services.UserService, passwordService *services.PasswordService, jwtManager *auth.JWTManager) *AuthHandler {
	return &AuthHandler{
		userService:     userService,
		passwordService: passwordService,
		jwtManager:      jwtManager,
	}
}

type TokenRequest struct {
	GrantType    string `json:"grant_type" binding:"required"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	RefreshToken string `json:"refresh_token"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
}

type TokenResponse struct {
	AccessToken       string                      `json:"access_token"`
	RefreshToken      string                      `json:"refresh_token"`
	TokenType         string                      `json:"token_type"`
	ExpiresIn         int                         `json:"expires_in"`
	PasswordStatus    *PasswordStatusResponse     `json:"password_status,omitempty"`
}

type PasswordStatusResponse struct {
	ForceChange         bool   `json:"force_change"`
	IsExpired           bool   `json:"is_expired"`
	IsExpiringSoon      bool   `json:"is_expiring_soon"`
	DaysUntilExpiry     int    `json:"days_until_expiry"`
	ExpiryWarningDays   int    `json:"expiry_warning_days"`
}

func (h *AuthHandler) Token(c *gin.Context) {
	var req TokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch req.GrantType {
	case "password":
		h.handlePasswordGrant(c, req)
	case "refresh_token":
		h.handleRefreshTokenGrant(c, req)
	case "client_credentials":
		h.handleClientCredentialsGrant(c, req)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported grant type"})
	}
}

func (h *AuthHandler) handlePasswordGrant(c *gin.Context, req TokenRequest) {
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username and password required"})
		return
	}

	user, err := h.userService.GetByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account disabled"})
		return
	}

	// Check password policy status
	passwordStatus := h.passwordService.GetPasswordStatus(user)

	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	// Collect groups through the RBAC chain: User → Roles → Groups
	groupSet := make(map[string]bool)
	for _, role := range user.Roles {
		for _, group := range role.Groups {
			groupSet[group.Name] = true
		}
	}
	
	// Convert set to slice
	groups := make([]string, 0, len(groupSet))
	for groupName := range groupSet {
		groups = append(groups, groupName)
	}

	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.Username, user.Email, roles, groups)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	// Create password status response
	var passwordStatusResp *PasswordStatusResponse
	if passwordStatus.ForceChange || passwordStatus.IsExpired || passwordStatus.IsExpiringSoon {
		passwordStatusResp = &PasswordStatusResponse{
			ForceChange:       passwordStatus.ForceChange,
			IsExpired:         passwordStatus.IsExpired,
			IsExpiringSoon:    passwordStatus.IsExpiringSoon,
			DaysUntilExpiry:   passwordStatus.DaysUntilExpiry,
			ExpiryWarningDays: 7, // This should come from config
		}
	}

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:    accessToken,
		RefreshToken:   refreshToken,
		TokenType:      "Bearer",
		ExpiresIn:      900,
		PasswordStatus: passwordStatusResp,
	})
}

func (h *AuthHandler) handleRefreshTokenGrant(c *gin.Context, req TokenRequest) {
	if req.RefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refresh_token required"})
		return
	}

	userID, err := h.jwtManager.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := h.userService.GetByID(uid)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account disabled"})
		return
	}

	roles := make([]string, len(user.Roles))
	for i, role := range user.Roles {
		roles[i] = role.Name
	}

	// Collect groups through the RBAC chain: User → Roles → Groups
	groupSet := make(map[string]bool)
	for _, role := range user.Roles {
		for _, group := range role.Groups {
			groupSet[group.Name] = true
		}
	}
	
	// Convert set to slice
	groups := make([]string, 0, len(groupSet))
	for groupName := range groupSet {
		groups = append(groups, groupName)
	}

	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.Username, user.Email, roles, groups)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: req.RefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    900,
	})
}

func (h *AuthHandler) handleClientCredentialsGrant(c *gin.Context, req TokenRequest) {
	if req.ClientID == "" || req.ClientSecret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "client_id and client_secret required"})
		return
	}

	service, err := h.userService.GetServiceByClientID(req.ClientID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid client credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(service.ClientSecret), []byte(req.ClientSecret)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid client credentials"})
		return
	}

	if !service.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "service disabled"})
		return
	}

	accessToken, err := h.jwtManager.GenerateAccessToken(service.ID, service.Name, service.ClientID, []string{"service"}, []string{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   900,
	})
}

func (h *AuthHandler) GetMyPermissions(c *gin.Context) {
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userClaims := claims.(*auth.Claims)
	userID, err := uuid.Parse(userClaims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	// Get comprehensive permissions 
	permissions, err := h.userService.GetUserEffectivePermissions(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get permissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"effective_permissions": permissions,
		"roles":                userClaims.Roles,
		"groups":               userClaims.Groups,
	})
}

func (h *AuthHandler) CheckMyPermission(c *gin.Context) {
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userClaims := claims.(*auth.Claims)
	userID, err := uuid.Parse(userClaims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	// Get action and resource from query params
	action := c.Query("action")
	resource := c.Query("resource")
	
	if action == "" || resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action and resource parameters are required"})
		return
	}

	// Check if user has the specific permission
	hasPermission, err := h.userService.CheckUserPermission(userID, action, resource)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"permission": action + ":" + resource,
		"allowed":    hasPermission,
	})
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password" binding:"required"`
}

type PasswordPolicyStatusResponse struct {
	ForceChange         bool       `json:"force_change"`
	IsExpired           bool       `json:"is_expired"`
	IsExpiringSoon      bool       `json:"is_expiring_soon"`
	DaysUntilExpiry     int        `json:"days_until_expiry"`
	ExpiryWarningDays   int        `json:"expiry_warning_days"`
	LastPasswordChange  *time.Time `json:"last_password_change"`
	PasswordExpiresAt   *time.Time `json:"password_expires_at"`
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userClaims := claims.(*auth.Claims)
	userID, err := uuid.Parse(userClaims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.passwordService.ChangePassword(userID, req.CurrentPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password changed successfully"})
}

func (h *AuthHandler) GetPasswordPolicy(c *gin.Context) {
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	userClaims := claims.(*auth.Claims)
	userID, err := uuid.Parse(userClaims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	// Get user with password policy information
	user, err := h.userService.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	passwordStatus := h.passwordService.GetPasswordStatus(user)

	response := PasswordPolicyStatusResponse{
		ForceChange:         passwordStatus.ForceChange,
		IsExpired:           passwordStatus.IsExpired,
		IsExpiringSoon:      passwordStatus.IsExpiringSoon,
		DaysUntilExpiry:     passwordStatus.DaysUntilExpiry,
		ExpiryWarningDays:   7, // This should come from config
		LastPasswordChange:  passwordStatus.LastPasswordChange,
		PasswordExpiresAt:   passwordStatus.PasswordExpiresAt,
	}

	c.JSON(http.StatusOK, response)
}