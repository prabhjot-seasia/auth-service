# Document Base Integration Guide with Authentication Service

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Service Registration](#service-registration)
4. [Backend Integration](#backend-integration)
5. [Frontend Integration](#frontend-integration)
6. [Cross-Service Logout](#cross-service-logout)
7. [Security Requirements](#security-requirements)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This document provides comprehensive instructions for integrating the Document Base application with the centralized Authentication Service. The integration ensures:
- Centralized authentication and authorization
- Single Sign-On (SSO) across all services
- Token-based API security
- Cross-service logout synchronization
- Role-based access control (RBAC)

### Key Integration Points
- **Frontend**: React application redirects to Auth Service for login
- **Backend**: Validates tokens with Auth Service for every API request
- **Logout**: Synchronizes token invalidation across all services
- **Security**: No credentials stored in Document Base

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Document Base  │────▶│  Auth Service    │◀────│  Other Services │
│    Frontend     │     │   (Port 8080)    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        ▲                         │
        ▼                        │                         ▼
┌─────────────────┐             │                ┌─────────────────┐
│  Document Base  │─────────────┘                │  Other Backend  │
│    Backend      │                               │    Services     │
└─────────────────┘                               └─────────────────┘
```

---

## Service Registration

### Step 1: Register Document Base Service with Auth Service

**IMPORTANT**: This step must be done by an Auth Service administrator. Document Base should NEVER have these credentials in their codebase.

```bash
# Admin registers Document Base service (ONE TIME SETUP)
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Base Service",
    "client_id": "document-base-service",
    "redirect_uris": ["http://localhost:3002/auth/callback"],
    "scopes": "users:read users:write documents:read documents:write"
  }'

# Response (SAVE THESE SECURELY - PROVIDED TO DOCUMENT BASE TEAM)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Document Base Service",
  "client_id": "document-base-service",
  "client_secret": "generated-secret-xxx",  # KEEP THIS SECRET!
  "redirect_uris": ["http://localhost:3002/auth/callback"],
  "scopes": "users:read users:write documents:read documents:write",
  "created_at": "2024-01-15T10:00:00Z"
}
```

**⚠️ CRITICAL**: The `client_secret` is only shown once. Store it securely in environment variables, never in code.

---

## Backend Integration

### Requirements
- Java Spring Boot / Node.js / Python / Go (any backend framework)
- HTTP client library for API calls
- Environment variable management

### Environment Configuration

Create `.env` file (NEVER commit to repository):
```bash
# Auth Service Configuration
AUTH_SERVICE_URL=http://localhost:8080
AUTH_CLIENT_ID=document-base-client
AUTH_CLIENT_SECRET=docbase123  # Test credentials for integration

# Your service configuration
SERVICE_PORT=8081
SERVICE_NAME=Document Base Backend
```

### Token Validation Middleware

#### Java Spring Boot Implementation

```java
package com.documentbase.middleware;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

@Component
public class AuthenticationFilter extends OncePerRequestFilter {
    
    @Value("${auth.service.url}")
    private String authServiceUrl;
    
    @Value("${auth.service.client-id}")
    private String clientId;
    
    @Value("${auth.service.client-secret}")
    private String clientSecret;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) 
                                  throws ServletException, IOException {
        
        // Skip authentication for public endpoints
        String path = request.getRequestURI();
        if (isPublicEndpoint(path)) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Extract token from Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\": \"No authentication token provided\"}");
            return;
        }
        
        String token = authHeader.substring(7);
        
        // Validate token with Auth Service
        if (!validateToken(token, request, response)) {
            return; // Response already set in validateToken
        }
        
        filterChain.doFilter(request, response);
    }
    
    private boolean validateToken(String token, 
                                 HttpServletRequest request,
                                 HttpServletResponse response) throws IOException {
        try {
            // Prepare headers with dual authentication
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            headers.set("X-Client-ID", clientId);
            headers.set("X-Client-Secret", clientSecret);
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            // Call Auth Service to validate token
            ResponseEntity<Map> authResponse = restTemplate.exchange(
                authServiceUrl + "/sso/validate",
                HttpMethod.GET,
                entity,
                Map.class
            );
            
            Map<String, Object> body = authResponse.getBody();
            
            if (body != null && Boolean.TRUE.equals(body.get("valid"))) {
                // Store user info in request context
                request.setAttribute("user_id", body.get("user_id"));
                request.setAttribute("username", body.get("username"));
                request.setAttribute("roles", body.get("roles"));
                request.setAttribute("permissions", body.get("permissions"));
                return true;
            }
            
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\": \"Invalid token\"}");
            return false;
            
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\": \"Token validation failed: " + e.getMessage() + "\"}");
            return false;
        }
    }
    
    private boolean isPublicEndpoint(String path) {
        return path.equals("/health") || 
               path.equals("/metrics") || 
               path.startsWith("/public/");
    }
}
```

#### Node.js Express Implementation

```javascript
// middleware/auth.js
const axios = require('axios');

