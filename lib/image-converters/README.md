# WMF/EMF Image Converter for mammoth.js

A secure, production-ready converter for Windows Metafile (WMF) and Enhanced Metafile (EMF) images in mammoth.js documents.

## Features

- **Format Detection**: Reliable WMF/EMF format detection using file signatures
- **Multiple Conversion Methods**: Sharp, Canvas, and ImageMagick with automatic fallback
- **Security-First Design**: Input validation, buffer overflow protection, memory limits
- **Placeholder Generation**: Graceful fallbacks when conversion isn't possible
- **Modular Architecture**: Easy integration with existing mammoth.js pipeline
- **Comprehensive Error Handling**: Structured errors with detailed logging

## Security Features

- Input sanitization and validation
- File size limits (100MB default, 10MB strict mode)
- Memory usage limits
- Safe temporary file handling
- Output format validation
- Protection against path traversal attacks

## Installation

The converter is included with mammoth.js. For optimal performance, install optional dependencies:

```bash
npm install sharp canvas
```

- `sharp`: Best performance for image conversion (recommended)
- `canvas`: Fallback for placeholder generation

## Basic Usage

```javascript
const wmfEmfConverter = require('mammoth/lib/image-converters/wmf-emf-converter');

// Create converter instance
const converter = wmfEmfConverter.createConverter({
    outputFormat: 'png',
    maxWidth: 2048,
    maxHeight: 2048,
    fallbackToPlaceholder: true
});

// Convert buffer
const imageBuffer = fs.readFileSync('image.wmf');
converter.convert(imageBuffer).then(result => {
    console.log('Converted format:', result.format);
    console.log('Content type:', result.contentType);
    fs.writeFileSync('output.png', result.buffer);
}).catch(error => {
    console.error('Conversion failed:', error.message);
}).finally(() => {
    return converter.cleanup();
});
```

## Integration with mammoth.js

```javascript
const mammoth = require('mammoth');
const wmfEmfConverter = require('mammoth/lib/image-converters/wmf-emf-converter');

// Configure mammoth to use WMF/EMF converter
const options = {
    convertImage: mammoth.images.imgElement(function(element) {
        // Check if this is a WMF/EMF image
        if (wmfEmfConverter.isSupportedFormat(element.contentType)) {
            return wmfEmfConverter.converter({
                outputFormat: 'png',
                fallbackToPlaceholder: true
            })(element);
        }
        
        // Use default image handling for other formats
        return mammoth.images.dataUri(element);
    })
};

mammoth.convertToHtml({path: "document.docx"}, options)
    .then(result => {
        console.log(result.value); // HTML with converted WMF/EMF images
        console.log(result.messages); // Conversion messages
    });
```

## Configuration Options

```javascript
const converter = wmfEmfConverter.createConverter({
    // Output format: 'png', 'jpeg', 'svg'
    outputFormat: 'png',
    
    // Quality for JPEG output (1-100)
    quality: 90,
    
    // Maximum dimensions (security limit)
    maxWidth: 2048,
    maxHeight: 2048,
    
    // Enable SVG output
    enableSvg: true,
    
    // Generate placeholder on conversion failure
    fallbackToPlaceholder: true,
    
    // Security level: 'strict', 'standard', 'permissive'
    securityLevel: 'standard',
    
    // Custom temporary directory
    tempDir: null,
    
    // Enable logging
    logging: true
});
```

## Security Levels

### Standard (Default)
- File size limit: 100MB
- All security validations enabled
- Balanced security and functionality

### Strict
- File size limit: 10MB
- Enhanced input validation
- Throws errors instead of silent failures
- Recommended for high-security environments

### Permissive
- Relaxed file size limits
- Minimal validation
- Use only in trusted environments

## Error Handling

```javascript
converter.convert(buffer).catch(error => {
    switch(error.type) {
        case wmfEmfConverter.ERROR_TYPES.INVALID_FORMAT:
            console.log('Not a valid WMF/EMF file');
            break;
            
        case wmfEmfConverter.ERROR_TYPES.FILE_TOO_LARGE:
            console.log('File exceeds size limit');
            break;
            
        case wmfEmfConverter.ERROR_TYPES.CONVERSION_FAILED:
            console.log('Conversion process failed');
            break;
            
        case wmfEmfConverter.ERROR_TYPES.SECURITY_VIOLATION:
            console.log('Security check failed');
            break;
            
        default:
            console.log('Unknown error:', error.message);
    }
});
```

## Format Detection

```javascript
const buffer = fs.readFileSync('image.wmf');
const format = wmfEmfConverter.detectFormat(buffer);

console.log(format); // 'wmf', 'emf', or null

// Check content type support
const isSupported = wmfEmfConverter.isSupportedFormat('image/wmf');
console.log(isSupported); // true
```

## Placeholder Generation

When conversion fails, the converter can generate placeholder images:

- **PNG Placeholder**: Simple bitmap with format information
- **SVG Placeholder**: Scalable vector with text content
- **Metadata**: Original format info and error details

```javascript
converter.convert(invalidBuffer, { fallbackToPlaceholder: true })
    .then(result => {
        if (result.metadata.placeholder) {
            console.log('Generated placeholder for:', result.metadata.originalFormat);
            console.log('Error:', result.metadata.error);
        }
    });
```

## Performance Tips

1. **Install Sharp**: Best performance and format support
2. **Use Appropriate Dimensions**: Don't exceed required output size
3. **Enable Placeholders**: Prevent failures from breaking document flow
4. **Batch Processing**: Reuse converter instances
5. **Cleanup**: Always call cleanup() when done

## Memory Management

```javascript
// Batch processing example
const converter = wmfEmfConverter.createConverter();
const results = [];

for (const file of imageFiles) {
    try {
        const buffer = fs.readFileSync(file);
        const result = await converter.convert(buffer);
        results.push(result);
    } catch (error) {
        console.error(`Failed to convert ${file}:`, error.message);
    }
}

// Cleanup temporary files
await converter.cleanup();
```

## Troubleshooting

### Conversion Fails
1. Check if Sharp or Canvas are installed
2. Verify file is valid WMF/EMF format
3. Check file size limits
4. Enable placeholder fallback

### Security Errors
1. Validate input buffer
2. Check file size
3. Verify security level settings
4. Review custom validation options

### Memory Issues
1. Reduce max dimensions
2. Process files in batches
3. Enable cleanup
4. Monitor memory usage

## API Reference

### createConverter(options)
Creates a new converter instance with specified options.

### detectFormat(buffer)
Detects WMF/EMF format from buffer. Returns 'wmf', 'emf', or null.

### isSupportedFormat(contentType)
Checks if content type is supported. Returns boolean.

### converter(options)
Returns a function compatible with mammoth.js image pipeline.

### ERROR_TYPES
Object containing all error type constants.

## Dependencies

- **Required**: None (uses Node.js built-ins)
- **Optional**: sharp, canvas (for better conversion quality)
- **System**: ImageMagick (fallback conversion method)

## Browser Support

The converter is designed for Node.js environments. For browser use:
- Remove Sharp dependency
- Use Canvas polyfill
- Implement custom placeholder generation
- Consider WebAssembly for WMF/EMF parsing