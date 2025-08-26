/**
 * Document Chunking Example for mammoth.js
 * 
 * This example demonstrates how to use the comprehensive document chunking
 * and navigation system to split large documents and generate navigation.
 */

var mammoth = require("../lib/index");
var fs = require("fs");
var path = require("path");
var documentChunking = require("../lib/document-chunking");

/**
 * Basic document chunking example
 */
function basicChunkingExample() {
    console.log("Basic Document Chunking Example");
    console.log("================================");
    
    // Read a DOCX file
    var inputPath = "./test-data/sample-document.docx";
    
    if (!fs.existsSync(inputPath)) {
        console.log("Sample document not found. Creating a demo...");
        return demonstrateWithMockDocument();
    }
    
    // Convert document and chunk it
    mammoth.convertToHtml({path: inputPath})
        .then(function(result) {
            console.log("Document converted successfully");
            
            // Create chunker with default settings
            var chunker = new documentChunking.DocumentChunker({
                strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
                maxLevel: 3,
                generateNavigation: true,
                includeMetadata: true,
                baseUrl: "./chunks/",
                filePrefix: "section-",
                fileSuffix: ".html"
            });
            
            // Parse the document into mammoth's internal format for chunking
            return mammoth.convert({path: inputPath}, {
                transformDocument: function(document) {
                    // Chunk the document
                    return chunker.chunkDocument(document, [])
                        .then(function(chunkResult) {
                            if (chunkResult.value) {
                                console.log("Document chunked into " + chunkResult.value.chunks.length + " chunks");
                                
                                // Save chunks to files
                                saveChunksToFiles(chunkResult.value);
                                
                                // Generate table of contents
                                generateTableOfContents(chunkResult.value);
                                
                                // Display analysis results
                                displayAnalysisResults(chunkResult.value.analysis);
                            }
                            
                            return document; // Return original document
                        });
                }
            });
        })
        .then(function() {
            console.log("Chunking process completed successfully!");
        })
        .catch(function(error) {
            console.error("Error during document processing:", error);
        });
}

/**
 * Advanced chunking with custom options
 */
function advancedChunkingExample() {
    console.log("\nAdvanced Document Chunking Example");
    console.log("==================================");
    
    // Configuration for different chunking strategies
    var strategies = [
        {
            name: "By Chapter (H1 only)",
            config: {
                strategy: documentChunking.ChunkingStrategies.BY_CHAPTER,
                filePrefix: "chapter-",
                generateNavigation: true
            }
        },
        {
            name: "By Size (2000 characters)",
            config: {
                strategy: documentChunking.ChunkingStrategies.BY_SIZE,
                chunkSizeLimit: 2000,
                filePrefix: "chunk-",
                generateNavigation: true
            }
        },
        {
            name: "By Section (H1-H2)",
            config: {
                strategy: documentChunking.ChunkingStrategies.BY_SECTION,
                maxLevel: 2,
                filePrefix: "section-",
                generateNavigation: true,
                includeMetadata: true
            }
        }
    ];
    
    // Demonstrate each strategy
    strategies.forEach(function(strategy, index) {
        setTimeout(function() {
            console.log("\n--- " + strategy.name + " ---");
            demonstrateStrategy(strategy.config, strategy.name);
        }, index * 1000);
    });
}

/**
 * Table of Contents generation example
 */
function tableOfContentsExample() {
    console.log("\nTable of Contents Generation Example");
    console.log("====================================");
    
    var tocGenerator = new documentChunking.TableOfContentsGenerator({
        maxDepth: 4,
        numbering: true,
        collapsible: true,
        baseUrl: "./",
        includePageNumbers: false
    });
    
    // Create mock chunks for demonstration
    var mockChunks = createMockChunks();
    var mockAnalysis = createMockAnalysis();
    
    var toc = tocGenerator.generateTOC(mockChunks, mockAnalysis);
    
    console.log("Table of Contents generated:");
    console.log("- Total entries:", toc.metadata.totalEntries);
    console.log("- Max depth:", toc.metadata.maxDepth);
    console.log("- Generated at:", toc.metadata.generated);
    
    // Save TOC to HTML file
    saveTOCToFile(toc);
}

