#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const { chromium } = require('playwright');

/**
 * Modular Hierarchical Converter - DRY implementation
 * 
 * Handles semantic elements (NOTE, PHRASEOLOGY, REFERENCE, EXAMPLE, EXCEPTION)
 * both inside and outside list items, creating properly nested valid HTML.
 */

// Configuration for semantic element types
const SEMANTIC_TYPES = {
    note: {
        patterns: ['NOTE−', 'NOTE—', 'NOTE:', 'NOTE '],
        element: 'aside',
        className: 'note-section',
        attributes: { role: 'note' }
    },
    phraseology: {
        patterns: ['PHRASEOLOGY−', 'PHRASEOLOGY—', 'PHRASEOLOGY:', 'PHRASEOLOGY '],
        element: 'div',
        className: 'phraseology-section',
        attributes: { role: 'region', 'aria-label': 'Phraseology' }
    },
    reference: {
        patterns: ['REFERENCE−', 'REFERENCE—', 'REFERENCE:', 'REFERENCE '],
        element: 'div',
        className: 'reference-section',
        attributes: { role: 'doc-bibliography' }
    },
    example: {
        patterns: ['EXAMPLE−', 'EXAMPLE—', 'EXAMPLE:', 'EXAMPLE '],
        element: 'div',
        className: 'example-section',
        attributes: { role: 'region', 'aria-label': 'Example' }
    },
    exception: {
        patterns: ['EXCEPTION.', 'EXCEPTION:', 'EXCEPTION—', 'EXCEPTION '],
        element: 'div',
        className: 'exception-section',
        attributes: { role: 'region', 'aria-label': 'Exception' }
    }
};

/**
 * Detect semantic type from element
 */
function detectSemanticType(element) {
    const text = element.textContent.trim().toUpperCase();
    const hasEmphasis = element.innerHTML.includes('<strong>') || element.innerHTML.includes('<em>');
    
    if (!hasEmphasis) return null;
    
    for (const [type, config] of Object.entries(SEMANTIC_TYPES)) {
        for (const pattern of config.patterns) {
            if (text.startsWith(pattern) || text === pattern.replace(' ', '')) {
                return type;
            }
        }
    }
    
    return null;
}

/**
 * Create semantic wrapper element
 */
function createSemanticWrapper(document, type, elements) {
    const config = SEMANTIC_TYPES[type];
    if (!config) {
        // Fallback for unknown types
        const wrapper = document.createElement('div');
        wrapper.className = 'nested-content';
        elements.forEach(el => wrapper.appendChild(el.cloneNode(true)));
        return wrapper;
    }
    
    const wrapper = document.createElement(config.element);
    wrapper.className = config.className;
    
    // Add attributes
    for (const [key, value] of Object.entries(config.attributes || {})) {
        wrapper.setAttribute(key, value);
    }
    
    // Add elements to wrapper
    elements.forEach(el => wrapper.appendChild(el.cloneNode(true)));
    
    return wrapper;
}

/**
 * Process a group of elements and create semantic sections
 */
function processElementGroup(document, elements, parentElement) {
    let currentSemanticType = null;
    let currentSemanticGroup = [];
    let processedCount = 0;
    
    for (const element of elements) {
        const semanticType = detectSemanticType(element);
        
        if (semanticType) {
            // If we have a previous semantic group, wrap and add it
            if (currentSemanticGroup.length > 0 && currentSemanticType) {
                const wrapper = createSemanticWrapper(document, currentSemanticType, currentSemanticGroup);
                parentElement.appendChild(wrapper);
                processedCount++;
            }
            
            // Start new semantic group
            currentSemanticType = semanticType;
            currentSemanticGroup = [element];
            
        } else if (currentSemanticType) {
            // Continue current semantic group
            currentSemanticGroup.push(element);
            
        } else {
            // Regular content - add directly
            const contentDiv = document.createElement('div');
            contentDiv.className = 'nested-paragraph';
            contentDiv.innerHTML = element.innerHTML;
            parentElement.appendChild(contentDiv);
        }
    }
    
    // Process any remaining semantic group
    if (currentSemanticGroup.length > 0 && currentSemanticType) {
        const wrapper = createSemanticWrapper(document, currentSemanticType, currentSemanticGroup);
        parentElement.appendChild(wrapper);
        processedCount++;
    }
    
    return processedCount;
}

/**
 * Transform HTML to hierarchical structure
 */
