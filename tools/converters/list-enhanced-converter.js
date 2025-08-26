#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced List Converter for Mammoth.js
 * 
 * Specifically handles Word documents with lettered lists (a., b., c., d.)
 * and converts them to proper HTML ordered lists with appropriate styling.
 */

// Post-processing function to convert paragraph-based lists to HTML lists
function enhanceListStructure(htmlContent) {
    console.log('🔄 Post-processing HTML to fix list structures...');
    
    // Patterns to match different list types
    const patterns = {
        letterList: /^([a-z])\.\s+(.+)$/gm,           // a. Item text
        numberList: /^(\d+)\.\s+(.+)$/gm,              // 1. Item text
        romanList: /^([ivx]+)\.\s+(.+)$/gim,           // i. Item text
        upperLetterList: /^([A-Z])\.\s+(.+)$/gm        // A. Item text
    };
    
    let processedHtml = htmlContent;
    let listCounter = 0;
    
    // Function to convert pattern matches to HTML lists
    function convertToList(html, pattern, listType, cssClass) {
        const matches = [];
        let match;
        
        // Reset regex lastIndex to ensure we start from beginning
        pattern.lastIndex = 0;
        
        // Find all paragraph elements that match the pattern
        const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gs;
        let paragraphMatch;
        const paragraphsToReplace = [];
        
        while ((paragraphMatch = paragraphRegex.exec(html)) !== null) {
            const fullParagraph = paragraphMatch[0];
            const paragraphContent = paragraphMatch[1].trim();
            
            // Test if this paragraph matches our list pattern
            pattern.lastIndex = 0;
            const listMatch = pattern.exec(paragraphContent);
            
            if (listMatch) {
                const marker = listMatch[1];
                const content = listMatch[2];
                
                matches.push({
                    fullParagraph,
                    marker,
                    content,
                    index: paragraphMatch.index
                });
            }
        }
        
        if (matches.length === 0) return html;
        
        console.log(`  Found ${matches.length} ${listType} list items`);
        
        // Group consecutive list items
        const listGroups = [];
        let currentGroup = [];
        
        matches.forEach((match, i) => {
            if (currentGroup.length === 0) {
                currentGroup.push(match);
            } else {
                // Check if this continues the sequence
                const prevMarker = currentGroup[currentGroup.length - 1].marker;
                const currentMarker = match.marker;
                
                const isConsecutive = isSequentialMarker(prevMarker, currentMarker, listType);
                
                if (isConsecutive) {
                    currentGroup.push(match);
                } else {
                    // Start new group
                    if (currentGroup.length > 1) {
                        listGroups.push([...currentGroup]);
                    }
                    currentGroup = [match];
                }
            }
        });
        
        // Don't forget the last group
        if (currentGroup.length > 1) {
            listGroups.push(currentGroup);
        }
        
        // Convert each group to an HTML list
        listGroups.forEach(group => {
            const listItems = group.map(item => 
                `    <li>${item.content}</li>`
            ).join('\n');
            
            let listHtml;
            if (listType === 'letter' || listType === 'upperLetter') {
                listHtml = `<ol class="list-${cssClass}" style="list-style-type: lower-alpha;">\n${listItems}\n</ol>`;
            } else if (listType === 'roman') {
                listHtml = `<ol class="list-${cssClass}" style="list-style-type: lower-roman;">\n${listItems}\n</ol>`;
            } else {
                listHtml = `<ol class="list-${cssClass}">\n${listItems}\n</ol>`;
            }
            
            // Replace the first paragraph with the list
            html = html.replace(group[0].fullParagraph, listHtml);
            
            // Remove subsequent paragraphs in the group
            for (let i = 1; i < group.length; i++) {
                html = html.replace(group[i].fullParagraph, '');
            }
        });
        
        return html;
    }
    
    // Helper function to check if markers are sequential
    function isSequentialMarker(prev, current, listType) {
        if (listType === 'letter') {
            return current.charCodeAt(0) === prev.charCodeAt(0) + 1;
        } else if (listType === 'upperLetter') {
            return current.charCodeAt(0) === prev.charCodeAt(0) + 1;
        } else if (listType === 'number') {
            return parseInt(current) === parseInt(prev) + 1;
        } else if (listType === 'roman') {
            const romanValues = { 'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10 };
            return romanValues[current.toLowerCase()] === (romanValues[prev.toLowerCase()] || 0) + 1;
        }
        return false;
    }
    
    // Apply conversions in order of specificity
    processedHtml = convertToList(processedHtml, patterns.letterList, 'letter', 'letters');
    processedHtml = convertToList(processedHtml, patterns.upperLetterList, 'upperLetter', 'upper-letters');
    processedHtml = convertToList(processedHtml, patterns.romanList, 'roman', 'roman');
    processedHtml = convertToList(processedHtml, patterns.numberList, 'number', 'numbers');
    
    console.log('✅ List structure enhancement complete');
    return processedHtml;
}

async function convertWithEnhancedLists(inputPath, outputPath) {
    try {
        console.log(`🚀 Converting with enhanced list processing: ${path.basename(inputPath)}\n`);
        
        // Enhanced style map
        const styleMap = [
            "p[style-name='Title'] => h1.document-title:fresh",
            "p[style-name='Body Text'] => p.body-text",
            "p[style-name='BodyText'] => p.body-text",
            "p[style-name='heading 8'] => h6.heading-8",
            "p[style-name='Table Paragraph'] => p.table-paragraph",
            "p[style-name='List Paragraph'] => p.list-item",
            
            // Character styles for formatting
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
        ];
        
        // Convert document
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: styleMap,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false
        });
        
        // Post-process to enhance list structures
        const enhancedContent = enhanceListStructure(result.value);
        
        // Create final HTML with enhanced styling
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced List Document</title>
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
        
        /* Enhanced list styling */
        ol, ul { 
            padding-left: 24px; 
            margin: 16px 0;
        }
        
        .list-letters {
            list-style-type: lower-alpha;
        }
        
        .list-upper-letters {
            list-style-type: upper-alpha;
        }
        
        .list-roman {
            list-style-type: lower-roman;
        }
        
        .list-numbers {
            list-style-type: decimal;
        }
        
        li { 
            margin: 8px 0; 
            line-height: 1.6;
            text-align: justify;
        }
        
        li::marker {
            font-weight: 600;
            color: #3498db;
        }
        
        .list-item {
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
        }
        
        /* Special formatting for NOTE, REFERENCE, PHRASEOLOGY */
        p:contains("NOTE—"), p:contains("REFERENCE—"), p:contains("PHRASEOLOGY—") {
            font-style: italic;
            font-weight: 600;
        }
        
        strong { 
            font-weight: 600; 
            color: #2c3e50;
        }
        
        em { 
            font-style: italic; 
            color: #7f8c8d;
        }
        
        p { 
            margin: 12px 0;
            text-align: justify;
        }
        
        @media print {
            body { margin: 0; padding: 20px; }
            .document-title { page-break-after: avoid; }
            li { page-break-inside: avoid; }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .document-title { font-size: 1.8em; }
            ol, ul { padding-left: 20px; }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Enhanced conversion completed!`);
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
        
        return { result, enhancedHtml: finalHtml };
        
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
Enhanced List Converter for Mammoth.js

USAGE:
  node list-enhanced-converter.js <input.docx> [output.html]

FEATURES:
  • Converts lettered lists (a., b., c.) to proper HTML ordered lists
  • Preserves original numbering schemes (letters, numbers, roman numerals)
  • Enhanced styling for professional document presentation
  • Post-processing to fix list structure issues
  
EXAMPLE:
  node list-enhanced-converter.js chapter_3_7110_65.docx enhanced_output.html
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_enhanced.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithEnhancedLists(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 Done! Check the enhanced output.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { convertWithEnhancedLists, enhanceListStructure };