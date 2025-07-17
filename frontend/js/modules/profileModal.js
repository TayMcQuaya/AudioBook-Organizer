/**
 * Profile Modal Module - User profile management
 * Provides a tabbed modal interface for viewing profile, credit history, and settings
 */

import { showError, showSuccess } from './notifications.js';
import { apiFetch } from './api.js';

class ProfileModal {
    constructor() {
        this.isOpen = false;
        this.currentTab = 'profile';
        this.userData = null;
        this.usageHistory = null;
        this.currentPage = 1;
        this.actionFilter = null;
        this.isLoading = false;
        this.isDeleting = false; // Prevent multiple deletion attempts
        this.lastDeleteAttempt = 0; // Track last attempt timestamp
    }

    async open() {
        // Check if modal is already open AND exists in DOM
        if (this.isOpen) {
            const existingModal = document.querySelector('.profile-modal');
            if (!existingModal) {
                console.warn('Modal marked as open but not in DOM, resetting...');
                this.isOpen = false;
            } else {
                console.log('Modal already open and in DOM');
                return;
            }
        }
        
        try {
            // Show modal immediately with loading state
            this.createModal();
            this.isOpen = true;
            
            // Fetch user data asynchronously
            this.isLoading = true;
            await this.fetchUserData();
            this.isLoading = false;
            
            // Update the modal content with fetched data
            this.updateModalContent();
        } catch (error) {
            this.isLoading = false;
            console.error('Failed to load profile data:', error);
            showError('Failed to load profile data');
            // Clean up on error
            this.close();
        }
    }

    async fetchUserData() {
        try {
            // Fetch profile and usage history in parallel
            const [profileResponse, historyResponse, creditsResponse] = await Promise.all([
                apiFetch('/auth/profile'),
                apiFetch('/auth/usage-history?page=1&per_page=10'),
                apiFetch('/auth/credits')
            ]);

            if (!profileResponse.ok) {
                throw new Error('Failed to fetch profile data');
            }

            if (!historyResponse.ok) {
                throw new Error('Failed to fetch usage history');
            }

            if (!creditsResponse.ok) {
                throw new Error('Failed to fetch credits data');
            }

            const [profileData, historyData, creditsData] = await Promise.all([
                profileResponse.json(),
                historyResponse.json(),
                creditsResponse.json()
            ]);

            this.userData = profileData;
            this.userData.credits = creditsData.credits || 0;
            this.usageHistory = historyData;
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw error;
        }
    }

