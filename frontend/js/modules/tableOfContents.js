// AudioBook Organizer - Table of Contents Module

import { formattingData } from './formattingState.js';
import { showError, showInfo } from './notifications.js';

// TOC State Management
let tocState = {
    isVisible: false,
    headers: [],
    activeHeaderId: null,
    isScrolling: false,
    scrollObserver: null,
    elements: {
        sidebar: null,
        list: null,
        count: null,
        toggle: null
    }
};

// Header type configuration with icons and levels
const HEADER_CONFIG = {
    'title': { level: 1, icon: '📖', className: 'fmt-title' },
    'subtitle': { level: 2, icon: '📄', className: 'fmt-subtitle' },
    'section': { level: 3, icon: '📋', className: 'fmt-section' },
    'subsection': { level: 4, icon: '📝', className: 'fmt-subsection' }
};

/**
 * Initialize the Table of Contents system
 */
export function initializeTableOfContents() {
    try {
        console.log('🔍 Initializing Table of Contents...');
        
        // Wait for DOM to be fully ready before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initializeTableOfContentsCore();
            });
        } else {
            initializeTableOfContentsCore();
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Table of Contents:', error);
        showError('Failed to initialize Table of Contents');
    }
}

/**
 * Core TOC initialization logic
 */
function initializeTableOfContentsCore() {
    try {
        console.log('🔍 Starting core TOC initialization...');
        
        createTOCElements();
        setupEventListeners();
        extractAndDisplayHeaders();
        setupScrollObserver();
        
        // Make toggle function globally available for HTML onclick
        window.toggleTableOfContents = toggleTableOfContents;
        
        // Additional safety check - ensure elements are properly set up
        const tocSidebar = document.getElementById('tocSidebar');
        const tocToggle = document.querySelector('.toc-toggle-btn');
        
        console.log('✅ TOC Core initialization complete:', {
            sidebarFound: !!tocSidebar,
            toggleButtonFound: !!tocToggle,
            toggleFunctionGlobal: typeof window.toggleTableOfContents === 'function'
        });
        
    } catch (error) {
        console.error('❌ Failed core TOC initialization:', error);
        showError('Failed to initialize Table of Contents core functionality');
    }
}

/**
 * Create TOC DOM elements and add to layout
 */
function createTOCElements() {
    // Find existing TOC elements (they should already be in the HTML)
    const tocSidebar = document.getElementById('tocSidebar');
    const tocList = document.getElementById('tocList');
    const tocCount = document.getElementById('tocCount');
    const tocToggle = document.querySelector('.toc-toggle-btn');
    
    if (!tocSidebar) {
        console.error('❌ TOC sidebar not found in HTML structure - creating fallback');
        // Fallback: create the sidebar if not found
        const newTocSidebar = document.createElement('div');
        newTocSidebar.id = 'tocSidebar';
        newTocSidebar.className = 'toc-sidebar';
        newTocSidebar.setAttribute('aria-hidden', 'true');
        newTocSidebar.innerHTML = `
            <div class="toc-header">
                <h3>📋 Table of Contents</h3>
                <button class="toc-close-btn" title="Close Table of Contents" aria-label="Close Table of Contents">×</button>
            </div>
            <div class="toc-content">
                <div id="tocList" class="toc-list">
                    <div class="toc-empty">
                        <div class="toc-empty-icon">📄</div>
                        <div class="toc-empty-text">
                            No headers found in document.<br>
                            Try uploading a document with formatted headings.
                        </div>
                    </div>
                </div>
            </div>
            <div class="toc-footer">
                <div class="toc-count" id="tocCount">0 items</div>
            </div>
        `;
        document.body.appendChild(newTocSidebar);
    }
    
    if (!tocToggle) {
        console.error('❌ TOC toggle button not found in HTML structure - creating fallback');
        // Fallback: create the button if not found
        const bookContentHeader = document.querySelector('.column:first-child .column-header .column-title-container');
        if (bookContentHeader) {
            const toggleButton = document.createElement('button');
            toggleButton.className = 'toc-toggle-btn';
            toggleButton.innerHTML = '<i>📋</i> <span class="toc-toggle-text">Table of Contents</span>';
            toggleButton.title = 'Toggle Table of Contents';
            toggleButton.setAttribute('aria-label', 'Toggle Table of Contents');
            bookContentHeader.appendChild(toggleButton);
        }
    }
    
    // Store element references (refetch after potential creation)
    tocState.elements = {
        sidebar: document.getElementById('tocSidebar'),
        list: document.getElementById('tocList'),
        count: document.getElementById('tocCount'),
        toggle: document.querySelector('.toc-toggle-btn')
    };
    
    console.log('✅ TOC elements initialized:', {
        sidebar: !!tocState.elements.sidebar,
        list: !!tocState.elements.list,
        count: !!tocState.elements.count,
        toggle: !!tocState.elements.toggle
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Toggle button click
    if (tocState.elements.toggle) {
        tocState.elements.toggle.addEventListener('click', toggleTableOfContents);
    }
    
    // Close button click
    const closeBtn = tocState.elements.sidebar?.querySelector('.toc-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (tocState.isVisible) {
                toggleTableOfContents();
            }
        });
    }
    
    // Click outside sidebar to close
    document.addEventListener('click', handleOutsideClick);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Shift + T to toggle TOC
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        toggleTableOfContents();
    }
    
    // Escape to close TOC if open
    if (event.key === 'Escape' && tocState.isVisible) {
        toggleTableOfContents();
    }
}

