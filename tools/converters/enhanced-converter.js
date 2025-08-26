#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const path = require('path');

// Register custom element handlers before conversion
function registerCustomHandlers() {
    console.log('Registering custom element handlers...');
    
    // Table properties handler
    mammoth.handlers.register({
        elementNames: ['tblPr'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 50,
        description: 'Table properties handler',
        handler: function(element, messages, options) {
            console.log('  Handling w:tblPr element');
            // Return empty array to suppress warning but handle gracefully
            return [];
        }
    });
    
    // Table grid handler
    mammoth.handlers.register({
        elementNames: ['tblGrid'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 50,
        description: 'Table grid handler',
        handler: function(element, messages, options) {
            console.log('  Handling w:tblGrid element');
            return [];
        }
    });
    
    // Table row properties handler
    mammoth.handlers.register({
        elementNames: ['trPr'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 50,
        description: 'Table row properties handler',
        handler: function(element, messages, options) {
            console.log('  Handling w:trPr element');
            return [];
        }
    });
    
    // Table cell properties handler
    mammoth.handlers.register({
        elementNames: ['tcPr'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 50,
        description: 'Table cell properties handler',
        handler: function(element, messages, options) {
            console.log('  Handling w:tcPr element');
            return [];
        }
    });
    
    // VML elements handler
    mammoth.handlers.register({
        elementNames: ['path', 'line'],
        namespace: 'urn:schemas-microsoft-com:vml',
        priority: 40,
        description: 'VML drawing elements handler',
        handler: function(element, messages, options) {
            console.log('  Handling VML element:', element.name);
            if (element.name === 'line') {
                return [mammoth.Html.element('hr', { class: 'vml-line' }, [])];
            }
            return [mammoth.Html.element('div', { 
                class: 'vml-drawing',
                title: 'Drawing element' 
            }, [mammoth.Html.text('[Drawing]')])];
        }
    });
    
    // Office namespace handler
    mammoth.handlers.register({
        elementNames: ['lock'],
        namespace: 'urn:schemas-microsoft-com:office:office',
        priority: 30,
        description: 'Office lock elements handler',
        handler: function(element, messages, options) {
            console.log('  Handling office:lock element');
            return []; // Safely ignore
        }
    });
    
    console.log('✅ Custom handlers registered successfully');
}

// Enhanced style mappings
const styleMap = [
    "p[style-name='Title'] => h1.document-title:fresh",
    "p[style-name='Body Text'] => p.body-text",
    "p[style-name='BodyText'] => p.body-text", 
    "p[style-name='heading 8'] => h6.heading-level-8",
    "p[style-name='Heading8'] => h6.heading-level-8",
    "p[style-name='Table Paragraph'] => p.table-text",
    "p[style-name='TableParagraph'] => p.table-text"
];

async function enhancedConvert(inputPath, outputPath) {
    try {
        console.log(`\n🚀 Starting enhanced conversion...`);
        console.log(`📁 Input: ${inputPath}`);
        console.log(`📁 Output: ${outputPath}`);
        
        // Register handlers
        registerCustomHandlers();
        
        console.log('\n📄 Converting document...');
        
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: styleMap,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false
        });
        
        // Create enhanced HTML with styling
        const enhancedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Document</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            color: #333;
        }
        .document-title { 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 15px; 
            margin-bottom: 30px;
        }
        .body-text { 
            margin: 16px 0; 
            text-align: justify;
        }
        .table-text { 
            margin: 8px 0; 
            font-size: 0.95em;
        }
        .heading-level-8 { 
            font-size: 0.9em; 
            font-weight: 600; 
            color: #7f8c8d; 
            margin: 20px 0 10px 0;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 20px 0; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        td, th { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left;
        }
        th { 
            background-color: #f8f9fa; 
            font-weight: 600;
        }
        tr:nth-child(even) { 
            background-color: #f9f9f9; 
        }
        .vml-line { 
            border: none; 
            border-top: 1px solid #bdc3c7; 
            margin: 20px 0;
        }
        .vml-drawing { 
            background: #ecf0f1; 
            border: 1px dashed #bdc3c7; 
            padding: 10px; 
            margin: 10px 0; 
            text-align: center; 
            font-style: italic; 
            color: #7f8c8d;
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .document-title { page-break-after: avoid; }
        }
    </style>
</head>
<body>
${result.value}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, enhancedHtml);
        
        console.log('\n✅ Conversion completed successfully!');
        console.log(`📄 Enhanced HTML saved to: ${outputPath}`);
        
        // Report on messages
        if (result.messages && result.messages.length > 0) {
            console.log('\n📋 Conversion messages:');
            const warnings = result.messages.filter(m => m.type === 'warning');
            const infos = result.messages.filter(m => m.type !== 'warning');
            
            if (infos.length > 0) {
                console.log(`  ℹ️  ${infos.length} info message(s)`);
            }
            if (warnings.length > 0) {
                console.log(`  ⚠️  ${warnings.length} warning(s):`);
                warnings.forEach(warning => {
                    console.log(`     - ${warning.message}`);
                });
            }
        } else {
            console.log('\n🎉 Perfect conversion - no warnings!');
        }
        
        return result;
        
    } catch (error) {
        console.error('\n❌ Conversion failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Enhanced Mammoth.js Converter');
        console.log('Usage: node enhanced-converter.js <input.docx> <output.html>');
        console.log('\nFeatures:');
        console.log('  • Custom handlers for Word table elements');
        console.log('  • VML drawing element support');
        console.log('  • Enhanced style mapping');
        console.log('  • Professional HTML output with CSS');
        process.exit(1);
    }
    
    const inputPath = args[0];
    const outputPath = args[1];
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    enhancedConvert(inputPath, outputPath)
        .then(() => {
            console.log('\n🎯 All done! Check your HTML output.');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        });
}

module.exports = { enhancedConvert, registerCustomHandlers };