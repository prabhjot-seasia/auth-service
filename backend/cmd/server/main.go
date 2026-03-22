package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/seasia/auth-service/config"
	"github.com/seasia/auth-service/internal/auth"
	"github.com/seasia/auth-service/internal/handlers"
	"github.com/seasia/auth-service/internal/middleware"
	"github.com/seasia/auth-service/internal/repository"
	"github.com/seasia/auth-service/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	db, err := repository.NewDatabase(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	jwtManager := auth.NewJWTManager(&cfg.JWT)
	passwordService := services.NewPasswordService(db.DB, &cfg.Password)
	validationService := services.NewValidationService(db.DB)
	userService := services.NewUserService(db)
	userService.SetPasswordService(passwordService)
	roleService := services.NewRoleService(db.DB)
	groupService := services.NewGroupService(db.DB)
	tokenBlacklist := services.NewTokenBlacklist()

	authHandler := handlers.NewAuthHandler(userService, passwordService, jwtManager)
	userHandler := handlers.NewUserHandler(userService, validationService, passwordService)
	roleHandler := handlers.NewRoleHandler(roleService, validationService)
	groupHandler := handlers.NewGroupHandler(groupService, validationService)
	serviceHandler := handlers.NewServiceHandler(userService, validationService)
	ssoHandler := handlers.NewSSOHandler(userService, jwtManager, tokenBlacklist, cfg.Server.FrontendURL)
	documentHandler := handlers.NewDocumentHandler(userService)
	healthHandler := handlers.NewHealthHandler()

	router := gin.Default()
	router.Use(middleware.CORSMiddleware())

	router.GET("/health", healthHandler.Health)
	router.POST("/auth/token", authHandler.Token)
	router.POST("/auth/login", authHandler.Login)

	// SSO endpoints - public endpoints for external services
	sso := router.Group("/sso")
	{
		sso.GET("/login", ssoHandler.AuthorizeEndpoint)
		sso.POST("/validate", ssoHandler.ValidateToken)
		sso.GET("/validate", ssoHandler.ValidateTokenFromHeader)
		sso.POST("/check-permission", ssoHandler.CheckPermission)
		sso.POST("/login", ssoHandler.ServiceLogin)
		sso.POST("/logout", ssoHandler.Logout)
	}

	authorized := router.Group("/")
	authorized.Use(middleware.AuthMiddleware(jwtManager, tokenBlacklist))
	{
		authorized.GET("/me/permissions", authHandler.GetMyPermissions)
		authorized.GET("/me/check-permission", authHandler.CheckMyPermission)
		authorized.GET("/me/services", authHandler.GetMyServices)
		authorized.POST("/auth/change-password", authHandler.ChangePassword)
		authorized.GET("/me/password-policy", authHandler.GetPasswordPolicy)

		authorized.GET("/users", middleware.RequirePermission(userService, "read", "users"), userHandler.GetUsers)
		authorized.POST("/users", middleware.RequirePermission(userService, "write", "users"), userHandler.CreateUser)
		authorized.GET("/users/:id", middleware.RequirePermission(userService, "read", "users"), userHandler.GetUser)
		authorized.PUT("/users/:id", middleware.RequirePermission(userService, "write", "users"), userHandler.UpdateUser)
		authorized.DELETE("/users/:id", middleware.RequirePermission(userService, "write", "users"), userHandler.DeleteUser)
		authorized.GET("/users/:id/roles", userHandler.GetUserRoles)
		authorized.PUT("/users/:id/roles", middleware.RequirePermission(userService, "write", "users"), userHandler.AssignRoles)
		authorized.PUT("/users/:id/role", middleware.RequirePermission(userService, "write", "users"), userHandler.AssignRole)
		
		// CSV endpoints
		authorized.GET("/users/export/csv", middleware.RequirePermission(userService, "read", "users"), userHandler.ExportUsersCSV)
		authorized.POST("/users/import/csv", middleware.RequirePermission(userService, "write", "users"), userHandler.ImportUsersCSV)

		authorized.GET("/roles", middleware.RequirePermission(userService, "read", "roles"), roleHandler.GetRoles)
		authorized.POST("/roles", middleware.RequirePermission(userService, "write", "roles"), roleHandler.CreateRole)
		authorized.GET("/roles/:id", middleware.RequirePermission(userService, "read", "roles"), roleHandler.GetRole)
		authorized.PUT("/roles/:id", middleware.RequirePermission(userService, "write", "roles"), roleHandler.UpdateRole)
		authorized.DELETE("/roles/:id", middleware.RequirePermission(userService, "write", "roles"), roleHandler.DeleteRole)
		authorized.GET("/roles/:id/groups", middleware.RequirePermission(userService, "read", "roles"), roleHandler.GetRoleGroups)
		authorized.PUT("/roles/:id/groups", middleware.RequirePermission(userService, "write", "roles"), roleHandler.AssignGroups)

		authorized.GET("/groups", middleware.RequirePermission(userService, "read", "groups"), groupHandler.GetGroups)
		authorized.POST("/groups", middleware.RequirePermission(userService, "write", "groups"), groupHandler.CreateGroup)
		authorized.GET("/groups/:id", middleware.RequirePermission(userService, "read", "groups"), groupHandler.GetGroup)
		authorized.PUT("/groups/:id", middleware.RequirePermission(userService, "write", "groups"), groupHandler.UpdateGroup)
		authorized.DELETE("/groups/:id", middleware.RequirePermission(userService, "write", "groups"), groupHandler.DeleteGroup)
		authorized.GET("/groups/:id/services", middleware.RequirePermission(userService, "read", "groups"), groupHandler.GetGroupServices)
		authorized.PUT("/groups/:id/services", middleware.RequirePermission(userService, "write", "groups"), groupHandler.AssignServices)

		authorized.GET("/services", middleware.RequirePermission(userService, "read", "services"), serviceHandler.GetServices)
		authorized.POST("/services", middleware.RequirePermission(userService, "write", "services"), serviceHandler.CreateService)
		authorized.GET("/services/:id", middleware.RequirePermission(userService, "read", "services"), serviceHandler.GetService)
		authorized.PUT("/services/:id", middleware.RequirePermission(userService, "write", "services"), serviceHandler.UpdateService)
		authorized.POST("/services/:id/regenerate-secret", middleware.RequirePermission(userService, "write", "services"), serviceHandler.RegenerateSecret)
		authorized.DELETE("/services/:id", middleware.RequirePermission(userService, "write", "services"), serviceHandler.DeleteService)

		// Document and Folder Management endpoints
		authorized.GET("/documents/permissions", documentHandler.GetUserPermissions)
		authorized.POST("/documents/check-permission", documentHandler.CheckDocumentPermission)
		authorized.POST("/documents/check-delete", documentHandler.CheckDeletePermission)
		authorized.GET("/documents/check-create", documentHandler.CheckCreatePermission)
	}

	log.Printf("Server starting on %s:%s", cfg.Server.Host, cfg.Server.Port)
	if err := router.Run(cfg.Server.Host + ":" + cfg.Server.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}