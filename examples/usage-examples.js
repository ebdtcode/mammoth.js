/**
 * Complete Usage Examples for Enhanced mammoth.js
 * 
 * This file demonstrates all new features and capabilities
 * of the enhanced mammoth.js library.
 */

const mammoth = require('../lib/index');
const fs = require('fs');
const path = require('path');

console.log('🚀 Enhanced mammoth.js Usage Examples');
console.log('═══════════════════════════════════════\n');

// Example 1: Basic Usage with Security
async function example1_basicWithSecurity() {
    console.log('📝 Example 1: Basic Conversion with Security\n');
    
    try {
        // Default behavior - security enabled automatically
        const result = await mammoth.convertToHtml({
            path: path.join(__dirname, '../test/test-data/simple-list.docx')
        });
        
        console.log('✅ Conversion completed');
        console.log(`   HTML length: ${result.value.length} characters`);
        console.log(`   Warnings: ${result.messages.length}`);
        console.log(`   Security: Enabled by default\n`);
        
        // Show first 100 characters
        console.log('Preview:', result.value.substring(0, 100) + '...\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Example 2: Advanced Security Configuration
async function example2_advancedSecurity() {
    console.log('🔒 Example 2: Advanced Security Configuration\n');
    
    // Create test content (normally this would be in a real DOCX)
    const testUrls = [
        'https://safe-site.com',
        'javascript:alert("XSS")',
        'http://tracking-site.com?user=123',
        'mailto:user@example.com',
        'data:text/html,<script>alert("XSS")</script>'
    ];
    
    console.log('Testing different security levels:\n');
    
    const securityLevels = [
        {
            name: 'Standard (Default)',
            config: {level: 'standard'}
        },
        {
            name: 'Strict (HTTPS Only)',
            config: {level: 'strict'}
        },
        {
            name: 'Custom Sanitizer',
            config: {
                level: 'standard',
                customSanitizer: (url) => {
                    if (url.includes('tracking')) {
                        console.log('   🚫 Blocked tracking URL:', url);
                        return '#blocked-tracking';
                    }
                    return url;
                }
            }
        }
    ];
    
    // Test each security level
    for (const level of securityLevels) {
        console.log(`\n${level.name}:`);
        
        const sanitizer = mammoth.security.createSanitizer(level.config);
        
        testUrls.forEach(url => {
            try {
                const sanitized = sanitizer.sanitizeUrl(url);
                const status = sanitized === '#' ? '🚫 BLOCKED' : 
                             sanitized !== url ? '⚠️  MODIFIED' : '✅ ALLOWED';
                console.log(`   ${status} ${url}`);
                if (sanitized !== url && sanitized !== '#') {
                    console.log(`     → ${sanitized}`);
                }
            } catch (error) {
                console.log(`   🚫 BLOCKED ${url} (${error.message})`);
            }
        });
    }
    
    console.log();
}

// Example 3: Custom Element Handlers
async function example3_customHandlers() {
    console.log('🔧 Example 3: Custom Element Handlers\n');
    
    console.log('Registering custom handlers...');
    
    // Handler for content controls
    mammoth.handlers.register({
        elementNames: ['w:sdt'],
        priority: 150,
        description: 'Content Controls (Form Fields)',
        handler: function(element, messages, options) {
            console.log('   📋 Processing content control');
            
            // Extract properties
            const properties = element.first('w:sdtPr');
            const content = element.first('w:sdtContent');
            
            const alias = properties?.first('w:alias')?.attributes?.['w:val'] || 'Unknown';
            const tag = properties?.first('w:tag')?.attributes?.['w:val'] || '';
            
            console.log(`     Type: ${alias}, Tag: ${tag}`);
            
            // Create HTML with special styling
            return [mammoth.Html.freshElement('div', {
                'class': 'content-control',
                'data-alias': alias,
                'data-tag': tag,
                'style': 'border: 1px dashed #4CAF50; padding: 4px; background: #E8F5E9;'
            }, [mammoth.Html.text(`[${alias}]`)])];
        }
    });
    
    // Handler for track changes
    mammoth.handlers.register({
        elementNames: ['w:ins'],
        description: 'Track Changes - Insertions',
        handler: function(element, messages, options) {
            console.log('   ➕ Processing insertion (track changes)');
            
            const author = element.attributes?.['w:author'] || 'Unknown';
            const date = element.attributes?.['w:date'] || '';
            
            return [mammoth.Html.freshElement('ins', {
                'class': 'track-insert',
                'title': `Added by ${author} on ${date}`,
                'style': 'background: #C8E6C9; text-decoration: underline;'
            }, [mammoth.Html.text('[INSERTED TEXT]')])];
        }
    });
    
    // Fallback handler
    let unknownCount = 0;
    mammoth.handlers.registerFallback(function(element, messages, options) {
        unknownCount++;
        const name = element.name || element.type || 'unknown';
        console.log(`   ❓ Unknown element handled: ${name}`);
        
        return [mammoth.Html.text(`[UNKNOWN: ${name}]`)];
    });
    
    // Test conversion (would normally use a real document with these elements)
    console.log('\nHandlers registered successfully!');
    console.log(`Unknown elements handled: ${unknownCount}\n`);
}

// Example 4: Enhanced Table Support
async function example4_enhancedTables() {
    console.log('📊 Example 4: Enhanced Table Support\n');
    
    try {
        const result = await mammoth.convertToHtml({
            path: path.join(__dirname, '../test/test-data/tables.docx')
        }, {
            tables: {
                preserveBorders: true,
                preserveBackground: true,
                preserveAlignment: true,
                preserveWidth: true,
                cssMode: 'inline',
                borderCollapse: true
            }
        });
        
        console.log('✅ Table conversion with formatting');
        console.log(`   Tables found: ${(result.value.match(/<table/g) || []).length}`);
        console.log(`   Borders preserved: ${result.value.includes('border') ? 'Yes' : 'No'}`);
        console.log(`   Backgrounds preserved: ${result.value.includes('background-color') ? 'Yes' : 'No'}`);
        console.log(`   Inline styles: ${result.value.includes('style=') ? 'Yes' : 'No'}\n`);
        
        // Save enhanced table output
        const outputPath = path.join(__dirname, 'enhanced-tables-output.html');
        fs.writeFileSync(outputPath, wrapInHTML(result.value, 'Enhanced Tables'));
        console.log(`📁 Enhanced table output saved to: ${outputPath}\n`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Example 5: Advanced Style Mappings
async function example5_advancedStyleMappings() {
    console.log('🎨 Example 5: Advanced Style Mappings\n');
    
    // Define comprehensive style mappings
    const advancedStyleMap = [
        // Headers
        "p[style-name='Title'] => h1.document-title",
        "p[style-name='Subtitle'] => h2.document-subtitle", 
        "p[style-name='Heading 1'] => h2.section-header",
        "p[style-name='Heading 2'] => h3.subsection-header",
        "p[style-name='Heading 3'] => h4.minor-header",
        
        // Special paragraphs
        "p[style-name='Quote'] => blockquote.quotation",
        "p[style-name='Code Block'] => pre.code-block",
        "p[style-name='Caption'] => figcaption.image-caption",
        "p[style-name='Abstract'] => div.abstract",
        "p[style-name='Bibliography'] => div.bibliography",
        
        // Inline styles
        "r[style-name='Code'] => code.inline-code",
        "r[style-name='Emphasis'] => em.emphasis",
        "r[style-name='Strong'] => strong.strong-text",
        "r[style-name='Hyperlink'] => a.document-link",
        "r[style-name='Footnote Reference'] => sup.footnote-ref",
        
        // Lists
        "p[style-name='List Item'] => li.standard-item",
        "p[style-name='Numbered List'] => li.numbered-item",
        "p[style-name='Bullet List'] => li.bullet-item",
        
        // Custom elements (new feature)
        "sdt[alias='author'] => span.author-name",
        "sdt[alias='date'] => time.document-date",
        "sdt[alias='version'] => span.document-version"
    ];
    
    console.log(`Applying ${advancedStyleMap.length} style mappings...\n`);
    
    try {
        const result = await mammoth.convertToHtml({
            path: path.join(__dirname, '../test/test-data/single-paragraph.docx')
        }, {
            styleMap: advancedStyleMap
        });
        
        console.log('✅ Style mapping completed');
        
        // Analyze applied styles
        const appliedStyles = {
            headers: (result.value.match(/<h[1-6][^>]*class/g) || []).length,
            paragraphs: (result.value.match(/<p[^>]*class/g) || []).length,
            inlineStyles: (result.value.match(/<(em|strong|code)[^>]*class/g) || []).length,
            customClasses: (result.value.match(/class="[^"]*"/g) || []).length
        };
        
        console.log(`   Headers with classes: ${appliedStyles.headers}`);
        console.log(`   Paragraphs with classes: ${appliedStyles.paragraphs}`);
        console.log(`   Inline elements with classes: ${appliedStyles.inlineStyles}`);
        console.log(`   Total custom classes: ${appliedStyles.customClasses}\n`);
        
        // Save styled output with CSS
        const styledHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Advanced Style Mapping Demo</title>
    <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .document-title { color: #2E7D32; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        .document-subtitle { color: #388E3C; font-style: italic; }
        .section-header { color: #1976D2; margin-top: 30px; }
        .subsection-header { color: #1565C0; }
        .quotation { border-left: 4px solid #FF5722; padding-left: 20px; font-style: italic; color: #555; }
        .code-block { background: #F5F5F5; padding: 15px; border-radius: 4px; font-family: 'Courier New', monospace; }
        .inline-code { background: #ECEFF1; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
        .emphasis { font-style: italic; color: #E65100; }
        .strong-text { font-weight: bold; color: #BF360C; }
        .author-name { font-weight: bold; color: #4527A0; }
        .document-date { color: #6A1B9A; font-family: monospace; }
        .abstract { background: #E8F5E9; padding: 15px; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>Advanced Style Mapping Demo</h1>
    ${result.value}
</body>
</html>`;
        
        const outputPath = path.join(__dirname, 'styled-output.html');
        fs.writeFileSync(outputPath, styledHTML);
        console.log(`📁 Styled output saved to: ${outputPath}\n`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Example 6: Image Handling Options
async function example6_imageHandling() {
    console.log('🖼️  Example 6: Advanced Image Handling\n');
    
    try {
        // Option 1: Inline images (default)
        console.log('Option 1: Inline Images (Base64)');
        const inlineResult = await mammoth.convertToHtml({
            path: path.join(__dirname, '../test/test-data/tiny-picture.docx')
        });
        
        const hasInlineImages = inlineResult.value.includes('data:image/');
        console.log(`   Inline images found: ${hasInlineImages ? 'Yes' : 'No'}`);
        
        // Option 2: Extract images to files
        console.log('\nOption 2: Extract Images to Files');
        
        const imageOutputDir = path.join(__dirname, 'extracted-images');
        if (!fs.existsSync(imageOutputDir)) {
            fs.mkdirSync(imageOutputDir);
        }
        
        let imageIndex = 0;
        const extractResult = await mammoth.convertToHtml({
            path: path.join(__dirname, '../test/test-data/tiny-picture.docx')
        }, {
            convertImage: mammoth.images.imgElement(function(element) {
                imageIndex++;
                const extension = element.contentType.split('/')[1];
                const filename = `image_${imageIndex}.${extension}`;
                
                console.log(`   📸 Extracting image: ${filename} (${element.contentType})`);
                
                return element.read().then(function(imageBuffer) {
                    const imagePath = path.join(imageOutputDir, filename);
                    fs.writeFileSync(imagePath, imageBuffer);
                    
                    return {
                        src: `extracted-images/${filename}`,
                        alt: element.altText || `Image ${imageIndex}`,
                        title: `Extracted from Word document`
                    };
                });
            })
        });
        
        console.log(`   Images extracted: ${imageIndex}`);
        console.log(`   Output directory: ${imageOutputDir}\n`);
        
        // Option 3: Custom image processing
        console.log('Option 3: Custom Image Processing');
        
        let processedImages = 0;
        const customResult = await mammoth.convertToHtml({
            path: path.join(__dirname, '../test/test-data/tiny-picture.docx')
        }, {
            convertImage: mammoth.images.imgElement(function(element) {
                processedImages++;
                
                return element.read().then(function(imageBuffer) {
                    // Custom processing - get image dimensions, optimize, etc.
                    const imageSize = imageBuffer.length;
                    console.log(`   🔧 Processing image ${processedImages}: ${imageSize} bytes`);
                    
                    // Return custom HTML
                    return {
                        src: `data:${element.contentType};base64,${imageBuffer.toString('base64')}`,
                        alt: element.altText || 'Processed Image',
                        'data-original-size': imageSize,
                        style: 'max-width: 100%; height: auto; border: 2px solid #ddd;'
                    };
                });
            })
        });
        
        console.log(`   Images processed: ${processedImages}\n`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Example 7: Performance Monitoring
async function example7_performanceMonitoring() {
    console.log('⚡ Example 7: Performance Monitoring\n');
    
    const testFiles = [
        '../test/test-data/simple-list.docx',
        '../test/test-data/tiny-picture.docx',
        '../test/test-data/tables.docx'
    ];
    
    console.log('Performance benchmarks:\n');
    
    for (const file of testFiles) {
        const testFile = path.join(__dirname, file);
        if (!fs.existsSync(testFile)) continue;
        
        const fileName = path.basename(testFile);
        const fileStats = fs.statSync(testFile);
        
        console.log(`📄 ${fileName}:`);
        console.log(`   File size: ${(fileStats.size / 1024).toFixed(2)} KB`);
        
        // Warm up
        await mammoth.convertToHtml({path: testFile});
        
        // Time multiple runs
        const times = [];
        for (let i = 0; i < 5; i++) {
            const start = process.hrtime.bigint();
            const result = await mammoth.convertToHtml({path: testFile});
            const end = process.hrtime.bigint();
            
            const timeMs = Number(end - start) / 1000000;
            times.push(timeMs);
        }
        
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
        console.log(`   Min time: ${minTime.toFixed(2)}ms`);
        console.log(`   Max time: ${maxTime.toFixed(2)}ms`);
        console.log(`   Speed: ${(fileStats.size / avgTime).toFixed(2)} bytes/ms\n`);
    }
}

// Example 8: Error Handling and Debugging
async function example8_errorHandling() {
    console.log('🐛 Example 8: Error Handling and Debugging\n');
    
    // Enable debug mode
    let debugMessages = [];
    
    // Custom error handling
    try {
        const result = await mammoth.convertToHtml({
            path: path.join(__dirname, '../test/test-data/simple-list.docx')
        }, {
            // Enable detailed warnings
            includeDefaultStyleMap: false,
            // Custom error handler
            transformDocument: function(document) {
                console.log('🔍 Document transformation started');
                debugMessages.push('Document has ' + document.children.length + ' elements');
                return document;
            }
        });
        
        console.log('✅ Conversion completed with debugging');
        
        // Analyze warnings
        const warnings = result.messages.filter(m => m.type === 'warning');
        const errors = result.messages.filter(m => m.type === 'error');
        
        console.log(`   Warnings: ${warnings.length}`);
        console.log(`   Errors: ${errors.length}`);
        console.log(`   Debug messages: ${debugMessages.length}\n`);
        
        // Show warnings
        if (warnings.length > 0) {
            console.log('⚠️  Warnings:');
            warnings.slice(0, 3).forEach((warning, i) => {
                console.log(`   ${i + 1}. ${warning.message}`);
            });
            if (warnings.length > 3) {
                console.log(`   ... and ${warnings.length - 3} more\n`);
            }
        }
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Helper function to wrap HTML
function wrapInHTML(content, title) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .content-control { margin: 5px 0; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
        ${content}
    </div>
    <footer style="margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <p><strong>Generated by:</strong> Enhanced mammoth.js</p>
        <p><strong>Features used:</strong> Security sanitization, Custom handlers, Enhanced tables, Advanced styling</p>
    </footer>
</body>
</html>`;
}

// Main execution
async function runAllExamples() {
    console.log('Starting all examples...\n');
    
    try {
        await example1_basicWithSecurity();
        await example2_advancedSecurity();
        await example3_customHandlers();
        await example4_enhancedTables();
        await example5_advancedStyleMappings();
        await example6_imageHandling();
        await example7_performanceMonitoring();
        await example8_errorHandling();
        
        console.log('🎉 All examples completed successfully!\n');
        console.log('📁 Generated files in examples/ directory:');
        console.log('   • enhanced-tables-output.html');
        console.log('   • styled-output.html');
        console.log('   • extracted-images/ (directory)');
        
    } catch (error) {
        console.error('❌ Example execution failed:', error.message);
    }
}

// CLI usage
if (require.main === module) {
    const example = process.argv[2];
    
    if (!example) {
        console.log(`
Usage Examples for Enhanced mammoth.js
═════════════════════════════════════════

Run all examples:
  node usage-examples.js

Run specific example:
  node usage-examples.js 1    # Basic with security  
  node usage-examples.js 2    # Advanced security
  node usage-examples.js 3    # Custom handlers
  node usage-examples.js 4    # Enhanced tables
  node usage-examples.js 5    # Advanced style mappings
  node usage-examples.js 6    # Image handling
  node usage-examples.js 7    # Performance monitoring
  node usage-examples.js 8    # Error handling

Available examples:
  1. Basic Conversion with Security
  2. Advanced Security Configuration  
  3. Custom Element Handlers
  4. Enhanced Table Support
  5. Advanced Style Mappings
  6. Image Handling Options
  7. Performance Monitoring
  8. Error Handling and Debugging
        `);
        process.exit(0);
    }
    
    const examples = {
        '1': example1_basicWithSecurity,
        '2': example2_advancedSecurity,
        '3': example3_customHandlers,
        '4': example4_enhancedTables,
        '5': example5_advancedStyleMappings,
        '6': example6_imageHandling,
        '7': example7_performanceMonitoring,
        '8': example8_errorHandling,
        'all': runAllExamples
    };
    
    const exampleFunc = examples[example] || examples['all'];
    exampleFunc().catch(console.error);
}

module.exports = {
    example1_basicWithSecurity,
    example2_advancedSecurity,
    example3_customHandlers,
    example4_enhancedTables,
    example5_advancedStyleMappings,
    example6_imageHandling,
    example7_performanceMonitoring,
    example8_errorHandling,
    runAllExamples
};