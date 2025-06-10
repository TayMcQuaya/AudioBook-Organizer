/**
 * Theme Manager Module
 * Handles light/dark theme switching and persistence
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
        // Load saved theme or detect system preference
        this.loadTheme();
        
        // Apply initial theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        this.listenForSystemThemeChanges();
        
        // Wait for DOM to be ready then update icon
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateThemeIcon(this.currentTheme);
            });
        } else {
            this.updateThemeIcon(this.currentTheme);
        }
        
        console.log(`🎨 Theme Manager initialized with ${this.currentTheme} theme`);
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
     * Apply theme to the document
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
        } else {
            html.removeAttribute('data-theme');
        }
        
        // Update theme toggle icon
        this.updateThemeIcon(theme);
        
        // Save to localStorage
        localStorage.setItem(this.storageKey, theme);
        
        console.log(`🎨 Applied ${theme} theme`);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.currentTheme = newTheme;
        this.applyTheme(newTheme);
        
        // Emit theme change event for other modules
        window.dispatchEvent(new CustomEvent('theme-changed', { 
            detail: { theme: newTheme } 
        }));
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
                this.applyTheme(systemTheme);
            }
        });
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme programmatically
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            this.applyTheme(theme);
        }
    }
}

// Create and export singleton instance
const themeManager = new ThemeManager();

// Make it globally available
window.themeManager = themeManager;

// Global function for HTML onclick
window.toggleTheme = () => themeManager.toggleTheme();

export default themeManager; 