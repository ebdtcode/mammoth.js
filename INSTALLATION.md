# Installation & Usage Guide - mammoth.js Enhanced Version

## Table of Contents
- [Installation Methods](#installation-methods)
- [Quick Start](#quick-start)
- [New Features Usage](#new-features-usage)
- [Migration from Standard Version](#migration-from-standard-version)
- [Building from Source](#building-from-source)
- [Testing Your Installation](#testing-your-installation)

## Installation Methods

### Method 1: Direct from GitHub (Recommended for Latest Features)

```bash
# Clone the enhanced repository
git clone https://github.com/yourusername/mammoth.js.git
cd mammoth.js

# Install dependencies
npm install

# Build the browser version (optional)
npm run prepare

# Link globally for CLI usage
npm link
```

### Method 2: Local NPM Package

```bash
# From the mammoth.js directory, create a package
npm pack

# This creates mammoth-1.11.0.tgz
# Install in your project
npm install /path/to/mammoth-1.11.0.tgz
```

### Method 3: Direct Dependency in package.json

```json
{
  "dependencies": {
    "mammoth": "file:../path/to/mammoth.js"
  }
}
```

Then run:
```bash
npm install
```

### Method 4: Git Submodule (for development)

```bash
# Add as submodule
git submodule add https://github.com/yourusername/mammoth.js.git lib/mammoth

# Use in your code
const mammoth = require('./lib/mammoth/lib/index');
```

## Quick Start

### Basic Usage

```javascript
const mammoth = require('mammoth');

// Simple conversion with security enabled by default
mammoth.convertToHtml({path: "document.docx"})
    .then(result => {
        console.log(result.value); // HTML output
        console.log(result.messages); // Warnings
    })
    .catch(error => console.error(error));
```

### Command Line Usage

```bash
# Basic conversion
mammoth document.docx output.html

# With security options
mammoth document.docx --output output.html --security strict

# Extract images
mammoth document.docx --output-dir ./output/

# With custom style map
mammoth document.docx --style-map custom-styles.txt
```

## New Features Usage

### 1. Security Configuration

```javascript
const mammoth = require('mammoth');

// Strict security (HTTPS only)
mammoth.convertToHtml(
    {path: "untrusted.docx"},
    {
        security: {
            level: 'strict',
            allowedProtocols: ['https:', 'mailto:'],
            customSanitizer: (url) => {
                // Additional custom validation
                if (url.includes('tracking')) {
                    return '#'; // Block tracking URLs
                }
                return url;
            }
        }
    }
);

// Standard security (default)
mammoth.convertToHtml({path: "document.docx"});

// Disable security (only for trusted content!)
mammoth.convertToHtml(
    {path: "trusted.docx"},
    {security: false}
);
```

### 2. Custom Element Handlers

```javascript
const mammoth = require('mammoth');

// Register handler for content controls
mammoth.handlers.register({
    elementNames: ['w:sdt'],
    namespace: 'w',
    priority: 150,
    handler: function(element, messages, options) {
        const props = element.first('w:sdtPr');
        const content = element.first('w:sdtContent');
        const alias = props?.first('w:alias')?.attributes?.['w:val'];
        
        return [mammoth.Html.freshElement('div', {
            'class': 'content-control',
            'data-alias': alias
        }, processChildren(content))];
    }
});

// Register fallback for all unknown elements
mammoth.handlers.registerFallback(function(element, messages, options) {
    return [mammoth.Html.text(`[${element.name}]`)];
});

// Convert with custom handlers
mammoth.convertToHtml({path: "document.docx"})
    .then(result => console.log(result.value));
```

### 3. Enhanced Table Support

```javascript
mammoth.convertToHtml(
    {path: "tables.docx"},
    {
        tables: {
            preserveBorders: true,
            preserveBackground: true,
            preserveAlignment: true,
            preserveWidth: true,
            cssMode: 'inline', // or 'classes'
            borderCollapse: true
        }
    }
);
```

### 4. Advanced Style Mappings

```javascript
// Programmatic style mappings
const styleMap = [
    "p[style-name='Title'] => h1.document-title",
    "p[style-name='Subtitle'] => h2.document-subtitle",
    "p[style-name='Code Block'] => pre.code-block",
    "r[style-name='Code'] => code.inline-code",
    "p[style-name='Quote'] => blockquote.quote",
    // New: Custom element mappings
    "sdt[alias='author'] => span.author-name",
    "field[type='DATE'] => time.document-date"
];

mammoth.convertToHtml(
    {path: "document.docx"},
    {styleMap: styleMap}
);
```

### 5. Image Handling Options

```javascript
// Extract images to files
const imageIndex = {current: 0};

mammoth.convertToHtml(
    {path: "document.docx"},
    {
        convertImage: mammoth.images.imgElement(function(element) {
            imageIndex.current++;
            const extension = element.contentType.split('/')[1];
            const filename = `image_${imageIndex.current}.${extension}`;
            
            return element.read().then(function(imageBuffer) {
                require('fs').writeFileSync(`./images/${filename}`, imageBuffer);
                return {
                    src: `images/${filename}`,
                    alt: element.altText || 'Image'
                };
            });
        })
    }
);
```

### 6. Document Matcher Registry

```javascript
// Register custom matchers for style mappings
mammoth.styleReader.registerMatcher('custom-field', function(options) {
    return {
        matches: function(element) {
            return element.type === 'field' && 
                   element.fieldType === options.fieldType;
        }
    };
});

// Use in style map
const styleMap = [
    "custom-field[fieldType='author'] => span.author"
];
```

## Migration from Standard Version

### Step 1: Backup Current Implementation
```bash
# Backup current node_modules
cp -r node_modules/mammoth node_modules/mammoth-backup
```

### Step 2: Install Enhanced Version
```bash
# Remove old version
npm uninstall mammoth

# Install enhanced version
npm install /path/to/enhanced-mammoth.js
```

### Step 3: Update Code for New Features

```javascript
// Old code
mammoth.convertToHtml({path: "document.docx"})
    .then(result => {
        // Manual URL checking needed
        const html = sanitizeUrls(result.value);
        displayHtml(html);
    });

// New code - security built-in
mammoth.convertToHtml(
    {path: "document.docx"},
    {security: {level: 'strict'}}
).then(result => {
    displayHtml(result.value); // Already sanitized
});
```

### Step 4: Test Thoroughly
```bash
# Run test suite
npm test

# Test your specific documents
node test-suite/test-conversion.js your-document.docx
```

## Building from Source

### Prerequisites
```bash
# Ensure you have Node.js 12+ and npm
node --version  # Should be >= 12.0.0
npm --version   # Should be >= 6.0.0
```

### Build Steps

```bash
# 1. Clone repository
git clone https://github.com/yourusername/mammoth.js.git
cd mammoth.js

# 2. Install dependencies
npm install

# 3. Run tests to verify
npm test

# 4. Build browser version
make mammoth.browser.min.js
# or
npm run prepare

# 5. Create distribution package
npm pack
```

### Custom Build Configuration

Create `build-config.js`:
```javascript
module.exports = {
    // Include only specific features
    features: {
        security: true,
        customHandlers: true,
        enhancedTables: true,
        styleRegistry: true
    },
    // Optimization settings
    optimize: {
        minify: true,
        removeComments: true,
        bundleSize: 'minimal'
    }
};
```

Build with config:
```bash
node build.js --config build-config.js
```

## Testing Your Installation

### 1. Basic Functionality Test

```javascript
// test-installation.js
const mammoth = require('mammoth');

console.log('Testing mammoth.js installation...\n');

// Check version and features
console.log('✓ Module loaded successfully');

// Test security feature
if (mammoth.security) {
    console.log('✓ Security features available');
}

// Test handlers
if (mammoth.handlers) {
    console.log('✓ Custom handlers available');
}

// Test basic conversion
mammoth.convertToHtml({
    path: 'test/test-data/simple.docx'
}).then(result => {
    console.log('✓ Basic conversion works');
    console.log(`  HTML length: ${result.value.length}`);
}).catch(error => {
    console.log('✗ Basic conversion failed:', error.message);
});
```

Run test:
```bash
node test-installation.js
```

### 2. Feature Test Suite

```bash
# Run comprehensive tests
cd mammoth.js
npm test

# Test specific features
node test-suite/test-conversion.js test/test-data/tables.docx
node test-suite/element-inspector.js your-document.docx
node test-suite/demo-test.js
```

### 3. Browser Testing

```html
<!DOCTYPE html>
<html>
<head>
    <title>mammoth.js Browser Test</title>
    <script src="mammoth.browser.min.js"></script>
</head>
<body>
    <input type="file" id="file" accept=".docx">
    <div id="output"></div>
    
    <script>
    document.getElementById('file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const arrayBuffer = event.target.result;
            
            mammoth.convertToHtml({
                arrayBuffer: arrayBuffer
            }, {
                security: {level: 'strict'}
            }).then(result => {
                document.getElementById('output').innerHTML = result.value;
                console.log('Warnings:', result.messages);
            }).catch(console.error);
        };
        
        reader.readAsArrayBuffer(file);
    });
    </script>
</body>
</html>
```

## Project Integration Examples

### Express.js Server

```javascript
const express = require('express');
const mammoth = require('mammoth');
const multer = require('multer');

const app = express();
const upload = multer({dest: 'uploads/'});

app.post('/convert', upload.single('document'), async (req, res) => {
    try {
        const result = await mammoth.convertToHtml(
            {path: req.file.path},
            {
                security: {level: 'strict'},
                tables: {preserveFormatting: true}
            }
        );
        
        res.json({
            html: result.value,
            warnings: result.messages
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

app.listen(3000);
```

### React Component

```jsx
import React, {useState} from 'react';
import mammoth from 'mammoth';

function DocxConverter() {
    const [html, setHtml] = useState('');
    const [warnings, setWarnings] = useState([]);
    
    const handleFile = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            const result = await mammoth.convertToHtml({
                arrayBuffer: event.target.result
            }, {
                security: {level: 'strict'}
            });
            
            setHtml(result.value);
            setWarnings(result.messages);
        };
        
        reader.readAsArrayBuffer(file);
    };
    
    return (
        <div>
            <input type="file" onChange={handleFile} accept=".docx" />
            <div dangerouslySetInnerHTML={{__html: html}} />
            {warnings.map((w, i) => (
                <div key={i} className="warning">{w.message}</div>
            ))}
        </div>
    );
}
```

### CLI Script

```bash
#!/usr/bin/env node
// convert-docs.js

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const inputDir = process.argv[2] || './documents';
const outputDir = process.argv[3] || './output';

fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.docx'))
    .forEach(async file => {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file.replace('.docx', '.html'));
        
        const result = await mammoth.convertToHtml({path: inputPath});
        fs.writeFileSync(outputPath, result.value);
        
        console.log(`✓ Converted: ${file}`);
    });
```

## Troubleshooting

### Common Issues

**Issue**: Module not found
```bash
# Solution: Ensure correct path
npm list mammoth  # Check installation
npm link  # If using local development
```

**Issue**: Security blocking legitimate URLs
```javascript
// Solution: Adjust security level
{security: {level: 'permissive'}}
// Or add to allowlist
{security: {allowedProtocols: ['http:', 'https:', 'ftp:']}}
```

**Issue**: Custom handlers not working
```javascript
// Solution: Check registration order
mammoth.handlers.register({...}); // Register BEFORE conversion
const result = await mammoth.convertToHtml(...);
```

**Issue**: Build errors
```bash
# Solution: Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run prepare
```

## Version Information

Current enhanced version: **1.11.0**

New features in this version:
- ✅ Security sanitization (default enabled)
- ✅ Custom element handlers
- ✅ Enhanced table support
- ✅ Footnote deduplication
- ✅ Style matcher registry
- ✅ XML operation completion
- ✅ CLI path security
- ✅ Reference handler abstraction

## Support

- GitHub Issues: [Report bugs or request features]
- Documentation: See `/docs` directory
- Examples: See `/examples` directory
- Test Suite: See `/test-suite` directory

---

Ready to use mammoth.js with all enhanced features!