/**
 * Navigation building example
 */
function navigationBuildingExample() {
    console.log("\nNavigation Building Example");
    console.log("===========================");
    
    var navBuilder = new documentChunking.NavigationBuilder({
        baseUrl: "./chunks/",
        filePrefix: "section-",
        fileSuffix: ".html",
        includeBreadcrumbs: true,
        includeNavButtons: true,
        includeSidebar: true,
        includeJumpDropdown: true
    });
    
    var mockChunks = createMockChunks();
    var mockAnalysis = createMockAnalysis();
    
    var navigation = navBuilder.buildNavigation(mockChunks, mockAnalysis);
    
    console.log("Navigation components generated:");
    console.log("- Previous/Next navigation: Available for " + Object.keys(navigation.prevNext).length + " chunks");
    console.log("- Breadcrumbs: Available for " + Object.keys(navigation.breadcrumbs).length + " chunks");
    console.log("- Sidebar items:", navigation.sidebar.items.length);
    console.log("- Jump dropdown options:", navigation.jumpDropdown.options.length);
    
    // Save navigation components
    saveNavigationComponents(navigation);
}

/**
 * Document analysis example
 */
function documentAnalysisExample() {
    console.log("\nDocument Analysis Example");
    console.log("=========================");
    
    var analyzer = new documentChunking.DocumentAnalyzer();
    
    // Create mock document for analysis
    var mockDocument = createMockDocument();
    var analysis = analyzer.analyzeDocument(mockDocument);
    
    displayAnalysisResults(analysis);
}

/**
 * Cross-reference resolution example
 */
function crossReferenceExample() {
    console.log("\nCross-Reference Resolution Example");
    console.log("==================================");
    
    var resolver = new documentChunking.CrossReferenceResolver();
    var mockChunks = createMockChunksWithReferences();
    
    var resolvedChunks = resolver.resolveReferences(mockChunks);
    
    console.log("Cross-references resolved:");
    resolvedChunks.forEach(function(chunk) {
        chunk.links.forEach(function(link) {
            if (link.targetChunk) {
                console.log("- Link '" + link.text + "' points to chunk " + link.targetChunk + " (" + link.targetFile + ")");
            }
        });
    });
}

/**
 * Index generation example
 */
function indexGenerationExample() {
    console.log("\nIndex Generation Example");
    console.log("========================");
    
    var indexGenerator = new documentChunking.IndexGenerator({
        minWordLength: 4,
        excludeWords: ['this', 'that', 'with', 'from', 'they', 'were', 'have', 'been']
    });
    
    var mockChunks = createMockChunksWithContent();
    var index = indexGenerator.generateIndex(mockChunks);
    
    console.log("Search index generated:");
    console.log("- Total words indexed:", index.wordCount);
    console.log("- Generated at:", index.generated);
    
    // Show sample index entries
    var words = Object.keys(index.index).slice(0, 10);
    words.forEach(function(word) {
        console.log("- '" + word + "': found in " + index.index[word].length + " location(s)");
    });
    
    saveIndexToFile(index);
}

/**
 * Glossary extraction example
 */
function glossaryExtractionExample() {
    console.log("\nGlossary Extraction Example");
    console.log("===========================");
    
    var glossaryExtractor = new documentChunking.GlossaryExtractor({
        definitionPatterns: [
            /([A-Z][a-zA-Z\s]+?)\s+is\s+(.+?)\./gi,
            /([A-Z][a-zA-Z\s]+?)\s+means\s+(.+?)\./gi,
            /([A-Z][a-zA-Z\s]+?):\s+(.+?)\./gi
        ]
    });
    
    var mockChunks = createMockChunksWithDefinitions();
    var glossary = glossaryExtractor.extractGlossary(mockChunks);
    
    console.log("Glossary extracted:");
    console.log("- Total terms:", glossary.count);
    console.log("- Generated at:", glossary.generated);
    
    // Display glossary entries
    Object.keys(glossary.entries).forEach(function(term) {
        var entry = glossary.entries[term];
        console.log("- " + entry.term + ": " + entry.definition + " (from " + entry.fileName + ")");
    });
    
    saveGlossaryToFile(glossary);
}