const authMiddleware = async (req, res, next) => {
    // Skip authentication for public endpoints
    const publicPaths = ['/health', '/metrics', '/public'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    const token = authHeader.substring(7);
    
    try {
        // Validate token with Auth Service using dual authentication
        const response = await axios.get(
            `${process.env.AUTH_SERVICE_URL}/sso/validate`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Client-ID': process.env.AUTH_CLIENT_ID,
                    'X-Client-Secret': process.env.AUTH_CLIENT_SECRET
                }
            }
        );
        
        if (response.data.valid) {
            // Store user info in request
            req.user = {
                id: response.data.user_id,
                username: response.data.username,
                roles: response.data.roles,
                permissions: response.data.permissions
            };
            next();
        } else {
            res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Token validation failed:', error.message);
        res.status(401).json({ error: 'Token validation failed' });
    }
};

// Permission check middleware
const requirePermission = (action, resource) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const hasPermission = req.user.permissions.some(
            p => p.action === action && p.resource === resource
        );
        
        if (hasPermission) {
            next();
        } else {
            res.status(403).json({ 
                error: 'Insufficient permissions',
                required: `${action}:${resource}`
            });
        }
    };
};

module.exports = { authMiddleware, requirePermission };
```

### API Endpoints with Authentication

```javascript
// routes/documents.js
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// List documents - requires read permission
router.get('/', requirePermission('read', 'documents'), async (req, res) => {
    // User info available in req.user
    const documents = await getDocumentsForUser(req.user.id);
    res.json(documents);
});

// Create document - requires write permission
router.post('/', requirePermission('write', 'documents'), async (req, res) => {
    const document = await createDocument({
        ...req.body,
        owner_id: req.user.id,
        created_by: req.user.username
    });
    res.status(201).json(document);
});

// Delete document - requires write permission
router.delete('/:id', requirePermission('write', 'documents'), async (req, res) => {
    await deleteDocument(req.params.id, req.user.id);
    res.status(204).send();
});

