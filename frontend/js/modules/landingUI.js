// AudioBook Organizer - Landing UI Module

import { showSuccess, showError, showWarning, showInfo } from './notifications.js';

// Landing UI state
let currentTheme = 'light';
let isScrolled = false;
let activeSection = null;

// UI Components and utilities
export const landingUI = {
    // Theme management
    setTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('audiobook-theme', theme);
    },
    
    getTheme() {
        return currentTheme;
    },
    
    // Navigation utilities
    updateActiveNavItem(sectionId) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current section link
        const activeLink = document.querySelector(`[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        activeSection = sectionId;
    },
    
    // Loading states
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('.loading-text');
        
        if (text) text.textContent = message;
        overlay.classList.add('show');
    },
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('show');
    },
    
    // Modal utilities
    createModal(title, content, actions = []) {
        const modalId = 'modal-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="landingUI.closeModal('${modalId}')">×</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                <div class="modal-actions">
                    ${actions.map(action => `
                        <button class="btn ${action.class || 'btn-primary'}" onclick="${action.onclick}">
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);
        
        return modalId;
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    },
    
    // Tooltip system
    createTooltip(element, text, position = 'top') {
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;
        
        element.appendChild(tooltip);
        
        element.addEventListener('mouseenter', () => {
            tooltip.classList.add('show');
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
    },
    
    // Progress indicators
    createProgressBar(container, steps) {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        progressBar.innerHTML = `
            <div class="progress-track">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-steps">
                ${steps.map((step, index) => `
                    <div class="progress-step" data-step="${index + 1}">
                        <div class="step-circle">${index + 1}</div>
                        <div class="step-label">${step}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(progressBar);
        return progressBar;
    },
    
    updateProgress(progressBar, currentStep, totalSteps) {
        const percentage = (currentStep / totalSteps) * 100;
        const fill = progressBar.querySelector('.progress-fill');
        const steps = progressBar.querySelectorAll('.progress-step');
        
        fill.style.width = `${percentage}%`;
        
        steps.forEach((step, index) => {
            if (index < currentStep) {
                step.classList.add('completed');
            } else if (index === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('completed', 'active');
            }
        });
    },
    
    // Feature showcase utilities
    highlightFeature(featureId) {
        // Remove highlight from all features
        document.querySelectorAll('.feature-card').forEach(card => {
            card.classList.remove('highlighted');
        });
        
        // Highlight specific feature
        const feature = document.querySelector(`[data-feature="${featureId}"]`);
        if (feature) {
            feature.classList.add('highlighted');
            feature.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },
    
    // Demo functionality
    playFeatureDemo(featureType) {
        switch (featureType) {
            case 'chapters':
                this.showChapterDemo();
                break;
            case 'audio':
                this.showAudioDemo();
                break;
            case 'highlighting':
                this.showHighlightingDemo();
                break;
            case 'export':
                this.showExportDemo();
                break;
            default:
                showInfo('Demo coming soon!');
        }
    },
    
    showChapterDemo() {
        const demoContent = `
            <div class="demo-showcase">
                <h4>Chapter Organization Demo</h4>
                <div class="demo-chapters">
                    <div class="demo-chapter">
                        <span class="chapter-icon">📖</span>
                        <span class="chapter-title">Chapter 1: Introduction</span>
                        <div class="chapter-actions">
                            <button class="demo-btn">Edit</button>
                            <button class="demo-btn">Reorder</button>
                        </div>
                    </div>
                    <div class="demo-chapter">
                        <span class="chapter-icon">📄</span>
                        <span class="chapter-title">Chapter 2: Getting Started</span>
                        <div class="chapter-actions">
                            <button class="demo-btn">Edit</button>
                            <button class="demo-btn">Reorder</button>
                        </div>
                    </div>
                </div>
                <p class="demo-description">
                    Drag and drop chapters to reorder them. Double-click to edit titles.
                    Create nested sections for better organization.
                </p>
            </div>
        `;
        
        this.createModal('Chapter Organization', demoContent, [
            { text: 'Try It Live', class: 'btn-primary', onclick: 'showAuthModal("signup")' },
            { text: 'Close', class: 'btn-secondary', onclick: 'landingUI.closeModal(this.closest(".modal-overlay").id)' }
        ]);
    },
    
    showAudioDemo() {
        const demoContent = `
            <div class="demo-showcase">
                <h4>Audio Management Demo</h4>
                <div class="demo-audio-player">
                    <div class="audio-controls">
                        <button class="play-btn">▶️</button>
                        <div class="audio-progress">
                            <div class="progress-track">
                                <div class="progress-handle" style="left: 30%"></div>
                            </div>
                        </div>
                        <span class="audio-time">2:34 / 15:42</span>
                    </div>
                    <div class="audio-sections">
                        <div class="audio-section active">Section 1</div>
                        <div class="audio-section">Section 2</div>
                        <div class="audio-section">Section 3</div>
                    </div>
                </div>
                <p class="demo-description">
                    Upload audio files for each section. The player automatically 
                    synchronizes with your text sections for seamless navigation.
                </p>
            </div>
        `;
        
        this.createModal('Audio Management', demoContent, [
            { text: 'Try It Live', class: 'btn-primary', onclick: 'showAuthModal("signup")' },
            { text: 'Close', class: 'btn-secondary', onclick: 'landingUI.closeModal(this.closest(".modal-overlay").id)' }
        ]);
    },
    
    showHighlightingDemo() {
        const demoContent = `
            <div class="demo-showcase">
                <h4>Smart Text Highlighting Demo</h4>
                <div class="demo-text">
                    <p>
                        <span class="highlight-color-1">This is an important concept</span> 
                        that you should remember. The AudioBook Organizer provides 
                        <span class="highlight-color-2">8 different color options</span> 
                        for categorizing your content.
                    </p>
                    <p>
                        You can use <span class="highlight-color-3">smart selection</span> 
                        to automatically select text chunks, or manually select 
                        <span class="highlight-color-4">specific phrases</span> for highlighting.
                    </p>
                </div>
                <div class="color-palette">
                    <div class="color-option" style="background: var(--section-color-1)">1</div>
                    <div class="color-option" style="background: var(--section-color-2)">2</div>
                    <div class="color-option" style="background: var(--section-color-3)">3</div>
                    <div class="color-option" style="background: var(--section-color-4)">4</div>
                    <div class="color-option" style="background: var(--section-color-5)">5</div>
                    <div class="color-option" style="background: var(--section-color-6)">6</div>
                    <div class="color-option" style="background: var(--section-color-7)">7</div>
                    <div class="color-option" style="background: var(--section-color-8)">8</div>
                </div>
                <p class="demo-description">
                    Use different colors to categorize content: definitions, examples, 
                    important points, questions, etc.
                </p>
            </div>
        `;
        
        this.createModal('Text Highlighting', demoContent, [
            { text: 'Try It Live', class: 'btn-primary', onclick: 'showAuthModal("signup")' },
            { text: 'Close', class: 'btn-secondary', onclick: 'landingUI.closeModal(this.closest(".modal-overlay").id)' }
        ]);
    },
    
    showExportDemo() {
        const demoContent = `
            <div class="demo-showcase">
                <h4>Export & Import Demo</h4>
                <div class="export-options">
                    <div class="export-option">
                        <span class="export-icon">📦</span>
                        <div class="export-info">
                            <h5>ZIP Archive</h5>
                            <p>Complete backup with all files</p>
                        </div>
                        <button class="demo-btn">Export</button>
                    </div>
                    <div class="export-option">
                        <span class="export-icon">🎵</span>
                        <div class="export-info">
                            <h5>Audio Files</h5>
                            <p>All audio with metadata</p>
                        </div>
                        <button class="demo-btn">Export</button>
                    </div>
                    <div class="export-option">
                        <span class="export-icon">📝</span>
                        <div class="export-info">
                            <h5>Highlighted Text</h5>
                            <p>Text with all highlights preserved</p>
                        </div>
                        <button class="demo-btn">Export</button>
                    </div>
                </div>
                <p class="demo-description">
                    Export your organized audiobooks in multiple formats. 
                    Perfect for backup, sharing, or moving between devices.
                </p>
            </div>
        `;
        
        this.createModal('Export Options', demoContent, [
            { text: 'Try It Live', class: 'btn-primary', onclick: 'showAuthModal("signup")' },
            { text: 'Close', class: 'btn-secondary', onclick: 'landingUI.closeModal(this.closest(".modal-overlay").id)' }
        ]);
    },
    
    // Pricing utilities
    updatePricingDisplay(plan, isYearly = false) {
        const pricingCards = document.querySelectorAll('.pricing-card');
        
        pricingCards.forEach(card => {
            card.classList.remove('selected');
            if (card.dataset.plan === plan) {
                card.classList.add('selected');
            }
        });
        
        // Update pricing amounts if yearly toggle exists
        if (isYearly) {
            // Apply yearly discount logic here
        }
    },
    
    // Testimonials carousel
    initTestimonialCarousel() {
        const testimonials = document.querySelectorAll('.testimonial');
        let currentTestimonial = 0;
        
        const showTestimonial = (index) => {
            testimonials.forEach((testimonial, i) => {
                testimonial.classList.toggle('active', i === index);
            });
        };
        
        const nextTestimonial = () => {
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            showTestimonial(currentTestimonial);
        };
        
        // Auto-rotate testimonials
        setInterval(nextTestimonial, 5000);
        
        // Initialize first testimonial
        if (testimonials.length > 0) {
            showTestimonial(0);
        }
    },
    
    // FAQ functionality
    initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('open');
                });
                
                // Toggle current item
                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        });
    },
    
    // Newsletter signup
    handleNewsletterSignup(email) {
        if (!this.isValidEmail(email)) {
            showError('Please enter a valid email address');
            return false;
        }
        
        // Simulate API call
        this.showLoading('Subscribing...');
        
        setTimeout(() => {
            this.hideLoading();
            showSuccess('Thanks for subscribing! You\'ll receive updates about new features.');
        }, 1500);
        
        return true;
    },
    
    // Utility functions
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Analytics and tracking (placeholder)
    trackEvent(eventName, properties = {}) {
        console.log('Track Event:', eventName, properties);
        // Integrate with analytics service here
    },
    
    trackPageView(page) {
        console.log('Track Page View:', page);
        // Integrate with analytics service here
    }
};

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('audiobook-theme');
if (savedTheme) {
    landingUI.setTheme(savedTheme);
}

