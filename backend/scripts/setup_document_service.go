package main

import (
	"log"

	"github.com/google/uuid"
	"github.com/seasia/auth-service/config"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Connect to database
	db, err := repository.NewDatabase(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Setting up Document Service infrastructure...")

	// 1. Create Groups
	log.Println("Creating groups...")
	
	// Document Administrators Group
	docAdminGroup := &models.Group{
		Name:        "document_administrators",
		Description: "Administrators of the document management system with full access",
	}
	if err := db.DB.FirstOrCreate(docAdminGroup, models.Group{Name: "document_administrators"}).Error; err != nil {
		log.Printf("Failed to create document_administrators group: %v", err)
	} else {
		log.Printf("Created/Found document_administrators group: %s", docAdminGroup.ID.String())
	}

	// Document Users Group
	docUsersGroup := &models.Group{
		Name:        "document_users",
		Description: "Regular users of the document management system with read access",
	}
	if err := db.DB.FirstOrCreate(docUsersGroup, models.Group{Name: "document_users"}).Error; err != nil {
		log.Printf("Failed to create document_users group: %v", err)
	} else {
		log.Printf("Created/Found document_users group: %s", docUsersGroup.ID.String())
	}

	// 2. Create Roles
	log.Println("Creating roles...")

	// Document Administrator Role
	docAdminRole := &models.Role{
		Name:        "document_administrator",
		Description: "Full administrative access to document management system",
	}
	if err := db.DB.FirstOrCreate(docAdminRole, models.Role{Name: "document_administrator"}).Error; err != nil {
		log.Printf("Failed to create document_administrator role: %v", err)
	} else {
		log.Printf("Created/Found document_administrator role: %s", docAdminRole.ID.String())
	}

	// Document User Role
	docUserRole := &models.Role{
		Name:        "document_user",
		Description: "Basic access to document management system",
	}
	if err := db.DB.FirstOrCreate(docUserRole, models.Role{Name: "document_user"}).Error; err != nil {
		log.Printf("Failed to create document_user role: %v", err)
	} else {
		log.Printf("Created/Found document_user role: %s", docUserRole.ID.String())
	}

	// 3. Create Permissions and assign to roles
	log.Println("Creating permissions...")
	
	// Admin permissions
	adminPermissions := []models.Permission{
		{Resource: "documents", Action: "read"},
		{Resource: "documents", Action: "write"},
		{Resource: "documents", Action: "delete"},
		{Resource: "users", Action: "read"},
		{Resource: "profile", Action: "read"},
	}

	for _, perm := range adminPermissions {
		var existingPerm models.Permission
		if err := db.DB.FirstOrCreate(&existingPerm, models.Permission{Resource: perm.Resource, Action: perm.Action}).Error; err != nil {
			log.Printf("Failed to create permission %s:%s: %v", perm.Action, perm.Resource, err)
		} else {
			log.Printf("Created/Found permission %s:%s", perm.Action, perm.Resource)
			// Assign permission to admin role
			if err := db.DB.Model(docAdminRole).Association("Permissions").Append(&existingPerm); err != nil {
				log.Printf("Failed to assign permission %s:%s to document_administrator: %v", perm.Action, perm.Resource, err)
			}
		}
	}

	// User permissions
	userPermissions := []models.Permission{
		{Resource: "documents", Action: "read"},
		{Resource: "profile", Action: "read"},
	}

	for _, perm := range userPermissions {
		var existingPerm models.Permission
		if err := db.DB.FirstOrCreate(&existingPerm, models.Permission{Resource: perm.Resource, Action: perm.Action}).Error; err != nil {
			log.Printf("Failed to create permission %s:%s: %v", perm.Action, perm.Resource, err)
		} else {
			log.Printf("Created/Found permission %s:%s", perm.Action, perm.Resource)
			// Assign permission to user role
			if err := db.DB.Model(docUserRole).Association("Permissions").Append(&existingPerm); err != nil {
				log.Printf("Failed to assign permission %s:%s to document_user: %v", perm.Action, perm.Resource, err)
			}
		}
	}

	// 4. Assign Groups to Roles
	log.Println("Assigning groups to roles...")
	
	// Assign document_administrators group to document_administrator role
	if err := db.DB.Model(docAdminRole).Association("Groups").Append(docAdminGroup); err != nil {
		log.Printf("Failed to assign document_administrators group to document_administrator role: %v", err)
	} else {
		log.Println("Assigned document_administrators group to document_administrator role")
	}

	// Assign document_users group to document_user role
	if err := db.DB.Model(docUserRole).Association("Groups").Append(docUsersGroup); err != nil {
		log.Printf("Failed to assign document_users group to document_user role: %v", err)
	} else {
		log.Println("Assigned document_users group to document_user role")
	}

	// 5. Get existing services and assign them to groups
	log.Println("Assigning services to groups...")
	
	var frontendService, backendService models.Service
	
	// Find the services we created
	if err := db.DB.Where("name = ?", "Document Frontend Service").First(&frontendService).Error; err != nil {
		log.Printf("Frontend service not found: %v", err)
	} else {
		log.Printf("Found frontend service: %s", frontendService.ID.String())
		
		// Assign frontend service to both groups
		adminGroupService := models.GroupService{
			GroupID:   docAdminGroup.ID,
			ServiceID: frontendService.ID,
		}
		if err := db.DB.FirstOrCreate(&adminGroupService, adminGroupService).Error; err != nil {
			log.Printf("Failed to assign frontend service to admin group: %v", err)
		} else {
			log.Println("Assigned frontend service to document_administrators group")
		}
		
		userGroupService := models.GroupService{
			GroupID:   docUsersGroup.ID,
			ServiceID: frontendService.ID,
		}
		if err := db.DB.FirstOrCreate(&userGroupService, userGroupService).Error; err != nil {
			log.Printf("Failed to assign frontend service to users group: %v", err)
		} else {
			log.Println("Assigned frontend service to document_users group")
		}
	}

	if err := db.DB.Where("name = ?", "Document Backend Service").First(&backendService).Error; err != nil {
		log.Printf("Backend service not found: %v", err)
	} else {
		log.Printf("Found backend service: %s", backendService.ID.String())
		
		// Assign backend service to both groups
		adminGroupService := models.GroupService{
			GroupID:   docAdminGroup.ID,
			ServiceID: backendService.ID,
		}
		if err := db.DB.FirstOrCreate(&adminGroupService, adminGroupService).Error; err != nil {
			log.Printf("Failed to assign backend service to admin group: %v", err)
		} else {
			log.Println("Assigned backend service to document_administrators group")
		}
		
		userGroupService := models.GroupService{
			GroupID:   docUsersGroup.ID,
			ServiceID: backendService.ID,
		}
		if err := db.DB.FirstOrCreate(&userGroupService, userGroupService).Error; err != nil {
			log.Printf("Failed to assign backend service to users group: %v", err)
		} else {
			log.Println("Assigned backend service to document_users group")
		}
	}

	// 6. Create Test Users
	log.Println("Creating test users...")

	// Hash passwords
	adminHashedPassword, err := bcrypt.GenerateFromPassword([]byte("Admin@123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash admin password:", err)
	}

	userHashedPassword, err := bcrypt.GenerateFromPassword([]byte("User@123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash user password:", err)
	}

	// Create Document Admin User
	docAdminUser := &models.User{
		ID:       uuid.MustParse("aaaa1111-aaaa-1111-aaaa-111111111111"),
		Username: "doc_admin",
		Email:    "docadmin@example.com",
		Password: string(adminHashedPassword),
		IsActive: true,
	}

	if err := db.DB.FirstOrCreate(docAdminUser, models.User{Username: "doc_admin"}).Error; err != nil {
		log.Printf("Failed to create doc_admin user: %v", err)
	} else {
		log.Printf("Created/Found doc_admin user: %s", docAdminUser.ID.String())
		
		// Assign document_administrator role
		if err := db.DB.Model(docAdminUser).Association("Roles").Append(docAdminRole); err != nil {
			log.Printf("Failed to assign role to doc_admin: %v", err)
		} else {
			log.Println("Assigned document_administrator role to doc_admin")
		}
	}

	// Create Document User
	docUser := &models.User{
		ID:       uuid.MustParse("bbbb2222-bbbb-2222-bbbb-222222222222"),
		Username: "doc_user",
		Email:    "docuser@example.com",
		Password: string(userHashedPassword),
		IsActive: true,
	}

	if err := db.DB.FirstOrCreate(docUser, models.User{Username: "doc_user"}).Error; err != nil {
		log.Printf("Failed to create doc_user: %v", err)
	} else {
		log.Printf("Created/Found doc_user: %s", docUser.ID.String())
		
		// Assign document_user role
		if err := db.DB.Model(docUser).Association("Roles").Append(docUserRole); err != nil {
			log.Printf("Failed to assign role to doc_user: %v", err)
		} else {
			log.Println("Assigned document_user role to doc_user")
		}
	}

	log.Println("Document Service setup completed successfully!")
	log.Println("\nTest Credentials:")
	log.Println("Admin User: doc_admin / Admin@123")
	log.Println("Regular User: doc_user / User@123")
	log.Println("\nService Credentials are in DOCUMENT_SERVICE_CREDENTIALS.md")
}