async function createModularHierarchicalStructure(htmlContent) {
    console.log('🔄 Creating modular hierarchical structure with semantic elements...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate((semanticConfig) => {
        // Inject helper functions into page context
        const SEMANTIC_TYPES = semanticConfig;
        
        function detectSemanticType(element) {
            const text = element.textContent.trim().toUpperCase();
            const hasEmphasis = element.innerHTML.includes('<strong>') || element.innerHTML.includes('<em>');
            
            if (!hasEmphasis) return null;
            
            for (const [type, config] of Object.entries(SEMANTIC_TYPES)) {
                for (const pattern of config.patterns) {
                    if (text.startsWith(pattern) || text === pattern.replace(' ', '')) {
                        return type;
                    }
                }
            }
            
            return null;
        }
        
        function createSemanticWrapper(type, elements) {
            const config = SEMANTIC_TYPES[type];
            let wrapper;
            
            if (!config) {
                wrapper = document.createElement('div');
                wrapper.className = 'nested-content';
            } else {
                wrapper = document.createElement(config.element);
                wrapper.className = config.className;
                
                for (const [key, value] of Object.entries(config.attributes || {})) {
                    wrapper.setAttribute(key, value);
                }
            }
            
            elements.forEach(el => wrapper.appendChild(el.cloneNode(true)));
            return wrapper;
        }
        
        let totalListsProcessed = 0;
        let totalSemanticSections = 0;
        let standaloneSemanticSections = 0;
        
        // Process all content sections
        const sections = document.querySelectorAll('h6.heading-8');
        
        sections.forEach((section) => {
            const sectionTitle = section.textContent.trim();
            console.log(`Processing section: ${sectionTitle}`);
            
            // Collect all elements in this section
            const sectionElements = [];
            let currentElement = section.nextElementSibling;
            
            while (currentElement && 
                   !currentElement.matches('h6.heading-8') &&
                   !currentElement.matches('h1, h2, h3, h4, h5')) {
                sectionElements.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }
            
            // Find list items
            const listItemIndices = [];
            sectionElements.forEach((el, index) => {
                if (el.tagName === 'P' && el.classList.contains('list-item')) {
                    listItemIndices.push(index);
                }
            });
            
            // Process as hierarchical list if we have list items
            if (listItemIndices.length >= 2) {
                const mainList = document.createElement('ol');
                mainList.className = 'hierarchical-list';
                mainList.style.listStyleType = 'lower-alpha';
                
                // Process each list item and its nested content
                for (let i = 0; i < listItemIndices.length; i++) {
                    const startIndex = listItemIndices[i];
                    const endIndex = (i < listItemIndices.length - 1) 
                        ? listItemIndices[i + 1] 
                        : sectionElements.length;
                    
                    const li = document.createElement('li');
                    
                    // Add main list item content
                    const listItemElement = sectionElements[startIndex];
                    const mainContent = document.createElement('div');
                    mainContent.className = 'list-item-content';
                    mainContent.innerHTML = listItemElement.innerHTML;
                    li.appendChild(mainContent);
                    
                    // Process nested content
                    if (endIndex - startIndex > 1) {
                        let currentSemanticType = null;
                        let currentSemanticGroup = [];
                        
                        for (let j = startIndex + 1; j < endIndex; j++) {
                            const element = sectionElements[j];
                            const semanticType = detectSemanticType(element);
                            
                            if (semanticType) {
                                // Wrap previous semantic group
                                if (currentSemanticGroup.length > 0 && currentSemanticType) {
                                    li.appendChild(createSemanticWrapper(currentSemanticType, currentSemanticGroup));
                                    totalSemanticSections++;
                                }
                                
                                // Start new semantic group
                                currentSemanticType = semanticType;
                                currentSemanticGroup = [element];
                                
                            } else if (currentSemanticType) {
                                // Continue current semantic group
                                currentSemanticGroup.push(element);
                                
                            } else {
                                // Regular nested content
                                const nestedDiv = document.createElement('div');
                                nestedDiv.className = 'nested-paragraph';
                                nestedDiv.innerHTML = element.innerHTML;
                                li.appendChild(nestedDiv);
                            }
                        }
                        
                        // Wrap remaining semantic group
                        if (currentSemanticGroup.length > 0 && currentSemanticType) {
                            li.appendChild(createSemanticWrapper(currentSemanticType, currentSemanticGroup));
                            totalSemanticSections++;
                        }
                    }
                    
                    mainList.appendChild(li);
                }
                
                // Replace original elements with hierarchical list
                const firstElement = sectionElements[listItemIndices[0]];
                firstElement.parentNode.insertBefore(mainList, firstElement);
                
                // Remove processed elements
                for (let i = listItemIndices[0]; i < sectionElements.length; i++) {
                    if (sectionElements[i].parentNode) {
                        sectionElements[i].remove();
                    }
                }
                
                totalListsProcessed++;
                
            } else {
                // Process standalone semantic sections (not in lists)
                let currentSemanticType = null;
                let currentSemanticGroup = [];
                let elementsToRemove = [];
                
                for (const element of sectionElements) {
                    const semanticType = detectSemanticType(element);
                    
                    if (semanticType) {
                        // Wrap previous group if exists
                        if (currentSemanticGroup.length > 0 && currentSemanticType) {
                            const wrapper = createSemanticWrapper(currentSemanticType, currentSemanticGroup);
                            wrapper.className += ' standalone-semantic';
                            currentSemanticGroup[0].parentNode.insertBefore(wrapper, currentSemanticGroup[0]);
                            elementsToRemove.push(...currentSemanticGroup);
                            standaloneSemanticSections++;
                        }
                        
                        currentSemanticType = semanticType;
                        currentSemanticGroup = [element];
                        
                    } else if (currentSemanticType) {
                        currentSemanticGroup.push(element);
                    } else {
                        // If we have a pending semantic group, wrap it
                        if (currentSemanticGroup.length > 0 && currentSemanticType) {
                            const wrapper = createSemanticWrapper(currentSemanticType, currentSemanticGroup);
                            wrapper.className += ' standalone-semantic';
                            currentSemanticGroup[0].parentNode.insertBefore(wrapper, currentSemanticGroup[0]);
                            elementsToRemove.push(...currentSemanticGroup);
                            standaloneSemanticSections++;
                            
                            currentSemanticType = null;
                            currentSemanticGroup = [];
                        }
                    }
                }
                
                // Wrap final semantic group
                if (currentSemanticGroup.length > 0 && currentSemanticType) {
                    const wrapper = createSemanticWrapper(currentSemanticType, currentSemanticGroup);
                    wrapper.className += ' standalone-semantic';
                    currentSemanticGroup[0].parentNode.insertBefore(wrapper, currentSemanticGroup[0]);
                    elementsToRemove.push(...currentSemanticGroup);
                    standaloneSemanticSections++;
                }
                
                // Remove wrapped elements
                elementsToRemove.forEach(el => el.remove());
            }
        });
        
        console.log(`Processed ${totalListsProcessed} list sections`);
        console.log(`Created ${totalSemanticSections} semantic sections in lists`);
        console.log(`Created ${standaloneSemanticSections} standalone semantic sections`);
        
        return document.documentElement.outerHTML;
        
    }, SEMANTIC_TYPES);
    
    await browser.close();
    
    console.log('✅ Modular hierarchical structure creation complete');
    return transformedHtml;
}

