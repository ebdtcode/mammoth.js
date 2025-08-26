/**
 * Custom Element Handler Template for mammoth.js
 * 
 * This template shows how to add support for unrecognized Word elements
 */

const mammoth = require('../lib/index');
const Html = require('../lib/html');

/**
 * STEP 1: Define your custom element handlers
 */

// Handler for Structured Document Tags (Content Controls)
class SDTHandler {
    static handle(element, messages, options) {
        // Extract SDT properties
        const properties = element.first('w:sdtPr');
        const content = element.first('w:sdtContent');
        
        // Get the tag type (text, date, dropdown, etc.)
        const tagType = properties?.first('w:tag')?.attributes?.['w:val'] || 'unknown';
        const alias = properties?.first('w:alias')?.attributes?.['w:val'] || '';
        
        // Create appropriate HTML based on SDT type
        const attributes = {
            'class': 'sdt-control',
            'data-type': tagType,
            'data-alias': alias
        };
        
        // Process the content
        const children = content ? 
            processChildren(content.children, messages, options) : 
            [Html.text('[Content Control]')];
        
        return [Html.freshElement('div', attributes, children)];
    }
}

// Handler for Smart Tags
class SmartTagHandler {
    static handle(element, messages, options) {
        const tagUri = element.attributes?.['w:uri'] || '';
        const tagElement = element.attributes?.['w:element'] || '';
        
        // Smart tags typically wrap content
        const children = processChildren(element.children, messages, options);
        
        return [Html.freshElement('span', {
            'class': 'smart-tag',
            'data-uri': tagUri,
            'data-element': tagElement
        }, children)];
    }
}

// Handler for Track Changes (Insertions/Deletions)
class TrackChangesHandler {
    static handleInsertion(element, messages, options) {
        const author = element.attributes?.['w:author'] || 'Unknown';
        const date = element.attributes?.['w:date'] || '';
        
        const children = processChildren(element.children, messages, options);
        
        return [Html.freshElement('ins', {
            'class': 'track-insert',
            'data-author': author,
            'data-date': date,
            'title': `Inserted by ${author} on ${date}`
        }, children)];
    }
    
    static handleDeletion(element, messages, options) {
        const author = element.attributes?.['w:author'] || 'Unknown';
        const date = element.attributes?.['w:date'] || '';
        
        const children = processChildren(element.children, messages, options);
        
        return [Html.freshElement('del', {
            'class': 'track-delete',
            'data-author': author,
            'data-date': date,
            'title': `Deleted by ${author} on ${date}`
        }, children)];
    }
}

// Handler for Fields (Page numbers, dates, etc.)
class FieldHandler {
    static handle(element, messages, options) {
        // Simple fields have instruction text
        const instruction = element.attributes?.['w:instr'] || '';
        
        // Parse field code
        const fieldType = this.parseFieldType(instruction);
        
        switch (fieldType) {
            case 'PAGE':
                return [Html.text('[Page Number]')];
            case 'NUMPAGES':
                return [Html.text('[Total Pages]')];
            case 'DATE':
                return [Html.text('[Current Date]')];
            case 'TIME':
                return [Html.text('[Current Time]')];
            case 'AUTHOR':
                return [Html.text('[Author]')];
            case 'TOC':
                return this.createTOCPlaceholder();
            default:
                return [Html.text(`[Field: ${fieldType}]`)];
        }
    }
    
    static parseFieldType(instruction) {
        const match = instruction.match(/^\s*(\w+)/);
        return match ? match[1].toUpperCase() : 'UNKNOWN';
    }
    
    static createTOCPlaceholder() {
        return [Html.freshElement('div', {
            'class': 'toc-placeholder',
            'style': 'border: 1px dashed #ccc; padding: 10px; margin: 10px 0;'
        }, [
            Html.freshElement('h3', {}, [Html.text('Table of Contents')]),
            Html.freshElement('p', {'style': 'font-style: italic;'}, 
                [Html.text('[TOC will be generated here]')])
        ])];
    }
}

