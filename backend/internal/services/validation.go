package services

import (
	"errors"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/models"
	"gorm.io/gorm"
)

type ValidationService struct {
	db *gorm.DB
}

func NewValidationService(db *gorm.DB) *ValidationService {
	return &ValidationService{db: db}
}

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (v *ValidationService) ValidateUsername(username string, excludeUserID *uuid.UUID) error {
	if username == "" {
		return errors.New("username is required")
	}
	if len(username) < 3 {
		return errors.New("username must be at least 3 characters")
	}
	if len(username) > 50 {
		return errors.New("username must be at most 50 characters")
	}
	if !regexp.MustCompile(`^[a-zA-Z0-9_-]+$`).MatchString(username) {
		return errors.New("username can only contain letters, numbers, underscores, and hyphens")
	}

	var count int64
	query := v.db.Model(&models.User{}).Where("LOWER(username) = LOWER(?)", username)
	if excludeUserID != nil {
		query = query.Where("id != ?", *excludeUserID)
	}
	query.Count(&count)

	if count > 0 {
		return errors.New("username already exists")
	}
	return nil
}

func (v *ValidationService) ValidateEmail(email string, excludeUserID *uuid.UUID) error {
	if email == "" {
		return errors.New("email is required")
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if !regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`).MatchString(email) {
		return errors.New("invalid email format")
	}

	var count int64
	query := v.db.Model(&models.User{}).Where("LOWER(email) = LOWER(?)", email)
	if excludeUserID != nil {
		query = query.Where("id != ?", *excludeUserID)
	}
	query.Count(&count)

	if count > 0 {
		return errors.New("email already exists")
	}
	return nil
}

func (v *ValidationService) ValidateRoleName(name string, excludeRoleID *uuid.UUID) error {
	if name == "" {
		return errors.New("role name is required")
	}
	if len(name) < 2 {
		return errors.New("role name must be at least 2 characters")
	}
	if len(name) > 100 {
		return errors.New("role name must be at most 100 characters")
	}

	var count int64
	query := v.db.Model(&models.Role{}).Where("LOWER(name) = LOWER(?)", name)
	if excludeRoleID != nil {
		query = query.Where("id != ?", *excludeRoleID)
	}
	query.Count(&count)

	if count > 0 {
		return errors.New("role name already exists")
	}
	return nil
}

func (v *ValidationService) ValidateGroupName(name string, excludeGroupID *uuid.UUID) error {
	if name == "" {
		return errors.New("group name is required")
	}
	if len(name) < 2 {
		return errors.New("group name must be at least 2 characters")
	}
	if len(name) > 100 {
		return errors.New("group name must be at most 100 characters")
	}

	var count int64
	query := v.db.Model(&models.Group{}).Where("LOWER(name) = LOWER(?)", name)
	if excludeGroupID != nil {
		query = query.Where("id != ?", *excludeGroupID)
	}
	query.Count(&count)

	if count > 0 {
		return errors.New("group name already exists")
	}
	return nil
}

func (v *ValidationService) ValidateServiceName(name string, excludeServiceID *uuid.UUID) error {
	if name == "" {
		return errors.New("service name is required")
	}
	if len(name) < 2 {
		return errors.New("service name must be at least 2 characters")
	}
	if len(name) > 100 {
		return errors.New("service name must be at most 100 characters")
	}

	var count int64
	query := v.db.Model(&models.Service{}).Where("LOWER(name) = LOWER(?)", name)
	if excludeServiceID != nil {
		query = query.Where("id != ?", *excludeServiceID)
	}
	query.Count(&count)

	if count > 0 {
		return errors.New("service name already exists")
	}
	return nil
}

type PasswordValidation struct {
	MinLength                int
	RequireUppercase         bool
	RequireLowercase         bool
	RequireNumbers           bool
	RequireSpecialCharacters bool
}

func (v *ValidationService) ValidatePassword(password string, config PasswordValidation) []string {
	var errors []string

	if len(password) < config.MinLength {
		errors = append(errors, "password must be at least 8 characters long")
	}

	if config.RequireUppercase && !regexp.MustCompile(`[A-Z]`).MatchString(password) {
		errors = append(errors, "password must contain at least one uppercase letter")
	}

	if config.RequireLowercase && !regexp.MustCompile(`[a-z]`).MatchString(password) {
		errors = append(errors, "password must contain at least one lowercase letter")
	}

	if config.RequireNumbers && !regexp.MustCompile(`[0-9]`).MatchString(password) {
		errors = append(errors, "password must contain at least one number")
	}

	if config.RequireSpecialCharacters && !regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` + "`" + `]`).MatchString(password) {
		errors = append(errors, "password must contain at least one special character")
	}

	return errors
}