/**
 * Handle clicks outside TOC to close it
 */
function handleOutsideClick(event) {
    if (!tocState.isVisible) return;
    
    const tocSidebar = tocState.elements.sidebar;
    const toggleBtn = tocState.elements.toggle;
    
    // Don't close if clicking inside sidebar or on toggle button
    if (tocSidebar && tocSidebar.contains(event.target)) return;
    if (toggleBtn && toggleBtn.contains(event.target)) return;
    
    // Close TOC if clicking outside
    toggleTableOfContents();
}

/**
 * Toggle Table of Contents visibility
 */
export function toggleTableOfContents() {
    try {
        console.log('🔧 toggleTableOfContents called, current state:', tocState.isVisible);
        
        // Safety check - ensure elements exist
        if (!tocState.elements.sidebar) {
            console.error('❌ TOC sidebar element not found, attempting to recreate...');
            createTOCElements();
            if (!tocState.elements.sidebar) {
                console.error('❌ Failed to create TOC sidebar element');
                return;
            }
        }
        
        const wasVisible = tocState.isVisible;
        tocState.isVisible = !wasVisible;
        
        console.log('🔧 TOC state change:', { from: wasVisible, to: tocState.isVisible });
        
        // Update sidebar with simple class toggle
        if (tocState.elements.sidebar) {
            tocState.elements.sidebar.classList.toggle('toc-open', tocState.isVisible);
            console.log('✅ TOC sidebar class updated:', tocState.elements.sidebar.classList.contains('toc-open'));
        }
        
        // Update toggle button state if available
        if (tocState.elements.toggle) {
            tocState.elements.toggle.classList.toggle('active', tocState.isVisible);
            const toggleText = tocState.elements.toggle.querySelector('.toc-toggle-text');
            if (toggleText) {
                toggleText.textContent = tocState.isVisible ? 'Close TOC' : 'Table of Contents';
            }
        }
        
        // Update aria-hidden for accessibility
        if (tocState.elements.sidebar) {
            tocState.elements.sidebar.setAttribute('aria-hidden', !tocState.isVisible);
        }
        
        console.log('✅ TOC toggle completed successfully');
        
    } catch (error) {
        console.error('❌ Error in toggleTableOfContents:', error);
        showError('Failed to toggle Table of Contents');
    }
}

/**
 * Extract headers from formatting data and display them
 */
function extractAndDisplayHeaders() {
    try {
        const headers = extractTableOfContents();
        tocState.headers = headers;
        displayHeaders(headers);
        updateHeaderCount(headers.length);
        
        console.log(`📋 Found ${headers.length} headers in document`);
        
    } catch (error) {
        console.error('❌ Failed to extract headers:', error);
        displayError('Failed to scan document headers');
    }
}

/**
 * Extract headers from formatting data
 */