module.exports = router;
```

---

## Frontend Integration

### React Implementation

#### 1. Install Dependencies

```bash
npm install axios react-router-dom
```

#### 2. Create Auth Context

```jsx
// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    
    const AUTH_SERVICE_URL = process.env.REACT_APP_AUTH_SERVICE_URL || 'http://localhost:8080';
    const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || 'document-base-service';
    const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3002/auth/callback';
    
    useEffect(() => {
        if (token) {
            // Set default authorization header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUserInfo();
        } else {
            setLoading(false);
        }
    }, [token]);
    
    const fetchUserInfo = async () => {
        try {
            const response = await axios.get(`${AUTH_SERVICE_URL}/me/permissions`);
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            // Token might be invalid, clear it
            logout();
        } finally {
            setLoading(false);
        }
    };
    
    const login = () => {
        // Redirect to Auth Service login page
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'openid profile documents:read documents:write'
        });
        
        window.location.href = `${AUTH_SERVICE_URL}/sso/login?${params}`;
    };
    
    const handleCallback = async (code) => {
        try {
            // Exchange authorization code for token using OAuth2 token endpoint
            const response = await axios.post(`${AUTH_SERVICE_URL}/auth/token`, {
                grant_type: 'authorization_code',
                code: code,
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI
            });
            
            const { access_token, refresh_token } = response.data;
            
            // Store tokens
            localStorage.setItem('auth_token', access_token);
            if (refresh_token) {
                localStorage.setItem('refresh_token', refresh_token);
            }
            setToken(access_token);
            
            // Set default header for all requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            
            // Fetch user info
            await fetchUserInfo();
            
            return true;
        } catch (error) {
            console.error('Callback failed:', error);
            return false;
        }
    };
    
    const logout = async () => {
        try {
            // Notify Auth Service about logout
            if (token) {
                await axios.post(`${AUTH_SERVICE_URL}/sso/logout`, {
                    token: token
                });
            }
        } catch (error) {
            console.error('Logout notification failed:', error);
        } finally {
            // Clear local state
            localStorage.removeItem('auth_token');
            setToken(null);
            setUser(null);
            delete axios.defaults.headers.common['Authorization'];
            
            // Redirect to Auth Service logout to clear SSO session
            window.location.href = `${AUTH_SERVICE_URL}/logout?redirect_uri=${encodeURIComponent(window.location.origin)}`;
        }
    };
    
    const hasPermission = (action, resource) => {
        if (!user || !user.permissions) return false;
        return user.permissions.some(p => p.action === action && p.resource === resource);
    };
    
    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            handleCallback,
            hasPermission,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};
