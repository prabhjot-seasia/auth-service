# Frontend Integration Guide

## Overview

This guide covers how to integrate frontend applications (React, Vue, Angular, etc.) with the Auth Service for user authentication and authorization. The integration uses secure OAuth2 Authorization Code flow with PKCE for optimal security.

⚠️ **Security Note**: Password grant is deprecated due to security concerns. This guide implements the recommended Authorization Code + PKCE flow for frontend applications.

## Authentication Flow

### OAuth2 Authorization Code + PKCE Flow (Recommended)
- User is redirected to Auth Service login page
- User authenticates with Auth Service
- Returns with authorization code
- Frontend exchanges code for JWT tokens
- Tokens used for API access

## Basic Setup

### Environment Configuration

```javascript
// config.js
export const authConfig = {
  authServiceUrl: process.env.REACT_APP_AUTH_SERVICE_URL || 'http://localhost:8080',
  clientId: process.env.REACT_APP_CLIENT_ID,
  clientSecret: process.env.REACT_APP_CLIENT_SECRET,
  redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin + '/auth/callback'
};
```

## React Implementation

### Auth Service Class

```javascript
// services/authService.js
import axios from 'axios';
import { authConfig } from '../config';

class AuthService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: authConfig.authServiceUrl
    });
    
    // Add token to requests automatically
    this.apiClient.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Handle token expiration
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.refreshToken();
          // Retry original request
          return this.apiClient.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }
  
  // Initialize OAuth2 login flow
  initiateLogin() {
    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Store PKCE parameters for later verification
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('code_verifier', codeVerifier);
    
    const params = new URLSearchParams({
      client_id: authConfig.clientId,
      redirect_uri: authConfig.redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    // Redirect to Auth Service
    window.location.href = `${authConfig.authServiceUrl}/sso/login?${params}`;
  }
  
  // Handle OAuth2 callback and exchange code for tokens
  async handleCallback(code, state) {
    try {
      const storedState = localStorage.getItem('oauth_state');
      const codeVerifier = localStorage.getItem('code_verifier');
      
      // Verify state parameter (CSRF protection)
      if (state !== storedState) {
        throw new Error('Invalid state parameter');
      }
      
      const response = await this.apiClient.post('/auth/token', {
        grant_type: 'authorization_code',
        code: code,
        client_id: authConfig.clientId,
        redirect_uri: authConfig.redirectUri,
        code_verifier: codeVerifier
      });
      
      const { access_token, refresh_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      // Clean up PKCE parameters
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('code_verifier');
      
      return { success: true };
    } catch (error) {
      // Clean up on error
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('code_verifier');
      
      return {
        success: false,
        error: error.response?.data?.error || 'Authentication failed'
      };
    }
  }
  
  // SSO login redirect
  ssoLogin() {
    const state = this.generateState();
    localStorage.setItem('sso_state', state);
    
    const params = new URLSearchParams({
      client_id: authConfig.clientId,
      redirect_uri: authConfig.redirectUri,
      response_type: 'code',
      state: state
    });
    
    window.location.href = `${authConfig.authServiceUrl}/sso/login?${params}`;
  }
  
  // Handle SSO callback
  async handleSSOCallback(code, state) {
    const storedState = localStorage.getItem('sso_state');
    
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }
    
    localStorage.removeItem('sso_state');
    localStorage.setItem('access_token', code);
    
    return { success: true };
  }
  
  // Refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }
      
      const response = await axios.post(`${authConfig.authServiceUrl}/auth/token`, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });
      
      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);
      
      return access_token;
    } catch (error) {
      this.logout();
      throw error;
    }
  }
  
  // Logout
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await this.apiClient.post('/sso/logout', { token });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }
  
  // Get current user info
  async getCurrentUser() {
    try {
      const response = await this.apiClient.get('/me/permissions');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get user's accessible services
  async getUserServices() {
    try {
      const response = await this.apiClient.get('/me/services');
      return response.data.services;
    } catch (error) {
      throw error;
    }
  }
  
  // Check user permission
  async checkPermission(action, resource) {
    try {
      const response = await this.apiClient.get('/me/check-permission', {
        params: { action, resource }
      });
      return response.data.allowed;
    } catch (error) {
      return false;
    }
  }
  
  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      await this.apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Password change failed'
      };
    }
  }
  
  // PKCE helper methods
  generateState() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
  }
  
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    return crypto.subtle.digest('SHA-256', data).then(digest => {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    });
  }
  
  // Utility methods
  getToken() {
    return localStorage.getItem('access_token');
  }
  
  isAuthenticated() {
    return !!this.getToken();
  }
  
  generateState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export default new AuthService();
```