// Helper functions

function demonstrateWithMockDocument() {
    console.log("Demonstrating with mock document structure...");
    
    var mockDocument = createMockDocument();
    
    var chunker = new documentChunking.DocumentChunker({
        strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
        maxLevel: 3,
        generateNavigation: true,
        includeMetadata: true
    });
    
    return chunker.chunkDocument(mockDocument, [])
        .then(function(result) {
            if (result.value) {
                console.log("Mock document chunked into " + result.value.chunks.length + " chunks");
                displayChunkSummary(result.value.chunks);
            }
        });
}

function demonstrateStrategy(config, strategyName) {
    var mockDocument = createMockDocument();
    var chunker = new documentChunking.DocumentChunker(config);
    
    chunker.chunkDocument(mockDocument, [])
        .then(function(result) {
            if (result.value) {
                console.log(strategyName + " produced " + result.value.chunks.length + " chunks");
                result.value.chunks.forEach(function(chunk) {
                    console.log("  - " + chunk.title + " (" + chunk.metadata.wordCount + " words)");
                });
            }
        });
}

function saveChunksToFiles(chunkingResult) {
    var outputDir = "./chunks";
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
    }
    
    chunkingResult.chunks.forEach(function(chunk) {
        var htmlContent = generateChunkHTML(chunk, chunkingResult.navigation);
        var filePath = path.join(outputDir, chunk.fileName);
        fs.writeFileSync(filePath, htmlContent);
        console.log("Saved chunk: " + filePath);
    });
}