```

#### 3. Create Service Selector Component

```jsx
// src/components/ServiceSelector.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ServiceSelector = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    
    const AUTH_SERVICE_URL = process.env.REACT_APP_AUTH_SERVICE_URL || 'http://localhost:8080';
    
    useEffect(() => {
        fetchAvailableServices();
    }, [user]);
    
    const fetchAvailableServices = async () => {
        try {
            // Fetch services available to the current user
            const response = await axios.get(`${AUTH_SERVICE_URL}/me/services`);
            setServices(response.data.services || []);
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const navigateToService = (service) => {
        // Navigate to selected service
        if (service.url) {
            // Pass token in URL for SSO
            const params = new URLSearchParams({
                token: localStorage.getItem('auth_token'),
                return_url: window.location.href
            });
            window.location.href = `${service.url}?${params}`;
        }
    };
    
    if (loading) return <div>Loading services...</div>;
    
    return (
        <div className="service-selector">
            <label>Switch Service:</label>
            <select onChange={(e) => {
                const service = services.find(s => s.id === e.target.value);
                if (service) navigateToService(service);
            }}>
                <option value="">-- Select Service --</option>
                {services.map(service => (
                    <option key={service.id} value={service.id}>
                        {service.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default ServiceSelector;
```

#### 4. Protected Route Component

```jsx
// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
    const { isAuthenticated, loading, hasPermission } = useAuth();
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
        // Store the intended destination
        sessionStorage.setItem('redirect_after_login', window.location.pathname);
        return <Navigate to="/login" replace />;
    }
    
    if (requiredPermission) {
        const [action, resource] = requiredPermission.split(':');
        if (!hasPermission(action, resource)) {
            return <div>Access Denied: You don't have permission to view this page.</div>;
        }
    }
    
    return children;
};

export default ProtectedRoute;
```

#### 5. Callback Handler Component

```jsx
// src/pages/AuthCallback.jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { handleCallback } = useAuth();
    
    useEffect(() => {
        const processCallback = async () => {
            const code = searchParams.get('code');
            const error = searchParams.get('error');
            
            if (error) {
                console.error('Authentication error:', error);
                navigate('/login');
                return;
            }
            
            if (code) {
                const success = await handleCallback(code);
                if (success) {
                    // Check if we have a stored redirect path
                    const redirectPath = sessionStorage.getItem('redirect_after_login') || '/';
                    sessionStorage.removeItem('redirect_after_login');
                    navigate(redirectPath);
                } else {
                    navigate('/login');
                }
            } else {
                navigate('/login');
            }
        };
        
        processCallback();
    }, [searchParams, navigate, handleCallback]);
    
    return <div>Processing authentication...</div>;
};

export default AuthCallback;
```

#### 6. App Component Setup

```jsx
// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ServiceSelector from './components/ServiceSelector';
import AuthCallback from './pages/AuthCallback';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/documents" element={
                        <ProtectedRoute requiredPermission="read:documents">
                            <Documents />
                        </ProtectedRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
```

#### 7. Login Page

```jsx
// src/pages/Login.jsx
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);
    
    return (
        <div className="login-container">
            <h2>Document Base</h2>
            <p>Please login to continue</p>
            <button onClick={login}>
                Login with SSO
            </button>
        </div>
    );
};

export default Login;
```

---

## Cross-Service Logout

### Implementation Requirements

1. **Frontend Logout Flow**
```javascript
// When user clicks logout in Document Base
const handleLogout = async () => {
    try {
        // 1. Notify your backend about logout
        await axios.post('/api/logout');
        
        // 2. Clear local session
        localStorage.removeItem('auth_token');
        
        // 3. Redirect to Auth Service logout endpoint
        window.location.href = `${AUTH_SERVICE_URL}/logout?redirect_uri=${window.location.origin}`;
    } catch (error) {
        console.error('Logout failed:', error);
        // Even if backend call fails, clear local state
        localStorage.removeItem('auth_token');
        window.location.href = `${AUTH_SERVICE_URL}/logout`;
    }
};
```

2. **Backend Token Invalidation Webhook**
```javascript
// Endpoint to receive logout notifications from Auth Service
router.post('/webhooks/auth/logout', async (req, res) => {
    const { token, user_id } = req.body;
    
    // Validate webhook signature (implement HMAC validation)
    if (!validateWebhookSignature(req)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Clear any cached sessions for this user
    await sessionCache.delete(user_id);
    await tokenCache.delete(token);
    
    // Notify any WebSocket connections to disconnect
    websocketManager.disconnectUser(user_id);
    
    res.json({ success: true });
});
```

---

## Security Requirements

### Critical Security Rules

1. **NEVER Store Client Credentials in Frontend Code**
   - Client ID and Client Secret must ONLY be in backend
   - Frontend should never have access to client credentials

2. **Environment Variables**
   ```bash
   # .env.example (commit this)
   AUTH_SERVICE_URL=
   AUTH_CLIENT_ID=
   AUTH_CLIENT_SECRET=
   
   # .env (NEVER commit this)
   AUTH_SERVICE_URL=http://localhost:8080
   AUTH_CLIENT_ID=document-base-service
   AUTH_CLIENT_SECRET=actual-secret-here
   ```

3. **Token Storage**
   - Store tokens in memory or localStorage (for persistence)
   - Never store in cookies without HttpOnly and Secure flags
   - Clear tokens on logout

4. **HTTPS in Production**
   - All communication must use HTTPS in production
   - Update redirect URIs to use HTTPS

---

## Testing

### CURL Examples for Testing

#### 1. Test Service Registration (Admin Only)
```bash
# Get admin token first
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "password", "username": "admin", "password": "Admin@123"}' \
  | jq -r '.access_token')

# Register Document Base service
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Base Service",
    "client_id": "document-base-service",
    "redirect_uris": ["http://localhost:3002/auth/callback"],
    "scopes": "users:read users:write documents:read documents:write"
  }'
```

#### 2. Test Token Validation
```bash
# Get a user token
USER_TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "password", "username": "admin", "password": "Admin@123"}' \
  | jq -r '.access_token')

