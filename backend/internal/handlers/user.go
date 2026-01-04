package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	userService       *services.UserService
	validationService *services.ValidationService
	passwordService   *services.PasswordService
}

func NewUserHandler(userService *services.UserService, validationService *services.ValidationService, passwordService *services.PasswordService) *UserHandler {
	return &UserHandler{
		userService:       userService,
		validationService: validationService,
		passwordService:   passwordService,
	}
}

type CreateUserRequest struct {
	Username  string `json:"username" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type UpdateUserRequest struct {
	Email     string `json:"email" binding:"omitempty,email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	IsActive  *bool  `json:"is_active"`
	Password  string `json:"password"`
}

type AssignRolesRequest struct {
	RoleIDs []string `json:"role_ids" binding:"required"`
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.validationService.ValidateUsername(req.Username, nil); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "username"})
		return
	}

	if err := h.validationService.ValidateEmail(req.Email, nil); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "email"})
		return
	}

	if h.passwordService != nil {
		validation := h.passwordService.ValidatePasswordComplexity(req.Password)
		if !validation.IsValid {
			c.JSON(http.StatusBadRequest, gin.H{"error": strings.Join(validation.Errors, "; "), "field": "password"})
			return
		}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := &models.User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashedPassword),
		FirstName: req.FirstName,
		LastName:  req.LastName,
		IsActive:  true,
	}

	if err := h.userService.CreateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user.Password = ""
	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	// Parse pagination parameters
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "50")
	search := c.Query("search")
	status := c.Query("status")
	
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 50
	}

	users, total, err := h.userService.GetUsersPaginated(page, limit, search, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Remove password from response
	for i := range users {
		users[i].Password = ""
	}

	// Calculate pagination metadata
	totalPages := (int(total) + limit - 1) / limit
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"pagination": gin.H{
			"current_page":  page,
			"limit":         limit,
			"total_users":   total,
			"total_pages":   totalPages,
			"has_next":      hasNext,
			"has_previous":  hasPrev,
		},
	})
}

func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	user, err := h.userService.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	user.Password = ""
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if req.Email != "" && req.Email != user.Email {
		if err := h.validationService.ValidateEmail(req.Email, &userID); err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "field": "email"})
			return
		}
		user.Email = req.Email
	}
	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.IsActive != nil {
		user.IsActive = *req.IsActive
	}

	if req.Password != "" {
		if h.passwordService != nil {
			validation := h.passwordService.ValidatePasswordComplexity(req.Password)
			if !validation.IsValid {
				c.JSON(http.StatusBadRequest, gin.H{"error": strings.Join(validation.Errors, "; "), "field": "password"})
				return
			}
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
			return
		}
		user.Password = string(hashedPassword)
		user.ForcePasswordChange = true
		user.LastPasswordChange = nil
		user.PasswordExpiresAt = nil
	}

	if err := h.userService.UpdateUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user.Password = ""
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	if err := h.userService.DeleteUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *UserHandler) GetUserRoles(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	roles, err := h.userService.GetUserRoles(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, roles)
}

type AssignRoleRequest struct {
	RoleID *string `json:"role_id"` // pointer to allow null
}

func (h *UserHandler) AssignRole(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var roleID *uuid.UUID
	if req.RoleID != nil && *req.RoleID != "" {
		parsedRoleID, err := uuid.Parse(*req.RoleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
			return
		}
		roleID = &parsedRoleID
	}

	if err := h.userService.AssignRole(userID, roleID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "role assigned successfully"})
}

func (h *UserHandler) AssignRoles(c *gin.Context) {
	id := c.Param("id")
	userID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	var req AssignRolesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	roleIDs := make([]uuid.UUID, len(req.RoleIDs))
	for i, rid := range req.RoleIDs {
		roleID, err := uuid.Parse(rid)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role ID"})
			return
		}
		roleIDs[i] = roleID
	}

	if err := h.userService.AssignRoles(userID, roleIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "roles assigned successfully"})
}

