import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../provider/authProvider';
import './UserManagement.css';
import './shared.css';

interface PasswordStatus {
  force_change: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  days_until_expiry: number;
  expiry_warning_days: number;
  last_password_change?: string;
  password_expires_at?: string;
}

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  passwordStatus?: PasswordStatus;
  isForced?: boolean;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
  passwordStatus,
  isForced = false
}) => {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(API_URL + '/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        if (isForced) {
          window.location.reload(); // Reload to get new token without force change
        }
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthIndicator = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    
    const getSegmentColor = (level: number) => {
      if (passedChecks >= level) {
        return passedChecks <= 2 ? '#dc3545' : passedChecks <= 3 ? '#ffc107' : '#28a745';
      }
      return '#e9ecef';
    };
    
    return (
      <div>
        <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              style={{
                height: '4px',
                flex: 1,
                background: getSegmentColor(level),
                borderRadius: '2px',
                transition: 'background-color 0.2s'
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '12px', color: checks.length ? '#28a745' : '#dc3545', transition: 'color 0.2s' }}>
            ✓ At least 8 characters
          </div>
          <div style={{ fontSize: '12px', color: checks.uppercase ? '#28a745' : '#dc3545', transition: 'color 0.2s' }}>
            ✓ One uppercase letter
          </div>
          <div style={{ fontSize: '12px', color: checks.lowercase ? '#28a745' : '#dc3545', transition: 'color 0.2s' }}>
            ✓ One lowercase letter
          </div>
          <div style={{ fontSize: '12px', color: checks.numbers ? '#28a745' : '#dc3545', transition: 'color 0.2s' }}>
            ✓ One number
          </div>
          <div style={{ fontSize: '12px', color: checks.special ? '#28a745' : '#dc3545', transition: 'color 0.2s' }}>
            ✓ One special character
          </div>
        </div>
      </div>
    );
  };

  const getModalTitle = () => {
    if (passwordStatus?.is_expired) return 'Password Expired - Change Required';
    if (passwordStatus?.force_change) return 'Password Change Required';
    if (passwordStatus?.is_expiring_soon) return 'Password Expiring Soon';
    return 'Change Password';
  };

  const getModalMessage = () => {
    if (passwordStatus?.is_expired) {
      return 'Your password has expired and must be changed before you can continue.';
    }
    if (passwordStatus?.force_change) {
      return 'You must change your password before you can access the system.';
    }
    if (passwordStatus?.is_expiring_soon) {
      return `Your password will expire in ${passwordStatus.days_until_expiry} days. Please change it now to avoid interruption.`;
    }
    return 'Update your password to maintain security.';
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header" style={{ background: '#d4edda', color: '#155724', borderBottom: '1px solid #c3e6cb' }}>
            <h3>✓ Password Changed Successfully!</h3>
          </div>
          <div className="user-form">
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '48px', color: '#28a745', marginBottom: '1rem' }}>✓</div>
              <p style={{ margin: '0.5rem 0', color: '#495057' }}>Your password has been updated successfully.</p>
              {isForced && <p style={{ margin: '0.5rem 0', color: '#6c757d' }}>Refreshing the page...</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{getModalTitle()}</h3>
          {!isForced && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        <div className="user-form">
          <div style={{ 
            background: passwordStatus?.is_expired ? '#f8d7da' : passwordStatus?.force_change ? '#fff3cd' : '#d1ecf1', 
            borderLeft: `4px solid ${passwordStatus?.is_expired ? '#dc3545' : passwordStatus?.force_change ? '#ffc107' : '#17a2b8'}`, 
            padding: '12px 16px', 
            marginBottom: '20px', 
            borderRadius: '4px', 
            fontSize: '14px', 
            color: '#495057' 
          }}>
            {getModalMessage()}
          </div>

          {passwordStatus?.password_expires_at && (
            <div style={{ marginBottom: '20px', paddingBottom: '8px', borderBottom: '1px solid #e9ecef' }}>
              <small style={{ color: '#6c757d', fontSize: '12px' }}>
                Current password expires: {new Date(passwordStatus.password_expires_at).toLocaleDateString()}
              </small>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="current-password">
                {passwordStatus?.force_change ? 'Temporary Password' : 'Current Password'} *
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required={!passwordStatus?.force_change}
                disabled={loading}
                placeholder={passwordStatus?.force_change ? 'Enter your temporary password' : 'Enter current password'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password *</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter new password"
              />
              {newPassword && (
                <div style={{ marginTop: '8px', marginBottom: '10px' }}>
                  {getPasswordStrengthIndicator(newPassword)}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password *</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-actions">
              {!isForced && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !newPassword || !confirmPassword || (!passwordStatus?.force_change && !currentPassword)}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};