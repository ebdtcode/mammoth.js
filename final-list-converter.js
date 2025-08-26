#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const { chromium } = require('playwright');

/**
 * Final List Converter - Fixes list structure based on actual Word document patterns
 * 
 * Converts paragraphs with class="list-item" to proper HTML ordered lists
 * and adds appropriate lettered numbering styling.
 */

async function convertListItemsToLists(htmlContent) {
    console.log('🔄 Converting list-item paragraphs to proper HTML lists...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    // Use Playwright to analyze and transform the HTML
    const transformedHtml = await page.evaluate(() => {
        // Find all consecutive p.list-item elements and group them
        const listItems = Array.from(document.querySelectorAll('p.list-item'));
        const processedItems = new Set();
        let listsCreated = 0;
        
        listItems.forEach(item => {
            if (processedItems.has(item)) return;
            
            // Find consecutive list items
            const group = [item];
            let nextElement = item.nextElementSibling;
            
            while (nextElement) {
                // Skip non-paragraph elements (like strong, em within the list)
                if (nextElement.tagName === 'P' && 
                    (nextElement.classList.contains('list-item') || 
                     nextElement.tagName === 'STRONG' ||
                     nextElement.tagName === 'EM')) {
                    
                    if (nextElement.classList.contains('list-item')) {
                        group.push(nextElement);
                    }
                    nextElement = nextElement.nextElementSibling;
                } else if (nextElement.tagName === 'P' && 
                          (nextElement.innerHTML.trim().startsWith('<strong><em>') ||
                           nextElement.innerHTML.trim().startsWith('<em>') ||
                           nextElement.innerHTML.trim() === '')) {
                    // Skip formatting paragraphs between list items
                    nextElement = nextElement.nextElementSibling;
                } else {
                    break;
                }
            }
            
            // Only convert groups of 2 or more items
            if (group.length >= 2) {
                console.log(`Creating list with ${group.length} items`);
                
                // Create the ordered list
                const ol = document.createElement('ol');
                ol.className = 'converted-list';
                ol.style.listStyleType = 'lower-alpha';
                
                group.forEach((listItem, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = listItem.innerHTML;
                    
                    // Remove list-item class since it's now a proper li
                    li.classList.remove('list-item');
                    
                    ol.appendChild(li);
                    processedItems.add(listItem);
                });
                
                // Replace the first item with the list
                group[0].parentNode.replaceChild(ol, group[0]);
                
                // Remove the other items
                for (let i = 1; i < group.length; i++) {
                    if (group[i].parentNode) {
                        group[i].parentNode.removeChild(group[i]);
                    }
                }
                
                listsCreated++;
            }
        });
        
        console.log(`Created ${listsCreated} ordered lists`);
        return document.documentElement.outerHTML;
    });
    
    await browser.close();
    
    console.log('✅ List structure conversion complete');
    return transformedHtml;
}

async function convertWithProperLists(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting with proper list structure: ${inputPath}\n`);
        
        // Enhanced style map
        const styleMap = [
            "p[style-name='Title'] => h1.document-title:fresh",
            "p[style-name='Body Text'] => p.body-text",
            "p[style-name='BodyText'] => p.body-text",
            "p[style-name='heading 8'] => h6.heading-8",
            "p[style-name='Table Paragraph'] => p.table-paragraph",
            
            // This is the key - preserve list items as a special class
            "p[style-name='List Paragraph'] => p.list-item",
            
            // Character styles
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
        ];
        
        // Convert document with mammoth
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: styleMap,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false
        });
        
        console.log(`📄 Initial HTML conversion complete`);
        console.log(`   Found ${(result.value.match(/class="list-item"/g) || []).length} list items`);
        
        // Post-process with Playwright to fix list structure
        const enhancedContent = await convertListItemsToLists(result.value);
        
        // Create final HTML with enhanced styling
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Properly Structured Document</title>
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
        
        /* Proper list styling */
        ol.converted-list {
            padding-left: 24px; 
            margin: 16px 0;
            list-style-type: lower-alpha;
        }
        
        ol.converted-list li { 
            margin: 12px 0; 
            line-height: 1.6;
            text-align: justify;
            padding-left: 8px;
        }
        
        ol.converted-list li::marker {
            font-weight: 600;
            color: #3498db;
        }
        
        /* Fallback styling for remaining list-item paragraphs */
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
        
        /* Special formatting for technical terms */
        strong { 
            font-weight: 600; 
            color: #2c3e50;
        }
        
        em { 
            font-style: italic; 
        }
        
        /* Special handling for NOTE, REFERENCE, PHRASEOLOGY sections */
        p:has(strong:contains("NOTE")), 
        p:has(strong:contains("REFERENCE")), 
        p:has(strong:contains("PHRASEOLOGY")),
        p:has(strong:contains("EXAMPLE")) {
            margin-top: 20px;
        }
        
        p { 
            margin: 12px 0;
        }
        
        @media print {
            body { margin: 0; padding: 20px; }
            .document-title { page-break-after: avoid; }
            ol.converted-list li { page-break-inside: avoid; }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .document-title { font-size: 1.8em; }
            ol.converted-list { padding-left: 20px; }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Conversion with proper lists completed!`);
        console.log(`📄 Saved to: ${outputPath}`);
        
        // Report conversion messages
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
Final List Converter for Mammoth.js

USAGE:
  node final-list-converter.js <input.docx> [output.html]

FEATURES:
  • Converts paragraph-based lists to proper HTML ordered lists
  • Uses Playwright to analyze and transform list structure
  • Preserves lettered numbering (a., b., c., d.)
  • Enhanced styling for professional documents
  
EXAMPLE:
  node final-list-converter.js chapter_3_7110_65.docx final_output.html
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_final.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithProperLists(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 Done! The document should now have proper list structure.');
            console.log('🔍 Run the verification script to confirm the conversion.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { convertWithProperLists };