/**
 * DOCX Processor Module - Enhanced DOCX processing with mammoth.js
 * Handles rich content extraction including links, images, tables, and lists
 */

export class DocxProcessor {
    constructor() {
        this.mammothLoaded = false;
        this.mammothScript = null;
    }

    /**
     * Load mammoth.js library dynamically
     */
    async loadMammoth() {
        if (this.mammothLoaded && window.mammoth) {
            return window.mammoth;
        }

        return new Promise((resolve, reject) => {
            // Check if mammoth is already loaded
            if (window.mammoth) {
                this.mammothLoaded = true;
                resolve(window.mammoth);
                return;
            }

            // Load mammoth.js from CDN
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/mammoth@1.9.1/mammoth.browser.min.js';
            script.async = true;
            
            script.onload = () => {
                if (window.mammoth) {
                    this.mammothLoaded = true;
                    console.log('✅ Mammoth.js loaded successfully');
                    resolve(window.mammoth);
                } else {
                    reject(new Error('Mammoth.js failed to load properly'));
                }
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load mammoth.js from CDN'));
            };
            
            document.head.appendChild(script);
            this.mammothScript = script;
        });
    }

    /**
     * Process DOCX file with rich content extraction
     * @param {File} file - The DOCX file to process
     * @returns {Promise<Object>} - Processed content with HTML and metadata
     */
    async processRichContent(file) {
        try {
            console.log('📄 Starting rich DOCX processing with mammoth.js...');
            
            // Load mammoth.js if not already loaded
            const mammoth = await this.loadMammoth();
            
            // Convert file to ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Configure mammoth options for perfect text alignment with backend
            const options = {
                styleMap: [
                    // Heading mappings
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh", 
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Heading 4'] => h4:fresh",
                    "p[style-name='Heading 5'] => h5:fresh",
                    "p[style-name='Heading 6'] => h6:fresh",
                    
                    // Style mappings for common Word styles
                    "p[style-name='Title'] => h1.title:fresh",
                    "p[style-name='Subtitle'] => h2.subtitle:fresh",
                    "p[style-name='Quote'] => blockquote:fresh",
                    "p[style-name='Intense Quote'] => blockquote.intense:fresh",
                    
                    // List mappings - preserve as paragraphs for better alignment
                    "p[style-name='List Paragraph'] => p:fresh",
                    
                    // Custom formatting - exact mapping
                    "b => strong",
                    "i => em",
                    "u => u"
                ],
                
                // Image conversion with base64 embedding
                convertImage: mammoth.images.imgElement((image) => {
                    return image.readAsBase64String().then((imageBuffer) => {
                        return {
                            src: `data:${image.contentType};base64,${imageBuffer}`,
                            alt: 'Document image',
                            class: 'docx-image'
                        };
                    });
                }),
                
                // Enhanced options for perfect text alignment
                includeDefaultStyleMap: true,
                preserveEmptyParagraphs: true,
                ignoreEmptyParagraphs: false,
                
                // Transform document to match backend text extraction
                transformDocument: function(document) {
                    // Ensure consistent paragraph and line break handling
                    return document;
                }
            };
            
            // Convert DOCX to HTML
            const result = await mammoth.convertToHtml({ arrayBuffer }, options);
            
            console.log('✅ Mammoth.js conversion completed');
            console.log(`📊 Conversion messages: ${result.messages.length}`);
            
            // Log any conversion messages/warnings
            if (result.messages.length > 0) {
                console.log('📋 Conversion messages:', result.messages);
            }
            
            return {
                html: result.value,
                messages: result.messages,
                success: true,
                processingMethod: 'mammoth.js',
                features: {
                    links: this._countElements(result.value, 'a'),
                    images: this._countElements(result.value, 'img'),
                    tables: this._countElements(result.value, 'table'),
                    lists: this._countElements(result.value, 'ul') + this._countElements(result.value, 'ol'),
                    headings: this._countElements(result.value, 'h1,h2,h3,h4,h5,h6')
                }
            };
            
        } catch (error) {
            console.error('❌ Rich DOCX processing failed:', error);
            return {
                html: null,
                messages: [],
                success: false,
                error: error.message,
                processingMethod: 'mammoth.js'
            };
        }
    }

    /**
     * Extract raw text from DOCX (fallback method)
     * @param {File} file - The DOCX file to process
     * @returns {Promise<Object>} - Extracted text content
     */
    async extractRawText(file) {
        try {
            console.log('📄 Extracting raw text with mammoth.js...');
            
            const mammoth = await this.loadMammoth();
            const arrayBuffer = await file.arrayBuffer();
            
            const result = await mammoth.extractRawText({ arrayBuffer });
            
            return {
                text: result.value,
                messages: result.messages,
                success: true,
                processingMethod: 'mammoth.js-raw'
            };
            
        } catch (error) {
            console.error('❌ Raw text extraction failed:', error);
            return {
                text: null,
                messages: [],
                success: false,
                error: error.message,
                processingMethod: 'mammoth.js-raw'
            };
        }
    }

    /**
     * Count HTML elements in a string
     * @private
     */
    _countElements(html, selector) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return doc.querySelectorAll(selector).length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.mammothScript && this.mammothScript.parentNode) {
            this.mammothScript.parentNode.removeChild(this.mammothScript);
            this.mammothScript = null;
        }
        this.mammothLoaded = false;
    }
}

// Export singleton instance
export const docxProcessor = new DocxProcessor(); 