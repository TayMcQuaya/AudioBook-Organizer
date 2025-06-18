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
    return window.ENVIRONMENT_CONFIG?.BACKEND_URL || window.BACKEND_URL || 'https://audiobook-organizer-test-vdhku.ondigitalocean.app';
  }
};

export const API_BASE_URL = getApiBaseUrl();

// Use the same logic for the main BACKEND_URL variable
const BACKEND_URL = getApiBaseUrl();

console.log('🔧 API Configuration:', {
    hostname: window.location.hostname,
    port: window.location.port,
    isLocalDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    finalBackendUrl: BACKEND_URL || '(relative paths)',
    environmentConfig: window.ENVIRONMENT_CONFIG?.BACKEND_URL
});

/**
 * Enhanced fetch wrapper for API calls.
 * This is the single source for all API requests in the application.
 *
 * @param {string} endpoint - API endpoint (e.g., '/auth/status').
 * @param {object} options - Fetch options object.
 * @returns {Promise<Response>} The promise returned by fetch.
 */
export async function apiFetch(endpoint, options = {}) {
    // Ensure endpoint starts with a single '/'
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }

    // Construct the full URL, preventing double slashes
    const url = `${BACKEND_URL}${endpoint}`.replace(/([^:]\/)\/+/g, '$1');

    // Prepare default headers
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Add Supabase authorization header if a token exists
    const token = localStorage.getItem('sb-access-token');
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // Add temp auth token if in testing mode
    if (window.ENVIRONMENT_CONFIG?.IS_TESTING_MODE) {
        const tempToken = localStorage.getItem('temp_auth_token');
        if (tempToken) {
            // Use Authorization header for token-based auth (primary method)
            defaultHeaders['Authorization'] = `Bearer ${tempToken}`;
            // Also send as X-Temp-Auth header as backup
            defaultHeaders['X-Temp-Auth'] = tempToken;
        }
        // Legacy fallback: check if authenticated via session
        else if (window.tempAuthManager?.isAuthenticated) {
            defaultHeaders['X-Temp-Auth'] = 'authenticated';
        }
        // Emergency fallback: check localStorage backup
        else if (localStorage.getItem('temp_auth_backup') === 'true') {
            defaultHeaders['X-Testing-Override'] = 'temp-auth-bypass';
            console.log('🔧 Using localStorage backup for temp auth');
        }
    }

    // Modern browsers handle FormData Content-Type automatically,
    // so we remove our default to let the browser set it with the correct boundary.
    if (options.body instanceof FormData) {
        delete defaultHeaders['Content-Type'];
    }

    // Merge options, giving precedence to options passed in the function call
    const finalOptions = {
        credentials: 'include', // Important for sending cookies/session info
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {}),
        },
    };

    try {
        const response = await fetch(url, finalOptions);

        // Provide more detailed error logging for failed requests
        if (!response.ok) {
            console.error(`API Error (${response.status}):`, {
                url: url,
                status: response.status,
                statusText: response.statusText,
            });
        }

        return response;
    } catch (error) {
        // Log network errors or other issues with the fetch call itself
        console.error('API Request Failed:', {
            url: url,
            error: error,
        });
        // Re-throw the error to be handled by the calling function
        throw error;
    }
}

/**
 * Helper function to check if the backend API is reachable and healthy.
 */
export const checkApiHealth = async () => {
    try {
        // Using a lightweight, non-existent endpoint for a quick check
        const response = await apiFetch('/api/health-check');
        // We consider any response from the server (even a 404) as a sign of it being reachable
        return { success: true, status: response.status };
    } catch (error) {
        console.error('API health check failed:', error);
        return { success: false, error: error.message };
    }
};

// Export other API-related utilities here if needed 