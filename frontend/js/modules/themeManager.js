/**
 * Theme Manager Module
 * Handles light/dark theme switching and persistence
 * Only applies dark mode to app pages - landing page always stays light
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.storageKey = 'audiobook-theme';
        this.init();
    }

    /**
     * Initialize theme manager
     */
    init() {
        // Load theme preference (but don't apply yet)
        this.loadTheme();
        
        // Apply initial theme based on current page
        this.applyThemeForCurrentPage();
        
        // Listen for page changes to update theme application
        this.listenForPageChanges();
        
        // Listen for system theme changes
        this.listenForSystemThemeChanges();
        
        // Wait for DOM to be ready then update icon
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateThemeIcon(this.getCurrentDisplayTheme());
            });
        } else {
            this.updateThemeIcon(this.getCurrentDisplayTheme());
        }
        
        console.log(`🎨 Theme Manager initialized with ${this.currentTheme} preference (current display: ${this.getCurrentDisplayTheme()})`);
    }

    /**
     * Check if we're currently on the app page
     */
    isAppPage() {
        return document.body.classList.contains('app-body');
    }

    /**
     * Check if we're on the landing page
     */
    isLandingPage() {
        return document.body.classList.contains('landing-body');
    }

    /**
     * Get the theme that should be displayed based on current page
     */
    getCurrentDisplayTheme() {
        // Landing page is always light mode
        if (this.isLandingPage()) {
            return 'light';
        }
        
        // App page uses the stored preference
        if (this.isAppPage()) {
            return this.currentTheme;
        }
        
        // Other pages (auth, etc.) use light mode by default
        return 'light';
    }

    /**
     * Check if this is the first visit to the app page (no saved theme preference)
     */
    isFirstAppVisit() {
        return !localStorage.getItem(this.storageKey);
    }

    /**
     * Load theme from localStorage or system preference
     */
    loadTheme() {
        const savedTheme = localStorage.getItem(this.storageKey);
        
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            this.currentTheme = savedTheme;
        } else {
            // Detect system preference
            this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
    }

    /**
     * Apply theme based on current page context
     */
    applyThemeForCurrentPage() {
        const displayTheme = this.getCurrentDisplayTheme();
        this.applyThemeToDOM(displayTheme);
    }

    /**
     * Apply theme to the document
     */
    applyThemeToDOM(theme) {
        const html = document.documentElement;
        
        if (theme === 'dark' && this.isAppPage()) {
            // Only apply dark mode on app pages
            html.setAttribute('data-theme', 'dark');
        } else {
            // Remove dark mode for all other pages
            html.removeAttribute('data-theme');
        }
        
        // Update theme toggle icon
        this.updateThemeIcon(theme);
        
        console.log(`🎨 Applied ${theme} theme (page: ${this.isAppPage() ? 'app' : this.isLandingPage() ? 'landing' : 'other'})`);
    }

    /**
     * Toggle between light and dark themes (only works on app pages)
     */
    toggleTheme() {
        // Only allow theme toggle on app pages
        if (!this.isAppPage()) {
            console.log('🎨 Theme toggle blocked - not on app page');
            return;
        }

        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.currentTheme = newTheme;
        
        // Save preference for app pages
        localStorage.setItem(this.storageKey, newTheme);
        
        // Apply theme to DOM
        this.applyThemeToDOM(newTheme);
        
        // Emit theme change event for other modules
        window.dispatchEvent(new CustomEvent('theme-changed', { 
            detail: { theme: newTheme } 
        }));
    }

    /**
     * Listen for page changes (body class changes)
     */
    listenForPageChanges() {
        // Use MutationObserver to watch for body class changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Body class changed, reapply theme for new page context
                    this.applyThemeForCurrentPage();
                }
            });
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    /**
     * Update theme toggle icon
     */
    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
            themeIcon.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        }
    }

    /**
     * Listen for system theme changes
     */
    listenForSystemThemeChanges() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!localStorage.getItem(this.storageKey)) {
                const systemTheme = e.matches ? 'dark' : 'light';
                this.currentTheme = systemTheme;
                this.applyThemeForCurrentPage();
            }
        });
    }

    /**
     * Get current theme preference (for app pages)
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme programmatically (only affects app pages)
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            localStorage.setItem(this.storageKey, theme);
            this.applyThemeForCurrentPage();
        }
    }

    /**
     * Force light mode (used internally for non-app pages)
     */
    forceLightMode() {
        this.applyThemeToDOM('light');
    }
}

// Create and export singleton instance
const themeManager = new ThemeManager();

// Make it globally available
window.themeManager = themeManager;

// Global function for HTML onclick (only works on app pages)
window.toggleTheme = () => themeManager.toggleTheme();

export default themeManager; 