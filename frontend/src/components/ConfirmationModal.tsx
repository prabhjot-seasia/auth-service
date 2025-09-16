import React from 'react';
import './UserManagement.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getTypeClass = () => {
    switch (type) {
      case 'danger':
        return 'modal-danger';
      case 'warning':
        return 'modal-warning';
      case 'info':
        return 'modal-info';
      default:
        return 'modal-warning';
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn btn-danger';
      case 'warning':
        return 'btn btn-warning';
      case 'info':
        return 'btn btn-primary';
      default:
        return 'btn btn-warning';
    }
  };

  return (
    <div className="confirmation-overlay" onClick={onCancel}>
      <div className={`confirmation-dialog ${getTypeClass()}`} onClick={e => e.stopPropagation()}>
        <div className="confirmation-content">
          <div className="confirmation-icon-wrapper">
            {type === 'danger' && (
              <div className="confirmation-icon danger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {type === 'warning' && (
              <div className="confirmation-icon warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86ZM12 9V13M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {type === 'info' && (
              <div className="confirmation-icon info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
          
          <div className="confirmation-text">
            <h3 className="confirmation-title">{title}</h3>
            <p className="confirmation-message">{message}</p>
          </div>
        </div>
        
        <div className="confirmation-actions">
          <button className="confirmation-btn confirmation-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`confirmation-btn confirmation-btn-confirm ${type}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;