### React Context Provider

```javascript
// contexts/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        isAuthenticated: true, 
        user: action.payload.user,
        passwordStatus: action.payload.passwordStatus
      };
    case 'LOGIN_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null, passwordStatus: null };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    loading: false,
    user: null,
    error: null,
    passwordStatus: null
  });
  
  useEffect(() => {
    // Check if user is already authenticated
    if (authService.isAuthenticated()) {
      loadUser();
    }
  }, []);
  
  const loadUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
    } catch (error) {
      logout();
    }
  };
  
  const initiateLogin = () => {
    dispatch({ type: 'LOGIN_START' });
    authService.initiateLogin();
  };
  
  const handleCallback = async (code, state) => {
    try {
      const result = await authService.handleCallback(code, state);
      if (result.success) {
        const user = await authService.getCurrentUser();
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { user }
        });
      } else {
        dispatch({ type: 'LOGIN_ERROR', payload: result.error });
      }
      return result;
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', payload: 'Login failed' });
      return { success: false, error: 'Login failed' };
    }
  };
  
  const ssoLogin = () => {
    authService.ssoLogin();
  };
  
  const handleSSOCallback = async (code, state) => {
    try {
      await authService.handleSSOCallback(code, state);
      await loadUser();
      return { success: true };
    } catch (error) {
      dispatch({ type: 'LOGIN_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
  };
  
  const logout = async () => {
    await authService.logout();
    dispatch({ type: 'LOGOUT' });
  };
  
  const changePassword = async (currentPassword, newPassword) => {
    return await authService.changePassword(currentPassword, newPassword);
  };
  
  const checkPermission = async (action, resource) => {
    return await authService.checkPermission(action, resource);
  };
  
  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      ssoLogin,
      handleSSOCallback,
      logout,
      changePassword,
      checkPermission,
      loadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Login Component

```javascript
// components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { initiateLogin, loading, error, isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  const handleLogin = () => {
    initiateLogin();
  };
  
  const handleSSOLogin = () => {
    // Alternative SSO method if needed
    initiateLogin();
  };
  
  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Login</h2>
        
        {error && <div className="error">{error}</div>}
        
        <div className="form-group">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={credentials.username}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <div className="sso-section">
          <hr />
          <button type="button" onClick={ssoLogin} className="sso-button">
            Login with SSO
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
```

### SSO Callback Component

```javascript
// components/SSOCallback.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';

const SSOCallback = () => {
  const [searchParams] = useSearchParams();
  const { handleSSOCallback } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (!code || !state) {
      setStatus('error');
      setError('Missing authorization code or state');
      return;
    }
    
    handleSSOCallback(code, state)
      .then((result) => {
        if (result.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setError(result.error);
        }
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, [searchParams, handleSSOCallback]);
  
  if (status === 'success') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (status === 'error') {
    return (
      <div className="callback-error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <a href="/login">Return to Login</a>
      </div>
    );
  }
  
  return (
    <div className="callback-processing">
      <h2>Processing Authentication...</h2>
      <p>Please wait while we complete your login.</p>
    </div>
  );
};

export default SSOCallback;
```

### Protected Route Component

```javascript
// components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, checkPermission } = useAuth();
  const [hasPermission, setHasPermission] = React.useState(null);
  
  React.useEffect(() => {
    if (isAuthenticated && requiredPermission) {
      const [action, resource] = requiredPermission.split(':');
      checkPermission(action, resource).then(setHasPermission);
    } else if (isAuthenticated) {
      setHasPermission(true);
    }
  }, [isAuthenticated, requiredPermission, checkPermission]);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredPermission && hasPermission === false) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }
  
  if (requiredPermission && hasPermission === null) {
    return <div>Checking permissions...</div>;
  }
  
  return children;
};

