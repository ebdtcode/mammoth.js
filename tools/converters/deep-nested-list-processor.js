#!/usr/bin/env node

/**
 * Deep Nested List Processor - Enterprise-Grade Modular Implementation
 * 
 * Handles deeply nested ordered lists with 6+ levels of nesting
 * Built with DRY principles, scalability, and maintainability in mind
 * 
 * Author: Senior Frontend Developer
 * Architecture: Modular, Component-based, Configurable
 */

const { JSDOM } = require('jsdom');

/**
 * Configuration for list styling at different depth levels
 * Easily extendable for additional levels
 */
const LIST_STYLE_CONFIG = {
    levels: [
        { type: 'decimal',     prefix: '',     suffix: '.' },  // 1. 2. 3.
        { type: 'lower-alpha', prefix: '',     suffix: '.' },  // a. b. c.
        { type: 'lower-roman', prefix: '(',    suffix: ')' },  // (i) (ii) (iii)
        { type: 'decimal',     prefix: '(',    suffix: ')' },  // (1) (2) (3)
        { type: 'lower-alpha', prefix: '(',    suffix: ')' },  // (a) (b) (c)
        { type: 'lower-roman', prefix: '',     suffix: '.' },  // i. ii. iii.
        { type: 'decimal',     prefix: '[',    suffix: ']' },  // [1] [2] [3]
        { type: 'lower-alpha', prefix: '[',    suffix: ']' },  // [a] [b] [c]
        { type: 'circle',      prefix: '',     suffix: '' },   // • bullet for 9+
    ],
    
    // Get style configuration for a specific depth (0-indexed)
    getStyleForDepth(depth) {
        const index = Math.min(depth, this.levels.length - 1);
        return this.levels[index];
    }
};

/**
 * Pattern configuration for detecting list items at various levels
 */
const LIST_PATTERNS = {
    // Primary patterns for detecting list items
    numbered: /^(\d+)\.\s+/,                    // 1. 2. 3.
    lettered: /^([a-z])\.\s+/i,                 // a. b. c. or A. B. C.
    roman: /^([ivxlcdm]+)\.\s+/i,               // i. ii. iii. or I. II. III.
    parenthesized: /^\(([a-z0-9ivxlcdm]+)\)\s+/i, // (1) (a) (i)
    bracketed: /^\[([a-z0-9ivxlcdm]+)\]\s+/,    // [1] [a] [i]
    dashed: /^[-–—]\s+/,                        // - or – or —
    bulleted: /^[•·▪▫◦‣⁃]\s+/,                 // Various bullet styles
    
    // Composite pattern for any list marker
    anyListMarker: /^(?:\d+\.|[a-z]\.|[ivxlcdm]+\.|\([a-z0-9ivxlcdm]+\)|\[[a-z0-9ivxlcdm]+\]|[-–—•·▪▫◦‣⁃])\s+/i,
    
    // Detect and extract list marker
    extractMarker(text) {
        const match = text.match(this.anyListMarker);
        return match ? match[0] : null;
    },
    
    // Determine list type from marker
    getListType(marker) {
        if (!marker) return null;
        
        if (this.numbered.test(marker)) return 'decimal';
        if (this.lettered.test(marker)) return 'lower-alpha';
        if (this.roman.test(marker)) return 'lower-roman';
        if (this.bulleted.test(marker) || this.dashed.test(marker)) return 'bullet';
        if (this.parenthesized.test(marker)) return 'parenthesized';
        if (this.bracketed.test(marker)) return 'bracketed';
        
        return 'decimal'; // Default fallback
    }
};

/**
 * List Item Class - Represents a single item in a nested list structure
 */
class ListItem {
    constructor(content, depth = 0, type = 'decimal', marker = null) {
        this.content = content;
        this.depth = depth;
        this.type = type;
        this.marker = marker;
        this.children = [];
        this.metadata = {
            hasNote: false,
            hasPhraseology: false,
            hasReference: false,
            hasExample: false,
            semanticSections: []
        };
    }
    
