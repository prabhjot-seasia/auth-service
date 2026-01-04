package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID                    uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Username              string         `json:"username" gorm:"uniqueIndex;not null"`
	Email                 string         `json:"email" gorm:"uniqueIndex;not null"`
	Password              string         `json:"-" gorm:"not null"`
	FirstName             string         `json:"first_name"`
	LastName              string         `json:"last_name"`
	IsActive              bool           `json:"is_active" gorm:"default:true"`
	PasswordExpiresAt     *time.Time     `json:"password_expires_at"`
	LastPasswordChange    *time.Time     `json:"last_password_change"`
	ForcePasswordChange   bool           `json:"force_password_change" gorm:"default:false"`
	PasswordHistory       []PasswordHistory `json:"-" gorm:"foreignKey:UserID"`
	RoleID                *uuid.UUID     `json:"role_id" gorm:"type:uuid"`
	Role                  *Role          `json:"role" gorm:"foreignKey:RoleID"`
	Groups                []Group        `json:"groups" gorm:"many2many:user_groups"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
	DeletedAt             gorm.DeletedAt `json:"-" gorm:"index"`
}

type Role struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string         `json:"name" gorm:"uniqueIndex;not null"`
	Description string         `json:"description"`
	Permissions []Permission   `json:"permissions" gorm:"many2many:role_permissions"`
	Users       []User         `json:"-" gorm:"foreignKey:RoleID"`
	Groups      []Group        `json:"groups" gorm:"many2many:role_groups"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type Permission struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Resource  string         `json:"resource" gorm:"not null;uniqueIndex:idx_resource_action"`
	Action    string         `json:"action" gorm:"not null;uniqueIndex:idx_resource_action"`
	Roles     []Role         `json:"-" gorm:"many2many:role_permissions"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Group struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string         `json:"name" gorm:"uniqueIndex;not null"`
	Description string         `json:"description"`
	Users       []User         `json:"-" gorm:"many2many:user_groups"`
	Roles       []Role         `json:"-" gorm:"many2many:role_groups"`
	Services    []GroupService `json:"services" gorm:"foreignKey:GroupID"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

type GroupService struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	GroupID   uuid.UUID      `json:"group_id" gorm:"not null"`
	ServiceID uuid.UUID      `json:"service_id" gorm:"not null"`
	Scopes    string         `json:"scopes"` // Space-separated scopes for this service
	Group     Group          `json:"-" gorm:"foreignKey:GroupID"`
	Service   Service        `json:"service" gorm:"foreignKey:ServiceID"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Service struct {
	ID           uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name         string         `json:"name" gorm:"uniqueIndex;not null"`
	ClientID     string         `json:"client_id" gorm:"uniqueIndex;not null"`
	ClientSecret string         `json:"-" gorm:"not null"`
	RedirectURI  string         `json:"redirect_uri"`
	Scopes       string         `json:"scopes"`
	IsActive     bool           `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

type Token struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID       uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	AccessToken  string    `json:"access_token" gorm:"uniqueIndex;not null"`
	RefreshToken string    `json:"refresh_token" gorm:"uniqueIndex"`
	TokenType    string    `json:"token_type" gorm:"default:'Bearer'"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type PasswordHistory struct {
	ID           uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID       uuid.UUID      `json:"user_id" gorm:"type:uuid;not null"`
	PasswordHash string         `json:"-" gorm:"not null"`
	CreatedAt    time.Time      `json:"created_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

type PasswordPolicy struct {
	ID                        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RotationDays              int       `json:"rotation_days" gorm:"default:30"`
	HistoryCount              int       `json:"history_count" gorm:"default:5"`
	MinLength                 int       `json:"min_length" gorm:"default:8"`
	RequireUppercase          bool      `json:"require_uppercase" gorm:"default:true"`
	RequireLowercase          bool      `json:"require_lowercase" gorm:"default:true"`
	RequireNumbers            bool      `json:"require_numbers" gorm:"default:true"`
	RequireSpecialCharacters  bool      `json:"require_special_characters" gorm:"default:true"`
	ExpiryWarningDays         int       `json:"expiry_warning_days" gorm:"default:7"`
	ForceFirstLoginChange     bool      `json:"force_first_login_change" gorm:"default:true"`
	CreatedAt                 time.Time `json:"created_at"`
	UpdatedAt                 time.Time `json:"updated_at"`
}