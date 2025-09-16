import React, { useState } from 'react';
import './ApiDocumentation.css';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  permission?: string;
  requestExample?: string;
  responseExample?: string;
  parameters?: Array<{ name: string; type: string; description: string; required: boolean }>;
}

interface ApiSection {
  title: string;
  description: string;
  endpoints: ApiEndpoint[];
}

interface CodeExample {
  language: string;
  code: string;
}

export const ApiDocumentation: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    integration: true // Start with integration section expanded
  });

  const [selectedLanguage, setSelectedLanguage] = useState<string>('curl');

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const integrationExamples: { [key: string]: CodeExample[] } = {
    'token-validation': [
      {
        language: 'curl',
        code: `# ENHANCED SECURITY: Dual Authentication Required

# Method 1: GET with dual authentication headers
curl -X GET http://localhost:8080/sso/validate \\
  -H "Authorization: Bearer your-jwt-token" \\
  -H "X-Client-ID: your-service-client-id" \\
  -H "X-Client-Secret: your-service-client-secret"

# Method 2: POST with service credentials in body
curl -X POST http://localhost:8080/sso/validate \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "your-jwt-token",
    "client_id": "your-service-client-id",
    "client_secret": "your-service-client-secret"
  }'`
      },
      {
        language: 'javascript',
        code: `// ENHANCED SECURITY: Dual Authentication Required

// Method 1: Using fetch API with headers
const validateToken = async (token, clientId, clientSecret) => {
  const response = await fetch('http://localhost:8080/sso/validate', {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${token}\`,
      'X-Client-ID': clientId,
      'X-Client-Secret': clientSecret
    }
  });
  
  const result = await response.json();
  return result.valid;
};

// Method 2: Using axios with POST body
import axios from 'axios';

const validateToken = async (token, clientId, clientSecret) => {
  try {
    const response = await axios.post('http://localhost:8080/sso/validate', {
      token: token,
      client_id: clientId,
      client_secret: clientSecret
    });
    return response.data.valid;
  } catch (error) {
    return false;
  }
};`
      },
      {
        language: 'react',
        code: `// ENHANCED SECURITY: React Component with Dual Authentication

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SSOTokenValidator = ({ token, clientId, clientSecret }) => {
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateToken = async () => {
    setLoading(true);
    try {
      // Method 1: Using headers
      const response = await axios.get('http://localhost:8080/sso/validate', {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'X-Client-ID': clientId,
          'X-Client-Secret': clientSecret
        }
      });

      setValidationResult(response.data);
    } catch (error) {
      setValidationResult({ 
        valid: false, 
        error: error.response?.data?.error || error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && clientId && clientSecret) {
      validateToken();
    }
  }, [token, clientId, clientSecret]);

  if (loading) return <div>Validating token...</div>;
  
  return (
    <div>
      {validationResult?.valid ? (
        <div className="success">
          <h3>Token Valid ✅</h3>
          <p>User: {validationResult.username}</p>
          <p>Service: {validationResult.service_name}</p>
          <p>Roles: {validationResult.roles?.join(', ')}</p>
        </div>
      ) : (
        <div className="error">
          <h3>Token Invalid ❌</h3>
          <p>Error: {validationResult?.error}</p>
        </div>
      )}
    </div>
  );
};

// Usage in your app
const App = () => {
  const [userToken] = useState('your-jwt-token');
  const serviceCredentials = {
    clientId: 'your-service-client-id',
    clientSecret: 'your-service-client-secret'
  };

  return (
    <SSOTokenValidator 
      token={userToken}
      clientId={serviceCredentials.clientId}
      clientSecret={serviceCredentials.clientSecret}
    />
  );
};`
      },
      {
        language: 'java',
        code: `// ENHANCED SECURITY: Spring Boot with RestTemplate
@Service
public class SSOService {
    
    private final RestTemplate restTemplate;
    private final String authServiceUrl = "http://localhost:8080";
    private final String clientId = "your-service-client-id";
    private final String clientSecret = "your-service-client-secret";
    
    // Method 1: Using headers
    public TokenValidationResponse validateToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.set("X-Client-ID", clientId);
        headers.set("X-Client-Secret", clientSecret);
        
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<TokenValidationResponse> response = 
                restTemplate.exchange(
                    authServiceUrl + "/sso/validate", 
                    HttpMethod.GET, 
                    entity, 
                    TokenValidationResponse.class
                );
            
            return response.getBody();
        } catch (Exception e) {
            return TokenValidationResponse.invalid(e.getMessage());
        }
    }
    
    // Method 2: Using POST body
    public TokenValidationResponse validateTokenPost(String token) {
        Map<String, String> requestBody = Map.of(
            "token", token,
            "client_id", clientId,
            "client_secret", clientSecret
        );
        
        try {
            ResponseEntity<TokenValidationResponse> response = 
                restTemplate.postForEntity(
                    authServiceUrl + "/sso/validate", 
                    requestBody, 
                    TokenValidationResponse.class
                );
            
            return response.getBody();
        } catch (Exception e) {
            return TokenValidationResponse.invalid(e.getMessage());
        }
    }
}`
      },
      {
        language: 'go',
        code: `// Using the provided Go SSO client
package main

import (
    "github.com/seasia/auth-service/pkg/sso"
)

func main() {
    // Create SSO client
    client := sso.NewClient("http://localhost:8080")
    
    // Validate token
    userInfo, err := client.ValidateToken(token)
    if err != nil {
        log.Printf("Token validation failed: %v", err)
        return
    }
    
    if userInfo.Valid {
        log.Printf("User: %s, Roles: %v", userInfo.Username, userInfo.Roles)
    }
}`
      },
      {
        language: 'python',
        code: `import requests

def validate_token(token, auth_service_url="http://localhost:8080"):
    """Validate SSO token"""
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(
            f'{auth_service_url}/sso/validate',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('valid', False)
        return False
    except requests.RequestException:
        return False

# Usage
if validate_token(user_token):
    print("Token is valid")
else:
    print("Token is invalid")`
      }
    ],
    'middleware-integration': [
      {
        language: 'curl',
        code: `# Testing Protected Endpoints with Dual Authentication

# Step 1: Get user token
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type": "password", "username": "admin", "password": "Admin@123"}' \\
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Step 2: Call protected API endpoint with dual authentication
curl -X GET http://localhost:8081/api/protected-resource \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "X-Client-ID: your-service-client-id" \\
  -H "X-Client-Secret: your-service-client-secret"

# Step 3: Call endpoint requiring specific permissions
curl -X POST http://localhost:8081/api/admin/action \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "X-Client-ID: your-service-client-id" \\
  -H "X-Client-Secret: your-service-client-secret" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "delete_user", "user_id": "123"}'

# Expected Response for Valid Request:
# {
#   "success": true,
#   "message": "Action completed",
#   "user": {
#     "id": "user-id",
#     "username": "admin",
#     "service": "your-service-name"
#   }
# }

# Expected Response for Invalid Service Credentials:
# {
#   "error": "service authentication failed",
#   "status": 401
# }`
      },
      {
        language: 'go',
        code: `// Gin Middleware Integration
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/seasia/auth-service/pkg/sso"
)

func main() {
    // Create SSO middleware
    ssoMiddleware := sso.NewGinMiddleware("http://localhost:8080")
    
    r := gin.Default()
    
    // Protected endpoint requiring authentication
    r.GET("/protected", ssoMiddleware.Authenticate(), protectedHandler)
    
    // Protected endpoint requiring specific permission
    r.GET("/admin", 
        ssoMiddleware.RequirePermission("admin", "read"), 
        adminHandler)
    
    r.Run(":8081")
}

func protectedHandler(c *gin.Context) {
    userInfo, ok := sso.GetUserInfoFromGin(c)
    if !ok {
        c.JSON(500, gin.H{"error": "No user info"})
        return
    }
    
    c.JSON(200, gin.H{
        "message": "Hello " + userInfo.Username,
        "roles":   userInfo.Roles,
    })
}`
      },
      {
        language: 'java',
        code: `// Spring Boot Filter Integration
@Component
public class SSOAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private SSOClient ssoClient;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            // Validate token with SSO service
            TokenValidationResponse validation = ssoClient.validateToken(token);
            
            if (validation.isValid()) {
                // Create Spring Security authentication
                List<SimpleGrantedAuthority> authorities = 
                    validation.getRoles().stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .collect(Collectors.toList());
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        validation.getUsername(),
                        null,
                        authorities
                    );
                
                SecurityContextHolder.getContext()
                    .setAuthentication(authentication);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}`
      },
      {
        language: 'javascript',
        code: `// Express.js Middleware
const axios = require('axios');

const ssoAuth = (authServiceUrl = 'http://localhost:8080') => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const response = await axios.get(\`\${authServiceUrl}/sso/validate\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      
      if (response.data.valid) {
        // Add user info to request
        req.user = {
          id: response.data.user_id,
          username: response.data.username,
          email: response.data.email,
          roles: response.data.roles,
          permissions: response.data.permissions
        };
        next();
      } else {
        res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Token validation failed' });
    }
  };
};

// Usage
const express = require('express');
const app = express();

// Protected routes
app.get('/protected', ssoAuth(), (req, res) => {
  res.json({
    message: \`Hello \${req.user.username}!\`,
    roles: req.user.roles
  });
});`
      },
      {
        language: 'python',
        code: `# Django Middleware
import requests
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class SSOAuthMiddleware(MiddlewareMixin):
    def __init__(self, get_response):
        self.get_response = get_response
        self.auth_service_url = "http://localhost:8080"
    
    def process_request(self, request):
        # Skip auth for certain paths
        if request.path in ['/health', '/login']:
            return None
        
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization required'}, status=401)
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        try:
            response = requests.get(
                f'{self.auth_service_url}/sso/validate',
                headers={'Authorization': f'Bearer {token}'}
            )
            
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get('valid'):
                    # Add user info to request
                    request.sso_user = user_data
                    return None
            
            return JsonResponse({'error': 'Invalid token'}, status=401)
            
        except requests.RequestException:
            return JsonResponse({'error': 'Auth service unavailable'}, status=503)

# Usage in views
from django.http import JsonResponse

def protected_view(request):
    user_info = getattr(request, 'sso_user', None)
    if user_info:
        return JsonResponse({
            'message': f'Hello {user_info["username"]}!',
            'roles': user_info['roles']
        })
    return JsonResponse({'error': 'Unauthorized'}, status=401)`
      },
      {
        language: 'react',
        code: `// React Middleware/HOC for SSO Protection

import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Higher-Order Component for SSO protection
const withSSOProtection = (WrappedComponent, requiredPermissions = []) => {
  return (props) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const validateUser = async () => {
        const token = localStorage.getItem('authToken');
        const clientId = process.env.REACT_APP_CLIENT_ID;
        const clientSecret = process.env.REACT_APP_CLIENT_SECRET;

        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        try {
          const response = await axios.get('http://localhost:8080/sso/validate', {
            headers: {
              'Authorization': \`Bearer \${token}\`,
              'X-Client-ID': clientId,
              'X-Client-Secret': clientSecret
            }
          });

          if (response.data.valid) {
            // Check permissions if required
            const userPermissions = response.data.permissions || [];
            const hasRequiredPermissions = requiredPermissions.every(perm => 
              userPermissions.some(userPerm => 
                userPerm.action === perm.action && userPerm.resource === perm.resource
              )
            );

            if (requiredPermissions.length === 0 || hasRequiredPermissions) {
              setUser(response.data);
            } else {
              setError('Insufficient permissions');
            }
          } else {
            setError('Invalid token');
          }
        } catch (err) {
          setError('Authentication failed');
        } finally {
          setLoading(false);
        }
      };

      validateUser();
    }, []);

    if (loading) {
      return <div className="loading">Authenticating...</div>;
    }

    if (error || !user) {
      return (
        <div className="auth-error">
          <h3>Access Denied</h3>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/login'}>
            Login
          </button>
        </div>
      );
    }

    return <WrappedComponent {...props} user={user} />;
  };
};

// Usage example
const ProtectedComponent = ({ user }) => (
  <div>
    <h2>Welcome, {user.username}!</h2>
    <p>Service: {user.service_name}</p>
    <p>Roles: {user.roles?.join(', ')}</p>
  </div>
);

// Apply protection with permission requirements
const AdminProtectedComponent = withSSOProtection(ProtectedComponent, [
  { action: 'write', resource: 'admin' }
]);

// Apply basic protection (just authentication)
const BasicProtectedComponent = withSSOProtection(ProtectedComponent);

export default AdminProtectedComponent;`
      }
    ],
    'frontend-integration': [
      {
        language: 'curl',
        code: `# Frontend Authentication Flow with Enhanced Security

# Step 1: Login for frontend application
curl -X POST http://localhost:8080/sso/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "admin",
    "password": "Admin@123",
    "service_id": "your-frontend-service-id",
    "redirect_uri": "http://localhost:3000/dashboard"
  }'

# Expected Response:
# {
#   "success": true,
#   "access_token": "eyJhbGciOiJIUzI1NiIs...",
#   "redirect_uri": "http://localhost:3000/dashboard"
# }

# Step 2: Validate token on page load/refresh
TOKEN="eyJhbGciOiJIUzI1NiIs..."  # Token from login response

curl -X GET http://localhost:8080/sso/validate \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "X-Client-ID: your-frontend-client-id" \\
  -H "X-Client-Secret: your-frontend-client-secret"

# Expected Response:
# {
#   "valid": true,
#   "user_id": "user-id",
#   "username": "admin",
#   "email": "admin@example.com",
#   "roles": ["super_admin"],
#   "groups": ["administrators"],
#   "permissions": [
#     {"resource": "users", "action": "read"},
#     {"resource": "users", "action": "write"}
#   ],
#   "service_id": "frontend-service-id",
#   "service_name": "Frontend App",
#   "expires_at": 1757938941
# }

# Step 3: Check specific permissions before showing UI elements
curl -X POST http://localhost:8080/sso/check-permission \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "'$TOKEN'",
    "resource": "admin",
    "action": "write",
    "client_id": "your-frontend-client-id",
    "client_secret": "your-frontend-client-secret"
  }'

# Expected Response:
# {
#   "allowed": true
# }

# Step 4: Logout
curl -X POST http://localhost:8080/sso/logout \\
  -H "Content-Type: application/json" \\
  -d '{"token": "'$TOKEN'"}'

# Expected Response:
# {
#   "success": true
# }`
      },
      {
        language: 'javascript',
        code: `// React SSO Integration
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// SSO Service
class SSOService {
  constructor() {
    this.baseURL = 'http://localhost:8080';
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Add token and service credentials to all requests
    axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('sso_token');
      if (token) {
        config.headers.Authorization = \`Bearer \${token}\`;
        // Add service credentials for enhanced security
        config.headers['X-Client-ID'] = process.env.REACT_APP_CLIENT_ID;
        config.headers['X-Client-Secret'] = process.env.REACT_APP_CLIENT_SECRET;
      }
      return config;
    });

    // Handle auth errors
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(username, password) {
    const response = await axios.post(\`\${this.baseURL}/sso/login\`, {
      username,
      password,
      service_id: process.env.REACT_APP_SERVICE_ID
    });

    if (response.data.success) {
      localStorage.setItem('sso_token', response.data.access_token);
      return response.data;
    }
    throw new Error('Login failed');
  }

  async validateToken() {
    const token = localStorage.getItem('sso_token');
    if (!token) return { valid: false };

    // ENHANCED SECURITY: Dual Authentication Required
    const response = await axios.get(\`\${this.baseURL}/sso/validate\`, {
      headers: { 
        Authorization: \`Bearer \${token}\`,
        'X-Client-ID': process.env.REACT_APP_CLIENT_ID,
        'X-Client-Secret': process.env.REACT_APP_CLIENT_SECRET
      }
    });
    
    return response.data;
  }

  logout() {
    localStorage.removeItem('sso_token');
  }
}

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const ssoService = new SSOService();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const validation = await ssoService.validateToken();
      if (validation.valid) {
        setUser(validation);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const result = await ssoService.login(username, password);
    if (result.success) {
      const userInfo = await ssoService.validateToken();
      setUser(userInfo);
    }
    return result;
  };

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

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};`
      },
      {
        language: 'typescript',
        code: `// Vue.js 3 Composition API Integration
import { ref, reactive } from 'vue'
import axios from 'axios'

interface UserInfo {
  valid: boolean
  user_id: string
  username: string
  email: string
  roles: string[]
  permissions: Array<{resource: string, action: string}>
}

// Composable for SSO authentication
export function useSSO() {
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)
  const authServiceUrl = 'http://localhost:8080'

  // Setup axios interceptors
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('sso_token')
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`
    }
    return config
  })

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        logout()
        // Redirect to login
      }
      return Promise.reject(error)
    }
  )

  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      const response = await axios.post(\`\${authServiceUrl}/sso/login\`, {
        username,
        password,
        service_id: process.env.VUE_APP_SERVICE_ID
      })

      if (response.data.success) {
        localStorage.setItem('sso_token', response.data.access_token)
        await validateToken()
        return { success: true }
      }
      throw new Error('Login failed')
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  const validateToken = async () => {
    const token = localStorage.getItem('sso_token')
    if (!token) return false

    try {
      const response = await axios.get(\`\${authServiceUrl}/sso/validate\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      })

      if (response.data.valid) {
        user.value = response.data
        return true
      }
    } catch (error) {
      console.error('Token validation failed:', error)
    }

    user.value = null
    return false
  }

  const logout = () => {
    localStorage.removeItem('sso_token')
    user.value = null
  }

  const hasPermission = (resource: string, action: string): boolean => {
    return user.value?.permissions?.some(
      p => p.resource === resource && p.action === action
    ) || false
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    login,
    logout,
    validateToken,
    hasPermission,
    isAuthenticated: computed(() => !!user.value)
  }
}`
      }
    ]
  };

  const apiSections: ApiSection[] = [
    {
      title: "SSO (Single Sign-On) Endpoints",
      description: "Public endpoints for external service integration with SSO",
      endpoints: [
        {
          method: "POST",
          path: "/sso/validate",
          description: "Validate a JWT token and get user information",
          requestExample: `{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}`,
          responseExample: `{
  "valid": true,
  "user_id": "uuid",
  "username": "service_admin",
  "email": "serviceadmin@example.com",
  "roles": ["service_administrator"],
  "groups": ["service_administrator"],
  "permissions": [
    {"resource": "services", "action": "read"},
    {"resource": "services", "action": "write"}
  ],
  "expires_at": 1757938941
}`
        },
        {
          method: "GET",
          path: "/sso/validate",
          description: "Validate token from Authorization header",
          parameters: [
            { name: "Authorization", type: "header", description: "Bearer token in format: Bearer <token>", required: true }
          ],
          responseExample: `{
  "valid": true,
  "user_id": "uuid",
  "username": "doc_admin",
  "email": "docadmin@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrators"],
  "permissions": [
    {"resource": "documents", "action": "read"},
    {"resource": "documents", "action": "write"}
  ],
  "expires_at": 1757938941
}`
        },
        {
          method: "POST",
          path: "/sso/check-permission",
          description: "Check if a user has specific permission",
          requestExample: `{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "resource": "documents",
  "action": "read"
}`,
          responseExample: `{
  "allowed": true
}`
        },
        {
          method: "POST",
          path: "/sso/login",
          description: "SSO login for external services",
          requestExample: `{
  "username": "doc_admin",
  "password": "Admin@123",
  "service_id": "22222222-2222-2222-2222-222222222222",
  "redirect_uri": "http://localhost:3002/auth/callback"
}`,
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
          requestExample: `{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}`,
          responseExample: `{
  "success": true
}`
        }
      ]
    },
    {
      title: "Authentication Endpoints",
      description: "Endpoints for JWT token generation and user authentication",
      endpoints: [
        {
          method: "POST",
          path: "/auth/token",
          description: "JWT token generation (password/refresh_token/client_credentials)",
          requestExample: `{
  "grant_type": "password",
  "username": "admin",
  "password": "Admin@123"
}`,
          responseExample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900
}`,
          parameters: [
            { name: "grant_type", type: "string", description: "Grant type (password, refresh_token, client_credentials)", required: true },
            { name: "username", type: "string", description: "Username (required for password grant)", required: false },
            { name: "password", type: "string", description: "Password (required for password grant)", required: false }
          ]
        },
        {
          method: "GET",
          path: "/me/permissions",
          description: "Get current user's effective permissions",
          responseExample: `{
  "effective_permissions": [
    {
      "resource": "users",
      "action": "read"
    }
  ],
  "groups": ["administrator"],
  "roles": ["administrator"]
}`
        },
        {
          method: "GET",
          path: "/me/check-permission",
          description: "Check if user has specific permission",
          parameters: [
            { name: "resource", type: "string", description: "Resource name", required: true },
            { name: "action", type: "string", description: "Action name", required: true }
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
    }
  ];

  const languages = [
    { value: 'curl', label: 'cURL' },
    { value: 'javascript', label: 'JavaScript/Node.js' },
    { value: 'react', label: 'React' },
    { value: 'typescript', label: 'TypeScript/Vue.js' },
    { value: 'java', label: 'Java/Spring Boot' },
    { value: 'go', label: 'Go' },
    { value: 'python', label: 'Python/Django' }
  ];

  const renderCodeExample = (exampleKey: string) => {
    const examples = integrationExamples[exampleKey];
    if (!examples) return null;

    const selectedExample = examples.find(ex => ex.language === selectedLanguage) || examples[0];

    return (
      <div className="code-example">
        <div className="language-selector" style={{ marginBottom: '10px' }}>
          <select 
            value={selectedLanguage} 
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{ 
              padding: '5px 10px', 
              borderRadius: '4px', 
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <pre style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '5px', 
          overflow: 'auto',
          fontSize: '13px',
          lineHeight: '1.4'
        }}>
          <code>{selectedExample.code}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="api-documentation">
      <h1>API Documentation & Integration Guide</h1>
      
      {/* SSO Integration Guide */}
      <div className="api-section">
        <div 
          className="section-header" 
          onClick={() => toggleSection('integration')}
          style={{ cursor: 'pointer', padding: '15px', background: '#f8f9fa', borderRadius: '5px', marginBottom: '10px' }}
        >
          <h2 style={{ margin: 0, color: '#495057' }}>
            🔐 SSO Integration Guide {expandedSections['integration'] ? '▼' : '▶'}
          </h2>
        </div>
        
        {expandedSections['integration'] && (
          <div style={{ marginBottom: '30px' }}>
            <div style={{ padding: '20px', background: 'white', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              
              {/* Quick Start */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#667eea', marginTop: 0 }}>🚀 Quick Start</h3>
                <p>Integrate your application with our SSO service in minutes:</p>
                <ol style={{ paddingLeft: '20px' }}>
                  <li><strong>Register your service</strong> in the Services tab</li>
                  <li><strong>Save the Client ID and Secret</strong> (shown only once)</li>
                  <li><strong>Assign service to user groups</strong> for access control</li>
                  <li><strong>Implement token validation</strong> using examples below</li>
                </ol>
              </div>

              {/* Service Details */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#667eea' }}>📋 Service Information</h3>
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                  <p><strong>SSO Base URL:</strong> <code>http://localhost:8080/sso</code></p>
                  <p><strong>Document Service ID:</strong> <code>22222222-2222-2222-2222-222222222222</code></p>
                  <p><strong>Test User:</strong> <code>doc_admin</code> / <code>Admin@123</code></p>
                </div>
              </div>

              {/* Token Validation */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#667eea' }}>✅ Token Validation</h3>
                <p>Validate user tokens to authenticate requests:</p>
                {renderCodeExample('token-validation')}
              </div>

              {/* Middleware Integration */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#667eea' }}>🔧 Backend Middleware Integration</h3>
                <p>Protect your API endpoints with authentication middleware:</p>
                {renderCodeExample('middleware-integration')}
              </div>

              {/* Frontend Integration */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#667eea' }}>🌐 Frontend Integration</h3>
                <p>Implement SSO authentication in your frontend applications:</p>
                {renderCodeExample('frontend-integration')}
              </div>

              {/* Security Best Practices */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#667eea' }}>🛡️ Security Best Practices</h3>
                <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li><strong>HTTPS Only:</strong> Always use HTTPS in production</li>
                    <li><strong>Token Storage:</strong> Store tokens securely (httpOnly cookies recommended)</li>
                    <li><strong>Token Validation:</strong> Validate tokens on every request</li>
                    <li><strong>Permission Checks:</strong> Implement fine-grained permission checks</li>
                    <li><strong>Token Expiry:</strong> Tokens expire after 15 minutes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Endpoints */}
      {apiSections.map((section, index) => (
        <div key={index} className="api-section" style={{ marginBottom: '25px' }}>
          <div 
            className="section-header" 
            onClick={() => toggleSection(section.title)}
            style={{ cursor: 'pointer', padding: '15px', background: '#f8f9fa', borderRadius: '5px', marginBottom: '10px' }}
          >
            <h2 style={{ margin: 0, color: '#495057' }}>
              {section.title} {expandedSections[section.title] ? '▼' : '▶'}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
              {section.description}
            </p>
          </div>

          {expandedSections[section.title] && (
            <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              {section.endpoints.map((endpoint, endpointIndex) => (
                <div 
                  key={endpointIndex} 
                  style={{ 
                    padding: '20px', 
                    borderBottom: endpointIndex < section.endpoints.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ 
                      background: endpoint.method === 'GET' ? '#28a745' : endpoint.method === 'POST' ? '#007bff' : '#ffc107',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginRight: '10px'
                    }}>
                      {endpoint.method}
                    </span>
                    <code style={{ background: '#f8f9fa', padding: '4px 8px', borderRadius: '4px' }}>
                      {endpoint.path}
                    </code>
                    {endpoint.permission && (
                      <span style={{ 
                        background: '#6f42c1',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        marginLeft: '10px'
                      }}>
                        Requires: {endpoint.permission}
                      </span>
                    )}
                  </div>
                  
                  <p style={{ margin: '0 0 15px 0', color: '#666' }}>
                    {endpoint.description}
                  </p>

                  {endpoint.parameters && (
                    <div style={{ marginBottom: '15px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>Parameters:</h4>
                      <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                        {endpoint.parameters.map((param, paramIndex) => (
                          <div key={paramIndex} style={{ marginBottom: '8px' }}>
                            <code style={{ marginRight: '8px' }}>{param.name}</code>
                            <span style={{ 
                              background: param.required ? '#dc3545' : '#6c757d',
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              marginRight: '8px'
                            }}>
                              {param.required ? 'Required' : 'Optional'}
                            </span>
                            <span style={{ color: '#666', fontSize: '13px' }}>
                              {param.type} - {param.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '20px' }}>
                    {endpoint.requestExample && (
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>Request:</h4>
                        <pre style={{ 
                          background: '#f8f9fa', 
                          padding: '10px', 
                          borderRadius: '5px', 
                          overflow: 'auto',
                          fontSize: '12px',
                          margin: 0
                        }}>
                          <code>{endpoint.requestExample}</code>
                        </pre>
                      </div>
                    )}

                    {endpoint.responseExample && (
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>Response:</h4>
                        <pre style={{ 
                          background: '#f8f9fa', 
                          padding: '10px', 
                          borderRadius: '5px', 
                          overflow: 'auto',
                          fontSize: '12px',
                          margin: 0
                        }}>
                          <code>{endpoint.responseExample}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};