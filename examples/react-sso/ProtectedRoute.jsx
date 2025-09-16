import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// Protected Route Component
export const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { user, loading, hasRole, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Check required role if specified
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You do not have the required role: {requiredRole}</p>
      </div>
    );
  }

  // Check required permission if specified
  if (requiredPermission) {
    const { resource, action } = requiredPermission;
    if (!hasPermission(resource, action)) {
      return (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to {action} {resource}</p>
        </div>
      );
    }
  }

  // User is authenticated and has required permissions
  return children;
};

// Permission Check Component - conditionally renders children
export const RequirePermission = ({ resource, action, children, fallback }) => {
  const { hasPermission } = useAuth();

  if (hasPermission(resource, action)) {
    return children;
  }

  return fallback || null;
};

// Role Check Component - conditionally renders children
export const RequireRole = ({ role, children, fallback }) => {
  const { hasRole } = useAuth();

  if (hasRole(role)) {
    return children;
  }

  return fallback || null;
};