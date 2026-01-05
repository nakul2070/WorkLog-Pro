import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  return (
    <ProtectedRoute>
      <RoleChecker allowedRoles={allowedRoles}>
        {children}
      </RoleChecker>
    </ProtectedRoute>
  );
};

const RoleChecker = ({ children, allowedRoles }) => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return null; // ProtectedRoute handles loading
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user has one of the allowed roles
  const hasAccess = allowedRoles.some(role => {
    if (role === 'admin') return user.isAdmin;
    if (role === 'projectManager') return user.isProjectManager;
    if (role === 'employee') return !user.isAdmin && !user.isProjectManager;
    return false;
  });

  if (!hasAccess) {
    // Redirect to appropriate dashboard based on user's actual role
    if (user.isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.isProjectManager) {
      return <Navigate to="/pm/dashboard" replace />;
    } else {
      return <Navigate to="/employee" replace />;
    }
  }

  return children;
};

export default RoleProtectedRoute;

