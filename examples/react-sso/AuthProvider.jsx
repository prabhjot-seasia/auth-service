import React, { createContext, useContext, useState, useEffect } from 'react';
import ssoService from './ssoService';

// Create Auth Context
const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      if (ssoService.isAuthenticated()) {
        // Validate existing token
        const validation = await ssoService.validateToken();
        
        if (validation.valid) {
          setUser({
            id: validation.user_id,
            username: validation.username,
            email: validation.email,
            roles: validation.roles,
            groups: validation.groups,
            permissions: validation.permissions
          });
        } else {
          // Token invalid, clear it
          ssoService.clearToken();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await ssoService.login(username, password);
      
      if (result.success && result.userInfo.valid) {
        setUser({
          id: result.userInfo.user_id,
          username: result.userInfo.username,
          email: result.userInfo.email,
          roles: result.userInfo.roles,
          groups: result.userInfo.groups,
          permissions: result.userInfo.permissions
        });
        
        return { success: true };
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await ssoService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role) => {
    return user?.roles?.includes(role) || false;
  };

  const hasPermission = (resource, action) => {
    return user?.permissions?.some(p => 
      p.resource === resource && p.action === action
    ) || false;
  };

  const checkPermission = async (resource, action) => {
    try {
      const result = await ssoService.checkPermission(resource, action);
      return result.allowed;
    } catch (err) {
      console.error('Permission check error:', err);
      return false;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    hasRole,
    hasPermission,
    checkPermission,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};