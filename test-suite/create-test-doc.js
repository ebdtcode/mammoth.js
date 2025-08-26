#!/usr/bin/env node

/**
 * Creates test DOCX documents with various features to test mammoth.js conversion
 * This uses the officegen library to create Word documents programmatically
 */

const fs = require('fs');
const path = require('path');

// Check if officegen is installed
let officegen;
try {
    officegen = require('officegen');
} catch (error) {
    console.log('Installing officegen for document generation...');
    require('child_process').execSync('npm install officegen', {stdio: 'inherit'});
    officegen = require('officegen');
}

function createComprehensiveTestDocument() {
    const docx = officegen('docx');
    
    // Document metadata
    docx.setDocSubject('mammoth.js Test Document');
    docx.setDocKeywords(['test', 'mammoth', 'conversion']);
    docx.setDescription('Comprehensive test document for mammoth.js');
    
    // Title
    let pObj = docx.createP({align: 'center'});
    pObj.addText('Comprehensive Test Document', {
        bold: true,
        font_size: 24,
        color: '000088'
    });
    
    // Subtitle
    pObj = docx.createP({align: 'center'});
    pObj.addText('Testing mammoth.js Conversion Features', {
        font_size: 14,
        italic: true
    });
    
    docx.createP();
    
    // Section 1: Text Formatting
    pObj = docx.createP();
    pObj.addText('1. Text Formatting Tests', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    pObj = docx.createP();
    pObj.addText('This paragraph contains ');
    pObj.addText('bold text', {bold: true});
    pObj.addText(', ');
    pObj.addText('italic text', {italic: true});
    pObj.addText(', ');
    pObj.addText('underlined text', {underline: true});
    pObj.addText(', ');
    pObj.addText('strikethrough text', {strikethrough: true});
    pObj.addText(', and ');
    pObj.addText('colored text', {color: 'FF0000'});
    pObj.addText('.');
    
    pObj = docx.createP();
    pObj.addText('Text with ', {font_size: 12});
    pObj.addText('different ', {font_size: 14});
    pObj.addText('sizes ', {font_size: 16});
    pObj.addText('in the same paragraph.', {font_size: 12});
    
    // Section 2: Lists
    docx.createP();
    pObj = docx.createP();
    pObj.addText('2. Lists', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    pObj = docx.createP();
    pObj.addText('Unordered List:');
    
    pObj = docx.createListOfDots();
    pObj.addText('First item');
    
    pObj = docx.createListOfDots();
    pObj.addText('Second item with ');
    pObj.addText('bold', {bold: true});
    pObj.addText(' text');
    
    pObj = docx.createListOfDots();
    pObj.addText('Third item');
    
    pObj = docx.createP();
    pObj.addText('Numbered List:');
    
    pObj = docx.createListOfNumbers();
    pObj.addText('First numbered item');
    
    pObj = docx.createListOfNumbers();
    pObj.addText('Second numbered item');
    
    pObj = docx.createListOfNumbers();
    pObj.addText('Third numbered item');
    
    // Section 3: Tables
    docx.createP();
    pObj = docx.createP();
    pObj.addText('3. Tables', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    // Simple table
    const table = [
        [{
            val: "Header 1",
            opts: {
                cellColWidth: 2000,
                b: true,
                sz: '12',
                shd: {
                    fill: "CCCCCC"
                }
            }
        }, {
            val: "Header 2",
            opts: {
                cellColWidth: 3000,
                b: true,
                sz: '12',
                shd: {
                    fill: "CCCCCC"
                }
            }
        }, {
            val: "Header 3",
            opts: {
                cellColWidth: 3000,
                b: true,
                sz: '12',
                shd: {
                    fill: "CCCCCC"
                }
            }
        }],
        ['Cell 1,1', 'Cell 1,2', 'Cell 1,3'],
        ['Cell 2,1', 'Cell 2,2', 'Cell 2,3'],
        [{
            val: 'Merged cell',
            opts: {
                gridSpan: 2,
                shd: {
                    fill: "FFFFCC"
                }
            }
        }, 'Cell 3,3']
    ];
    
    docx.createTable(table, {
        tableColWidth: 8000,
        borders: true
    });
    
    // Section 4: Links and References
    docx.createP();
    pObj = docx.createP();
    pObj.addText('4. Links and References', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    pObj = docx.createP();
    pObj.addText('This is a paragraph with a ');
    pObj.addText('hyperlink to Google', {
        link: 'https://www.google.com',
        color: '0000FF',
        underline: true
    });
    pObj.addText(' and a ');
    pObj.addText('potentially dangerous link', {
        link: 'javascript:alert("XSS")',
        color: '0000FF',
        underline: true
    });
    pObj.addText(' that should be sanitized.');
    
    // Section 5: Special Characters
    docx.createP();
    pObj = docx.createP();
    pObj.addText('5. Special Characters & Symbols', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    pObj = docx.createP();
    pObj.addText('Special characters: < > & " \' © ® ™ € £ ¥ § ¶ • … — –');
    
    pObj = docx.createP();
    pObj.addText('Mathematical: ∑ ∏ √ ∞ ± × ÷ ≈ ≠ ≤ ≥ ∈ ∉ ⊂ ⊃ ∪ ∩');
    
    pObj = docx.createP();
    pObj.addText('Arrows: ← → ↑ ↓ ↔ ⇐ ⇒ ⇑ ⇓ ⇔');
    
    // Section 6: Code and Quotes
    docx.createP();
    pObj = docx.createP();
    pObj.addText('6. Code and Quotes', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    pObj = docx.createP({
        align: 'left',
        indentLeft: 720
    });
    pObj.addText('This is a block quote. It should be indented and possibly styled differently.', {
        italic: true
    });
    
    pObj = docx.createP();
    pObj.addText('Inline code: ', {font_face: 'Arial'});
    pObj.addText('const x = 42;', {
        font_face: 'Courier New',
        color: '333333'
    });
    
    // Section 7: Page Breaks
    docx.putPageBreak();
    
    pObj = docx.createP();
    pObj.addText('7. Second Page Content', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    pObj = docx.createP();
    pObj.addText('This content appears after a page break.');
    
    // Section 8: Images (if we had image data)
    pObj = docx.createP();
    pObj.addText('8. Images', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    pObj = docx.createP();
    pObj.addText('Image handling would be tested here with actual image files.');
    
    // Section 9: Complex Nested Structure
    docx.createP();
    pObj = docx.createP();
    pObj.addText('9. Nested Structures', {
        bold: true,
        font_size: 16,
        underline: true
    });
    
    // Nested table
    const nestedTable = [
        ['Outer Cell 1', 'Outer Cell 2'],
        [{
            val: 'Nested content with formatting',
            opts: {
                cellColWidth: 4000
            }
        }, 'Regular cell']
    ];
    
    docx.createTable(nestedTable, {
        tableColWidth: 8000,
        borders: true
    });
    
    return docx;
}

function createSecurityTestDocument() {
    const docx = officegen('docx');
    
    // Title
    let pObj = docx.createP({align: 'center'});
    pObj.addText('Security Test Document', {
        bold: true,
        font_size: 20
    });
    
    docx.createP();
    
    // Various potentially dangerous URLs
    pObj = docx.createP();
    pObj.addText('Testing URL Sanitization:', {bold: true});
    
    const dangerousUrls = [
        {text: 'JavaScript protocol', url: 'javascript:alert("XSS")'},
        {text: 'Data URL with script', url: 'data:text/html,<script>alert("XSS")</script>'},
        {text: 'VBScript protocol', url: 'vbscript:msgbox("XSS")'},
        {text: 'File protocol', url: 'file:///etc/passwd'},
        {text: 'About protocol', url: 'about:blank'},
        {text: 'Chrome protocol', url: 'chrome://settings'},
        {text: 'Valid HTTPS', url: 'https://www.example.com'},
        {text: 'Valid HTTP', url: 'http://www.example.com'},
        {text: 'Valid mailto', url: 'mailto:test@example.com'},
        {text: 'Valid tel', url: 'tel:+1234567890'},
        {text: 'FTP link', url: 'ftp://ftp.example.com/file.txt'},
        {text: 'Path traversal', url: '../../../etc/passwd'},
        {text: 'URL with null byte', url: 'https://example.com\x00.evil.com'}
    ];
    
    dangerousUrls.forEach(item => {
        pObj = docx.createP();
        pObj.addText('• ');
        pObj.addText(item.text + ': ', {bold: true});
        pObj.addText(item.url, {
            link: item.url,
            color: '0000FF',
            underline: true
        });
    });
    
    return docx;
}

function createTableTestDocument() {
    const docx = officegen('docx');
    
    // Title
    let pObj = docx.createP({align: 'center'});
    pObj.addText('Table Formatting Test Document', {
        bold: true,
        font_size: 20
    });
    
    docx.createP();
    
    // Test 1: Simple table with borders
    pObj = docx.createP();
    pObj.addText('1. Simple Table with Borders:', {bold: true});
    
    docx.createTable([
        [{val: 'A1', opts: {b: true}}, {val: 'B1', opts: {b: true}}],
        ['A2', 'B2'],
        ['A3', 'B3']
    ], {
        tableColWidth: 8000,
        borders: true
    });
    
    docx.createP();
    
    // Test 2: Table with background colors
    pObj = docx.createP();
    pObj.addText('2. Table with Background Colors:', {bold: true});
    
    docx.createTable([
        [{
            val: 'Red Background',
            opts: {shd: {fill: "FF0000"}}
        }, {
            val: 'Green Background',
            opts: {shd: {fill: "00FF00"}}
        }],
        [{
            val: 'Blue Background',
            opts: {shd: {fill: "0000FF"}}
        }, {
            val: 'Yellow Background',
            opts: {shd: {fill: "FFFF00"}}
        }]
    ], {
        tableColWidth: 8000,
        borders: true
    });
    
    docx.createP();
    
    // Test 3: Table with merged cells
    pObj = docx.createP();
    pObj.addText('3. Table with Merged Cells:', {bold: true});
    
    docx.createTable([
        [{
            val: 'Merged Across',
            opts: {gridSpan: 3}
        }],
        ['Cell 1', {
            val: 'Merged Down',
            opts: {vMerge: 'restart'}
        }, 'Cell 3'],
        ['Cell 4', {
            val: '',
            opts: {vMerge: 'continue'}
        }, 'Cell 6']
    ], {
        tableColWidth: 8000,
        borders: true
    });
    
    docx.createP();
    
    // Test 4: Complex table with various alignments
    pObj = docx.createP();
    pObj.addText('4. Table with Text Alignment:', {bold: true});
    
    docx.createTable([
        [{
            val: 'Left Aligned',
            opts: {align: 'left'}
        }, {
            val: 'Center Aligned',
            opts: {align: 'center'}
        }, {
            val: 'Right Aligned',
            opts: {align: 'right'}
        }],
        [{
            val: 'Top',
            opts: {vAlign: 'top'}
        }, {
            val: 'Middle',
            opts: {vAlign: 'center'}
        }, {
            val: 'Bottom',
            opts: {vAlign: 'bottom'}
        }]
    ], {
        tableColWidth: 8000,
        borders: true
    });
    
    return docx;
}

function saveDocument(docx, filename) {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(__dirname, filename);
        const out = fs.createWriteStream(outputPath);
        
        out.on('error', reject);
        out.on('close', () => {
            console.log(`✓ Created: ${outputPath}`);
            resolve(outputPath);
        });
        
        docx.generate(out);
    });
}

async function main() {
    console.log('Creating test documents for mammoth.js...\n');
    
    try {
        // Create comprehensive test document
        const comprehensiveDoc = createComprehensiveTestDocument();
        await saveDocument(comprehensiveDoc, 'test-comprehensive.docx');
        
        // Create security test document
        const securityDoc = createSecurityTestDocument();
        await saveDocument(securityDoc, 'test-security.docx');
        
        // Create table test document
        const tableDoc = createTableTestDocument();
        await saveDocument(tableDoc, 'test-tables.docx');
        
        console.log('\n✅ All test documents created successfully!');
        console.log('\nYou can now test these documents with:');
        console.log('  node test-conversion.js test-comprehensive.docx');
        console.log('  node test-conversion.js test-security.docx --security');
        console.log('  node test-conversion.js test-tables.docx --tables');
        
    } catch (error) {
        console.error('Error creating documents:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    createComprehensiveTestDocument,
    createSecurityTestDocument,
    createTableTestDocument,
    saveDocument
};