# New Features in mammoth.js v1.11.0

## Security Enhancements

### URL Sanitization System
A comprehensive security layer prevents XSS and injection attacks:

- **Protocol Blocking**: Automatically blocks dangerous protocols (`javascript:`, `vbscript:`, malicious `data:` URLs)
- **Safe Defaults**: HTTP, HTTPS, mailto, and tel protocols allowed by default
- **Configurable Levels**: Choose between Standard, Strict, or Permissive security
- **Custom Validators**: Add your own URL validation logic
- **Path Traversal Protection**: Prevents `../` attacks in relative URLs

### Security API
```javascript
const mammoth = require('mammoth');

// Access security features
const sanitizer = mammoth.security.createSanitizer({
    level: 'strict',
    allowedProtocols: ['https:', 'mailto:'],
    customSanitizer: (url) => {
        // Your custom validation
        return url;
    }
});

// Apply to conversion
mammoth.convertToHtml({path: "document.docx"}, {
    security: {
        level: 'strict'
    }
});
```

## Element Handler System

### Extensible Architecture
Register custom handlers for any XML element:

```javascript
// Register handler for specific elements
mammoth.handlers.register({
    elementNames: ['custom:field', 'w:customField'],
    namespace: 'custom',
    priority: 150, // Higher priority overrides built-in handlers
    handler: function(element, messages, options) {
        // Process element
        return [mammoth.Html.freshElement('div', {
            class: 'custom-field'
        }, processedContent)];
    }
});
```

### Built-in Specialized Handlers

#### TableHandler
Advanced table features:
- Merged cells (rowspan/colspan)
- Nested tables
- Complex borders and backgrounds
- Cell alignment and padding

#### DrawingHandler  
Graphical content support:
- Shapes and diagrams
- Charts (basic representation)
- SmartArt placeholders
- Drawing canvas elements

#### FieldHandler
Complex field types:
- Form fields (text, checkbox, dropdown)
- Hyperlinks with tooltips
- Table of contents placeholders
- Cross-references
- Date/time fields

#### MathHandler
Mathematical equations:
- Office Math Markup Language (OMML)
- OpenDocument Formula (ODF)
- MathML output option
- LaTeX conversion support
- Inline and display equations

#### MediaHandler
Multimedia content:
- Embedded videos
- Audio files
- OLE objects
- Package embeddings
- External media references

## Document Matcher Registry

### Flexible Style Matching
Enhanced matcher system with plugin support:

```javascript
// Configure matcher registry
const config = {
    matchers: {
        "citation": {
            type: "field",
            options: {
                fieldType: "CITATION"
            }
        },
        "equation": {
            type: "math",
            options: {
                inline: false
            }
        }
    }
};

// Apply configuration
mammoth.styleReader.configure(config);
```

### Plugin Architecture
Create matcher plugins:

```javascript
class CustomMatcherPlugin extends mammoth.plugins.BasePlugin {
    getName() {
        return 'custom-matcher';
    }
    
    registerMatchers(registry) {
        registry.register('custom-type', (options) => {
            return new CustomMatcher(options);
        });
    }
}

// Register plugin
mammoth.styleReader.registerPlugin(new CustomMatcherPlugin());
```

### XSLT Transformation Support
Complex matching via XSLT:

```javascript
// Add XSLT transformation
mammoth.styleReader.addTransform({
    name: 'complex-matcher',
    xslt: `
        <xsl:stylesheet version="1.0">
            <!-- Complex matching logic -->
        </xsl:stylesheet>
    `
});
```

## Table Formatting Preservation

### Enhanced Table Reader
Preserves table structure and formatting:

- **Borders**: Style, width, color for table and cells
- **Backgrounds**: Solid colors and patterns
- **Layout**: Column widths, cell spacing, padding
- **Alignment**: Table and cell alignment
- **Merged Cells**: Proper colspan/rowspan handling

