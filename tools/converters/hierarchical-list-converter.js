#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const { chromium } = require('playwright');

/**
 * Hierarchical List Converter - Creates properly nested lists with semantic elements
 * 
 * This converter ensures that all content between list items is nested as children
 * of the preceding list item, maintaining continuous numbering and proper document hierarchy.
 */

async function createHierarchicalLists(htmlContent) {
    console.log('🔄 Creating hierarchical nested lists with semantic elements...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate(() => {
        // Helper function to identify semantic element type
        function getSemanticType(element) {
            const text = element.textContent.trim();
            const innerHTML = element.innerHTML;
            
            // Check for NOTE, PHRASEOLOGY, etc. in various formats
            // They appear as <strong><em>NOTE−</em></strong> or similar patterns
            if (innerHTML.includes('<strong>') || innerHTML.includes('<em>')) {
                // Check the text content after stripping HTML
                const upperText = text.toUpperCase();
                
                if (upperText.startsWith('NOTE') || 
                    upperText === 'NOTE−' || 
                    upperText === 'NOTE—' ||
                    upperText === 'NOTE:') {
                    return 'note';
                } else if (upperText.startsWith('PHRASEOLOGY') || 
                           upperText === 'PHRASEOLOGY−' ||
                           upperText === 'PHRASEOLOGY—' ||
                           upperText === 'PHRASEOLOGY:') {
                    return 'phraseology';
                } else if (upperText.startsWith('REFERENCE') || 
                           upperText === 'REFERENCE−' ||
                           upperText === 'REFERENCE—' ||
                           upperText === 'REFERENCE:') {
                    return 'reference';
                } else if (upperText.startsWith('EXAMPLE') || 
                           upperText === 'EXAMPLE−' ||
                           upperText === 'EXAMPLE—' ||
                           upperText === 'EXAMPLE:') {
                    return 'example';
                } else if (upperText.startsWith('EXCEPTION') || 
                           upperText === 'EXCEPTION.' ||
                           upperText === 'EXCEPTION:') {
                    return 'exception';
                }
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
                    wrapper = document.createElement('div');
                    wrapper.className = 'nested-content';
            }
            
            elements.forEach(el => {
                wrapper.appendChild(el.cloneNode(true));
            });
            
            return wrapper;
        }
        
        // Process each section
        const sections = document.querySelectorAll('h6.heading-8');
        let totalSectionsProcessed = 0;
        
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
            
            if (listItemIndices.length >= 2) {
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
                        const nestedElements = [];
                        let currentSemanticType = null;
                        let currentSemanticGroup = [];
                        
                        for (let j = startIndex + 1; j < endIndex; j++) {
                            const element = sectionElements[j];
                            const semanticType = getSemanticType(element);
                            
                            if (semanticType) {
                                // If we were collecting a previous semantic group, wrap it
                                if (currentSemanticGroup.length > 0) {
                                    li.appendChild(createSemanticWrapper(currentSemanticType, currentSemanticGroup));
                                    currentSemanticGroup = [];
                                }
                                
                                // Start a new semantic group
                                currentSemanticType = semanticType;
                                currentSemanticGroup = [element];
                                
                            } else if (currentSemanticType) {
                                // Continue adding to current semantic group
                                currentSemanticGroup.push(element);
                                
                            } else {
                                // Regular nested content
                                const nestedDiv = document.createElement('div');
                                nestedDiv.className = 'nested-paragraph';
                                nestedDiv.innerHTML = element.innerHTML;
                                li.appendChild(nestedDiv);
                            }
                        }
                        
                        // Wrap any remaining semantic group
                        if (currentSemanticGroup.length > 0) {
                            li.appendChild(createSemanticWrapper(currentSemanticType, currentSemanticGroup));
                        }
                    }
                    
                    mainList.appendChild(li);
                }
                
                // Replace all the original elements with the new hierarchical list
                const firstElement = sectionElements[listItemIndices[0]];
                firstElement.parentNode.insertBefore(mainList, firstElement);
                
                // Remove all processed elements
                for (let i = listItemIndices[0]; i < sectionElements.length; i++) {
                    if (sectionElements[i].parentNode) {
                        sectionElements[i].remove();
                    }
                }
                
                totalSectionsProcessed++;
            }
        });
        
        console.log(`Processed ${totalSectionsProcessed} sections with hierarchical lists`);
        return document.documentElement.outerHTML;
    });
    
    await browser.close();
    
    console.log('✅ Hierarchical list creation complete');
    return transformedHtml;
}

