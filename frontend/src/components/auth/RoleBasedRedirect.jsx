import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const RoleBasedRedirect = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-4 text-xl text-slate-700">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect based on user role
  if (user.isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.isProjectManager) {
    return <Navigate to="/pm/dashboard" replace />;
  } else {
    // Regular employee - redirect to /employee which shows timesheet entry by default
    return <Navigate to="/employee" replace />;
  }
};

export default RoleBasedRedirect;