function extractTableOfContents() {
    if (!formattingData?.ranges) {
        console.log('📋 No formatting data available');
        return [];
    }
    
    const headerTypes = Object.keys(HEADER_CONFIG);
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent || !bookContent.textContent) {
        console.log('📋 No book content available');
        return [];
    }
    
    const fullText = bookContent.textContent;
    
    // Debug: Log formatting data structure
    console.log('🔍 DEBUG: formattingData.ranges length:', formattingData.ranges.length);
    console.log('🔍 DEBUG: headerTypes:', headerTypes);
    console.log('🔍 DEBUG: First 3 formatting ranges:', formattingData.ranges.slice(0, 3));
    
    const filteredRanges = formattingData.ranges.filter(range => headerTypes.includes(range.type));
    console.log('🔍 DEBUG: Filtered header ranges count:', filteredRanges.length);
    console.log('🔍 DEBUG: First 3 filtered ranges:', filteredRanges.slice(0, 3));
    
    const headers = filteredRanges
        .map((range, index) => {
            const config = HEADER_CONFIG[range.type];
            const text = extractHeaderText(range, fullText);
            
            // Create a unique ID for this header since range.id is undefined
            const headerId = `${range.type}-${range.start}-${range.end}`;
            
            const header = {
                id: headerId,
                type: range.type,
                level: config.level,
                icon: config.icon,
                text: text,
                position: range.start,
                endPosition: range.end,
                element: null // Will be populated when creating DOM elements
            };
            
            // Debug each header creation
            if (index < 3) {
                console.log(`🔍 DEBUG: Creating header ${index + 1}:`, {
                    originalRange: range,
                    createdHeader: header
                });
            }
            
            return header;
        })
        .sort((a, b) => a.position - b.position);
    
    // Debug: Log first few headers to see if they're different
    console.log('🔍 DEBUG: First 5 headers extracted:', headers.slice(0, 5).map(h => ({
        id: h.id,
        text: h.text?.substring(0, 50),
        position: h.position,
        type: h.type
    })));
    
    // Debug: Check for duplicates
    const uniquePositions = new Set(headers.map(h => h.position));
    const uniqueTexts = new Set(headers.map(h => h.text));
    console.log('🔍 DEBUG: Unique positions count:', uniquePositions.size, 'vs total headers:', headers.length);
    console.log('🔍 DEBUG: Unique texts count:', uniqueTexts.size, 'vs total headers:', headers.length);
    
    return headers;
}

/**
 * Extract text content for a header range
 */
function extractHeaderText(range, fullText) {
    if (!fullText || range.start < 0 || range.end > fullText.length) {
        return 'Untitled Header';
    }
    
    const text = fullText.substring(range.start, range.end).trim();
    
    // Clean up the text
    return text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .substring(0, 100) // Limit length
        .trim() || 'Untitled Header';
}

/**
 * Display headers in the TOC list
 */
function displayHeaders(headers) {
    const tocList = tocState.elements.list;
    if (!tocList) return;
    
    if (headers.length === 0) {
        displayEmptyState();
        return;
    }
    
    // Create header items
    const headerElements = headers.map((header, index) => {
        const item = document.createElement('div');
        item.className = 'toc-item';
        item.dataset.headerId = header.id;
        item.dataset.level = header.level.toString();
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `Navigate to ${header.text}`);
        
        item.innerHTML = `
            <span class="toc-item-icon">${header.icon}</span>
            <span class="toc-item-text">${escapeHtml(header.text)}</span>
        `;
        
        // Add click handler
        item.addEventListener('click', () => {
            navigateToHeader(header.id);
            // Auto-close TOC after navigation for better UX
            setTimeout(() => {
                if (tocState.isVisible) {
                    toggleTableOfContents();
                }
            }, 300);
        });
        
        // Add keyboard handler
        item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigateToHeader(header.id);
                // Auto-close TOC after keyboard navigation
                setTimeout(() => {
                    if (tocState.isVisible) {
                        toggleTableOfContents();
                    }
                }, 300);
            }
        });
        
        // Store element reference
        header.element = item;
        
        // Add entrance animation
        setTimeout(() => {
            item.classList.add('toc-item-enter');
        }, index * 50);
        
        return item;
    });
    
    // Update DOM
    tocList.innerHTML = '';
    headerElements.forEach(element => tocList.appendChild(element));
}

/**
 * Display empty state when no headers found
 */
function displayEmptyState() {
    const tocList = tocState.elements.list;
    if (!tocList) return;
    
    tocList.innerHTML = `
        <div class="toc-empty">
            <div class="toc-empty-icon">📄</div>
            <div class="toc-empty-text">
                No headers found in document.<br>
                Try uploading a document with formatted headings.
            </div>
        </div>
    `;
}

/**
 * Display error state
 */
