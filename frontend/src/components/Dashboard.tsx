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
import { API_URL } from '../config';

interface Service {
  id: string;
  name: string;
  client_id: string;
  scopes: string;
  is_active: boolean;
  redirect_uri?: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { permissions: effectivePermissions, loading: permissionsLoading } = usePermissions();
  const [activeTab, setActiveTab] = useState('permissions');
  const [error, setError] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  useEffect(() => {
    fetchUserServices();
  }, []);

  const fetchUserServices = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        console.error('No JWT token found');
        return;
      }
      const response = await axios.get(`${API_URL}/me/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setServices(response.data.services || response.data);
    } catch (err: any) {
      console.error('Failed to fetch services:', err);
    }
  };

  const handleTabSelect = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false); // Close mobile menu when tab is selected
  };

  const getUserAllowedServices = () => {
    if (!services || services.length === 0) return [];
    return services.filter(service => {
      if (!service.is_active) return false;
      // Show service only if user has at least one permission matching service scopes
      if (!effectivePermissions || effectivePermissions.length === 0) return false;
      const scopes = (service.scopes || '').split(' ').filter(Boolean);
      return scopes.some(scope => {
        const parts = scope.split(':');
        if (parts.length !== 2) return false;
        const [resource, action] = parts;
        return effectivePermissions.some(
          (p: any) => p.resource === resource && p.action === action
        );
      });
    });
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
        <div className="user-dropdown-container">
          <button 
            className="user-dropdown-toggle" 
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            aria-expanded={isUserDropdownOpen}
          >
            <span className="user-avatar">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="user-name">{user?.username || 'User'}</span>
            <svg 
              className={`dropdown-arrow ${isUserDropdownOpen ? 'open' : ''}`} 
              width="12" 
              height="12" 
              viewBox="0 0 12 12"
            >
              <path d="M2.5 4.5L6 8 9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
          
          {isUserDropdownOpen && (
            <>
              <div className="dropdown-overlay" onClick={() => setIsUserDropdownOpen(false)} />
              <div className="user-dropdown-menu">
                <div className="dropdown-user-info">
                  <div className="dropdown-user-header">
                    <div className="dropdown-user-avatar">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="dropdown-user-details">
                      <div className="dropdown-username">{user?.username}</div>
                      <div className="dropdown-email">{user?.email || 'No email'}</div>
                    </div>
                  </div>
                  
                  {user?.roles && user.roles.length > 0 && (
                    <div className="dropdown-roles">
                      <span className="dropdown-label">Roles:</span>
                      <div className="dropdown-role-badges">
                        {user.roles.map((role: string) => (
                          <span key={role} className="role-badge">{role}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {!permissionsLoading && getUserAllowedServices().length > 0 && (
                  <>
                    <div className="dropdown-divider" />
                    <div className="dropdown-services">
                      <div className="dropdown-section-title">Services</div>
                      {getUserAllowedServices().map(service => {
                        const isCurrentApp = service.client_id === 'auth-service-client';

                        // Current app: show as disabled with "current" badge
                        if (isCurrentApp) {
                          return (
                            <div
                              key={service.id}
                              className="dropdown-service-link disabled current"
                            >
                              <span className="service-icon">⚡</span>
                              <span className="service-name">{service.name}</span>
                              <span className="service-current-badge">current</span>
                            </div>
                          );
                        }

                        // Other services with redirect_uri: make clickable with SSO
                        if (service.redirect_uri) {
                          const ssoUrl = new URL(`${API_URL}/sso/login`);
                          ssoUrl.searchParams.append('client_id', service.client_id);
                          ssoUrl.searchParams.append('redirect_uri', service.redirect_uri);
                          ssoUrl.searchParams.append('response_type', 'code');
                          ssoUrl.searchParams.append('scope', service.scopes || 'openid');

                          const token = localStorage.getItem('jwt');
                          if (token) {
                            ssoUrl.searchParams.append('token', token);
                          }

                          return (
                            <a
                              key={service.id}
                              href={ssoUrl.toString()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="dropdown-service-link"
                              onClick={() => setIsUserDropdownOpen(false)}
                            >
                              <span className="service-icon">⚡</span>
                              <span className="service-name">{service.name}</span>
                              <span className="service-external-icon">↗</span>
                            </a>
                          );
                        }
                        // No redirect_uri: show as disabled
                        return (
                          <div
                            key={service.id}
                            className="dropdown-service-link disabled"
                            title="No URL configured for this service"
                          >
                            <span className="service-icon">⚡</span>
                            <span className="service-name">{service.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                
                <div className="dropdown-divider" />
                <button className="dropdown-logout" onClick={() => { logout(); setIsUserDropdownOpen(false); }}>
                  <span className="logout-icon">⚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
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
              Users
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