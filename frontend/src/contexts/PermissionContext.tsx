import { API_URL } from '../config';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

interface Permission {
  id: string;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

interface PermissionContextType {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (action: string, resource: string) => boolean;
  checkPermission: (action: string, resource: string) => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  // Define public routes that don't need permission checks
  const isPublicRoute = location.pathname === '/login';

  const refreshPermissions = async () => {
    try {
      // Don't fetch permissions on public routes
      if (isPublicRoute) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('jwt');
      
      if (!token) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Basic token validation - check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
          // Token is expired, clear it
          localStorage.removeItem('jwt');
          localStorage.removeItem('refresh_token');
          setPermissions([]);
          setLoading(false);
          return;
        }
      } catch (tokenError) {
        // Invalid token format, clear it
        localStorage.removeItem('jwt');
        localStorage.removeItem('refresh_token');
        setPermissions([]);
        setLoading(false);
        return;
      }

      const response = await axios.get(API_URL + '/me/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const effectivePermissions = response.data.effective_permissions || [];
      setPermissions(effectivePermissions);
    } catch (error: any) {
      // On 401 or other auth errors, clear permissions and don't retry
      if (error.response?.status === 401) {
        setPermissions([]);
        localStorage.removeItem('jwt');
        localStorage.removeItem('refresh_token');
      } else {
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (action: string, resource: string): boolean => {
    // Map write permission to CRUD operations
    if (action === 'create' || action === 'update' || action === 'delete') {
      const hasWrite = permissions.some(perm => 
        perm.resource === resource && perm.action === 'write'
      );
      if (hasWrite) {
        return true;
      }
    }
    
    // Check for exact permission match
    return permissions.some(perm => 
      perm.resource === resource && perm.action === action
    );
  };

  const checkPermission = async (action: string, resource: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('jwt'); // Fix: AuthProvider stores as 'jwt'
      if (!token) return false;

      const response = await axios.get(
        `${API_URL}/me/check-permission?action=${action}&resource=${resource}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.allowed || false;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [location.pathname]); // Refresh when route changes

  // Refresh permissions when user logs in
  useEffect(() => {
    const handleLogin = () => {
      refreshPermissions();
    };

    // Listen for custom login event from AuthProvider
    window.addEventListener('auth-login', handleLogin);

    return () => {
      window.removeEventListener('auth-login', handleLogin);
    };
  }, []);

  const value: PermissionContextType = {
    permissions,
    loading,
    hasPermission,
    checkPermission,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Higher-order component for conditional rendering based on permissions
interface RequirePermissionProps {
  action: string;
  resource: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ 
  action, 
  resource, 
  children, 
  fallback = null 
}) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <>{fallback}</>;
  }

  const allowed = hasPermission(action, resource);
  return allowed ? <>{children}</> : <>{fallback}</>;
};