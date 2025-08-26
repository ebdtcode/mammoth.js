# Multi-line Figure Handler Documentation

## Overview

The Multi-line Figure Handler is a specialized utility that detects and processes figures with a specific multi-line structure commonly found in technical documents, particularly aviation manuals and regulatory documents.

## Problem Solved

Traditional figure detection expects patterns like "Figure X: Title" in a single line. However, many technical documents use a multi-line structure:

```
FIG 3-7-1
Precision Obstacle Free Zone (POFZ)
[actual figure/image/diagram]
```

## Supported Patterns

### Figure Number Formats
The handler detects the following figure number patterns:

| Pattern | Example | Regex |
|---------|---------|--------|
| FIG with dashes | `FIG 3-7-1` | `/^FIG\.?\s+(\d+[-–—]\d+[-–—]\d+)$/i` |
| FIG with dots | `FIG 3.7.1` | `/^FIG\.?\s+(\d+\.\d+\.\d+)$/i` |
| FIGURE with dashes | `FIGURE 3-7-1` | `/^FIGURE\s+(\d+[-–—]\d+[-–—]\d+)$/i` |
| FIGURE with dots | `FIGURE 3.7.1` | `/^FIGURE\s+(\d+\.\d+\.\d+)$/i` |
| Fig with dashes | `Fig 3-7-1` | `/^Fig\.?\s+(\d+[-–—]\d+[-–—]\d+)$/i` |
| Fig with dots | `Fig 3.7.1` | `/^Fig\.?\s+(\d+\.\d+\.\d+)$/i` |

### Title Validation
The handler validates figure titles by:
- Length: 3-200 characters
- Content: Must not match list items, NOTE sections, etc.
- Position: Must immediately follow the figure number

### Figure Element Detection
Supports the following figure types:
- `<img>` elements
- `<table>` elements  
- Media placeholders (`.chart-placeholder`, `.video-placeholder`, etc.)
- Any element containing the above

## HTML Structure Generated

### Input
```html
<p>FIG 3-7-1</p>
<p>Precision Obstacle Free Zone (POFZ)</p>
<img src="diagram.png" alt="POFZ Diagram">
```

### Output
```html
<figure class="multi-line-figure" role="img" aria-labelledby="multiline-fig-caption-1">
    <figcaption id="multiline-fig-caption-1" class="multi-line-figure-caption">
        <div class="figure-number">FIG 3-7-1</div>
        <div class="figure-title">Precision Obstacle Free Zone (POFZ)</div>
    </figcaption>
    <img src="diagram.png" alt="POFZ Diagram">
</figure>
```

## CSS Styling

The handler provides comprehensive CSS styling:

```css
.multi-line-figure {
    border: 2px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    margin: 3rem 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.multi-line-figure-caption {
    background: var(--sidebar-bg);
    border-bottom: 2px solid var(--border-color);
    padding: 20px;
    text-align: center;
    margin: 0;
}

.multi-line-figure .figure-number {
    font-weight: 700;
    font-size: 1.3em;
    color: var(--primary-color);
    margin-bottom: 10px;
    letter-spacing: 1px;
}

.multi-line-figure .figure-title {
    font-weight: 600;
    font-size: 1.1em;
    color: var(--text-color);
    line-height: 1.4;
}
```

## API Reference

### Core Functions

#### `processMultiLineFigures(htmlContent)`
Processes HTML content to detect and enhance multi-line figures only.

**Parameters:**
- `htmlContent` (string): HTML content to process

**Returns:**
- Promise<string>: Enhanced HTML with multi-line figures

**Example:**
```javascript
const { processMultiLineFigures } = require('./multi-line-figure-handler');
const enhancedHtml = await processMultiLineFigures(htmlContent);
```

#### `processAllFigureTypes(htmlContent)`
Processes both multi-line and single-line figures using a combined approach.

**Parameters:**
- `htmlContent` (string): HTML content to process

**Returns:**
- Promise<string>: Enhanced HTML with all figure types

**Example:**
```javascript
const { processAllFigureTypes } = require('./multi-line-figure-handler');
const enhancedHtml = await processAllFigureTypes(htmlContent);
```

### Utility Functions

#### `detectFigureNumber(element)`
Detects if an element contains a figure number.

**Parameters:**
- `element` (HTMLElement): DOM element to check

**Returns:**
- Object | null: Figure number info or null

#### `couldBeFigureTitle(element)`
Validates if an element could be a figure title.

**Parameters:**
- `element` (HTMLElement): DOM element to validate

**Returns:**
- boolean: True if could be a title

#### `findNextFigureElement(startElement)`
Finds the next figure element (image, table, etc.) after a given element.

**Parameters:**
- `startElement` (HTMLElement): Starting point for search

**Returns:**
- HTMLElement | null: Found figure element or null

## Integration

### With Ultimate Converter
The multi-line figure handler is integrated into the ultimate converter:

```javascript
// In ultimate-converter-with-chunking.js
const { processAllFigureTypes } = require('./multi-line-figure-handler');

// Phase 3: Enhanced figure processing
const enhancedHtml = await processAllFigureTypes(hierarchicalHtml);
```

### Standalone Usage
Can be used independently:

```javascript
const mammoth = require('mammoth');
const { processAllFigureTypes } = require('./multi-line-figure-handler');

// Convert DOCX to HTML
const result = await mammoth.convertToHtml({path: 'document.docx'});

// Process figures
const enhancedHtml = await processAllFigureTypes(result.value);
```

