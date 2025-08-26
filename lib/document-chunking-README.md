# Document Chunking and Navigation System for mammoth.js

A comprehensive document chunking and navigation system that extends mammoth.js to split large documents into manageable sections with automatic navigation generation.

## Features

### 🔧 Document Chunking by Structure
- **Multiple Chunking Strategies**: Split by heading levels, chapters, sections, size limits, or custom logic
- **Hierarchical Structure Preservation**: Maintains parent-child relationships between document sections
- **Cross-reference Resolution**: Preserves and updates internal links between chunks
- **Flexible Configuration**: Customizable chunking parameters and output formats

### 📚 Table of Contents Generation  
- **Automatic TOC Generation**: Creates hierarchical table of contents from document structure
- **Nested/Collapsible TOC**: Support for multi-level navigation with optional collapsible sections
- **Customizable Formatting**: Control depth, numbering, and styling options
- **Multiple Output Formats**: HTML, JSON, and structured data formats

### 🧭 Navigation Builder Utilities
- **Previous/Next Navigation**: Automatic sequential navigation between chunks
- **Breadcrumb Navigation**: Hierarchical breadcrumb trails for context
- **Sidebar Navigation**: Section-based sidebar with sub-headings
- **Quick Jump Dropdown**: Select-based navigation for quick section jumping
- **Keyboard Navigation**: Arrow keys and shortcuts for hands-free navigation

### 🔍 Advanced Features
- **Document Analysis**: Extract document structure, metadata, and statistics
- **Search Index Generation**: Create searchable indexes for full-text search
- **Cross-reference Resolution**: Maintain links between separated chunks
- **Glossary Extraction**: Automatically extract definitions and terms
- **Metadata Generation**: Word counts, reading time, and section statistics

## Installation

The document chunking system is included in the mammoth.js library. Simply require the chunking module:

```javascript
var mammoth = require('mammoth');
var documentChunking = require('mammoth/lib/document-chunking');
```

## Quick Start

### Basic Document Chunking

```javascript
var mammoth = require('mammoth');
var documentChunking = require('mammoth/lib/document-chunking');

// Convert and chunk a document
mammoth.convertToHtml({path: 'document.docx'})
    .then(function(result) {
        // Create chunker with default settings
        var chunker = new documentChunking.DocumentChunker({
            strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
            maxLevel: 3,
            generateNavigation: true,
            includeMetadata: true
        });
        
        // Parse document for chunking (requires document object)
        return mammoth.convert({path: 'document.docx'}, {
            transformDocument: function(document) {
                return chunker.chunkDocument(document, [])
                    .then(function(chunkResult) {
                        console.log('Chunked into ' + chunkResult.value.chunks.length + ' sections');
                        return document;
                    });
            }
        });
    });
```

### Integrated Conversion and Chunking

```javascript
var chunkingIntegration = require('mammoth/lib/document-chunking-integration');

// Convert and chunk in one operation
chunkingIntegration.convertAndChunk({path: 'document.docx'}, {
    chunking: {
        strategy: documentChunking.ChunkingStrategies.BY_CHAPTER,
        generateNavigation: true,
        includeMetadata: true,
        filePrefix: 'chapter-',
        baseUrl: './output/'
    },
    output: {
        format: chunkingIntegration.OutputFormats.SEPARATE_FILES,
        includeCSS: true,
        includeNavigation: true,
        generateTOC: true,
        generateIndex: true,
        outputDirectory: './output'
    }
}).then(function(result) {
    console.log('Generated ' + Object.keys(result.value.files).length + ' files');
    
    // Access individual files
    Object.keys(result.value.files).forEach(function(filename) {
        var file = result.value.files[filename];
        console.log('File: ' + filename + ' (' + file.type + ')');
        // Write file.content to filesystem
    });
});
```

## Chunking Strategies

### 1. By Heading Level (Default)
Splits document at specified heading levels (H1, H2, etc.)

```javascript
var chunker = new documentChunking.DocumentChunker({
    strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
    maxLevel: 3  // Split on H1, H2, H3
});
```

### 2. By Chapter
Splits only at top-level headings (H1)

```javascript
var chunker = new documentChunking.DocumentChunker({
    strategy: documentChunking.ChunkingStrategies.BY_CHAPTER
});
```

### 3. By Section
Splits at H1 and H2 headings

```javascript
var chunker = new documentChunking.DocumentChunker({
    strategy: documentChunking.ChunkingStrategies.BY_SECTION
});
```

### 4. By Size
Splits based on content size limits

```javascript
var chunker = new documentChunking.DocumentChunker({
    strategy: documentChunking.ChunkingStrategies.BY_SIZE,
    chunkSizeLimit: 5000  // Approximately 5000 characters per chunk
});
```

