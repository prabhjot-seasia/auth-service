import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../provider/authProvider';
import seasiaLogo from '../assets/seasia-logo.svg';
import './Login.css';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        if (result.passwordStatus?.force_change) {
          sessionStorage.setItem('forcePasswordChange', 'true');
          navigate('/password-change');
          return;
        }

        const searchParams = new URLSearchParams(location.search);
        const clientId = searchParams.get('client_id');
        const redirectUri = searchParams.get('redirect_uri');
        const responseType = searchParams.get('response_type');
        const state = searchParams.get('state');

        if (clientId && redirectUri && responseType === 'code') {
          const token = localStorage.getItem('jwt') || result.token;

          if (token) {
            const ssoUrl = `http://localhost:8080/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}${state ? `&state=${encodeURIComponent(state)}` : ''}&token=${encodeURIComponent(token)}`;
            window.location.replace(ssoUrl);
            return;
          }
        }

        navigate('/dashboard');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src={seasiaLogo} alt="Seasia" />
        </div>
        <h3>Login</h3>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
