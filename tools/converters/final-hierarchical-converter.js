#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const { chromium } = require('playwright');

/**
 * Final Hierarchical List Converter
 * 
 * Creates properly nested lists with semantic HTML5 elements for special sections.
 * All content between list items is nested as children of the preceding item,
 * maintaining continuous numbering and proper document hierarchy.
 */

async function createFinalHierarchicalLists(htmlContent) {
    console.log('🔄 Creating final hierarchical nested lists with semantic elements...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate(() => {
        // Helper function to identify semantic element type
        function getSemanticType(element) {
            const text = element.textContent.trim();
            const innerHTMLStripped = element.innerHTML.replace(/<[^>]*>/g, '').trim();
            
            // Check for specific keywords
            if (text.startsWith('NOTE−') || text.startsWith('NOTE—') || 
                innerHTMLStripped.startsWith('NOTE−') || innerHTMLStripped.startsWith('NOTE—')) {
                return 'note';
            } else if (text.startsWith('PHRASEOLOGY−') || text.startsWith('PHRASEOLOGY—') ||
                      innerHTMLStripped.startsWith('PHRASEOLOGY−') || innerHTMLStripped.startsWith('PHRASEOLOGY—')) {
                return 'phraseology';
            } else if (text.startsWith('REFERENCE−') || text.startsWith('REFERENCE—') ||
                      innerHTMLStripped.startsWith('REFERENCE−') || innerHTMLStripped.startsWith('REFERENCE—')) {
                return 'reference';
            } else if (text.startsWith('EXAMPLE−') || text.startsWith('EXAMPLE—') ||
                      innerHTMLStripped.startsWith('EXAMPLE−') || innerHTMLStripped.startsWith('EXAMPLE—')) {
                return 'example';
            } else if (text.startsWith('EXCEPTION.') || text.startsWith('EXCEPTION:') ||
                      innerHTMLStripped.startsWith('EXCEPTION.') || innerHTMLStripped.startsWith('EXCEPTION:')) {
                return 'exception';
            }
            
            return null;
        }
        
        // Helper function to create semantic wrapper
        function createSemanticWrapper(type, elements) {
            let wrapper;
            
            switch(type) {
                case 'note':
                    wrapper = document.createElement('aside');
                    wrapper.className = 'note-section';
                    wrapper.setAttribute('role', 'note');
                    wrapper.setAttribute('aria-label', 'Note');
                    break;
                case 'phraseology':
                    wrapper = document.createElement('div');
                    wrapper.className = 'phraseology-section';
                    wrapper.setAttribute('role', 'region');
                    wrapper.setAttribute('aria-label', 'Phraseology');
                    break;
                case 'reference':
                    wrapper = document.createElement('div');
                    wrapper.className = 'reference-section';
                    wrapper.setAttribute('role', 'doc-bibliography');
                    wrapper.setAttribute('aria-label', 'Reference');
                    break;
                case 'example':
                    wrapper = document.createElement('div');
                    wrapper.className = 'example-section';
                    wrapper.setAttribute('role', 'region');
                    wrapper.setAttribute('aria-label', 'Example');
                    break;
                case 'exception':
                    wrapper = document.createElement('div');
                    wrapper.className = 'exception-section';
                    wrapper.setAttribute('role', 'region');
                    wrapper.setAttribute('aria-label', 'Exception');
                    break;
                default:
                    return null;
            }
            
            elements.forEach(el => {
                wrapper.appendChild(el.cloneNode(true));
            });
            
            return wrapper;
        }
        
        // Process each section
        const sections = document.querySelectorAll('h6.heading-8');
        let totalSectionsProcessed = 0;
        let semanticCounts = {
            note: 0,
            phraseology: 0,
            reference: 0,
            example: 0,
            exception: 0
        };
        
        sections.forEach((section, sectionIndex) => {
            const sectionTitle = section.textContent.trim();
            console.log(`Processing section: ${sectionTitle}`);
            
            // Get all elements in this section
            const sectionElements = [];
            let currentElement = section.nextElementSibling;
            
            while (currentElement && 
                   !currentElement.matches('h6.heading-8') &&
                   !currentElement.matches('h1, h2, h3, h4, h5')) {
                sectionElements.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }
            
            // Find list items in this section
            const listItemIndices = [];
            sectionElements.forEach((el, index) => {
                if (el.tagName === 'P' && el.classList.contains('list-item')) {
                    listItemIndices.push(index);
                }
            });
            
            if (listItemIndices.length >= 1) {
                console.log(`  Found ${listItemIndices.length} list items`);
                
                // Create the main ordered list
                const mainList = document.createElement('ol');
                mainList.className = 'hierarchical-list';
                mainList.style.listStyleType = 'lower-alpha';
                
                // Process each list item and its nested content
                for (let i = 0; i < listItemIndices.length; i++) {
                    const startIndex = listItemIndices[i];
                    const endIndex = (i < listItemIndices.length - 1) 
                        ? listItemIndices[i + 1] 
                        : sectionElements.length;
                    
                    // Create the list item
                    const li = document.createElement('li');
                    
                    // Add the main list item content
                    const listItemElement = sectionElements[startIndex];
                    const mainContent = document.createElement('div');
                    mainContent.className = 'list-item-content';
                    mainContent.innerHTML = listItemElement.innerHTML;
                    li.appendChild(mainContent);
                    
                    // Process nested content between this item and the next
                    if (endIndex - startIndex > 1) {
                        let currentSemanticType = null;
                        let currentSemanticGroup = [];
                        
                        for (let j = startIndex + 1; j < endIndex; j++) {
                            const element = sectionElements[j];
                            const semanticType = getSemanticType(element);
                            
                            if (semanticType) {
                                // If we have a previous semantic group, wrap it first
                                if (currentSemanticGroup.length > 0 && currentSemanticType) {
                                    const wrapper = createSemanticWrapper(currentSemanticType, currentSemanticGroup);
                                    if (wrapper) {
                                        li.appendChild(wrapper);
                                        semanticCounts[currentSemanticType]++;
                                    }
                                    currentSemanticGroup = [];
                                }
                                
                                // Start new semantic group
                                currentSemanticType = semanticType;
                                currentSemanticGroup = [element];
                                
                            } else if (currentSemanticType) {
                                // Continue adding to current semantic group
                                // Check if this is likely continuation content (e.g., italicized text after PHRASEOLOGY)
                                const isItalic = element.innerHTML.includes('<em>') || element.innerHTML.includes('<i>');
                                const isEmpty = element.textContent.trim() === '';
                                
                                if (isItalic || isEmpty || element.innerHTML.includes('</em>') || element.innerHTML.includes('</i>')) {
                                    currentSemanticGroup.push(element);
                                } else {
                                    // End current semantic group and start regular content
                                    if (currentSemanticGroup.length > 0) {
                                        const wrapper = createSemanticWrapper(currentSemanticType, currentSemanticGroup);
                                        if (wrapper) {
                                            li.appendChild(wrapper);
                                            semanticCounts[currentSemanticType]++;
                                        }
                                    }
                                    currentSemanticType = null;
                                    currentSemanticGroup = [];
                                    
                                    // Add as regular nested content
                                    const nestedDiv = document.createElement('div');
                                    nestedDiv.className = 'nested-paragraph';
                                    nestedDiv.innerHTML = element.innerHTML;
                                    li.appendChild(nestedDiv);
                                }
                            } else {
                                // Regular nested content (not part of semantic section)
                                const nestedDiv = document.createElement('div');
                                nestedDiv.className = 'nested-paragraph';
                                nestedDiv.innerHTML = element.innerHTML;
                                li.appendChild(nestedDiv);
                            }
                        }
                        
                        // Wrap any remaining semantic group
                        if (currentSemanticGroup.length > 0 && currentSemanticType) {
                            const wrapper = createSemanticWrapper(currentSemanticType, currentSemanticGroup);
                            if (wrapper) {
                                li.appendChild(wrapper);
                                semanticCounts[currentSemanticType]++;
                            }
                        }
                    }
                    
                    mainList.appendChild(li);
                }
                
                // Replace all the original elements with the new hierarchical list
                if (listItemIndices.length > 0) {
                    const firstElement = sectionElements[listItemIndices[0]];
                    firstElement.parentNode.insertBefore(mainList, firstElement);
                    
                    // Remove all processed elements
                    const lastIndex = listItemIndices[listItemIndices.length - 1];
                    const elementsToRemove = sectionElements.slice(
                        listItemIndices[0],
                        sectionElements.length
                    );
                    
                    elementsToRemove.forEach(el => {
                        if (el.parentNode) {
                            el.remove();
                        }
                    });
                    
                    totalSectionsProcessed++;
                }
            }
        });
        
        console.log(`Processed ${totalSectionsProcessed} sections`);
        console.log('Semantic sections created:', semanticCounts);
        
        return document.documentElement.outerHTML;
    });
    
    await browser.close();
    
    console.log('✅ Final hierarchical list creation complete');
    return transformedHtml;
}