function displayError(message) {
    const tocList = tocState.elements.list;
    if (!tocList) return;
    
    tocList.innerHTML = `
        <div class="toc-empty">
            <div class="toc-empty-icon">⚠️</div>
            <div class="toc-empty-text">${escapeHtml(message)}</div>
        </div>
    `;
}

/**
 * Update header count display
 */
function updateHeaderCount(count) {
    if (tocState.elements.count) {
        const text = count === 0 ? 'No headers found' : 
                    count === 1 ? '1 header found' : 
                    `${count} headers found`;
        tocState.elements.count.textContent = text;
    }
}

/**
 * Navigate to a specific header
 */
export function navigateToHeader(headerId) {
    const header = tocState.headers.find(h => h.id === headerId);
    if (!header) {
        console.warn(`📋 Header ${headerId} not found`);
        return;
    }
    
    console.log(`📋 Navigating to header: ${header.text}`);
    console.log('🔍 Header Details:', {
        id: header.id,
        text: header.text,
        position: header.position,
        endPosition: header.endPosition,
        type: header.type
    });
    
    try {
        // Find the header element by formatting ID (more precise than text)
        const headerElement = findHeaderElementById(header.id) || findHeaderElementByText(header.text);
        
        if (headerElement) {
            console.log('🔍 Header Element Found:', {
                headerElement,
                headerClass: headerElement?.className,
                headerText: headerElement?.textContent?.substring(0, 50),
                formattingId: headerElement?.getAttribute('data-formatting-id')
            });
            
            // Find the scrollable container (the column-content div)
            const scrollContainer = headerElement.closest('.column-content');
            
            if (scrollContainer) {
                // Calculate header position relative to the scroll container
                const headerRect = headerElement.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                const relativeTop = headerRect.top - containerRect.top + scrollContainer.scrollTop;
                
                // Scroll the container to the header position with some offset for better positioning
                scrollContainer.scrollTo({
                    top: Math.max(0, relativeTop - 80), // 80px offset from top for better visibility
                    behavior: 'smooth'
                });
                
                console.log('✅ Scrolled content container to header position:', relativeTop);
            } else {
                // Fallback: scroll the header into view (but this will move the whole page)
                headerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                console.log('⚠️ Used fallback scrollIntoView (may move page headers)');
            }
            
            // Add flash animation (same as sections)
            headerElement.classList.remove('toc-flash');
            void headerElement.offsetWidth; // Force reflow to restart animation
            headerElement.classList.add('toc-flash');
            
            // Remove flash class after animation
            setTimeout(() => {
                headerElement.classList.remove('toc-flash');
            }, 1000);
            
            console.log('✅ Scrolled to header successfully');
        } else {
            console.log('❌ No header element found by ID or text');
        }
        
        // Update active header
        setActiveHeader(headerId);
        
        // Auto-close TOC after navigation
        setTimeout(() => {
            if (tocState.isVisible) {
                toggleTableOfContents();
            }
        }, 500);
        
        // Visual feedback
        highlightHeader(header);
        
    } catch (error) {
        console.error('❌ Failed to navigate to header:', error);
        showError('Failed to navigate to section');
    }
}

/**
 * Find the actual header DOM element by formatting ID (most precise method)
 */
function findHeaderElementById(headerId) {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return null;
    
    // Look for element with the exact formatting ID
    const headerElement = bookContent.querySelector(`[data-formatting-id="${headerId}"]`);
    
    if (headerElement) {
        console.log('✅ Found header by formatting ID:', headerElement);
        return headerElement;
    }
    
    console.log('❌ No header found by formatting ID:', headerId);
    return null;
}

/**
 * Find the actual header DOM element by text content (fallback method)
 */
function findHeaderElementByText(headerText) {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return null;
    
    // Look for elements with header formatting classes
    const headerClasses = ['.fmt-title', '.fmt-subtitle', '.fmt-section', '.fmt-subsection'];
    const allHeaders = bookContent.querySelectorAll(headerClasses.join(', '));
    
    console.log('🔍 Header Search by Text:', {
        targetText: headerText,
        totalHeaders: allHeaders.length
    });
    
    // Find exact text match first
    for (let header of allHeaders) {
        const headerTextContent = header.textContent?.trim();
        if (headerTextContent === headerText) {
            console.log('✅ Found exact text match:', header);
            return header;
        }
    }
    
    // Try partial match if exact match fails
    for (let header of allHeaders) {
        const headerTextContent = header.textContent?.trim();
        if (headerTextContent && headerTextContent.includes(headerText)) {
            console.log('✅ Found partial text match:', header);
            return header;
        }
    }
    
    // Try reverse partial match
    for (let header of allHeaders) {
        const headerTextContent = header.textContent?.trim();
        if (headerTextContent && headerText.includes(headerTextContent)) {
            console.log('✅ Found reverse partial match:', header);
            return header;
        }
    }
    
    console.log('❌ No matching header found for text:', headerText);
    return null;
}

