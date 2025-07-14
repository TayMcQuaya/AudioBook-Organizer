/**
 * Determines the base URL for the API based on the environment.
 * In local development, it uses relative paths to the local server.
 * In production, it points to the deployed backend on DigitalOcean.
 */
const getApiBaseUrl = () => {
  // Environment-aware API URL configuration
  const hostname = window.location.hostname;
  
  // Check if we have a configured backend URL from environment
  const configuredBackendUrl = window.ENV?.BACKEND_URL;
  
  // Local development detection
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // For unified local deployment, use /api prefix
    return configuredBackendUrl || '/api'; // Use env var or default to /api
  }
  
  // Production unified deployment: always use relative API paths
  // This works because frontend and backend are served from the same domain
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Use the same logic for the main BACKEND_URL variable
const BACKEND_URL = getApiBaseUrl();

// CSRF token management
let csrfToken = null;

// Function to get CSRF token
async function getCSRFToken() {
    if (!csrfToken) {
        try {
            const response = await fetch(`${BACKEND_URL}/security/csrf-token`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                csrfToken = data.csrf_token;
            }
        } catch (error) {
            console.warn('Failed to get CSRF token:', error);
        }
    }
    return csrfToken;
}

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

    // Add CSRF token for state-changing requests
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
        const token = await getCSRFToken();
        if (token) {
            defaultHeaders['X-CSRFToken'] = token;
        }
    }

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
        // Check multiple possible token storage keys
        const supabaseToken = localStorage.getItem('sb-access-token') || 
                             localStorage.getItem('auth_token') ||
                             localStorage.getItem('supabase.auth.token');
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

    console.log('🌐 API Request:', url, finalOptions.method || 'GET');
    
    try {
        const response = await fetch(url, finalOptions);
        console.log('🌐 API Response:', url, response.status);
        return response;
    } catch (error) {
        console.error('🌐 API Error:', url, error.message);
        throw error;
    }
}

/**
 * Helper function to check if the backend API is reachable and healthy.
 */
export const checkApiHealth = async () => {
    try {
        // Using a lightweight, non-existent endpoint for a quick check
        const response = await apiFetch('/health-check');
        // We consider any response from the server (even a 404) as a sign of it being reachable
        return { success: true, status: response.status };
    } catch (error) {
        console.error('API health check failed:', error);
        return { success: false, error: error.message };
    }
};

// Export other API-related utilities here if needed 