// Handler for VML Shapes and Drawing Objects
class DrawingHandler {
    static handle(element, messages, options) {
        const elementType = element.name || element.type;
        
        if (elementType === 'v:shape') {
            return this.handleVMLShape(element, messages, options);
        } else if (elementType === 'w:drawing') {
            return this.handleDrawingML(element, messages, options);
        }
        
        return [Html.text('[Drawing Object]')];
    }
    
    static handleVMLShape(element, messages, options) {
        const style = element.attributes?.['style'] || '';
        const type = element.attributes?.['type'] || '';
        
        // Check if it contains an image
        const imageData = element.first('v:imagedata');
        if (imageData) {
            const src = imageData.attributes?.['r:id'] || '';
            return [Html.freshElement('img', {
                'src': '#' + src,
                'class': 'vml-image',
                'alt': 'VML Image'
            }, [])];
        }
        
        // Otherwise it's a shape
        return [Html.freshElement('div', {
            'class': 'vml-shape',
            'data-type': type,
            'style': this.convertVMLStyle(style)
        }, [Html.text('[Shape]')])];
    }
    
    static handleDrawingML(element, messages, options) {
        // DrawingML is more complex, look for inline or anchor
        const inline = element.first('wp:inline');
        const anchor = element.first('wp:anchor');
        
        if (inline || anchor) {
            // Look for picture
            const pic = (inline || anchor).first('pic:pic');
            if (pic) {
                return [Html.freshElement('div', {
                    'class': 'drawing-picture'
                }, [Html.text('[Picture]')])];
            }
            
            // Look for chart
            const chart = (inline || anchor).first('c:chart');
            if (chart) {
                return [Html.freshElement('div', {
                    'class': 'drawing-chart'
                }, [Html.text('[Chart]')])];
            }
        }
        
        return [Html.text('[Drawing]')];
    }
    
    static convertVMLStyle(vmlStyle) {
        // Convert VML style to CSS
        const styles = {};
        const parts = vmlStyle.split(';');
        
        parts.forEach(part => {
            const [key, value] = part.split(':').map(s => s.trim());
            if (key && value) {
                // Convert some common VML properties
                switch(key) {
                    case 'width':
                    case 'height':
                        styles[key] = value;
                        break;
                    case 'position':
                        if (value === 'absolute') {
                            styles.position = 'relative';
                        }
                        break;
                }
            }
        });
        
        return Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join('; ');
    }
}

// Handler for Custom XML
class CustomXMLHandler {
    static handle(element, messages, options) {
        const uri = element.attributes?.['w:uri'] || '';
        const elementName = element.attributes?.['w:element'] || 'custom';
        
        // Process children
        const children = processChildren(element.children, messages, options);
        
        return [Html.freshElement('div', {
            'class': 'custom-xml',
            'data-uri': uri,
            'data-element': elementName
        }, children)];
    }
}

// Handler for Math elements
class MathElementHandler {
    static handle(element, messages, options) {
        const elementType = element.name || element.type;
        
        if (elementType === 'math:oMath' || elementType === 'm:oMath') {
            return this.handleOfficeMath(element, messages, options);
        }
        
        return [Html.text('[Math Expression]')];
    }
    
    static handleOfficeMath(element, messages, options) {
        // Try to extract text representation
        const text = this.extractMathText(element);
        
        return [Html.freshElement('span', {
            'class': 'math-expression',
            'data-type': 'office-math'
        }, [Html.text(text || '[Math]')])];
    }
    
    static extractMathText(element) {
        // Recursively extract text from math elements
        if (element.value) return element.value;
        if (element.children) {
            return element.children.map(child => this.extractMathText(child)).join('');
        }
        return '';
    }
}

/**
 * STEP 2: Register all handlers with mammoth.js
 */

