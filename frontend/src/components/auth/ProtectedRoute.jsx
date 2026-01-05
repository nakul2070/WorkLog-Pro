import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    // Don't make a decision until we've checked for a token
    return null; // Or a loading spinner
  }

  if (!token) {
    // User is not logged in, redirect to landing page
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // User is logged in, show the component they asked for
  return children;
};

export default ProtectedRoute;