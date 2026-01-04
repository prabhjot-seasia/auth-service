package services

import (
	"strings"
	"github.com/google/uuid"
	"github.com/seasia/auth-service/internal/models"
	"github.com/seasia/auth-service/internal/repository"
	"gorm.io/gorm"
)

// Permission represents a simplified permission for API responses
type Permission struct {
	Resource string `json:"resource"`
	Action   string `json:"action"`
}

type UserService struct {
	db              *repository.Database
	passwordService *PasswordService
}

func NewUserService(db *repository.Database) *UserService {
	return &UserService{db: db}
}

// SetPasswordService allows setting the password service dependency
func (s *UserService) SetPasswordService(passwordService *PasswordService) {
	s.passwordService = passwordService
}

func (s *UserService) CreateUser(user *models.User) error {
	// Initialize password policy for new users
	if s.passwordService != nil {
		s.passwordService.InitializeUserPasswordPolicy(user)
	}
	return s.db.DB.Create(user).Error
}

func (s *UserService) GetByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := s.db.DB.Preload("Role.Permissions").Preload("Role.Groups").Preload("Groups").First(&user, "id = ?", id).Error
	return &user, err
}

func (s *UserService) GetByUsername(username string) (*models.User, error) {
	var user models.User
	err := s.db.DB.Preload("Role.Permissions").Preload("Role.Groups").Preload("Groups").First(&user, "username = ?", username).Error
	return &user, err
}

func (s *UserService) GetAllUsers() ([]models.User, error) {
	var users []models.User
	err := s.db.DB.Preload("Role").Find(&users).Error
	return users, err
}

func (s *UserService) GetUsersPaginated(page, limit int, search string, status string) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	
	// Build query
	query := s.db.DB.Model(&models.User{})
	
	// Apply search filter
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where(
			"username ILIKE ? OR email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}
	
	// Apply status filter
	if status != "" && status != "all" {
		isActive := status == "active"
		query = query.Where("is_active = ?", isActive)
	}
	
	// Count total users with filters
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// Calculate offset
	offset := (page - 1) * limit
	
	// Get paginated users with role
	err := query.Preload("Role").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&users).Error
	
	return users, total, err
}

func (s *UserService) UpdateUser(user *models.User) error {
	return s.db.DB.Save(user).Error
}

func (s *UserService) DeleteUser(id uuid.UUID) error {
	return s.db.DB.Delete(&models.User{}, "id = ?", id).Error
}

func (s *UserService) GetUserRole(userID uuid.UUID) (*models.Role, error) {
	var user models.User
	if err := s.db.DB.Preload("Role").First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	return user.Role, nil
}

func (s *UserService) AssignRole(userID uuid.UUID, roleID *uuid.UUID) error {
	var user models.User
	if err := s.db.DB.First(&user, "id = ?", userID).Error; err != nil {
		return err
	}

	// If roleID is nil, remove the role (set to NULL)
	if roleID == nil {
		user.RoleID = nil
		return s.db.DB.Save(&user).Error
	}

	// Validate that the role exists
	var role models.Role
	if err := s.db.DB.First(&role, "id = ?", *roleID).Error; err != nil {
		return err
	}

	user.RoleID = roleID
	return s.db.DB.Save(&user).Error
}

// Legacy method for backward compatibility - now just returns single role in array
func (s *UserService) GetUserRoles(userID uuid.UUID) ([]models.Role, error) {
	role, err := s.GetUserRole(userID)
	if err != nil {
		return []models.Role{}, err
	}
	if role == nil {
		return []models.Role{}, nil
	}
	return []models.Role{*role}, nil
}

// Legacy method for backward compatibility - now assigns only the first role
func (s *UserService) AssignRoles(userID uuid.UUID, roleIDs []uuid.UUID) error {
	if len(roleIDs) == 0 {
		return s.AssignRole(userID, nil)
	}
	return s.AssignRole(userID, &roleIDs[0])
}

