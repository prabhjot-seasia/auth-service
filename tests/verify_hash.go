package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "Test@123"
	hash := "$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG"
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		fmt.Println("Password does not match:", err)
	} else {
		fmt.Println("Password matches!")
	}
}