## Configuration

### Pattern Customization
You can modify the detection patterns:

```javascript
const { MULTILINE_FIGURE_PATTERNS } = require('./multi-line-figure-handler');

// Add custom patterns
MULTILINE_FIGURE_PATTERNS.figureNumbers.push(
    /^DIAGRAM\s+(\d+[-–—]\d+[-–—]\d+)$/i
);
```

### CSS Customization
Override CSS variables for styling:

```css
:root {
    --border-color: #your-color;
    --sidebar-bg: #your-background;
    --primary-color: #your-accent;
}
```

## Performance Considerations

### Processing Speed
- Linear complexity: O(n) where n is the number of paragraphs
- Efficient DOM traversal with limited search depth
- Minimal memory overhead

### Memory Usage
- Processes elements in-place when possible
- Clones only necessary elements
- Automatic cleanup of processed elements

## Error Handling

### Graceful Degradation
- If figure number detected but no title found, skips processing
- If title found but no figure element, skips processing
- Invalid patterns are ignored without errors

### Logging
Comprehensive logging for debugging:
```javascript
// Enable detailed logging
console.log(`Found figure number: ${figureNumber.fullText}`);
console.log(`Found title: "${nextElement.textContent.trim()}"`);
console.log(`Found figure element: ${figureElement.tagName}`);
```

## Testing

### Test Coverage
- ✅ Figure number detection (all patterns)
- ✅ Title validation  
- ✅ Figure element finding
- ✅ HTML structure generation
- ✅ CSS styling application
- ✅ Integration with existing systems

### Test Execution
```bash
node multi-line-figure-handler.js --test
node demo-multiline-figures.js
```

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

### Features Used
- CSS Custom Properties (CSS Variables)
- Flexbox for layout
- ARIA attributes for accessibility
- Semantic HTML5 elements

## Accessibility

### WCAG 2.1 Compliance
- ✅ Level AA compliant
- ✅ ARIA roles and labels
- ✅ Proper heading hierarchy
- ✅ Keyboard navigation support

### Screen Reader Support
```html
<figure role="img" aria-labelledby="multiline-fig-caption-1">
    <figcaption id="multiline-fig-caption-1">
        <!-- Structured caption content -->
    </figcaption>
</figure>
```

## Examples

### Aviation Document
```html
<!-- Input -->
<p>FIG 3-7-1</p>
<p>Precision Obstacle Free Zone (POFZ)</p>
<img src="pofz-diagram.png" alt="POFZ Diagram">

<!-- Output -->
<figure class="multi-line-figure" role="img" aria-labelledby="multiline-fig-caption-1">
    <figcaption id="multiline-fig-caption-1" class="multi-line-figure-caption">
        <div class="figure-number">FIG 3-7-1</div>
        <div class="figure-title">Precision Obstacle Free Zone (POFZ)</div>
    </figcaption>
    <img src="pofz-diagram.png" alt="POFZ Diagram">
</figure>
```

### Technical Manual
```html
<!-- Input -->
<p>FIGURE 2.1.3</p>
<p>Aircraft Approach Zones and Safety Requirements</p>
<table>...</table>

<!-- Output -->
<figure class="multi-line-figure" role="img" aria-labelledby="multiline-fig-caption-2">
    <figcaption id="multiline-fig-caption-2" class="multi-line-figure-caption">
        <div class="figure-number">FIGURE 2.1.3</div>
        <div class="figure-title">Aircraft Approach Zones and Safety Requirements</div>
    </figcaption>
    <table>...</table>
</figure>
```

### Media Placeholder
```html
<!-- Input -->
<p>Fig 5-1-2</p>
<p>Ground Control Procedures Training Video</p>
<div class="video-placeholder">Training Video Content</div>

<!-- Output -->
<figure class="multi-line-figure" role="img" aria-labelledby="multiline-fig-caption-3">
    <figcaption id="multiline-fig-caption-3" class="multi-line-figure-caption">
        <div class="figure-number">Fig 5-1-2</div>
        <div class="figure-title">Ground Control Procedures Training Video</div>
    </figcaption>
    <div class="video-placeholder">Training Video Content</div>
</figure>
```

## Future Enhancements

### Planned Features
1. **Custom Pattern API**: Allow runtime pattern configuration
2. **Figure Numbering Schemes**: Support for different numbering systems
3. **Multi-language Support**: Pattern detection for non-English documents
4. **Figure Cross-references**: Automatic linking between figure references and figures
5. **Figure Index Generation**: Automatic figure list/index creation

### Enhancement Requests
To request new features or report issues:
1. Create detailed use case examples
2. Provide sample input/expected output
3. Specify document type and source format

## Conclusion

The Multi-line Figure Handler successfully addresses the need for processing technical documents with multi-line figure structures. It provides:

- ✅ **Complete Pattern Support**: All common figure numbering formats
- ✅ **Robust Detection**: Reliable title and element matching  
- ✅ **Semantic HTML**: Proper accessibility and structure
- ✅ **Professional Styling**: Modern, responsive design
- ✅ **Seamless Integration**: Works with existing mammoth.js workflow
- ✅ **High Performance**: Efficient processing with minimal overhead

The feature is production-ready and fully integrated into the enhanced mammoth.js document processing system.