# Authentication & Authorization Service

A comprehensive RESTful authentication and authorization service with modern frontend integrations, built with Go backend, React/Angular frontends, and comprehensive BDD testing.

## 🚀 Features

- **RESTful API** with full OAuth2/JWT authentication
- **Role-Based Access Control (RBAC)** with fine-grained permissions
- **React Frontend** with modern hooks and routing
- **Comprehensive BDD Tests** with Gherkin scenarios
- **Cross-Browser Support** (Chrome, Firefox, Safari, Edge)
- **Responsive Design** for tablets and mobile devices
- **Docker Containerization** for easy deployment
- **PostgreSQL Database** with automatic migrations
- **Production-Ready** with Nginx reverse proxy

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │   Nginx Proxy   │
│     :3001       │    │      :80        │
└─────────────────┘    └─────────────────┘
           │                       │
           └───────────────────────┘
                       │
              ┌─────────────────┐
              │   Go Backend    │
              │     :8080       │
              └─────────────────┘
                       │
              ┌─────────────────┐
              │   PostgreSQL    │
              │     :5433       │
              └─────────────────┘
```

## 📋 API Endpoints

### Authentication
- `POST /auth/token` - Obtain JWT (password/refresh_token/client_credentials)
- `GET /me/permissions` - Get user permissions

### User Management
- `POST /users` - Create user
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `GET /users/{id}/roles` - Get user roles
- `PUT /users/{id}/roles` - Assign roles to user

### Role Management
- `POST /roles` - Create role
- `GET /roles/{id}` - Get role details
- `PUT /roles/{id}` - Update role
- `DELETE /roles/{id}` - Delete role

### Group Management
- `POST /groups` - Create group
- `GET /groups/{id}` - Get group details
- `PUT /groups/{id}` - Update group
- `DELETE /groups/{id}` - Delete group

### Service Management
- `POST /services` - Register service
- `GET /services/{id}` - Get service details
- `DELETE /services/{id}` - Deregister service

## 🛠 Quick Start

### Using Docker (Recommended)

1. **Clone and navigate to the project**
   ```bash
   cd seasia/auth-service
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the applications**
   - React Frontend: http://localhost:3001
   - API Backend: http://localhost:8080
   - Nginx Gateway: http://localhost

### Manual Setup

#### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your configurations
go mod download
go run cmd/server/main.go
```

#### React Frontend Setup
```bash
cd frontend/react-app
npm install
npm start
```


#### PostgreSQL Setup
```bash
# Using Docker
docker run --name auth-postgres -e POSTGRES_DB=auth_service -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15-alpine
```

## 🔐 Default Credentials

The system comes pre-seeded with test users:

- **Admin**: `admin` / `admin123`

## 🧪 Testing

### BDD Tests
```bash
cd tests/bdd
npm install

# Run all tests
npm run test

# Run specific test suites
npm run test:auth          # Authentication tests
npm run test:responsive    # Responsive design tests
npm run test:browser       # Cross-browser compatibility
```

### Supported Browsers
- Chrome
- Firefox
- Safari
- Edge

### Responsive Testing
- iPad Pro (1024x1366)
- iPad Mini (768x1024)
- Android Tablets (800x1280)
- Mobile devices (375px width)

## 🔗 Service Integration Guide

This authentication service provides OAuth2-compliant authentication and RBAC authorization for distributed services. Services authenticate using client credentials or user tokens.

### JWT Token Structure
```json
{
  "user_id": "uuid",
  "username": "admin",
  "email": "admin@example.com", 
  "roles": ["administrator"],
  "groups": ["administrators"],
  "iss": "auth-service",
  "exp": 1757687794,
  "iat": 1757686894
}
```

### Permission Model
- **RBAC Chain**: Users → Roles → Groups → Services → Scopes
- **Permission Format**: `resource:action` (e.g., `users:read`, `orders:write`)
- **Service Scopes**: Each service defines its own permission scopes
- **Cross-Service**: Services can request permissions for other services

---

## 📡 cURL API Examples

### Service Registration
```bash
# Register a new service
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order-service",
    "scopes": "orders:read orders:write orders:delete products:read"
  }'

