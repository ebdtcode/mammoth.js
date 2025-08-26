# Complete Guide: Identifying and Supporting Custom Elements in mammoth.js

## Table of Contents
1. [Understanding the Problem](#understanding-the-problem)
2. [Tools for Element Discovery](#tools-for-element-discovery)
3. [Step-by-Step Process](#step-by-step-process)
4. [Implementation Patterns](#implementation-patterns)
5. [Real-World Examples](#real-world-examples)
6. [Testing Your Implementation](#testing-your-implementation)

## Understanding the Problem

Word documents contain many XML elements that mammoth.js doesn't recognize by default:
- **Content Controls** (`w:sdt`)
- **Track Changes** (`w:ins`, `w:del`)
- **Smart Tags** (`w:smartTag`)
- **Custom XML** (`w:customXml`)
- **Drawing Objects** (`w:drawing`, `v:shape`)
- **Math Equations** (`math:oMath`)
- **Fields** (`w:fldSimple`, `w:fldChar`)

When mammoth encounters these, it generates warnings: "An unrecognised element was ignored"

## Tools for Element Discovery

### 1. Element Inspector Tool
```bash
node test-suite/element-inspector.js your-document.docx
```

**Features:**
- Analyzes raw XML structure
- Lists all elements and frequencies
- Identifies unsupported elements
- Generates implementation guides
- Creates JSON report

**Output:**
```
🎯 Common Unsupported Elements Found:
  w:sdt                     - 5 occurrences
    ├─ Namespace: w
    ├─ Has children: Yes
    └─ Attributes: id, type

💡 Implementation Guide
  1️⃣ Add to lib/documents.js
  2️⃣ Add reader in lib/docx/body-reader.js
  3️⃣ Add converter in lib/document-to-html.js
  4️⃣ Register handler
```

### 2. Manual XML Inspection
```javascript
// Extract and examine document.xml
const JSZip = require('jszip');
const fs = require('fs');

async function inspectDocx(filePath) {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const xml = await zip.files['word/document.xml'].async('string');
    
    // Pretty print XML
    console.log(xml);
    
    // Find unique elements
    const elements = xml.match(/<w:\w+/g) || [];
    const unique = [...new Set(elements)];
    console.log('Unique elements:', unique);
}
```

### 3. Conversion Warning Analysis
```javascript
const result = await mammoth.convertToHtml({path: 'document.docx'});

// Filter warnings about unrecognized elements
const unrecognized = result.messages
    .filter(m => m.message.includes('unrecognised'))
    .map(m => m.message.match(/element was ignored: ([^\s]+)/)?.[1])
    .filter(Boolean);

console.log('Unrecognized elements:', unrecognized);
```

## Step-by-Step Process

### Step 1: Identify Unrecognized Elements
```bash
# Use the element inspector
node test-suite/element-inspector.js document.docx

# Check the JSON report
cat document_element_analysis.json | jq '.unrecognizedElements'
```

### Step 2: Understand Element Structure
Look at the XML structure of the element:
```xml
<!-- Example: Content Control -->
<w:sdt>
  <w:sdtPr>
    <w:alias w:val="Customer Name"/>
    <w:tag w:val="customer_name"/>
    <w:id w:val="123456"/>
  </w:sdtPr>
  <w:sdtContent>
    <w:p>
      <w:r>
        <w:t>John Doe</w:t>
      </w:r>
    </w:p>
  </w:sdtContent>
</w:sdt>
```

### Step 3: Create Handler

#### Option A: Quick Handler (External)
```javascript
mammoth.handlers.register({
    elementNames: ['w:sdt'],
    handler: function(element, messages, options) {
        // Extract properties
        const properties = element.first('w:sdtPr');
        const content = element.first('w:sdtContent');
        const alias = properties?.first('w:alias')?.attributes?.['w:val'];
        
        // Process content
        const children = content ? 
            processChildren(content.children, messages, options) : [];
        
        // Return HTML
        return [mammoth.Html.freshElement('div', {
            'class': 'content-control',
            'data-alias': alias || ''
        }, children)];
    }
});
```

#### Option B: Full Implementation (Internal)

**1. Add to `lib/documents.js`:**
```javascript
types.sdt = "sdt";

function Sdt(options) {
    return {
        type: types.sdt,
        alias: options.alias,
        tag: options.tag,
        children: options.children || []
    };
}

exports.Sdt = Sdt;
```

**2. Add to `lib/docx/body-reader.js`:**
```javascript
function readSdt(element) {
    return readXmlElement(element).map(function(element) {
        var properties = element.first("w:sdtPr");
        var content = element.first("w:sdtContent");
        
        return documents.Sdt({
            alias: properties?.firstOrEmpty("w:alias").attributes["w:val"],
            tag: properties?.firstOrEmpty("w:tag").attributes["w:val"],
            children: content ? readElements(content.children) : []
        });
    });
}

// Register reader
readers["w:sdt"] = readSdt;
```

**3. Add to `lib/document-to-html.js`:**
```javascript
function convertSdt(element, messages, options) {
    var attributes = {
        "class": "content-control"
    };
    
    if (element.alias) {
        attributes["data-alias"] = element.alias;
    }
    
    if (element.tag) {
        attributes["data-tag"] = element.tag;
    }
    
    return Html.freshElement("div", attributes, 
        convertElements(element.children, messages, options)
    );
}

// Register converter
converters[types.sdt] = convertSdt;
```

## Implementation Patterns

### Pattern 1: Wrapper Elements
Elements that wrap other content (like SDT, smart tags):
```javascript
handler: function(element, messages, options) {
    const children = processChildren(element.children, messages, options);
    return [Html.freshElement('span', {'class': 'wrapper'}, children)];
}
```

### Pattern 2: Replacement Elements
Elements that should be replaced with placeholders:
```javascript
handler: function(element, messages, options) {
    const fieldType = element.attributes['w:type'];
    return [Html.text(`[${fieldType} Field]`)];
}
```

### Pattern 3: Complex Transformation
Elements requiring significant processing:
```javascript
handler: function(element, messages, options) {
    // Extract data
    const data = extractData(element);
    
    // Transform to appropriate HTML
    if (data.type === 'chart') {
        return createChartPlaceholder(data);
    } else if (data.type === 'equation') {
        return createMathElement(data);
    }
    
    // Fallback
    return [Html.text('[Complex Element]')];
}
```

### Pattern 4: Preserve Attributes
Keep important metadata:
```javascript
handler: function(element, messages, options) {
    const htmlAttrs = {};
    
    // Map Word attributes to HTML data attributes
    Object.keys(element.attributes || {}).forEach(key => {
        const htmlKey = 'data-' + key.replace(/[^a-z0-9]/gi, '-');
        htmlAttrs[htmlKey] = element.attributes[key];
    });
    
    return [Html.freshElement('div', htmlAttrs, children)];
}
```

## Real-World Examples

### Example 1: Track Changes Support
```javascript
// Handle insertions
mammoth.handlers.register({
    elementNames: ['w:ins'],
    handler: function(element, messages, options) {
        const author = element.attributes['w:author'];
        const date = element.attributes['w:date'];
        const children = processChildren(element.children, messages, options);
        
        return [Html.freshElement('ins', {
            'class': 'track-insert',
            'title': `Added by ${author} on ${date}`
        }, children)];
    }
});

// Handle deletions
mammoth.handlers.register({
    elementNames: ['w:del'],
    handler: function(element, messages, options) {
        const author = element.attributes['w:author'];
        const children = processChildren(element.children, messages, options);
        
        return [Html.freshElement('del', {
            'class': 'track-delete',
            'title': `Deleted by ${author}`
        }, children)];
    }
});
```

### Example 2: Form Fields
```javascript
mammoth.handlers.register({
    elementNames: ['w:sdt'],
    handler: function(element, messages, options) {
        const props = element.first('w:sdtPr');
        
        // Check for dropdown
        if (props?.first('w:dropDownList')) {
            return createDropdown(element, messages, options);
        }
        
        // Check for date picker
        if (props?.first('w:date')) {
            return createDatePicker(element, messages, options);
        }
        
        // Check for checkbox
        if (props?.first('w14:checkbox')) {
            return createCheckbox(element, messages, options);
        }
        
        // Default text input
        return createTextInput(element, messages, options);
    }
});
```

### Example 3: Math Equations
```javascript
mammoth.handlers.register({
    elementNames: ['m:oMath', 'math:oMath'],
    handler: function(element, messages, options) {
        // Try to extract LaTeX representation
        const latex = extractLatex(element);
        
        if (latex) {
            // Use MathJax or KaTeX for rendering
            return [Html.freshElement('span', {
                'class': 'math-tex',
                'data-latex': latex
            }, [Html.text('$$' + latex + '$$')])];
        }
        
        // Fallback to text extraction
        const text = extractMathText(element);
        return [Html.freshElement('span', {
            'class': 'math-text'
        }, [Html.text(text)])];
    }
});
```

## Testing Your Implementation

### 1. Create Test Document
Create a Word document with the elements you want to support:
- Insert content controls (Developer tab → Controls)
- Enable track changes and make edits
- Add equations (Insert → Equation)
- Insert shapes and drawings

### 2. Test Handler Registration
```javascript
// test-custom-handlers.js
const mammoth = require('mammoth');

// Register your handlers
require('./my-custom-handlers');

// Test conversion
async function test() {
    const result = await mammoth.convertToHtml({
        path: 'test-document.docx'
    });
    
    // Check for your custom classes/elements
    console.log('Content controls:', 
        (result.value.match(/class="content-control"/g) || []).length);
    console.log('Track changes:', 
        (result.value.match(/<ins|<del/g) || []).length);
    
    // Check warnings reduced
    const warnings = result.messages.filter(m => 
        m.message.includes('unrecognised'));
    console.log('Remaining warnings:', warnings.length);
}

test();
```

### 3. Visual Verification
```javascript
// Generate HTML with styling
const html = `<!DOCTYPE html>
<html>
<head>
<style>
    .content-control { 
        border: 1px dashed #4CAF50; 
        padding: 2px; 
        background: #E8F5E9; 
    }
    ins.track-insert { 
        background: #C8E6C9; 
        text-decoration: none; 
    }
    del.track-delete { 
        background: #FFCDD2; 
        text-decoration: line-through; 
    }
</style>
</head>
<body>
${result.value}
</body>
</html>`;

fs.writeFileSync('test-output.html', html);
// Open in browser to verify rendering
```

### 4. Use Test Suite
```bash
# Run comprehensive test
node test-suite/test-conversion.js test-document.docx

# Check element analysis
node test-suite/element-inspector.js test-document.docx

# Test custom handlers
node test-suite/custom-handler-template.js test-document.docx
```

## Best Practices

1. **Start Simple**: Extract text content first, enhance later
2. **Preserve Semantics**: Use appropriate HTML elements
3. **Add Metadata**: Use data attributes for Word-specific info
4. **Handle Edge Cases**: Elements might be nested or empty
5. **Provide Fallbacks**: Always have a default behavior
6. **Test Thoroughly**: Use various document samples
7. **Document Handlers**: Add comments explaining element purpose

## Common Word Elements Reference

| Element | Purpose | Suggested HTML |
|---------|---------|----------------|
| `w:sdt` | Content control | `<div class="control">` |
| `w:ins` | Track changes insert | `<ins>` |
| `w:del` | Track changes delete | `<del>` |
| `w:smartTag` | Smart tag | `<span class="smart-tag">` |
| `w:fldSimple` | Simple field | `<span class="field">` |
| `w:drawing` | Drawing/image | `<figure>` |
| `v:shape` | VML shape | `<div class="shape">` |
| `m:oMath` | Math equation | `<math>` or `<span class="math">` |
| `w:customXml` | Custom XML | `<div class="custom">` |
| `w:object` | Embedded object | `<object>` or placeholder |

## Resources

- [Office Open XML Reference](http://officeopenxml.com/)
- [OOXML Element List](https://docs.microsoft.com/en-us/office/open-xml/)
- [mammoth.js Source](https://github.com/mwilliamson/mammoth.js)
- Test suite tools in `/test-suite/` directory

## Summary

1. **Identify** unrecognized elements using the inspector tool
2. **Understand** their XML structure and purpose
3. **Implement** handlers using appropriate patterns
4. **Test** with real documents
5. **Iterate** based on results

With these tools and patterns, you can extend mammoth.js to support virtually any Word element!