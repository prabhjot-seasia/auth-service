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

	// Update user1 password
	userID := uuid.MustParse("cccc1111-cccc-1111-cccc-111111111111")
	
	result := db.Model(&User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"password":   string(userPassword),
		"updated_at": time.Now(),
	})
	
	if result.Error != nil {
		log.Fatal("Failed to update user1 password:", result.Error)
	}
	
	fmt.Printf("Successfully updated user1 password. Rows affected: %d\n", result.RowsAffected)
}