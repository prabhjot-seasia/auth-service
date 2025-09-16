// SSO Service for React Application
import axios from 'axios';

const SSO_BASE_URL = process.env.REACT_APP_SSO_URL || 'http://localhost:8080';
const SERVICE_ID = process.env.REACT_APP_SERVICE_ID || '22222222-2222-2222-2222-222222222222';
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3002/auth/callback';

class SSOService {
  constructor() {
    this.baseURL = SSO_BASE_URL;
    this.serviceId = SERVICE_ID;
    this.redirectUri = REDIRECT_URI;
    
    // Setup axios interceptor to add token to all requests
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor to add auth token
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear storage and redirect to login
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Store token in localStorage
  setToken(token) {
    localStorage.setItem('sso_token', token);
  }

  // Get token from localStorage
  getToken() {
    return localStorage.getItem('sso_token');
  }

  // Remove token from localStorage
  clearToken() {
    localStorage.removeItem('sso_token');
    localStorage.removeItem('sso_user');
  }

  // Store user info
  setUserInfo(userInfo) {
    localStorage.setItem('sso_user', JSON.stringify(userInfo));
  }

  // Get user info
  getUserInfo() {
    const userStr = localStorage.getItem('sso_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Login via SSO
  async login(username, password) {
    try {
      const response = await axios.post(`${this.baseURL}/sso/login`, {
        username,
        password,
        service_id: this.serviceId,
        redirect_uri: this.redirectUri
      });

      if (response.data.success) {
        this.setToken(response.data.access_token);
        
        // Validate token to get user info
        const userInfo = await this.validateToken();
        if (userInfo.valid) {
          this.setUserInfo(userInfo);
        }
        
        return {
          success: true,
          token: response.data.access_token,
          redirectUri: response.data.redirect_uri,
          userInfo
        };
      } else {
        throw new Error(response.data.error || 'Login failed');
      }
    } catch (error) {
      console.error('SSO login error:', error);
      throw error;
    }
  }

  // Validate current token
  async validateToken(token = null) {
    try {
      const tokenToValidate = token || this.getToken();
      if (!tokenToValidate) {
        return { valid: false, error: 'No token provided' };
      }

      const response = await axios.get(`${this.baseURL}/sso/validate`, {
        headers: {
          Authorization: `Bearer ${tokenToValidate}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false, error: error.message };
    }
  }

  // Check if user has specific permission
  async checkPermission(resource, action) {
    try {
      const token = this.getToken();
      if (!token) {
        return { allowed: false, error: 'No token' };
      }

      const response = await axios.post(`${this.baseURL}/sso/check-permission`, {
        token,
        resource,
        action
      });

      return response.data;
    } catch (error) {
      console.error('Permission check error:', error);
      return { allowed: false, error: error.message };
    }
  }

  // Logout from SSO
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await axios.post(`${this.baseURL}/sso/logout`, { token });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }

  // Get current user roles
  getUserRoles() {
    const userInfo = this.getUserInfo();
    return userInfo?.roles || [];
  }

  // Check if user has specific role
  hasRole(role) {
    const roles = this.getUserRoles();
    return roles.includes(role);
  }

  // Get user permissions
  getUserPermissions() {
    const userInfo = this.getUserInfo();
    return userInfo?.permissions || [];
  }

  // Check if user has specific permission
  hasPermission(resource, action) {
    const permissions = this.getUserPermissions();
    return permissions.some(p => p.resource === resource && p.action === action);
  }
}

// Create singleton instance
const ssoService = new SSOService();
export default ssoService;