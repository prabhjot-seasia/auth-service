package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/services"
)

type GroupHandler struct {
	groupService      *services.GroupService
	validationService *services.ValidationService
}

func NewGroupHandler(groupService *services.GroupService, validationService *services.ValidationService) *GroupHandler {
	return &GroupHandler{
		groupService:      groupService,
		validationService: validationService,
	}
}

type CreateGroupRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type ServiceAssignmentRequest struct {
	ServiceID string `json:"service_id" binding:"required"`
	Scopes    string `json:"scopes"`
}

type AssignServicesRequest struct {
	Services []ServiceAssignmentRequest `json:"services"`
}

func (h *GroupHandler) CreateGroup(c *gin.Context) {
	var req CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validationService.ValidateGroupName(req.Name, nil); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "name"})
		return
	}

	group := &models.Group{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.groupService.CreateGroup(group); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, group)
}

func (h *GroupHandler) GetGroups(c *gin.Context) {
	groups, err := h.groupService.GetAllGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, groups)
}

func (h *GroupHandler) GetGroup(c *gin.Context) {
	id := c.Param("id")
	groupID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group ID"})
		return
	}

	group, err := h.groupService.GetGroupByID(groupID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	c.JSON(http.StatusOK, group)
}

func (h *GroupHandler) UpdateGroup(c *gin.Context) {
	id := c.Param("id")
	groupID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group ID"})
		return
	}

	var req UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group, err := h.groupService.GetGroupByID(groupID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	if req.Name != "" && req.Name != group.Name {
		if err := h.validationService.ValidateGroupName(req.Name, &groupID); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "name"})
			return
		}
		group.Name = req.Name
	}
	if req.Description != "" {
		group.Description = req.Description
	}

	if err := h.groupService.UpdateGroup(group); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, group)
}

func (h *GroupHandler) DeleteGroup(c *gin.Context) {
	id := c.Param("id")
	groupID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group ID"})
		return
	}

	if err := h.groupService.DeleteGroup(groupID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *GroupHandler) AssignServices(c *gin.Context) {
	id := c.Param("id")
	groupID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group ID"})
		return
	}

	var req AssignServicesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert request to GroupService models
	var serviceAssignments []models.GroupService
	for _, assignment := range req.Services {
		serviceID, err := uuid.Parse(assignment.ServiceID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service ID: " + assignment.ServiceID})
			return
		}

		serviceAssignments = append(serviceAssignments, models.GroupService{
			ServiceID: serviceID,
			Scopes:    assignment.Scopes,
		})
	}

	if err := h.groupService.AssignServices(groupID, serviceAssignments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "services assigned successfully"})
}

func (h *GroupHandler) GetGroupServices(c *gin.Context) {
	id := c.Param("id")
	groupID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group ID"})
		return
	}

	groupServices, err := h.groupService.GetGroupServices(groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, groupServices)
}