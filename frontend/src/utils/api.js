/**
 * API utility for making authenticated requests to the backend
 * Automatically includes JWT token from localStorage
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Make authenticated API request
 * Automatically includes JWT token from localStorage in Authorization header
 * Handles 401 errors by clearing token and redirecting to login
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  
  // Validate BACKEND_URL is configured
  if (!BACKEND_URL) {
    console.error('❌ BACKEND_URL is not configured. Please set REACT_APP_BACKEND_URL environment variable.');
    throw new Error('Backend URL is not configured. Please contact support.');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fullUrl = `${BACKEND_URL}${endpoint}`;
  console.log(`🌐 API Request: ${options.method || 'GET'} ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('authToken');
      // Redirect to login page
      window.location.href = '/';
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  } catch (error) {
    // Handle network errors (connection refused, CORS, timeout, etc.)
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error('❌ Network error details:', {
        error: error.message,
        endpoint: fullUrl,
        method: options.method || 'GET',
        backendUrl: BACKEND_URL,
        hasToken: !!token
      });
      
      // Provide more specific error message
      let errorMessage = 'Unable to connect to server. ';
      if (!BACKEND_URL || BACKEND_URL === 'undefined') {
        errorMessage += 'Backend URL is not configured.';
      } else {
        errorMessage += 'Please check if the backend server is running and try again.';
      }
      
      throw new Error(errorMessage);
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Parse JSON response with error handling
 */
async function parseJsonResponse(response) {
  let jsonData;
  try {
    const text = await response.text();
    if (!text) {
      // Empty response - return success for DELETE operations
      return { success: response.ok, data: null };
    }
    jsonData = JSON.parse(text);
  } catch (error) {
    // JSON parsing failed - this is a real error
    console.error('❌ Failed to parse JSON response:', error);
    throw new Error(`Invalid response from server: ${response.status} ${response.statusText}`);
  }
  
  // If HTTP status indicates error but JSON parsing succeeded, ensure success field reflects it
  if (!response.ok && jsonData.success !== false) {
    jsonData.success = false;
    if (!jsonData.error) {
      jsonData.error = `Server error: ${response.status} ${response.statusText}`;
    }
  }
  
  return jsonData;
}

/**
 * Make GET request with authentication
 */
export async function apiGet(endpoint) {
  const response = await apiRequest(endpoint, { method: 'GET' });
  return parseJsonResponse(response);
}

/**
 * Make POST request with authentication
 */
export async function apiPost(endpoint, data) {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return parseJsonResponse(response);
}

/**
 * Make PUT request with authentication
 */
export async function apiPut(endpoint, data) {
  const response = await apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return parseJsonResponse(response);
}

/**
 * Make DELETE request with authentication
 */
export async function apiDelete(endpoint) {
  const response = await apiRequest(endpoint, { method: 'DELETE' });
  return parseJsonResponse(response);
}















