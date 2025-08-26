# mammoth.js Migration Guide - Version 1.11.0

## Overview
This guide helps you migrate to mammoth.js v1.11.0, which introduces significant security enhancements, bug fixes, and new features for handling complex document structures.

## Breaking Changes

### Security Sanitization Enabled by Default
**Impact**: URLs in converted documents are now sanitized by default to prevent XSS attacks.

```javascript
// Previous behavior - no sanitization
mammoth.convertToHtml({path: "document.docx"})

// New behavior - sanitization enabled by default
// javascript: and other dangerous protocols are blocked
mammoth.convertToHtml({path: "document.docx"})

// To disable sanitization (NOT RECOMMENDED)
mammoth.convertToHtml({path: "document.docx"}, {security: false})
```

### Updated Dependencies
Several dependencies have been updated to address security vulnerabilities:
- `jszip`: 3.7.1 → 3.10.1
- `bluebird`: 3.4.0 → 3.7.2
- `underscore`: 1.13.1 → 1.13.7
- `@xmldom/xmldom`: 0.8.6 → 0.8.11

**Action Required**: Run `npm update` after upgrading.

## New Features

### 1. Security Configuration
Configure security levels based on your needs:

```javascript
// Strict security - HTTPS only
mammoth.convertToHtml({path: "document.docx"}, {
    security: {
        level: 'strict',
        allowedProtocols: ['https:', 'mailto:'],
        customSanitizer: (url) => {
            // Custom validation logic
            return url;
        }
    }
})

// Standard security (default)
mammoth.convertToHtml({path: "document.docx"}, {
    security: {
        level: 'standard'
    }
})

// Permissive security
mammoth.convertToHtml({path: "document.docx"}, {
    security: {
        level: 'permissive'
    }
})
```

### 2. Custom Element Handlers
Register handlers for unsupported document elements:

```javascript
// Register a handler for custom elements
mammoth.handlers.register({
    elementNames: ['custom:element'],
    namespace: 'custom',
    handler: function(element, messages, options) {
        return [mammoth.Html.text("Custom: " + element.name)];
    }
});

// Register a fallback handler
mammoth.handlers.registerFallback(function(element, messages, options) {
    return [mammoth.Html.text("[Unsupported: " + element.name + "]")];
});
```

### 3. Enhanced Table Support
Tables now preserve formatting:

```javascript
mammoth.convertToHtml({path: "document.docx"}, {
    tables: {
        preserveBorders: true,
        preserveBackground: true,
        preserveAlignment: true,
        cssMode: 'inline' // or 'classes'
    }
})
```

### 4. Advanced Document Matchers
Create custom style matchers:

```javascript
// Register custom matcher type
mammoth.styleReader.registerMatcher('custom-field', function(options) {
    return {
        matches: function(element) {
            return element.type === 'field' && 
                   element.fieldType === options.fieldType;
        }
    };
});

// Use in style map
mammoth.styleMap([
    "custom-field[fieldType='citation'] => cite.citation"
]);
```

## Bug Fixes

### Footnote Duplication
Footnotes referenced multiple times are no longer duplicated:

```javascript
// Previously: Footnote appeared multiple times in output
// Now: Single footnote definition with multiple backlinks
```

### CLI Argument Escaping
Command-line arguments with special characters are now properly escaped:

```bash
# Previously could fail with special characters
mammoth "file with spaces.docx"

# Now properly handled
mammoth "file with spaces.docx" --output "output dir/file.html"
```

### XML Node Operations
Fixed "Not implemented" errors in XML processing.

## Migration Steps

### Step 1: Update Dependencies
```bash
npm update mammoth
```

### Step 2: Review Security Settings
Check if your application relies on:
- `javascript:` protocol links
- `data:` URLs for non-image content
- External document references

If yes, configure security appropriately:

```javascript
// For trusted content only
mammoth.convertToHtml({path: "trusted.docx"}, {
    security: {
        level: 'permissive',
        allowedProtocols: ['javascript:', 'http:', 'https:']
    }
})
```

### Step 3: Update Custom Image Handlers
If using custom image handlers, ensure they handle the security context:

```javascript
// Old
options.convertImage = mammoth.images.imgElement(function(element) {
    return {src: element.src};
});

// New - with security awareness
options.convertImage = mammoth.images.imgElement(function(element) {
    // URL will be automatically sanitized
    return {src: element.src};
});
```

### Step 4: Test Table Rendering
Tables now include CSS by default. Test your output:

```javascript
// To disable new table formatting
mammoth.convertToHtml({path: "document.docx"}, {
    tables: {
        preserveFormatting: false
    }
})
```

### Step 5: Verify Footnote Handling
If your application processes footnotes, verify the new deduplication:

```javascript
// Footnotes now have unique IDs for multiple references
// Example output:
// <sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup>
// <sup><a href="#footnote-1" id="footnote-ref-1-2">[1]</a></sup>
// 
// <li id="footnote-1">
//   Note text <a href="#footnote-ref-1">↑</a> <a href="#footnote-ref-1-2">↑</a>
// </li>
```

## Performance Considerations

The new version includes several performance improvements:
- Faster XML parsing with enhanced node operations
- Cached matcher registry for style lookups
- Optimized table processing

However, security sanitization adds minimal overhead (<5ms for typical documents).

## Troubleshooting

### Issue: Links are being blocked
**Solution**: Check security settings and add required protocols to allowlist.

### Issue: Custom elements not recognized
**Solution**: Register custom handlers using the new handler API.

### Issue: Table formatting looks different
**Solution**: Adjust table options or disable formatting preservation.

### Issue: Build fails after update
**Solution**: Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Getting Help

- Report issues: https://github.com/mwilliamson/mammoth.js/issues
- Documentation: https://github.com/mwilliamson/mammoth.js
- Security concerns: See SECURITY.md

## Deprecations

### Markdown Output (already deprecated)
Continue using external libraries for Markdown conversion:

```javascript
// Not recommended
mammoth.convertToMarkdown()

// Recommended approach
const html = await mammoth.convertToHtml({path: "document.docx"});
const markdown = htmlToMarkdown(html.value);
```

## Summary

Version 1.11.0 focuses on security and extensibility while maintaining backward compatibility. The key changes are:

1. **Security by default** - Automatic URL sanitization
2. **Better footnotes** - No more duplication
3. **Enhanced tables** - Preserved formatting
4. **Extensible handlers** - Support for custom elements
5. **Updated dependencies** - Resolved security vulnerabilities

Most applications will work without changes, benefiting from automatic security improvements. Applications processing untrusted documents should review and test the security configuration options.