// CSV Export Users
func (h *UserHandler) ExportUsersCSV(c *gin.Context) {
	users, err := h.userService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create CSV buffer
	var csvBuffer bytes.Buffer
	writer := csv.NewWriter(&csvBuffer)

	// Write CSV headers
	headers := []string{"Username", "Email", "First Name", "Last Name", "Is Active", "Roles", "Created At"}
	writer.Write(headers)

	// Write user data
	for _, user := range users {
		// Get single role name
		rolesStr := ""
		if user.Role != nil {
			rolesStr = user.Role.Name
		}

		record := []string{
			user.Username,
			user.Email,
			user.FirstName,
			user.LastName,
			strconv.FormatBool(user.IsActive),
			rolesStr,
			user.CreatedAt.Format(time.RFC3339),
		}
		writer.Write(record)
	}

	writer.Flush()

	// Set response headers
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=users.csv")
	c.Data(http.StatusOK, "text/csv", csvBuffer.Bytes())
}

// CSV Import Users (Create)
func (h *UserHandler) ImportUsersCSV(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get uploaded file"})
		return
	}
	defer file.Close()

	// Check file extension
	if !strings.HasSuffix(strings.ToLower(header.Filename), ".csv") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file must be a CSV"})
		return
	}

	// Read CSV
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse CSV"})
		return
	}

	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV must have at least header and one data row"})
		return
	}

	// Expected headers: Username, Email, Password, First Name, Last Name, Is Active, Roles
	headers := records[0]
	expectedHeaders := []string{"Username", "Email", "Password", "First Name", "Last Name", "Is Active", "Roles"}
	
	// Validate headers
	if len(headers) < len(expectedHeaders) {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("CSV must have headers: %s", strings.Join(expectedHeaders, ", "))})
		return
	}

	var results []gin.H
	successCount := 0
	errorCount := 0

	// Process each record
	for i, record := range records[1:] {
		if len(record) < len(expectedHeaders) {
			results = append(results, gin.H{
				"row":   i + 2,
				"error": "insufficient columns",
			})
			errorCount++
			continue
		}

		// Parse record data
		username := strings.TrimSpace(record[0])
		email := strings.TrimSpace(record[1])
		password := strings.TrimSpace(record[2])
		firstName := strings.TrimSpace(record[3])
		lastName := strings.TrimSpace(record[4])
		isActiveStr := strings.TrimSpace(record[5])
		rolesStr := strings.TrimSpace(record[6])

		// Validate required fields
		if username == "" || email == "" || password == "" {
			results = append(results, gin.H{
				"row":   i + 2,
				"error": "username, email, and password are required",
			})
			errorCount++
			continue
		}

		// Parse is_active
		isActive, err := strconv.ParseBool(isActiveStr)
		if err != nil {
			isActive = true // Default to active if parsing fails
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			results = append(results, gin.H{
				"row":   i + 2,
				"error": "failed to hash password",
			})
			errorCount++
			continue
		}

		// Create user
		user := &models.User{
			Username:  username,
			Email:     email,
			Password:  string(hashedPassword),
			FirstName: firstName,
			LastName:  lastName,
			IsActive:  isActive,
		}

		if err := h.userService.CreateUser(user); err != nil {
			results = append(results, gin.H{
				"row":   i + 2,
				"error": err.Error(),
			})
			errorCount++
			continue
		}

		// Handle roles if specified
		if rolesStr != "" {
			// TODO: Implement role assignment by name lookup
			// For now, we'll skip role assignment in CSV import
			// roleNames := strings.Split(rolesStr, ";")
		}

		results = append(results, gin.H{
			"row":    i + 2,
			"status": "success",
		})
		successCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       fmt.Sprintf("Import completed: %d successful, %d failed", successCount, errorCount),
		"success_count": successCount,
		"error_count":   errorCount,
		"details":       results,
	})
}