# Validate token with dual authentication
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Client-ID: document-base-service" \
  -H "X-Client-Secret: your-client-secret"

# Expected response:
{
  "valid": true,
  "user_id": "uuid",
  "username": "admin",
  "email": "admin@example.com",
  "roles": ["admin"],
  "permissions": [
    {"action": "read", "resource": "documents"},
    {"action": "write", "resource": "documents"}
  ]
}
```

#### 3. Test Document Base API with Token
```bash
# Call Document Base API with token
curl -X GET http://localhost:8081/api/documents \
  -H "Authorization: Bearer $USER_TOKEN"

# Create a document
curl -X POST http://localhost:8081/api/documents \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Document",
    "content": "This is a test document"
  }'
```

#### 4. Test Logout
```bash
# Logout from Auth Service
curl -X POST http://localhost:8080/sso/logout \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$USER_TOKEN\"}"

# Verify token is invalidated
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Client-ID: document-base-service" \
  -H "X-Client-Secret: your-client-secret"

# Should return:
{
  "valid": false,
  "error": "Token is blacklisted"
}
```

#### 5. Test User Services Endpoint
```bash
# Get available services for user
curl -X GET http://localhost:8080/services \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected response:
[
  {
    "id": "1",
    "name": "Document Base",
    "base_url": "http://localhost:3002",
    "description": "Document management system",
    "client_id": "document-base-service"
  },
  {
    "id": "2", 
    "name": "Auth Service",
    "base_url": "http://localhost:8080",
    "description": "Authentication and authorization service",
    "client_id": "auth-service-client"
  }
]
```

#### 6. Test Permission Validation
```bash
# Check specific permission
curl -X GET "http://localhost:8080/me/check-permission?service=document-base&action=read&resource=documents" \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected response:
{
  "has_permission": true,
  "permission": {
    "service": "document-base",
    "action": "read",
    "resource": "documents"
  }
}

# Test permission denial
curl -X GET "http://localhost:8080/me/check-permission?service=document-base&action=admin&resource=system" \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected response:
{
  "has_permission": false,
  "message": "User does not have required permission"
}
```

#### 7. Test User Permissions Endpoint  
```bash
# Get all user permissions
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected response:
{
  "username": "admin",
  "email": "admin@example.com",
  "effective_permissions": [
    {
      "service": "auth-service",
      "action": "read",
      "resource": "users"
    },
    {
      "service": "auth-service",
      "action": "write",
      "resource": "users"
    }
  ],
  "roles": ["super_admin"],
  "groups": ["administrators"]
}

#### 8. Test Permission-Based Access
```bash
# Check specific permission
curl -X GET "http://localhost:8080/me/check-permission?action=read&resource=documents" \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected response:
{
  "permission": "read:documents",
  "allowed": true
}
```

#### 8. Test SSO Login Flow
```bash
# Step 1: Initiate SSO login (this would normally be a browser redirect)
curl -c cookies.txt -L "http://localhost:8080/sso/login?client_id=document-base-service&redirect_uri=http://localhost:3002/auth/callback&response_type=code&scope=openid"

# Step 2: If user has valid session, Auth Service redirects to:
# http://localhost:3002/auth/callback?code=<authorization-code>

# Step 3: Document Base exchanges authorization code for token
AUTHORIZATION_CODE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # From step 2

curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "'$AUTHORIZATION_CODE'",
    "client_id": "document-base-service",
    "redirect_uri": "http://localhost:3002/auth/callback"
  }'

# Expected response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "refresh-token-here"
}

# Step 4: Test if user is properly redirected to Document Base
curl -L "http://localhost:3002?token=$ACCESS_TOKEN" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### 9. Test Service Client Credentials (Backend Authentication)
```bash
# Document Base backend authenticates with Auth Service
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "document-base-client",
    "client_secret": "docbase123"
  }'

