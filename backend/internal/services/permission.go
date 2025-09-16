package services

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

type PermissionService struct {
	db *gorm.DB
}

type UserPermission struct {
	Resource string `json:"resource"`
	Action   string `json:"action"`
	Service  string `json:"service"`
}

func NewPermissionService(db *gorm.DB) *PermissionService {
	return &PermissionService{db: db}
}

// GetUserEffectivePermissions gets all permissions for a user through the complete chain
// User → Role → Group → Service → Permission
func (ps *PermissionService) GetUserEffectivePermissions(userID string) ([]UserPermission, error) {
	var permissions []UserPermission
	
	query := `
		SELECT DISTINCT 
			p.resource,
			p.action,
			s.name as service
		FROM users u
		JOIN user_roles ur ON u.id = ur.user_id
		JOIN roles r ON ur.role_id = r.id
		JOIN role_groups rg ON r.id = rg.role_id
		JOIN groups g ON rg.group_id = g.id
		JOIN group_services gs ON g.id = gs.group_id
		JOIN services s ON gs.service_id = s.id
		JOIN service_permissions sp ON s.id = sp.service_id
		JOIN permissions p ON sp.permission_id = p.id
		WHERE u.id = ? AND s.name = 'auth-service'
		ORDER BY p.resource, p.action
	`
	
	rows, err := ps.db.Raw(query, userID).Rows()
	if err != nil {
		return nil, fmt.Errorf("failed to query user permissions: %w", err)
	}
	defer rows.Close()
	
	for rows.Next() {
		var perm UserPermission
		if err := rows.Scan(&perm.Resource, &perm.Action, &perm.Service); err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, perm)
	}
	
	return permissions, nil
}

// HasPermission checks if a user has a specific permission for auth-service
func (ps *PermissionService) HasPermission(userID, action, resource string) (bool, error) {
	var count int64
	
	query := `
		SELECT COUNT(DISTINCT p.id)
		FROM users u
		JOIN user_roles ur ON u.id = ur.user_id
		JOIN roles r ON ur.role_id = r.id
		JOIN role_groups rg ON r.id = rg.role_id
		JOIN groups g ON rg.group_id = g.id
		JOIN group_services gs ON g.id = gs.group_id
		JOIN services s ON gs.service_id = s.id
		JOIN service_permissions sp ON s.id = sp.service_id
		JOIN permissions p ON sp.permission_id = p.id
		WHERE u.id = ? 
		AND p.action = ? 
		AND p.resource = ? 
		AND s.name = 'auth-service'
	`
	
	err := ps.db.Raw(query, userID, action, resource).Scan(&count).Error
	if err != nil {
		log.Printf("Permission check failed for user %s, action %s, resource %s: %v", userID, action, resource, err)
		return false, err
	}
	
	log.Printf("Permission check: user=%s, action=%s, resource=%s, hasPermission=%t", userID, action, resource, count > 0)
	return count > 0, nil
}

// HasAnyPermission checks if user has any of the specified permissions
func (ps *PermissionService) HasAnyPermission(userID string, permissions []string) (bool, error) {
	if len(permissions) == 0 {
		return false, nil
	}
	
	for _, perm := range permissions {
		// Parse "action:resource" format
		var action, resource string
		if _, err := fmt.Sscanf(perm, "%s:%s", &action, &resource); err != nil {
			continue
		}
		
		if hasPermission, err := ps.HasPermission(userID, action, resource); err == nil && hasPermission {
			return true, nil
		}
	}
	
	return false, nil
}