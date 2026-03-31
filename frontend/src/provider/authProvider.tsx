import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

interface PasswordStatus {
  force_change: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  days_until_expiry: number;
  expiry_warning_days: number;
}

interface LoginResponse {
  success: boolean;
  passwordStatus?: PasswordStatus;
  token?: string;
}

interface AuthContextType {
  token: string | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  initiateLogin: () => void;
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
  const initializeToken = () => {
    const storedToken = localStorage.getItem('jwt');
    if (!storedToken) return null;

    try {
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem('jwt');
        localStorage.removeItem('refresh_token');
        return null;
      }
      return storedToken;
    } catch {
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
      const response = await axios.get(`${API_URL}/me/permissions`);
      setUser(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleUnauthorized();
      }
    }
  };

  const handleUnauthorized = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setRefreshTokenValue(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  };

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });

      const { code, password_status } = loginResponse.data;

      const currentParams = new URLSearchParams(window.location.search);
      const tokenRequestData: any = {
        grant_type: 'authorization_code',
        code: code,
      };

      if (currentParams.has('client_id')) {
        tokenRequestData.client_id = currentParams.get('client_id');
        tokenRequestData.redirect_uri = currentParams.get('redirect_uri') || `${window.location.origin}/auth/callback`;
      }

      const tokenResponse = await axios.post(`${API_URL}/auth/token`, tokenRequestData);

      const { access_token, refresh_token } = tokenResponse.data;

      localStorage.setItem('jwt', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
        setRefreshTokenValue(refresh_token);
      }

      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      window.dispatchEvent(new Event('auth-login'));
      await fetchUserPermissions();

      return { success: true, passwordStatus: password_status, token: access_token };
    } catch {
      localStorage.removeItem('jwt');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setRefreshTokenValue(null);
      delete axios.defaults.headers.common['Authorization'];
      return { success: false };
    }
  };

  const initiateLogin = (): void => {
    const clientId = process.env.REACT_APP_CLIENT_ID || 'auth-service-client';
    const redirectUri = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/auth/callback`;

    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(128);
    const codeChallenge = generateCodeChallenge(codeVerifier);

    localStorage.setItem('oauth_state', state);
    localStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    window.location.href = `${API_URL}/sso/login?${params}`;
  };

  const logout = async () => {
    try {
      const currentToken = localStorage.getItem('jwt');
      if (currentToken) {
        await axios.post(`${API_URL}/sso/logout`, { token: currentToken });
      }
    } catch {
    } finally {
      localStorage.removeItem('jwt');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setRefreshTokenValue(null);
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const refreshToken = async () => {
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_URL}/auth/token`, {
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
      });

      const { access_token } = response.data;

      localStorage.setItem('jwt', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await fetchUserPermissions();
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleUnauthorized();
      } else {
        logout();
      }
      throw error;
    }
  };

  axios.interceptors.response.use(
    (response) => response,
    async (error: any) => {
      const originalRequest = error.config;

      if (error.response?.status === 401) {
        const isAuthEndpoint = originalRequest.url?.includes('/auth/token') ||
                              originalRequest.url?.includes('/auth/login');

        if (!originalRequest._retry && refreshTokenValue && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            return axios(originalRequest);
          } catch (refreshError) {
            handleUnauthorized();
            return Promise.reject(refreshError);
          }
        } else {
          handleUnauthorized();
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  const generateRandomString = (length: number): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
  };

  const generateCodeChallenge = (codeVerifier: string): string => {
    return btoa(codeVerifier)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  return (
    <AuthContext.Provider value={{ token, login, initiateLogin, logout, refreshToken, user }}>
      {children}
    </AuthContext.Provider>
  );
};