    addChild(listItem) {
        this.children.push(listItem);
    }
    
    hasChildren() {
        return this.children.length > 0;
    }
    
    setMetadata(key, value) {
        this.metadata[key] = value;
    }
    
    getMetadata(key) {
        return this.metadata[key];
    }
}

/**
 * Deep Nested List Processor - Main processing class
 */
class DeepNestedListProcessor {
    constructor(config = {}) {
        this.config = {
            maxDepth: config.maxDepth || 10,
            preserveNumbering: config.preserveNumbering !== false,
            detectSemanticSections: config.detectSemanticSections !== false,
            styleConfig: config.styleConfig || LIST_STYLE_CONFIG,
            customPatterns: config.customPatterns || {},
            debug: config.debug || false
        };
        
        this.patterns = { ...LIST_PATTERNS, ...this.config.customPatterns };
        this.statistics = this.resetStatistics();
    }
    
    resetStatistics() {
        return {
            totalLists: 0,
            maxDepthReached: 0,
            itemsProcessed: 0,
            semanticSections: 0,
            errors: []
        };
    }
    
    /**
     * Process HTML content and convert to deeply nested lists
     */
    processHtml(html) {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        this.statistics = this.resetStatistics();
        
        // Find all potential list containers
        const listContainers = this.findListContainers(document);
        
        // Process each container
        listContainers.forEach(container => {
            this.processListContainer(document, container);
        });
        
        // Process standalone lists that weren't in containers
        this.processStandaloneLists(document);
        
        return {
            html: document.documentElement.outerHTML,
            statistics: this.statistics
        };
    }
    
    /**
     * Find potential list containers (sections with multiple list items)
     */
    findListContainers(document) {
        const containers = [];
        const sections = document.querySelectorAll('section, div, article, main');
        
        sections.forEach(section => {
            const listElements = this.findListElements(section);
            if (listElements.length >= 2) {
                containers.push({
                    element: section,
                    listElements: listElements
                });
            }
        });
        
        return containers;
    }
    
    /**
     * Find list elements within a container
     */
    findListElements(container) {
        const elements = [];
        const candidates = container.querySelectorAll('p, div, span, li');
        
        candidates.forEach(element => {
            const text = element.textContent.trim();
            if (this.patterns.extractMarker(text)) {
                elements.push(element);
            }
        });
        
        return elements;
    }
    
    /**
     * Process a list container and build nested structure
     */
    processListContainer(document, container) {
        const { element, listElements } = container;
        
        if (listElements.length === 0) return;
        
        // Build hierarchical structure
        const rootItems = this.buildHierarchicalStructure(listElements);
        
        if (rootItems.length === 0) return;
        
        // Create DOM structure
        const listElement = this.createDOMStructure(document, rootItems, 0);
        
        // Replace original elements
        this.replaceWithProcessedList(element, listElements, listElement, container);
        
        this.statistics.totalLists++;
    }
    
    /**
     * Build hierarchical structure from flat list elements
     */
    buildHierarchicalStructure(elements) {
        const rootItems = [];
        const stack = []; // Stack to track current nesting path
        let previousDepth = -1;
        
        elements.forEach((element, index) => {
            const { depth, item } = this.analyzeListElement(element, previousDepth, stack);
            
            if (depth === 0) {
                // Root level item
                rootItems.push(item);
                stack.length = 0;
                stack.push(item);
            } else {
                // Find appropriate parent based on depth
                while (stack.length > depth) {
                    stack.pop();
                }
                
                if (stack.length > 0) {
                    const parent = stack[stack.length - 1];
                    parent.addChild(item);
                    stack.push(item);
                } else {
                    // Orphaned item, add as root
                    rootItems.push(item);
                    stack.push(item);
                }
            }
            
            previousDepth = depth;
            this.statistics.itemsProcessed++;
            this.statistics.maxDepthReached = Math.max(this.statistics.maxDepthReached, depth);
        });
        
        return rootItems;
    }
    
