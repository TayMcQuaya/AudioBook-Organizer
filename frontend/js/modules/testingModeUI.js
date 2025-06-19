// Testing Mode UI Manager
// Handles UI modifications when in testing mode

import { tempAuthManager } from './tempAuth.js';
import { clearTestingModeData } from './storage.js';
import envManager from './envManager.js';
import appConfig from '../config/appConfig.js';

// Clear testing mode data from localStorage (security measure)
function clearTestingModeData() {
    localStorage.removeItem('temp_auth_backup');
    localStorage.removeItem('temp_auth_token');
    localStorage.removeItem('temp_project_data');
    // Clear any other testing-specific data
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('testing_')) {
            localStorage.removeItem(key);
        }
    });
}

class TestingModeUI {
    constructor() {
        this.isInitialized = false;
        this.uiElementsApplied = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.tempAuthManager = null;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('🧪 Initializing testing mode UI...');
        const startTime = Date.now();
        
        try {
            // Wait for environment manager to be ready
            await envManager.waitForReady();
            
            const envConfig = envManager.getConfig();
            
            if (envConfig.testing_mode) {
                console.log('🧪 Testing mode detected, applying UI changes...');
                
                // Import tempAuthManager dynamically to ensure it's available
                const { tempAuthManager } = await import('./tempAuth.js');
                this.tempAuthManager = tempAuthManager;
                window.tempAuthManager = tempAuthManager; // Make globally available
                
                // Apply changes with retry logic for robustness
                await this._applyTestingModeWithRetry();
                
                appConfig.logTiming('Testing mode UI initialization', startTime);
                console.log('✅ Testing mode UI applied successfully');
            } else {
                console.log('ℹ️ Not in testing mode, skipping UI changes');
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Testing mode UI initialization failed:', error);
            this.isInitialized = true; // Don't block app initialization
        }
    }
    
    /**
     * Apply testing mode UI with retry logic
     */
    async _applyTestingModeWithRetry() {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🧪 Applying testing mode UI (attempt ${attempt}/${this.maxRetries})`);
                
                // Wait for DOM to be stable
                await appConfig.delay('domReadyDelay');
                
                // Apply testing mode body class immediately
                document.body.classList.add('testing-mode');
                
                // Apply testing mode styles
                await this.applyTestingModeStyles();
                
                // Wait for CSS to be applied
                await appConfig.delay('cssApplicationDelay');
                
                // Add logout button
                await this.addLogoutButton();
                
                // Disable navigation links
                await this.disableNavigationLinks();
                
                // Wait for UI stabilization
                await appConfig.delay('testingModeDelay');
                
                this.uiElementsApplied = true;
                console.log(`✅ Testing mode UI applied successfully on attempt ${attempt}`);
                break;
                
            } catch (error) {
                console.warn(`⚠️ Testing mode UI attempt ${attempt} failed:`, error);
                
                if (attempt === this.maxRetries) {
                    console.error('❌ All testing mode UI attempts failed');
                    throw error;
                }
                
                // Wait before retry
                await appConfig.delay('moduleRetryDelay');
            }
        }
    }
    
    applyTestingModeStyles() {
        // Add testing mode class to body
        document.body.classList.add('testing-mode');
        
        // Update page title to show testing mode
        if (document.title.includes('AudioBook Organizer ')) {
            document.title = '[TESTING] ' + document.title;
        }
    }
    
    async addLogoutButton() {
        console.log('🧪 Adding testing mode logout button...');
        
        // Wait for navigation to be ready with retry logic
        const navLinks = await this._waitForElement('.nav-links', 5000);
        if (!navLinks) {
            console.warn('⚠️ Navigation container not found, cannot add logout button');
            return;
        }
        
        // Find the existing exit button (should already be in HTML)
        const logoutBtn = navLinks.querySelector('.exit-testing-btn');
        
        if (logoutBtn) {
            // Show the button (it's hidden by default)
            logoutBtn.style.display = 'inline-flex';
            
            // Add click handler (replace any existing handler)
            logoutBtn.onclick = () => {
                this.showExitConfirmationModal();
            };
        } else {
            console.warn('⚠️ Exit button not found in HTML structure');
        }
        
        // Remove existing auth buttons (sign in, back arrow, etc.)
        const authElements = navLinks.querySelectorAll('.auth-nav-link, .auth-btn, .back-arrow, a[href="/auth"]');
        authElements.forEach(element => {
            element.style.display = 'none';
            console.log(`🧪 Hidden auth element: ${element.className || element.tagName}`);
        });
        
        console.log('✅ Testing mode logout button added successfully');
    }
    
    disableNavigationLinks() {
        // Find landing page navigation links, but exclude the brand link
        const landingLinks = document.querySelectorAll('.landing-nav-link:not(.brand-link)');
        
        landingLinks.forEach(link => {
            // Remove href to prevent navigation
            link.removeAttribute('href');
            
            // Add click handler to prevent navigation
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Show info message
                this.showTestingModeInfo();
            });
        });
        
        // Handle brand link separately - make it non-clickable but keep visible
        const brandLink = document.querySelector('.brand-link.landing-nav-link');
        if (brandLink) {
            brandLink.removeAttribute('href');
            brandLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
    }
    
    showTestingModeInfo() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 193, 7, 0.9);
            color: #333;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        notification.textContent = '🧪 Navigation disabled in testing mode';
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    showExitConfirmationModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'exit-testing-modal-overlay';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'exit-testing-modal';
        
        modalContent.innerHTML = `
            <div class="exit-modal-header">
                <div class="exit-modal-icon">⚠️</div>
                <h3 class="exit-modal-title">Exit Early Access App</h3>
            </div>
            <div class="exit-modal-body">
                <p>Are you sure you want to exit the app?</p>
                <p class="exit-modal-subtitle">You will be redirected to the password entry page.</p>
            </div>
            <div class="exit-modal-footer">
                <button class="exit-modal-cancel-btn">Cancel</button>
                <button class="exit-modal-confirm-btn">Exit App</button>
            </div>
        `;
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        
        // Add event listeners
        const cancelBtn = modalContent.querySelector('.exit-modal-cancel-btn');
        const confirmBtn = modalContent.querySelector('.exit-modal-confirm-btn');
        
        // Close modal function
        const closeModal = () => {
            document.body.removeChild(modalOverlay);
        };
        
        // Handle cancel
        cancelBtn.addEventListener('click', closeModal);
        
        // Handle confirm
        confirmBtn.addEventListener('click', async () => {
            closeModal();
            
            try {
                // Clear testing mode data from localStorage for security
                clearTestingModeData();
                
                // Logout from testing mode with error handling
                if (this.tempAuthManager && typeof this.tempAuthManager.logout === 'function') {
                    await this.tempAuthManager.logout();
                } else {
                    console.error('❌ tempAuthManager not available or logout method missing');
                    // Fallback navigation if tempAuthManager fails
                    if (window.router && typeof window.router.navigate === 'function') {
                        window.router.navigate('/temp-auth');
                    } else {
                        window.location.href = '/temp-auth';
                    }
                }
            } catch (error) {
                console.error('❌ Error during logout process:', error);
                // Emergency fallback navigation
                window.location.href = '/temp-auth';
            }
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Focus the confirm button
        setTimeout(() => {
            confirmBtn.focus();
        }, 100);
    }
    
    /**
     * Wait for a DOM element to appear with timeout
     */
    async _waitForElement(selector, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
            
            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn(`⚠️ Element ${selector} not found within ${timeout}ms`);
        return null;
    }
    
    cleanup() {
        // Remove testing mode class
        document.body.classList.remove('testing-mode');
        
        // Restore original title
        if (document.title.startsWith('[TESTING]')) {
            document.title = document.title.replace('[TESTING] ', '');
        }
        
        this.isInitialized = false;
    }
}

// Create singleton instance
const testingModeUI = new TestingModeUI();

export default testingModeUI; 