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
	userService *services.UserService
}

func NewServiceHandler(userService *services.UserService) *ServiceHandler {
	return &ServiceHandler{
		userService: userService,
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

	var req UpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing service
	service, err := h.userService.GetServiceByID(serviceID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}

	// Update fields if provided
	if req.Name != "" {
		service.Name = req.Name
	}
	if req.RedirectURI != "" || req.RedirectURI == "" { // Allow empty string to clear
		service.RedirectURI = req.RedirectURI
	}
	if req.Scopes != "" || req.Scopes == "" { // Allow empty string to clear
		service.Scopes = req.Scopes
	}
	if req.IsActive != nil {
		service.IsActive = *req.IsActive
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