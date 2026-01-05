import React, { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // Go up one level to context
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, user } = useContext(AuthContext);

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      console.log("AuthCallback: Token found, logging in...");
      login(token); // Save the token to context/localStorage
      // Navigation will be handled by RoleBasedRedirect after user is loaded
    } else {
      console.error("AuthCallback: No token found in URL.");
      navigate('/', { replace: true }); // Redirect to landing page
    }
  }, [searchParams, login, navigate]);

  // After login, wait for user to load and redirect based on role
  useEffect(() => {
    if (user) {
      // Small delay to ensure user data is fully loaded
      const timer = setTimeout(() => {
        if (user.isAdmin) {
          navigate('/admin/dashboard', { replace: true });
        } else if (user.isProjectManager) {
          navigate('/pm/dashboard', { replace: true });
        } else {
          navigate('/employee', { replace: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Show a loading spinner while we process
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <span className="ml-4 text-xl text-slate-700">Authenticating...</span>
    </div>
  );
};

export default AuthCallback;