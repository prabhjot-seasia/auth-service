import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../provider/authProvider';

export const ProtectedRoute: React.FC = () => {
  const { token } = useAuth();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};