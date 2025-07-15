/**
 * Stripe Integration Module
 * Handles Stripe payments for credit purchases in Normal mode only
 */

import { apiFetch } from './api.js';
import { showSuccess, showError, showInfo } from './notifications.js';
import envManager from './envManager.js';

// Helper function to convert apiFetch to the expected API format
async function apiCall(endpoint, options = {}) {
    try {
        const response = await apiFetch(endpoint, options);
        const data = await response.json();
        
        if (response.ok) {
            return { success: true, ...data };
        } else {
            return { success: false, error: data.error || 'API request failed' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

class StripeService {
    constructor() {
        this.stripe = null;
        this.isInitialized = false;
        this.config = null;
        this.packages = null;
    }

    /**
     * Wait for Stripe.js to be available - OPTIMIZED
     */
    async waitForStripeScript() {
        // If Stripe is already available, return immediately
        if (typeof window.Stripe !== 'undefined') {
            console.log('✅ Stripe.js already available');
            return true;
        }

        // Check if script failed to load
        if (window.stripeJsLoadError) {
            console.error('❌ Stripe.js script failed to load from CDN');
            throw new Error('Stripe.js script load error detected');
        }

        console.log('⏳ Waiting for Stripe.js to load...');
        
        // **OPTIMIZED: Simplified waiting with reasonable timeout**
        const maxWaitTime = 3000; // Reduced from 5000ms
        const checkInterval = 100;
        let waitTime = 0;

        return new Promise((resolve, reject) => {
            const checkStripe = () => {
                // Check for successful load
                if (window.stripeJsLoaded && typeof window.Stripe !== 'undefined') {
                    console.log('✅ Stripe.js loaded successfully');
                    resolve(true);
                    return;
                }

                // Check for error
                if (window.stripeJsLoadError) {
                    console.error('❌ Stripe.js load error detected');
                    reject(new Error('Stripe.js load error'));
                    return;
                }

                waitTime += checkInterval;
                if (waitTime >= maxWaitTime) {
                    console.warn('⚠️ Stripe.js loading timeout - may not be available');
                    reject(new Error('Stripe.js loading timeout'));
                    return;
                }

                setTimeout(checkStripe, checkInterval);
            };

            checkStripe();
        });
    }

    /**
     * Initialize Stripe with publishable key - OPTIMIZED
     */
    async init() {
        try {
            // Check if we're in testing mode
            const envConfig = envManager.getConfig();
            if (envConfig.testing_mode) {
                console.warn('🚫 Stripe payment system is disabled in testing mode');
                return false;
            }

            // **OPTIMIZED: Simplified Stripe.js availability check**
            try {
                await this.waitForStripeScript();
            } catch (error) {
                console.error('Failed to load Stripe.js script:', error);
                this.isInitialized = false;
                return false;
            }

            // **PARALLEL: Get Stripe configuration while script loads**
            const response = await apiCall('/stripe/config');
            
            if (!response.success) {
                console.error('Failed to get Stripe config:', response.error);
                this.isInitialized = false;
                return false;
            }

            this.config = response;
            
            // Check if payments are enabled
            const paymentStatus = response.payment_status;
            if (!paymentStatus || !paymentStatus.enabled) {
                console.warn('🚫 Stripe payment system is disabled via configuration');
                this.isInitialized = false;
                return false;
            }

            // Check if Stripe is properly configured
            if (!paymentStatus.stripe_configured || !paymentStatus.packages_configured) {
                console.warn('🚫 Stripe payment system is not properly configured');
                this.isInitialized = false;
                return false;
            }

            this.packages = response.packages;

            // Initialize Stripe (we know it's available now)
            if (!response.publishable_key) {
                console.error('No Stripe publishable key provided');
                this.isInitialized = false;
                return false;
            }

            this.stripe = window.Stripe(response.publishable_key);
            this.isInitialized = true;
            
            console.log('✅ Stripe service initialized successfully');
            return true;

        } catch (error) {
            console.error('Stripe initialization failed:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Check if Stripe is available (Normal mode only and payments enabled)
     */
    isAvailable() {
        const envConfig = envManager.getConfig();
        const paymentsEnabled = this.config?.payment_status?.enabled || false;
        return !envConfig.testing_mode && this.isInitialized && this.stripe && paymentsEnabled;
    }

    /**
     * Get payment status for UI display
     */
    getPaymentStatus() {
        const envConfig = envManager.getConfig();
        
        if (envConfig.testing_mode) {
            return { 
                available: false, 
                reason: 'testing_mode',
                message: 'Payment functionality is not available in testing mode. Switch to normal mode to purchase credits.'
            };
        }
        
        if (!this.config?.payment_status) {
            return { 
                available: false, 
                reason: 'not_configured',
                message: 'Payment system is not configured. Please contact support.'
            };
        }
        
        const status = this.config.payment_status;
        
        if (!status.enabled) {
            return { 
                available: false, 
                reason: 'disabled',
                message: 'Payment functionality is currently disabled. Please contact support if you need to purchase credits.'
            };
        }
        
        if (!status.stripe_configured) {
            return { 
                available: false, 
                reason: 'stripe_not_configured',
                message: 'Stripe payment system is not properly configured.'
            };
        }
        
        if (!status.packages_configured) {
            return { 
                available: false, 
                reason: 'packages_not_configured',
                message: 'Credit packages are not properly configured.'
            };
        }
        
        return { 
            available: true, 
            reason: 'available',
            message: 'Payment system is ready.'
        };
    }

    /**
     * Get available credit packages
     */
    async getPackages() {
        try {
            if (!this.isAvailable()) {
                return { success: false, error: 'Stripe not available in testing mode' };
            }

            const response = await apiCall('/stripe/packages');
            return response;

        } catch (error) {
            console.error('Failed to get packages:', error);
            return { success: false, error: 'Failed to retrieve packages' };
        }
    }

    /**
     * Create checkout session and redirect to Stripe
     */
    async purchaseCredits(packageType) {
        try {
            if (!this.isAvailable()) {
                showError('Payment functionality is not available in testing mode');
                return { success: false, error: 'Stripe not available' };
            }

            // Show loading state
            showInfo('Creating payment session...');

            // Create checkout session
            const response = await apiCall('/stripe/create-checkout-session', {
                method: 'POST',
                body: JSON.stringify({ package_type: packageType })
            });

            if (!response.success) {
                showError(response.error || 'Failed to create payment session');
                return response;
            }

            // **SECURITY FIX: Removed session ID logging to prevent exposure**
            console.log('✅ Checkout session created successfully');

            // Redirect to Stripe Checkout
            const { error } = await this.stripe.redirectToCheckout({
                sessionId: response.session_id
            });

            if (error) {
                console.error('Stripe checkout error:', error);
                showError('Failed to redirect to payment page');
                return { success: false, error: error.message };
            }

            return { success: true };

        } catch (error) {
            console.error('Purchase failed:', error);
            showError('Payment failed. Please try again.');
            return { success: false, error: error.message };
        }
    }

    /**
     * Get checkout session details
     */
    async getCheckoutSession(sessionId) {
        try {
            if (!this.isAvailable()) {
                return { success: false, error: 'Stripe not available' };
            }

            const response = await apiCall(`/api/stripe/session/${sessionId}`);
            return response;

        } catch (error) {
            console.error('Failed to get checkout session:', error);
            return { success: false, error: 'Failed to retrieve session' };
        }
    }

    /**
     * Get user's transaction history
     */
    async getTransactions() {
        try {
            if (!this.isAvailable()) {
                return { success: false, error: 'Stripe not available' };
            }

            const response = await apiCall('/stripe/transactions');
            return response;

        } catch (error) {
            console.error('Failed to get transactions:', error);
            return { success: false, error: 'Failed to retrieve transactions' };
        }
    }

    /**
     * Handle successful payment redirect
     */
    async handlePaymentSuccess(sessionId) {
        try {
            showInfo('Verifying payment...');

            // Get session details to verify payment
            const sessionResponse = await this.getCheckoutSession(sessionId);
            
            if (!sessionResponse.success) {
                showError('Failed to verify payment');
                return false;
            }

            const session = sessionResponse.session;
            
            if (session.payment_status === 'paid') {
                const packageType = session.metadata.package_type;
                const credits = session.metadata.credits;
                
                showSuccess(`Payment successful! ${credits} credits have been added to your account.`);
                
                // Trigger credit balance update in the UI
                if (window.app && window.app.updateCredits) {
                    await window.app.updateCredits();
                }
                
                return true;
            } else {
                showError('Payment was not completed successfully');
                return false;
            }

        } catch (error) {
            console.error('Error handling payment success:', error);
            showError('Failed to verify payment');
            return false;
        }
    }

    /**
     * Create credit purchase UI
     */
    createPurchaseUI() {
        const paymentStatus = this.getPaymentStatus();
        
        if (!paymentStatus.available) {
            const alertClass = paymentStatus.reason === 'testing_mode' ? 'alert-info' : 'alert-warning';
            const icon = paymentStatus.reason === 'testing_mode' ? 'ℹ️' : '⚠️';
            
            return `
                <div class="stripe-unavailable">
                    <div class="alert ${alertClass}">
                        <div class="alert-icon">${icon}</div>
                        <div class="alert-content">
                            <h4>Payment System Unavailable</h4>
                            <p>${paymentStatus.message}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="credit-purchase-section">
                <div class="section-header">
                    <span class="emoji">💳</span><h3> Purchase Credits</h3>
                    <p>Choose a credit package to continue using AudioBook Organizer</p>
                </div>
                
                <div class="credit-packages" id="creditPackages">
                    <div class="loading-packages">
                        <div class="spinner"></div>
                        <p>Loading packages...</p>
                    </div>
                </div>
                
                <div class="purchase-info">
                    <div class="info-item">
                        <span class="icon">🔒</span>
                        <span>Secure payment processing with Stripe</span>
                    </div>
                    <div class="info-item">
                        <span class="icon">⚡</span>
                        <span>Credits added instantly after payment</span>
                    </div>
                    <div class="info-item">
                        <span class="icon">📧</span>
                        <span>Receipt sent to your email</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create package card HTML
     */
    createPackageCard(packageData) {
        const isPopular = packageData.id === 'professional';
        
        return `
            <div class="package-card ${isPopular ? 'popular' : ''}" data-package-id="${packageData.id}">
                ${isPopular ? '<div class="popular-badge">Most Popular</div>' : ''}
                
                <div class="package-header">
                    <h4>${packageData.name}</h4>
                    <div class="package-price">
                        <span class="price">${packageData.price_display}</span>
                        <span class="credits">${packageData.credits.toLocaleString()} credits</span>
                    </div>
                </div>
                
                <div class="package-details">
                    <p>${packageData.description}</p>
                    <div class="package-value">
                        <span class="value-label">Value:</span>
                        <span class="value-amount">${packageData.credits_per_dollar} credits per $1</span>
                    </div>
                </div>
                
                <button class="package-button" onclick="window.safePurchaseCredits('${packageData.id}')">
                    <span class="button-text">Purchase Credits</span>
                    <span class="button-icon">→</span>
                </button>
            </div>
        `;
    }

    /**
     * Load and display packages
     */
    async loadPackages() {
        try {
            const packagesContainer = document.getElementById('creditPackages');
            if (!packagesContainer) return;

            const response = await this.getPackages();
            
            if (!response.success) {
                packagesContainer.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <p>Failed to load credit packages</p>
                        <button onclick="window.safeLoadPackages()">Retry</button>
                    </div>
                `;
                return;
            }

            const packages = response.packages;
            const packagesHTML = packages.map(pkg => this.createPackageCard(pkg)).join('');
            
            packagesContainer.innerHTML = packagesHTML;

        } catch (error) {
            console.error('Failed to load packages:', error);
            const packagesContainer = document.getElementById('creditPackages');
            if (packagesContainer) {
                packagesContainer.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">❌</div>
                        <p>Error loading packages</p>
                        <button onclick="window.safeLoadPackages()">Retry</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Create transaction history UI
     */
    async createTransactionHistoryUI() {
        const paymentStatus = this.getPaymentStatus();
        
        if (!paymentStatus.available) {
            return `<p>Transaction history is not available: ${paymentStatus.message}</p>`;
        }

        try {
            const response = await this.getTransactions();
            
            if (!response.success) {
                return `
                    <div class="transactions-error">
                        <p>Failed to load transaction history</p>
                        <button onclick="window.safeRefreshTransactions()">Retry</button>
                    </div>
                `;
            }

            const transactions = response.transactions;
            
            if (!transactions || transactions.length === 0) {
                return `
                    <div class="no-transactions">
                        <div class="empty-state-icon">📄</div>
                        <h4>No transactions yet</h4>
                        <p>Your purchase history will appear here after you buy credits.</p>
                    </div>
                `;
            }

            const transactionsHTML = transactions.map(transaction => `
                <div class="transaction-item ${transaction.status}">
                    <div class="transaction-main">
                        <div class="transaction-type">
                            <span class="transaction-icon">💳</span>
                            <span class="transaction-name">${transaction.package_type || 'Credit Purchase'}</span>
                        </div>
                        <div class="transaction-details">
                            <span class="transaction-credits">+${transaction.credits_amount} credits</span>
                            <span class="transaction-amount">${transaction.amount_display}</span>
                        </div>
                    </div>
                    <div class="transaction-meta">
                        <span class="transaction-date">${new Date(transaction.created_at).toLocaleDateString()}</span>
                        <span class="transaction-status status-${transaction.status}">${transaction.status}</span>
                    </div>
                </div>
            `).join('');

            return `
                <div class="transactions-list">
                    <div class="transactions-header">
                        <h4>Recent Transactions</h4>
                        <button class="refresh-btn" onclick="window.safeRefreshTransactions()">
                            <span class="refresh-icon">🔄</span>
                            Refresh
                        </button>
                    </div>
                    <div class="transactions-items">
                        ${transactionsHTML}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Failed to create transaction history UI:', error);
            return '<p>Error loading transaction history</p>';
        }
    }

    /**
     * Refresh transactions display
     */
    async refreshTransactions() {
        const transactionsContainer = document.querySelector('.transactions-list');
        if (transactionsContainer) {
            transactionsContainer.innerHTML = '<div class="loading">Loading...</div>';
            const newHTML = await this.createTransactionHistoryUI();
            transactionsContainer.outerHTML = newHTML;
        }
    }
}

// Create global instance
const stripeService = new StripeService();

// CRITICAL: Make stripeService globally available immediately to prevent race conditions
window.stripeService = stripeService;

// Safe wrapper function for purchase button onclick handlers
window.safePurchaseCredits = function(packageId) {
    console.log('🔐 Safe purchase credits called for package:', packageId);
    
    if (window.stripeService && typeof window.stripeService.purchaseCredits === 'function') {
        window.stripeService.purchaseCredits(packageId);
    } else {
        console.error('Stripe service not ready, attempting to initialize...');
        
        // Try to initialize and retry
        import('./stripe.js').then(async (module) => {
            const service = module.default || window.stripeService;
            if (service) {
                console.log('✅ Stripe service loaded, initializing...');
                try {
                    await service.init();
                    if (service.isAvailable()) {
                        service.purchaseCredits(packageId);
                    } else {
                        import('./notifications.js').then(({ showError }) => {
                            showError('Payment system is not available. Please try again later.');
                        });
                    }
                } catch (error) {
                    console.error('Failed to initialize Stripe:', error);
                    import('./notifications.js').then(({ showError }) => {
                        showError('Failed to load payment system. Please refresh the page and try again.');
                    });
                }
            }
        }).catch(err => {
            console.error('Failed to load Stripe module:', err);
            import('./notifications.js').then(({ showError }) => {
                showError('Payment system could not be loaded. Please refresh the page.');
            });
        });
    }
};

// Safe wrapper for loading packages
window.safeLoadPackages = function() {
    console.log('🔐 Safe load packages called');
    if (window.stripeService && typeof window.stripeService.loadPackages === 'function') {
        window.stripeService.loadPackages();
    } else {
        console.error('Stripe service not ready for loading packages');
    }
};

// Safe wrapper for refreshing transactions
window.safeRefreshTransactions = function() {
    console.log('🔐 Safe refresh transactions called');
    if (window.stripeService && typeof window.stripeService.refreshTransactions === 'function') {
        window.stripeService.refreshTransactions();
    } else {
        console.error('Stripe service not ready for refreshing transactions');
    }
};

/**
 * Ensure stripeService is globally available
 * This is especially important after page refreshes
 */
export function ensureStripeServiceGlobal() {
    if (!window.stripeService) {
        window.stripeService = stripeService;
        console.log('✅ stripeService restored to global scope');
    }
    return window.stripeService;
}

/**
 * Safe wrapper for calling stripeService methods from HTML onclick handlers
 */
window.safeStripeCall = function(method, ...args) {
    try {
        const service = window.stripeService || stripeService;
        if (service && typeof service[method] === 'function') {
            return service[method](...args);
        } else {
            console.error(`Stripe service or method ${method} not available`);
            return null;
        }
    } catch (error) {
        console.error(`Error calling stripe method ${method}:`, error);
        return null;
    }
};

/**
 * Debug function to test stripe service availability
 * Can be called from browser console: testStripeAvailability()
 */
window.testStripeAvailability = function() {
    console.log('🧪 Testing Stripe Service Availability:');
    console.log('  - Stripe.js global object:', typeof window.Stripe !== 'undefined' ? '✅ Available' : '❌ Not loaded');
    console.log('  - stripeJsLoaded flag:', window.stripeJsLoaded ? '✅ True' : '❌ False/Undefined');
    console.log('  - stripeJsLoadError flag:', window.stripeJsLoadError ? '❌ Error detected' : '✅ No error');
    console.log('  - window.stripeService exists:', !!window.stripeService);
    console.log('  - stripeService (direct):', typeof stripeService !== 'undefined');
    console.log('  - safeStripeCall function:', typeof window.safeStripeCall === 'function');
    
    if (window.stripeService) {
        console.log('  - isInitialized:', window.stripeService.isInitialized);
        console.log('  - isAvailable():', window.stripeService.isAvailable());
        console.log('✅ Stripe service is properly available!');
    } else {
        console.error('❌ Stripe service is NOT available globally');
    }
    
    // Check for Stripe script in DOM
    const stripeScript = document.querySelector('script[src*="js.stripe.com"]');
    console.log('  - Stripe script in DOM:', stripeScript ? '✅ Found' : '❌ Not found');
    
    if (typeof window.Stripe === 'undefined') {
        console.log('🔧 Troubleshooting tips:');
        console.log('  1. Check network connection');
        console.log('  2. Check if Stripe.js is blocked by ad blockers');
        console.log('  3. Try refreshing the page');
        console.log('  4. Check browser console for script loading errors');
        console.log('  5. Try calling forceLoadStripe() to retry loading');
    }
};

/**
 * Manual function to force load Stripe.js (for troubleshooting)
 * Can be called from browser console: forceLoadStripe()
 */
window.forceLoadStripe = async function() {
    console.log('🔧 Manually forcing Stripe.js load...');
    
    try {
        if (typeof window.Stripe !== 'undefined') {
            console.log('✅ Stripe.js already available');
            return true;
        }
        
        const stripeService = window.stripeService || stripeService;
        if (stripeService && typeof stripeService.loadStripeScriptDynamically === 'function') {
            await stripeService.loadStripeScriptDynamically();
            console.log('✅ Stripe.js force loaded successfully');
            return true;
        } else {
            console.error('❌ Cannot access stripeService.loadStripeScriptDynamically');
            return false;
        }
    } catch (error) {
        console.error('❌ Force load failed:', error);
        return false;
    }
};

export default stripeService; 