export default ProtectedRoute;
```

### Change Password Component

```javascript
// components/ChangePassword.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ChangePassword = () => {
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { changePassword, passwordStatus } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }
    
    const result = await changePassword(passwords.current, passwords.new);
    
    if (result.success) {
      setSuccess(true);
      setPasswords({ current: '', new: '', confirm: '' });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };
  
  const handleInputChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value
    });
  };
  
  return (
    <div className="change-password-container">
      <form onSubmit={handleSubmit} className="change-password-form">
        <h2>Change Password</h2>
        
        {passwordStatus?.force_change && (
          <div className="warning">
            You are required to change your password before continuing.
          </div>
        )}
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">Password changed successfully!</div>}
        
        {!passwordStatus?.force_change && (
          <div className="form-group">
            <input
              type="password"
              name="current"
              placeholder="Current Password"
              value={passwords.current}
              onChange={handleInputChange}
              required
            />
          </div>
        )}
        
        <div className="form-group">
          <input
            type="password"
            name="new"
            placeholder="New Password"
            value={passwords.new}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            name="confirm"
            placeholder="Confirm New Password"
            value={passwords.confirm}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
      
      <div className="password-requirements">
        <h4>Password Requirements:</h4>
        <ul>
          <li>At least 8 characters long</li>
          <li>One uppercase letter</li>
          <li>One lowercase letter</li>
          <li>One number</li>
          <li>One special character</li>
          <li>Cannot be same as last 5 passwords</li>
        </ul>
      </div>
    </div>
  );
};

export default ChangePassword;
```

### App Component with Routing

```javascript
// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import SSOCallback from './components/SSOCallback';
import ChangePassword from './components/ChangePassword';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<SSOCallback />} />
            <Route 
              path="/change-password" 
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredPermission="write:users">
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

## Vue.js Implementation

### Vue 3 Composition API

```javascript
// composables/useAuth.js
import { ref, reactive, computed } from 'vue';
import authService from '../services/authService';

const state = reactive({
  isAuthenticated: false,
  loading: false,
  user: null,
  error: null,
  passwordStatus: null
});

export default function useAuth() {
  const initiateLogin = () => {
    state.loading = true;
    state.error = null;
    authService.initiateLogin();
  };
  
  const handleCallback = async (code, stateParam) => {
    state.loading = true;
    state.error = null;
    
    try {
      const result = await authService.handleCallback(code, stateParam);
      if (result.success) {
        const user = await authService.getCurrentUser();
        state.isAuthenticated = true;
        state.user = user;
      } else {
        state.error = result.error;
      }
      return result;
    } catch (error) {
      state.error = 'Login failed';
      return { success: false, error: 'Login failed' };
    } finally {
      state.loading = false;
    }
  };
  
  const logout = async () => {
    await authService.logout();
    state.isAuthenticated = false;
    state.user = null;
    state.passwordStatus = null;
  };
  
  const ssoLogin = () => {
    authService.ssoLogin();
  };
  
  const handleSSOCallback = async (code, stateParam) => {
    try {
      await authService.handleSSOCallback(code, stateParam);
      const user = await authService.getCurrentUser();
      state.isAuthenticated = true;
      state.user = user;
      return { success: true };
    } catch (error) {
      state.error = error.message;
      return { success: false, error: error.message };
    }
  };
  
  return {
    // State
    isAuthenticated: computed(() => state.isAuthenticated),
    loading: computed(() => state.loading),
    user: computed(() => state.user),
    error: computed(() => state.error),
    passwordStatus: computed(() => state.passwordStatus),
    
    // Actions
    login,
    logout,
    ssoLogin,
    handleSSOCallback
  };
}
```

## Angular Implementation

### Auth Service

