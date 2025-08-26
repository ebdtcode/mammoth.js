# mammoth.js Test Suite

Comprehensive testing tools for evaluating mammoth.js document conversion capabilities.

## Quick Start

### 1. Create Test Documents
```bash
# Generate sample DOCX files with various features
node create-test-doc.js
```

This creates three test documents:
- `test-comprehensive.docx` - All features (formatting, tables, lists, links)
- `test-security.docx` - Security test cases (XSS, injection attempts)
- `test-tables.docx` - Complex table formatting

### 2. Run Conversion Tests
```bash
# Full test suite
node test-conversion.js test-comprehensive.docx

# Quick test (basic conversion only)
node test-conversion.js document.docx --quick

# Security-focused test
node test-conversion.js document.docx --security

# Table-focused test
node test-conversion.js document.docx --tables
```

### 3. Test Your Own Documents
```bash
# Test any DOCX file
node test-conversion.js ~/Documents/MyReport.docx

# Test with spaces in filename
node test-conversion.js "~/Documents/My Report.docx"
```

## Test Features

### 1. Basic Conversion Test
- Converts document to HTML
- Counts paragraphs, headers, lists, tables
- Reports warnings and conversion statistics
- Saves output as `*_basic.html`

### 2. Security Features Test
Tests three security levels:
- **Standard**: Default security, blocks dangerous protocols
- **Strict**: HTTPS-only, maximum security
- **Permissive**: More protocols allowed

Checks for:
- JavaScript injection prevention
- XSS protection
- URL sanitization
- Path traversal prevention

### 3. Table Handling Test
Evaluates:
- Border preservation
- Background colors
- Cell alignment
- Merged cells
- Column widths
- Nested tables

### 4. Custom Handlers Test
- Registers custom element handlers
- Tests fallback handlers
- Reports unknown elements
- Evaluates extensibility

### 5. Style Mappings Test
Tests custom style mappings:
- Heading conversions (h1, h2, h3)
- Blockquotes
- Code blocks
- Custom paragraph styles

### 6. Image Handling Test
Two modes:
- **Inline**: Base64-encoded images in HTML
- **Extracted**: Images saved to separate files

### 7. Footnotes & References Test
Checks:
- Footnote handling
- Endnote conversion
- Hyperlink preservation
- Duplicate footnote detection

### 8. Performance Test
- Runs 5 conversion iterations
- Reports average, min, max times
- Calculates processing speed (MB/s)
- Analyzes file size impact

## Output Files

Each test generates multiple files:

```
document.docx           # Original document
├── document_basic.html      # Basic conversion output
├── document_styled.html     # With style mappings
├── document_tables.html     # Table-focused output
├── document_report.json     # Detailed test report
└── extracted_images/        # Extracted images (if any)
    ├── image_1.png
    └── image_2.jpg
```

## Test Report

The JSON report contains:
```json
{
  "features": {
    "basicConversion": true,
    "security_standard": true,
    "security_strict": true,
    "tableFormatting": {
      "count": 3,
      "borders": true,
      "backgrounds": true
    },
    "images": {
      "inline": 2,
      "extracted": 2
    },
    "references": {
      "footnotes": 5,
      "hyperlinks": 10
    },
    "performance": {
      "average": "125.45",
      "min": "118.23",
      "max": "134.67"
    }
  },
  "warnings": [...],
  "stats": {
    "paragraphs": 25,
    "headers": 8,
    "tables": 3,
    "images": 2
  }
}
```

## Testing Specific Features

### Testing Security
Create a document with various URL types:
```javascript
// In your document:
- javascript:alert('XSS')
- data:text/html,<script>...</script>
- https://safe-site.com
- ../../../etc/passwd
```

Run security test:
```bash
node test-conversion.js security-test.docx --security
```

### Testing Tables
Create complex tables with:
- Merged cells (rowspan/colspan)
- Background colors
- Various borders
- Nested tables
- Different alignments

### Testing Custom Styles
Apply Word styles:
- Title → h1
- Heading 1 → h2
- Quote → blockquote
- Code → pre

## Advanced Usage

### Custom Test Configuration
```javascript
const DocumentTester = require('./test-conversion');

const tester = new DocumentTester('document.docx', {
    security: {
        level: 'strict'
    },
    tables: {
        preserveFormatting: true
    }
});

// Run specific test
await tester.testTableHandling();
await tester.testSecurityFeatures();
```

### Batch Testing
```bash
# Test multiple documents
for file in *.docx; do
    node test-conversion.js "$file" --quick
done
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Test Document Conversion
  run: |
    node test-suite/create-test-doc.js
    node test-suite/test-conversion.js test-comprehensive.docx
    
- name: Check Results
  run: |
    cat test-suite/test-comprehensive_report.json
```

## Interpreting Results

### Good Conversion
✅ All features pass
✅ Minimal warnings (<5)
✅ No security issues
✅ Performance <200ms for typical documents
✅ All content preserved

### Issues to Watch
⚠️ Many warnings (>20) - Complex formatting may be lost
⚠️ Security warnings - Dangerous content detected
⚠️ Missing content - Check unsupported elements
⚠️ Slow performance (>1s) - Large or complex document

### Common Warnings
- "Unrecognized style" - Custom Word style not mapped
- "Unknown element" - Unsupported Word feature
- "Image not found" - Broken image reference
- "Table too complex" - Nested or irregular table

## Troubleshooting

### Document Won't Convert
1. Check file isn't corrupted: `file document.docx`
2. Try basic conversion first: `--quick`
3. Check error messages in report
4. Verify mammoth.js is properly installed

### Security Warnings
- Review sanitized URLs in output
- Check security level configuration
- Consider using 'permissive' for trusted content

### Table Issues
- Complex merged cells may need simplification
- Nested tables might lose formatting
- Check CSS support in target browser

### Performance Issues
- Large images slow conversion
- Many tables increase processing time
- Consider extracting images vs inline

## Best Practices

1. **Start Simple**: Test basic conversion first
2. **Incremental Testing**: Add features gradually
3. **Document Preparation**: Simplify complex formatting in Word
4. **Security First**: Always test with security enabled
5. **Review Warnings**: Don't ignore conversion warnings
6. **Multiple Tests**: Run different test modes
7. **Keep Reports**: Save JSON reports for comparison

## Example Workflow

```bash
# 1. Create test document in Word with specific features
# 2. Generate test documents
node create-test-doc.js

# 3. Run comprehensive test
node test-conversion.js test-comprehensive.docx

# 4. Review HTML output
open test-comprehensive_basic.html

# 5. Check JSON report for issues
cat test-comprehensive_report.json | jq '.warnings'

# 6. Test security specifically
node test-conversion.js test-comprehensive.docx --security

# 7. If tables are important
node test-conversion.js test-comprehensive.docx --tables

# 8. Compare outputs
diff test-comprehensive_basic.html test-comprehensive_styled.html
```

## Contributing

To add new test cases:
1. Add test method to `DocumentTester` class
2. Include in `runFullTest()` sequence
3. Update report generation
4. Document new test feature

## Support

- Report issues: GitHub Issues
- Documentation: See main mammoth.js docs
- Examples: Check test-suite directory