async function convertWithFinalHierarchicalLists(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting with final hierarchical list structure: ${inputPath}\n`);
        
        // Enhanced style map
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
        
        // Transform to hierarchical lists
        const enhancedContent = await createFinalHierarchicalLists(result.value);
        
        // Create final HTML with comprehensive styling
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Document - Hierarchical Structure</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; 
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            color: #333;
            background: #fff;
        }
        
        .document-title { 
            color: #2c3e50; 
            font-size: 2.2em;
            font-weight: 700;
            border-bottom: 3px solid #3498db; 
            padding-bottom: 15px; 
            margin: 0 0 30px 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
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
        }
        
        .hierarchical-list > li {
            margin: 16px 0;
            line-height: 1.6;
        }
        
        .hierarchical-list > li::marker {
            font-weight: 600;
            color: #3498db;
        }
        
        /* Main list item content */
        .list-item-content {
            margin-bottom: 12px;
            text-align: justify;
        }
        
        /* Nested content within list items */
        .nested-paragraph {
            margin: 8px 0;
            padding-left: 0;
            text-align: justify;
        }
        
        /* Semantic section styling */
        .note-section {
            background: linear-gradient(to right, #fff9e6 0%, #fffbf0 100%);
            border-left: 4px solid #ffc107;
            padding: 12px 16px;
            margin: 12px 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .note-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #856404;
        }
        
        .phraseology-section {
            background: linear-gradient(to right, #e3f2fd 0%, #f1f8ff 100%);
            border-left: 4px solid #2196f3;
            padding: 12px 16px;
            margin: 12px 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .phraseology-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #0c5460;
        }
        
        .phraseology-section em {
            color: #004085;
            font-family: 'Courier New', monospace;
        }
        
        .reference-section {
            background: linear-gradient(to right, #f3e5f5 0%, #faf5fb 100%);
            border-left: 4px solid #9c27b0;
            padding: 12px 16px;
            margin: 12px 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .reference-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #4a148c;
        }
        
        .example-section {
            background: linear-gradient(to right, #e8f5e9 0%, #f1f9f1 100%);
            border-left: 4px solid #4caf50;
            padding: 12px 16px;
            margin: 12px 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .example-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #1b5e20;
        }
        
        .example-section em {
            color: #2e7d32;
            font-family: 'Courier New', monospace;
        }
        
        .exception-section {
            background: linear-gradient(to right, #ffebee 0%, #fff5f5 100%);
            border-left: 4px solid #f44336;
            padding: 12px 16px;
            margin: 12px 0;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .exception-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #b71c1c;
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
        
        /* Nested lists (if any) */
        .hierarchical-list ol, .hierarchical-list ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        /* Links */
        a {
            color: #3498db;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        /* Code/Technical text */
        .phraseology-section p,
        .example-section p {
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            font-size: 0.95em;
        }
        
        @media print {
            body { margin: 0; padding: 20px; }
            .document-title { page-break-after: avoid; }
            .hierarchical-list { page-break-inside: avoid; }
            .hierarchical-list > li { page-break-inside: avoid; }
            .note-section, .phraseology-section, 
            .reference-section, .example-section,
            .exception-section { 
                page-break-inside: avoid;
                box-shadow: none;
                background: white;
                border-left-width: 3px;
            }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .document-title { font-size: 1.8em; }
            .hierarchical-list { padding-left: 25px; }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            body {
                background: #1a1a1a;
                color: #e0e0e0;
            }
            .document-title, h1, h2, h3, h4, h5, h6 {
                color: #64b5f6;
            }
            .note-section {
                background: rgba(255, 193, 7, 0.1);
                border-left-color: #ffa000;
            }
            .phraseology-section {
                background: rgba(33, 150, 243, 0.1);
                border-left-color: #1976d2;
            }
            .reference-section {
                background: rgba(156, 39, 176, 0.1);
                border-left-color: #7b1fa2;
            }
            .example-section {
                background: rgba(76, 175, 80, 0.1);
                border-left-color: #388e3c;
            }
            .exception-section {
                background: rgba(244, 67, 54, 0.1);
                border-left-color: #c62828;
            }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Final hierarchical list conversion completed!`);
        console.log(`📄 Saved to: ${outputPath}`);
        
        if (result.messages && result.messages.length > 0) {
            console.log(`\n📋 Conversion messages (${result.messages.length}):`);
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
Final Hierarchical List Converter for Mammoth.js

USAGE:
  node final-hierarchical-converter.js <input.docx> [output.html]

FEATURES:
  ✅ Creates properly nested hierarchical lists
  ✅ All content between list items becomes children of the preceding item
  ✅ Semantic HTML5 elements for NOTE, PHRASEOLOGY, REFERENCE, EXAMPLE sections
  ✅ Maintains continuous a, b, c, d numbering throughout each section
  ✅ Professional document structure matching original Word format
  ✅ Dark mode support
  ✅ Print-optimized styles
  
SEMANTIC STRUCTURE:
  <ol class="hierarchical-list">
    <li>
      <div class="list-item-content">Main list item text</div>
      <aside role="note" class="note-section">
        <p><strong><em>NOTE—</em></strong></p>
        <p><em>Note content...</em></p>
      </aside>
      <div role="region" class="phraseology-section">
        <p><strong><em>PHRASEOLOGY—</em></strong></p>
        <p><em>Command text...</em></p>
      </div>
    </li>
    <li>Next list item with its nested content...</li>
  </ol>
  
EXAMPLE:
  node final-hierarchical-converter.js chapter_3_7110_65.docx final_output.html
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_final_hierarchical.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithFinalHierarchicalLists(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 Success! Document converted with proper hierarchical structure.');
            console.log('📋 Each list item now contains all its nested content as semantic children.');
            console.log('🎨 Professional styling with semantic HTML5 elements applied.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { convertWithFinalHierarchicalLists, createFinalHierarchicalLists };