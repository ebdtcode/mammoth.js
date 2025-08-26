#!/usr/bin/env node

/**
 * Element Inspector for mammoth.js
 * 
 * This tool helps identify unrecognized elements in Word documents
 * and provides guidance on how to add support for them
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const JSZip = require('jszip');
const xml2js = require('xml2js');
const mammoth = require('../lib/index');

// Install xml2js if not present
try {
    require.resolve('xml2js');
} catch(e) {
    console.log('Installing xml2js for XML parsing...');
    require('child_process').execSync('npm install xml2js', {stdio: 'inherit'});
}

class ElementInspector {
    constructor(docxPath) {
        this.docxPath = docxPath;
        this.docName = path.basename(docxPath);
        this.unrecognizedElements = new Map();
        this.elementFrequency = new Map();
        this.elementExamples = new Map();
        this.namespaces = new Set();
    }

    async inspectDocument() {
        console.log('\n🔍 DOCX Element Inspector');
        console.log('═'.repeat(60));
        console.log(`Document: ${this.docName}`);
        console.log('═'.repeat(60));

        // Step 1: Extract and analyze raw XML
        await this.analyzeRawXML();
        
        // Step 2: Run mammoth conversion to capture warnings
        await this.runMammothConversion();
        
        // Step 3: Compare and identify unsupported elements
        await this.identifyUnsupportedElements();
        
        // Step 4: Generate implementation guide
        this.generateImplementationGuide();
        
        // Step 5: Create custom handler examples
        this.createCustomHandlerExamples();
    }

    async analyzeRawXML() {
        console.log('\n📄 Analyzing Raw XML Structure...\n');
        
        const data = fs.readFileSync(this.docxPath);
        const zip = await JSZip.loadAsync(data);
        
        // Key XML files to analyze
        const xmlFiles = [
            'word/document.xml',
            'word/header1.xml',
            'word/footer1.xml',
            'word/footnotes.xml',
            'word/endnotes.xml',
            'word/comments.xml',
            'word/styles.xml',
            'word/numbering.xml'
        ];
        
        for (const xmlFile of xmlFiles) {
            if (zip.files[xmlFile]) {
                await this.parseXMLFile(zip, xmlFile);
            }
        }
        
        console.log(`\n✓ Found ${this.elementFrequency.size} unique element types`);
        console.log(`✓ Found ${this.namespaces.size} XML namespaces`);
    }

    async parseXMLFile(zip, filename) {
        const content = await zip.files[filename].async('string');
        const parser = new xml2js.Parser({
            preserveChildrenOrder: true,
            explicitArray: true,
            explicitChildren: true,
            childkey: '$$'
        });
        
        try {
            const result = await parser.parseStringPromise(content);
            console.log(`  Parsing ${filename}...`);
            this.traverseXML(result, filename);
        } catch (error) {
            console.log(`  ⚠️  Error parsing ${filename}: ${error.message}`);
        }
    }

    traverseXML(obj, source, depth = 0) {
        if (!obj || typeof obj !== 'object') return;
        
        // Process each property
        for (const key in obj) {
            if (key === '$' || key === '_' || key === '$$') continue;
            
            // Extract namespace and element name
            const match = key.match(/^(?:([^:]+):)?(.+)$/);
            const namespace = match[1] || '';
            const elementName = match[2];
            const fullName = key;
            
            // Track namespace
            if (namespace) {
                this.namespaces.add(namespace);
            }
            
            // Track element frequency
            const count = this.elementFrequency.get(fullName) || 0;
            this.elementFrequency.set(fullName, count + 1);
            
            // Store example of element structure
            if (!this.elementExamples.has(fullName) && depth < 3) {
                this.elementExamples.set(fullName, {
                    namespace,
                    localName: elementName,
                    source,
                    attributes: obj[key][0]?.$ || {},
                    hasChildren: !!(obj[key][0]?.$$),
                    example: this.truncateObject(obj[key][0])
                });
            }
            
            // Recurse into children
            if (Array.isArray(obj[key])) {
                obj[key].forEach(child => {
                    if (child && child.$$) {
                        this.traverseXML(child, source, depth + 1);
                    }
                });
            }
        }
    }

    truncateObject(obj, maxDepth = 2, currentDepth = 0) {
        if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
            return typeof obj === 'string' && obj.length > 50 
                ? obj.substring(0, 50) + '...' 
                : obj;
        }
        
        const result = {};
        for (const key in obj) {
            if (key === '$$' && Array.isArray(obj[key])) {
                result[key] = obj[key].length > 0 ? '[children]' : [];
            } else if (key === '$') {
                result[key] = obj[key];
            } else {
                result[key] = this.truncateObject(obj[key], maxDepth, currentDepth + 1);
            }
        }
        return result;
    }

    async runMammothConversion() {
        console.log('\n🔄 Running mammoth.js Conversion...\n');
        
        // Capture warnings about unrecognized elements
        const result = await mammoth.convertToHtml({path: this.docxPath});
        
        const unrecognizedWarnings = result.messages.filter(msg => 
            msg.message.includes('unrecognised') || 
            msg.message.includes('ignored') ||
            msg.message.includes('unknown')
        );
        
        console.log(`  Found ${unrecognizedWarnings.length} warnings about unrecognized elements`);
        
        // Parse warnings to extract element names
        unrecognizedWarnings.forEach(warning => {
            const match = warning.message.match(/element was ignored: ([^\s]+)/);
            if (match) {
                const elementName = match[1];
                this.unrecognizedElements.set(elementName, {
                    warning: warning.message,
                    frequency: this.elementFrequency.get(elementName) || 0
                });
            }
        });
    }

    async identifyUnsupportedElements() {
        console.log('\n📊 Unsupported Elements Analysis');
        console.log('─'.repeat(60));
        
        // Common Word elements that might not be fully supported
        const commonWordElements = [
            'w:sdt',           // Structured Document Tags (content controls)
            'w:sdtPr',         // SDT properties
            'w:sdtContent',    // SDT content
            'w:smartTag',      // Smart tags
            'w:pPrChange',     // Paragraph property changes (track changes)
            'w:rPrChange',     // Run property changes
            'w:ins',           // Insertions (track changes)
            'w:del',           // Deletions (track changes)
            'w:moveFrom',      // Move source
            'w:moveTo',        // Move destination
            'w:customXml',     // Custom XML
            'w:fldSimple',     // Simple fields
            'w:fldChar',       // Complex field character
            'w:instrText',     // Field instruction text
            'w:dayLong',       // Date fields
            'w:monthLong',     // Date fields
            'w:yearLong',      // Date fields
            'mc:AlternateContent', // Alternate content for compatibility
            'w:drawing',       // DrawingML content
            'wp:inline',       // Inline drawing
            'wp:anchor',       // Anchored drawing
            'w:object',        // Embedded objects
            'o:OLEObject',     // OLE objects
            'v:shape',         // VML shapes
            'v:imagedata',     // VML image data
            'w:background',    // Document background
            'w:framePr',       // Text frame properties
            'w:pgNum',         // Page number fields
            'w:cr',            // Carriage return
            'w:softHyphen',    // Soft hyphen
            'w:noBreakHyphen', // Non-breaking hyphen
            'w:sym',           // Symbol
            'math:oMath',      // Office Math
            'math:oMathPara',  // Office Math Paragraph
            'w15:chartPart',   // Chart parts (Word 2013+)
            'w14:checkbox',    // Checkbox (Word 2010+)
            'w14:entityPicker' // Entity picker (Word 2010+)
        ];
        
        // Check which common elements are in this document
        console.log('\n🎯 Common Unsupported Elements Found:\n');
        
        const foundUnsupported = [];
        commonWordElements.forEach(element => {
            const count = this.elementFrequency.get(element) || 0;
            if (count > 0) {
                foundUnsupported.push({element, count});
                console.log(`  ${element.padEnd(25)} - ${count} occurrences`);
                
                const example = this.elementExamples.get(element);
                if (example) {
                    console.log(`    ├─ Namespace: ${example.namespace || 'default'}`);
                    console.log(`    ├─ Has children: ${example.hasChildren ? 'Yes' : 'No'}`);
                    if (Object.keys(example.attributes).length > 0) {
                        console.log(`    └─ Attributes: ${Object.keys(example.attributes).join(', ')}`);
                    }
                }
            }
        });
        
        if (foundUnsupported.length === 0) {
            console.log('  None found - document uses mostly supported elements');
        }
        
        // List all unique namespaces
        console.log('\n📦 XML Namespaces in Document:\n');
        this.namespaces.forEach(ns => {
            console.log(`  • ${ns}:`);
            const nsElements = Array.from(this.elementFrequency.keys())
                .filter(el => el.startsWith(ns + ':'))
                .slice(0, 5);
            nsElements.forEach(el => {
                console.log(`    - ${el} (${this.elementFrequency.get(el)} times)`);
            });
        });
        
        return foundUnsupported;
    }

    generateImplementationGuide() {
        console.log('\n💡 Implementation Guide');
        console.log('═'.repeat(60));
        
        // Find top unrecognized elements
        const topUnrecognized = Array.from(this.unrecognizedElements.entries())
            .sort((a, b) => b[1].frequency - a[1].frequency)
            .slice(0, 5);
        
        if (topUnrecognized.length === 0) {
            console.log('\n✅ No unrecognized elements detected!');
            return;
        }
        
        console.log('\n📝 Top Priority Elements to Implement:\n');
        
        topUnrecognized.forEach(([element, data], index) => {
            console.log(`${index + 1}. ${element} (${data.frequency} occurrences)`);
            
            const example = this.elementExamples.get(element);
            if (example) {
                console.log('\n   Implementation Steps:');
                console.log('   ' + '─'.repeat(40));
                
                // Step 1: Add to document types
                console.log('\n   1️⃣  Add to lib/documents.js:');
                console.log(`\n   types.${this.camelCase(example.localName)} = "${example.localName}";`);
                
                // Step 2: Add reader in body-reader.js
                console.log('\n   2️⃣  Add reader in lib/docx/body-reader.js:');
                console.log(`
   function read${this.pascalCase(example.localName)}(element) {
       return readXmlElement(element).map(function(element) {
           return documents.${this.camelCase(example.localName)}({
               // Add properties based on attributes
               ${Object.keys(example.attributes).map(attr => 
                   `${this.camelCase(attr)}: element.attributes["${attr}"]`
               ).join(',\n               ')}
           });
       });
   }`);
                
                // Step 3: Add converter in document-to-html.js
                console.log('\n   3️⃣  Add converter in lib/document-to-html.js:');
                console.log(`
   function convert${this.pascalCase(example.localName)}(element, messages, options) {
       // Handle the element conversion to HTML
       return Html.freshElement("div", {
           "class": "${example.localName.toLowerCase()}"
       }, [
           // Process children or content
       ]);
   }`);
                
                // Step 4: Register handler
                console.log('\n   4️⃣  Register handler:');
                console.log(`
   elementHandlerRegistry.register({
       elementNames: ['${element}'],
       namespace: '${example.namespace}',
       priority: 100,
       handler: function(element, messages, options) {
           // Your conversion logic here
           return convert${this.pascalCase(example.localName)}(element, messages, options);
       }
   });`);
                
                console.log('\n   ' + '─'.repeat(40));
            }
        });
    }

    createCustomHandlerExamples() {
        console.log('\n🔧 Quick Custom Handler Examples');
        console.log('═'.repeat(60));
        
        const unrecognized = Array.from(this.unrecognizedElements.keys());
        if (unrecognized.length === 0) return;
        
        console.log('\nOption 1: Simple Text Extraction Handler');
        console.log('─'.repeat(40));
        console.log(`
const mammoth = require('mammoth');

// Extract text from any unrecognized element
mammoth.handlers.registerFallback(function(element, messages, options) {
    const text = extractTextContent(element);
    if (text) {
        return [mammoth.Html.text(text)];
    }
    return [];
});

function extractTextContent(element) {
    if (element.value) return element.value;
    if (element.children) {
        return element.children.map(extractTextContent).join(' ');
    }
    return '';
}`);

        console.log('\nOption 2: Specific Element Handlers');
        console.log('─'.repeat(40));
        
        unrecognized.slice(0, 3).forEach(element => {
            const example = this.elementExamples.get(element);
            if (!example) return;
            
            console.log(`
// Handler for ${element}
mammoth.handlers.register({
    elementNames: ['${element}'],
    handler: function(element, messages, options) {
        // Option A: Convert to a div with class
        return [mammoth.Html.freshElement('div', {
            'class': '${example.localName.toLowerCase()}',
            'data-type': '${element}'
        }, processChildren(element.children, messages, options))];
        
        // Option B: Extract and display as text
        // return [mammoth.Html.text('[${example.localName}: ' + element.value + ']')];
        
        // Option C: Skip entirely
        // return [];
    }
});`);
        });

        console.log('\nOption 3: Advanced Handler with Attributes');
        console.log('─'.repeat(40));
        console.log(`
// Advanced handler that preserves attributes
mammoth.handlers.register({
    elementNames: ['w:sdt', 'w:customXml'],
    handler: function(element, messages, options) {
        const attributes = {};
        
        // Preserve useful attributes as data attributes
        if (element.attributes) {
            Object.keys(element.attributes).forEach(key => {
                const safeKey = key.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                attributes['data-' + safeKey] = element.attributes[key];
            });
        }
        
        // Recursively process children
        const children = element.children ? 
            processChildren(element.children, messages, options) : [];
        
        return [mammoth.Html.freshElement('div', attributes, children)];
    }
});

function processChildren(children, messages, options) {
    if (!children) return [];
    return children.flatMap(child => 
        elementToHtml(child, messages, options)
    );
}`);

        // Save complete analysis report
        const reportPath = path.join(path.dirname(this.docxPath), 
            `${path.basename(this.docxPath, '.docx')}_element_analysis.json`);
        
        const report = {
            document: this.docName,
            timestamp: new Date().toISOString(),
            statistics: {
                totalElements: this.elementFrequency.size,
                totalNamespaces: this.namespaces.size,
                unrecognizedElements: this.unrecognizedElements.size
            },
            namespaces: Array.from(this.namespaces),
            unrecognizedElements: Array.from(this.unrecognizedElements.entries()).map(([name, data]) => ({
                name,
                frequency: data.frequency,
                warning: data.warning,
                example: this.elementExamples.get(name)
            })),
            allElements: Array.from(this.elementFrequency.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({name, count}))
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n\n📊 Complete analysis saved to: ${reportPath}`);
    }

    // Helper methods
    camelCase(str) {
        return str.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase())
                  .replace(/^[A-Z]/, (g) => g.toLowerCase());
    }

    pascalCase(str) {
        const camel = this.camelCase(str);
        return camel.charAt(0).toUpperCase() + camel.slice(1);
    }
}

// Main CLI
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
mammoth.js Element Inspector
════════════════════════════════════════════════════════════

Usage: node element-inspector.js <document.docx>

This tool helps you:
  • Identify all XML elements in a Word document
  • Find unsupported elements that mammoth.js doesn't recognize
  • Generate implementation guides for adding support
  • Create custom handler examples

Example:
  node element-inspector.js ~/Documents/complex-document.docx

The tool will generate:
  • Console output with analysis and implementation guides
  • JSON report with complete element inventory
  • Custom handler code examples
        `);
        process.exit(0);
    }
    
    const docPath = args[0];
    
    if (!fs.existsSync(docPath)) {
        console.error(`❌ Error: File not found: ${docPath}`);
        process.exit(1);
    }
    
    if (!docPath.toLowerCase().endsWith('.docx')) {
        console.error(`❌ Error: File must be a .docx document`);
        process.exit(1);
    }
    
    try {
        const inspector = new ElementInspector(docPath);
        await inspector.inspectDocument();
        
        console.log('\n✅ Analysis complete!');
        console.log('\nNext steps:');
        console.log('1. Review the generated JSON report for complete element inventory');
        console.log('2. Use the implementation guides to add support for missing elements');
        console.log('3. Test your custom handlers with the test-conversion.js tool');
        
    } catch (error) {
        console.error(`\n❌ Error during inspection: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ElementInspector;