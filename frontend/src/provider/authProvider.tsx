import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface PasswordStatus {
  force_change: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  days_until_expiry: number;
  expiry_warning_days: number;
}

interface LoginResponse {
  passwordStatus?: PasswordStatus;
}

interface AuthContextType {
  token: string | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  user: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize with token validation
  const initializeToken = () => {
    const storedToken = localStorage.getItem('jwt');
    if (!storedToken) return null;
    
    try {
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired, clear it
        localStorage.removeItem('jwt');
        localStorage.removeItem('refresh_token');
        return null;
      }
      return storedToken;
    } catch (error) {
      // Invalid token format, clear it
      localStorage.removeItem('jwt');
      localStorage.removeItem('refresh_token');
      return null;
    }
  };

  const [token, setToken] = useState<string | null>(initializeToken());
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(
    token ? localStorage.getItem('refresh_token') : null
  );
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserPermissions();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchUserPermissions = async () => {
    try {
      const response = await axios.get('http://localhost:8080/me/permissions');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user permissions:', error);
    }
  };

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await axios.post('http://localhost:8080/auth/token', {
        grant_type: 'password',
        username,
        password,
      });

      const { access_token, refresh_token, password_status } = response.data;
      
      localStorage.setItem('jwt', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      setToken(access_token);
      setRefreshTokenValue(refresh_token);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      
      // Trigger a custom event to notify PermissionContext
      window.dispatchEvent(new Event('auth-login'));
      
      return { passwordStatus: password_status };
    } catch (error) {
      // Ensure no tokens are left in localStorage on login failure
      localStorage.removeItem('jwt');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setRefreshTokenValue(null);
      delete axios.defaults.headers.common['Authorization'];
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshToken = async () => {
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('http://localhost:8080/auth/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
      });

      const { access_token } = response.data;
      
      localStorage.setItem('jwt', access_token);
      setToken(access_token);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await fetchUserPermissions();
    } catch (error) {
      logout();
      throw error;
    }
  };

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Don't try to refresh tokens for authentication endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/auth/token');
      
      if (error.response?.status === 401 && !originalRequest._retry && refreshTokenValue && !isAuthEndpoint) {
        originalRequest._retry = true;
        
        try {
          await refreshToken();
          return axios(originalRequest);
        } catch (refreshError) {
          logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );

  return (
    <AuthContext.Provider value={{ token, login, logout, refreshToken, user }}>
      {children}
    </AuthContext.Provider>
  );
};