    async fetchUsageHistory(page = 1, actionFilter = null) {
        try {
            let url = `/auth/usage-history?page=${page}&per_page=10`;
            if (actionFilter) {
                url += `&action_filter=${actionFilter}`;
            }

            const response = await apiFetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch usage history');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching usage history:', error);
            throw error;
        }
    }

    close() {
        if (!this.isOpen) return;

        const modal = document.querySelector('.profile-modal');
        const backdrop = document.querySelector('.profile-modal-backdrop');

        if (modal && backdrop) {
            modal.classList.remove('show');
            backdrop.classList.remove('show');

            setTimeout(() => {
                this.removeModal();
                this.isOpen = false;
                this.currentTab = 'profile';
                this.currentPage = 1;
                this.actionFilter = null;
            }, 300);
        } else {
            // If modal elements not found, reset state anyway
            console.warn('Modal elements not found during close, resetting state');
            this.isOpen = false;
            this.currentTab = 'profile';
            this.currentPage = 1;
            this.actionFilter = null;
        }
    }

    removeModal() {
        const modal = document.querySelector('.profile-modal');
        const backdrop = document.querySelector('.profile-modal-backdrop');
        
        if (modal) modal.remove();
        if (backdrop) backdrop.remove();
    }

    updateModalContent() {
        const modal = document.querySelector('.profile-modal');
        if (modal) {
            modal.innerHTML = this.getModalHTML();
            this.setupEventListeners();
        }
    }

    createModal() {
        console.log('Creating profile modal...');
        
        // Remove existing modal
        this.removeModal();

        // Create backdrop and modal
        const backdrop = document.createElement('div');
        backdrop.className = 'profile-modal-backdrop';
        backdrop.onclick = () => this.close();

        const modal = document.createElement('div');
        modal.className = 'profile-modal';
        
        try {
            modal.innerHTML = this.getModalHTML();
        } catch (error) {
            console.error('Error generating modal HTML:', error);
            modal.innerHTML = '<div class="error">Error loading profile modal</div>';
        }

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
        
        console.log('Modal added to DOM');

        // Setup event listeners
        this.setupEventListeners();
        
        // Show with animation
        setTimeout(() => {
            backdrop.classList.add('show');
            modal.classList.add('show');
            console.log('Modal show classes added');
        }, 10);
    }

    getModalHTML() {
        return `
            <div class="profile-modal-header">
                <h2>Profile</h2>
                <button class="profile-modal-close" onclick="window.safeProfileClose()">×</button>
            </div>
            
            <div class="profile-modal-tabs">
                <button class="tab-btn ${this.currentTab === 'profile' ? 'active' : ''}" data-tab="profile">
                    Profile
                </button>
                <button class="tab-btn ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">
                    Credit History
                </button>
                <button class="tab-btn ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
                    Settings
                </button>
            </div>
            
            <div class="profile-modal-content">
                ${this.getTabContent()}
            </div>
        `;
    }

    getTabContent() {
        switch (this.currentTab) {
            case 'profile':
                return this.getProfileTabHTML();
            case 'history':
                return this.getHistoryTabHTML();
            case 'settings':
                return this.getSettingsTabHTML();
            default:
                return '';
        }
    }

    getProfileTabHTML() {
        if (!this.userData || !this.userData.profile) {
            return '<div class="loading">Loading profile data...</div>';
        }

        const profile = this.userData.profile;
        const initials = profile.full_name ? 
            profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 
            profile.email ? profile.email[0].toUpperCase() : '?';

        // Check for Google profile picture from multiple sources
        const googlePicture = this.getGoogleProfilePicture();
        
        // Create avatar HTML - use Google picture if available, otherwise show initials
        const avatarHTML = googlePicture ? 
            `<img src="${googlePicture}" alt="Profile Picture" class="profile-avatar-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="profile-avatar-fallback" style="display: none;">${initials}</div>` :
            `<div class="profile-avatar-text">${initials}</div>`;

        // Get current credits
        let currentCredits = 'Loading...';
        if (this.userData.credits !== undefined) {
            currentCredits = `${this.userData.credits} 💎`;
        }

        const createdDate = profile.created_at ? 
            new Date(profile.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Unknown';

        return `
            <div class="profile-info">
                <div class="profile-avatar">${avatarHTML}</div>
                <div class="profile-details">
                    <div class="profile-field">
                        <span class="field-label">Email</span>
                        <span class="field-value">${profile.email}</span>
                    </div>
                    <div class="profile-field">
                        <span class="field-label">Name</span>
                        <span class="field-value">${profile.full_name || 'Not set'}</span>
                    </div>
                    <div class="profile-field">
                        <span class="field-label">Current Credits</span>
                        <span class="field-value">${currentCredits}</span>
                    </div>
                    <div class="profile-field">
                        <span class="field-label">Member Since</span>
                        <span class="field-value">${createdDate}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get Google profile picture URL from various sources
     */
    getGoogleProfilePicture() {
        // Try to get from current session user metadata (most reliable for Google users)
        if (window.sessionManager && window.sessionManager.user) {
            const user = window.sessionManager.user;
            // Google OAuth stores picture in user_metadata
            const googlePicture = user.user_metadata?.picture || user.user_metadata?.avatar_url;
            if (googlePicture) {
                console.log('📸 Using Google profile picture from session');
                return googlePicture;
            }
        }

        // Fallback: Try to get from profile data (if stored in database)
        if (this.userData && this.userData.profile && this.userData.profile.avatar_url) {
            console.log('📸 Using profile picture from database');
            return this.userData.profile.avatar_url;
        }

        // No profile picture available
        return null;
    }

    getHistoryTabHTML() {
        if (!this.usageHistory || !this.usageHistory.data) {
            return '<div class="loading">Loading usage history...</div>';
        }

        const { data, pagination } = this.usageHistory;

        // Current balance display - compact version
        const currentCredits = this.userData?.credits ?? 0;
        const balanceDisplay = `
            <div class="current-balance compact">
                <h3>Balance: ${currentCredits} 💎</h3>
            </div>
        `;

        // Get pagination HTML early to include in header
        const paginationHTML = this.getPaginationHTML(pagination);
        
        // Combined filter and pagination header
        const filterOptions = `
            <div class="history-controls">
                <div class="history-filters compact">
                    <select id="action-filter" onchange="window.safeProfileHandleFilterChange(this.value)">
                        <option value="">All actions</option>
                        <option value="audio_upload" ${this.actionFilter === 'audio_upload' ? 'selected' : ''}>Audio Upload</option>
                        <option value="docx_processed" ${this.actionFilter === 'docx_processed' ? 'selected' : ''}>DOCX Processing</option>
                        <option value="txt_upload" ${this.actionFilter === 'txt_upload' ? 'selected' : ''}>TXT Upload</option>
                        <option value="premium_audio_export" ${this.actionFilter === 'premium_audio_export' ? 'selected' : ''}>Premium Export</option>
                        <option value="credit_purchase" ${this.actionFilter === 'credit_purchase' ? 'selected' : ''}>Credit Purchase</option>
                        <option value="gift_credits" ${this.actionFilter === 'gift_credits' ? 'selected' : ''}>Gifts Received</option>
                    </select>
                </div>
                <div class="history-pagination-inline">
                    ${paginationHTML}
                </div>
            </div>
        `;

        // Table content
        const tableRows = data.map(entry => {
            const date = new Date(entry.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const time = new Date(entry.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const action = this.formatActionName(entry.action);
            // For purchases and gifts, show positive. For consumption, show negative
            const isPurchase = entry.action === 'credit_purchase' || entry.action === 'credits_purchase';
            const isGift = entry.action === 'gift_credits';
            
            // Handle credit display - purchases and gifts should show positive values
            let credits, creditDisplay, creditClass;
            if (isPurchase || isGift) {
                // For purchases and gifts, credits_used should be positive (amount received)
                credits = Math.abs(entry.credits_used);
                creditDisplay = `+${credits} 💎`;
                creditClass = 'positive';
            } else {
                // For consumption, show negative values
                credits = -Math.abs(entry.credits_used);
                creditDisplay = `${credits} 💎`;
                creditClass = 'negative';
            }

            // Add some debug info for purchases
            if (entry.action === 'PURCHASE' && entry.description?.includes('credits')) {
                // **SECURITY FIX: Removed transaction details logging to prevent exposure**
                console.log('Found credit purchase in transaction history');
            }

            return `
                <tr>
                    <td>
                        <div class="date-time">
                            <div class="date">${date}</div>
                            <div class="time">${time}</div>
                        </div>
                    </td>
                    <td>${action}</td>
                    <td class="credit-change ${creditClass}">${creditDisplay}</td>
                </tr>
            `;
        }).join('');

        const table = `
            <div class="history-table-wrapper">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Action</th>
                            <th>Credits</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="3">No usage history found</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        // Wrap everything in a container for better layout control
        return `
            <div class="history-tab-container">
                ${balanceDisplay}
                ${filterOptions}
                ${table}
            </div>
        `;
    }

    getSettingsTabHTML() {
        if (!this.userData || !this.userData.profile) {
            return '<div class="loading">Loading settings...</div>';
        }

        const profile = this.userData.profile;

        return `
            <div class="settings-section">
                <h3>Profile Information</h3>
                <form id="profile-form" onsubmit="window.safeProfileHandleUpdate(event)">
                    <div class="form-group">
                        <label for="profile-name">Full Name</label>
                        <input type="text" id="profile-name" name="full_name" value="${profile.full_name || ''}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>

            <div class="settings-section">
                <h3>Account Security</h3>
                <div class="security-info">
                    <p><strong>Email:</strong> ${profile.email}</p>
                    <p class="help-text">Password reset emails will be sent to this address.</p>
                </div>
                <button class="btn btn-secondary" onclick="window.safeProfileHandlePasswordReset()">
                    Reset Password
                </button>
                <p class="help-text">
                    Click the button above to receive a password reset email. You'll be able to set a new password using the link in the email.
                </p>
            </div>

            <div class="settings-section danger-zone">
                <h3 class="danger-title">Delete Account</h3>
                <div class="danger-content">
                    <p class="danger-warning">
                        Once you delete your account, there is no going back. This action cannot be undone.
                    </p>
                    <button class="btn btn-danger" onclick="window.safeProfileShowDeleteDialog()">
                        Delete Account
                    </button>
                </div>
            </div>
        `;
    }

    formatActionName(action) {
        const actionNames = {
            'audio_upload': 'Audio Upload',
            'docx_processing': 'DOCX Processing',
            'txt_upload': 'TXT Upload',
            'premium_export': 'Premium Export',
            'credit_purchase': 'Credit Purchase',
            'gift_credits': 'Gift from us'
        };
        return actionNames[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getPaginationHTML(pagination) {
        if (!pagination || pagination.pages <= 1) {
            return '';
        }

        const { page, pages } = pagination;
        let paginationHTML = '<div class="pagination">';

        // Previous button
        if (page > 1) {
            paginationHTML += `<button onclick="window.safeProfileChangePage(${page - 1})">Previous</button>`;
        }

        // Page numbers
        for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
            const activeClass = i === page ? 'active' : '';
            paginationHTML += `<button class="${activeClass}" onclick="window.safeProfileChangePage(${i})">${i}</button>`;
        }

        // Next button
        if (page < pages) {
            paginationHTML += `<button onclick="window.safeProfileChangePage(${page + 1})">Next</button>`;
        }

        paginationHTML += '</div>';
        return paginationHTML;
    }

    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                if (tabName !== this.currentTab) {
                    this.switchTab(tabName);
                }
            });
        });

        // ESC key to close
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    handleKeydown(e) {
        if (e.key === 'Escape' && this.isOpen) {
            this.close();
        }
    }

    async switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content
        const content = document.querySelector('.profile-modal-content');
        if (content) {
            content.innerHTML = this.getTabContent();
        }

        // If switching to history tab, make sure we have the data
        if (tabName === 'history') {
            // Show loading state immediately
            content.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading usage history...</p>
                </div>
            `;
            
            try {
                // Fetch data if needed
                if (!this.usageHistory || this.usageHistory.data.length === 0) {
                    this.usageHistory = await this.fetchUsageHistory(this.currentPage, this.actionFilter);
                }
                content.innerHTML = this.getTabContent();
            } catch (error) {
                console.error('Failed to load usage history:', error);
                content.innerHTML = '<div class="error">Failed to load usage history</div>';
            }
        }
    }

    async changePage(page) {
        try {
            this.currentPage = page;
            
            // Show loading state in the table body only
            const tableBody = document.querySelector('.usage-history-table tbody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="loading-cell">
                            <div class="spinner-inline"></div>
                            Loading...
                        </td>
                    </tr>
                `;
            }
            
            this.usageHistory = await this.fetchUsageHistory(page, this.actionFilter);
            const content = document.querySelector('.profile-modal-content');
            if (content) {
                content.innerHTML = this.getTabContent();
            }
        } catch (error) {
            console.error('Failed to load page:', error);
            showError('Failed to load page');
        }
    }

    async handleFilterChange(filterValue) {
        try {
            this.actionFilter = filterValue || null;
            this.currentPage = 1;
            
            // Show loading state in the table body only
            const tableBody = document.querySelector('.usage-history-table tbody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="loading-cell">
                            <div class="spinner-inline"></div>
                            Applying filter...
                        </td>
                    </tr>
                `;
            }
            
            this.usageHistory = await this.fetchUsageHistory(1, this.actionFilter);
            const content = document.querySelector('.profile-modal-content');
            if (content) {
                content.innerHTML = this.getTabContent();
            }
        } catch (error) {
            console.error('Failed to apply filter:', error);
            showError('Failed to apply filter');
        }
    }

    async handleProfileUpdate(event) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const updates = {
                full_name: formData.get('full_name')
            };

            const response = await apiFetch('/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update profile');
            }

            const result = await response.json();
            this.userData.profile = result.profile;
            
            showSuccess('Profile updated successfully!');
            
            // Refresh user data in auth module and session manager
            if (window.authModule && typeof window.authModule.refreshUserData === 'function') {
                console.log('🔄 Profile updated, refreshing user data...');
                await window.authModule.refreshUserData();
                console.log('✅ User data refreshed, navbar should update');
            } else {
                console.warn('⚠️ Auth module not available or refreshUserData method missing');
            }
            
            // Refresh the profile tab content
            if (this.currentTab === 'profile') {
                const content = document.querySelector('.profile-modal-content');
                if (content) {
                    content.innerHTML = this.getTabContent();
                }
            }

        } catch (error) {
            console.error('Profile update error:', error);
            showError(error.message || 'Failed to update profile');
        }
    }

    async handlePasswordReset() {
        try {
            // Get user's email from profile data
            if (!this.userData || !this.userData.profile || !this.userData.profile.email) {
                showError('Unable to get user email. Please try again.');
                return;
            }

            const email = this.userData.profile.email;
            
            // Create custom confirmation modal instead of browser confirm
            const confirmed = await this.showPasswordResetConfirmation(email);
            if (!confirmed) {
                return; // User cancelled
            }

            // Show loading state
            const resetButton = document.querySelector('button[onclick="window.safeProfileHandlePasswordReset()"]');
            if (resetButton) {
                resetButton.disabled = true;
                resetButton.textContent = 'Sending Reset Email...';
            }

            // Use the auth module's resetPassword method (same as the auth page)
            if (window.authModule && typeof window.authModule.resetPassword === 'function') {
                await window.authModule.resetPassword(email);
                // The auth module will show the success message
                
                // Close the modal after successful reset
                setTimeout(() => {
                    this.close();
                }, 2000);
            } else {
                throw new Error('Authentication module not available. Please refresh the page and try again.');
            }
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            // The auth module handles most error display, but catch any that slip through
            if (error.message && !error.message.includes('OAuth') && !error.message.includes('Google')) {
                showError(error.message);
            }
        } finally {
            // Reset button state
            const resetButton = document.querySelector('button[onclick="window.safeProfileHandlePasswordReset()"]');
            if (resetButton) {
                resetButton.disabled = false;
                resetButton.textContent = 'Reset Password';
            }
        }
    }

    /**
     * Show account deletion confirmation dialog
     */
    showDeleteAccountDialog() {
        // Create custom modal overlay with higher z-index
        const overlay = document.createElement('div');
        overlay.className = 'profile-modal-backdrop delete-account-backdrop';
        overlay.style.zIndex = '10001';
        
        const modal = document.createElement('div');
        modal.className = 'profile-modal delete-account-modal';
        modal.style.maxWidth = '500px';
        modal.style.zIndex = '10002';
        
        modal.innerHTML = `
            <div class="profile-modal-header danger-header">
                <h2>Delete Account</h2>
            </div>
            <div class="profile-modal-content" style="padding: 24px;">
                <div class="danger-notice">
                    <p><strong>This action is permanent and cannot be undone!</strong></p>
                </div>
                
                <p style="margin: 16px 0;">
                    To confirm account deletion, please:
                </p>
                
                <form id="delete-account-form" style="margin-top: 20px;">
                    <div class="form-group">
                        <label for="delete-password">Enter your password:</label>
                        <input type="password" id="delete-password" class="form-control" required 
                               placeholder="Enter your current password">
                        <div class="form-error" id="delete-password-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="delete-confirmation">Type <strong>DELETE</strong> to confirm:</label>
                        <input type="text" id="delete-confirmation" class="form-control" required 
                               placeholder="Type DELETE in capital letters"
                               pattern="DELETE"
                               autocomplete="off">
                        <div class="form-error" id="delete-confirmation-error"></div>
                    </div>
                    
                    <div class="delete-warning">
                        <p><strong>This will permanently delete:</strong></p>
                        <ul>
                            <li>All your projects and data</li>
                            <li>Your ${this.userData.credits || 0} credits</li>
                            <li>All uploaded audio files</li>
                            <li>Your entire account</li>
                        </ul>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                        <button type="button" class="btn btn-secondary" id="deleteCancelBtn">Cancel</button>
                        <button type="submit" class="btn btn-danger" id="deleteConfirmBtn">
                            Delete My Account
                        </button>
                    </div>
                </form>
                
                <!-- Loading overlay for delete account process -->
                <div class="loading-overlay" id="delete-loading-overlay">
                    <div class="loading-spinner"></div>
                    <p>Processing account deletion...</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        // Show with animation
        setTimeout(() => {
            overlay.classList.add('show');
            modal.classList.add('show');
        }, 10);
        
        // Add input event listeners to clear errors when user starts typing
        const passwordInput = document.getElementById('delete-password');
        const confirmationInput = document.getElementById('delete-confirmation');
        
        passwordInput.addEventListener('input', () => {
            this.clearPasswordError();
        });
        
        confirmationInput.addEventListener('input', () => {
            this.clearConfirmationError();
        });

        // Handle form submission
        const form = document.getElementById('delete-account-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Prevent multiple rapid submissions
            if (this.isDeleting) {
                console.log('🔒 Delete already in progress, ignoring submission');
                return;
            }
            
            // Rate limiting protection
            const now = Date.now();
            const timeSinceLastAttempt = now - this.lastDeleteAttempt;
            const RATE_LIMIT_DELAY = 5000; // 5 seconds between attempts
            
            if (timeSinceLastAttempt < RATE_LIMIT_DELAY) {
                const remainingTime = Math.ceil((RATE_LIMIT_DELAY - timeSinceLastAttempt) / 1000);
                showError(`Please wait ${remainingTime} seconds before trying again.`);
                return;
            }
            
            const password = passwordInput.value;
            const confirmation = confirmationInput.value;
            
            // Clear any existing errors
            this.clearDeleteAccountErrors();
            
            // Validate confirmation text BEFORE showing loading
            if (confirmation !== 'DELETE') {
                this.showConfirmationError('Please type DELETE in capital letters to confirm.');
                return; // Don't show loading for validation errors
            }
            
            // Validate password is not empty
            if (!password.trim()) {
                this.showPasswordError('Password is required.');
                return; // Don't show loading for validation errors
            }
            
            // Set flags to prevent multiple submissions
            this.isDeleting = true;
            this.lastDeleteAttempt = now;
            
            try {
                await this.handleAccountDeletion(password, confirmation);
            } catch (error) {
                // Hide loading overlay on error and reset flags
                this.hideDeleteAccountLoading();
                this.isDeleting = false;
            }
        });
        
        // Handle cancel
        const cancelBtn = document.getElementById('deleteCancelBtn');
        cancelBtn.addEventListener('click', () => {
            this.closeDeleteDialog(overlay, modal);
        });
        
        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeDeleteDialog(overlay, modal);
            }
        });
        
        // Focus password field
        setTimeout(() => {
            document.getElementById('delete-password').focus();
        }, 100);
    }

    /**
     * Close delete account dialog
     */
    closeDeleteDialog(overlay, modal) {
        overlay.classList.remove('show');
        modal.classList.remove('show');
        
        // Reset deletion flags when closing dialog
        this.isDeleting = false;
        
        setTimeout(() => {
            overlay.remove();
            modal.remove();
        }, 300);
    }

    /**
     * Show error message for password field
     */
    showPasswordError(message) {
        const passwordInput = document.getElementById('delete-password');
        const errorDiv = document.getElementById('delete-password-error');
        
        if (passwordInput && errorDiv) {
            passwordInput.classList.add('is-invalid');
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }
    }

    /**
     * Clear password field error
     */
    clearPasswordError() {
        const passwordInput = document.getElementById('delete-password');
        const errorDiv = document.getElementById('delete-password-error');
        
        if (passwordInput && errorDiv) {
            passwordInput.classList.remove('is-invalid');
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');
        }
    }

    /**
     * Show error message for confirmation field
     */
    showConfirmationError(message) {
        const confirmationInput = document.getElementById('delete-confirmation');
        const errorDiv = document.getElementById('delete-confirmation-error');
        
        if (confirmationInput && errorDiv) {
            confirmationInput.classList.add('is-invalid');
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }
    }

    /**
     * Clear confirmation field error
     */
    clearConfirmationError() {
        const confirmationInput = document.getElementById('delete-confirmation');
        const errorDiv = document.getElementById('delete-confirmation-error');
        
        if (confirmationInput && errorDiv) {
            confirmationInput.classList.remove('is-invalid');
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');
        }
    }

    /**
     * Clear all delete account form errors
     */
    clearDeleteAccountErrors() {
        this.clearPasswordError();
        this.clearConfirmationError();
    }

    /**
     * Show loading overlay for delete account process
     */
    showDeleteAccountLoading() {
        const loadingOverlay = document.getElementById('delete-loading-overlay');
        const form = document.getElementById('delete-account-form');
        
        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }
        
        // Disable form to prevent interaction
        if (form) {
            form.style.pointerEvents = 'none';
            form.style.opacity = '0.5';
        }
    }

    /**
     * Hide loading overlay for delete account process
     */
    hideDeleteAccountLoading() {
        const loadingOverlay = document.getElementById('delete-loading-overlay');
        const form = document.getElementById('delete-account-form');
        
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
        
        // Re-enable form
        if (form) {
            form.style.pointerEvents = '';
            form.style.opacity = '';
        }
    }

    /**
     * Handle account deletion
     */
    async handleAccountDeletion(password, confirmationText) {
        try {
            // Clear any existing errors
            this.clearDeleteAccountErrors();

            // Basic client-side validation (no API calls)
            if (!password || !password.trim()) {
                this.showPasswordError('Password is required.');
                return; // Don't show loading for empty password
            }

            // Show loading only when we're actually making the API call
            this.showDeleteAccountLoading();

            const response = await apiFetch('/auth/account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: password,
                    confirmation_text: confirmationText
                })
            });

            if (!response.ok) {
                const error = await response.json();
                
                // Handle specific errors
                if (error.message === 'Invalid password' || error.message === 'Authentication failed') {
                    this.showPasswordError('Invalid password. Please enter your current password.');
                } else if (error.message === 'Please type DELETE to confirm account deletion') {
                    this.showConfirmationError('Please type DELETE in capital letters to confirm.');
                } else if (response.status === 429) {
                    showError('Too many deletion attempts. Please wait a few minutes before trying again.');
                } else {
                    showError(error.message || 'Failed to delete account. Please try again.');
                }
                
                throw new Error(error.message || 'Failed to delete account');
            }

            // Success - show message and redirect
            showSuccess('Account deleted successfully. Redirecting...');
            
            // Clear all local storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Reset deletion flags on success
            this.isDeleting = false;
            
            // Close modal and redirect after a short delay
            setTimeout(() => {
                window.location.href = '/?deleted=true';
            }, 2000);
            
        } catch (error) {
            console.error('Account deletion error:', error);
            throw error; // Re-throw to reset form state
        }
    }

    /**
     * Show custom confirmation dialog for password reset
     */
    showPasswordResetConfirmation(email) {
        return new Promise((resolve) => {
            // Create custom modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'profile-modal-backdrop';
            overlay.style.zIndex = '10001'; // Higher than profile modal
            
            const modal = document.createElement('div');
            modal.className = 'profile-modal';
            modal.style.maxWidth = '500px';
            modal.style.zIndex = '10002';
            
            modal.innerHTML = `
                <div class="profile-modal-header">
                    <h2>🔑 Reset Password</h2>
                </div>
                <div class="profile-modal-content" style="padding: 24px;">
                    <p style="margin-bottom: 16px;">
                        Are you sure you want to reset your password?
                    </p>
                    <div class="security-info" style="margin-bottom: 20px;">
                        <p><strong>Email:</strong> ${email}</p>
                        <p class="help-text">A password reset link will be sent to this address.</p>
                    </div>
                    <div class="security-notice" style="margin-bottom: 24px;">
                        <p><strong>🔒 What happens next:</strong></p>
                        <ul>
                            <li>You'll receive an email with a reset link</li>
                            <li>The link expires in 1 hour for security</li>
                            <li>Check your spam folder if you don't see it</li>
                            <li>You can only use the link once</li>
                        </ul>
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn btn-secondary" id="resetCancelBtn">Cancel</button>
                        <button class="btn btn-primary" id="resetConfirmBtn">Send Reset Email</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            
            // Show with animation
            setTimeout(() => {
                overlay.classList.add('show');
                modal.classList.add('show');
            }, 10);
            
            // Handle button clicks
            const cancelBtn = modal.querySelector('#resetCancelBtn');
            const confirmBtn = modal.querySelector('#resetConfirmBtn');
            
            const cleanup = () => {
                modal.classList.remove('show');
                overlay.classList.remove('show');
                setTimeout(() => {
                    if (modal.parentNode) modal.remove();
                    if (overlay.parentNode) overlay.remove();
                }, 300);
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
            
            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };
            
            // Close on overlay click
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            };
        });
    }
}

// Create global instance
const profileModal = new ProfileModal();

// CRITICAL: Make profileModal globally available immediately to prevent race conditions
window.profileModal = profileModal;

// Safe wrapper functions for HTML onclick handlers
window.safeProfileClose = function() {
    console.log('🔐 Safe profile close called');
    if (window.profileModal && typeof window.profileModal.close === 'function') {
        window.profileModal.close();
    } else {
        console.error('Profile modal not ready for close');
    }
};

window.safeProfileChangePage = function(page) {
    console.log('🔐 Safe profile page change called:', page);
    if (window.profileModal && typeof window.profileModal.changePage === 'function') {
        window.profileModal.changePage(page);
    } else {
        console.error('Profile modal not ready for page change');
    }
};

window.safeProfileHandleFilterChange = function(value) {
    console.log('🔐 Safe profile filter change called:', value);
    if (window.profileModal && typeof window.profileModal.handleFilterChange === 'function') {
        window.profileModal.handleFilterChange(value);
    } else {
        console.error('Profile modal not ready for filter change');
    }
};

window.safeProfileHandleUpdate = function(event) {
    console.log('🔐 Safe profile update called');
    if (window.profileModal && typeof window.profileModal.handleProfileUpdate === 'function') {
        window.profileModal.handleProfileUpdate(event);
    } else {
        console.error('Profile modal not ready for profile update');
        event.preventDefault();
    }
};

window.safeProfileHandlePasswordReset = function() {
    console.log('🔐 Safe password reset called');
    if (window.profileModal && typeof window.profileModal.handlePasswordReset === 'function') {
        window.profileModal.handlePasswordReset();
    } else {
        console.error('Profile modal not ready for password reset');
    }
};

window.safeProfileShowDeleteDialog = function() {
    console.log('🔐 Safe delete dialog called');
    if (window.profileModal && typeof window.profileModal.showDeleteAccountDialog === 'function') {
        window.profileModal.showDeleteAccountDialog();
    } else {
        console.error('Profile modal not ready for delete dialog');
    }
};

// Clean up event listeners when page unloads
window.addEventListener('beforeunload', () => {
    document.removeEventListener('keydown', profileModal.handleKeydown);
});

export { ProfileModal, profileModal }; 