async function convertWithModularHierarchy(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting with modular hierarchical structure: ${inputPath}\n`);
        
        // Style map for Word styles
        const styleMap = [
            "p[style-name='Title'] => h1.document-title:fresh",
            "p[style-name='Body Text'] => p.body-text",
            "p[style-name='BodyText'] => p.body-text",
            "p[style-name='heading 8'] => h6.heading-8",
            "p[style-name='Heading8'] => h6.heading-8",
            "p[style-name='Table Paragraph'] => p.table-paragraph",
            "p[style-name='List Paragraph'] => p.list-item",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
        ];
        
        // Convert with mammoth
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: styleMap,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false
        });
        
        console.log(`📄 Initial conversion complete`);
        console.log(`   Found ${(result.value.match(/class="list-item"/g) || []).length} list items`);
        
        // Transform to modular hierarchical structure
        const enhancedContent = await createModularHierarchicalStructure(result.value);
        
        // Create final HTML with comprehensive styling
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modular Hierarchical Document</title>
    <style>
        :root {
            --primary-color: #3498db;
            --text-color: #333;
            --bg-color: #fff;
            --border-color: #e0e0e0;
            --note-bg: #fff9e6;
            --note-border: #ffc107;
            --phraseology-bg: #e8f4f8;
            --phraseology-border: #17a2b8;
            --reference-bg: #f3e5f5;
            --reference-border: #9c27b0;
            --example-bg: #e8f5e9;
            --example-border: #4caf50;
            --exception-bg: #ffebee;
            --exception-border: #f44336;
        }
        
        @media (prefers-color-scheme: dark) {
            :root {
                --text-color: #e0e0e0;
                --bg-color: #1a1a1a;
                --border-color: #404040;
                --note-bg: #3d3100;
                --phraseology-bg: #003344;
                --reference-bg: #2d0036;
                --example-bg: #003300;
                --exception-bg: #330000;
            }
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            color: var(--text-color);
            background: var(--bg-color);
        }
        
        .document-title { 
            color: var(--primary-color);
            font-size: 2.2em;
            font-weight: 700;
            border-bottom: 3px solid var(--primary-color);
            padding-bottom: 15px; 
            margin: 0 0 30px 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--text-color);
            margin: 24px 0 16px 0;
        }
        
        .body-text { 
            margin: 16px 0; 
            text-align: justify;
            line-height: 1.7;
        }
        
        .heading-8 { 
            font-size: 0.9em; 
            font-weight: 600; 
            color: #7f8c8d; 
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Hierarchical list styling */
        .hierarchical-list {
            list-style-type: lower-alpha;
            padding-left: 30px;
            margin: 16px 0;
            counter-reset: list-item;
        }
        
        .hierarchical-list > li {
            margin: 16px 0;
            line-height: 1.6;
            counter-increment: list-item;
        }
        
        .hierarchical-list > li::marker {
            font-weight: 600;
            color: var(--primary-color);
        }
        
        /* List item content */
        .list-item-content {
            margin-bottom: 12px;
            text-align: justify;
        }
        
        /* Nested content */
        .nested-paragraph {
            margin: 8px 0;
            padding-left: 20px;
            text-align: justify;
        }
        
        /* Semantic sections - shared styles */
        .note-section,
        .phraseology-section,
        .reference-section,
        .example-section,
        .exception-section {
            padding: 12px 16px;
            margin: 12px 0 12px 20px;
            border-radius: 4px;
            border-left-width: 4px;
            border-left-style: solid;
        }
        
        /* Standalone semantic sections (outside lists) */
        .standalone-semantic {
            margin-left: 0;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        
        /* Individual semantic section styles */
        .note-section {
            background: var(--note-bg);
            border-left-color: var(--note-border);
        }
        
        .note-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
        }
        
        .phraseology-section {
            background: var(--phraseology-bg);
            border-left-color: var(--phraseology-border);
        }
        
        .phraseology-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
        }
        
        .reference-section {
            background: var(--reference-bg);
            border-left-color: var(--reference-border);
        }
        
        .reference-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
        }
        
        .example-section {
            background: var(--example-bg);
            border-left-color: var(--example-border);
        }
        
        .example-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
        }
        
        .exception-section {
            background: var(--exception-bg);
            border-left-color: var(--exception-border);
        }
        
        .exception-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
        }
        
        /* Typography */
        strong { 
            font-weight: 600; 
        }
        
        em { 
            font-style: italic; 
        }
        
        p { 
            margin: 12px 0;
        }
        
        /* Nested lists */
        .hierarchical-list ol,
        .hierarchical-list ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        /* Links */
        a {
            color: var(--primary-color);
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        /* Print styles */
        @media print {
            body { 
                margin: 0; 
                padding: 20px;
                color: #000;
                background: #fff;
            }
            .document-title { page-break-after: avoid; }
            .hierarchical-list { page-break-inside: avoid; }
            .hierarchical-list > li { page-break-inside: avoid; }
            .note-section,
            .phraseology-section,
            .reference-section,
            .example-section,
            .exception-section { 
                page-break-inside: avoid;
                background: #f5f5f5 !important;
                border-left: 3px solid #333 !important;
            }
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .document-title { font-size: 1.8em; }
            .hierarchical-list { padding-left: 25px; }
            .nested-paragraph { padding-left: 15px; }
            .note-section,
            .phraseology-section,
            .reference-section,
            .example-section,
            .exception-section {
                margin-left: 10px;
            }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Modular hierarchical conversion completed!`);
        console.log(`📄 Saved to: ${outputPath}`);
        
        if (result.messages && result.messages.length > 0) {
            console.log(`\n📋 Conversion messages (${result.messages.length}):`)
            result.messages.forEach(msg => {
                console.log(`   • ${msg.message}`);
            });
        } else {
            console.log('\n🎉 Clean conversion - no warnings!');
        }
        
        return { result, finalHtml };
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log(`
Modular Hierarchical Converter for Mammoth.js

USAGE:
  node modular-hierarchical-converter.js <input.docx> [output.html]

FEATURES:
  • DRY modular implementation for maintainability
  • Handles semantic elements both inside and outside lists
  • Creates properly nested hierarchical lists
  • Semantic HTML5 elements with ARIA roles
  • Standalone semantic sections for non-list content
  • Dark mode support
  • Mobile responsive
  • Print optimized
  
SEMANTIC ELEMENTS HANDLED:
  • NOTE sections → <aside role="note">
  • PHRASEOLOGY sections → <div role="region" aria-label="Phraseology">
  • REFERENCE sections → <div role="doc-bibliography">
  • EXAMPLE sections → <div role="region" aria-label="Example">
  • EXCEPTION sections → <div role="region" aria-label="Exception">
  
EXAMPLE:
  node modular-hierarchical-converter.js chapter_3.docx output.html
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_modular_hierarchical.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithModularHierarchy(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 Success! Document converted with modular hierarchical structure.');
            console.log('📋 Both list and standalone semantic sections are properly wrapped.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { convertWithModularHierarchy, createModularHierarchicalStructure };