async function convertWithHierarchicalLists(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting with hierarchical list structure: ${inputPath}\n`);
        
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
        const enhancedContent = await createHierarchicalLists(result.value);
        
        // Create final HTML with comprehensive styling
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hierarchical Document Structure</title>
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
            counter-reset: list-item;
        }
        
        .hierarchical-list > li {
            margin: 16px 0;
            line-height: 1.6;
            counter-increment: list-item;
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
            padding-left: 20px;
            text-align: justify;
        }
        
        /* Semantic section styling */
        .note-section {
            background: #f8f9fa;
            border-left: 4px solid #ffc107;
            padding: 12px 16px;
            margin: 12px 0 12px 20px;
            border-radius: 4px;
        }
        
        .note-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
        }
        
        .phraseology-section {
            background: #e8f4f8;
            border-left: 4px solid #17a2b8;
            padding: 12px 16px;
            margin: 12px 0 12px 20px;
            border-radius: 4px;
        }
        
        .phraseology-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #0c5460;
        }
        
        .reference-section {
            background: #f3e5f5;
            border-left: 4px solid #9c27b0;
            padding: 12px 16px;
            margin: 12px 0 12px 20px;
            border-radius: 4px;
        }
        
        .reference-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #4a148c;
        }
        
        .example-section {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 12px 16px;
            margin: 12px 0 12px 20px;
            border-radius: 4px;
        }
        
        .example-section > p:first-child {
            margin-top: 0;
            font-weight: 600;
            color: #1b5e20;
        }
        
        .exception-section {
            background: #ffebee;
            border-left: 4px solid #f44336;
            padding: 12px 16px;
            margin: 12px 0 12px 20px;
            border-radius: 4px;
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
        
        @media print {
            body { margin: 0; padding: 20px; }
            .document-title { page-break-after: avoid; }
            .hierarchical-list { page-break-inside: avoid; }
            .hierarchical-list > li { page-break-inside: avoid; }
            .note-section, .phraseology-section, 
            .reference-section, .example-section { 
                page-break-inside: avoid; 
            }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .document-title { font-size: 1.8em; }
            .hierarchical-list { padding-left: 25px; }
            .nested-paragraph { padding-left: 15px; }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Hierarchical list conversion completed!`);
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
Hierarchical List Converter for Mammoth.js

USAGE:
  node hierarchical-list-converter.js <input.docx> [output.html]

FEATURES:
  • Creates properly nested hierarchical lists
  • All content between list items becomes children of the preceding item
  • Semantic HTML elements for NOTE, PHRASEOLOGY, REFERENCE, EXAMPLE sections
  • Maintains continuous a, b, c, d numbering throughout each section
  • Professional document structure matching original Word format
  
STRUCTURE EXAMPLE:
  <ol>
    <li>
      <div>List item content</div>
      <aside role="note" class="note-section">
        <p>NOTE—</p>
        <p>Note content...</p>
      </aside>
      <div role="region" class="phraseology-section">
        <p>PHRASEOLOGY—</p>
        <p>Phraseology content...</p>
      </div>
    </li>
    <li>Next list item...</li>
  </ol>
  
EXAMPLE:
  node hierarchical-list-converter.js chapter_3_7110_65.docx hierarchical_output.html
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_hierarchical.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithHierarchicalLists(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 Success! Document converted with proper hierarchical structure.');
            console.log('📋 Each list item now contains all its nested content as children.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { convertWithHierarchicalLists, createHierarchicalLists };