# Expected response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "service:read service:write"
}
```

#### 10. Test Document Base API with Dual Authentication
```bash
# Document Base requires both user token and service authentication
USER_TOKEN="user-jwt-token-here"
SERVICE_TOKEN="service-jwt-token-here"

# Get documents with user context
curl -X GET http://localhost:3002/api/documents \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Service-Token: Bearer $SERVICE_TOKEN"

# Expected response:
{
  "documents": [
    {
      "id": "doc-123",
      "title": "User Document",
      "content": "Document content here",
      "owner_id": "user-uuid",
      "created_at": "2024-01-15T10:00:00Z",
      "permissions": ["read", "write"]
    }
  ],
  "total": 1,
  "user": {
    "id": "user-uuid",
    "username": "john.doe",
    "permissions": ["read:documents", "write:documents"]
  }
}

# Create document (requires write permission)
curl -X POST http://localhost:3002/api/documents \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Service-Token: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Document",
    "content": "This is a new document created via API",
    "tags": ["test", "api"]
  }'

# Expected response:
{
  "id": "doc-124",
  "title": "New Document", 
  "content": "This is a new document created via API",
  "tags": ["test", "api"],
  "owner_id": "user-uuid",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 11. Test Cross-Service Navigation
```bash
# Simulate user navigating from Auth Service to Document Base
# This would normally happen via browser redirect with token

# Step 1: Get current services list
curl -X GET http://localhost:8080/services \
  -H "Authorization: Bearer $USER_TOKEN"

# Step 2: Navigate to Document Base with token
curl -X GET "http://localhost:3002?token=$USER_TOKEN&return_url=http://localhost:8080/dashboard" \
  -L -c cookies.txt

# Document Base should validate the token and establish session
```

#### 12. Test Permission-Based Feature Access
```bash
# Test with admin user (has all permissions)
ADMIN_TOKEN="admin-jwt-token-here"

curl -X GET http://localhost:3002/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Service-Token: Bearer $SERVICE_TOKEN"

# Expected response (admin can see all users):
{
  "users": [
    {"id": "1", "username": "john.doe", "email": "john@company.com"},
    {"id": "2", "username": "jane.smith", "email": "jane@company.com"}
  ]
}

# Test with regular user (should be denied)
REGULAR_TOKEN="regular-user-token-here"

curl -X GET http://localhost:3002/api/admin/users \
  -H "Authorization: Bearer $REGULAR_TOKEN" \
  -H "X-Service-Token: Bearer $SERVICE_TOKEN"

# Expected response:
{
  "error": "insufficient_permissions",
  "message": "Access denied. Required permission: admin:users",
  "code": 403
}
```

#### 13. Test Token Refresh Flow
```bash
# When access token expires, use refresh token
REFRESH_TOKEN="refresh-token-here"

curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "'$REFRESH_TOKEN'",
    "client_id": "document-base-service"
  }'

# Expected response:
{
  "access_token": "new-access-token-here",
  "token_type": "Bearer", 
  "expires_in": 900
}

# Test new token works
NEW_TOKEN="new-access-token-here"
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer $NEW_TOKEN"
```

#### 14. Test Complete Integration Workflow
```bash
#!/bin/bash
# Complete integration test script

echo "=== Document Base Integration Test ==="

# Step 1: Service authentication (backend)
echo "1. Testing service authentication..."
SERVICE_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "document-base-service", 
    "client_secret": "your-service-secret"
  }')

SERVICE_TOKEN=$(echo $SERVICE_RESPONSE | jq -r '.access_token')
echo "Service token obtained: ${SERVICE_TOKEN:0:20}..."

# Step 2: User authentication
echo "2. Testing user authentication..."
USER_RESPONSE=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "admin",
    "password": "Admin@123"
  }')

USER_TOKEN=$(echo $USER_RESPONSE | jq -r '.access_token')
echo "User token obtained: ${USER_TOKEN:0:20}..."

# Step 3: Token validation
echo "3. Testing token validation..."
VALIDATION_RESPONSE=$(curl -s -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer $USER_TOKEN")

USERNAME=$(echo $VALIDATION_RESPONSE | jq -r '.username')
echo "Validated user: $USERNAME"

# Step 4: Permission check
echo "4. Testing permission check..."
PERMISSION_RESPONSE=$(curl -s -X GET "http://localhost:8080/me/check-permission?service=document-base&action=read&resource=documents" \
  -H "Authorization: Bearer $USER_TOKEN")

HAS_PERMISSION=$(echo $PERMISSION_RESPONSE | jq -r '.has_permission')
echo "Has read permission: $HAS_PERMISSION"

# Step 5: Document API test
echo "5. Testing Document Base API..."
DOC_RESPONSE=$(curl -s -X GET http://localhost:3002/api/documents \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Service-Token: Bearer $SERVICE_TOKEN")

echo "Documents retrieved: $(echo $DOC_RESPONSE | jq '.documents | length')"

# Step 6: Logout test
echo "6. Testing logout..."
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:8080/sso/logout \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$USER_TOKEN\"}")

echo "Logout successful: $(echo $LOGOUT_RESPONSE | jq -r '.success')"

# Step 7: Verify token invalidation
echo "7. Verifying token invalidation..."
INVALID_RESPONSE=$(curl -s -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Token invalid: $(echo $INVALID_RESPONSE | jq -r '.error')"

echo "=== Integration Test Complete ==="
```

---

## Advanced Testing Scenarios

### Load Testing Authentication
```bash
# Test concurrent authentication requests
for i in {1..10}; do
  curl -X POST http://localhost:8080/auth/token \
    -H "Content-Type: application/json" \
    -d '{
      "grant_type": "client_credentials",
      "client_id": "document-base-service",
      "client_secret": "your-service-secret"
    }' &
done
wait

echo "All authentication requests completed"
```

### Error Scenario Testing
```bash
# Test invalid client credentials
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "invalid-client", 
    "client_secret": "wrong-secret"
  }'

# Expected response:
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}

# Test expired token
EXPIRED_TOKEN="expired.jwt.token"
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer $EXPIRED_TOKEN"

# Expected response:
{
  "error": "invalid_token",
  "error_description": "Token has expired"
}

# Test malformed token
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer invalid-token-format"

# Expected response:
{
  "error": "invalid_token", 
  "error_description": "Token format is invalid"
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Token Validation Fails
**Issue**: Backend receives 401 when validating token
**Solution**: 
- Verify client_id and client_secret are correct
- Ensure Auth Service is running and accessible
- Check if token has expired (default 15 minutes)

#### 2. SSO Not Redirecting Back to Service
**Issue**: After login, user is not redirected back to the original service callback URL
**Solution**:
- **Check authorization endpoint URL**: Use `/sso/login` not `/login`
  ```javascript
  // Correct SSO URL format
  const authUrl = `http://localhost:8080/sso/login?client_id=document-base-service&redirect_uri=http://localhost:3002/auth/callback&response_type=code`;
  ```
- **Verify callback handles 'code' parameter**: Auth Service redirects with authorization code, not token
  ```javascript
  // In AuthCallback component
  const code = searchParams.get('code'); // Not 'token'
  ```
- **Use correct token exchange endpoint**: Call `/auth/token` with `grant_type=authorization_code`
  ```javascript
  await axios.post('http://localhost:8080/auth/token', {
    grant_type: 'authorization_code',  // Required
    code: authorizationCode,
    client_id: 'document-base-service',
    redirect_uri: 'http://localhost:3002/auth/callback'
  });
  ```
- **Check service registration**: Ensure `redirect_uri` exactly matches registered URI
- **Verify user has service access**: User's role must have groups that include the target service

**Debug SSO Flow Step-by-Step:**
```bash
# 1. Check if service is registered
curl -X GET http://localhost:8080/services \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[] | select(.client_id=="document-base-service")'

# 2. Test authorization endpoint manually
curl -v "http://localhost:8080/sso/login?client_id=document-base-service&redirect_uri=http://localhost:3002/auth/callback&response_type=code" \
  -H "Cookie: sso_token=$VALID_TOKEN"

# 3. Check what URL the redirect goes to (should be your callback with 'code' parameter)

# 4. Test token exchange
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "paste-actual-code-here",
    "client_id": "document-base-service", 
    "redirect_uri": "http://localhost:3002/auth/callback"
  }'
