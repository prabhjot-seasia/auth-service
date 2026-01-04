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
	userService    *services.UserService
	jwtManager     *auth.JWTManager
	tokenBlacklist *services.TokenBlacklist
}

func NewSSOHandler(userService *services.UserService, jwtManager *auth.JWTManager, blacklist *services.TokenBlacklist) *SSOHandler {
	return &SSOHandler{
		userService:    userService,
		jwtManager:     jwtManager,
		tokenBlacklist: blacklist,
	}
}

type ValidateTokenRequest struct {
	Token        string `json:"token" binding:"required"`
	ClientID     string `json:"client_id" binding:"required"`
	ClientSecret string `json:"client_secret" binding:"required"`
}

type ValidateTokenResponse struct {
	Valid       bool                  `json:"valid"`
	UserID      string                `json:"user_id,omitempty"`
	Username    string                `json:"username,omitempty"`
	Email       string                `json:"email,omitempty"`
	Roles       []string              `json:"roles,omitempty"`
	Groups      []string              `json:"groups,omitempty"`
	Permissions []EffectivePermission `json:"permissions,omitempty"`
	ServiceID   string                `json:"service_id,omitempty"`
	ServiceName string                `json:"service_name,omitempty"`
	ExpiresAt   int64                 `json:"expires_at,omitempty"`
	Error       string                `json:"error,omitempty"`
}

type EffectivePermission struct {
	Resource string `json:"resource"`
	Action   string `json:"action"`
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

type ServiceLoginRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required"`
	ServiceID   string `json:"service_id,omitempty"`
	ClientID    string `json:"client_id,omitempty"`
	RedirectURI string `json:"redirect_uri,omitempty"`
}

type ServiceLoginResponse struct {
	Success     bool   `json:"success"`
	AccessToken string `json:"access_token,omitempty"`
	RedirectURI string `json:"redirect_uri,omitempty"`
	Error       string `json:"error,omitempty"`
}

type LogoutRequest struct {
	Token string `json:"token" binding:"required"`
}

type LogoutResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

func (h *SSOHandler) validateServiceCredentials(clientID, clientSecret string) (*models.Service, error) {
	service, err := h.userService.GetServiceByClientID(clientID)
	if err != nil {
		return nil, err
	}

	if !service.IsActive {
		return nil, errors.New("service disabled")
	}

	if err = bcrypt.CompareHashAndPassword([]byte(service.ClientSecret), []byte(clientSecret)); err != nil {
		return nil, errors.New("invalid client credentials")
	}

	return service, nil
}

func (h *SSOHandler) validateTokenAndGetUser(token string) (*auth.Claims, *models.User, error) {
	if h.tokenBlacklist.IsBlacklisted(token) {
		return nil, nil, errors.New("token is invalidated")
	}

	claims, err := h.jwtManager.ValidateToken(token)
	if err != nil {
		return nil, nil, errors.New("invalid token")
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, nil, errors.New("invalid user ID in token")
	}

	user, err := h.userService.GetByID(userID)
	if err != nil {
		return nil, nil, errors.New("user not found")
	}

	if !user.IsActive {
		return nil, nil, errors.New("user account disabled")
	}

	return claims, user, nil
}

func (h *SSOHandler) convertPermissions(permissions []services.Permission) []EffectivePermission {
	result := make([]EffectivePermission, len(permissions))
	for i, perm := range permissions {
		result[i] = EffectivePermission{
			Resource: perm.Resource,
			Action:   perm.Action,
		}
	}
	return result
}

