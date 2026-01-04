package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/auth"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/services"
	"golang.org/x/crypto/bcrypt"
)

const (
	tokenExpirySeconds = 900
	ssoCookieName      = "sso_token"
	expiryWarningDays  = 7
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

func (h *AuthHandler) extractUserRolesAndGroups(user *models.User) ([]string, []string) {
	var roles []string
	if user.Role != nil {
		roles = append(roles, user.Role.Name)
	}

	groupSet := make(map[string]bool)
	if user.Role != nil {
		for _, group := range user.Role.Groups {
			groupSet[group.Name] = true
		}
	}

	groups := make([]string, 0, len(groupSet))
	for groupName := range groupSet {
		groups = append(groups, groupName)
	}

	return roles, groups
}

func (h *AuthHandler) setSSOCookie(c *gin.Context, token string) {
	c.SetCookie(ssoCookieName, token, tokenExpirySeconds, "/", "", false, true)
}

func (h *AuthHandler) buildPasswordStatusResponse(status services.PasswordStatus) *PasswordStatusResponse {
	if !status.ForceChange && !status.IsExpired && !status.IsExpiringSoon {
		return nil
	}
	return &PasswordStatusResponse{
		ForceChange:       status.ForceChange,
		IsExpired:         status.IsExpired,
		IsExpiringSoon:    status.IsExpiringSoon,
		DaysUntilExpiry:   status.DaysUntilExpiry,
		ExpiryWarningDays: expiryWarningDays,
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Code           string                  `json:"code"`
	PasswordStatus *PasswordStatusResponse `json:"password_status,omitempty"`
}

type TokenRequest struct {
	GrantType    string `json:"grant_type" binding:"required"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	RefreshToken string `json:"refresh_token"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Code         string `json:"code"`
	RedirectURI  string `json:"redirect_uri"`
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
	case "authorization_code":
		h.handleAuthorizationCodeGrant(c, req)
	case "refresh_token":
		h.handleRefreshTokenGrant(c, req)
	case "client_credentials":
		h.handleClientCredentialsGrant(c, req)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported grant type"})
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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

	passwordStatus := h.passwordService.GetPasswordStatus(user)
	roles, groups := h.extractUserRolesAndGroups(user)

	authCode, err := h.jwtManager.GenerateAccessToken(user.ID, user.Username, user.Email, roles, groups)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate authorization code"})
		return
	}

	h.setSSOCookie(c, authCode)

	c.JSON(http.StatusOK, LoginResponse{
		Code:           authCode,
		PasswordStatus: h.buildPasswordStatusResponse(passwordStatus),
	})
}

func (h *AuthHandler) handleAuthorizationCodeGrant(c *gin.Context, req TokenRequest) {
	if req.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "authorization code required"})
		return
	}

	if req.ClientID != "" {
		service, err := h.userService.GetServiceByClientID(req.ClientID)
		if err != nil || service == nil || !service.IsActive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid client"})
			return
		}
	}

	if _, err := h.jwtManager.ValidateToken(req.Code); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired authorization code"})
		return
	}

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  req.Code,
		RefreshToken: "",
		TokenType:    "Bearer",
		ExpiresIn:    tokenExpirySeconds,
	})
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

	passwordStatus := h.passwordService.GetPasswordStatus(user)
	roles, groups := h.extractUserRolesAndGroups(user)

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

	h.setSSOCookie(c, accessToken)

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:    accessToken,
		RefreshToken:   refreshToken,
		TokenType:      "Bearer",
		ExpiresIn:      tokenExpirySeconds,
		PasswordStatus: h.buildPasswordStatusResponse(passwordStatus),
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

	roles, groups := h.extractUserRolesAndGroups(user)

	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.Username, user.Email, roles, groups)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	h.setSSOCookie(c, accessToken)

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: req.RefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    tokenExpirySeconds,
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
		ExpiresIn:   tokenExpirySeconds,
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

	permissions, err := h.userService.GetUserEffectivePermissions(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get permissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"username":              userClaims.Username,
		"email":                 userClaims.Email,
		"effective_permissions": permissions,
		"roles":                 userClaims.Roles,
		"groups":                userClaims.Groups,
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

	action := c.Query("action")
	resource := c.Query("resource")

	if action == "" || resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action and resource parameters are required"})
		return
	}

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

	user, err := h.userService.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	passwordStatus := h.passwordService.GetPasswordStatus(user)

	c.JSON(http.StatusOK, PasswordPolicyStatusResponse{
		ForceChange:        passwordStatus.ForceChange,
		IsExpired:          passwordStatus.IsExpired,
		IsExpiringSoon:     passwordStatus.IsExpiringSoon,
		DaysUntilExpiry:    passwordStatus.DaysUntilExpiry,
		ExpiryWarningDays:  expiryWarningDays,
		LastPasswordChange: passwordStatus.LastPasswordChange,
		PasswordExpiresAt:  passwordStatus.PasswordExpiresAt,
	})
}

func (h *AuthHandler) GetMyServices(c *gin.Context) {
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

	services, err := h.userService.GetUserAccessibleServices(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get accessible services"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":  userClaims.UserID,
		"username": userClaims.Username,
		"services": services,
	})
}