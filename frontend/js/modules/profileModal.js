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
    }

    async open() {
        if (this.isOpen) return;
        
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
        }
    }

    async fetchUserData() {
        try {
            // Fetch profile and usage history in parallel
            const [profileResponse, historyResponse, creditsResponse] = await Promise.all([
                apiFetch('/api/auth/profile'),
                apiFetch('/api/auth/usage-history?page=1&per_page=10'),
                apiFetch('/api/auth/credits')
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
            let url = `/api/auth/usage-history?page=${page}&per_page=10`;
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
        // Remove existing modal
        this.removeModal();

        // Create backdrop and modal
        const backdrop = document.createElement('div');
        backdrop.className = 'profile-modal-backdrop';
        backdrop.onclick = () => this.close();

        const modal = document.createElement('div');
        modal.className = 'profile-modal';
        modal.innerHTML = this.getModalHTML();

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        // Setup event listeners
        this.setupEventListeners();
        
        // Show with animation
        setTimeout(() => {
            backdrop.classList.add('show');
            modal.classList.add('show');
        }, 10);
    }

    getModalHTML() {
        return `
            <div class="profile-modal-header">
                <h2>Profile</h2>
                <button class="profile-modal-close" onclick="window.profileModal.close()">×</button>
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
                <div class="profile-avatar">${initials}</div>
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

    getHistoryTabHTML() {
        if (!this.usageHistory || !this.usageHistory.data) {
            return '<div class="loading">Loading usage history...</div>';
        }

        const { data, pagination } = this.usageHistory;

        // Current balance display
        const currentCredits = this.userData?.credits ?? 0;
        const balanceDisplay = `
            <div class="current-balance">
                <h3>Current Balance</h3>
                <div class="balance-display">
                    ${currentCredits} <span class="credit-icon">💎</span>
                </div>
            </div>
        `;

        // Filter options
        const filterOptions = `
            <div class="history-filters">
                <label for="action-filter">Filter by action:</label>
                <select id="action-filter" onchange="window.profileModal.handleFilterChange(this.value)">
                    <option value="">All actions</option>
                    <option value="audio_upload" ${this.actionFilter === 'audio_upload' ? 'selected' : ''}>Audio Upload</option>
                    <option value="docx_processing" ${this.actionFilter === 'docx_processing' ? 'selected' : ''}>DOCX Processing</option>
                    <option value="txt_upload" ${this.actionFilter === 'txt_upload' ? 'selected' : ''}>TXT Upload</option>
                    <option value="premium_export" ${this.actionFilter === 'premium_export' ? 'selected' : ''}>Premium Export</option>
                    <option value="credit_purchase" ${this.actionFilter === 'credit_purchase' ? 'selected' : ''}>Credit Purchase</option>
                </select>
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
            // For purchases, show positive. For consumption, show negative
            const isPurchase = entry.action === 'credit_purchase' || entry.action === 'credits_purchase';
            
            // Handle credit display - purchases should show positive values
            let credits, creditDisplay, creditClass;
            if (isPurchase) {
                // For purchases, credits_used should be positive (amount purchased)
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
            if (isPurchase) {
                console.log(`Found credit purchase in history: ${credits} credits on ${date}`, entry);
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
        `;

        // Pagination
        const paginationHTML = this.getPaginationHTML(pagination);

        return balanceDisplay + filterOptions + table + paginationHTML;
    }

    getSettingsTabHTML() {
        if (!this.userData || !this.userData.profile) {
            return '<div class="loading">Loading settings...</div>';
        }

        const profile = this.userData.profile;

        return `
            <div class="settings-section">
                <h3>Profile Information</h3>
                <form id="profile-form" onsubmit="window.profileModal.handleProfileUpdate(event)">
                    <div class="form-group">
                        <label for="profile-name">Full Name</label>
                        <input type="text" id="profile-name" name="full_name" value="${profile.full_name || ''}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>

            <div class="settings-section">
                <h3>Account Security</h3>
                <button class="btn btn-secondary" onclick="window.profileModal.handlePasswordReset()">
                    Reset Password
                </button>
                <p class="help-text">A password reset email will be sent to your registered email address.</p>
            </div>
        `;
    }

    formatActionName(action) {
        const actionNames = {
            'audio_upload': 'Audio Upload',
            'docx_processing': 'DOCX Processing',
            'txt_upload': 'TXT Upload',
            'premium_export': 'Premium Export',
            'credit_purchase': 'Credit Purchase'
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
            paginationHTML += `<button onclick="window.profileModal.changePage(${page - 1})">Previous</button>`;
        }

        // Page numbers
        for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
            const activeClass = i === page ? 'active' : '';
            paginationHTML += `<button class="${activeClass}" onclick="window.profileModal.changePage(${i})">${i}</button>`;
        }

        // Next button
        if (page < pages) {
            paginationHTML += `<button onclick="window.profileModal.changePage(${page + 1})">Next</button>`;
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
        if (tabName === 'history' && (!this.usageHistory || this.usageHistory.data.length === 0)) {
            try {
                this.usageHistory = await this.fetchUsageHistory(this.currentPage, this.actionFilter);
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

            const response = await apiFetch('/api/auth/profile', {
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
            const email = this.userData.profile.email;
            const response = await apiFetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                showSuccess('Password reset email sent! Check your inbox.');
            } else {
                const error = await response.json();
                showError(error.message || 'Failed to send reset email');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            showError('Network error. Please try again.');
        }
    }
}

// Create global instance
const profileModal = new ProfileModal();
window.profileModal = profileModal;

// Clean up event listeners when page unloads
window.addEventListener('beforeunload', () => {
    document.removeEventListener('keydown', profileModal.handleKeydown);
});

export { ProfileModal, profileModal }; 