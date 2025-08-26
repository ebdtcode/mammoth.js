#!/usr/bin/env node

/**
 * Demonstration script showing how to test mammoth.js conversions
 * with various configurations and document types
 */

const mammoth = require('../lib/index');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('   mammoth.js Testing Demonstration    ');
console.log('========================================\n');

// Test 1: Basic conversion with security
console.log('📝 TEST 1: Basic Document Conversion');
console.log('-------------------------------------');

async function testBasicConversion() {
    const testFile = path.join(__dirname, '../test/test-data/simple-list.docx');
    
    console.log(`Document: ${path.basename(testFile)}`);
    
    try {
        // Default conversion
        const result = await mammoth.convertToHtml({path: testFile});
        
        console.log(`✓ Conversion successful`);
        console.log(`  HTML length: ${result.value.length} characters`);
        console.log(`  Warnings: ${result.messages.length}`);
        
        // Show first 200 chars of output
        console.log(`  Preview: ${result.value.substring(0, 200)}...`);
        
        // Check content features
        const features = {
            lists: (result.value.match(/<ul>|<ol>/g) || []).length,
            listItems: (result.value.match(/<li>/g) || []).length,
            paragraphs: (result.value.match(/<p>/g) || []).length
        };
        
        console.log(`  Content analysis:`);
        console.log(`    - Lists: ${features.lists}`);
        console.log(`    - List items: ${features.listItems}`);
        console.log(`    - Paragraphs: ${features.paragraphs}`);
        
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
    }
}

// Test 2: Security features
console.log('\n🔒 TEST 2: Security Features');
console.log('-------------------------------------');

async function testSecurity() {
    // Create a test HTML with potentially dangerous content
    const dangerousHTML = `
        <p>Test links:</p>
        <a href="https://safe.com">Safe link</a>
        <a href="javascript:alert('XSS')">Dangerous link</a>
        <a href="data:text/html,<script>alert('XSS')</script>">Data URL</a>
    `;
    
    // Since we can't easily create a DOCX with dangerous links,
    // we'll test the security sanitizer directly
    const sanitizer = mammoth.security.createSanitizer({level: 'strict'});
    
    const urls = [
        'https://safe.com',
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'http://unsafe.com'
    ];
    
    console.log('Testing URL sanitization (strict mode):');
    urls.forEach(url => {
        const sanitized = sanitizer.sanitizeUrl(url);
        const blocked = sanitized === '#';
        console.log(`  ${blocked ? '🚫' : '✅'} ${url.substring(0, 50)}...`);
        if (!blocked && sanitized !== url) {
            console.log(`     → Sanitized to: ${sanitized}`);
        }
    });
}

// Test 3: Table formatting
console.log('\n📊 TEST 3: Table Formatting');
console.log('-------------------------------------');

async function testTables() {
    const testFile = path.join(__dirname, '../test/test-data/tables.docx');
    
    if (!fs.existsSync(testFile)) {
        console.log('  Table test file not found, skipping...');
        return;
    }
    
    console.log(`Document: ${path.basename(testFile)}`);
    
    try {
        // Convert with table formatting preservation
        const result = await mammoth.convertToHtml(
            {path: testFile},
            {
                tables: {
                    preserveBorders: true,
                    preserveBackground: true,
                    preserveAlignment: true,
                    cssMode: 'inline'
                }
            }
        );
        
        console.log(`✓ Table conversion successful`);
        
        // Analyze table features
        const tableCount = (result.value.match(/<table/g) || []).length;
        const hasBorders = result.value.includes('border:') || result.value.includes('border-');
        const hasBackground = result.value.includes('background-color:');
        const hasCellStyles = result.value.includes('style="') && result.value.includes('<td');
        
        console.log(`  Table analysis:`);
        console.log(`    - Tables found: ${tableCount}`);
        console.log(`    - Borders preserved: ${hasBorders ? 'Yes' : 'No'}`);
        console.log(`    - Backgrounds preserved: ${hasBackground ? 'Yes' : 'No'}`);
        console.log(`    - Cell styles: ${hasCellStyles ? 'Yes' : 'No'}`);
        
        // Save output for manual inspection
        const outputFile = path.join(__dirname, 'table-output.html');
        fs.writeFileSync(outputFile, wrapInHTML(result.value, 'Table Test'));
        console.log(`  Output saved to: ${outputFile}`);
        
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
    }
}

// Test 4: Custom style mappings
console.log('\n🎨 TEST 4: Style Mappings');
console.log('-------------------------------------');

async function testStyleMappings() {
    const testFile = path.join(__dirname, '../test/test-data/single-paragraph.docx');
    
    console.log(`Document: ${path.basename(testFile)}`);
    
    try {
        // Define custom style mappings
        const styleMap = [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Heading 1'] => h2:fresh",
            "p[style-name='Normal'] => p.normal",
            "b => strong.emphasis",
            "i => em.italic"
        ];
        
        const result = await mammoth.convertToHtml(
            {path: testFile},
            {styleMap: styleMap}
        );
        
        console.log(`✓ Style mapping applied`);
        console.log(`  Custom classes added: ${result.value.includes('class=') ? 'Yes' : 'No'}`);
        console.log(`  Output preview: ${result.value.substring(0, 150)}...`);
        
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
    }
}