function registerCustomHandlers() {
    console.log('📝 Registering custom element handlers...');
    
    // Structured Document Tags
    mammoth.handlers.register({
        elementNames: ['w:sdt'],
        namespace: 'w',
        priority: 150,
        description: 'Structured Document Tags (Content Controls)',
        handler: SDTHandler.handle
    });
    
    // Smart Tags
    mammoth.handlers.register({
        elementNames: ['w:smartTag'],
        namespace: 'w',
        priority: 140,
        description: 'Smart Tags',
        handler: SmartTagHandler.handle
    });
    
    // Track Changes - Insertions
    mammoth.handlers.register({
        elementNames: ['w:ins'],
        namespace: 'w',
        priority: 160,
        description: 'Track Changes - Insertions',
        handler: TrackChangesHandler.handleInsertion
    });
    
    // Track Changes - Deletions
    mammoth.handlers.register({
        elementNames: ['w:del'],
        namespace: 'w',
        priority: 160,
        description: 'Track Changes - Deletions',
        handler: TrackChangesHandler.handleDeletion
    });
    
    // Simple Fields
    mammoth.handlers.register({
        elementNames: ['w:fldSimple'],
        namespace: 'w',
        priority: 130,
        description: 'Simple Fields',
        handler: FieldHandler.handle
    });
    
    // VML Shapes
    mammoth.handlers.register({
        elementNames: ['v:shape', 'v:rect', 'v:oval', 'v:line'],
        namespace: 'v',
        priority: 120,
        description: 'VML Shapes',
        handler: DrawingHandler.handle
    });
    
    // DrawingML
    mammoth.handlers.register({
        elementNames: ['w:drawing'],
        namespace: 'w',
        priority: 120,
        description: 'DrawingML Objects',
        handler: DrawingHandler.handle
    });
    
    // Custom XML
    mammoth.handlers.register({
        elementNames: ['w:customXml'],
        namespace: 'w',
        priority: 110,
        description: 'Custom XML',
        handler: CustomXMLHandler.handle
    });
    
    // Math
    mammoth.handlers.register({
        elementNames: ['math:oMath', 'm:oMath', 'math:oMathPara', 'm:oMathPara'],
        namespace: 'math',
        priority: 140,
        description: 'Mathematical Expressions',
        handler: MathElementHandler.handle
    });
    
    // Fallback handler for any remaining unrecognized elements
    mammoth.handlers.registerFallback(function(element, messages, options) {
        const elementName = element.name || element.type || 'unknown';
        
        // Log for debugging
        console.log(`  ⚠️  Unhandled element: ${elementName}`);
        
        // Try to extract text content
        const text = extractTextContent(element);
        if (text && text.trim()) {
            return [Html.freshElement('span', {
                'class': 'unhandled-element',
                'data-element': elementName
            }, [Html.text(text)])];
        }
        
        // Skip empty elements
        return [];
    }, 0);
    
    console.log('✅ Custom handlers registered successfully!\n');
}

/**
 * STEP 3: Helper functions
 */

function processChildren(children, messages, options) {
    if (!children || !Array.isArray(children)) return [];
    
    // This would normally call mammoth's internal converter
    // For demonstration, we'll return text content
    return children.map(child => {
        if (typeof child === 'string') {
            return Html.text(child);
        }
        // In real implementation, this would recursively process
        return Html.text(extractTextContent(child));
    });
}

function extractTextContent(element) {
    if (!element) return '';
    if (typeof element === 'string') return element;
    if (element.value) return element.value;
    if (element.children && Array.isArray(element.children)) {
        return element.children.map(extractTextContent).join('');
    }
    return '';
}

/**
 * STEP 4: Test the custom handlers
 */

