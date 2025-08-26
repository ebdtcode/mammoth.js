#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const { chromium } = require('playwright');

/**
 * Perfect List Converter - Creates properly grouped lists with continuous numbering
 * 
 * This version properly groups consecutive list items into single ordered lists
 * and maintains continuous lettered numbering (a, b, c, d...) within each section.
 */

async function createPerfectLists(htmlContent) {
    console.log('🔄 Creating perfectly structured continuous lists...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate(() => {
        // Process each section individually
        const sections = document.querySelectorAll('h6.heading-8');
        let totalSectionsProcessed = 0;
        
        sections.forEach((section, sectionIndex) => {
            const sectionTitle = section.textContent.trim();
            
            // Get all elements after this section heading until the next section
            const sectionElements = [];
            let currentElement = section.nextElementSibling;
            
            while (currentElement && 
                   !currentElement.matches('h6.heading-8') &&
                   currentElement.tagName !== 'H6') {
                sectionElements.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }
            
            // Find all list items in this section
            const listItems = sectionElements.filter(el => 
                el.tagName === 'P' && el.classList.contains('list-item')
            );
            
            if (listItems.length >= 2) {
                console.log(`Section "${sectionTitle}": Found ${listItems.length} list items`);
                
                // Create a single ordered list for all items in this section
                const mainList = document.createElement('ol');
                mainList.className = 'section-list';
                mainList.style.listStyleType = 'lower-alpha';
                
                // Process each element in order, but group list items together
                let insertionPoint = section.nextSibling;
                let hasInsertedList = false;
                
                sectionElements.forEach(element => {
                    if (element.tagName === 'P' && element.classList.contains('list-item')) {
                        // This is a list item - convert to <li>
                        const li = document.createElement('li');
                        li.innerHTML = element.innerHTML;
                        li.classList.remove('list-item');
                        mainList.appendChild(li);
                        
                        // Insert the list after the first list item if we haven't already
                        if (!hasInsertedList) {
                            element.parentNode.insertBefore(mainList, element);
                            hasInsertedList = true;
                        }
                        
                        // Remove the original paragraph
                        element.remove();
                        
                    } else {
                        // This is not a list item, keep it as is
                        // It will stay in its original position
                    }
                });
                
                totalSectionsProcessed++;
            }
        });
        
        console.log(`Processed ${totalSectionsProcessed} sections with lists`);
        return document.documentElement.outerHTML;
    });
    
    await browser.close();
    
    console.log('✅ Perfect list structure creation complete');
    return transformedHtml;
}

async function convertWithPerfectLists(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting with perfect list structure: ${inputPath}\n`);
        
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
        
        // Transform to perfect lists
        const enhancedContent = await createPerfectLists(result.value);
        
        // Create final HTML with perfect styling
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perfect List Structure Document</title>
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
        
        /* Perfect section lists with continuous lettered numbering */
        .section-list {
            list-style-type: lower-alpha;
            padding-left: 30px;
            margin: 16px 0;
            counter-reset: none; /* Maintain continuous numbering */
        }
        
        .section-list li {
            margin: 12px 0;
            line-height: 1.6;
            text-align: justify;
            padding-left: 8px;
        }
        
        .section-list li::marker {
            font-weight: 600;
            color: #3498db;
            font-size: 0.95em;
        }
        
        /* Spacing for elements between list items */
        .section-list + p:not(.list-item) {
            margin: 16px 0;
        }
        
        /* Fallback for any remaining list-item paragraphs */
        .list-item {
            margin: 12px 0 12px 30px;
            position: relative;
            text-align: justify;
        }
        
        .list-item::before {
            content: "•";
            color: #3498db;
            font-weight: 600;
            position: absolute;
            left: -20px;
        }
        
        /* Typography enhancements */
        strong { 
            font-weight: 600; 
            color: #2c3e50;
        }
        
        em { 
            font-style: italic; 
        }
        
        p { 
            margin: 12px 0;
            text-align: justify;
        }
        
        /* Special styling for technical document sections */
        p:has(strong:contains("PHRASEOLOGY")),
        p:has(strong:contains("NOTE")),
        p:has(strong:contains("REFERENCE")),
        p:has(strong:contains("EXAMPLE")) {
            margin-top: 18px;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        /* Links styling */
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
            .section-list { page-break-inside: avoid; }
            .section-list li { page-break-inside: avoid; }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .document-title { font-size: 1.8em; }
            .section-list { padding-left: 25px; }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Perfect list conversion completed!`);
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
Perfect List Converter for Mammoth.js

USAGE:
  node perfect-list-converter.js <input.docx> [output.html]

FEATURES:
  • Creates single ordered list per section with continuous a, b, c, d numbering
  • Groups consecutive list items properly
  • Maintains intervening elements (NOTE, PHRASEOLOGY, etc.) in correct positions
  • Professional document structure matching original Word format
  
EXAMPLE:
  node perfect-list-converter.js chapter_3_7110_65.docx perfect_output.html
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_perfect.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithPerfectLists(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 Done! Each section should now have a single ordered list with continuous a, b, c, d numbering.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { convertWithPerfectLists };