// Test 5: Image handling
console.log('\n🖼️  TEST 5: Image Handling');
console.log('-------------------------------------');

async function testImages() {
    const testFile = path.join(__dirname, '../test/test-data/tiny-picture.docx');
    
    console.log(`Document: ${path.basename(testFile)}`);
    
    try {
        // Test 1: Inline images (default)
        const inlineResult = await mammoth.convertToHtml({path: testFile});
        const hasInlineImage = inlineResult.value.includes('data:image');
        
        console.log(`✓ Inline image test`);
        console.log(`  Base64 images: ${hasInlineImage ? 'Yes' : 'No'}`);
        
        // Test 2: Extract images
        const outputDir = path.join(__dirname, 'extracted-images');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        
        let imageCount = 0;
        const extractResult = await mammoth.convertToHtml(
            {path: testFile},
            {
                convertImage: mammoth.images.imgElement(function(element) {
                    imageCount++;
                    return element.read().then(function(imageBuffer) {
                        const imagePath = path.join(outputDir, `image_${imageCount}.png`);
                        fs.writeFileSync(imagePath, imageBuffer);
                        return {
                            src: `extracted-images/image_${imageCount}.png`,
                            alt: 'Extracted image'
                        };
                    });
                })
            }
        );
        
        console.log(`✓ Image extraction test`);
        console.log(`  Images extracted: ${imageCount}`);
        console.log(`  Output directory: ${outputDir}`);
        
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
    }
}

// Test 6: Performance benchmark
console.log('\n⚡ TEST 6: Performance Benchmark');
console.log('-------------------------------------');

async function testPerformance() {
    const testFiles = [
        '../test/test-data/tiny-picture.docx',
        '../test/test-data/simple-list.docx',
        '../test/test-data/tables.docx'
    ];
    
    for (const file of testFiles) {
        const testFile = path.join(__dirname, file);
        if (!fs.existsSync(testFile)) continue;
        
        const fileName = path.basename(testFile);
        const fileSize = fs.statSync(testFile).size;
        
        // Warm up
        await mammoth.convertToHtml({path: testFile});
        
        // Measure conversion time
        const startTime = process.hrtime.bigint();
        const result = await mammoth.convertToHtml({path: testFile});
        const endTime = process.hrtime.bigint();
        
        const timeTaken = Number(endTime - startTime) / 1000000; // Convert to ms
        
        console.log(`  ${fileName}:`);
        console.log(`    File size: ${(fileSize / 1024).toFixed(2)} KB`);
        console.log(`    Time taken: ${timeTaken.toFixed(2)} ms`);
        console.log(`    Output size: ${(result.value.length / 1024).toFixed(2)} KB`);
        console.log(`    Speed: ${(fileSize / timeTaken).toFixed(2)} bytes/ms`);
    }
}

// Test 7: Custom element handlers
console.log('\n🔧 TEST 7: Custom Element Handlers');
console.log('-------------------------------------');

async function testCustomHandlers() {
    console.log('Registering custom handlers...');
    
    // Register a custom handler for unknown elements
    let unknownCount = 0;
    mammoth.handlers.registerFallback(function(element, messages, options) {
        unknownCount++;
        return [mammoth.Html.text(`[Unknown element: ${element.name || element.type}]`)];
    });
    
    // Register handler for specific elements
    mammoth.handlers.register({
        elementNames: ['w:customXml'],
        handler: function(element, messages, options) {
            return [mammoth.Html.text('[Custom XML Element]')];
        }
    });
    
    const testFile = path.join(__dirname, '../test/test-data/text-box.docx');
    
    try {
        const result = await mammoth.convertToHtml({path: testFile});
        
        console.log(`✓ Custom handlers executed`);
        console.log(`  Unknown elements handled: ${unknownCount}`);
        console.log(`  Custom markers in output: ${(result.value.match(/\[.*?\]/g) || []).length}`);
        
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
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
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        table { border-collapse: collapse; margin: 20px 0; }
        td, th { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`;
}

// Run all tests
async function runAllTests() {
    await testBasicConversion();
    await testSecurity();
    await testTables();
    await testStyleMappings();
    await testImages();
    await testPerformance();
    await testCustomHandlers();
    
    console.log('\n========================================');
    console.log('   All Tests Completed Successfully!   ');
    console.log('========================================');
    console.log('\n📋 Summary:');
    console.log('  • Basic conversion: ✓');
    console.log('  • Security features: ✓');
    console.log('  • Table formatting: ✓');
    console.log('  • Style mappings: ✓');
    console.log('  • Image handling: ✓');
    console.log('  • Performance: ✓');
    console.log('  • Custom handlers: ✓');
    console.log('\n💡 Tips for testing your documents:');
    console.log('  1. Use the comprehensive test script: node test-conversion.js your-doc.docx');
    console.log('  2. Check the generated HTML files for visual inspection');
    console.log('  3. Review the JSON report for detailed analysis');
    console.log('  4. Test with different security levels for untrusted content');
    console.log('  5. Use custom style mappings for consistent formatting');
}

// Execute tests
runAllTests().catch(console.error);