# Response includes client_id and client_secret
{
  "id": "uuid",
  "name": "order-service", 
  "client_id": "generated-client-id",
  "client_secret": "generated-secret",
  "scopes": "orders:read orders:write orders:delete products:read"
}
```

### Client Credentials Authentication (Service-to-Service)
```bash
# Get service access token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your-service-client-id", 
    "client_secret": "your-service-client-secret"
  }'
```

### User Authentication (Password Grant)
```bash
# User login
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "admin",
    "password": "admin123"
  }'

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh-token-string",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### Token Refresh
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "your-refresh-token"
  }'
```

### Protected API Calls
```bash
# Make authenticated request
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Get user permissions
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 🖥️ Backend Integration Examples

### Java (Spring Boot)
```java
// JWT Validation Configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Value("${auth.service.jwt.secret}")
    private String jwtSecret;
    
    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(getSigningKey())
            .macAlgorithm(MacAlgorithm.HS256).build();
    }
    
    private SecretKeySpec getSigningKey() {
        return new SecretKeySpec(jwtSecret.getBytes(), "HmacSHA256");
    }
}

// Permission Check Annotation
@PreAuthorize("hasPermission('orders', 'read')")
@GetMapping("/orders")
public ResponseEntity<List<Order>> getOrders() {
    return ResponseEntity.ok(orderService.findAll());
}

// Service Authentication
@Service 
public class AuthServiceClient {
    
    @Value("${auth.service.url}")
    private String authServiceUrl;
    
    @Value("${auth.service.client-id}")
    private String clientId;
    
    @Value("${auth.service.client-secret}")
    private String clientSecret;
    
    public String getServiceToken() {
        RestTemplate restTemplate = new RestTemplate();
        
        TokenRequest request = new TokenRequest();
        request.setGrantType("client_credentials");
        request.setClientId(clientId);
        request.setClientSecret(clientSecret);
        
        TokenResponse response = restTemplate.postForObject(
            authServiceUrl + "/auth/token", request, TokenResponse.class);
            
        return response.getAccessToken();
    }
}

// JWT Validation Filter
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
            HttpServletResponse response, FilterChain filterChain) {
        
        String token = extractToken(request);
        if (token != null && validateToken(token)) {
            SecurityContextHolder.getContext()
                .setAuthentication(getAuthentication(token));
        }
        
        filterChain.doFilter(request, response);
    }
}
```

### Python (FastAPI)
```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer
import jwt
import httpx
from functools import wraps

app = FastAPI()
security = HTTPBearer()

# Configuration
AUTH_SERVICE_URL = "http://localhost:8080"
JWT_SECRET = "your-jwt-secret"
CLIENT_ID = "your-service-client-id"
CLIENT_SECRET = "your-service-client-secret"

# JWT Token Validation
def verify_token(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

# Permission Check Decorator
def require_permission(resource: str, action: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            token = kwargs.get('current_user')
            if not has_permission(token, resource, action):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permission: {resource}:{action}"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Service Authentication
class AuthClient:
    def __init__(self):
        self.client = httpx.AsyncClient()
        self.token = None
        
    async def get_service_token(self):
        response = await self.client.post(f"{AUTH_SERVICE_URL}/auth/token", json={
            "grant_type": "client_credentials",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET
        })
        data = response.json()
        self.token = data["access_token"]
        return self.token
        
    async def authenticated_request(self, method: str, url: str, **kwargs):
        if not self.token:
            await self.get_service_token()
            
        headers = kwargs.get('headers', {})
        headers['Authorization'] = f'Bearer {self.token}'
        kwargs['headers'] = headers
        
        return await self.client.request(method, url, **kwargs)

# Protected Endpoint
@app.get("/orders")
@require_permission("orders", "read") 
async def get_orders(current_user = Depends(verify_token)):
    return {"orders": []}

# User Permissions Check
def has_permission(user_payload: dict, resource: str, action: str) -> bool:
    # Check user permissions from JWT or make API call
    return f"{resource}:{action}" in user_payload.get("permissions", [])
```

