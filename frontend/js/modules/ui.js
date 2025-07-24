// AudioBook Organizer - UI Management

import { chapters, currentColorIndex, getNextColor } from './state.js';
import { calculateChapterDuration } from './chapters.js';
import { initializeDragAndDrop } from './sections.js';
import { formatDuration, getAccentColor } from '../utils/helpers.js';
import { getAllCreditCosts } from './creditConfig.js';

// UI Updates - preserving exact logic from original
export function updateChaptersList() {
    const sectionsList = document.getElementById('sectionsList');
    if (!sectionsList) {
        console.warn('⚠️ sectionsList element not found - skipping update');
        return;
    }
    sectionsList.innerHTML = chapters.map(chapter => `
        <div class="chapter-item" data-chapter-id="${chapter.id}">
            <div class="chapter-header" onclick="toggleChapter(${chapter.id})">
                <div class="chapter-collapse-icon ${chapter.collapsed ? 'collapsed' : ''}">▼</div>
                <div class="color-indicator" style="background-color: var(--section-color-${chapter.colorIndex}); border-color: ${getAccentColor(chapter.colorIndex)}"></div>
                <input type="text" value="${chapter.name}" 
                       onchange="updateChapterName(${chapter.id}, this.value)"
                       onclick="event.stopPropagation()"
                       class="chapter-title" />
                <div class="chapter-duration">${formatDuration(calculateChapterDuration(chapter))}</div>
                <div class="chapter-controls">
                    <button class="chapter-play-btn" onclick="event.stopPropagation(); toggleChapterPlayback(${chapter.id})">
                        <i>▶️</i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteChapter(${chapter.id})">
                        <i>🗑️</i>
                    </button>
                </div>
            </div>
            <div class="chapter-audio-player" id="chapter-player-${chapter.id}">
                <div class="chapter-audio-controls">
                    <button class="chapter-play-btn" onclick="toggleChapterPlayback(${chapter.id})">
                        <i id="chapter-play-icon-${chapter.id}">▶️</i>
                    </button>
                    <div class="chapter-audio-time" id="chapter-current-time-${chapter.id}">0:00</div>
                    <div class="chapter-audio-progress" onclick="seekChapterAudio(event, ${chapter.id})">
                        <div class="chapter-audio-progress-bar" id="chapter-progress-${chapter.id}"></div>
                    </div>
                    <div class="chapter-audio-time" id="chapter-duration-${chapter.id}">0:00</div>
                </div>
                <div class="chapter-audio-sections" id="chapter-sections-${chapter.id}">
                    ${chapter.sections.filter(s => s.audioPath).map((section, index, array) => {
                        const width = (100 / array.length) + '%';
                        return `<div class="chapter-audio-section" style="width: ${width}" data-section-id="${section.id}"></div>`;
                    }).join('')}
                </div>
            </div>
            <div class="chapter-sections ${chapter.collapsed ? 'collapsed' : ''}" data-chapter-id="${chapter.id}">
                ${chapter.sections.map((section, index) => `
                    <div class="section-item section-color-${section.colorIndex}" 
                         data-section-id="${section.id}"
                         data-index="${index}"
                         draggable="true"
                         ondblclick="navigateToSection(${section.id})"
                         title="Double-click to locate in text">
                        <div class="section-header">
                            <div class="drag-handle">⋮⋮</div>
                            <div class="color-indicator" style="background-color: var(--section-color-${section.colorIndex}); border-color: ${getAccentColor(section.colorIndex)}"></div>
                            <input type="text" value="${section.name}" 
                                   onchange="updateSectionName(${section.id}, this.value)" 
                                   class="section-name" />
                            <span class="section-status">${section.status}</span>
                            <button class="copy-section-btn" onclick="copySectionText(${section.id})" title="Copy section text">
                                📋
                            </button>
                        </div>
                        <div class="section-text">${section.text}</div>
                        <div class="audio-controls">
                            ${section.audioPath ? `
                                ${section.audioStatus === 'missing' ? `
                                    <div class="missing-audio-warning">
                                        <span class="warning-icon">⚠️</span>
                                        <span class="warning-text">Audio file not accessible</span>
                                                                                 <div class="missing-audio-actions">
                                             <input type="file" accept="audio/*" onchange="attachAudio(${chapter.id}, ${section.id}, this)" title="Re-upload audio file" id="missing-audio-input-${section.id}">
                                             <button onclick="clearMissingAudio(${chapter.id}, ${section.id})" title="Remove missing audio reference">Clear</button>
                                         </div>
                                    </div>
                                ` : `
                                    <audio controls src="${section.audioPath}" data-section-id="${section.id}" data-storage-backend="${section.storageBackend || 'local'}"></audio>
                                    <button onclick="removeAudio(${chapter.id}, ${section.id})">Remove Audio</button>
                                `}
                            ` : `
                                <input type="file" accept="audio/*" onchange="attachAudio(${chapter.id}, ${section.id}, this)">
                            `}
                            <button onclick="deleteSection(${chapter.id}, ${section.id})">Delete Section</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    initializeDragAndDrop();
    
    // Initialize audio URLs for Supabase Storage
    initializeAudioUrls();
}

/**
 * Initialize audio URLs for Supabase Storage
 * Updates audio elements with signed URLs when using Supabase Storage
 */
async function initializeAudioUrls() {
    const audioElements = document.querySelectorAll('audio[data-storage-backend="supabase"]');
    
    console.log(`Initializing ${audioElements.length} Supabase audio URLs...`);
    
    for (const audio of audioElements) {
        const currentSrc = audio.src;
        
        // Skip if already has a signed URL
        if (currentSrc.includes('token=') || currentSrc.startsWith('blob:')) {
            continue;
        }
        
        try {
            // Import sections module to access getSignedAudioUrl
            const { getSignedAudioUrl } = await import('./sections.js');
            
            // Extract the path from the src (remove domain if present)
            const url = new URL(currentSrc, window.location.origin);
            const audioPath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
            
            console.log(`Fetching signed URL for: ${audioPath}`);
            const signedUrl = await getSignedAudioUrl(audioPath);
            
            if (signedUrl !== audioPath) {
                audio.src = signedUrl;
                console.log(`Updated audio URL for path: ${audioPath}`);
            } else {
                console.warn(`Failed to get signed URL for: ${audioPath}, using original path`);
            }
        } catch (error) {
            console.error(`Failed to initialize audio URL for ${audio.src}:`, error);
            // Continue with next audio element instead of stopping
        }
    }
}

export function updateSelectionColor() {
    const nextColor = getNextColor();
    const dot = document.getElementById('nextColorDot');
    if (dot) {
        dot.style.backgroundColor = `var(--section-color-${nextColor})`;
        dot.style.borderColor = getAccentColor(nextColor);
    }
}

// Credit Display Functions
export function updateCreditsDisplay(credits) {
    const creditsDisplay = document.getElementById('creditsDisplay');
    const creditsValue = document.getElementById('creditsValue');
    
    if (creditsDisplay && creditsValue) {
        creditsValue.textContent = credits;
        
        // Add warning class for low credits
        if (credits < 20) {
            creditsDisplay.classList.add('low-credits');
        } else {
            creditsDisplay.classList.remove('low-credits');
        }
    }
}

export function createCreditsDisplay() {
    // Check if credits display already exists
    if (document.getElementById('creditsDisplay')) {
        console.log('💎 Credits display already exists');
        return;
    }
    
    console.log('💎 Creating credits display...');
    
    // Find a suitable location in the header
    const navLinks = document.querySelector('.nav-links');
    const header = navLinks || document.querySelector('header') || document.querySelector('.header') || document.querySelector('.nav-bar') || document.querySelector('.app-nav');
    
    if (header) {
        const creditsHTML = `
            <div id="creditsDisplay" class="credits-display">
                <span class="credits-icon">💎</span>
                <span id="creditsValue">--</span>
                <span class="credits-label">credits</span>
            </div>
        `;
        
        // Insert into nav-links with consistent positioning
        if (navLinks) {
            // Check if user navigation already exists
            const existingUserNav = navLinks.querySelector('.user-nav');
            const authButton = navLinks.querySelector('.auth-btn');
            
            if (existingUserNav) {
                // If user nav exists, insert credits BEFORE the user nav to maintain order
                existingUserNav.insertAdjacentHTML('beforebegin', creditsHTML);
                console.log('💎 Credits inserted before existing user navigation');
            } else if (authButton) {
                // If no user nav but auth button exists, insert before auth button
                authButton.insertAdjacentHTML('beforebegin', creditsHTML);
                console.log('💎 Credits inserted before auth button');
            } else {
                // Fallback: append to end of nav-links
                navLinks.insertAdjacentHTML('beforeend', creditsHTML);
                console.log('💎 Credits appended to end of nav-links');
            }
        } else {
            header.insertAdjacentHTML('beforeend', creditsHTML);
            console.log('💎 Credits appended to header');
        }
        
        console.log('💎 Credits HTML inserted into DOM');
        
        // Add click handler for future credit purchase modal
        const creditsDisplay = document.getElementById('creditsDisplay');
        if (creditsDisplay) {
            creditsDisplay.addEventListener('click', async () => {
                // Use safe wrapper to open credits modal
                if (window.safeOpenCreditsModal) {
                    window.safeOpenCreditsModal();
                } else {
                    // Fallback if safe wrapper not available yet
                    try {
                        await showLowCreditsModal();
                    } catch (error) {
                        console.error('Failed to open credits modal:', error);
                    }
                }
            });
            console.log('💎 Credits display created and click handler added');
        } else {
            console.error('💎 Failed to find credits display after creation');
        }
    }
}

export async function showLowCreditsModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('lowCreditsModal');
    if (!modal) {
        // Get dynamic credit costs
        const costs = getAllCreditCosts();
        
        const modalHTML = `
            <div id="lowCreditsModal" class="low-credits-modal" style="display: none;">
                <div class="modal-content">
                    <span class="close" onclick="hideLowCreditsModal()">&times;</span>
                    <h2>Need More Credits?</h2>
                    <p>Buy more if you are low on credits. Credits are used for:</p>
                    <ul>
                        <li><span class="emoji">📄</span> <strong>DOCX processing (${costs.docx_processing} credits per document)</strong></li>
                        <li><span class="emoji">🎵</span> <strong>Audio file upload (${costs.audio_upload} credits per file)</strong></li>
                        <li><span class="emoji">📝</span> <strong>Text file upload (${costs.txt_upload} credits per file)</strong></li>
                        <li><span class="emoji">📤</span> <strong>Premium exports (${costs.premium_export} credits per export)</strong></li>
                    </ul>
                    <div id="creditPurchaseContent">
                        <div class="loading-packages">
                            <div class="spinner"></div>
                            <p>Loading payment options...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('lowCreditsModal');
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Load Stripe service and update content
    try {
        // Dynamically import Stripe service
        const stripeModule = await import('./stripe.js');
        const stripeService = stripeModule.default;
        
        // **FIX: Ensure stripeService is globally available before rendering UI**
        // This prevents "stripeService is not defined" errors in onclick handlers
        if (!window.stripeService) {
            window.stripeService = stripeService;
            console.log('✅ stripeService made globally available');
        }
        
        // **ENHANCED: Use the new ensureStripeServiceGlobal function**
        const { ensureStripeServiceGlobal } = stripeModule;
        ensureStripeServiceGlobal();
        
        // Initialize Stripe service
        await stripeService.init();
        
        // Get the content container
        const contentContainer = document.getElementById('creditPurchaseContent');
        if (contentContainer) {
            // Generate purchase UI
            const purchaseUI = stripeService.createPurchaseUI();
            contentContainer.innerHTML = purchaseUI;
            
            // If Stripe is properly configured, load packages
            if (stripeService.isAvailable()) {
                await stripeService.loadPackages(false); // Use cached packages, don't force refresh
            }
        }
        
    } catch (error) {
        console.error('Error loading Stripe payment interface:', error);
        
        // Fallback to static display
        const contentContainer = document.getElementById('creditPurchaseContent');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="credits-purchase-preview">
                    <h3>Credit Packages</h3>
                    <div class="credit-package">
                        <strong>Starter Pack:</strong> 500 credits - $4.99
                    </div>
                    <div class="credit-package">
                        <strong>Creator Pack:</strong> 1,500 credits - $14.99
                    </div>
                    <div class="credit-package">
                        <strong>Professional Pack:</strong> 3,500 credits - $29.99
                    </div>
                </div>
                <p><em>Payment system is currently being configured.<br>Please contact support for additional credits.</em></p>
                <div class="modal-button-container">
                    <button onclick="window.safeHideLowCreditsModal()" class="btn btn-primary">Got it</button>
                </div>
            `;
        }
    }
}