// Add global styles for landing UI components
const landingUIStyles = `
    <style>
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .modal-overlay.show {
            opacity: 1;
            visibility: visible;
        }
        
        .modal-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            transform: scale(0.9) translateY(-20px);
            transition: transform 0.3s ease;
        }
        
        .modal-overlay.show .modal-container {
            transform: scale(1) translateY(0);
        }
        
        .modal-header {
            padding: 1.5rem 2rem 1rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0.5rem;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        
        .modal-close:hover {
            background: #f0f0f0;
            color: var(--text-primary);
        }
        
        .modal-content {
            padding: 2rem;
        }
        
        .modal-actions {
            padding: 1rem 2rem 2rem;
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }
        
        .tooltip {
            position: absolute;
            background: #333;
            color: white;
            padding: 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 1000;
        }
        
        .tooltip.show {
            opacity: 1;
        }
        
        .tooltip-top {
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 5px;
        }
        
        .progress-bar {
            margin: 2rem 0;
        }
        
        .progress-track {
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin-bottom: 1rem;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--primary-color);
            border-radius: 2px;
            transition: width 0.3s ease;
        }
        
        .progress-steps {
            display: flex;
            justify-content: space-between;
        }
        
        .progress-step {
            text-align: center;
            flex: 1;
        }
        
        .step-circle {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #e0e0e0;
            color: #999;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 0.5rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .progress-step.active .step-circle {
            background: var(--primary-color);
            color: white;
        }
        
        .progress-step.completed .step-circle {
            background: var(--primary-color);
            color: white;
        }
        
        .step-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .feature-card.highlighted {
            transform: translateY(-10px) scale(1.05);
            box-shadow: 0 15px 30px rgba(76, 175, 80, 0.3);
            border: 2px solid var(--primary-color);
        }
        
        .demo-showcase {
            text-align: center;
        }
        
        .demo-chapters, .export-options {
            margin: 1.5rem 0;
        }
        
        .demo-chapter, .export-option {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f9f9f9;
            border-radius: 8px;
            margin-bottom: 0.5rem;
        }
        
        .demo-btn {
            padding: 0.5rem 1rem;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background 0.3s ease;
        }
        
        .demo-btn:hover {
            background: var(--primary-hover);
        }
        
        .demo-audio-player {
            background: #f9f9f9;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1.5rem 0;
        }
        
        .audio-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .play-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--primary-color);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .audio-progress {
            flex: 1;
            height: 20px;
            position: relative;
        }
        
        .progress-handle {
            position: absolute;
            top: 50%;
            width: 12px;
            height: 12px;
            background: var(--primary-color);
            border-radius: 50%;
            transform: translateY(-50%);
            cursor: pointer;
        }
        
        .audio-sections {
            display: flex;
            gap: 0.5rem;
        }
        
        .audio-section {
            padding: 0.5rem 1rem;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.3s ease;
        }
        
        .audio-section.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }
        
        .demo-text {
            background: #f9f9f9;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1.5rem 0;
            text-align: left;
            line-height: 1.6;
        }
        
        .highlight-color-1 { background: var(--section-color-1); padding: 2px 4px; border-radius: 3px; }
        .highlight-color-2 { background: var(--section-color-2); padding: 2px 4px; border-radius: 3px; }
        .highlight-color-3 { background: var(--section-color-3); padding: 2px 4px; border-radius: 3px; }
        .highlight-color-4 { background: var(--section-color-4); padding: 2px 4px; border-radius: 3px; }
        
        .color-palette {
            display: flex;
            gap: 0.5rem;
            justify-content: center;
            margin: 1rem 0;
        }
        
        .color-option {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.875rem;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        
        .color-option:hover {
            transform: scale(1.1);
        }
        
        .demo-description {
            color: var(--text-secondary);
            font-size: 0.9rem;
            line-height: 1.5;
            margin-top: 1rem;
        }
        
        .export-info {
            flex: 1;
            text-align: left;
        }
        
        .export-info h5 {
            margin: 0 0 0.25rem 0;
            font-weight: 600;
        }
        
        .export-info p {
            margin: 0;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }
        
        .export-icon {
            font-size: 1.5rem;
            width: 50px;
            text-align: center;
        }
    </style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', landingUIStyles);

// Make landingUI globally available
window.landingUI = landingUI;

export default landingUI; 