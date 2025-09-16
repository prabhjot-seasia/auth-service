import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../provider/authProvider';
import { PasswordChangeModal } from './PasswordChangeModal';
import seasiaLogo from '../assets/seasia-logo.svg';
import './Login.css';

interface PasswordStatus {
  force_change: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  days_until_expiry: number;
  expiry_warning_days: number;
}

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginResponse = await login(username, password);
      
      // Check if password change is required
      if (loginResponse.passwordStatus && 
          (loginResponse.passwordStatus.force_change || 
           loginResponse.passwordStatus.is_expired)) {
        setPasswordStatus(loginResponse.passwordStatus);
        setShowPasswordModal(true);
      } else if (loginResponse.passwordStatus?.is_expiring_soon) {
        // Show warning but allow login
        setPasswordStatus(loginResponse.passwordStatus);
        setShowPasswordModal(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeComplete = () => {
    setShowPasswordModal(false);
    setPasswordStatus(null);
    navigate('/dashboard');
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
      
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={handlePasswordChangeComplete}
        passwordStatus={passwordStatus || undefined}
        isForced={passwordStatus?.force_change || passwordStatus?.is_expired}
      />
    </div>
  );
};