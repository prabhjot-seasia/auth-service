import React, { useState, useEffect } from 'react';
import { useAuth } from '../provider/authProvider';
import { usePermissions, RequirePermission } from '../contexts/PermissionContext';
import { UserManagement } from './UserManagement';
import ServiceManagement from './ServiceManagement';
import GroupManagement from './GroupManagement';
import RoleManagement from './RoleManagement';
import { ApiDocumentation } from './ApiDocumentation';
import axios from 'axios';
import seasiaLogo from '../assets/seasia-logo.svg';
import './Dashboard.css';

interface Service {
  id: string;
  name: string;
  client_id: string;
  scopes: string;
  is_active: boolean;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { permissions: effectivePermissions, loading: permissionsLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState('permissions');
  const [error, setError] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Only fetch services if user has permission to read services
    if (effectivePermissions?.some(perm => perm.resource === 'services' && perm.action === 'read')) {
      fetchData();
    }
  }, [effectivePermissions]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        console.error('No JWT token found');
        return;
      }
      const response = await axios.get('http://localhost:8080/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setServices(response.data);
    } catch (err: any) {
      console.error('Failed to fetch services:', err);
      // If we get 401, the token might be expired - the user needs to re-login
      if (err.response?.status === 401) {
        console.error('Services request failed with 401 - token may be expired');
      }
    }
  };

  const handleTabSelect = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close mobile menu when tab is selected
  };

  const groupPermissionsByService = () => {
    if (!effectivePermissions) {
      return {};
    }

    const grouped: { [serviceName: string]: any[] } = {};
    
    // Create a mapping of permission patterns to services (if services are loaded)
    const serviceMap: { [permPattern: string]: string } = {};
    if (services && services.length > 0) {
      services.forEach(service => {
        const scopes = service.scopes.split(' ');
        scopes.forEach(scope => {
          serviceMap[scope] = service.name;
        });
      });
    }

    // Group permissions by service
    effectivePermissions.forEach((perm: any) => {
      const permPattern = `${perm.resource}:${perm.action}`;
      let serviceName;
      
      if (services && services.length > 0) {
        // If services are loaded, try to map to service name
        serviceName = serviceMap[permPattern] || 'Other Permissions';
      } else {
        // If services aren't loaded (user doesn't have services:read), just use a generic name
        serviceName = 'User Permissions';
      }
      
      if (!grouped[serviceName]) {
        grouped[serviceName] = [];
      }
      grouped[serviceName].push(perm);
    });

    return grouped;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <img src={seasiaLogo} alt="Seasia" className="dashboard-logo" />
          <h1>Dashboard</h1>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </div>

      <div className="dashboard-content">
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="mobile-menu-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        <div className={`tabs ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            className={activeTab === 'permissions' ? 'active' : ''}
            onClick={() => handleTabSelect('permissions')}
          >
            My Permissions
          </button>
          
          <RequirePermission action="read" resource="users">
            <button
              className={activeTab === 'user-management' ? 'active' : ''}
              onClick={() => handleTabSelect('user-management')}
            >
              User Management
            </button>
          </RequirePermission>

          <RequirePermission action="read" resource="roles">
            <button
              className={activeTab === 'roles' ? 'active' : ''}
              onClick={() => handleTabSelect('roles')}
              data-testid="roles-tab"
            >
              Roles
            </button>
          </RequirePermission>

          <RequirePermission action="read" resource="groups">
            <button
              className={activeTab === 'groups' ? 'active' : ''}
              onClick={() => handleTabSelect('groups')}
            >
              Groups
            </button>
          </RequirePermission>

          <RequirePermission action="read" resource="services">
            <button
              className={activeTab === 'services' ? 'active' : ''}
              onClick={() => handleTabSelect('services')}
            >
              Services
            </button>
          </RequirePermission>

          <RequirePermission action="read" resource="documents">
            <button
              className={activeTab === 'api-docs' ? 'active' : ''}
              onClick={() => handleTabSelect('api-docs')}
            >
              API Documentation
            </button>
          </RequirePermission>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="tab-content">
          {activeTab === 'permissions' && (
            <div className="permissions-section">
              <h2>My Permissions</h2>
              <div className="info-grid">
                <div className="info-card">
                  <h3>Roles</h3>
                  <ul>
                    {user?.roles?.map((role: string) => (
                      <li key={role}>{role}</li>
                    ))}
                  </ul>
                </div>
                <div className="info-card">
                  <h3>Groups</h3>
                  <ul>
                    {user?.groups?.map((group: string) => (
                      <li key={group}>{group}</li>
                    ))}
                  </ul>
                </div>
                <div className="info-card">
                  <h3>Effective Permissions</h3>
                  {permissionsLoading ? (
                    <p>Loading permissions...</p>
                  ) : (
                    <div>
                      {(() => {
                        const groupedPermissions = groupPermissionsByService();
                        const serviceNames = Object.keys(groupedPermissions).sort();
                        
                        if (serviceNames.length === 0) {
                          return <p>No permissions assigned</p>;
                        }
                        
                        return serviceNames.map(serviceName => (
                          <div key={serviceName} style={{ marginBottom: '1rem' }}>
                            <h4 style={{ marginTop: '0.5rem', marginBottom: '0.5rem', color: '#667eea' }}>
                              {serviceName} Permissions
                            </h4>
                            <ul style={{ marginTop: 0 }}>
                              {groupedPermissions[serviceName]
                                .sort((a: any, b: any) => {
                                  // Sort by resource first, then by action
                                  const resourceCompare = a.resource.localeCompare(b.resource);
                                  if (resourceCompare !== 0) return resourceCompare;
                                  return a.action.localeCompare(b.action);
                                })
                                .map((perm: any, index: number) => (
                                  <li key={`${serviceName}-${perm.resource}-${perm.action}-${index}`}>
                                    {perm.resource}:{perm.action}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'user-management' && (
            <UserManagement />
          )}

          {activeTab === 'roles' && (
            <RoleManagement />
          )}

          {activeTab === 'groups' && (
            <GroupManagement />
          )}

          {activeTab === 'services' && (
            <ServiceManagement />
          )}

          {activeTab === 'api-docs' && (
            <ApiDocumentation />
          )}
        </div>
      </div>
    </div>
  );
};