```typescript
// services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  password_status?: any;
}

interface User {
  username: string;
  email: string;
  roles: string[];
  groups: string[];
  effective_permissions: Array<{resource: string, action: string}>;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authServiceUrl = 'http://localhost:8080';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<User | null>(null);
  
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public user$ = this.userSubject.asObservable();
  
  constructor(private http: HttpClient) {
    if (this.getToken()) {
      this.loadUser();
    }
  }
  
  initiateLogin(): void {
    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('code_verifier', codeVerifier);
    
    const params = new URLSearchParams({
      client_id: environment.clientId,
      redirect_uri: environment.redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    window.location.href = `${this.authServiceUrl}/sso/login?${params}`;
  }
  
  handleCallback(code: string, state: string): Observable<any> {
    const storedState = localStorage.getItem('oauth_state');
    const codeVerifier = localStorage.getItem('code_verifier');
    
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }
    
    return this.http.post<TokenResponse>(`${this.authServiceUrl}/auth/token`, {
      grant_type: 'authorization_code',
      code: code,
      client_id: environment.clientId,
      redirect_uri: environment.redirectUri,
      code_verifier: codeVerifier
    }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('code_verifier');
        this.loadUser();
      }),
      catchError(error => {
        return throwError(error.error?.error || 'Login failed');
      })
    );
  }
  
  ssoLogin(): void {
    const state = this.generateState();
    localStorage.setItem('sso_state', state);
    
    const params = new URLSearchParams({
      client_id: 'your-client-id',
      redirect_uri: window.location.origin + '/auth/callback',
      response_type: 'code',
      state: state
    });
    
    window.location.href = `${this.authServiceUrl}/sso/login?${params}`;
  }
  
  handleSSOCallback(code: string, state: string): Observable<any> {
    const storedState = localStorage.getItem('sso_state');
    
    if (state !== storedState) {
      return throwError('Invalid state parameter');
    }
    
    localStorage.removeItem('sso_state');
    localStorage.setItem('access_token', code);
    
    return this.loadUser();
  }
  
  logout(): Observable<any> {
    const token = this.getToken();
    
    return this.http.post(`${this.authServiceUrl}/sso/logout`, { token }).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.isAuthenticatedSubject.next(false);
        this.userSubject.next(null);
      }),
      catchError(() => {
        // Still clear local storage even if logout fails
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.isAuthenticatedSubject.next(false);
        this.userSubject.next(null);
        return throwError('Logout failed');
      })
    );
  }
  
  private loadUser(): Observable<User> {
    return this.http.get<User>(`${this.authServiceUrl}/me/permissions`).pipe(
      tap(user => {
        this.isAuthenticatedSubject.next(true);
        this.userSubject.next(user);
      }),
      catchError(error => {
        this.logout();
        return throwError(error);
      })
    );
  }
  
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
  
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// HTTP Interceptor for adding auth token
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.authService.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }
}
```

## Best Practices

### 1. Security
- Store tokens in `localStorage` (not `sessionStorage` for persistence)
- Implement proper CSRF protection with state parameter
- Use HTTPS in production
- Implement token refresh logic
- Clear tokens on logout

### 2. User Experience
- Handle password change requirements gracefully
- Show loading states during authentication
- Provide clear error messages
- Implement auto-logout on token expiration

### 3. State Management
- Use context/store for authentication state
- Persist authentication state across page refreshes
- Handle authentication state consistently across components

### 4. Error Handling
- Implement retry logic for network failures
- Handle 401 responses with token refresh
- Provide fallback authentication methods

## Testing

### Unit Tests Example (Jest + React Testing Library)

```javascript
// __tests__/authService.test.js
import authService from '../services/authService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });
  
  test('login success', async () => {
    const mockResponse = {
      data: {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 900
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    const result = await authService.login('testuser', 'password');
    
    expect(result.success).toBe(true);
    expect(localStorage.getItem('access_token')).toBe('test-token');
  });
  
  test('login failure', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: 'Invalid credentials' } }
    });
    
    const result = await authService.login('testuser', 'wrongpassword');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });
});
```

## Related Documentation

- [API Documentation](./API.md)
- [SSO Integration Guide](./SSO_INTEGRATION.md)
- [Client Credentials Guide](./CLIENT_CREDENTIALS.md)