function generateChunkHTML(chunk, navigation) {
    var nav = navigation.prevNext[chunk.id];
    var prevLink = nav.previous ? '<a href="' + nav.previous.href + '">← ' + nav.previous.title + '</a>' : '';
    var nextLink = nav.next ? '<a href="' + nav.next.href + '">' + nav.next.title + ' →</a>' : '';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${chunk.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .navigation { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
        .nav-links { display: flex; justify-content: space-between; }
        .metadata { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-top: 20px; }
        .chunk-content { line-height: 1.6; }
    </style>
</head>
<body>
    <div class="navigation">
        <div class="nav-links">
            <div>${prevLink}</div>
            <div>${nextLink}</div>
        </div>
    </div>
    
    <div class="chunk-content">
        <h1>${chunk.title}</h1>
        <!-- Chunk content would be inserted here -->
        <p><em>Chunk content converted from document elements...</em></p>
    </div>
    
    <div class="metadata">
        <h3>Chunk Information</h3>
        <ul>
            <li>Word Count: ${chunk.metadata.wordCount}</li>
            <li>Reading Time: ${chunk.metadata.readingTime} minute(s)</li>
            <li>Headings: ${chunk.headings.length}</li>
            <li>Links: ${chunk.links.length}</li>
            <li>Images: ${chunk.images.length}</li>
            <li>Tables: ${chunk.tables.length}</li>
        </ul>
    </div>
</body>
</html>`;
}

function generateTableOfContents(chunkingResult) {
    var tocGenerator = new documentChunking.TableOfContentsGenerator({
        maxDepth: 4,
        numbering: true,
        baseUrl: "./chunks/"
    });
    
    var toc = tocGenerator.generateTOC(chunkingResult.chunks, chunkingResult.analysis);
    saveTOCToFile(toc);
}

function saveTOCToFile(toc) {
    var tocHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Table of Contents</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .table-of-contents ol { padding-left: 20px; }
        .table-of-contents li { margin: 5px 0; }
        .toc-link { text-decoration: none; color: #333; }
        .toc-link:hover { color: #0066cc; text-decoration: underline; }
        .chunk-title { font-weight: bold; }
    </style>
</head>
<body>
    <h1>Table of Contents</h1>
    <div class="table-of-contents">
        <!-- TOC HTML would be rendered here -->
        <p><em>Table of Contents generated with ${toc.metadata.totalEntries} entries</em></p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync("./chunks/table-of-contents.html", tocHTML);
    console.log("Table of Contents saved to: ./chunks/table-of-contents.html");
}

function saveNavigationComponents(navigation) {
    var outputDir = "./chunks";
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
    }
    
    // Save sidebar HTML
    var sidebarHTML = `
<div class="document-sidebar">
    ${navigation.sidebar.items.map(function(item) {
        return '<div class="sidebar-item"><a href="' + item.href + '">' + item.title + '</a></div>';
    }).join('')}
</div>`;
    
    fs.writeFileSync(path.join(outputDir, "sidebar.html"), sidebarHTML);
    
    // Save keyboard navigation script
    fs.writeFileSync(path.join(outputDir, "keyboard-nav.js"), navigation.keyboardShortcuts.script);
    
    console.log("Navigation components saved to ./chunks/");
}

function saveIndexToFile(index) {
    var indexData = JSON.stringify(index, null, 2);
    fs.writeFileSync("./chunks/search-index.json", indexData);
    console.log("Search index saved to: ./chunks/search-index.json");
}

function saveGlossaryToFile(glossary) {
    var glossaryHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Glossary</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .glossary-entry { margin: 10px 0; padding: 10px; border-left: 3px solid #0066cc; }
        .term { font-weight: bold; color: #0066cc; }
        .definition { margin-top: 5px; }
    </style>
</head>
<body>
    <h1>Glossary</h1>
    ${Object.keys(glossary.entries).map(function(term) {
        var entry = glossary.entries[term];
        return '<div class="glossary-entry"><div class="term">' + entry.term + '</div><div class="definition">' + entry.definition + '</div></div>';
    }).join('')}
</body>
</html>`;
    
    fs.writeFileSync("./chunks/glossary.html", glossaryHTML);
    console.log("Glossary saved to: ./chunks/glossary.html");
}

function displayAnalysisResults(analysis) {
    console.log("Document Analysis Results:");
    console.log("- Headings found:", analysis.headings.length);
    console.log("- Max heading level:", analysis.maxHeadingLevel);
    console.log("- Tables found:", analysis.tables.length);
    console.log("- Images found:", analysis.images.length);
    console.log("- Links found:", analysis.links.length);
    console.log("- Bookmarks found:", analysis.bookmarks.length);
    console.log("- Structure analysis:");
    console.log("  - Chapters (H1):", analysis.structure.chapterCount);
    console.log("  - Sections (H2):", analysis.structure.sectionCount);
    console.log("  - Has TOC:", analysis.structure.hasTableOfContents);
    console.log("  - Has Index:", analysis.structure.hasIndex);
    console.log("  - Has Glossary:", analysis.structure.hasGlossary);
}

function displayChunkSummary(chunks) {
    console.log("Chunk Summary:");
    chunks.forEach(function(chunk) {
        console.log("- " + chunk.title + " (" + chunk.metadata.wordCount + " words, " + 
                   chunk.metadata.readingTime + " min read)");
    });
}

// Mock data creation functions for demonstration

function createMockDocument() {
    var documents = require("../lib/documents");
    
    return documents.Document([
        documents.Paragraph([documents.Text("Introduction")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("This is the introduction to our document.")]),
        documents.Paragraph([documents.Text("Chapter 1: Getting Started")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("Section 1.1: Basic Concepts")], {styleId: "Heading2"}),
        documents.Paragraph([documents.Text("Here we discuss the basic concepts.")]),
        documents.Paragraph([documents.Text("Section 1.2: Advanced Topics")], {styleId: "Heading2"}),
        documents.Paragraph([documents.Text("Advanced topics are covered here.")]),
        documents.Paragraph([documents.Text("Chapter 2: Implementation")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("Implementation details follow.")]),
        documents.Paragraph([documents.Text("Conclusion")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("This concludes our document.")])
    ]);
}

function createMockChunks() {
    return [
        {
            id: 1,
            title: "Introduction",
            level: 1,
            fileName: "section-1.html",
            headings: [],
            links: [],
            images: [],
            tables: [],
            metadata: {wordCount: 150, readingTime: 1}
        },
        {
            id: 2,
            title: "Chapter 1: Getting Started",
            level: 1,
            fileName: "section-2.html",
            headings: [
                {level: 2, text: "Basic Concepts"},
                {level: 2, text: "Advanced Topics"}
            ],
            links: [],
            images: [],
            tables: [],
            metadata: {wordCount: 300, readingTime: 2}
        },
        {
            id: 3,
            title: "Chapter 2: Implementation",
            level: 1,
            fileName: "section-3.html",
            headings: [],
            links: [],
            images: [],
            tables: [],
            metadata: {wordCount: 450, readingTime: 3}
        }
    ];
}

function createMockAnalysis() {
    return {
        headings: [
            {level: 1, text: "Introduction"},
            {level: 1, text: "Chapter 1: Getting Started"},
            {level: 2, text: "Basic Concepts"},
            {level: 2, text: "Advanced Topics"},
            {level: 1, text: "Chapter 2: Implementation"}
        ],
        maxHeadingLevel: 2,
        tables: [],
        images: [],
        links: [],
        bookmarks: [],
        structure: {
            hasTableOfContents: false,
            hasIndex: false,
            hasGlossary: false,
            chapterCount: 3,
            sectionCount: 2
        }
    };
}

function createMockChunksWithReferences() {
    return [
        {
            id: 1,
            title: "Introduction",
            fileName: "intro.html",
            links: [
                {href: "#chapter1", text: "See Chapter 1"}
            ],
            content: []
        },
        {
            id: 2,
            title: "Chapter 1",
            fileName: "chapter1.html",
            links: [],
            content: []
        }
    ];
}

function createMockChunksWithContent() {
    return [
        {
            id: 1,
            title: "Introduction",
            fileName: "intro.html",
            content: [{
                type: "paragraph",
                children: [{type: "text", value: "This document explains programming concepts and software development practices."}]
            }]
        },
        {
            id: 2,
            title: "Programming Basics",
            fileName: "basics.html", 
            content: [{
                type: "paragraph",
                children: [{type: "text", value: "Programming involves writing code using various programming languages and development tools."}]
            }]
        }
    ];
}

function createMockChunksWithDefinitions() {
    return [
        {
            id: 1,
            title: "Definitions",
            fileName: "definitions.html",
            content: [{
                type: "paragraph",
                children: [{
                    type: "text", 
                    value: "API is a set of protocols and tools for building software applications. Machine Learning means the ability of computers to learn without being explicitly programmed. Database: a structured collection of data."
                }]
            }]
        }
    ];
}

// Main execution
if (require.main === module) {
    console.log("Document Chunking Examples for mammoth.js");
    console.log("==========================================\n");
    
    // Run all examples
    basicChunkingExample();
    
    setTimeout(function() {
        advancedChunkingExample();
    }, 2000);
    
    setTimeout(function() {
        tableOfContentsExample();
    }, 4000);
    
    setTimeout(function() {
        navigationBuildingExample();
    }, 6000);
    
    setTimeout(function() {
        documentAnalysisExample();
    }, 8000);
    
    setTimeout(function() {
        crossReferenceExample();
    }, 10000);
    
    setTimeout(function() {
        indexGenerationExample();
    }, 12000);
    
    setTimeout(function() {
        glossaryExtractionExample();
    }, 14000);
}

module.exports = {
    basicChunkingExample: basicChunkingExample,
    advancedChunkingExample: advancedChunkingExample,
    tableOfContentsExample: tableOfContentsExample,
    navigationBuildingExample: navigationBuildingExample,
    documentAnalysisExample: documentAnalysisExample,
    crossReferenceExample: crossReferenceExample,
    indexGenerationExample: indexGenerationExample,
    glossaryExtractionExample: glossaryExtractionExample
};