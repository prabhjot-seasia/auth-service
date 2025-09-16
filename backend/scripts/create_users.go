package main

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key"`
	Username  string    `gorm:"unique;not null"`
	Email     string    `gorm:"unique;not null"`
	Password  string    `gorm:"not null"`
	FirstName string
	LastName  string
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UserRole struct {
	UserID uuid.UUID `gorm:"type:uuid;not null"`
	RoleID uuid.UUID `gorm:"type:uuid;not null"`
}

func main() {
	// Connect to database
	dsn := "host=localhost user=postgres password=postgres dbname=auth_service port=5433 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Hash password for all users (Admin@123)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Admin@123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	// Define users to create
	users := []struct {
		ID        string
		Username  string
		Email     string
		FirstName string
		LastName  string
		RoleID    string
	}{
		{"bbbb2222-bbbb-2222-bbbb-222222222222", "group_admin", "group_admin@example.com", "Group", "Administrator", "aaaa2222-aaaa-2222-aaaa-222222222222"},
		{"bbbb3333-bbbb-3333-bbbb-333333333333", "role_admin", "role_admin@example.com", "Role", "Administrator", "aaaa3333-aaaa-3333-aaaa-333333333333"},
		{"bbbb4444-bbbb-4444-bbbb-444444444444", "user_admin", "user_admin@example.com", "User", "Administrator", "aaaa4444-aaaa-4444-aaaa-444444444444"},
		{"bbbb5555-bbbb-5555-bbbb-555555555555", "service_admin", "service_admin@example.com", "Service", "Administrator", "aaaa5555-aaaa-5555-aaaa-555555555555"},
		{"bbbb6666-bbbb-6666-bbbb-666666666666", "group_reader", "group_reader@example.com", "Group", "Reader", "aaaa6666-aaaa-6666-aaaa-666666666666"},
		{"bbbb7777-bbbb-7777-bbbb-777777777777", "role_reader", "role_reader@example.com", "Role", "Reader", "aaaa7777-aaaa-7777-aaaa-777777777777"},
		{"bbbb8888-bbbb-8888-bbbb-888888888888", "user_reader", "user_reader@example.com", "User", "Reader", "aaaa8888-aaaa-8888-aaaa-888888888888"},
		{"bbbb9999-bbbb-9999-bbbb-999999999999", "service_reader", "service_reader@example.com", "Service", "Reader", "aaaa9999-aaaa-9999-aaaa-999999999999"},
	}

	// Create each user
	for _, u := range users {
		userID, _ := uuid.Parse(u.ID)
		roleID, _ := uuid.Parse(u.RoleID)

		// Create user
		user := User{
			ID:        userID,
			Username:  u.Username,
			Email:     u.Email,
			Password:  string(hashedPassword),
			FirstName: u.FirstName,
			LastName:  u.LastName,
			IsActive:  true,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		result := db.Create(&user)
		if result.Error != nil {
			fmt.Printf("Error creating user %s: %v\n", u.Username, result.Error)
			continue
		}

		// Create user-role association
		userRole := UserRole{
			UserID: userID,
			RoleID: roleID,
		}

		result = db.Table("user_roles").Create(&userRole)
		if result.Error != nil {
			fmt.Printf("Error creating user-role for %s: %v\n", u.Username, result.Error)
			continue
		}

		fmt.Printf("Created user: %s\n", u.Username)
	}

	fmt.Println("All users created successfully!")
}