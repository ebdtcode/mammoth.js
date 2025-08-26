#!/usr/bin/env node

/**
 * Semantic List Processor - Enterprise-Grade Solution
 * 
 * Handles ordered lists within semantic sections (NOTE, REFERENCE, EXAMPLE, etc.)
 * Built with DRY principles, composition pattern, and best practices
 * 
 * Architecture: Component-based, Composable, Extensible
 */

const { JSDOM } = require('jsdom');
const { DeepNestedListProcessor, LIST_STYLE_CONFIG, LIST_PATTERNS } = require('./deep-nested-list-processor');

/**
 * Semantic Section Configuration
 * Single source of truth for all semantic section types
 */
const SEMANTIC_CONFIG = {
    note: {
        patterns: [/\bNOTE[:\-—–]\s*/i, /\bNOTE\s+/i],
        element: 'aside',
        className: 'semantic-note',
        attributes: { role: 'note' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '📝'
    },
    reference: {
        patterns: [/\bREFERENCE[:\-—–]\s*/i, /\bREF[:\-—–]\s*/i],
        element: 'div',
        className: 'semantic-reference',
        attributes: { role: 'doc-bibliography' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '📚'
    },
    example: {
        patterns: [/\bEXAMPLE[:\-—–]\s*/i, /\bEX[:\-—–]\s*/i],
        element: 'div',
        className: 'semantic-example',
        attributes: { role: 'region', 'aria-label': 'Example' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '💡'
    },
    phraseology: {
        patterns: [/\bPHRASEOLOGY[:\-—–]\s*/i],
        element: 'div',
        className: 'semantic-phraseology',
        attributes: { role: 'region', 'aria-label': 'Phraseology' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '💬'
    },
    exception: {
        patterns: [/\bEXCEPTION[:\-—–]\s*/i],
        element: 'div',
        className: 'semantic-exception',
        attributes: { role: 'region', 'aria-label': 'Exception' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '⚠️'
    },
    warning: {
        patterns: [/\bWARNING[:\-—–]\s*/i],
        element: 'div',
        className: 'semantic-warning',
        attributes: { role: 'alert' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '⚠️'
    },
    caution: {
        patterns: [/\bCAUTION[:\-—–]\s*/i],
        element: 'div',
        className: 'semantic-caution',
        attributes: { role: 'alert' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '⚡'
    },
    important: {
        patterns: [/\bIMPORTANT[:\-—–]\s*/i],
        element: 'div',
        className: 'semantic-important',
        attributes: { role: 'alert' },
        allowsLists: true,
        preserveHeader: true,
        headerElement: 'h4',
        headerClass: 'semantic-header',
        icon: '❗'
    }
};

/**
 * Semantic Section Class - Represents a semantic section with potential lists
 */
class SemanticSection {
    constructor(type, config, content = []) {
        this.type = type;
        this.config = config;
        this.content = content;
        this.headerText = '';
        this.bodyContent = [];
        this.lists = [];
        this.metadata = {
            hasLists: false,
            listCount: 0,
            totalItems: 0,
            maxDepth: 0
        };
    }
    
    addContent(element) {
        this.content.push(element);
    }
    
    addList(listStructure) {
        this.lists.push(listStructure);
        this.metadata.hasLists = true;
        this.metadata.listCount++;
    }
    
    setHeader(text) {
        this.headerText = text;
    }
    
    hasContent() {
        return this.content.length > 0 || this.lists.length > 0;
    }
}

/**
 * Semantic List Processor - Main processing class
 */
class SemanticListProcessor {
    constructor(config = {}) {
        this.config = {
            detectSemanticSections: config.detectSemanticSections !== false,
            processListsInSections: config.processListsInSections !== false,
            preserveSectionHeaders: config.preserveSectionHeaders !== false,
            maxDepthInSections: config.maxDepthInSections || 6,
            inheritParentDepth: config.inheritParentDepth !== false,
            semanticConfig: { ...SEMANTIC_CONFIG, ...(config.semanticConfig || {}) },
            debug: config.debug || false
        };
        
        // Initialize deep nested list processor for reuse
        this.listProcessor = new DeepNestedListProcessor({
            maxDepth: this.config.maxDepthInSections,
            preserveNumbering: true,
            detectSemanticSections: false // We handle semantic sections separately
        });
        
        this.statistics = this.resetStatistics();
    }
    
    resetStatistics() {
        return {
            sectionsProcessed: 0,
            listsInSections: 0,
            totalListItems: 0,
            maxDepthReached: 0,
            sectionTypes: {},
            errors: []
        };
    }
    
    /**
     * Process HTML content with semantic section awareness
     */
    processHtml(html) {
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        this.statistics = this.resetStatistics();
        
        // Process semantic sections
        const sections = this.findSemanticSections(document);
        
        sections.forEach(section => {
            this.processSemanticSection(document, section);
        });
        
        // Process any remaining standalone lists
        this.processStandaloneLists(document);
        
        return {
            html: document.documentElement.outerHTML,
            statistics: this.statistics
        };
    }
    
    /**
     * Find all semantic sections in the document
     */
    findSemanticSections(document) {
        const sections = [];
        const processedElements = new Set();
        
        // Find all potential semantic section starts
        const allElements = document.querySelectorAll('p, div, aside, section');
        
        allElements.forEach(element => {
            if (processedElements.has(element)) return;
            
            const sectionType = this.detectSemanticType(element);
            if (sectionType) {
                const section = this.extractSemanticSection(element, processedElements);
                if (section) {
                    sections.push(section);
                }
            }
        });
        
        return sections;
    }
    
    /**
     * Detect semantic type from element content
     */
    detectSemanticType(element) {
        const text = element.textContent.trim();
        
        for (const [type, config] of Object.entries(this.config.semanticConfig)) {
            for (const pattern of config.patterns) {
                if (pattern.test(text)) {
                    return type;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Extract complete semantic section including following content
     */
    extractSemanticSection(startElement, processedElements) {
        const type = this.detectSemanticType(startElement);
        if (!type) return null;
        
        const config = this.config.semanticConfig[type];
        const section = new SemanticSection(type, config);
        
        // Extract header text
        const text = startElement.textContent.trim();
        const headerMatch = text.match(config.patterns[0]);
        if (headerMatch) {
            section.setHeader(text.substring(0, headerMatch[0].length).trim());
            
            // Get content after the semantic marker
            const contentAfter = text.substring(headerMatch[0].length).trim();
            if (contentAfter) {
                section.bodyContent.push({ type: 'text', content: contentAfter });
            }
        }
        
        // Mark start element as processed
        processedElements.add(startElement);
        section.addContent(startElement);
        
        // Collect following elements that belong to this section
        let currentElement = startElement.nextElementSibling;
        let listElements = [];
        
        while (currentElement) {
            // Check if this starts a new semantic section
            if (this.detectSemanticType(currentElement)) {
                break;
            }
            
            // Check if this is a heading (section boundary)
            if (currentElement.matches('h1, h2, h3, h4, h5, h6')) {
                // Check if it's a semantic header that belongs to this section
                const isSemanticHeader = currentElement.classList.contains('semantic-header');
                if (!isSemanticHeader) {
                    break;
                }
            }
            
            // Check for list items
            const hasListMarker = this.hasListMarker(currentElement);
            
            if (hasListMarker) {
                listElements.push(currentElement);
            } else if (listElements.length > 0) {
                // Process accumulated list elements
                this.processListInSection(section, listElements);
                listElements = [];
            }
            
            section.addContent(currentElement);
            processedElements.add(currentElement);
            
            currentElement = currentElement.nextElementSibling;
        }
        
        // Process any remaining list elements
        if (listElements.length > 0) {
            this.processListInSection(section, listElements);
        }
        
        return section.hasContent() ? section : null;
    }
    
    /**
     * Check if element has a list marker
     */
    hasListMarker(element) {
        const text = element.textContent.trim();
        return LIST_PATTERNS.extractMarker(text) !== null;
    }
    
    /**
     * Process list elements within a semantic section
     */
    processListInSection(section, listElements) {
        if (listElements.length === 0) return;
        
        // Build hierarchical structure from list elements
        const listStructure = this.buildListStructure(listElements, section);
        
        if (listStructure.items.length > 0) {
            section.addList(listStructure);
            this.statistics.listsInSections++;
            this.statistics.totalListItems += listStructure.itemCount;
            this.statistics.maxDepthReached = Math.max(
                this.statistics.maxDepthReached,
                listStructure.maxDepth
            );
        }
    }
    
    /**
     * Build list structure from elements
     */
    buildListStructure(elements, section) {
        const structure = {
            items: [],
            itemCount: 0,
            maxDepth: 0
        };
        
        // Use the deep nested list processor's logic
        const tempContainer = {
            element: null,
            listElements: elements
        };
        
        // Build hierarchical structure
        const rootItems = this.listProcessor.buildHierarchicalStructure(elements);
        
        structure.items = rootItems;
        structure.itemCount = this.countItems(rootItems);
        structure.maxDepth = this.calculateMaxDepth(rootItems);
        
        return structure;
    }
    
    /**
     * Count total items in hierarchical structure
     */
    countItems(items, count = 0) {
        items.forEach(item => {
            count++;
            if (item.children && item.children.length > 0) {
                count = this.countItems(item.children, count);
            }
        });
        return count;
    }
    
    /**
     * Calculate maximum depth in hierarchical structure
     */
    calculateMaxDepth(items, currentDepth = 0) {
        let maxDepth = currentDepth;
        
        items.forEach(item => {
            if (item.children && item.children.length > 0) {
                const childDepth = this.calculateMaxDepth(item.children, currentDepth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            }
        });
        
        return maxDepth;
    }
    
    /**
     * Process a complete semantic section
     */
    processSemanticSection(document, section) {
        const { type, config, content, lists } = section;
        
        // Create semantic wrapper
        const wrapper = document.createElement(config.element);
        wrapper.className = config.className;
        
        // Add attributes
        for (const [key, value] of Object.entries(config.attributes || {})) {
            wrapper.setAttribute(key, value);
        }
        
        // Add header if configured
        if (config.preserveHeader && section.headerText) {
            const header = document.createElement(config.headerElement || 'h4');
            header.className = config.headerClass || 'semantic-header';
            
            // Add icon if configured
            const iconSpan = config.icon ? `<span class="semantic-icon" aria-hidden="true">${config.icon}</span> ` : '';
            header.innerHTML = iconSpan + section.headerText;
            
            wrapper.appendChild(header);
        }
        
        // Add body content
        section.bodyContent.forEach(content => {
            if (content.type === 'text') {
                const p = document.createElement('p');
                p.className = 'semantic-content';
                p.textContent = content.content;
                wrapper.appendChild(p);
            }
        });
        
        // Process and add lists
        if (lists.length > 0 && config.allowsLists) {
            lists.forEach(listStructure => {
                const listElement = this.createListElement(document, listStructure);
                if (listElement) {
                    wrapper.appendChild(listElement);
                }
            });
        }
        
        // Replace original content
        if (content.length > 0 && content[0].parentNode) {
            content[0].parentNode.insertBefore(wrapper, content[0]);
            
            // Remove original elements
            content.forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        }
        
        // Update statistics
        this.statistics.sectionsProcessed++;
        this.statistics.sectionTypes[type] = (this.statistics.sectionTypes[type] || 0) + 1;
    }
    
    /**
     * Create list element from structure
     */
    createListElement(document, listStructure) {
        if (!listStructure.items || listStructure.items.length === 0) {
            return null;
        }
        
        // Use the deep nested list processor to create DOM
        const listElement = this.listProcessor.createDOMStructure(
            document,
            listStructure.items,
            0
        );
        
        // Add semantic context class
        if (listElement) {
            listElement.classList.add('semantic-list');
        }
        
        return listElement;
    }
    
    /**
     * Process standalone lists not in semantic sections
     */
    processStandaloneLists(document) {
        // This is handled by the deep nested list processor
        // We only need to ensure semantic sections are preserved
        const lists = document.querySelectorAll('ul, ol');
        
        lists.forEach(list => {
            // Skip if already processed or within semantic section
            if (list.classList.contains('semantic-list') || 
                list.closest('.semantic-note, .semantic-reference, .semantic-example')) {
                return;
            }
            
            // Enhance with deep nesting support if needed
            if (!list.classList.contains('deep-nested-list')) {
                this.listProcessor.enhanceExistingList(document, list, 0);
            }
        });
    }
    
    /**
     * Generate comprehensive styles for semantic sections with lists
     */
    generateStyles() {
        const styles = [];
        
        // Base styles for semantic sections
        styles.push(`
            /* Semantic List Processor - Generated Styles */
            
            /* Base semantic section styles */
            [class^="semantic-"] {
                margin: 1.5em 0;
                padding: 1.25em;
                border-left: 4px solid;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.02);
                position: relative;
            }
            
            /* Semantic headers */
            .semantic-header {
                margin: 0 0 1em 0;
                font-size: 1.1em;
                font-weight: 600;
                color: inherit;
                display: flex;
                align-items: center;
                gap: 0.5em;
            }
            
            .semantic-icon {
                font-size: 1.2em;
                line-height: 1;
            }
            
            /* Semantic content paragraphs */
            .semantic-content {
                margin: 0.75em 0;
                line-height: 1.6;
            }
            
            /* Lists within semantic sections */
            .semantic-list {
                margin: 1em 0;
                padding-left: 1.5em;
            }
            
            [class^="semantic-"] .semantic-list {
                background: rgba(255, 255, 255, 0.5);
                padding: 0.75em 0.75em 0.75em 2em;
                border-radius: 4px;
                margin: 1em -0.5em;
            }
            
            /* Nested lists in semantic sections */
            [class^="semantic-"] .deep-nested-list {
                font-size: 0.95em;
            }
            
            [class^="semantic-"] .deep-nested-list .deep-nested-list {
                font-size: 1em; /* Prevent compounding size reduction */
            }
        `);
        
        // Section-specific styles
        const sectionStyles = {
            'semantic-note': {
                borderColor: '#3498db',
                background: 'rgba(52, 152, 219, 0.05)',
                headerColor: '#2c3e50'
            },
            'semantic-reference': {
                borderColor: '#27ae60',
                background: 'rgba(39, 174, 96, 0.05)',
                headerColor: '#27ae60'
            },
            'semantic-example': {
                borderColor: '#f39c12',
                background: 'rgba(243, 156, 18, 0.05)',
                headerColor: '#f39c12'
            },
            'semantic-phraseology': {
                borderColor: '#9b59b6',
                background: 'rgba(155, 89, 182, 0.05)',
                headerColor: '#8e44ad'
            },
            'semantic-exception': {
                borderColor: '#e74c3c',
                background: 'rgba(231, 76, 60, 0.05)',
                headerColor: '#c0392b'
            },
            'semantic-warning': {
                borderColor: '#ff9800',
                background: 'rgba(255, 152, 0, 0.05)',
                headerColor: '#f57c00'
            },
            'semantic-caution': {
                borderColor: '#ffc107',
                background: 'rgba(255, 193, 7, 0.05)',
                headerColor: '#f57f17'
            },
            'semantic-important': {
                borderColor: '#e91e63',
                background: 'rgba(233, 30, 99, 0.05)',
                headerColor: '#c2185b'
            }
        };
        
        for (const [className, style] of Object.entries(sectionStyles)) {
            styles.push(`
                .${className} {
                    border-left-color: ${style.borderColor};
                    background: ${style.background};
                }
                
                .${className} .semantic-header {
                    color: ${style.headerColor};
                }
            `);
        }
        
        // Responsive styles
        styles.push(`
            @media (max-width: 768px) {
                [class^="semantic-"] {
                    margin: 1em -0.5em;
                    padding: 1em;
                    border-left-width: 3px;
                    border-radius: 0;
                }
                
                [class^="semantic-"] .semantic-list {
                    margin: 0.75em -0.25em;
                    padding: 0.5em 0.5em 0.5em 1.5em;
                }
            }
            
            /* Print styles */
            @media print {
                [class^="semantic-"] {
                    page-break-inside: avoid;
                    border: 1px solid #000;
                    background: #f5f5f5 !important;
                }
                
                .semantic-header {
                    font-weight: bold;
                    text-decoration: underline;
                }
                
                .semantic-icon {
                    display: none;
                }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                [class^="semantic-"] {
                    background: rgba(255, 255, 255, 0.03);
                }
                
                [class^="semantic-"] .semantic-list {
                    background: rgba(0, 0, 0, 0.2);
                }
                
                .semantic-header {
                    color: #fff;
                    opacity: 0.95;
                }
            }
            
            /* Accessibility - High contrast mode */
            @media (prefers-contrast: high) {
                [class^="semantic-"] {
                    border-left-width: 6px;
                    border-style: solid;
                }
                
                .semantic-header {
                    text-decoration: underline;
                    font-weight: 700;
                }
            }
        `);
        
        // Include deep nested list styles
        styles.push(this.listProcessor.generateStyles());
        
        return styles.join('\n');
    }
}

/**
 * Composition Helper - Combines both processors
 */
class IntegratedListProcessor {
    constructor(config = {}) {
        this.semanticProcessor = new SemanticListProcessor(config);
        this.deepListProcessor = new DeepNestedListProcessor(config);
        this.config = config;
    }
    
    /**
     * Process HTML with both semantic and deep nesting support
     */
    processHtml(html) {
        // First pass: Process semantic sections with their lists
        const semanticResult = this.semanticProcessor.processHtml(html);
        
        // Second pass: Process any remaining standalone lists
        const finalResult = this.deepListProcessor.processHtml(semanticResult.html);
        
        // Combine statistics
        const combinedStats = {
            semantic: semanticResult.statistics,
            deepNesting: finalResult.statistics,
            combined: {
                totalSections: semanticResult.statistics.sectionsProcessed,
                totalLists: semanticResult.statistics.listsInSections + finalResult.statistics.totalLists,
                totalItems: semanticResult.statistics.totalListItems + finalResult.statistics.itemsProcessed,
                maxDepth: Math.max(
                    semanticResult.statistics.maxDepthReached,
                    finalResult.statistics.maxDepthReached
                )
            }
        };
        
        return {
            html: finalResult.html,
            statistics: combinedStats
        };
    }
    
    /**
     * Generate combined styles
     */
    generateStyles() {
        return this.semanticProcessor.generateStyles();
    }
}

/**
 * Export for use in other modules
 */
module.exports = {
    SemanticListProcessor,
    IntegratedListProcessor,
    SemanticSection,
    SEMANTIC_CONFIG
};

/**
 * CLI interface for testing
 */
if (require.main === module) {
    const fs = require('fs');
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node semantic-list-processor.js <input.html> <output.html> [options]');
        console.log('Options:');
        console.log('  --integrated       Use integrated processor (recommended)');
        console.log('  --generate-styles  Include generated CSS styles');
        console.log('  --debug           Enable debug mode');
        process.exit(1);
    }
    
    const inputFile = args[0];
    const outputFile = args[1];
    const options = {
        integrated: args.includes('--integrated'),
        generateStyles: args.includes('--generate-styles'),
        debug: args.includes('--debug')
    };
    
    console.log('🚀 Semantic List Processor');
    console.log('=' .repeat(50));
    
    try {
        const html = fs.readFileSync(inputFile, 'utf8');
        
        // Choose processor
        const processor = options.integrated 
            ? new IntegratedListProcessor(options)
            : new SemanticListProcessor(options);
        
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
        console.log('📊 Statistics:', JSON.stringify(result.statistics, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}