    /**
     * Analyze a list element to determine its depth and content
     */
    analyzeListElement(element, previousDepth, stack) {
        const text = element.textContent.trim();
        const innerHTML = element.innerHTML;
        
        // Detect depth based on indentation, styling, or explicit markers
        const depth = this.detectDepth(element, previousDepth, stack);
        
        // Extract marker and clean content
        const marker = this.patterns.extractMarker(text);
        const cleanContent = text.replace(marker || '', '').trim();
        
        // Determine list type
        const listType = this.patterns.getListType(marker);
        
        // Create list item
        const item = new ListItem(cleanContent, depth, listType, marker);
        
        // Detect semantic sections
        if (this.config.detectSemanticSections) {
            this.detectSemanticSections(item, element);
        }
        
        // Preserve original HTML structure if needed
        item.originalHtml = innerHTML;
        
        return { depth, item };
    }
    
    /**
     * Detect depth of a list element
     * Uses multiple strategies: indentation, CSS classes, computed styles, markers
     */
    detectDepth(element, previousDepth, stack) {
        let depth = 0;
        
        // Strategy 1: Check CSS classes
        const classList = Array.from(element.classList);
        const depthClass = classList.find(c => c.match(/depth-(\d+)|level-(\d+)|indent-(\d+)/));
        if (depthClass) {
            const match = depthClass.match(/\d+/);
            if (match) depth = parseInt(match[0]);
        }
        
        // Strategy 2: Check inline styles for margin/padding
        const style = element.getAttribute('style') || '';
        const marginMatch = style.match(/margin-left:\s*(\d+)/);
        const paddingMatch = style.match(/padding-left:\s*(\d+)/);
        
        if (marginMatch || paddingMatch) {
            const pixels = parseInt(marginMatch ? marginMatch[1] : paddingMatch[1]);
            depth = Math.floor(pixels / 20); // Assume 20px per level
        }
        
        // Strategy 3: Check data attributes
        const dataDepth = element.getAttribute('data-depth') || element.getAttribute('data-level');
        if (dataDepth) {
            depth = parseInt(dataDepth);
        }
        
        // Strategy 4: Analyze marker pattern
        const text = element.textContent.trim();
        const marker = this.patterns.extractMarker(text);
        if (marker) {
            depth = this.inferDepthFromMarker(marker, previousDepth);
        }
        
        // Strategy 5: Check parent-child relationships
        if (depth === 0 && element.parentElement) {
            const parent = element.parentElement;
            if (parent.classList.contains('nested') || parent.classList.contains('sub-list')) {
                depth = previousDepth + 1;
            }
        }
        
        // Ensure depth doesn't exceed maximum
        depth = Math.min(depth, this.config.maxDepth);
        
        return depth;
    }
    
    /**
     * Infer depth from marker pattern
     */
    inferDepthFromMarker(marker, previousDepth) {
        // Numbers typically indicate root level
        if (this.patterns.numbered.test(marker)) return 0;
        
        // Letters typically indicate second level
        if (this.patterns.lettered.test(marker)) return 1;
        
        // Roman numerals typically indicate third level
        if (this.patterns.roman.test(marker)) return 2;
        
        // Parenthesized markers often indicate deeper levels
        if (this.patterns.parenthesized.test(marker)) {
            const inner = marker.match(/\(([^)]+)\)/)[1];
            if (/\d+/.test(inner)) return 3;
            if (/[a-z]/i.test(inner)) return 4;
            if (/[ivxlcdm]+/i.test(inner)) return 5;
        }
        
        // Bracketed markers for even deeper levels
        if (this.patterns.bracketed.test(marker)) {
            return 6;
        }
        
        // Bullets/dashes can be at any level, use previous depth as hint
        if (this.patterns.bulleted.test(marker) || this.patterns.dashed.test(marker)) {
            return previousDepth >= 0 ? previousDepth : 0;
        }
        
