#!/usr/bin/env node

const { chromium } = require('playwright');
const mammoth = require('./lib/index');
const fs = require('fs');
const path = require('path');

// Enhanced style map with specific list handling
const ENHANCED_STYLE_MAP = [
    // Title and heading styles
    "p[style-name='Title'] => h1.document-title:fresh",
    "p[style-name='Body Text'] => p.body-text",
    "p[style-name='heading 8'] => h6.heading-8",
    "p[style-name='Table Paragraph'] => p.table-paragraph",
    
    // List styles with letter formatting
    "p[style-name='List Paragraph'] => p.list-item",
    "p[style-name='ListParagraph'] => p.list-item",
    
    // Numbered list styles
    "p[style-name='Numbered List'] => li.numbered-list",
    "p[style-name='NumberedList'] => li.numbered-list",
    
    // Character styles for emphasis
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em"
];

async function analyzeListStructure(htmlContent) {
    console.log('🔍 Analyzing HTML list structure...\n');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Load the HTML content
    await page.setContent(htmlContent);
    
    // Analyze list elements
    const lists = await page.evaluate(() => {
        const results = {
            orderedLists: [],
            unorderedLists: [],
            listItems: [],
            paragraphsWithNumbers: []
        };
        
        // Find ordered lists
        document.querySelectorAll('ol').forEach((ol, index) => {
            const items = Array.from(ol.querySelectorAll('li')).map(li => ({
                text: li.textContent.trim().substring(0, 100) + '...',
                hasNestedList: li.querySelector('ol, ul') !== null
            }));
            results.orderedLists.push({
                index,
                itemCount: items.length,
                items
            });
        });
        
        // Find unordered lists
        document.querySelectorAll('ul').forEach((ul, index) => {
            const items = Array.from(ul.querySelectorAll('li')).map(li => ({
                text: li.textContent.trim().substring(0, 100) + '...'
            }));
            results.unorderedLists.push({
                index,
                itemCount: items.length,
                items
            });
        });
        
        // Find all list items
        document.querySelectorAll('li').forEach((li, index) => {
            results.listItems.push({
                index,
                text: li.textContent.trim().substring(0, 100) + '...',
                parentTag: li.parentElement.tagName.toLowerCase()
            });
        });
        
        // Find paragraphs that might be list items (starting with a., b., c., etc.)
        document.querySelectorAll('p').forEach((p, index) => {
            const text = p.textContent.trim();
            if (/^[a-z]\.\s/.test(text) || /^\d+\.\s/.test(text)) {
                results.paragraphsWithNumbers.push({
                    index,
                    text: text.substring(0, 100) + '...',
                    startsWithLetter: /^[a-z]\.\s/.test(text)
                });
            }
        });
        
        return results;
    });
    
    // Report findings
    console.log('📊 LIST STRUCTURE ANALYSIS:');
    console.log(`   Ordered lists (ol): ${lists.orderedLists.length}`);
    console.log(`   Unordered lists (ul): ${lists.unorderedLists.length}`);
    console.log(`   Total list items (li): ${lists.listItems.length}`);
    console.log(`   Paragraphs with numbering: ${lists.paragraphsWithNumbers.length}\n`);
    
    if (lists.orderedLists.length > 0) {
        console.log('🔢 ORDERED LISTS FOUND:');
        lists.orderedLists.forEach((list, i) => {
            console.log(`   List ${i + 1}: ${list.itemCount} items`);
            list.items.forEach((item, j) => {
                console.log(`     ${j + 1}. ${item.text}`);
            });
        });
        console.log('');
    }
    
    if (lists.paragraphsWithNumbers.length > 0) {
        console.log('📝 PARAGRAPHS WITH NUMBERING:');
        lists.paragraphsWithNumbers.forEach((p, i) => {
            const indicator = p.startsWithLetter ? '📝' : '🔢';
            console.log(`   ${indicator} ${p.text}`);
        });
        console.log('');
    }
    
    await browser.close();
    return lists;
}

async function convertAndAnalyze(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting and analyzing: ${path.basename(inputPath)}\n`);
        
        // Convert document
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: ENHANCED_STYLE_MAP,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false
        });
        
        // Enhanced CSS for better list rendering
        const enhancedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>List Analysis Test</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            color: #333;
        }
        
        .document-title { 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 15px; 
            margin-bottom: 30px;
            font-size: 2em;
        }
        
        ol { 
            padding-left: 20px; 
            margin: 16px 0;
            list-style-type: lower-alpha; /* Use letters instead of numbers */
        }
        
        ol.numbered { 
            list-style-type: decimal; 
        }
        
        ul { 
            padding-left: 20px; 
            margin: 16px 0;
        }
        
        li { 
            margin: 8px 0; 
            line-height: 1.5;
        }
        
        .list-item {
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
        }
        
        p { margin: 12px 0; }
        strong { font-weight: 600; }
        em { font-style: italic; }
        
        /* Highlight potential list items for analysis */
        .potential-list-item {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding-left: 15px;
            margin: 8px 0;
        }
    </style>
</head>
<body>
${result.value}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, enhancedHtml);
        console.log(`✅ HTML saved to: ${outputPath}`);
        
        // Analyze the generated HTML
        const analysis = await analyzeListStructure(enhancedHtml);
        
        // Report conversion issues
        if (result.messages && result.messages.length > 0) {
            console.log('⚠️  CONVERSION MESSAGES:');
            result.messages.forEach(msg => {
                console.log(`   • ${msg.message}`);
            });
            console.log('');
        }
        
        return { result, analysis, html: enhancedHtml };
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}

async function testListConversion() {
    const inputFile = 'docx/chapter_3_7110_65.docx';
    const outputFile = 'docx/list-analysis.html';
    
    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${inputFile}`);
        console.log('Please ensure the Word document is in the docx/ directory');
        process.exit(1);
    }
    
    try {
        const results = await convertAndAnalyze(inputFile, outputFile);
        
        console.log('🎯 ANALYSIS COMPLETE!');
        console.log(`📁 View results in: ${outputFile}`);
        console.log('\n💡 RECOMMENDATIONS:');
        
        if (results.analysis.paragraphsWithNumbers.length > 0) {
            console.log('   • Found paragraphs with letter/number formatting that should be lists');
            console.log('   • Need custom conversion to preserve original numbering scheme');
        }
        
        if (results.analysis.orderedLists.length === 0) {
            console.log('   • No proper ordered lists found in conversion');
            console.log('   • Lists may be converted to paragraphs - need enhanced parsing');
        }
        
        console.log('\n🔧 Next steps: Implement custom list parser for letter-based numbering');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    console.log('🧪 MAMMOTH.JS LIST CONVERSION TESTER\n');
    
    // Check if Playwright is installed
    try {
        require('playwright');
    } catch (e) {
        console.error('❌ Playwright not found. Install with: npm install playwright');
        process.exit(1);
    }
    
    testListConversion();
}

module.exports = { analyzeListStructure, convertAndAnalyze };