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

	// Hash password for user1 (User@123)
	userPassword, err := bcrypt.GenerateFromPassword([]byte("User@123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash user password:", err)
	}

	// Hash password for admin users (Admin@123)
	adminPassword, err := bcrypt.GenerateFromPassword([]byte("Admin@123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash admin password:", err)
	}

	// Define users to create/update
	users := []struct {
		ID        string
		Username  string
		Email     string
		Password  []byte
		FirstName string
		LastName  string
		RoleID    string
	}{
		{"f88aa68b-fc29-44a3-90d2-6a9a65943ca0", "user1", "user1@example.com", userPassword, "Regular", "User", "aaaa1111-aaaa-1111-aaaa-111111111111"}, // user role
		{"bbbb2222-bbbb-2222-bbbb-222222222222", "group_admin", "group_admin@example.com", adminPassword, "Group", "Administrator", "aaaa2222-aaaa-2222-aaaa-222222222222"},
		{"bbbb3333-bbbb-3333-bbbb-333333333333", "role_admin", "role_admin@example.com", adminPassword, "Role", "Administrator", "aaaa3333-aaaa-3333-aaaa-333333333333"},
		{"bbbb4444-bbbb-4444-bbbb-444444444444", "user_admin", "user_admin@example.com", adminPassword, "User", "Administrator", "aaaa4444-aaaa-4444-aaaa-444444444444"},
		{"bbbb5555-bbbb-5555-bbbb-555555555555", "service_admin", "service_admin@example.com", adminPassword, "Service", "Administrator", "aaaa5555-aaaa-5555-aaaa-555555555555"},
		{"bbbb6666-bbbb-6666-bbbb-666666666666", "group_reader", "group_reader@example.com", adminPassword, "Group", "Reader", "aaaa6666-aaaa-6666-aaaa-666666666666"},
		{"bbbb7777-bbbb-7777-bbbb-777777777777", "role_reader", "role_reader@example.com", adminPassword, "Role", "Reader", "aaaa7777-aaaa-7777-aaaa-777777777777"},
		{"bbbb8888-bbbb-8888-bbbb-888888888888", "user_reader", "user_reader@example.com", adminPassword, "User", "Reader", "aaaa8888-aaaa-8888-aaaa-888888888888"},
		{"bbbb9999-bbbb-9999-bbbb-999999999999", "service_reader", "service_reader@example.com", adminPassword, "Service", "Reader", "aaaa9999-aaaa-9999-aaaa-999999999999"},
	}

	// Create or update each user
	for _, u := range users {
		userID, _ := uuid.Parse(u.ID)
		roleID, _ := uuid.Parse(u.RoleID)

		// Check if user exists
		var existingUser User
		err := db.First(&existingUser, "id = ?", userID).Error
		
		if err == gorm.ErrRecordNotFound {
			// Create new user
			user := User{
				ID:        userID,
				Username:  u.Username,
				Email:     u.Email,
				Password:  string(u.Password),
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
		} else if err == nil {
			// Update existing user password
			result := db.Model(&existingUser).Updates(User{
				Password:  string(u.Password),
				UpdatedAt: time.Now(),
			})
			if result.Error != nil {
				fmt.Printf("Error updating password for %s: %v\n", u.Username, result.Error)
				continue
			}
			
			fmt.Printf("Updated password for user: %s\n", u.Username)
		} else {
			fmt.Printf("Error checking user %s: %v\n", u.Username, err)
			continue
		}
	}

	fmt.Println("All users processed successfully!")
}