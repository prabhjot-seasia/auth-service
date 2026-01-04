package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type ServiceHandler struct {
	userService       *services.UserService
	validationService *services.ValidationService
}

func NewServiceHandler(userService *services.UserService, validationService *services.ValidationService) *ServiceHandler {
	return &ServiceHandler{
		userService:       userService,
		validationService: validationService,
	}
}

type CreateServiceRequest struct {
	Name        string `json:"name" binding:"required"`
	RedirectURI string `json:"redirect_uri"`
	Scopes      string `json:"scopes"`
}

type UpdateServiceRequest struct {
	Name        string `json:"name"`
	RedirectURI string `json:"redirect_uri"`
	Scopes      string `json:"scopes"`
	IsActive    *bool  `json:"is_active"`
}

type ServiceResponse struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret,omitempty"`
	RedirectURI  string `json:"redirect_uri"`
	Scopes       string `json:"scopes"`
	IsActive     bool   `json:"is_active"`
}

func generateClientCredentials() (string, string, error) {
	clientIDBytes := make([]byte, 16)
	if _, err := rand.Read(clientIDBytes); err != nil {
		return "", "", err
	}
	clientID := hex.EncodeToString(clientIDBytes)

	clientSecretBytes := make([]byte, 32)
	if _, err := rand.Read(clientSecretBytes); err != nil {
		return "", "", err
	}
	clientSecret := hex.EncodeToString(clientSecretBytes)

	return clientID, clientSecret, nil
}

func (h *ServiceHandler) CreateService(c *gin.Context) {
	var req CreateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validationService.ValidateServiceName(req.Name, nil); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "name"})
		return
	}

	clientID, clientSecret, err := generateClientCredentials()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate client credentials"})
		return
	}

	hashedSecret, err := bcrypt.GenerateFromPassword([]byte(clientSecret), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash client secret"})
		return
	}

	service := &models.Service{
		Name:         req.Name,
		ClientID:     clientID,
		ClientSecret: string(hashedSecret),
		RedirectURI:  req.RedirectURI,
		Scopes:       req.Scopes,
		IsActive:     true,
	}

	if err := h.userService.CreateService(service); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := ServiceResponse{
		ID:           service.ID.String(),
		Name:         service.Name,
		ClientID:     service.ClientID,
		ClientSecret: clientSecret,
		RedirectURI:  service.RedirectURI,
		Scopes:       service.Scopes,
		IsActive:     service.IsActive,
	}

	c.JSON(http.StatusCreated, response)
}

func (h *ServiceHandler) GetServices(c *gin.Context) {
	services, err := h.userService.GetAllServices()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var responses []ServiceResponse
	for _, service := range services {
		responses = append(responses, ServiceResponse{
			ID:          service.ID.String(),
			Name:        service.Name,
			ClientID:    service.ClientID,
			RedirectURI: service.RedirectURI,
			Scopes:      service.Scopes,
			IsActive:    service.IsActive,
		})
	}

	c.JSON(http.StatusOK, responses)
}

func (h *ServiceHandler) GetService(c *gin.Context) {
	id := c.Param("id")
	serviceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	service, err := h.userService.GetServiceByID(serviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}

	response := ServiceResponse{
		ID:          service.ID.String(),
		Name:        service.Name,
		ClientID:    service.ClientID,
		RedirectURI: service.RedirectURI,
		Scopes:      service.Scopes,
		IsActive:    service.IsActive,
	}

	c.JSON(http.StatusOK, response)
}

func (h *ServiceHandler) UpdateService(c *gin.Context) {
	id := c.Param("id")
	serviceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	// Get existing service
	service, err := h.userService.GetServiceByID(serviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}

	// Parse request body as raw JSON to check which fields were actually provided
	var rawRequest map[string]interface{}
	if err := c.ShouldBindJSON(&rawRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields ONLY if explicitly provided in the request
	if name, exists := rawRequest["name"]; exists {
		if nameStr, ok := name.(string); ok && nameStr != "" && nameStr != service.Name {
			if err := h.validationService.ValidateServiceName(nameStr, &serviceID); err != nil {
				c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "name"})
				return
			}
			service.Name = nameStr
		}
	}
	if redirectURI, exists := rawRequest["redirect_uri"]; exists {
		if redirectURIStr, ok := redirectURI.(string); ok {
			service.RedirectURI = redirectURIStr
		}
	}
	if scopes, exists := rawRequest["scopes"]; exists {
		if scopesStr, ok := scopes.(string); ok {
			service.Scopes = scopesStr
		}
	}
	if isActive, exists := rawRequest["is_active"]; exists {
		if isActiveBool, ok := isActive.(bool); ok {
			service.IsActive = isActiveBool
		}
	}

	// Update service in database
	if err := h.userService.UpdateService(service); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := ServiceResponse{
		ID:          service.ID.String(),
		Name:        service.Name,
		ClientID:    service.ClientID,
		RedirectURI: service.RedirectURI,
		Scopes:      service.Scopes,
		IsActive:    service.IsActive,
	}

	c.JSON(http.StatusOK, response)
}

func (h *ServiceHandler) RegenerateSecret(c *gin.Context) {
	serviceID := c.Param("id")
	serviceUUID, err := uuid.Parse(serviceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	// Get existing service
	service, err := h.userService.GetServiceByID(serviceUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}

	// Generate new client secret
	_, newClientSecret, err := generateClientCredentials()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate new client secret"})
		return
	}

	// Hash the new secret
	hashedSecret, err := bcrypt.GenerateFromPassword([]byte(newClientSecret), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash new client secret"})
		return
	}

	// Update service with new secret
	service.ClientSecret = string(hashedSecret)
	if err := h.userService.UpdateService(service); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the plain text secret (only time it's shown)
	c.JSON(http.StatusOK, gin.H{
		"message":       "Client secret regenerated successfully",
		"client_secret": newClientSecret,
	})
}

func (h *ServiceHandler) DeleteService(c *gin.Context) {
	id := c.Param("id")
	serviceID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID"})
		return
	}

	if err := h.userService.DeleteService(serviceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}