/**
 * Set active header in TOC
 */
function setActiveHeader(headerId) {
    // Remove previous active
    tocState.headers.forEach(header => {
        if (header.element) {
            header.element.classList.remove('active');
        }
    });
    
    // Set new active
    const header = tocState.headers.find(h => h.id === headerId);
    if (header?.element) {
        header.element.classList.add('active');
        tocState.activeHeaderId = headerId;
        
        // Scroll TOC to show active item
        header.element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

/**
 * Highlight header with visual feedback
 */
function highlightHeader(header) {
    if (header.element) {
        header.element.classList.add('toc-highlight-pulse');
        setTimeout(() => {
            header.element?.classList.remove('toc-highlight-pulse');
        }, 600);
    }
}

/**
 * Setup scroll observer to track current section
 */
function setupScrollObserver() {
    const bookContent = document.getElementById('bookContent');
    const scrollContainer = bookContent?.closest('.column-content');
    
    if (!bookContent || !scrollContainer || !window.IntersectionObserver) {
        console.log('📋 Scroll observer not available or missing containers');
        return;
    }
    
    // Clean up existing observer
    if (tocState.scrollObserver) {
        tocState.scrollObserver.disconnect();
    }
    
    // Create intersection observer to track visible headers using the correct scroll container
    tocState.scrollObserver = new IntersectionObserver(
        (entries) => {
            if (tocState.isScrolling) return; // Don't update during programmatic scroll
            
            // Find the most visible header
            let mostVisible = null;
            let maxRatio = 0;
            
            entries.forEach(entry => {
                if (entry.intersectionRatio > maxRatio) {
                    maxRatio = entry.intersectionRatio;
                    mostVisible = entry.target;
                }
            });
            
            if (mostVisible) {
                const headerId = mostVisible.dataset.headerId;
                if (headerId && headerId !== tocState.activeHeaderId) {
                    setActiveHeader(headerId);
                }
            }
        },
        {
            root: scrollContainer, // Use the correct scroll container as root
            rootMargin: '-10% 0px -90% 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1]
        }
    );
    
    console.log('📋 Scroll observer setup with correct scroll container');
}

/**
 * Refresh TOC when content changes
 */
export function refreshTableOfContents() {
    console.log('🔄 Refreshing Table of Contents...');
    
    try {
        extractAndDisplayHeaders();
        
        // Reset active header
        tocState.activeHeaderId = null;
        
        console.log('✅ Table of Contents refreshed');
        
    } catch (error) {
        console.error('❌ Failed to refresh TOC:', error);
    }
}

/**
 * Cleanup TOC resources
 */
export function cleanupTableOfContents() {
    console.log('🧹 Cleaning up Table of Contents...');
    
    // Disconnect observer
    if (tocState.scrollObserver) {
        tocState.scrollObserver.disconnect();
        tocState.scrollObserver = null;
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', handleKeyboardShortcuts);
    document.removeEventListener('click', handleOutsideClick);
    
    // Remove TOC elements
    if (tocState.elements.sidebar) {
        tocState.elements.sidebar.remove();
    }
    
    if (tocState.elements.toggle) {
        tocState.elements.toggle.remove();
    }
    
    // Reset state
    tocState = {
        isVisible: false,
        headers: [],
        activeHeaderId: null,
        isScrolling: false,
        scrollObserver: null,
        elements: {
            sidebar: null,
            list: null,
            count: null,
            toggle: null
        }
    };
    
    console.log('✅ Table of Contents cleanup complete');
}

/**
 * Get current TOC state (for debugging)
 */
export function getTOCState() {
    return {
        ...tocState,
        headerCount: tocState.headers.length,
        isInitialized: !!tocState.elements.sidebar
    };
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions available globally for onclick handlers and integration
window.toggleTableOfContents = toggleTableOfContents;
window.navigateToHeader = navigateToHeader;
window.refreshTableOfContents = refreshTableOfContents; 