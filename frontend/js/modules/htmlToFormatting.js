/**
 * HTML to Internal Formatting Converter
 * Converts mammoth.js HTML output to internal formatting system
 */

export class HtmlToFormattingConverter {
    constructor() {
        this.reset();
    }

    reset() {
        this.textContent = '';
        this.formattingRanges = [];
        this.currentPosition = 0;
        this.characterMap = new Map(); // Track character position mapping
    }

    /**
     * Convert HTML to internal formatting system with perfect character alignment
     * @param {string} html - HTML content from mammoth.js
     * @returns {Object} - {text, formattingRanges}
     */
    convert(html) {
        console.log('🔄 Converting HTML to internal formatting system...');
        console.log('📋 Input HTML length:', html.length);
        
        this.reset();
        
        // Create DOM parser for clean HTML processing
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Log the raw text content for debugging
        const rawText = doc.body.textContent || '';
        console.log('📋 Raw DOM text length:', rawText.length);
        
        // Process the document body with character-perfect tracking
        this._processNodeWithAlignment(doc.body);
        
        // Sort and merge ranges
        this.formattingRanges.sort((a, b) => a.start - b.start);
        this._mergeRanges();
        
        // **SECURITY FIX: Removed text content length logging to prevent user content exposure**
        console.log('✅ HTML to formatting conversion complete');
        
        return {
            text: this.textContent,
            formattingRanges: this.formattingRanges
        };
    }

    /**
     * Process DOM node with perfect character alignment tracking
     * @private
     */
    _processNodeWithAlignment(node) {
        if (!node) return;

        if (node.nodeType === Node.TEXT_NODE) {
            // Text node - add exactly as is, no cleaning
            const text = node.textContent;
            if (text) {
                this.textContent += text;
                this.currentPosition += text.length;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Element node - process based on tag
            const startPos = this.currentPosition;
            
            // Process child nodes first to get text content
            for (const child of node.childNodes) {
                this._processNodeWithAlignment(child);
            }
            
            const endPos = this.currentPosition;
            
            // Add formatting based on element type
            if (endPos > startPos) {
                this._addFormattingForElement(node, startPos, endPos);
            }
        }
    }

    /**
     * Check if element is a block element
     * @private
     */
    _isBlockElement(tagName) {
        const blockElements = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                              'blockquote', 'li', 'tr', 'td', 'th'];
        return blockElements.includes(tagName);
    }

    /**
     * Add formatting range for an HTML element
     * @private
     */
    _addFormattingForElement(element, start, end) {
        const tagName = element.tagName.toLowerCase();
        
        switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                this._addRange(start, end, 'heading', {
                    level: parseInt(tagName.charAt(1)),
                    className: element.className || ''
                });
                break;
                
            case 'strong':
            case 'b':
                this._addRange(start, end, 'bold');
                break;
                
            case 'em':
            case 'i':
                this._addRange(start, end, 'italic');
                break;
                
            case 'u':
                this._addRange(start, end, 'underline');
                break;
                
            case 'span':
                // Check for underline class or other formatting
                if (element.className && element.className.includes('underline')) {
                    this._addRange(start, end, 'underline');
                }
                break;
                
            case 'a':
                const href = element.getAttribute('href');
                if (href) {
                    this._addRange(start, end, 'link', {
                        href: href,
                        target: element.getAttribute('target') || '_blank'
                    });
                }
                break;
                
            case 'blockquote':
                this._addRange(start, end, 'quote', {
                    className: element.className || ''
                });
                break;
                
            case 'img':
                // For images, we'll insert a placeholder and add image data
                const src = element.getAttribute('src');
                const alt = element.getAttribute('alt') || 'Image';
                
                if (src) {
                    // Insert image placeholder text
                    const placeholder = `[Image: ${alt}]`;
                    const imgStart = this.currentPosition;
                    this.textContent += placeholder;
                    this.currentPosition += placeholder.length;
                    
                    this._addRange(imgStart, this.currentPosition, 'image', {
                        src: src,
                        alt: alt,
                        className: element.className || 'docx-image'
                    });
                }
                break;
                
            case 'table':
                // For tables, add table formatting
                this._addRange(start, end, 'table', {
                    className: element.className || 'docx-table'
                });
                break;
                
            case 'ul':
                this._addRange(start, end, 'list', {
                    type: 'unordered',
                    className: element.className || ''
                });
                break;
                
            case 'ol':
                this._addRange(start, end, 'list', {
                    type: 'ordered',
                    className: element.className || ''
                });
                break;
                
            case 'li':
                this._addRange(start, end, 'list-item', {
                    className: element.className || ''
                });
                break;
                
            case 'p':
                // Only add paragraph formatting if it has special classes
                if (element.className) {
                    this._addRange(start, end, 'paragraph', {
                        className: element.className
                    });
                }
                break;
        }
    }

    /**
     * Add a formatting range with validation
     * @private
     */
    _addRange(start, end, type, meta = {}) {
        if (start >= end) return;
        
        // Ensure positions are within bounds
        const maxPos = this.textContent.length;
        start = Math.max(0, Math.min(start, maxPos));
        end = Math.max(start, Math.min(end, maxPos));
        
        if (start >= end) return;
        
        this.formattingRanges.push({
            start: start,
            end: end,
            type: type,
            level: 1,
            source: 'html_conversion',
            meta: meta
        });
    }

    /**
     * Merge overlapping ranges of the same type
     * @private
     */
    _mergeRanges() {
        const merged = [];
        let current = null;
        
        for (const range of this.formattingRanges) {
            if (!current) {
                current = { ...range };
            } else if (
                current.type === range.type &&
                current.end >= range.start &&
                JSON.stringify(current.meta) === JSON.stringify(range.meta)
            ) {
                // Merge overlapping ranges of same type
                current.end = Math.max(current.end, range.end);
            } else {
                merged.push(current);
                current = { ...range };
            }
        }
        
        if (current) {
            merged.push(current);
        }
        
        this.formattingRanges = merged;
    }
}

// Export singleton instance
export const htmlToFormattingConverter = new HtmlToFormattingConverter(); 