async function testCustomHandlers(docPath) {
    console.log('🧪 Testing custom handlers with document...\n');
    
    // Register handlers
    registerCustomHandlers();
    
    // Convert document
    try {
        const result = await mammoth.convertToHtml({path: docPath});
        
        console.log('📊 Conversion Results:');
        console.log('─'.repeat(40));
        console.log(`  HTML length: ${result.value.length} characters`);
        console.log(`  Warnings: ${result.messages.length}`);
        
        // Check for custom elements in output
        const customElements = {
            'sdt-control': (result.value.match(/class="sdt-control"/g) || []).length,
            'smart-tag': (result.value.match(/class="smart-tag"/g) || []).length,
            'track-insert': (result.value.match(/class="track-insert"/g) || []).length,
            'track-delete': (result.value.match(/class="track-delete"/g) || []).length,
            'vml-shape': (result.value.match(/class="vml-shape"/g) || []).length,
            'custom-xml': (result.value.match(/class="custom-xml"/g) || []).length,
            'math-expression': (result.value.match(/class="math-expression"/g) || []).length
        };
        
        console.log('\n  Custom elements handled:');
        Object.entries(customElements).forEach(([type, count]) => {
            if (count > 0) {
                console.log(`    ✓ ${type}: ${count}`);
            }
        });
        
        // Save output
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(
            path.dirname(docPath),
            path.basename(docPath, '.docx') + '_custom_handlers.html'
        );
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Custom Handlers Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .sdt-control { border: 1px dashed #4CAF50; padding: 2px; background: #E8F5E9; }
        .smart-tag { border-bottom: 1px dotted #2196F3; }
        .track-insert { background: #C8E6C9; text-decoration: underline; }
        .track-delete { background: #FFCDD2; text-decoration: line-through; }
        .vml-shape { border: 1px solid #FF9800; padding: 5px; display: inline-block; }
        .custom-xml { border: 1px solid #9C27B0; padding: 2px; }
        .math-expression { font-family: 'Courier New', monospace; background: #F5F5F5; padding: 2px; }
        .unhandled-element { color: #666; font-style: italic; }
        .toc-placeholder { background: #FAFAFA; }
    </style>
</head>
<body>
    <h1>Custom Handlers Test Output</h1>
    <div style="border: 1px solid #ddd; padding: 10px; margin: 20px 0;">
        ${result.value}
    </div>
    <div style="margin-top: 20px; padding: 10px; background: #F5F5F5;">
        <h3>Legend:</h3>
        <p><span class="sdt-control">Green dashed border</span> = Content Control</p>
        <p><span class="smart-tag">Blue dotted underline</span> = Smart Tag</p>
        <p><span class="track-insert">Green background</span> = Insertion (Track Changes)</p>
        <p><span class="track-delete">Red strikethrough</span> = Deletion (Track Changes)</p>
        <p><span class="vml-shape">Orange border</span> = Shape/Drawing</p>
        <p><span class="custom-xml">Purple border</span> = Custom XML</p>
        <p><span class="math-expression">Gray background</span> = Math Expression</p>
    </div>
</body>
</html>`;
        
        fs.writeFileSync(outputPath, html);
        console.log(`\n📁 Output saved to: ${outputPath}`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Custom Element Handler Template
════════════════════════════════════════════════════════════

Usage: node custom-handler-template.js <document.docx>

This template demonstrates how to:
  • Create handlers for common unsupported elements
  • Register handlers with mammoth.js
  • Process and convert custom elements
  • Test your handlers

Supported elements in this template:
  • Structured Document Tags (w:sdt)
  • Smart Tags (w:smartTag)
  • Track Changes (w:ins, w:del)
  • Fields (w:fldSimple)
  • VML Shapes (v:shape)
  • DrawingML (w:drawing)
  • Custom XML (w:customXml)
  • Math (math:oMath)

Example:
  node custom-handler-template.js ~/Documents/document.docx
        `);
        process.exit(0);
    }
    
    const docPath = args[0];
    testCustomHandlers(docPath).catch(console.error);
}

module.exports = {
    registerCustomHandlers,
    SDTHandler,
    SmartTagHandler,
    TrackChangesHandler,
    FieldHandler,
    DrawingHandler,
    CustomXMLHandler,
    MathElementHandler
};