func (s *UserService) GetUserPermissions(userID uuid.UUID) ([]models.Permission, error) {
	var user models.User
	// Preload full hierarchy: User -> Role -> Groups -> Services
	if err := s.db.DB.Preload("Role.Permissions").Preload("Role.Groups.Services").First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}

	permMap := make(map[string]models.Permission)
	
	// If user has no role, return empty permissions
	if user.Role == nil {
		return []models.Permission{}, nil
	}
	
	// Aggregate permissions from both role_permissions and group_services
	// This follows the hierarchy: User -> Role -> Groups -> Services -> Scopes
	// Users inherit all permissions from their role's groups and services
	role := user.Role
	
	// Add direct role permissions
	for _, perm := range role.Permissions {
		key := perm.Resource + ":" + perm.Action
		permMap[key] = perm
	}
	
	// Add permissions from group services
	for _, group := range role.Groups {
		for _, groupService := range group.Services {
			// Parse scopes from the service and create permissions
			scopes := strings.Fields(groupService.Scopes)
			for _, scope := range scopes {
				parts := strings.Split(scope, ":")
				if len(parts) == 2 {
					var resource, action string
					
					// Auto-detect scope format by checking if first part is a known action
					knownActions := map[string]bool{"read": true, "write": true, "create": true, "update": true, "delete": true}
					if knownActions[parts[0]] {
						// New format: action:resource (e.g., "read:users")
						action = parts[0]
						resource = parts[1]
					} else {
						// Old format: resource:action (e.g., "users:read") 
						resource = parts[0]
						action = parts[1]
					}
					
					// Skip empty or invalid parts
					if action == "" || resource == "" {
						continue
					}
					
					key := resource + ":" + action

					// Create a virtual permission (not stored in DB, derived from group services)
					perm := models.Permission{
						Resource: resource,
						Action:   action,
					}
					permMap[key] = perm
				}
			}
		}
	}

	permissions := make([]models.Permission, 0, len(permMap))
	for _, perm := range permMap {
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

func (s *UserService) GetServiceByClientID(clientID string) (*models.Service, error) {
	var service models.Service
	err := s.db.DB.First(&service, "client_id = ?", clientID).Error
	return &service, err
}

func (s *UserService) CreateService(service *models.Service) error {
	return s.db.DB.Create(service).Error
}

func (s *UserService) GetServiceByID(id uuid.UUID) (*models.Service, error) {
	var service models.Service
	err := s.db.DB.First(&service, "id = ?", id).Error
	return &service, err
}

func (s *UserService) GetAllServices() ([]models.Service, error) {
	var services []models.Service
	err := s.db.DB.Find(&services).Error
	return services, err
}

func (s *UserService) UpdateService(service *models.Service) error {
	return s.db.DB.Save(service).Error
}

func (s *UserService) DeleteService(id uuid.UUID) error {
	// Start a transaction for atomic operation
	tx := s.db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// First, check if service has any group assignments
	var assignmentCount int64
	if err := tx.Model(&models.GroupService{}).Where("service_id = ?", id).Count(&assignmentCount).Error; err != nil {
		tx.Rollback()
		return err
	}

	// If there are assignments, remove them first (this will prevent orphaned references)
	if assignmentCount > 0 {
		if err := tx.Delete(&models.GroupService{}, "service_id = ?", id).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	// Now delete the service
	if err := tx.Delete(&models.Service{}, "id = ?", id).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// GetUserEffectivePermissions gets all permissions a user has through their assigned roles
func (s *UserService) GetUserEffectivePermissions(userID uuid.UUID) ([]Permission, error) {
	modelPerms, err := s.GetUserPermissions(userID)
	if err != nil {
		return nil, err
	}

	// Convert models.Permission to services.Permission
	perms := make([]Permission, len(modelPerms))
	for i, modelPerm := range modelPerms {
		perms[i] = Permission{
			Resource: modelPerm.Resource,
			Action:   modelPerm.Action,
		}
	}

	return perms, nil
}

// CheckUserPermission checks if a user has a specific permission through role-permission assignments
func (s *UserService) CheckUserPermission(userID uuid.UUID, action, resource string) (bool, error) {
	permissions, err := s.GetUserEffectivePermissions(userID)
	if err != nil {
		return false, err
	}

	// Check if the user has the specific permission
	targetKey := action + ":" + resource
	for _, perm := range permissions {
		permKey := perm.Action + ":" + perm.Resource
		if permKey == targetKey {
			return true, nil
		}
	}

	return false, nil
}

// CheckUserServiceAccess checks if a user has access to a specific service through their groups
func (s *UserService) CheckUserServiceAccess(userID uuid.UUID, serviceID uuid.UUID) (bool, error) {
	var user models.User
	// Preload user with roles and groups
	if err := s.db.DB.Preload("Role.Groups.Services").First(&user, "id = ?", userID).Error; err != nil {
		return false, err
	}

	// If user has no role, they have no service access
	if user.Role == nil {
		return false, nil
	}

	// Check if user has access to this service through their role's groups
	for _, group := range user.Role.Groups {
		for _, groupService := range group.Services {
			if groupService.ServiceID == serviceID {
				return true, nil
			}
		}
	}

	return false, nil
}

type RoleService struct {
	db *gorm.DB
}

func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{db: db}
}

func (s *RoleService) CreateRole(role *models.Role) error {
	return s.db.Create(role).Error
}

func (s *RoleService) GetRoleByID(id uuid.UUID) (*models.Role, error) {
	var role models.Role
	err := s.db.Preload("Permissions").First(&role, "id = ?", id).Error
	return &role, err
}

func (s *RoleService) GetAllRoles() ([]models.Role, error) {
	var roles []models.Role
	err := s.db.Preload("Permissions").Preload("Groups.Services.Service").Find(&roles).Error
	if err != nil {
		return nil, err
	}
	
	// Calculate effective permissions for each role (including group service permissions)
	for i := range roles {
		effectivePerms := s.calculateRoleEffectivePermissions(&roles[i])
		roles[i].Permissions = effectivePerms
	}
	
	return roles, nil
}

// calculateRoleEffectivePermissions calculates all permissions for a role (direct + group services)
func (s *RoleService) calculateRoleEffectivePermissions(role *models.Role) []models.Permission {
	permMap := make(map[string]models.Permission)
	
	// Add direct role permissions
	for _, perm := range role.Permissions {
		key := perm.Resource + ":" + perm.Action
		permMap[key] = perm
	}
	
	// Add permissions from group services
	for _, group := range role.Groups {
		for _, groupService := range group.Services {
			// Parse scopes from the service and create permissions
			scopes := strings.Fields(groupService.Scopes)
			for _, scope := range scopes {
				parts := strings.Split(scope, ":")
				if len(parts) == 2 {
					var resource, action string
					
					// Auto-detect scope format by checking if first part is a known action
					knownActions := map[string]bool{"read": true, "write": true, "create": true, "update": true, "delete": true}
					if knownActions[parts[0]] {
						// New format: action:resource (e.g., "read:users")
						action = parts[0]
						resource = parts[1]
					} else {
						// Old format: resource:action (e.g., "users:read") 
						resource = parts[0]
						action = parts[1]
					}
					
					// Skip empty or invalid parts
					if action == "" || resource == "" {
						continue
					}
					
					key := resource + ":" + action

					// Create a virtual permission (not stored in DB, derived from group services)
					perm := models.Permission{
						Resource: resource,
						Action:   action,
					}
					permMap[key] = perm
				}
			}
		}
	}
	
	// Convert map to slice
	effectivePermissions := make([]models.Permission, 0, len(permMap))
	for _, perm := range permMap {
		effectivePermissions = append(effectivePermissions, perm)
	}
	
	return effectivePermissions
}

func (s *RoleService) UpdateRole(role *models.Role) error {
	return s.db.Save(role).Error
}

func (s *RoleService) DeleteRole(id uuid.UUID) error {
	return s.db.Delete(&models.Role{}, "id = ?", id).Error
}

func (s *RoleService) GetRoleGroups(roleID uuid.UUID) ([]models.Group, error) {
	var role models.Role
	if err := s.db.Preload("Groups").First(&role, "id = ?", roleID).Error; err != nil {
		return nil, err
	}
	return role.Groups, nil
}

func (s *RoleService) AssignGroups(roleID uuid.UUID, groupIDs []uuid.UUID) error {
	var role models.Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		return err
	}

	var groups []models.Group
	if err := s.db.Find(&groups, "id IN ?", groupIDs).Error; err != nil {
		return err
	}

	return s.db.Model(&role).Association("Groups").Replace(groups)
}


type GroupService struct {
	db *gorm.DB
}

func NewGroupService(db *gorm.DB) *GroupService {
	return &GroupService{db: db}
}

func (s *GroupService) CreateGroup(group *models.Group) error {
	return s.db.Create(group).Error
}

func (s *GroupService) GetAllGroups() ([]models.Group, error) {
	var groups []models.Group
	err := s.db.Preload("Services.Service").Find(&groups).Error
	return groups, err
}

func (s *GroupService) GetGroupByID(id uuid.UUID) (*models.Group, error) {
	var group models.Group
	err := s.db.Preload("Services.Service").First(&group, "id = ?", id).Error
	return &group, err
}

func (s *GroupService) UpdateGroup(group *models.Group) error {
	return s.db.Save(group).Error
}

func (s *GroupService) DeleteGroup(id uuid.UUID) error {
	// Delete associated group services first
	if err := s.db.Delete(&models.GroupService{}, "group_id = ?", id).Error; err != nil {
		return err
	}
	return s.db.Delete(&models.Group{}, "id = ?", id).Error
}

func (s *GroupService) AssignServices(groupID uuid.UUID, serviceAssignments []models.GroupService) error {
	// Start a transaction for atomic operation
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get existing assignments to preserve any that aren't being updated
	var existingAssignments []models.GroupService
	if err := tx.Find(&existingAssignments, "group_id = ?", groupID).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Create map of new assignments by service ID for easy lookup
	newAssignmentMap := make(map[uuid.UUID]models.GroupService)
	for _, assignment := range serviceAssignments {
		newAssignmentMap[assignment.ServiceID] = assignment
	}

	// Update or preserve existing assignments
	for _, existing := range existingAssignments {
		if newAssignment, exists := newAssignmentMap[existing.ServiceID]; exists {
			// Update existing assignment with new scopes
			if existing.Scopes != newAssignment.Scopes {
				existing.Scopes = newAssignment.Scopes
				if err := tx.Save(&existing).Error; err != nil {
					tx.Rollback()
					return err
				}
			}
			// Remove from new map since we've handled it
			delete(newAssignmentMap, existing.ServiceID)
		}
		// If not in new assignments map, we preserve the existing assignment
		// This prevents accidental deletion of assignments
	}

	// Create truly new assignments (ones that didn't exist before)
	for _, assignment := range newAssignmentMap {
		assignment.GroupID = groupID
		if err := tx.Create(&assignment).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

// ReplaceServices completely replaces all service assignments for a group (destructive operation)
// Use this only when you explicitly want to clear all existing assignments
func (s *GroupService) ReplaceServices(groupID uuid.UUID, serviceAssignments []models.GroupService) error {
	// Start a transaction for atomic operation
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Use hard delete to avoid unique constraint issues (original destructive behavior)
	if err := tx.Unscoped().Delete(&models.GroupService{}, "group_id = ?", groupID).Error; err != nil {
		tx.Rollback()
		return err
	}
	
	// Create new assignments
	for _, assignment := range serviceAssignments {
		assignment.GroupID = groupID
		if err := tx.Create(&assignment).Error; err != nil {
			tx.Rollback()
			return err
		}
	}
	
	return tx.Commit().Error
}

// RemoveServiceAssignment removes a specific service assignment from a group
func (s *GroupService) RemoveServiceAssignment(groupID, serviceID uuid.UUID) error {
	return s.db.Delete(&models.GroupService{}, "group_id = ? AND service_id = ?", groupID, serviceID).Error
}

func (s *GroupService) GetGroupServices(groupID uuid.UUID) ([]models.GroupService, error) {
	var groupServices []models.GroupService
	err := s.db.Preload("Service").Find(&groupServices, "group_id = ?", groupID).Error
	return groupServices, err
}

// GetUserAccessibleServices returns services that a user has access to through their role->groups mapping
func (s *UserService) GetUserAccessibleServices(userID uuid.UUID) ([]models.Service, error) {
	var services []models.Service
	
	// Get services through User->Role->Groups->Services chain
	err := s.db.DB.
		Table("services").
		Select("DISTINCT services.*").
		Joins("JOIN group_services ON services.id = group_services.service_id").
		Joins("JOIN groups ON group_services.group_id = groups.id").
		Joins("JOIN role_groups ON groups.id = role_groups.group_id").
		Joins("JOIN roles ON role_groups.role_id = roles.id").
		Joins("JOIN users ON roles.id = users.role_id").
		Where("users.id = ? AND users.is_active = ? AND services.is_active = ?", userID, true, true).
		Find(&services).Error
	
	return services, err
}