func (h *SSOHandler) extractUserRolesAndGroups(user *models.User) ([]string, []string) {
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

func (h *SSOHandler) setSSOCookie(c *gin.Context, token string) {
	c.SetCookie(ssoCookieName, token, tokenExpirySeconds, "/", "", false, true)
}

func (h *SSOHandler) clearSSOCookie(c *gin.Context) {
	c.SetCookie(ssoCookieName, "", -1, "/", "", false, true)
}

func (h *SSOHandler) ValidateToken(c *gin.Context) {
	var req ValidateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ValidateTokenResponse{Valid: false, Error: "invalid request: " + err.Error()})
		return
	}

	service, err := h.validateServiceCredentials(req.ClientID, req.ClientSecret)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{Valid: false, Error: "service authentication failed: " + err.Error()})
		return
	}

	claims, user, err := h.validateTokenAndGetUser(req.Token)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{Valid: false, Error: err.Error()})
		return
	}

	userID, _ := uuid.Parse(claims.UserID)
	permissions, _ := h.userService.GetUserEffectivePermissions(userID)

	c.JSON(http.StatusOK, ValidateTokenResponse{
		Valid:       true,
		UserID:      claims.UserID,
		Username:    claims.Username,
		Email:       claims.Email,
		Roles:       claims.Roles,
		Groups:      claims.Groups,
		Permissions: h.convertPermissions(permissions),
		ServiceID:   service.ID.String(),
		ServiceName: service.Name,
		ExpiresAt:   claims.ExpiresAt.Unix(),
	})

	_ = user
}

func (h *SSOHandler) ValidateTokenFromHeader(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusOK, ValidateTokenResponse{Valid: false, Error: "no authorization header"})
		return
	}

	clientID := c.GetHeader("X-Client-ID")
	clientSecret := c.GetHeader("X-Client-Secret")
	if clientID == "" || clientSecret == "" {
		c.JSON(http.StatusOK, ValidateTokenResponse{Valid: false, Error: "service credentials required (X-Client-ID and X-Client-Secret headers)"})
		return
	}

	service, err := h.validateServiceCredentials(clientID, clientSecret)
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{Valid: false, Error: "service authentication failed: " + err.Error()})
		return
	}

	tokenParts := strings.SplitN(authHeader, " ", 2)
	if len(tokenParts) != 2 || strings.ToLower(tokenParts[0]) != "bearer" {
		c.JSON(http.StatusOK, ValidateTokenResponse{Valid: false, Error: "invalid authorization header format"})
		return
	}

	claims, user, err := h.validateTokenAndGetUser(tokenParts[1])
	if err != nil {
		c.JSON(http.StatusOK, ValidateTokenResponse{Valid: false, Error: err.Error()})
		return
	}

	userID, _ := uuid.Parse(claims.UserID)
	permissions, _ := h.userService.GetUserEffectivePermissions(userID)

	c.JSON(http.StatusOK, ValidateTokenResponse{
		Valid:       true,
		UserID:      claims.UserID,
		Username:    claims.Username,
		Email:       claims.Email,
		Roles:       claims.Roles,
		Groups:      claims.Groups,
		Permissions: h.convertPermissions(permissions),
		ServiceID:   service.ID.String(),
		ServiceName: service.Name,
		ExpiresAt:   claims.ExpiresAt.Unix(),
	})

	_ = user
}

func (h *SSOHandler) CheckPermission(c *gin.Context) {
	var req CheckPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, CheckPermissionResponse{Allowed: false, Error: "invalid request: " + err.Error()})
		return
	}

	if _, err := h.validateServiceCredentials(req.ClientID, req.ClientSecret); err != nil {
		c.JSON(http.StatusOK, CheckPermissionResponse{Allowed: false, Error: "service authentication failed: " + err.Error()})
		return
	}

	claims, _, err := h.validateTokenAndGetUser(req.Token)
	if err != nil {
		c.JSON(http.StatusOK, CheckPermissionResponse{Allowed: false, Error: err.Error()})
		return
	}

	userID, _ := uuid.Parse(claims.UserID)
	hasPermission, err := h.userService.CheckUserPermission(userID, req.Action, req.Resource)
	if err != nil {
		c.JSON(http.StatusInternalServerError, CheckPermissionResponse{Allowed: false, Error: "failed to check permission: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, CheckPermissionResponse{Allowed: hasPermission})
}

func (h *SSOHandler) ServiceLogin(c *gin.Context) {
	var req ServiceLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ServiceLoginResponse{Success: false, Error: "invalid request: " + err.Error()})
		return
	}

	var service *models.Service
	var err error

	if req.ServiceID != "" {
		serviceUUID, parseErr := uuid.Parse(req.ServiceID)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, ServiceLoginResponse{Success: false, Error: "invalid service ID format"})
			return
		}
		service, err = h.userService.GetServiceByID(serviceUUID)
	} else if req.ClientID != "" {
		service, err = h.userService.GetServiceByClientID(req.ClientID)
	} else {
		c.JSON(http.StatusBadRequest, ServiceLoginResponse{Success: false, Error: "either service_id or client_id is required"})
		return
	}

	if err != nil {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{Success: false, Error: "service not found"})
		return
	}

	if !service.IsActive {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{Success: false, Error: "service disabled"})
		return
	}

	user, err := h.userService.GetByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{Success: false, Error: "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{Success: false, Error: "invalid credentials"})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, ServiceLoginResponse{Success: false, Error: "account disabled"})
		return
	}

	hasAccess, err := h.userService.CheckUserServiceAccess(user.ID, service.ID)
	if err != nil || !hasAccess {
		c.JSON(http.StatusForbidden, ServiceLoginResponse{Success: false, Error: "access denied to this service"})
		return
	}

	roles, groups := h.extractUserRolesAndGroups(user)

	accessToken, err := h.jwtManager.GenerateAccessToken(user.ID, user.Username, user.Email, roles, groups)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ServiceLoginResponse{Success: false, Error: "failed to generate token"})
		return
	}

	redirectURI := req.RedirectURI
	if redirectURI == "" {
		redirectURI = service.RedirectURI
	}

	h.setSSOCookie(c, accessToken)

	c.JSON(http.StatusOK, ServiceLoginResponse{
		Success:     true,
		AccessToken: accessToken,
		RedirectURI: redirectURI,
	})
}

