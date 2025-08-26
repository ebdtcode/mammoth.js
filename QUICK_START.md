# Quick Start Guide - Enhanced mammoth.js

Get up and running with enhanced mammoth.js in minutes!

## 🚀 Installation

### Option 1: Automated Installer (Recommended)
```bash
git clone https://github.com/yourusername/mammoth.js.git
cd mammoth.js
node install.js
```

### Option 2: Manual Setup
```bash
git clone https://github.com/yourusername/mammoth.js.git
cd mammoth.js
npm install
npm test  # Verify installation
```

### Option 3: Use in Existing Project
```bash
npm install /path/to/enhanced-mammoth.js
```

## 📄 Basic Usage

### Simple Document Conversion
```javascript
const mammoth = require('mammoth');

// Basic conversion (security enabled by default)
mammoth.convertToHtml({path: "document.docx"})
    .then(result => {
        console.log(result.value); // HTML output
        console.log(result.messages); // Any warnings
    });
```

### Command Line Usage
```bash
# Basic conversion
mammoth document.docx output.html

# With enhanced features
mammoth document.docx --output-dir ./output/ --security strict
```

## 🔒 Security Features (NEW!)

```javascript
// Strict security (HTTPS only)
mammoth.convertToHtml({path: "untrusted.docx"}, {
    security: {
        level: 'strict',
        allowedProtocols: ['https:', 'mailto:']
    }
});

// Custom URL sanitizer
mammoth.convertToHtml({path: "document.docx"}, {
    security: {
        customSanitizer: (url) => {
            if (url.includes('tracking')) return '#';
            return url;
        }
    }
});
```

## 📊 Enhanced Tables (NEW!)

```javascript
// Preserve table formatting
mammoth.convertToHtml({path: "tables.docx"}, {
    tables: {
        preserveBorders: true,
        preserveBackground: true,
        preserveAlignment: true,
        cssMode: 'inline'
    }
});
```

## 🔧 Custom Element Handlers (NEW!)

```javascript
// Handle content controls
mammoth.handlers.register({
    elementNames: ['w:sdt'],
    handler: function(element, messages, options) {
        return [mammoth.Html.freshElement('div', {
            class: 'content-control'
        }, [mammoth.Html.text('[Form Field]')])];
    }
});

// Fallback for all unknown elements
mammoth.handlers.registerFallback(function(element, messages, options) {
    return [mammoth.Html.text(`[${element.name}]`)];
});
```

## 🖼️ Advanced Image Handling

```javascript
// Extract images to files
let imageIndex = 0;
mammoth.convertToHtml({path: "document.docx"}, {
    convertImage: mammoth.images.imgElement(function(element) {
        imageIndex++;
        const filename = `image_${imageIndex}.png`;
        
        return element.read().then(function(imageBuffer) {
            require('fs').writeFileSync(`./images/${filename}`, imageBuffer);
            return {src: `images/${filename}`};
        });
    })
});
```

## 🎨 Advanced Style Mappings

```javascript
const styleMap = [
    "p[style-name='Title'] => h1.document-title",
    "p[style-name='Code Block'] => pre.code-block",
    "r[style-name='Emphasis'] => em.highlight"
];

mammoth.convertToHtml({path: "document.docx"}, {
    styleMap: styleMap
});
```

## 🧪 Testing Your Documents

```bash
# Comprehensive test
node test-suite/test-conversion.js your-document.docx

# Quick test
node test-suite/test-conversion.js your-document.docx --quick

# Security-focused test
node test-suite/test-conversion.js your-document.docx --security

# Find unsupported elements
node test-suite/element-inspector.js your-document.docx
```

## 📊 Real-World Example

