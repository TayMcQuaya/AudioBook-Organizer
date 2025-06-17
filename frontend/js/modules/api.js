/**
 * Determines the base URL for the API based on the environment.
 * In local development, it uses relative paths to the local server.
 * In production, it points to the deployed backend on DigitalOcean.
 */
const getApiBaseUrl = () => {
  // Check if we're in local development
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.includes('local');
  
  // Check for development environment
  const isDevelopment = window.location.hostname.includes('localhost') ||
                       window.location.hostname.includes('127.0.0.1') ||
                       window.location.port !== '';
  
  if (isLocal || isDevelopment) {
    // Local development - use relative paths
    return '';
  } else {
    // Production environment - use environment variable or fallback
    // This will be set during deployment
    return window.BACKEND_URL || 'https://your-backend-url.ondigitalocean.app';
  }
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * A wrapper around the native fetch function that automatically prepends
 * the correct API base URL to the request URL and includes proper headers.
 *
 * @param {string} url - The API endpoint (e.g., '/api/auth/status').
 * @param {object} options - The options object for the fetch call.
 * @returns {Promise<Response>} The promise returned by fetch.
 */
export const apiFetch = (url, options = {}) => {
  const apiUrl = `${API_BASE_URL}${url}`;
  
  // Ensure proper headers are set
  const defaultHeaders = {};
  
  // Only set Content-Type for non-FormData requests
  // FormData automatically sets the correct Content-Type with boundary
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  
  // Add authorization header if available
  const token = localStorage.getItem('sb-access-token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge headers and ensure credentials are included for session-based auth
  const mergedOptions = {
    credentials: 'include', // Include cookies for session-based authentication
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  console.log(`API Request: ${apiUrl}`, mergedOptions);
  return fetch(apiUrl, mergedOptions);
};

/**
 * Helper function to check if the API is reachable
 */
export const checkApiHealth = async () => {
  try {
    const response = await apiFetch('/api/test');
    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error('API health check failed:', error);
    return { success: false, error: error.message };
  }
}; 