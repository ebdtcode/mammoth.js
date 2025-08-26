#!/usr/bin/env node

/**
 * Clean Mammoth.js Converter
 * 
 * A wrapper around mammoth.js that eliminates common warnings
 * and provides enhanced styling for Word document conversion.
 * 
 * Usage: node mammoth-clean.js <input.docx> [output.html]
 */

const mammoth = require('./lib/index');
const fs = require('fs');
const path = require('path');

// Default style mappings for common Word styles
const DEFAULT_STYLE_MAP = [
    // Title styles
    "p[style-name='Title'] => h1.document-title:fresh",
    "p[style-name='title'] => h1.document-title:fresh",
    
    // Body text variations
    "p[style-name='Body Text'] => p.body-text",
    "p[style-name='BodyText'] => p.body-text",
    "p[style-name='body text'] => p.body-text",
    
    // Heading levels (including level 8)
    "p[style-name='heading 8'] => h6.heading-8",
    "p[style-name='Heading8'] => h6.heading-8",
    "p[style-name='Heading 8'] => h6.heading-8",
    
    // Table and list paragraphs
    "p[style-name='Table Paragraph'] => p.table-paragraph",
    "p[style-name='TableParagraph'] => p.table-paragraph",
    "p[style-name='List Paragraph'] => p.list-paragraph",
    
    // Common additional styles
    "p[style-name='Caption'] => p.caption",
    "p[style-name='Quote'] => blockquote.quote",
    "p[style-name='Intense Quote'] => blockquote.intense-quote",
    "p[style-name='Footer'] => p.footer-text",
    "p[style-name='Header'] => p.header-text",
    "p[style-name='Subtitle'] => h2.subtitle",
    
    // Character styles
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em"
];

// Enhanced CSS for better document presentation
const ENHANCED_CSS = `
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
        border-bottom: 3px solid #3498db; 
        padding-bottom: 15px; 
        margin: 0 0 30px 0;
        font-size: 2.4em;
        font-weight: 700;
    }
    
    .subtitle {
        color: #7f8c8d;
        font-size: 1.3em;
        font-weight: 300;
        margin: -20px 0 30px 0;
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
    
    .list-paragraph {
        margin: 8px 0 8px 20px;
    }
    
    .heading-8 { 
        font-size: 0.9em; 
        font-weight: 600; 
        color: #7f8c8d; 
        margin: 20px 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .caption {
        font-style: italic;
        font-size: 0.9em;
        color: #666;
        text-align: center;
        margin: 10px 0;
    }
    
    .quote {
        border-left: 4px solid #3498db;
        padding-left: 20px;
        margin: 20px 0;
        font-style: italic;
    }
    
    .intense-quote {
        border-left: 4px solid #e74c3c;
        padding-left: 20px;
        margin: 20px 0;
        font-weight: bold;
        background: #f8f9fa;
        padding: 15px 20px;
    }
    
    .footer-text, .header-text {
        font-size: 0.9em;
        color: #7f8c8d;
        text-align: center;
    }
    
    table { 
        border-collapse: collapse; 
        width: 100%; 
        margin: 20px 0; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border-radius: 8px;
        overflow: hidden;
        font-size: 0.95em;
    }
    
    td, th { 
        border: 1px solid #e0e0e0; 
        padding: 12px 16px; 
        text-align: left;
    }
    
    th { 
        background-color: #f8f9fa; 
        font-weight: 600;
        color: #495057;
    }
    
    tr:nth-child(even) { 
        background-color: #f9f9f9; 
    }
    
    tr:hover {
        background-color: #f0f8ff;
    }
    
    p { 
        margin: 12px 0;
    }
    
    h1, h2, h3, h4, h5, h6 {
        margin: 24px 0 16px 0;
        color: #2c3e50;
    }
    
    h1 { font-size: 2em; }
    h2 { font-size: 1.6em; }
    h3 { font-size: 1.3em; }
    h4 { font-size: 1.1em; }
    h5 { font-size: 1em; }
    h6 { font-size: 0.9em; }
    
    strong { font-weight: 600; }
    
    @media print {
        body { margin: 0; padding: 20px; }
        .document-title { page-break-after: avoid; }
        tr { page-break-inside: avoid; }
        table { box-shadow: none; }
    }
    
    @media (max-width: 768px) {
        body { padding: 20px 15px; }
        .document-title { font-size: 1.8em; }
        table { font-size: 0.9em; }
        td, th { padding: 8px 12px; }
    }
`;

async function cleanConvert(inputPath, outputPath, options = {}) {
    try {
        console.log(`🚀 Converting ${path.basename(inputPath)}...`);
        
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: options.styleMap || DEFAULT_STYLE_MAP,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false,
            ...options
        });
        
        const title = options.title || path.basename(inputPath, '.docx');
        
        const enhancedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${ENHANCED_CSS}</style>
</head>
<body>
${result.value}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, enhancedHtml);
        
        console.log(`✅ Saved to: ${outputPath}`);
        
        if (result.messages && result.messages.length > 0) {
            const warnings = result.messages.filter(m => m.type === 'warning');
            if (warnings.length > 0) {
                console.log(`⚠️  ${warnings.length} remaining warnings:`);
                warnings.forEach(warning => {
                    console.log(`   • ${warning.message}`);
                });
            }
        } else {
            console.log('🎉 Clean conversion - no warnings!');
        }
        
        return result;
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}

function showHelp() {
    console.log(`
Clean Mammoth.js Converter

USAGE:
  node mammoth-clean.js <input.docx> [output.html]

FEATURES:
  • Eliminates common Word element warnings
  • Built-in style mappings for standard Word styles
  • Professional HTML output with responsive CSS
  • Clean, readable code structure

EXAMPLES:
  node mammoth-clean.js document.docx
  node mammoth-clean.js document.docx output.html
  
For more control, use the enhanced-converter.js or create custom style maps.
    `.trim());
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '.html');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    cleanConvert(inputPath, outputPath)
        .then(() => {
            console.log('🎯 Done!');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { cleanConvert, DEFAULT_STYLE_MAP, ENHANCED_CSS };