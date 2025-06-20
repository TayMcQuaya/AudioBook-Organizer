/**
 * Determines the base URL for the API based on the environment.
 * In local development, it uses relative paths to the local server.
 * In production, it points to the deployed backend on DigitalOcean.
 */
const getApiBaseUrl = () => {
  // Detect environment based on hostname only
  const hostname = window.location.hostname;
  
  // Local development detection
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return ''; // Relative paths for local Flask backend
  }
  
  // Production: Use DigitalOcean backend
  return 'https://audiobook-organizer-test-vdhku.ondigitalocean.app';
};

export const API_BASE_URL = getApiBaseUrl();

// Use the same logic for the main BACKEND_URL variable
const BACKEND_URL = getApiBaseUrl();

// API configuration loaded

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

    // **FIX**: Enhanced token handling for production cross-domain requests
    // Priority order: temp_auth_token > sb-access-token > legacy fallback
    
    // 1. Check for temp auth token first (testing mode)
    const tempToken = localStorage.getItem('temp_auth_token');
    if (tempToken) {
        // Use Authorization header as primary method (most reliable for cross-domain)
        defaultHeaders['Authorization'] = `Bearer ${tempToken}`;
        // Also send as X-Temp-Auth header as backup method
        defaultHeaders['X-Temp-Auth'] = tempToken;
    }
    // 2. Fallback to Supabase token if no temp token
    else {
        const supabaseToken = localStorage.getItem('sb-access-token');
        if (supabaseToken) {
            defaultHeaders['Authorization'] = `Bearer ${supabaseToken}`;
        }
        // 3. Legacy fallback for session-based auth
        else if (localStorage.getItem('temp_auth_backup') === 'true') {
            defaultHeaders['X-Testing-Override'] = 'temp-auth-bypass';
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

        // Silent error handling - no console logs in production
        return response;
    } catch (error) {
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