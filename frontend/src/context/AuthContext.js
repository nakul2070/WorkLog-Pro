import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { Loader2 } from 'lucide-react';
const USE_MOCK_AUTH = false; // set false for real backend authentication

import { mockCurrentUser } from "../data/mock";
// Get the backend URL from the environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// 1. Create the Context
export const AuthContext = createContext();

// Custom hook to use the context easily
export const useAuth = () => {
  return useContext(AuthContext);
};

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
 const [token, setToken] = useState(USE_MOCK_AUTH ? "mock-token" : localStorage.getItem('authToken'));

  const [isLoading, setIsLoading] = useState(true); // Loading on initial app load

  // Function to fetch the current user if we have a token
  const fetchCurrentUser = useCallback(async (authToken) => {
    console.log("AuthContext: Fetching current user...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/employees/current`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log("AuthContext: Response status:", response.status);
      
      if (!response.ok) {
        // Try to parse JSON error response
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || 'Authentication failed';
          console.error("AuthContext: Response error:", errorData);
          
          // Special handling for token expiration
          if (response.status === 401 && errorMessage.includes('expired')) {
            console.warn("AuthContext: Token expired, clearing and redirecting to login...");
          }
        } catch (e) {
          errorMessage = await response.text();
        }
        throw new Error(`Failed to fetch user: ${response.status} - ${errorMessage}`);
      }

      const result = await response.json();
      console.log("AuthContext: Response data:", result);
      
      if (result.success && result.data) {
        setUser(result.data); // Set the user object
        console.log("AuthContext: User data loaded:", result.data);
        setIsLoading(false); // Stop loading on success
      } else {
        throw new Error(result.error || 'Invalid user data');
      }
    } catch (error) {
      console.error("AuthContext: Error fetching user:", error);
      console.error("AuthContext: Full error details:", {
        message: error.message,
        token: authToken ? 'Present (length: ' + authToken.length + ')' : 'Missing'
      });
      // Clear invalid token and logout
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
      setIsLoading(false); // Stop loading on failure
    }
  }, []);

  // Check for token in localStorage on initial app load
  useEffect(() => {
  const checkAuth = async () => {
    if (USE_MOCK_AUTH) {
      console.log("🔧 AuthContext: Running in MOCK AUTH MODE (skipping login)");
      setUser(mockCurrentUser);
      setIsLoading(false);
      return;
    }

    if (token) {
      await fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  };

  checkAuth();
}, [token, fetchCurrentUser]);



  // Login function: called by the callback page
  const login = (authToken) => {
    localStorage.setItem('authToken', authToken);
    setToken(authToken); // This will trigger the useEffect above to fetch the user
  };

  // Logout function
  const logout = () => {
  console.log("AuthContext: Logging out and clearing all auth data");
  localStorage.removeItem('authToken');
  setToken(null);
  setUser(null);

  if (!USE_MOCK_AUTH) {
    window.location.href = '/';
  } else {
    console.log("Mock mode active — staying on current page");
  }
};


  // Show a loading spinner for the whole app while we check for a user
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Value to be passed to all components
  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!token && !!user // Simple check
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};