        return 0; // Default to root level
    }
    
    /**
     * Detect semantic sections within list items
     */
    detectSemanticSections(item, element) {
        const text = element.textContent.toUpperCase();
        const html = element.innerHTML;
        
        const semanticPatterns = {
            note: /\bNOTE[:\-—]/,
            phraseology: /\bPHRASEOLOGY[:\-—]/,
            reference: /\bREFERENCE[:\-—]/,
            example: /\bEXAMPLE[:\-—]/,
            exception: /\bEXCEPTION[:\-—]/,
            warning: /\bWARNING[:\-—]/,
            caution: /\bCAUTION[:\-—]/,
            important: /\bIMPORTANT[:\-—]/
        };
        
        for (const [type, pattern] of Object.entries(semanticPatterns)) {
            if (pattern.test(text)) {
                item.setMetadata(`has${type.charAt(0).toUpperCase() + type.slice(1)}`, true);
                item.metadata.semanticSections.push(type);
                this.statistics.semanticSections++;
            }
        }
    }
    
    /**
     * Create DOM structure from hierarchical items
     */
    createDOMStructure(document, items, depth = 0) {
        if (!items || items.length === 0) return null;
        
        const styleConfig = this.config.styleConfig.getStyleForDepth(depth);
        const listElement = document.createElement('ol');
        
        // Apply styling
        listElement.className = `deep-nested-list depth-${depth}`;
        listElement.setAttribute('data-depth', depth.toString());
        
        if (styleConfig.type === 'bullet' || styleConfig.type === 'circle') {
            // Change to unordered list for bullet points
            const ul = document.createElement('ul');
            ul.className = listElement.className;
            ul.setAttribute('data-depth', depth.toString());
            listElement.replaceWith(ul);
            listElement = ul;
        } else {
            listElement.style.listStyleType = styleConfig.type;
        }
        
        // Add custom CSS for prefix/suffix if needed
        if (styleConfig.prefix || styleConfig.suffix) {
            listElement.setAttribute('data-prefix', styleConfig.prefix);
            listElement.setAttribute('data-suffix', styleConfig.suffix);
        }
        
        // Process each item
        items.forEach((item, index) => {
            const li = this.createListItem(document, item, depth);
            listElement.appendChild(li);
        });
        
        return listElement;
    }
    
    /**
     * Create a single list item with all its content and children
     */
    createListItem(document, item, depth) {
        const li = document.createElement('li');
        li.className = `list-item depth-${depth}`;
        
        // Add main content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'list-item-content';
        contentWrapper.textContent = item.content;
        
        // Add semantic sections if present
        if (item.metadata.semanticSections.length > 0) {
            item.metadata.semanticSections.forEach(sectionType => {
                const section = this.createSemanticSection(document, sectionType, item);
                contentWrapper.appendChild(section);
            });
        }
        
        li.appendChild(contentWrapper);
        
        // Add nested children
        if (item.hasChildren()) {
            const childList = this.createDOMStructure(document, item.children, depth + 1);
            if (childList) {
                li.appendChild(childList);
            }
        }
        
        return li;
    }
    
    /**
     * Create semantic section element
     */
    createSemanticSection(document, type, item) {
        const semanticConfig = {
            note: { tag: 'aside', role: 'note', class: 'semantic-note' },
            phraseology: { tag: 'div', role: 'region', class: 'semantic-phraseology' },
            reference: { tag: 'div', role: 'doc-bibliography', class: 'semantic-reference' },
            example: { tag: 'div', role: 'region', class: 'semantic-example' },
            exception: { tag: 'div', role: 'region', class: 'semantic-exception' },
            warning: { tag: 'div', role: 'alert', class: 'semantic-warning' },
            caution: { tag: 'div', role: 'alert', class: 'semantic-caution' },
            important: { tag: 'div', role: 'alert', class: 'semantic-important' }
        };
        
        const config = semanticConfig[type] || { tag: 'div', role: 'region', class: 'semantic-section' };
        
        const element = document.createElement(config.tag);
        element.className = config.class;
        element.setAttribute('role', config.role);
        element.setAttribute('aria-label', type.charAt(0).toUpperCase() + type.slice(1));
        
        // Extract relevant content for the semantic section
        const content = this.extractSemanticContent(item.content, type);
        element.textContent = content;
        
        return element;
    }
    
    /**
     * Extract content for semantic section
     */
    extractSemanticContent(content, type) {
        const pattern = new RegExp(`\\b${type.toUpperCase()}[:\\-—]\\s*(.+)`, 'i');
        const match = content.match(pattern);
        return match ? match[1] : content;
    }
    
    /**
     * Replace original elements with processed list
     */
    replaceWithProcessedList(containerElement, originalElements, newList, containerObj) {
        if (!newList || originalElements.length === 0) return;
        
        // Find first element with a parent node
        let firstElement = null;
        for (const element of originalElements) {
            if (element.parentNode) {
                firstElement = element;
                break;
            }
        }
        
        if (!firstElement || !firstElement.parentNode) {
            // If no valid parent found, append to container element
            if (containerElement) {
                containerElement.appendChild(newList);
            }
        } else {
            // Insert new list before first original element
            firstElement.parentNode.insertBefore(newList, firstElement);
        }
        
        // Remove original elements
        originalElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
    
    /**
     * Process standalone lists (ul/ol elements)
     */
    processStandaloneLists(document) {
        const lists = document.querySelectorAll('ul, ol');
        
        lists.forEach(list => {
            // Skip if already processed
            if (list.classList.contains('deep-nested-list')) return;
            
            // Enhance existing list with deep nesting support
            this.enhanceExistingList(document, list, 0);
        });
    }
    
    /**
     * Enhance existing list with deep nesting capabilities
     */
    enhanceExistingList(document, list, depth = 0) {
        list.classList.add('deep-nested-list', `depth-${depth}`);
        list.setAttribute('data-depth', depth.toString());
        
        const styleConfig = this.config.styleConfig.getStyleForDepth(depth);
        
        if (list.tagName === 'OL' && styleConfig.type !== 'bullet' && styleConfig.type !== 'circle') {
            list.style.listStyleType = styleConfig.type;
        }
        
        // Process nested lists
        const items = list.querySelectorAll(':scope > li');
        items.forEach(item => {
            item.classList.add('list-item', `depth-${depth}`);
            
            // Process child lists
            const childLists = item.querySelectorAll(':scope > ul, :scope > ol');
            childLists.forEach(childList => {
                this.enhanceExistingList(document, childList, depth + 1);
            });
        });
    }
    
    /**
     * Generate CSS styles for deep nested lists
     */
    generateStyles() {
        const styles = [];
        
        // Base styles
        styles.push(`
            /* Deep Nested List Processor - Generated Styles */
            .deep-nested-list {
                margin: 0;
                padding-left: 1.5em;
                line-height: 1.6;
            }
            
            .deep-nested-list.depth-0 {
                padding-left: 0;
                margin: 1em 0;
            }
            
            .list-item {
                margin: 0.5em 0;
                position: relative;
            }
            
            .list-item-content {
                display: inline-block;
                margin-bottom: 0.25em;
            }
            
            /* Semantic sections */
            .semantic-note,
            .semantic-phraseology,
            .semantic-reference,
            .semantic-example,
            .semantic-exception,
            .semantic-warning,
            .semantic-caution,
            .semantic-important {
                display: block;
                margin: 0.5em 0;
                padding: 0.75em;
                border-left: 4px solid;
                background: rgba(0, 0, 0, 0.02);
            }
            
            .semantic-note { border-left-color: #3498db; }
            .semantic-phraseology { border-left-color: #9b59b6; }
            .semantic-reference { border-left-color: #2ecc71; }
            .semantic-example { border-left-color: #f39c12; }
            .semantic-exception { border-left-color: #e74c3c; }
            .semantic-warning { border-left-color: #ff9800; }
            .semantic-caution { border-left-color: #ffc107; }
            .semantic-important { border-left-color: #e91e63; }
        `);
        
        // Generate depth-specific styles
        for (let depth = 0; depth <= this.config.maxDepth; depth++) {
            const styleConfig = this.config.styleConfig.getStyleForDepth(depth);
            
            if (styleConfig.prefix || styleConfig.suffix) {
                styles.push(`
                    .deep-nested-list.depth-${depth} {
                        counter-reset: list-counter-${depth};
                    }
                    
                    .deep-nested-list.depth-${depth} > li {
                        counter-increment: list-counter-${depth};
                        list-style: none;
                    }
                    
                    .deep-nested-list.depth-${depth} > li::before {
                        content: "${styleConfig.prefix}" counter(list-counter-${depth}, ${styleConfig.type}) "${styleConfig.suffix} ";
                        display: inline-block;
                        width: 2em;
                        margin-left: -2em;
                        text-align: right;
                        margin-right: 0.5em;
                    }
                `);
            }
        }
        
        // Responsive styles
        styles.push(`
            @media (max-width: 768px) {
                .deep-nested-list {
                    padding-left: 1em;
                }
                
                .deep-nested-list.depth-0 {
                    padding-left: 0;
                }
            }
            
            /* Print styles */
            @media print {
                .deep-nested-list {
                    page-break-inside: avoid;
                }
                
                .list-item {
                    page-break-inside: avoid;
                    page-break-after: auto;
                }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .semantic-note,
                .semantic-phraseology,
                .semantic-reference,
                .semantic-example,
                .semantic-exception,
                .semantic-warning,
                .semantic-caution,
                .semantic-important {
                    background: rgba(255, 255, 255, 0.03);
                }
            }
        `);
        
        return styles.join('\n');
    }
}