### 5. Custom Strategy
Implement custom chunking logic

```javascript
var chunker = new documentChunking.DocumentChunker({
    strategy: documentChunking.ChunkingStrategies.CUSTOM,
    customChunkingFunction: function(document, analysis) {
        // Implement custom chunking logic
        return customChunks;
    }
});
```

## Configuration Options

### DocumentChunker Options

```javascript
var chunker = new documentChunking.DocumentChunker({
    // Chunking strategy
    strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
    maxLevel: 6,                    // Maximum heading level to consider (1-6)
    
    // Cross-reference handling
    preserveLinks: true,            // Maintain links between chunks
    
    // Navigation generation
    generateNavigation: true,       // Generate prev/next navigation
    
    // Metadata options
    includeMetadata: true,          // Include word counts, reading time, etc.
    
    // Size-based chunking
    chunkSizeLimit: null,           // Size limit for BY_SIZE strategy
    
    // File naming
    baseUrl: "./",                  // Base URL for generated links
    filePrefix: "chunk-",           // Prefix for chunk filenames
    fileSuffix: ".html"             // Suffix for chunk filenames
});
```

### TableOfContentsGenerator Options

```javascript
var tocGenerator = new documentChunking.TableOfContentsGenerator({
    maxDepth: 6,                    // Maximum depth to include in TOC
    includePageNumbers: false,      // Include page numbers (for print)
    generateIds: true,              // Generate ID attributes for headings
    collapsible: false,             // Make TOC sections collapsible
    numbering: "auto",              // Numbering: true, false, or "auto"
    baseUrl: "./"                   // Base URL for TOC links
});
```

### NavigationBuilder Options

```javascript
var navBuilder = new documentChunking.NavigationBuilder({
    baseUrl: "./",                  // Base URL for navigation links
    filePrefix: "chunk-",           // File prefix for links
    fileSuffix: ".html",            // File suffix for links
    
    // Navigation components
    includeBreadcrumbs: true,       // Generate breadcrumb navigation
    includeNavButtons: true,        // Generate prev/next buttons
    includeSidebar: true,           // Generate sidebar navigation
    includeJumpDropdown: true,      // Generate quick-jump dropdown
    
    // Keyboard support
    keyboardNavigation: true        // Enable keyboard shortcuts
});
```

## Output Formats

### 1. Separate Files
Generates individual HTML files for each chunk

```javascript
{
    output: {
        format: OutputFormats.SEPARATE_FILES,
        includeCSS: true,
        includeNavigation: true,
        generateTOC: true,
        generateIndex: true
    }
}
```

**Generated Files:**
- `chunk-1.html`, `chunk-2.html`, etc. - Individual chunk files
- `index.html` - Main index page
- `table-of-contents.html` - Table of contents
- `styles.css` - Styling
- `navigation.js` - Navigation functionality
- `search-index.json` - Search index data
- `glossary.html` - Glossary (if enabled)

### 2. Single File
Combines all chunks into one HTML file

```javascript
{
    output: {
        format: OutputFormats.SINGLE_FILE,
        includeCSS: true,
        includeNavigation: true
    }
}
```

### 3. JSON Export
Exports structured data for custom processing

```javascript
{
    output: {
        format: OutputFormats.JSON
    }
}
```

**JSON Structure:**
```javascript
{
    metadata: {
        totalWordCount: 5000,
        chunkCount: 5,
        estimatedReadingTime: 25,
        generated: "2025-01-15T10:30:00Z"
    },
    chunks: [
        {
            id: 1,
            title: "Introduction",
            html: "<h1>Introduction</h1><p>Content...</p>",
            metadata: { wordCount: 150, readingTime: 1 },
            headings: [...],
            links: [...],
            images: [...],
            tables: [...]
        }
    ],
    navigation: { ... },
    components: { toc: {...}, searchIndex: {...} }
}
```

## Advanced Features

### Document Analysis

```javascript
var analyzer = new documentChunking.DocumentAnalyzer();

mammoth.convert({path: 'document.docx'}, {
    transformDocument: function(document) {
        var analysis = analyzer.analyzeDocument(document);
        
        console.log('Analysis Results:');
        console.log('- Headings:', analysis.headings.length);
        console.log('- Max heading level:', analysis.maxHeadingLevel);
        console.log('- Tables:', analysis.tables.length);
        console.log('- Images:', analysis.images.length);
        console.log('- Links:', analysis.links.length);
        console.log('- Structure:');
        console.log('  - Chapters:', analysis.structure.chapterCount);
        console.log('  - Sections:', analysis.structure.sectionCount);
        console.log('  - Has TOC:', analysis.structure.hasTableOfContents);
        
        return document;
    }
});
```

