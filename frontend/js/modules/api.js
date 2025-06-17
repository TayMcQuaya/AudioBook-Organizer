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

// Get backend URL from global config
const BACKEND_URL = window.BACKEND_URL;

/**
 * Enhanced fetch wrapper for API calls
 * @param {string} endpoint - API endpoint (starting with /)
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(endpoint, options = {}) {
    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }

    // Remove double slashes in URL except after protocol
    const url = `${BACKEND_URL}${endpoint}`.replace(/([^:]\/)\/+/g, '$1');

    // Default options with auth token if available
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    // Add authorization header if available
    const token = localStorage.getItem('sb-access-token');
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
        delete defaultHeaders['Content-Type'];
    }

    // Merge options
    const finalOptions = {
        credentials: 'include', // Include cookies for CORS
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(url, finalOptions);
        
        // Log failed requests for debugging
        if (!response.ok) {
            console.error(`API Error (${response.status}):`, {
                endpoint,
                status: response.status,
                statusText: response.statusText
            });
        }
        
        return response;
    } catch (error) {
        console.error('API Request Failed:', error);
        throw error;
    }
}

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

// Export other API-related utilities here if needed 