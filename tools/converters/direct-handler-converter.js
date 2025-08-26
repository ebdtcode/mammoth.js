#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');

// Create a custom body reader that handles our elements
const originalCreateBodyReader = require('./lib/docx/body-reader').createBodyReader;

// Patch the body reader to add our custom handlers
function patchBodyReader() {
    console.log('📦 Patching body reader with custom handlers...');
    
    require('./lib/docx/body-reader').createBodyReader = function(options) {
        const bodyReader = originalCreateBodyReader(options);
        
        // Store the original readXmlElement
        const originalReadXmlElement = bodyReader.readXmlElement;
        
        // Create our custom element handlers
        const customHandlers = {
            'w:tblPr': function(element) {
                console.log('  ✅ Handling w:tblPr');
                return { value: null, messages: [] }; // Empty result, no warning
            },
            'w:tblGrid': function(element) {
                console.log('  ✅ Handling w:tblGrid');
                return { value: null, messages: [] };
            },
            'w:trPr': function(element) {
                console.log('  ✅ Handling w:trPr');
                return { value: null, messages: [] };
            },
            'w:tcPr': function(element) {
                console.log('  ✅ Handling w:tcPr');
                return { value: null, messages: [] };
            },
            'v:path': function(element) {
                console.log('  ✅ Handling v:path');
                return { value: null, messages: [] };
            },
            'v:line': function(element) {
                console.log('  ✅ Handling v:line');
                return { value: null, messages: [] };
            },
            '{urn:schemas-microsoft-com:office:office}lock': function(element) {
                console.log('  ✅ Handling office:lock');
                return { value: null, messages: [] };
            }
        };
        
        // Override the readXmlElement function
        bodyReader.readXmlElement = function(element) {
            if (customHandlers[element.name]) {
                return customHandlers[element.name](element);
            }
            return originalReadXmlElement.call(this, element);
        };
        
        return bodyReader;
    };
}

async function enhancedConvert(inputPath, outputPath) {
    try {
        console.log(`\n🚀 Starting direct handler conversion...`);
        console.log(`📁 Input: ${inputPath}`);
        console.log(`📁 Output: ${outputPath}`);
        
        // Patch the body reader
        patchBodyReader();
        
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
            background: #fff;
        }
        .document-title { 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 15px; 
            margin-bottom: 30px;
            font-size: 2.2em;
        }
        .body-text { 
            margin: 16px 0; 
            text-align: justify;
            line-height: 1.7;
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
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 20px 0; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 6px;
            overflow: hidden;
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
        @media print {
            body { margin: 0; padding: 20px; }
            .document-title { page-break-after: avoid; }
            tr { page-break-inside: avoid; }
        }
        @media (max-width: 600px) {
            body { padding: 20px 15px; }
            table { font-size: 0.9em; }
            td, th { padding: 8px; }
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
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Direct Handler Mammoth.js Converter');
        console.log('Usage: node direct-handler-converter.js <input.docx> <output.html>');
        console.log('\nFeatures:');
        console.log('  • Direct element handler patching');
        console.log('  • Eliminates unrecognized element warnings');
        console.log('  • Enhanced style mapping');
        console.log('  • Professional HTML output');
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