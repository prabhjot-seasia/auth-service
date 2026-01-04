import React, { useState } from 'react';
import './ApiDocumentation.css';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  permission?: string;
  requestBody?: any;
  responseExample?: string;
  parameters?: Array<{ 
    name: string; 
    type: string; 
    in: 'query' | 'path' | 'header'; 
    description: string; 
    required: boolean;
    default?: any;
  }>;
}

interface ApiSection {
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
}

export const ApiDocumentation: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [requestParams, setRequestParams] = useState<{ [key: string]: any }>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const getAuthToken = () => {
    return localStorage.getItem('authToken') || '';
  };

  const executeRequest = async (endpoint: ApiEndpoint) => {
    setLoading(true);
    setResponse(null);
    
    try {
      const baseUrl = 'http://localhost:8080';
      let url = baseUrl + endpoint.path;
      
      // Replace path parameters
      const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
      pathParams.forEach(param => {
        const value = requestParams[param.name];
        if (value) {
          url = url.replace(`{${param.name}}`, value);
        }
      });
      
      // Add query parameters
      const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
      const queryString = queryParams
        .map(param => {
          const value = requestParams[param.name];
          if (value !== undefined && value !== '') {
            return `${param.name}=${encodeURIComponent(value)}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('&');
      
      if (queryString) {
        url += '?' + queryString;
      }
      
      // Build headers
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Add header parameters
      const headerParams = endpoint.parameters?.filter(p => p.in === 'header') || [];
      headerParams.forEach(param => {
        const value = requestParams[param.name];
        if (value) {
          headers[param.name] = value;
        }
      });
      
      // Build request options
      const options: RequestInit = {
        method: endpoint.method,
        headers,
      };
      
      // Add body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && requestBody) {
        try {
          options.body = requestBody;
        } catch (e) {
          options.body = requestBody;
        }
      }
      
      const startTime = Date.now();
      const res = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      
      let responseData;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: responseData,
        headers: Object.fromEntries(res.headers.entries()),
        responseTime,
      });
    } catch (error: any) {
      setResponse({
        error: error.message || 'Request failed',
        status: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const apiSections: ApiSection[] = [
    {
      title: "Authentication",
      description: "Endpoints for user authentication and token management",
      endpoints: [
        {
          method: "POST",
          path: "/auth/login",
          description: "Login with username and password",
          requestBody: {
            username: "admin",
            password: "Admin@123"
          },
          responseExample: `{
  "code": "eyJhbGciOiJIUzI1NiIs...",
  "password_status": {
    "force_change": false,
    "is_expired": false,
    "is_expiring_soon": false,
    "days_until_expiry": 90
  }
}`
        },
        {
          method: "POST",
          path: "/auth/token",
          description: "Generate JWT token (client_credentials or refresh_token)",
          requestBody: {
            grant_type: "client_credentials",
            client_id: "your-client-id",
            client_secret: "your-client-secret"
          },
          responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900
}`
        },
        {
          method: "GET",
          path: "/me/permissions",
          description: "Get current user's permissions",
          permission: "authenticated",
          responseExample: `{
  "effective_permissions": [
    {"resource": "users", "action": "read"},
    {"resource": "users", "action": "write"}
  ],
  "groups": ["administrator"],
  "roles": ["administrator"]
}`
        },
        {
          method: "GET",
          path: "/me/check-permission",
          description: "Check if user has specific permission",
          permission: "authenticated",
          parameters: [
            { name: "resource", type: "string", in: "query", description: "Resource name", required: true },
            { name: "action", type: "string", in: "query", description: "Action name", required: true }
          ],
          responseExample: `{
  "has_permission": true
}`
        },
        {
          method: "GET",
          path: "/health",
          description: "Health check endpoint",
          responseExample: `{
  "service": "auth-service",
  "status": "healthy",
  "version": "1.0.0"
}`
        }
      ]
    },
    {
      title: "SSO (Single Sign-On)",
      description: "Public endpoints for external service integration with SSO",
      endpoints: [
        {
          method: "POST",
          path: "/sso/validate",
          description: "Validate a JWT token and get user information",
          requestBody: {
            token: "eyJhbGciOiJIUzI1NiIs...",
            client_id: "your-client-id",
            client_secret: "your-client-secret"
          },
          responseExample: `{
  "valid": true,
  "user_id": "uuid",
  "username": "admin",
  "email": "admin@example.com",
  "roles": ["administrator"],
  "groups": ["administrators"],
  "permissions": [
    {"resource": "users", "action": "read"},
    {"resource": "users", "action": "write"}
  ],
  "expires_at": 1757938941
}`
        },
        {
          method: "GET",
          path: "/sso/validate",
          description: "Validate token from Authorization header",
          parameters: [
            { name: "Authorization", type: "string", in: "header", description: "Bearer token", required: true },
            { name: "X-Client-ID", type: "string", in: "header", description: "Client ID", required: true },
            { name: "X-Client-Secret", type: "string", in: "header", description: "Client secret", required: true }
          ],
          responseExample: `{
  "valid": true,
  "user_id": "uuid",
  "username": "admin",
  "email": "admin@example.com",
  "roles": ["administrator"],
  "permissions": [...]
}`
        },
        {
          method: "POST",
          path: "/sso/check-permission",
          description: "Check if a user has specific permission",
          requestBody: {
            token: "eyJhbGciOiJIUzI1NiIs...",
            resource: "documents",
            action: "read",
            client_id: "your-client-id",
            client_secret: "your-client-secret"
          },
          responseExample: `{
  "allowed": true
}`
        },
        {
          method: "POST",
          path: "/sso/login",
          description: "SSO login for external services",
          requestBody: {
            username: "admin",
            password: "Admin@123",
            service_id: "22222222-2222-2222-2222-222222222222",
            redirect_uri: "http://localhost:3002/auth/callback"
          },
          responseExample: `{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "redirect_uri": "http://localhost:3002/auth/callback"
}`
        },
        {
          method: "POST",
          path: "/sso/logout",
          description: "Logout user from SSO",
          requestBody: {
            token: "eyJhbGciOiJIUzI1NiIs..."
          },
          responseExample: `{
  "success": true
}`
        }
      ]
    },
    {
      title: "User Management",
      description: "CRUD operations for user management",
      endpoints: [
        {
          method: "GET",
          path: "/users",
          description: "List all users with their roles",
          permission: "read on users",
          parameters: [
            { name: "page", type: "number", in: "query", description: "Page number", required: false, default: 1 },
            { name: "limit", type: "number", in: "query", description: "Items per page", required: false, default: 10 }
          ],
          responseExample: `{
  "users": [
    {
      "id": "uuid",
      "username": "user1",
      "email": "user1@example.com",
      "is_active": true,
      "roles": ["user"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}`
        },
        {
          method: "POST",
          path: "/users",
          description: "Create new user",
          permission: "write on users",
          requestBody: {
            username: "newuser",
            email: "newuser@example.com",
            password: "SecurePass@123",
            roles: ["user"]
          },
          responseExample: `{
  "id": "uuid",
  "username": "newuser",
  "email": "newuser@example.com",
  "is_active": true,
  "roles": ["user"],
  "created_at": "2024-01-01T00:00:00Z"
}`
        },
        {
          method: "GET",
          path: "/users/{id}",
          description: "Get specific user details",
          permission: "read on users",
          parameters: [
            { name: "id", type: "string", in: "path", description: "User ID", required: true }
          ],
          responseExample: `{
  "id": "uuid",
  "username": "user1",
  "email": "user1@example.com",
  "is_active": true,
  "roles": ["user"],
  "created_at": "2024-01-01T00:00:00Z"
}`
        },
        {
          method: "PUT",
          path: "/users/{id}",
          description: "Update user information",
          permission: "write on users",
          parameters: [
            { name: "id", type: "string", in: "path", description: "User ID", required: true }
          ],
          requestBody: {
            username: "updateduser",
            email: "updated@example.com",
            is_active: true
          },
          responseExample: `{
  "id": "uuid",
  "username": "updateduser",
  "email": "updated@example.com",
  "is_active": true
}`
        },
        {
          method: "DELETE",
          path: "/users/{id}",
          description: "Delete user",
          permission: "write on users",
          parameters: [
            { name: "id", type: "string", in: "path", description: "User ID", required: true }
          ],
          responseExample: `{
  "message": "User deleted successfully"
}`
        },
        {
          method: "GET",
          path: "/users/{id}/roles",
          description: "Get user's assigned roles",
          permission: "read on users",
          parameters: [
            { name: "id", type: "string", in: "path", description: "User ID", required: true }
          ],
          responseExample: `{
  "roles": [
    {
      "id": "uuid",
      "name": "administrator",
      "description": "System administrator"
    }
  ]
}`
        },
        {
          method: "PUT",
          path: "/users/{id}/roles",
          description: "Assign/update user roles",
          permission: "write on users",
          parameters: [
            { name: "id", type: "string", in: "path", description: "User ID", required: true }
          ],
          requestBody: {
            role_ids: ["role-uuid-1", "role-uuid-2"]
          },
          responseExample: `{
  "message": "Roles updated successfully",
  "roles": ["administrator", "user"]
}`
        },
        {
          method: "GET",
          path: "/users/export/csv",
          description: "Export users to CSV",
          permission: "read on users",
          responseExample: `CSV file download`
        },
        {
          method: "POST",
          path: "/users/import/csv",
          description: "Import users from CSV",
          permission: "write on users",
          requestBody: "multipart/form-data with CSV file",
          responseExample: `{
  "imported": 10,
  "failed": 2,
  "errors": [...]
}`
        }
      ]
    },
    {
      title: "Role Management",
      description: "CRUD operations for role management",
      endpoints: [
        {
          method: "GET",
          path: "/roles",
          description: "List all roles with permissions",
          permission: "read on roles",
          responseExample: `{
  "roles": [
    {
      "id": "uuid",
      "name": "administrator",
      "description": "System administrator",
      "groups": ["admin_group"]
    }
  ]
}`
        },
        {
          method: "POST",
          path: "/roles",
          description: "Create new role",
          permission: "write on roles",
          requestBody: {
            name: "manager",
            description: "Manager role",
            group_ids: ["group-uuid"]
          },
          responseExample: `{
  "id": "uuid",
  "name": "manager",
  "description": "Manager role",
  "groups": ["managers"]
}`
        },
        {
          method: "GET",
          path: "/roles/{id}",
          description: "Get specific role details",
          permission: "read on roles",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Role ID", required: true }
          ],
          responseExample: `{
  "id": "uuid",
  "name": "administrator",
  "description": "System administrator",
  "groups": ["admin_group"]
}`
        },
        {
          method: "PUT",
          path: "/roles/{id}",
          description: "Update role information",
          permission: "write on roles",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Role ID", required: true }
          ],
          requestBody: {
            name: "updated_role",
            description: "Updated description"
          },
          responseExample: `{
  "id": "uuid",
  "name": "updated_role",
  "description": "Updated description"
}`
        },
        {
          method: "DELETE",
          path: "/roles/{id}",
          description: "Delete role",
          permission: "write on roles",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Role ID", required: true }
          ],
          responseExample: `{
  "message": "Role deleted successfully"
}`
        },
        {
          method: "GET",
          path: "/roles/{id}/groups",
          description: "Get role's assigned groups",
          permission: "read on roles",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Role ID", required: true }
          ],
          responseExample: `{
  "groups": [
    {
      "id": "uuid",
      "name": "admin_group",
      "description": "Administrator group"
    }
  ]
}`
        },
        {
          method: "PUT",
          path: "/roles/{id}/groups",
          description: "Assign groups to role",
          permission: "write on roles",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Role ID", required: true }
          ],
          requestBody: {
            group_ids: ["group-uuid-1", "group-uuid-2"]
          },
          responseExample: `{
  "message": "Groups updated successfully"
}`
        },
        {
          method: "GET",
          path: "/roles/{id}/effective-permissions",
          description: "Get computed role permissions",
          permission: "read on roles",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Role ID", required: true }
          ],
          responseExample: `{
  "permissions": [
    {"resource": "users", "action": "read"},
    {"resource": "users", "action": "write"}
  ]
}`
        }
      ]
    },
    {
      title: "Group Management",
      description: "CRUD operations for group management",
      endpoints: [
        {
          method: "GET",
          path: "/groups",
          description: "List all groups",
          permission: "read on groups",
          responseExample: `{
  "groups": [
    {
      "id": "uuid",
      "name": "administrators",
      "description": "System administrators",
      "services": ["auth-service", "document-service"]
    }
  ]
}`
        },
        {
          method: "POST",
          path: "/groups",
          description: "Create group",
          permission: "write on groups",
          requestBody: {
            name: "developers",
            description: "Development team",
            service_ids: ["service-uuid"]
          },
          responseExample: `{
  "id": "uuid",
  "name": "developers",
  "description": "Development team"
}`
        },
        {
          method: "GET",
          path: "/groups/{id}",
          description: "Get group details",
          permission: "read on groups",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Group ID", required: true }
          ],
          responseExample: `{
  "id": "uuid",
  "name": "administrators",
  "description": "System administrators",
  "services": ["auth-service"]
}`
        },
        {
          method: "PUT",
          path: "/groups/{id}",
          description: "Update group",
          permission: "write on groups",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Group ID", required: true }
          ],
          requestBody: {
            name: "updated_group",
            description: "Updated description"
          },
          responseExample: `{
  "id": "uuid",
  "name": "updated_group",
  "description": "Updated description"
}`
        },
        {
          method: "DELETE",
          path: "/groups/{id}",
          description: "Delete group",
          permission: "write on groups",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Group ID", required: true }
          ],
          responseExample: `{
  "message": "Group deleted successfully"
}`
        },
        {
          method: "GET",
          path: "/groups/{id}/services",
          description: "Get group's services",
          permission: "read on groups",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Group ID", required: true }
          ],
          responseExample: `{
  "services": [
    {
      "id": "uuid",
      "name": "auth-service",
      "client_id": "auth-client-id"
    }
  ]
}`
        },
        {
          method: "PUT",
          path: "/groups/{id}/services",
          description: "Assign services to group",
          permission: "write on groups",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Group ID", required: true }
          ],
          requestBody: {
            service_ids: ["service-uuid-1", "service-uuid-2"]
          },
          responseExample: `{
  "message": "Services updated successfully"
}`
        }
      ]
    },
    {
      title: "Service Management",
      description: "CRUD operations for service management",
      endpoints: [
        {
          method: "GET",
          path: "/services",
          description: "List all services",
          permission: "read on services",
          responseExample: `{
  "services": [
    {
      "id": "uuid",
      "name": "document-service",
      "client_id": "doc-client-id",
      "redirect_uri": "http://localhost:3002/callback"
    }
  ]
}`
        },
        {
          method: "POST",
          path: "/services",
          description: "Register service",
          permission: "write on services",
          requestBody: {
            name: "new-service",
            redirect_uri: "http://localhost:3003/callback",
            allowed_origins: ["http://localhost:3003"]
          },
          responseExample: `{
  "id": "uuid",
  "name": "new-service",
  "client_id": "generated-client-id",
  "client_secret": "generated-client-secret"
}`
        },
        {
          method: "GET",
          path: "/services/{id}",
          description: "Get service details",
          permission: "read on services",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Service ID", required: true }
          ],
          responseExample: `{
  "id": "uuid",
  "name": "document-service",
  "client_id": "doc-client-id",
  "redirect_uri": "http://localhost:3002/callback"
}`
        },
        {
          method: "PUT",
          path: "/services/{id}",
          description: "Update service",
          permission: "write on services",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Service ID", required: true }
          ],
          requestBody: {
            name: "updated-service",
            redirect_uri: "http://localhost:3003/new-callback"
          },
          responseExample: `{
  "id": "uuid",
  "name": "updated-service",
  "redirect_uri": "http://localhost:3003/new-callback"
}`
        },
        {
          method: "DELETE",
          path: "/services/{id}",
          description: "Delete service",
          permission: "write on services",
          parameters: [
            { name: "id", type: "string", in: "path", description: "Service ID", required: true }
          ],
          responseExample: `{
  "message": "Service deleted successfully"
}`
        }
      ]
    }
  ];

  const renderEndpointTester = (endpoint: ApiEndpoint, key: string) => {
    const isActive = testingEndpoint === key;
    
    return (
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => {
            if (isActive) {
              setTestingEndpoint(null);
              setRequestParams({});
              setRequestBody('');
              setResponse(null);
            } else {
              setTestingEndpoint(key);
              setRequestParams({});
              setRequestBody(endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2) : '');
              setResponse(null);
            }
          }}
          style={{
            background: isActive ? '#dc3545' : '#667eea',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isActive ? 'Close Tester' : 'Test Endpoint'}
        </button>

        {isActive && (
          <div style={{ 
            marginTop: '20px', 
            padding: '20px', 
            background: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ marginTop: 0, color: '#495057' }}>API Endpoint Tester</h4>
            
            {/* Parameters */}
            {endpoint.parameters && endpoint.parameters.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#666' }}>Parameters:</h5>
                {endpoint.parameters.map(param => (
                  <div key={param.name} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      {param.name} ({param.in})
                      {param.required && <span style={{ color: '#dc3545' }}> *</span>}
                    </label>
                    <input
                      type="text"
                      value={requestParams[param.name] || ''}
                      onChange={(e) => setRequestParams({
                        ...requestParams,
                        [param.name]: e.target.value
                      })}
                      placeholder={param.description}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ced4da',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Request Body */}
            {['POST', 'PUT', 'PATCH'].includes(endpoint.method) && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ color: '#666' }}>Request Body:</h5>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder="Enter JSON request body"
                  style={{
                    width: '100%',
                    height: '150px',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}
                />
              </div>
            )}
            
            {/* Execute Button */}
            <button
              onClick={() => executeRequest(endpoint)}
              disabled={loading}
              style={{
                background: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
            
            {/* Response */}
            {response && (
              <div style={{ marginTop: '20px' }}>
                <h5 style={{ color: '#666' }}>Response:</h5>
                
                {/* Status */}
                <div style={{ marginBottom: '10px' }}>
                  <span style={{
                    background: response.status >= 200 && response.status < 300 ? '#28a745' : 
                               response.status >= 400 ? '#dc3545' : '#ffc107',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginRight: '10px'
                  }}>
                    {response.status} {response.statusText}
                  </span>
                  {response.responseTime && (
                    <span style={{ color: '#6c757d', fontSize: '12px' }}>
                      Response time: {response.responseTime}ms
                    </span>
                  )}
                </div>
                
                {/* Response Headers */}
                {response.headers && (
                  <details style={{ marginBottom: '10px' }}>
                    <summary style={{ cursor: 'pointer', color: '#666', fontSize: '14px' }}>
                      Response Headers
                    </summary>
                    <pre style={{
                      background: 'white',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '12px',
                      marginTop: '5px'
                    }}>
                      {JSON.stringify(response.headers, null, 2)}
                    </pre>
                  </details>
                )}
                
                {/* Response Body */}
                <div>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                    Response Body:
                  </div>
                  <pre style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '13px',
                    maxHeight: '400px',
                    border: '1px solid #dee2e6'
                  }}>
                    {response.error ? 
                      `Error: ${response.error}` :
                      typeof response.data === 'object' ? 
                        JSON.stringify(response.data, null, 2) : 
                        response.data
                    }
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="api-documentation">
      <h1>API Documentation & Testing</h1>
      <p style={{ color: '#6c757d', marginBottom: '30px' }}>
        Interactive API documentation with live testing capabilities. Click "Test Endpoint" to try any API call.
      </p>

      {/* SSO Integration Guide */}
      <div className="api-section" style={{ marginBottom: '25px' }}>
        <div 
          className="section-header" 
          onClick={() => toggleSection('sso-setup-guide')}
          style={{ 
            cursor: 'pointer', 
            padding: '15px', 
            background: '#e8f4f8', 
            borderRadius: '5px', 
            marginBottom: '10px',
            border: '2px solid #007bff'
          }}
        >
          <h2 style={{ margin: 0, color: '#007bff' }}>
            {expandedSections['sso-setup-guide'] ? '▼' : '▶'} 🔐 SSO Integration Setup Guide
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#495057', fontSize: '14px' }}>
            Complete guide to integrate your service with our SSO Authentication & Authorization
          </p>
        </div>

        {expandedSections['sso-setup-guide'] && (
          <div style={{ background: 'white', border: '2px solid #007bff', borderRadius: '8px', padding: '30px' }}>
            
            {/* Prerequisites */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#007bff', marginTop: 0, fontSize: '24px' }}>📋 Prerequisites</h3>
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li><strong>Admin Access:</strong> You need admin credentials to register your service</li>
                  <li><strong>Service Details:</strong> Prepare your service name, callback URL, and allowed origins</li>
                  <li><strong>Development Environment:</strong> Ensure your service can make HTTP requests</li>
                  <li><strong>HTTPS (Production):</strong> SSL/TLS certificate for production deployment</li>
                </ul>
              </div>
            </div>

            {/* Step 1: Service Registration */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#007bff', fontSize: '24px' }}>🚀 Step 1: Register Your Service</h3>
              
              <div style={{ background: '#e8f4f8', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ color: '#007bff', marginTop: 0 }}>Option A: Using the Web Interface (Recommended)</h4>
                <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li>Login to this auth service with admin credentials</li>
                  <li>Navigate to the <strong>"Service Management"</strong> tab</li>
                  <li>Click <strong>"Add Service"</strong> button</li>
                  <li>Fill in the service details:
                    <ul style={{ marginTop: '10px' }}>
                      <li><strong>Service Name:</strong> Your application name (e.g., "Document Management System")</li>
                      <li><strong>Redirect URI:</strong> Your callback URL (e.g., "http://localhost:3002/auth/callback")</li>
                      <li><strong>Allowed Origins:</strong> Your frontend domains (e.g., "http://localhost:3002")</li>
                    </ul>
                  </li>
                  <li>Click <strong>"Create Service"</strong></li>
                  <li><strong>⚠️ IMPORTANT:</strong> Copy and save the <code>Client ID</code> and <code>Client Secret</code> immediately - they're shown only once!</li>
                </ol>
              </div>

              <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ color: '#856404', marginTop: 0 }}>Option B: Using the API</h4>
                <pre style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '5px', 
                  overflow: 'auto',
                  fontSize: '13px',
                  border: '1px solid #dee2e6'
                }}>
{`POST http://localhost:8080/services
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "name": "My Service",
  "redirect_uri": "http://localhost:3002/auth/callback",
  "allowed_origins": ["http://localhost:3002"]
}

Response:
{
  "id": "service-uuid",
  "name": "My Service",
  "client_id": "generated-client-id",
  "client_secret": "generated-client-secret"
}`}
                </pre>
              </div>
            </div>

            {/* Step 2: Environment Setup */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#007bff', fontSize: '24px' }}>⚙️ Step 2: Configure Your Service</h3>
              
              <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ marginTop: 0 }}>Environment Variables</h4>
                <p>Add these environment variables to your service:</p>
                <pre style={{ 
                  background: '#343a40', 
                  color: '#fff',
                  padding: '15px', 
                  borderRadius: '5px', 
                  overflow: 'auto',
                  fontSize: '13px'
                }}>
{`# Auth Service Configuration
AUTH_SERVICE_URL=http://localhost:8080
SSO_CLIENT_ID=your-generated-client-id
SSO_CLIENT_SECRET=your-generated-client-secret
SERVICE_CALLBACK_URL=http://localhost:3002/auth/callback

# Production
# AUTH_SERVICE_URL=https://auth.yourcompany.com
# SERVICE_CALLBACK_URL=https://yourservice.com/auth/callback`}
                </pre>
              </div>
            </div>

            {/* Step 3: Implementation */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#007bff', fontSize: '24px' }}>💻 Step 3: Implement SSO in Your Service</h3>
              
              {/* Node.js/Express Implementation */}
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#28a745' }}>Node.js/Express Implementation</h4>
                <pre style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '5px', 
                  overflow: 'auto',
                  fontSize: '13px',
                  border: '1px solid #dee2e6'
                }}>
{`// 1. Install dependencies
npm install axios express-session

// 2. SSO Middleware
const axios = require('axios');

const ssoAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.session.ssoToken;
  
  if (!token) {
    return res.redirect('/auth/login');
  }

  try {
    const response = await axios.get(\`\${process.env.AUTH_SERVICE_URL}/sso/validate\`, {
      headers: { 
        'Authorization': \`Bearer \${token}\`,
        'X-Client-ID': process.env.SSO_CLIENT_ID,
        'X-Client-Secret': process.env.SSO_CLIENT_SECRET
      }
    });

    if (response.data.valid) {
      req.user = response.data;
      next();
    } else {
      return res.redirect('/auth/login');
    }
  } catch (error) {
    return res.redirect('/auth/login');
  }
};

// 3. Login Route
app.get('/auth/login', (req, res) => {
  const authURL = \`\${process.env.AUTH_SERVICE_URL}/sso/login?\` +
    \`service_id=\${process.env.SSO_CLIENT_ID}&\` +
    \`redirect_uri=\${encodeURIComponent(process.env.SERVICE_CALLBACK_URL)}\`;
  
  res.redirect(authURL);
});

// 4. Callback Route
app.get('/auth/callback', async (req, res) => {
  const { token } = req.query;
  
  if (token) {
    req.session.ssoToken = token;
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login?error=invalid_token');
  }
});

// 5. Protected Routes
app.get('/dashboard', ssoAuth, (req, res) => {
  res.json({ 
    message: \`Welcome \${req.user.username}!\`,
    user: req.user 
  });
});

// 6. Logout Route
app.post('/auth/logout', async (req, res) => {
  const token = req.session.ssoToken;
  
  if (token) {
    await axios.post(\`\${process.env.AUTH_SERVICE_URL}/sso/logout\`, {
      token: token
    });
    req.session.destroy();
  }
  
  res.redirect('/login');
});`}
                </pre>
              </div>

              {/* React Frontend Implementation */}
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#61dafb' }}>React Frontend Implementation</h4>
                <pre style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '5px', 
                  overflow: 'auto',
                  fontSize: '13px',
                  border: '1px solid #dee2e6'
                }}>
{`// 1. SSO Service
class SSOService {
  constructor() {
    this.authServiceURL = process.env.REACT_APP_AUTH_SERVICE_URL;
    this.clientId = process.env.REACT_APP_SSO_CLIENT_ID;
    this.clientSecret = process.env.REACT_APP_SSO_CLIENT_SECRET;
  }

  // Redirect to SSO login
  login() {
    const redirectUri = \`\${window.location.origin}/auth/callback\`;
    const authURL = \`\${this.authServiceURL}/sso/login?\` +
      \`service_id=\${this.clientId}&\` +
      \`redirect_uri=\${encodeURIComponent(redirectUri)}\`;
    
    window.location.href = authURL;
  }

  // Validate token
  async validateToken(token) {
    try {
      const response = await fetch(\`\${this.authServiceURL}/sso/validate\`, {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'X-Client-ID': this.clientId,
          'X-Client-Secret': this.clientSecret
        }
      });
      
      return await response.json();
    } catch (error) {
      return { valid: false };
    }
  }

  // Logout
  async logout() {
    const token = localStorage.getItem('sso_token');
    if (token) {
      await fetch(\`\${this.authServiceURL}/sso/logout\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      localStorage.removeItem('sso_token');
    }
  }
}

// 2. Auth Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const ssoService = new SSOService();

  useEffect(() => {
    // Check for token in URL (callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      localStorage.setItem('sso_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Validate existing token
    const storedToken = localStorage.getItem('sso_token');
    if (storedToken) {
      ssoService.validateToken(storedToken).then(result => {
        if (result.valid) {
          setUser(result);
        } else {
          localStorage.removeItem('sso_token');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = () => ssoService.login();
  const logout = () => {
    ssoService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading, login } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    return (
      <div>
        <h2>Access Required</h2>
        <button onClick={login}>Login with SSO</button>
      </div>
    );
  }

  return children;
};`}
                </pre>
              </div>

              {/* Java Spring Boot Implementation */}
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#f89820' }}>Java Spring Boot Implementation</h4>
                <pre style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '5px', 
                  overflow: 'auto',
                  fontSize: '13px',
                  border: '1px solid #dee2e6'
                }}>
{`// 1. Configuration
@Configuration
public class SSOConfig {
    @Value("\${sso.auth-service-url}")
    private String authServiceUrl;
    
    @Value("\${sso.client-id}")
    private String clientId;
    
    @Value("\${sso.client-secret}")
    private String clientSecret;
    
    // Getters...
}

// 2. SSO Service
@Service
public class SSOService {
    @Autowired
    private SSOConfig ssoConfig;
    
    @Autowired
    private RestTemplate restTemplate;
    
    public TokenValidationResponse validateToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.set("X-Client-ID", ssoConfig.getClientId());
        headers.set("X-Client-Secret", ssoConfig.getClientSecret());
        
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<TokenValidationResponse> response = 
                restTemplate.exchange(
                    ssoConfig.getAuthServiceUrl() + "/sso/validate",
                    HttpMethod.GET,
                    entity,
                    TokenValidationResponse.class
                );
            return response.getBody();
        } catch (Exception e) {
            return TokenValidationResponse.invalid();
        }
    }
}

// 3. Security Filter
@Component
public class SSOAuthenticationFilter extends OncePerRequestFilter {
    @Autowired
    private SSOService ssoService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String token = extractToken(request);
        
        if (token != null) {
            TokenValidationResponse validation = ssoService.validateToken(token);
            
            if (validation.isValid()) {
                // Set authentication context
                SecurityContextHolder.getContext()
                    .setAuthentication(createAuthentication(validation));
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}

// 4. Controller
@RestController
public class AuthController {
    @Value("\${sso.auth-service-url}")
    private String authServiceUrl;
    
    @Value("\${sso.client-id}")
    private String clientId;
    
    @GetMapping("/auth/login")
    public RedirectView login(@RequestParam(required = false) String returnUrl) {
        String redirectUri = "http://localhost:8081/auth/callback";
        String authURL = authServiceUrl + "/sso/login?" +
            "service_id=" + clientId + "&" +
            "redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
        
        return new RedirectView(authURL);
    }
    
    @GetMapping("/auth/callback")
    public RedirectView callback(@RequestParam String token, HttpServletRequest request) {
        // Store token in session or JWT
        HttpSession session = request.getSession();
        session.setAttribute("sso_token", token);
        
        return new RedirectView("/dashboard");
    }
}`}
                </pre>
              </div>
            </div>

            {/* Step 4: User & Group Assignment */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#007bff', fontSize: '24px' }}>👥 Step 4: Assign Users & Groups</h3>
              
              <div style={{ background: '#e8f4f8', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ color: '#007bff', marginTop: 0 }}>Grant Access to Your Service</h4>
                <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li><strong>Create Groups:</strong> Go to "Group Management" → Create groups for your service (e.g., "Document Admins", "Document Users")</li>
                  <li><strong>Assign Service to Groups:</strong> Edit each group → Add your service to the "Assigned Services" list</li>
                  <li><strong>Create Roles:</strong> Go to "Role Management" → Create roles and assign them to your groups</li>
                  <li><strong>Assign Users:</strong> Go to "User Management" → Assign roles to users who need access</li>
                </ol>
              </div>

              <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                <p style={{ margin: 0 }}><strong>💡 Tip:</strong> Users will only see your service in the dropdown if they have access through group assignments.</p>
              </div>
            </div>

            {/* Testing & Troubleshooting */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#007bff', fontSize: '24px' }}>🔧 Testing & Troubleshooting</h3>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#28a745' }}>Testing Your Integration</h4>
                <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li><strong>Test Token Validation:</strong> Use the API tester above to test <code>/sso/validate</code> endpoint</li>
                  <li><strong>Test Login Flow:</strong> Try logging in through your service</li>
                  <li><strong>Test Permissions:</strong> Verify user permissions using <code>/sso/check-permission</code></li>
                  <li><strong>Test Logout:</strong> Ensure logout works and clears sessions</li>
                </ol>
              </div>

              <div style={{ background: '#f8d7da', padding: '20px', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                <h4 style={{ color: '#721c24', marginTop: 0 }}>Common Issues & Solutions</h4>
                <div style={{ lineHeight: '1.8' }}>
                  <p><strong>Issue:</strong> "Service authentication failed"</p>
                  <p><strong>Solution:</strong> Check your Client ID and Client Secret are correct</p>
                  
                  <p><strong>Issue:</strong> "User has no access to this service"</p>
                  <p><strong>Solution:</strong> Ensure the user is assigned to a group that has access to your service</p>
                  
                  <p><strong>Issue:</strong> "Invalid token"</p>
                  <p><strong>Solution:</strong> Token may be expired (15 min lifetime) or malformed</p>
                  
                  <p><strong>Issue:</strong> CORS errors</p>
                  <p><strong>Solution:</strong> Ensure your domain is in the "Allowed Origins" for your service</p>
                </div>
              </div>
            </div>

            {/* Security Best Practices */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#007bff', fontSize: '24px' }}>🛡️ Security Best Practices</h3>
              
              <div style={{ background: '#d4edda', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li><strong>Store Credentials Securely:</strong> Never hardcode Client ID/Secret in frontend code</li>
                  <li><strong>Use HTTPS:</strong> Always use HTTPS in production for secure token transmission</li>
                  <li><strong>Validate on Every Request:</strong> Always validate tokens on protected endpoints</li>
                  <li><strong>Handle Token Expiry:</strong> Implement proper error handling for expired tokens</li>
                  <li><strong>Secure Session Storage:</strong> Use secure, httpOnly cookies for token storage</li>
                  <li><strong>Implement CSRF Protection:</strong> Add CSRF tokens for form submissions</li>
                  <li><strong>Log Security Events:</strong> Log authentication attempts and failures</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* API Sections */}
      {apiSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="api-section" style={{ marginBottom: '25px' }}>
          <div 
            className="section-header" 
            onClick={() => toggleSection(section.title)}
            style={{ 
              cursor: 'pointer', 
              padding: '15px', 
              background: '#f8f9fa', 
              borderRadius: '5px', 
              marginBottom: '10px',
              border: '1px solid #dee2e6'
            }}
          >
            <h2 style={{ margin: 0, color: '#495057' }}>
              {expandedSections[section.title] ? '▼' : '▶'} {section.title}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
              {section.description}
            </p>
          </div>

          {expandedSections[section.title] && (
            <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              {section.endpoints.map((endpoint, endpointIndex) => {
                const endpointKey = `${section.title}-${endpointIndex}`;
                return (
                  <div 
                    key={endpointIndex} 
                    style={{ 
                      padding: '20px', 
                      borderBottom: endpointIndex < section.endpoints.length - 1 ? '1px solid #eee' : 'none'
                    }}
                  >
                    {/* Endpoint Header */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        background: endpoint.method === 'GET' ? '#28a745' : 
                                   endpoint.method === 'POST' ? '#007bff' : 
                                   endpoint.method === 'PUT' ? '#ffc107' :
                                   endpoint.method === 'DELETE' ? '#dc3545' : '#6c757d',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginRight: '10px'
                      }}>
                        {endpoint.method}
                      </span>
                      <code style={{ 
                        background: '#f8f9fa', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        marginRight: '10px'
                      }}>
                        {endpoint.path}
                      </code>
                      {endpoint.permission && (
                        <span style={{ 
                          background: '#6f42c1',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px'
                        }}>
                          Requires: {endpoint.permission}
                        </span>
                      )}
                    </div>
                    
                    <p style={{ margin: '0 0 15px 0', color: '#666' }}>
                      {endpoint.description}
                    </p>

                    {/* Parameters Table */}
                    {endpoint.parameters && endpoint.parameters.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                          Parameters:
                        </h4>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          fontSize: '13px'
                        }}>
                          <thead>
                            <tr style={{ background: '#f8f9fa' }}>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Name</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Type</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>In</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Description</th>
                              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Required</th>
                            </tr>
                          </thead>
                          <tbody>
                            {endpoint.parameters.map((param, paramIndex) => (
                              <tr key={paramIndex}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                                  <code>{param.name}</code>
                                </td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{param.type}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{param.in}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>{param.description}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #dee2e6' }}>
                                  <span style={{ 
                                    background: param.required ? '#dc3545' : '#6c757d',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontSize: '11px'
                                  }}>
                                    {param.required ? 'Yes' : 'No'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Request/Response Examples */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                      {endpoint.requestBody && (
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                            Request Body:
                          </h4>
                          <pre style={{ 
                            background: '#f8f9fa', 
                            padding: '10px', 
                            borderRadius: '5px', 
                            overflow: 'auto',
                            fontSize: '12px',
                            margin: 0,
                            border: '1px solid #dee2e6'
                          }}>
                            <code>
                              {typeof endpoint.requestBody === 'object' ? 
                                JSON.stringify(endpoint.requestBody, null, 2) : 
                                endpoint.requestBody}
                            </code>
                          </pre>
                        </div>
                      )}

                      {endpoint.responseExample && (
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
                            Response Example:
                          </h4>
                          <pre style={{ 
                            background: '#f8f9fa', 
                            padding: '10px', 
                            borderRadius: '5px', 
                            overflow: 'auto',
                            fontSize: '12px',
                            margin: 0,
                            border: '1px solid #dee2e6'
                          }}>
                            <code>{endpoint.responseExample}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Endpoint Tester */}
                    {renderEndpointTester(endpoint, endpointKey)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};