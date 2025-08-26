#!/usr/bin/env node

const mammoth = require('./lib/index');

// Custom element handlers for Word table and drawing elements
const customElementHandlers = [
    {
        elementNames: ['w:tblPr'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 10,
        description: 'Table properties - preserve as data attributes',
        handler: function(element, messages, options) {
            // Extract table properties and preserve them
            const props = {};
            element.children.forEach(child => {
                if (child.name === 'w:tblStyle') {
                    props.style = child.attributes['w:val'];
                } else if (child.name === 'w:tblW') {
                    props.width = child.attributes['w:w'];
                } else if (child.name === 'w:jc') {
                    props.alignment = child.attributes['w:val'];
                }
            });
            
            return [mammoth.Html.element('div', {
                class: 'table-properties',
                'data-table-props': JSON.stringify(props)
            }, [])];
        }
    },
    {
        elementNames: ['w:tblGrid'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 10,
        description: 'Table grid definition - preserve column information',
        handler: function(element, messages, options) {
            const cols = element.children
                .filter(child => child.name === 'w:gridCol')
                .map(col => col.attributes['w:w']);
            
            return [mammoth.Html.element('colgroup', {}, 
                cols.map(width => mammoth.Html.element('col', {
                    style: width ? `width: ${width}px` : undefined
                }, []))
            )];
        }
    },
    {
        elementNames: ['w:trPr'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 10,
        description: 'Table row properties - preserve as CSS',
        handler: function(element, messages, options) {
            const style = {};
            element.children.forEach(child => {
                if (child.name === 'w:trHeight') {
                    style.height = child.attributes['w:val'] + 'px';
                } else if (child.name === 'w:jc') {
                    style.textAlign = child.attributes['w:val'];
                }
            });
            
            const styleStr = Object.entries(style)
                .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
                .join('; ');
            
            return styleStr ? [mammoth.Html.element('div', {
                class: 'row-properties',
                style: styleStr
            }, [])] : [];
        }
    },
    {
        elementNames: ['w:tcPr'],
        namespace: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        priority: 10,
        description: 'Table cell properties - preserve formatting',
        handler: function(element, messages, options) {
            const style = {};
            const classes = ['table-cell'];
            
            element.children.forEach(child => {
                if (child.name === 'w:tcW') {
                    style.width = child.attributes['w:w'] + 'px';
                } else if (child.name === 'w:gridSpan') {
                    style.colspan = child.attributes['w:val'];
                } else if (child.name === 'w:vAlign') {
                    style.verticalAlign = child.attributes['w:val'];
                } else if (child.name === 'w:shd') {
                    style.backgroundColor = '#' + child.attributes['w:fill'];
                }
            });
            
            const styleStr = Object.entries(style)
                .filter(([key, value]) => key !== 'colspan')
                .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
                .join('; ');
            
            return [mammoth.Html.element('div', {
                class: classes.join(' '),
                style: styleStr || undefined,
                colspan: style.colspan || undefined
            }, [])];
        }
    },
    {
        elementNames: ['v:path', 'v:line'],
        namespace: 'urn:schemas-microsoft-com:vml',
        priority: 5,
        description: 'VML drawing elements - convert to SVG or CSS',
        handler: function(element, messages, options) {
            // Convert VML to basic SVG or styled div
            if (element.name === 'v:line') {
                return [mammoth.Html.element('hr', {
                    class: 'vml-line',
                    style: 'border: 1px solid #000; margin: 10px 0;'
                }, [])];
            } else if (element.name === 'v:path') {
                return [mammoth.Html.element('div', {
                    class: 'vml-path',
                    style: 'border: 1px dashed #ccc; padding: 5px; margin: 5px 0;',
                    title: 'Vector drawing element'
                }, [mammoth.Html.text('[Vector Drawing]')])];
            }
            return [];
        }
    },
    {
        elementNames: ['{urn:schemas-microsoft-com:office:office}lock'],
        priority: 1,
        description: 'Office lock elements - ignore safely',
        handler: function(element, messages, options) {
            // These are metadata elements, safe to ignore
            return [];
        }
    }
];

// Style mappings for unrecognized paragraph styles
const styleMap = [
    // Title styles
    "p[style-name='Title'] => h1.document-title:fresh",
    "p[style-name='title'] => h1.document-title:fresh",
    
    // Body text variations
    "p[style-name='Body Text'] => p.body-text",
    "p[style-name='BodyText'] => p.body-text",
    "p[style-name='body text'] => p.body-text",
    
    // Additional heading levels
    "p[style-name='heading 8'] => h6.heading-8",
    "p[style-name='Heading8'] => h6.heading-8",
    "p[style-name='Heading 8'] => h6.heading-8",
    
    // Table paragraph
    "p[style-name='Table Paragraph'] => p.table-paragraph",
    "p[style-name='TableParagraph'] => p.table-paragraph",
    
    // Common additional styles
    "p[style-name='Caption'] => p.caption",
    "p[style-name='Quote'] => blockquote.quote",
    "p[style-name='Intense Quote'] => blockquote.intense-quote",
    "p[style-name='List Paragraph'] => p.list-paragraph",
    "p[style-name='Footer'] => p.footer-text",
    "p[style-name='Header'] => p.header-text"
];

// Enhanced conversion function
async function convertDocument(inputPath, outputPath, options = {}) {
    console.log(`Converting ${inputPath} to ${outputPath}...`);
    
    try {
        // Register custom handlers
        customElementHandlers.forEach(handler => {
            mammoth.handlers.register(handler);
        });
        
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: styleMap,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false,
            security: {
                level: 'standard'
            },
            tables: {
                preserveBorders: true,
                preserveBackground: true,
                preserveAlignment: true,
                cssMode: 'inline'
            },
            transformDocument: function(document) {
                // Additional document transformations
                return document;
            }
        });
        
        // Enhanced HTML with CSS
        const enhancedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Converted Document</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .document-title { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .body-text { margin: 15px 0; }
        .table-paragraph { margin: 8px 0; }
        .heading-8 { font-size: 0.9em; font-weight: bold; color: #7f8c8d; }
        .table-properties { display: none; } /* Metadata, hidden */
        .row-properties { display: contents; } /* Pass-through */
        .table-cell { display: table-cell; }
        .vml-line { border-color: #bdc3c7; }
        .vml-path { background: #ecf0f1; font-style: italic; }
        .caption { font-style: italic; font-size: 0.9em; color: #666; }
        .quote { border-left: 4px solid #3498db; padding-left: 20px; margin: 20px 0; }
        .intense-quote { border-left: 4px solid #e74c3c; padding-left: 20px; margin: 20px 0; font-weight: bold; }
        .list-paragraph { margin-left: 20px; }
        .footer-text, .header-text { font-size: 0.9em; color: #7f8c8d; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        td, th { border: 1px solid #ddd; padding: 8px; }
    </style>
</head>
<body>
${result.value}
</body>
</html>`;
        
        require('fs').writeFileSync(outputPath, enhancedHtml);
        
        console.log('✅ Conversion completed successfully!');
        console.log(`📄 Output saved to: ${outputPath}`);
        
        if (result.messages && result.messages.length > 0) {
            console.log('\n📋 Processing notes:');
            result.messages.forEach(message => {
                const icon = message.type === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`  ${icon} ${message.message}`);
            });
        } else {
            console.log('🎉 No warnings - all elements processed successfully!');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node mammoth-config.js <input.docx> <output.html>');
        process.exit(1);
    }
    
    convertDocument(args[0], args[1]).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}

module.exports = { convertDocument, customElementHandlers, styleMap };