### .NET Core
```csharp
// Startup.cs - JWT Configuration
public void ConfigureServices(IServiceCollection services)
{
    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(Configuration["Jwt:Secret"])),
                ValidateIssuer = true,
                ValidIssuer = "auth-service",
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            };
        });
        
    services.AddScoped<IAuthService, AuthService>();
}

// Auth Service Client
public class AuthService : IAuthService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    
    public AuthService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }
    
    public async Task<string> GetServiceTokenAsync()
    {
        var request = new
        {
            grant_type = "client_credentials",
            client_id = _configuration["Auth:ClientId"],
            client_secret = _configuration["Auth:ClientSecret"]
        };
        
        var response = await _httpClient.PostAsJsonAsync(
            $"{_configuration["Auth:ServiceUrl"]}/auth/token", request);
            
        var result = await response.Content.ReadFromJsonAsync<TokenResponse>();
        return result.AccessToken;
    }
}

// Permission Attribute
public class RequirePermissionAttribute : AuthorizeAttribute, IAuthorizationFilter
{
    private readonly string _resource;
    private readonly string _action;
    
    public RequirePermissionAttribute(string resource, string action)
    {
        _resource = resource;
        _action = action;
    }
    
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        
        if (!HasPermission(user, _resource, _action))
        {
            context.Result = new ForbidResult();
        }
    }
    
    private bool HasPermission(ClaimsPrincipal user, string resource, string action)
    {
        var permissions = user.FindAll("permission").Select(c => c.Value);
        return permissions.Contains($"{resource}:{action}");
    }
}

// Protected Controller
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    [HttpGet]
    [RequirePermission("orders", "read")]
    public async Task<IActionResult> GetOrders()
    {
        return Ok(new { orders = new List<object>() });
    }
}
```

---

## 🌐 Frontend Integration Examples

### React Integration
```tsx
// AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  user: any;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt'));
  const [user, setUser] = useState<any>(null);

  // Axios interceptor for automatic token refresh
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && token) {
          try {
            await refreshToken();
            error.config.headers.Authorization = `Bearer ${localStorage.getItem('jwt')}`;
            return axios.request(error.config);
          } catch {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  const login = async (username: string, password: string) => {
    const response = await axios.post('/auth/token', {
      grant_type: 'password',
      username,
      password
    });
    
    const { access_token, refresh_token } = response.data;
    setToken(access_token);
    localStorage.setItem('jwt', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    
    // Fetch user permissions
    const userResponse = await axios.get('/me/permissions');
    setUser(userResponse.data);
  };

  const hasPermission = (resource: string, action: string) => {
    return user?.effective_permissions?.some(
      (perm: any) => perm.resource === resource && perm.action === action
    );
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshToken, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

// ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  resource?: string;
  action?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, resource, action 
}) => {
  const { token, hasPermission } = useAuth();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (resource && action && !hasPermission(resource, action)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

// Usage in App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute resource="users" action="read">
              <UserList />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

### Angular Integration
```typescript
// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly AUTH_URL = 'http://localhost:8080';
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('jwt'));
  private userSubject = new BehaviorSubject<any>(null);
  
  public token$ = this.tokenSubject.asObservable();
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    if (this.tokenSubject.value) {
      this.loadUserPermissions();
    }
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.AUTH_URL}/auth/token`, {
      grant_type: 'password',
      username,
      password
    }).pipe(
      map((response: any) => {
        localStorage.setItem('jwt', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        this.tokenSubject.next(response.access_token);
        this.loadUserPermissions();
        return response;
      })
    );
  }

  logout(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh_token');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      return throwError('No refresh token');
    }

    return this.http.post(`${this.AUTH_URL}/auth/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).pipe(
      map((response: any) => {
        localStorage.setItem('jwt', response.access_token);
        this.tokenSubject.next(response.access_token);
        return response;
      }),
      catchError(() => {
        this.logout();
        return throwError('Token refresh failed');
      })
    );
  }

  hasPermission(resource: string, action: string): boolean {
    const user = this.userSubject.value;
    return user?.effective_permissions?.some(
      (perm: any) => perm.resource === resource && perm.action === action
    );
  }

  private loadUserPermissions(): void {
    this.http.get(`${this.AUTH_URL}/me/permissions`).subscribe(
      user => this.userSubject.next(user),
      () => this.logout()
    );
  }
}

// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const token = localStorage.getItem('jwt');
    
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    const requiredResource = route.data['resource'];
    const requiredAction = route.data['action'];
    
    if (requiredResource && requiredAction) {
      if (!this.authService.hasPermission(requiredResource, requiredAction)) {
        this.router.navigate(['/unauthorized']);
        return false;
      }
    }

    return true;
  }
}

// http.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('jwt');
    
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && token) {
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              const newToken = localStorage.getItem('jwt');
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` }
              });
              return next.handle(newReq);
            })
          );
        }
        return throwError(error);
      })
    );
  }
}

// app-routing.module.ts
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'users', 
    component: UserListComponent, 
    canActivate: [AuthGuard],
    data: { resource: 'users', action: 'read' }
  }
];
```

---

## ⚙️ Service Integration Patterns

### 1. Service Registration Flow
```bash
# Step 1: Register your service with admin credentials
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-service",
    "scopes": "resource1:read resource1:write resource2:read"
  }'

# Step 2: Store the returned client_id and client_secret
# Step 3: Use client credentials for service authentication
```

### 2. Authentication Flows

#### User Authentication Flow
1. **Frontend Login**: User submits credentials
2. **Token Exchange**: Frontend gets JWT + refresh token
3. **API Requests**: Include `Authorization: Bearer <token>` header
4. **Token Refresh**: Use refresh token when access token expires

#### Service Authentication Flow  
1. **Client Credentials**: Service uses `client_id` and `client_secret`
2. **Service Token**: Receive JWT for service-to-service calls
3. **API Requests**: Use service token for authenticated requests

### 3. Permission Validation Patterns

#### Frontend Pattern
```typescript
// Check permission before rendering/navigation
if (hasPermission('users', 'read')) {
  // Show user list
}
```

```jsx
// Route-level protection
<ProtectedRoute resource="users" action="write">
  <CreateUser />
</ProtectedRoute>
```

#### Backend Pattern
```python
@require_permission('users', 'read')
async def get_users():
    # Implementation
```

### 4. Error Handling Best Practices

#### Token Expiry Handling
- **Frontend**: Implement automatic token refresh with axios/http interceptors
- **Backend**: Return 401 for invalid tokens, 403 for insufficient permissions
- **Retry Logic**: Retry failed requests after token refresh

#### Permission Denied Handling
- **Frontend**: Show appropriate UI for insufficient permissions
- **Backend**: Return detailed error messages for debugging
- **Logging**: Log permission violations for security monitoring

---

## 🔧 Configuration Examples

### Backend Service Configuration

#### Java (application.yml)
```yaml
auth:
  service:
    url: http://localhost:8080
    jwt:
      secret: your-jwt-secret-key
    client-id: your-service-client-id
    client-secret: your-service-client-secret
```

#### Python (.env)
```bash
AUTH_SERVICE_URL=http://localhost:8080
JWT_SECRET=your-jwt-secret-key
CLIENT_ID=your-service-client-id
CLIENT_SECRET=your-service-client-secret
```

#### .NET (appsettings.json)
```json
{
  "Auth": {
    "ServiceUrl": "http://localhost:8080",
    "ClientId": "your-service-client-id",
    "ClientSecret": "your-service-client-secret"
  },
  "Jwt": {
    "Secret": "your-jwt-secret-key",
    "Issuer": "auth-service"
  }
}
```

### Frontend Configuration

#### React (.env)
```bash
REACT_APP_AUTH_SERVICE_URL=http://localhost:8080
```

#### Angular (environment.ts)
```typescript
export const environment = {
  production: false,
  authServiceUrl: 'http://localhost:8080'
};
```

---

## 🛡️ Security Best Practices

### JWT Token Security
- **Secret Key**: Use strong, randomly generated 256-bit keys
- **Token Expiry**: Set appropriate expiration times (15 min access, 7 day refresh)
- **Secure Storage**: Use httpOnly cookies for web apps when possible
- **Token Rotation**: Implement refresh token rotation

### API Security
- **HTTPS Only**: Always use HTTPS in production
- **CORS**: Configure appropriate CORS policies
- **Rate Limiting**: Implement rate limiting for authentication endpoints
- **Input Validation**: Validate all inputs and sanitize data

### Permission Security
- **Principle of Least Privilege**: Grant minimum required permissions
- **Regular Audits**: Review and audit permissions regularly
- **Permission Inheritance**: Understand User → Role → Group → Service chain
- **Cross-Service Validation**: Validate permissions for cross-service requests

---

## 🔍 Troubleshooting Guide

### Common Issues

#### 401 Unauthorized
- Check token format: `Bearer <token>`
- Verify token hasn't expired
- Ensure JWT secret matches between services
- Validate token signature

#### 403 Forbidden  
- Check user has required permission
- Verify permission format: `resource:action`
- Review RBAC chain: User → Role → Group → Service
- Check service scopes include required permissions

#### Token Refresh Failures
- Verify refresh token hasn't expired
- Check refresh token is stored securely
- Ensure refresh endpoint is accessible
- Validate client credentials for service tokens

### Debug Commands
```bash
# Decode JWT token (remove signature for security)
echo "jwt-token-here" | cut -d'.' -f2 | base64 -d | jq

# Test authentication
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"password","username":"admin","password":"admin123"}'

# Check user permissions  
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer $TOKEN"

# Test service registration
curl -X GET http://localhost:8080/services \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Additional Resources

### API Documentation
- **Swagger/OpenAPI**: Available at `/swagger` endpoint (if enabled)
- **Postman Collection**: Import API collection for testing
- **cURL Examples**: Use provided cURL commands for integration testing

### Integration Examples
- **Sample Applications**: Check `/examples` directory for complete integration samples
- **Docker Compose**: Multi-service setup examples
- **Kubernetes**: Deployment manifests for container orchestration

### Support and Community
- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: Comprehensive API documentation
- **Best Practices**: Security and integration guidelines

---

## 🏭 Production Deployment

### Environment Variables
```bash
# Backend
DB_HOST=your-db-host
DB_PASSWORD=secure-password
JWT_SECRET_KEY=your-256-bit-secret-key
SERVER_MODE=release

# Enable HTTPS in nginx.conf
# Add SSL certificates to nginx/ssl/
```

### Security Features
- JWT with refresh token rotation
- CORS protection
- Rate limiting
- Security headers (XSS, CSRF protection)
- Input validation and sanitization
- Role-based access control

### Monitoring
- Health check endpoints
- Nginx access logs
- PostgreSQL connection monitoring
- Docker container health checks

## 📁 Project Structure

```
auth-service/
├── backend/                 # Go API server
│   ├── cmd/server/         # Main application
│   ├── internal/           # Private packages
│   │   ├── auth/          # JWT management
│   │   ├── handlers/      # HTTP handlers
│   │   ├── middleware/    # Auth middleware
│   │   ├── models/        # Database models
│   │   ├── repository/    # Data access layer
│   │   └── services/      # Business logic
│   ├── config/            # Configuration
│   └── migrations/        # Database migrations
├── frontend/
│   └── react-app/         # React frontend
├── tests/bdd/             # BDD test suite
├── nginx/                 # Nginx configuration
└── docker-compose.yml     # Container orchestration
```