### Cross-Reference Resolution

```javascript
var resolver = new documentChunking.CrossReferenceResolver();

// After chunking
var resolvedChunks = resolver.resolveReferences(chunks);

// Check resolved links
resolvedChunks.forEach(function(chunk) {
    chunk.links.forEach(function(link) {
        if (link.targetChunk) {
            console.log('Link "' + link.text + '" points to chunk ' + 
                       link.targetChunk + ' (' + link.targetFile + ')');
        }
    });
});
```

### Search Index Generation

```javascript
var indexGenerator = new documentChunking.IndexGenerator({
    minWordLength: 3,
    excludeWords: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to']
});

var index = indexGenerator.generateIndex(chunks);

console.log('Search index generated:');
console.log('- Total words:', index.wordCount);
console.log('- Generated:', index.generated);

// Search functionality
function searchIndex(query) {
    var results = [];
    var words = query.toLowerCase().split(/\s+/);
    
    words.forEach(function(word) {
        if (index.index[word]) {
            results = results.concat(index.index[word]);
        }
    });
    
    return results;
}
```

### Glossary Extraction

```javascript
var glossaryExtractor = new documentChunking.GlossaryExtractor({
    definitionPatterns: [
        /([A-Z][a-zA-Z\s]+?)\s+is\s+(.+?)\./gi,
        /([A-Z][a-zA-Z\s]+?)\s+means\s+(.+?)\./gi,
        /([A-Z][a-zA-Z\s]+?):\s+(.+?)\./gi
    ]
});

var glossary = glossaryExtractor.extractGlossary(chunks);

console.log('Glossary extracted:');
console.log('- Total terms:', glossary.count);

// Display glossary entries
Object.keys(glossary.entries).forEach(function(term) {
    var entry = glossary.entries[term];
    console.log('- ' + entry.term + ': ' + entry.definition);
});
```

## Custom Styling

The system generates clean, semantic HTML that can be styled with CSS. Default styles are provided, but can be customized:

```css
/* Chunk navigation */
.chunk-navigation {
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 15px;
    margin-bottom: 30px;
}

/* Navigation links */
.nav-link {
    padding: 8px 16px;
    border-radius: 4px;
    text-decoration: none;
    color: #0066cc;
    border: 1px solid #0066cc;
}

/* Table of contents */
.table-of-contents {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
}

/* Metadata sections */
.metadata {
    background-color: #f8f9fa;
    border-left: 4px solid #0066cc;
    padding: 15px;
    margin: 20px 0;
}

/* Glossary entries */
.glossary-entry {
    margin: 20px 0;
    padding: 15px;
    border-left: 3px solid #0066cc;
    background-color: #f8f9fa;
}
```

## Keyboard Navigation

The system includes built-in keyboard navigation support:

- **←** (Left Arrow): Previous chunk
- **→** (Right Arrow): Next chunk  
- **Home**: Return to index
- **H**: Return to index (shortcut)

Keyboard shortcuts are automatically enabled and work across all generated files.

## Error Handling

The system includes comprehensive error handling:

```javascript
chunker.chunkDocument(document, [])
    .then(function(result) {
        if (result.messages.length > 0) {
            result.messages.forEach(function(message) {
                if (message.type === 'error') {
                    console.error('Error:', message.message);
                } else if (message.type === 'warning') {
                    console.warn('Warning:', message.message);
                } else {
                    console.log('Info:', message.message);
                }
            });
        }
        
        if (result.value) {
            // Process successful result
            var chunks = result.value.chunks;
            // ...
        } else {
            console.error('Chunking failed');
        }
    })
    .catch(function(error) {
        console.error('Chunking error:', error.message);
    });
```

## Best Practices

### 1. Choose Appropriate Chunking Strategy
- **BY_HEADING_LEVEL**: Best for well-structured documents with consistent heading hierarchy
- **BY_CHAPTER**: Ideal for books or long reports with clear chapter divisions
- **BY_SECTION**: Good for documentation with section-based organization
- **BY_SIZE**: Useful for documents without clear structure or size-constrained output

### 2. Optimize for Target Use Case
- **Web Display**: Use SEPARATE_FILES format with navigation
- **Print/PDF**: Use SINGLE_FILE format
- **API Integration**: Use JSON format
- **Mobile**: Enable responsive CSS and keyboard navigation

### 3. Handle Large Documents
- Use size-based chunking for very large documents
- Enable search indexing for documents > 10,000 words
- Consider lazy-loading navigation for documents with > 50 chunks