export function hideLowCreditsModal() {
    const modal = document.getElementById('lowCreditsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Safe wrapper for hiding credits modal
window.safeHideLowCreditsModal = function() {
    console.log('🔐 Safe hide credits modal called');
    if (typeof hideLowCreditsModal === 'function') {
        hideLowCreditsModal();
    } else {
        // Fallback: manually hide the modal
        const modal = document.getElementById('lowCreditsModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
};

// Make hideLowCreditsModal globally available for onclick handlers (legacy support)
window.hideLowCreditsModal = hideLowCreditsModal;

// Modal functions - preserving exact logic from original
export function showExportModal() {
    document.getElementById('exportModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
}

export function hideExportModal() {
    document.getElementById('exportModal').style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    document.getElementById('status').style.display = 'none';
    document.getElementById('status').textContent = '';
}

// Initialize modal click-outside-to-close functionality
export function initializeModalHandlers() {
    // Close export modal when clicking outside
    const exportModal = document.getElementById('exportModal');
    if (exportModal) {
        exportModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideExportModal();
            }
        });
    }
    
    // Close reorder modal when clicking outside
    const reorderModal = document.getElementById('reorderModal');
    if (reorderModal) {
        reorderModal.addEventListener('click', function(e) {
            if (e.target === this) {
                window.hideReorderModal();
            }
        });
    }
    
    // Close low credits modal when clicking outside
    const lowCreditsModal = document.getElementById('lowCreditsModal');
    if (lowCreditsModal) {
        lowCreditsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideLowCreditsModal();
            }
        });
    }
    
    console.log('Modal handlers initialized');
} 