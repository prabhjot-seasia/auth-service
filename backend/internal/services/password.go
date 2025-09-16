package services

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/seasia/auth-service/config"
	"github.com/seasia/auth-service/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type PasswordService struct {
	db     *gorm.DB
	config *config.PasswordPolicyConfig
}

func NewPasswordService(db *gorm.DB, config *config.PasswordPolicyConfig) *PasswordService {
	return &PasswordService{
		db:     db,
		config: config,
	}
}

type PasswordValidationResult struct {
	IsValid bool
	Errors  []string
}

type PasswordStatus struct {
	IsExpired           bool
	IsExpiringSoon      bool
	DaysUntilExpiry     int
	ForceChange         bool
	LastPasswordChange  *time.Time
	PasswordExpiresAt   *time.Time
}

// ValidatePasswordComplexity validates password against policy rules
func (ps *PasswordService) ValidatePasswordComplexity(password string) PasswordValidationResult {
	var errors []string

	if len(password) < ps.config.MinLength {
		errors = append(errors, "password must be at least 8 characters long")
	}

	if ps.config.RequireUppercase && !regexp.MustCompile(`[A-Z]`).MatchString(password) {
		errors = append(errors, "password must contain at least one uppercase letter")
	}

	if ps.config.RequireLowercase && !regexp.MustCompile(`[a-z]`).MatchString(password) {
		errors = append(errors, "password must contain at least one lowercase letter")
	}

	if ps.config.RequireNumbers && !regexp.MustCompile(`[0-9]`).MatchString(password) {
		errors = append(errors, "password must contain at least one number")
	}

	if ps.config.RequireSpecialCharacters && !regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` + "`" + `]`).MatchString(password) {
		errors = append(errors, "password must contain at least one special character")
	}

	return PasswordValidationResult{
		IsValid: len(errors) == 0,
		Errors:  errors,
	}
}

// CheckPasswordHistory validates password against user's password history
func (ps *PasswordService) CheckPasswordHistory(userID uuid.UUID, newPassword string) error {
	var passwordHistory []models.PasswordHistory
	
	if err := ps.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(ps.config.HistoryCount).
		Find(&passwordHistory).Error; err != nil {
		return err
	}

	for _, historyEntry := range passwordHistory {
		if err := bcrypt.CompareHashAndPassword([]byte(historyEntry.PasswordHash), []byte(newPassword)); err == nil {
			return errors.New("password cannot be the same as any of your last 5 passwords")
		}
	}

	return nil
}

// GetPasswordStatus returns the current password status for a user
func (ps *PasswordService) GetPasswordStatus(user *models.User) PasswordStatus {
	status := PasswordStatus{
		ForceChange:        user.ForcePasswordChange,
		LastPasswordChange: user.LastPasswordChange,
		PasswordExpiresAt:  user.PasswordExpiresAt,
	}

	if user.PasswordExpiresAt != nil {
		now := time.Now()
		status.IsExpired = user.PasswordExpiresAt.Before(now)
		
		if !status.IsExpired {
			daysUntilExpiry := int(user.PasswordExpiresAt.Sub(now).Hours() / 24)
			status.DaysUntilExpiry = daysUntilExpiry
			status.IsExpiringSoon = daysUntilExpiry <= ps.config.ExpiryWarningDays
		}
	}

	return status
}

// SetPasswordExpiry calculates and sets password expiry date
func (ps *PasswordService) SetPasswordExpiry(user *models.User) {
	now := time.Now()
	expiryDate := now.AddDate(0, 0, ps.config.RotationDays)
	user.PasswordExpiresAt = &expiryDate
	user.LastPasswordChange = &now
}

// ChangePassword changes user password with validation and history tracking
func (ps *PasswordService) ChangePassword(userID uuid.UUID, currentPassword, newPassword string) error {
	// Get user
	var user models.User
	if err := ps.db.Preload("PasswordHistory").First(&user, "id = ?", userID).Error; err != nil {
		return err
	}

	// Verify current password (unless force change is required)
	if !user.ForcePasswordChange {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
			return errors.New("current password is incorrect")
		}
	}

	// Validate new password complexity
	validation := ps.ValidatePasswordComplexity(newPassword)
	if !validation.IsValid {
		return errors.New(strings.Join(validation.Errors, "; "))
	}

	// Check password history
	if err := ps.CheckPasswordHistory(userID, newPassword); err != nil {
		return err
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Start transaction
	tx := ps.db.Begin()

	// Add current password to history
	if user.Password != "" {
		passwordHistory := models.PasswordHistory{
			UserID:       userID,
			PasswordHash: user.Password,
		}
		if err := tx.Create(&passwordHistory).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Clean up old password history (keep only the configured number)
	var oldHistory []models.PasswordHistory
	if err := tx.Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(ps.config.HistoryCount).
		Find(&oldHistory).Error; err != nil {
		tx.Rollback()
		return err
	}

	for _, old := range oldHistory {
		if err := tx.Delete(&old).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Update user password and policy fields
	user.Password = string(hashedPassword)
	user.ForcePasswordChange = false
	ps.SetPasswordExpiry(&user)

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return err
	}

	tx.Commit()
	return nil
}

// SetForcePasswordChange marks a user to require password change on next login
func (ps *PasswordService) SetForcePasswordChange(userID uuid.UUID) error {
	return ps.db.Model(&models.User{}).
		Where("id = ?", userID).
		Update("force_password_change", true).Error
}

// InitializeUserPasswordPolicy sets up password policy for new users
func (ps *PasswordService) InitializeUserPasswordPolicy(user *models.User) {
	if ps.config.ForceFirstLoginChange {
		user.ForcePasswordChange = true
	} else {
		ps.SetPasswordExpiry(user)
	}
}