### 4. Maintain Document Structure
- Preserve heading hierarchy in chunking decisions
- Keep related content together (avoid splitting mid-section)
- Maintain cross-references and internal links

### 5. Optimize Performance
- Process chunks in parallel when possible
- Cache navigation components for reuse
- Minimize HTML output size with semantic markup

## Integration Examples

### Express.js Web Server

```javascript
var express = require('express');
var fs = require('fs');
var chunkingIntegration = require('mammoth/lib/document-chunking-integration');

var app = express();

app.post('/upload-document', function(req, res) {
    // Handle file upload
    var documentPath = req.file.path;
    
    chunkingIntegration.convertAndChunk({path: documentPath}, {
        chunking: {
            strategy: 'byHeadingLevel',
            generateNavigation: true
        },
        output: {
            format: 'separate_files',
            outputDirectory: './public/documents'
        }
    }).then(function(result) {
        // Save generated files
        Object.keys(result.value.files).forEach(function(filename) {
            var file = result.value.files[filename];
            fs.writeFileSync('./public/documents/' + filename, file.content);
        });
        
        res.json({
            success: true,
            chunks: result.value.chunks.length,
            files: Object.keys(result.value.files)
        });
    });
});
```

### Static Site Generator

```javascript
var mammoth = require('mammoth');
var documentChunking = require('mammoth/lib/document-chunking');
var fs = require('fs');
var path = require('path');

function processDocumentFolder(inputDir, outputDir) {
    var docxFiles = fs.readdirSync(inputDir)
        .filter(file => path.extname(file) === '.docx');
    
    docxFiles.forEach(function(filename) {
        var inputPath = path.join(inputDir, filename);
        var baseName = path.basename(filename, '.docx');
        var chunkDir = path.join(outputDir, baseName);
        
        // Create output directory
        fs.mkdirSync(chunkDir, {recursive: true});
        
        // Process document
        mammoth.convert({path: inputPath}, {
            transformDocument: function(document) {
                var chunker = new documentChunking.DocumentChunker({
                    strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
                    baseUrl: './',
                    filePrefix: baseName + '-',
                    generateNavigation: true
                });
                
                return chunker.chunkDocument(document, [])
                    .then(function(result) {
                        // Generate and save files
                        generateStaticFiles(result.value, chunkDir);
                        return document;
                    });
            }
        });
    });
}
```

## Troubleshooting

### Common Issues

1. **Empty Chunks Generated**
   - Check heading structure in source document
   - Verify styleId patterns match document styles
   - Consider using size-based chunking as fallback

2. **Navigation Links Broken**
   - Ensure consistent baseUrl configuration
   - Check file naming conventions
   - Verify cross-reference resolution

3. **Missing Metadata**
   - Enable `includeMetadata` option
   - Check text extraction from document elements
   - Verify word counting algorithms

4. **Styling Issues**
   - Include CSS files in output
   - Check responsive design breakpoints
   - Validate HTML structure

5. **Performance Problems**
   - Use appropriate chunk size limits
   - Process documents asynchronously
   - Consider pagination for large document sets

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
var chunker = new documentChunking.DocumentChunker({
    debug: true,
    logLevel: 'verbose'
});

chunker.chunkDocument(document, [])
    .then(function(result) {
        // Check result.messages for detailed information
        result.messages.forEach(function(msg) {
            console.log(msg.type + ':', msg.message);
        });
    });
```

## API Reference

### DocumentChunker

#### Constructor
- `new DocumentChunker(options)`

#### Methods
- `chunkDocument(document, messages)` → Promise\<Result\>

#### Events
- `chunkCreated(chunk)`
- `analysisComplete(analysis)`
- `navigationGenerated(navigation)`

### TableOfContentsGenerator

#### Constructor  
- `new TableOfContentsGenerator(options)`

#### Methods
- `generateTOC(chunks, analysis)` → TOC Object

### NavigationBuilder

#### Constructor
- `new NavigationBuilder(options)`

#### Methods
- `buildNavigation(chunks, analysis)` → Navigation Object

### DocumentAnalyzer

#### Constructor
- `new DocumentAnalyzer()`

#### Methods
- `analyzeDocument(document)` → Analysis Object

### Utility Classes

- `CrossReferenceResolver` - Resolves links between chunks
- `IndexGenerator` - Generates search indexes
- `GlossaryExtractor` - Extracts glossary terms

## Contributing

The document chunking system is part of mammoth.js and follows the same contribution guidelines. When contributing:

1. Add tests for new features
2. Maintain backward compatibility
3. Follow existing code style
4. Update documentation
5. Consider performance implications

## License

The document chunking system is released under the same license as mammoth.js (BSD-2-Clause).