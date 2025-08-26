#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const { chromium } = require('playwright');

/**
 * Continuous List Converter - Maintains sequential lettered numbering
 * 
 * Creates proper HTML ordered lists with continuous a, b, c, d numbering
 * even when interrupted by other elements like NOTE, PHRASEOLOGY, etc.
 */

async function createContinuousLists(htmlContent) {
    console.log('🔄 Creating continuous lettered lists...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate(() => {
        // Find all list-item paragraphs within each section
        const sections = document.querySelectorAll('h6.heading-8');
        let totalListsCreated = 0;
        
        sections.forEach(section => {
            const sectionTitle = section.textContent.trim();
            console.log(`Processing section: ${sectionTitle}`);
            
            // Find all elements between this section and the next
            const sectionElements = [];
            let currentElement = section.nextElementSibling;
            
            while (currentElement && 
                   !currentElement.classList?.contains('heading-8') &&
                   currentElement.tagName !== 'H6') {
                sectionElements.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }
            
            // Find all list-item paragraphs in this section
            const listItems = sectionElements.filter(el => 
                el.tagName === 'P' && el.classList.contains('list-item')
            );
            
            if (listItems.length >= 2) {
                console.log(`  Found ${listItems.length} list items in ${sectionTitle}`);
                
                // Create a container for the entire list structure
                const listContainer = document.createElement('div');
                listContainer.className = 'continuous-list-container';
                
                let currentListIndex = 0;
                let isInList = false;
                let currentOL = null;
                
                sectionElements.forEach((element, index) => {
                    if (element.tagName === 'P' && element.classList.contains('list-item')) {
                        // This is a list item
                        if (!isInList) {
                            // Start a new ordered list
                            currentOL = document.createElement('ol');
                            currentOL.className = 'continuous-list';
                            
                            // Set the starting number for this list segment
                            if (currentListIndex > 0) {
                                currentOL.start = currentListIndex + 1;
                            }
                            
                            listContainer.appendChild(currentOL);
                            isInList = true;
                        }
                        
                        // Create list item
                        const li = document.createElement('li');
                        li.innerHTML = element.innerHTML;
                        li.classList.remove('list-item');
                        currentOL.appendChild(li);
                        currentListIndex++;
                        
                        // Mark for removal
                        element.dataset.removeThis = 'true';
                        
                    } else if (isInList) {
                        // We're transitioning out of a list
                        isInList = false;
                        
                        // Add this non-list element to the container
                        const clone = element.cloneNode(true);
                        listContainer.appendChild(clone);
                        
                        // Mark original for removal
                        element.dataset.removeThis = 'true';
                        
                    } else if (currentListIndex > 0) {
                        // We're between list segments, include this element
                        const clone = element.cloneNode(true);
                        listContainer.appendChild(clone);
                        element.dataset.removeThis = 'true';
                    }
                });
                
                if (currentListIndex > 0) {
                    // Insert the container after the section heading
                    section.parentNode.insertBefore(listContainer, section.nextSibling);
                    totalListsCreated++;
                }
                
                // Remove original elements that were processed
                sectionElements.forEach(el => {
                    if (el.dataset.removeThis === 'true') {
                        el.parentNode?.removeChild(el);
                    }
                });
            }
        });
        
        console.log(`Created ${totalListsCreated} continuous list sections`);
        return document.documentElement.outerHTML;
    });
    
    await browser.close();
    
    console.log('✅ Continuous list creation complete');
    return transformedHtml;
}

async function convertWithContinuousLists(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting with continuous list numbering: ${inputPath}\n`);
        
        // Enhanced style map to preserve list items
        const styleMap = [
            "p[style-name='Title'] => h1.document-title:fresh",
            "p[style-name='Body Text'] => p.body-text",
            "p[style-name='BodyText'] => p.body-text",
            "p[style-name='heading 8'] => h6.heading-8",
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
        
        // Transform to continuous lists
        const enhancedContent = await createContinuousLists(result.value);
        
        // Create final HTML with proper CSS
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Continuous List Document</title>
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
        
        .table-paragraph { 
            margin: 8px 0; 
            font-size: 0.95em;
        }
        
        .heading-8 { 
            font-size: 0.9em; 
            font-weight: 600; 
            color: #7f8c8d; 
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Continuous list container */
        .continuous-list-container {
            margin: 16px 0;
        }
        
        /* Ordered lists with letter numbering */
        .continuous-list {
            list-style-type: lower-alpha;
            padding-left: 24px;
            margin: 0;
            counter-reset: none; /* Don't reset counters */
        }
        
        .continuous-list li {
            margin: 12px 0;
            line-height: 1.6;
            text-align: justify;
            padding-left: 8px;
        }
        
        .continuous-list li::marker {
            font-weight: 600;
            color: #3498db;
        }
        
        /* Spacing between list segments */
        .continuous-list + .continuous-list {
            margin-top: 16px;
        }
        
        /* Elements between list items */
        .continuous-list-container > p:not(.list-item) {
            margin: 16px 0;
            padding-left: 0;
        }
        
        .continuous-list-container > p > strong > em {
            font-weight: 600;
            color: #7f8c8d;
        }
        
        /* Fallback for any remaining list-item paragraphs */
        .list-item {
            margin: 12px 0 12px 24px;
            position: relative;
            text-align: justify;
        }
        
        .list-item::before {
            content: "•";
            color: #3498db;
            font-weight: 600;
            position: absolute;
            left: -16px;
        }
        
        strong { 
            font-weight: 600; 
        }
        
        em { 
            font-style: italic; 
        }
        
        p { 
            margin: 12px 0;
        }
        
        /* Special emphasis for technical sections */
        p:has(strong:contains("PHRASEOLOGY")),
        p:has(strong:contains("NOTE")),
        p:has(strong:contains("REFERENCE")),
        p:has(strong:contains("EXAMPLE")) {
            margin-top: 20px;
            font-weight: 500;
        }
        
        @media print {
            body { margin: 0; padding: 20px; }
            .document-title { page-break-after: avoid; }
            .continuous-list li { page-break-inside: avoid; }
            .continuous-list-container { page-break-inside: avoid; }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .document-title { font-size: 1.8em; }
            .continuous-list { padding-left: 20px; }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Continuous list conversion completed!`);
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
Continuous List Converter for Mammoth.js

USAGE:
  node continuous-list-converter.js <input.docx> [output.html]

FEATURES:
  • Creates continuous lettered lists (a, b, c, d, ...)
  • Maintains sequential numbering across interrupting elements
  • Handles NOTE, PHRASEOLOGY, EXAMPLE sections between list items
  • Professional HTML output with proper structure
  
EXAMPLE:
  node continuous-list-converter.js chapter_3_7110_65.docx continuous_output.html
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_continuous.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithContinuousLists(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 Done! Lists should now have continuous a, b, c, d numbering.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { convertWithContinuousLists };