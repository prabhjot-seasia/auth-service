package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/auth"
	"github.com/seasia/auth-service/internal/services"
)

type DocumentHandler struct {
	userService *services.UserService
}

func NewDocumentHandler(userService *services.UserService) *DocumentHandler {
	return &DocumentHandler{
		userService: userService,
	}
}

// PermissionCheckRequest represents a permission check request
type PermissionCheckRequest struct {
	Action   string `json:"action" binding:"required"`   // read, write
	Resource string `json:"resource" binding:"required"` // documents, folders
	ItemID   string `json:"item_id,omitempty"`          // optional: specific document/folder ID
}

// PermissionCheckResponse represents the permission check response
type PermissionCheckResponse struct {
	Allowed    bool   `json:"allowed"`
	Permission string `json:"permission"`
	UserID     string `json:"user_id"`
	ItemID     string `json:"item_id,omitempty"`
	Message    string `json:"message"`
}

// DeletePermissionRequest represents a delete permission validation request
type DeletePermissionRequest struct {
	Resource string `json:"resource" binding:"required"` // documents or folders
	ItemID   string `json:"item_id" binding:"required"`  // document/folder ID to delete
}

// CheckDocumentPermission validates if user has permission for document operations
func (h *DocumentHandler) CheckDocumentPermission(c *gin.Context) {
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

	var req PermissionCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate resource type
	if req.Resource != "documents" && req.Resource != "folders" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "resource must be 'documents' or 'folders'"})
		return
	}

	// Validate action type
	if req.Action != "read" && req.Action != "write" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action must be 'read' or 'write'"})
		return
	}

	// Check if user has the specific permission
	hasPermission, err := h.userService.CheckUserPermission(userID, req.Action, req.Resource)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var message string
	if hasPermission {
		if req.Action == "read" {
			message = "User can view " + req.Resource
		} else {
			message = "User can create, edit, and delete " + req.Resource
		}
	} else {
		message = "User does not have " + req.Action + " permission for " + req.Resource
	}

	response := PermissionCheckResponse{
		Allowed:    hasPermission,
		Permission: req.Action + ":" + req.Resource,
		UserID:     userClaims.UserID,
		ItemID:     req.ItemID,
		Message:    message,
	}

	c.JSON(http.StatusOK, response)
}

// CheckDeletePermission specifically validates if user can delete documents/folders
func (h *DocumentHandler) CheckDeletePermission(c *gin.Context) {
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

	var req DeletePermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate resource type
	if req.Resource != "documents" && req.Resource != "folders" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "resource must be 'documents' or 'folders'"})
		return
	}

	// For deletion, user needs WRITE permission
	hasWritePermission, err := h.userService.CheckUserPermission(userID, "write", req.Resource)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var message string
	if hasWritePermission {
		message = "User authorized to delete " + req.Resource + " (ID: " + req.ItemID + ")"
	} else {
		message = "User not authorized to delete " + req.Resource + " - write permission required"
	}

	response := PermissionCheckResponse{
		Allowed:    hasWritePermission,
		Permission: "write:" + req.Resource,
		UserID:     userClaims.UserID,
		ItemID:     req.ItemID,
		Message:    message,
	}

	if hasWritePermission {
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusForbidden, response)
	}
}

// CheckCreatePermission validates if user can create documents/folders
func (h *DocumentHandler) CheckCreatePermission(c *gin.Context) {
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

	// Get resource from query param
	resource := c.Query("resource")
	if resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "resource parameter is required"})
		return
	}

	// Validate resource type
	if resource != "documents" && resource != "folders" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "resource must be 'documents' or 'folders'"})
		return
	}

	// For creation, user needs WRITE permission
	hasWritePermission, err := h.userService.CheckUserPermission(userID, "write", resource)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var message string
	if hasWritePermission {
		message = "User authorized to create " + resource
	} else {
		message = "User not authorized to create " + resource + " - write permission required"
	}

	response := PermissionCheckResponse{
		Allowed:    hasWritePermission,
		Permission: "write:" + resource,
		UserID:     userClaims.UserID,
		Message:    message,
	}

	if hasWritePermission {
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusForbidden, response)
	}
}

// GetUserPermissions returns all document and folder permissions for the authenticated user
func (h *DocumentHandler) GetUserPermissions(c *gin.Context) {
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

	// Check all document and folder permissions
	permissions := make(map[string]bool)
	resources := []string{"documents", "folders"}
	actions := []string{"read", "write"}

	for _, resource := range resources {
		for _, action := range actions {
			hasPermission, err := h.userService.CheckUserPermission(userID, action, resource)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			permissions[action+":"+resource] = hasPermission
		}
	}

	// Determine user capabilities
	capabilities := map[string]bool{
		"can_view_documents":   permissions["read:documents"],
		"can_edit_documents":   permissions["write:documents"],
		"can_delete_documents": permissions["write:documents"],
		"can_create_documents": permissions["write:documents"],
		"can_view_folders":     permissions["read:folders"],
		"can_edit_folders":     permissions["write:folders"],
		"can_delete_folders":   permissions["write:folders"],
		"can_create_folders":   permissions["write:folders"],
	}

	response := gin.H{
		"user_id":      userClaims.UserID,
		"username":     userClaims.Username,
		"permissions":  permissions,
		"capabilities": capabilities,
	}

	c.JSON(http.StatusOK, response)
}