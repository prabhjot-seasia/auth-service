package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/services"
)

type RoleHandler struct {
	roleService       *services.RoleService
	validationService *services.ValidationService
}

func NewRoleHandler(roleService *services.RoleService, validationService *services.ValidationService) *RoleHandler {
	return &RoleHandler{
		roleService:       roleService,
		validationService: validationService,
	}
}

type CreateRoleRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

type UpdateRoleRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

type AssignGroupsRequest struct {
	GroupIDs []string `json:"group_ids" binding:"required"`
}

func (h *RoleHandler) CreateRole(c *gin.Context) {
	var req CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validationService.ValidateRoleName(req.Name, nil); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "name"})
		return
	}

	role := &models.Role{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.roleService.CreateRole(role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, role)
}

func (h *RoleHandler) GetRoles(c *gin.Context) {
	roles, err := h.roleService.GetAllRoles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, roles)
}

func (h *RoleHandler) GetRole(c *gin.Context) {
	id := c.Param("id")
	roleID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
		return
	}

	role, err := h.roleService.GetRoleByID(roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
		return
	}

	c.JSON(http.StatusOK, role)
}

func (h *RoleHandler) UpdateRole(c *gin.Context) {
	id := c.Param("id")
	roleID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	role, err := h.roleService.GetRoleByID(roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
		return
	}

	if req.Name != "" && req.Name != role.Name {
		if err := h.validationService.ValidateRoleName(req.Name, &roleID); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "name"})
			return
		}
		role.Name = req.Name
	}
	if req.Description != "" {
		role.Description = req.Description
	}

	if err := h.roleService.UpdateRole(role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, role)
}

func (h *RoleHandler) DeleteRole(c *gin.Context) {
	id := c.Param("id")
	roleID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
		return
	}

	if err := h.roleService.DeleteRole(roleID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *RoleHandler) GetRoleGroups(c *gin.Context) {
	id := c.Param("id")
	roleID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
		return
	}

	groups, err := h.roleService.GetRoleGroups(roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "role not found"})
		return
	}

	c.JSON(http.StatusOK, groups)
}

func (h *RoleHandler) AssignGroups(c *gin.Context) {
	id := c.Param("id")
	roleID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
		return
	}

	var req AssignGroupsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	groupIDs := make([]uuid.UUID, len(req.GroupIDs))
	for i, idStr := range req.GroupIDs {
		groupID, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group ID"})
			return
		}
		groupIDs[i] = groupID
	}

	if err := h.roleService.AssignGroups(roleID, groupIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "groups assigned successfully"})
}