```javascript
const mammoth = require('mammoth');
const fs = require('fs');

async function convertDocument() {
    try {
        // Convert with all enhanced features
        const result = await mammoth.convertToHtml({
            path: 'complex-document.docx'
        }, {
            // Security configuration
            security: {
                level: 'standard',
                customSanitizer: (url) => {
                    // Block tracking URLs
                    if (url.includes('tracking')) return '#';
                    return url;
                }
            },
            
            // Enhanced tables
            tables: {
                preserveBorders: true,
                preserveBackground: true,
                preserveAlignment: true
            },
            
            // Custom styles
            styleMap: [
                "p[style-name='Important'] => div.alert",
                "p[style-name='Code'] => pre.code-block"
            ]
        });
        
        // Create complete HTML document
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Converted Document</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; }
        .code-block { background: #f8f9fa; padding: 15px; border-radius: 4px; }
        .content-control { border: 1px dashed #28a745; padding: 4px; background: #d4edda; }
    </style>
</head>
<body>
    ${result.value}
    
    <!-- Show warnings if any -->
    ${result.messages.length > 0 ? `
    <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h3>Conversion Notes:</h3>
        <ul>
        ${result.messages.map(msg => `<li>${msg.message}</li>`).join('')}
        </ul>
    </div>
    ` : ''}
</body>
</html>`;
        
        fs.writeFileSync('output.html', html);
        
        console.log('✅ Conversion completed!');
        console.log(`📁 Output saved to: output.html`);
        console.log(`📊 HTML size: ${(html.length / 1024).toFixed(2)} KB`);
        console.log(`⚠️  Warnings: ${result.messages.length}`);
        
        // Show warnings
        if (result.messages.length > 0) {
            console.log('\nWarnings:');
            result.messages.forEach((msg, i) => {
                console.log(`  ${i + 1}. ${msg.message}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
    }
}

// Run the conversion
convertDocument();
```

## 🌐 Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>mammoth.js Browser Example</title>
    <script src="mammoth.browser.min.js"></script>
</head>
<body>
    <input type="file" id="document" accept=".docx">
    <div id="result"></div>

    <script>
    document.getElementById('document').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            mammoth.convertToHtml({
                arrayBuffer: event.target.result
            }, {
                security: {level: 'strict'},
                tables: {preserveFormatting: true}
            })
            .then(result => {
                document.getElementById('result').innerHTML = result.value;
            })
            .catch(error => console.error('Error:', error));
        };
        
        reader.readAsArrayBuffer(file);
    });
    </script>
</body>
</html>
```

## 🔍 Troubleshooting

### Common Issues

**URLs being blocked:**
```javascript
// Solution: Adjust security level
{security: {level: 'permissive'}}
// Or add specific protocols
{security: {allowedProtocols: ['http:', 'https:', 'ftp:']}}
```

**Missing table formatting:**
```javascript
// Solution: Enable table preservation
{tables: {preserveBorders: true, preserveBackground: true}}
```

**Unknown elements ignored:**
```javascript
// Solution: Register custom handlers
mammoth.handlers.registerFallback(function(element) {
    return [mammoth.Html.text(`[${element.name}]`)];
});
```

### Getting Help

```bash
# Check installation
npm test

# Detailed element analysis
node test-suite/element-inspector.js your-document.docx

# Comprehensive testing
node test-suite/test-conversion.js your-document.docx

# View examples
node examples/usage-examples.js
```

## 📚 Next Steps

1. **Read Full Documentation:**
   - `INSTALLATION.md` - Complete installation guide
   - `FEATURES.md` - All new features
   - `CUSTOM_ELEMENTS_GUIDE.md` - Adding custom element support

2. **Explore Examples:**
   - `examples/usage-examples.js` - Comprehensive examples
   - `examples/` directory - More specific examples

3. **Test Your Documents:**
   - Use `test-suite/` tools to analyze your specific documents
   - Identify and implement handlers for unsupported elements

4. **Customize for Your Needs:**
   - Create custom element handlers
   - Set up security policies
   - Configure table formatting options

## 🚀 You're Ready!

Enhanced mammoth.js is now set up with:
- ✅ **Security by default** - XSS protection enabled
- ✅ **Enhanced tables** - Borders, backgrounds, alignment preserved  
- ✅ **Custom handlers** - Support for any Word element
- ✅ **Better footnotes** - No more duplication
- ✅ **Advanced styling** - Flexible style mappings
- ✅ **Testing tools** - Comprehensive analysis suite

Start converting your Word documents with confidence!