### Table Conversion Options
```javascript
mammoth.convertToHtml({path: "document.docx"}, {
    tables: {
        preserveBorders: true,
        preserveBackground: true,
        preserveAlignment: true,
        preserveWidth: true,
        cssMode: 'inline', // or 'classes'
        borderCollapse: true
    }
});
```

### OpenOffice Table Support
Full support for ODF table elements:
- `table:table`
- `table:table-row`  
- `table:table-cell`
- `table:covered-table-cell`
- Column and row spans

## XML Processing Enhancements

### Complete Node Operations
All XML node methods now implemented:
- `text()`: Get text content of mixed elements
- `selectNodes()`: XPath-like element selection
- `getAllChildren()`: Recursive child retrieval
- `getInnerText()`: Extract all text content
- `transformWithXSLT()`: Apply XSLT transformations

### Namespace-Aware Processing
```javascript
// Find elements by namespace
element.findAllByNamespace('w', 'tbl');

// Check namespace
if (element.namespace === 'http://schemas.openxmlformats.org/wordprocessingml/2006/main') {
    // Process Word element
}
```

## Footnote Deduplication

### Smart Reference Handling
Footnotes referenced multiple times appear once:

**Before**: Each reference created duplicate footnote
**After**: Single footnote with multiple backlinks

```html
<!-- Multiple references to same footnote -->
<sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup>
<sup><a href="#footnote-1" id="footnote-ref-1-2">[1]</a></sup>

<!-- Single footnote with multiple backlinks -->
<li id="footnote-1">
    Footnote text 
    <a href="#footnote-ref-1">↑</a>
    <a href="#footnote-ref-1-2">↑</a>
</li>
```

## CLI Security

### Path Sanitization
Command-line interface now safely handles:
- Paths with spaces
- Special characters in filenames
- Path traversal attempts
- Null byte injection prevention

```bash
# Safe handling of complex paths
mammoth "My Documents/Report (Final).docx" \
    --output "Output Files/report.html" \
    --style-map "./styles/custom map.txt"
```

## Reference Handler Abstraction

### Unified Reference Processing
New `ReferenceHandler` class manages all references:
- Note references (footnotes/endnotes)
- Comment references
- Cross-references
- Hyperlinks

Benefits:
- Eliminates code duplication
- Consistent reference numbering
- Centralized reference tracking
- Easier to extend for new reference types

## Configuration System

### JSON/YAML Configuration
Configure mammoth behavior via external files:

```json
{
  "security": {
    "level": "strict",
    "allowedProtocols": ["https:", "mailto:"]
  },
  "tables": {
    "preserveFormatting": true
  },
  "matchers": {
    "custom": {
      "type": "plugin",
      "plugin": "custom-matcher-plugin"
    }
  },
  "handlers": {
    "fallback": "warn"
  }
}
```

Load configuration:
```javascript
mammoth.configure('./mammoth-config.json');
```

## Error Handling Improvements

### Enhanced Error Messages
More informative error reporting:
- Detailed error codes
- Suggestions for fixes
- Recovery strategies
- Context information

### Error Handler API
```javascript
mammoth.errors.registerHandler({
    name: 'custom-error-handler',
    handle: function(error, context) {
        console.log(`Error in ${context.file}: ${error.message}`);
        // Custom error handling
    }
});
```

## Performance Optimizations

### Caching System
- Compiled style matchers cached
- XSLT transformations cached
- Handler lookups optimized
- Namespace resolution cached

### Lazy Loading
- Plugins loaded on demand
- Handlers initialized when needed
- Transformations compiled on first use

## Developer Experience

### TypeScript Definitions
Enhanced type definitions:
```typescript
import * as mammoth from 'mammoth';

const options: mammoth.ConversionOptions = {
    security: {
        level: 'strict'
    },
    tables: {
        preserveBorders: true
    }
};
```

### Comprehensive Examples
New examples directory with real-world scenarios:
- Security configuration examples
- Custom handler implementations
- Complex document processing
- Plugin development templates

### Better Documentation
- API reference with all new features
- Migration guide for upgrading
- Security best practices
- Performance tuning guide