func (h *SSOHandler) AuthorizeEndpoint(c *gin.Context) {
	clientID := c.Query("client_id")
	redirectURI := c.Query("redirect_uri")
	responseType := c.Query("response_type")
	scope := c.Query("scope")
	state := c.Query("state")

	token := h.extractTokenFromRequest(c)

	if clientID == "" || redirectURI == "" || responseType != "code" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "invalid_request",
			"error_description": "Missing or invalid required parameters",
		})
		return
	}

	service, err := h.userService.GetServiceByClientID(clientID)
	if err != nil || !service.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":             "invalid_client",
			"error_description": "Invalid client_id",
		})
		return
	}

	if token != "" {
		if claims, err := h.jwtManager.ValidateToken(token); err == nil {
			if userID, err := uuid.Parse(claims.UserID); err == nil {
				if user, err := h.userService.GetByID(userID); err == nil && user.IsActive {
					if hasAccess, err := h.userService.CheckUserServiceAccess(user.ID, service.ID); err == nil && hasAccess {
						separator := "?"
						if strings.Contains(redirectURI, "?") {
							separator = "&"
						}

						callbackURL := redirectURI + separator + "code=" + token
						if state != "" {
							callbackURL += "&state=" + state
						}

						c.Redirect(http.StatusFound, callbackURL)
						return
					}
				}
			}
		}
	}

	frontendLoginURL := "http://localhost:3001/login"
	authParams := map[string]string{
		"client_id":     clientID,
		"redirect_uri":  redirectURI,
		"response_type": responseType,
		"scope":         scope,
		"state":         state,
	}

	params := make([]string, 0, len(authParams))
	for key, value := range authParams {
		if value != "" {
			params = append(params, key+"="+value)
		}
	}

	c.Redirect(http.StatusFound, frontendLoginURL+"?"+strings.Join(params, "&"))
}

func (h *SSOHandler) extractTokenFromRequest(c *gin.Context) string {
	if authHeader := c.GetHeader("Authorization"); authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			return parts[1]
		}
	}

	if token := c.Query("token"); token != "" {
		return token
	}

	if cookie, err := c.Cookie("sso_token"); err == nil {
		return cookie
	}

	if cookie, err := c.Cookie("auth_token"); err == nil {
		return cookie
	}

	return ""
}

func (h *SSOHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, LogoutResponse{Success: false, Error: "invalid request: " + err.Error()})
		return
	}

	h.clearSSOCookie(c)

	claims, err := h.jwtManager.ValidateToken(req.Token)
	if err != nil {
		c.JSON(http.StatusOK, LogoutResponse{Success: false, Error: "invalid token"})
		return
	}

	h.tokenBlacklist.Add(req.Token, claims.ExpiresAt.Time)

	c.JSON(http.StatusOK, LogoutResponse{Success: true})
}
