// Testing Mode UI Manager
// Handles UI modifications when in testing mode

import { tempAuthManager } from './tempAuth.js';
import { clearTestingModeData } from './storage.js';

class TestingModeUI {
    constructor() {
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        // Wait for temp auth manager to be ready
        if (tempAuthManager.isTestingMode) {
            this.applyTestingModeStyles();
            this.addLogoutButton();
            this.disableNavigationLinks();
            
            console.log('🧪 Testing mode UI applied');
        }
        
        this.isInitialized = true;
    }
    
    applyTestingModeStyles() {
        // Add testing mode class to body
        document.body.classList.add('testing-mode');
        
        // Update page title to show testing mode
        if (document.title.includes('AudioBook Organizer ')) {
            document.title = '[TESTING] ' + document.title;
        }
    }
    
    addLogoutButton() {
        // Find the nav-links container
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        // Create logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn exit-testing-btn';
        logoutBtn.innerHTML = 'Exit';
        logoutBtn.title = 'Exit Early Access Mode';
        logoutBtn.style.marginLeft = '10px';
        
        // Add click handler with custom modal
        logoutBtn.addEventListener('click', async () => {
            this.showExitConfirmationModal();
        });
        
        // Remove existing auth button and add logout button
        const authBtn = navLinks.querySelector('.auth-nav-link');
        if (authBtn) {
            authBtn.remove();
        }
        
        navLinks.appendChild(logoutBtn);
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
            
            // Clear testing mode data from localStorage for security
            clearTestingModeData();
            
            // Logout from testing mode
            await tempAuthManager.logout();
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