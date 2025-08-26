# Extensible Element Handler System

This directory contains the extensible element handler system for mammoth.js, which provides support for processing unsupported OpenOffice and DOCX elements during document conversion.

## Architecture

### Core Components

- **`element-handler-registry.js`** - Central registry for managing element handlers with priority-based selection and namespace support
- **`table-handler.js`** - Enhanced table processing with merged cells and advanced formatting
- **`drawing-handler.js`** - Handles drawing elements, shapes, charts, and diagrams
- **`field-handler.js`** - Processes complex fields, forms, and interactive elements
- **`math-handler.js`** - Handles mathematical equations and formulas (OMML and ODF)
- **`media-handler.js`** - Processes multimedia elements, embedded objects, and media files

### Key Features

1. **Namespace-aware Element Matching** - Handlers can be registered for specific XML namespaces
2. **Priority-based Handler Selection** - Higher priority handlers override lower priority ones
3. **Fallback Handling Strategies** - Multiple fallback handlers for unrecognized elements
4. **Built-in Specialized Handlers** - Pre-registered handlers for common unsupported elements
5. **Custom Handler Registration** - API for registering user-defined handlers
6. **Error Handling** - Graceful degradation when handlers encounter errors

## Usage Examples

### Basic Custom Handler Registration

```javascript
var mammoth = require('mammoth');

// Register a handler for custom elements
mammoth.handlers.register({
    elementNames: ["custom:element", "custom:widget"],
    namespace: "custom",
    priority: 200,
    handler: function(element, messages, options) {
        return [Html.text("Custom element: " + element.name)];
    }
});
```

### Advanced Handler with Content Processing

```javascript
mammoth.handlers.register({
    elementNames: ["w:sdt"],
    namespace: "w", 
    priority: 180,
    handler: function(element, messages, options) {
        // Process child content using conversion pipeline
        var content = [];
        if (element.children) {
            content = options.convertElements(element.children, messages, options);
        }
        
        return [Html.freshElement("div", {
            class: "content-control"
        }, content)];
    }
});
```

### Fallback Handler Registration

```javascript
mammoth.handlers.registerFallback(function(element, messages, options) {
    // Extract text content from unknown elements
    var text = extractTextContent(element);
    if (text && text.trim()) {
        return [Html.text(text)];
    }
    return null; // Let next fallback handler try
}, 10);
```

## Handler Function Interface

All handlers must implement the following interface:

```javascript
function(element, messages, options) {
    // element: The XML/document element to process
    // messages: Array to collect conversion messages
    // options: Conversion options with utilities:
    //   - convertElements: Function to convert child elements
    //   - convertToHtml: Function to convert single element
    //   - urlSanitizer: Security URL sanitizer
    //   - styleMap: Active style mappings
    
    // Return: Array of HTML nodes or empty array
}
```

## Built-in Handlers

The system includes built-in handlers for:

- **OpenOffice Drawing** (`draw:*`) - Frames, text boxes, images, shapes
- **Word Fields** (`w:fldSimple`, `w:hyperlink`) - Form controls, field codes
- **Math Equations** (`m:*`) - Office Math Markup Language elements
- **Media Objects** (`w:object`, `w:pict`) - Embedded objects and pictures
- **Enhanced Tables** (`w:tbl`) - Advanced table features like merged cells

## Integration

The handler system is automatically integrated into the mammoth.js conversion pipeline:

1. Built-in element converters are tried first
2. If no built-in converter exists, the handler registry is consulted
3. Handlers are matched by element name and namespace
4. The highest priority matching handler is executed
5. If no custom handler matches, fallback handlers are tried
6. Finally, a warning is generated for truly unrecognized elements

## Security

- All handlers receive access to the URL sanitizer for secure link processing
- Handlers should validate and sanitize any user-generated content
- Error handling prevents handler failures from breaking the entire conversion

## Performance

- Namespace-specific lookups for faster handler resolution
- Handlers are sorted by priority at registration time
- Lazy loading of specialized handlers
- Efficient text content extraction utilities