```

#### 3. Redirect Loop  
**Issue**: User keeps getting redirected between services
**Solution**:
- Verify redirect_uri matches exactly what's registered
- Check if localStorage is enabled in browser
- Ensure token is being properly stored after callback

#### 4. CORS Errors
**Issue**: Browser blocks requests to Auth Service
**Solution**:
```javascript
// Auth Service should include CORS headers
app.use(cors({
    origin: ['http://localhost:3002', 'http://localhost:3003'],
    credentials: true
}));
```

#### 4. Permissions Not Working
**Issue**: User can't access resources despite being logged in
**Solution**:
- Check if user's role has required permissions
- Verify permission format (action:resource)
- Ensure permissions are being extracted correctly from token validation response

#### 5. Logout Not Syncing
**Issue**: User stays logged in other services after logout
**Solution**:
- Implement logout webhook handler in backend
- Ensure all services call Auth Service logout endpoint
- Clear local storage/session on logout

---

## Production Checklist

Before deploying to production:

- [ ] Use HTTPS for all endpoints
- [ ] Store credentials in secure vault (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Implement rate limiting on token validation endpoint
- [ ] Set up monitoring for failed authentication attempts
- [ ] Configure proper CORS policies
- [ ] Implement webhook signature validation
- [ ] Set appropriate token expiry times
- [ ] Enable audit logging for all authentication events
- [ ] Test logout flow across all services
- [ ] Implement token refresh mechanism
- [ ] Set up alerting for authentication service downtime

---

## Support

For issues or questions:
1. Check Auth Service logs: `docker logs auth-backend`
2. Verify network connectivity between services
3. Ensure all environment variables are set correctly
4. Contact Auth Service team with:
   - Error messages
   - Request/Response headers
   - Time of occurrence
   - User ID affected

---

## Appendix: Complete Working Example

### Backend Server (Node.js)
```javascript
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authMiddleware, requirePermission } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Public endpoint - no auth required
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Protected endpoints
app.use('/api', authMiddleware);

app.get('/api/documents', requirePermission('read', 'documents'), (req, res) => {
    res.json({
        documents: [
            { id: 1, title: 'Document 1', owner: req.user.username },
            { id: 2, title: 'Document 2', owner: req.user.username }
        ]
    });
});

app.post('/api/documents', requirePermission('write', 'documents'), (req, res) => {
    res.status(201).json({
        id: Date.now(),
        ...req.body,
        owner: req.user.username,
        created_at: new Date()
    });
});

// Logout endpoint
app.post('/api/logout', authMiddleware, async (req, res) => {
    // Notify Auth Service
    try {
        await axios.post(`${process.env.AUTH_SERVICE_URL}/sso/logout`, {
            token: req.headers.authorization.substring(7)
        });
    } catch (error) {
        console.error('Failed to notify auth service:', error);
    }
    
    res.json({ success: true });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Document Base Backend running on port ${PORT}`);
});
```

### Frontend App (React)
```jsx
// App.js
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
```

This completes the comprehensive integration guide for Document Base application with the Authentication Service.