/**
 * Export for use in other modules
 */
module.exports = {
    DeepNestedListProcessor,
    ListItem,
    LIST_STYLE_CONFIG,
    LIST_PATTERNS
};

/**
 * CLI interface for standalone usage
 */
if (require.main === module) {
    const fs = require('fs');
    const path = require('path');
    
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node deep-nested-list-processor.js <input.html> <output.html> [options]');
        console.log('Options:');
        console.log('  --max-depth <n>     Maximum nesting depth (default: 10)');
        console.log('  --debug            Enable debug mode');
        console.log('  --generate-styles  Include generated CSS styles');
        process.exit(1);
    }
    
    const inputFile = args[0];
    const outputFile = args[1];
    const options = {
        maxDepth: 10,
        debug: false,
        generateStyles: false
    };
    
    // Parse additional options
    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--max-depth' && args[i + 1]) {
            options.maxDepth = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--debug') {
            options.debug = true;
        } else if (args[i] === '--generate-styles') {
            options.generateStyles = true;
        }
    }
    
    // Process file
    console.log('🚀 Deep Nested List Processor');
    console.log('=' .repeat(50));
    console.log(`Input: ${inputFile}`);
    console.log(`Output: ${outputFile}`);
    console.log(`Max Depth: ${options.maxDepth}`);
    console.log('');
    
    try {
        const html = fs.readFileSync(inputFile, 'utf8');
        const processor = new DeepNestedListProcessor(options);
        
        const result = processor.processHtml(html);
        
        // Add styles if requested
        let finalHtml = result.html;
        if (options.generateStyles) {
            const styles = processor.generateStyles();
            const styleTag = `<style>${styles}</style>`;
            finalHtml = finalHtml.replace('</head>', `${styleTag}</head>`);
        }
        
        fs.writeFileSync(outputFile, finalHtml);
        
        console.log('✅ Processing complete!');
        console.log('');
        console.log('📊 Statistics:');
        console.log(`  Total lists: ${result.statistics.totalLists}`);
        console.log(`  Items processed: ${result.statistics.itemsProcessed}`);
        console.log(`  Max depth reached: ${result.statistics.maxDepthReached}`);
        console.log(`  Semantic sections: ${result.statistics.semanticSections}`);
        
        if (result.statistics.errors.length > 0) {
            console.log('');
            console.log('⚠️  Errors:');
            result.statistics.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error processing file:', error.message);
        process.exit(1);
    }
}