# Security Features

Mammoth.js now includes a comprehensive security sanitization layer to prevent JavaScript injection and other security vulnerabilities when converting DOCX documents to HTML.

## Security by Default

Starting from this version, mammoth.js enables security sanitization by default with the 'standard' security level. This provides protection against dangerous URL protocols and malicious content while maintaining compatibility with most legitimate use cases.

## Security Levels

### Standard Level (default)
- Allows: `http:`, `https:`, `mailto:`, `tel:`, `ftp:` protocols
- Allows: relative URLs and fragment URLs (#anchor)
- Allows: safe image data URLs (PNG, JPEG, GIF, WebP, SVG)
- Blocks: `javascript:`, `vbscript:`, dangerous data URLs
- Adds: `rel="noopener"` to `_blank` links for security

### Strict Level
- Allows: only `https:`, `mailto:`, `tel:` protocols
- Blocks: `http:` and `ftp:` protocols
- Blocks: all data URLs (including images)
- Throws errors instead of silently sanitizing

### Permissive Level  
- Allows: `http:`, `https:`, `mailto:`, `tel:`, `ftp:`, `file:` protocols
- Allows: all safe data URLs
- More lenient validation while still blocking dangerous protocols

## Usage Examples

### Basic Usage (with default security)
```javascript
const mammoth = require("mammoth");

// Security is enabled by default with 'standard' level
mammoth.convertToHtml({path: "document.docx"})
    .then(function(result) {
        console.log(result.value); // Secure HTML output
        console.log(result.messages); // Any security warnings
    });
```

### Custom Security Configuration
```javascript
const mammoth = require("mammoth");

mammoth.convertToHtml({path: "document.docx"}, {
    security: {
        level: 'strict',                    // Use strict security
        allowedProtocols: ['https:', 'mailto:'], // Custom protocol list
        allowDataUrls: false,               // Block all data URLs
        strict: true                        // Throw errors instead of warnings
    }
})
.then(function(result) {
    console.log(result.value);
});
```

### Disabling Security (not recommended)
```javascript
const mammoth = require("mammoth");

// Only do this for trusted documents!
mammoth.convertToHtml({path: "trusted-document.docx"}, {
    security: false  // Disables all security checks
})
.then(function(result) {
    console.log(result.value);
});
```

### Using Custom Sanitizer
```javascript
const mammoth = require("mammoth");

mammoth.convertToHtml({path: "document.docx"}, {
    security: {
        customSanitizer: function(url) {
            // Add custom domain validation
            if (url.startsWith('https://trusted-domain.com')) {
                return url;
            }
            return '#';  // Block untrusted domains
        }
    }
})
.then(function(result) {
    console.log(result.value);
});
```

### Direct Sanitizer Usage
```javascript
const mammoth = require("mammoth");

// Create a sanitizer instance
const sanitizer = mammoth.security.createSanitizer({
    level: 'strict'
});

// Sanitize individual URLs
const safeUrl = sanitizer.sanitizeUrl('https://example.com');  // OK
const blockedUrl = sanitizer.sanitizeUrl('javascript:alert()'); // Returns '#'

// Sanitize attributes object
const safeAttrs = sanitizer.sanitizeAttributes({
    href: 'javascript:alert()',  // Will be sanitized to '#'
    title: 'Safe title'          // Will be preserved
});
```

## Security Messages

When URLs are sanitized, mammoth.js will include warning or error messages in the result:

```javascript
mammoth.convertToHtml({path: "document.docx"})
    .then(function(result) {
        console.log(result.value);
        
        // Check for security messages
        result.messages.forEach(function(message) {
            if (message.type === 'warning' && message.message.includes('sanitized')) {
                console.log('Security warning:', message.message);
            }
        });
    });
```

## What Gets Sanitized

### Dangerous URL Protocols
- `javascript:` - Blocked (XSS risk)
- `vbscript:` - Blocked (XSS risk) 
- `data:text/html` - Blocked (XSS risk)
- `data:application/` - Blocked (XSS risk)

### Safe URL Protocols (standard level)
- `https:` - Allowed
- `http:` - Allowed (blocked in strict mode)
- `mailto:` - Allowed
- `tel:` - Allowed
- `ftp:` - Allowed (blocked in strict mode)

### Special Handling
- Fragment URLs (`#anchor`) - Dangerous characters removed
- Relative URLs - Path traversal attacks prevented
- Target frames - XSS prevention, `rel="noopener"` added to `_blank`
- Image data URLs - Only safe image formats allowed

## Migration from Previous Versions

If you're upgrading from a previous version of mammoth.js:

1. **Security is now enabled by default** - If your application relies on dangerous URLs (like `javascript:`), you'll need to either:
   - Update your documents to use safe URLs, or
   - Explicitly disable security with `{security: false}` (not recommended)

2. **`_blank` links now include `rel="noopener"`** - This prevents `window.opener` attacks

3. **New security messages** - Check for security-related warnings in `result.messages`

## Best Practices

1. **Keep security enabled** - Only disable for completely trusted content
2. **Use HTTPS** - Prefer `https:` over `http:` URLs in your documents
3. **Validate input** - Even with security enabled, validate document sources
4. **Check messages** - Monitor security warnings in production
5. **Use strict mode** - For high-security applications, use `level: 'strict'`
6. **Custom validation** - Implement `customSanitizer` for domain-specific rules

## Security Configuration Reference

```javascript
{
    level: 'standard' | 'strict' | 'permissive',
    allowedProtocols: ['https:', 'mailto:', ...],  // Allowed URL protocols
    allowRelativeUrls: true | false,               // Allow relative paths
    allowFragments: true | false,                  // Allow #anchor links
    allowDataUrls: true | false,                   // Allow data: URLs
    customSanitizer: function(url) { ... },       // Custom URL validation
    strict: true | false                           // Throw errors vs warnings
}
```

For more information about security considerations, see the main [README.md](README.md#security) file.