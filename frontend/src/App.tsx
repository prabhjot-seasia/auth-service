import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './provider/authProvider';
import { PermissionProvider } from './contexts/PermissionContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <PermissionProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </PermissionProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
