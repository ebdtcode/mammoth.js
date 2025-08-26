var assert = require("assert");
var documentChunking = require("../lib/document-chunking");
var documents = require("../lib/documents");

describe("Document Chunking", function() {
    
    describe("DocumentChunker", function() {
        
        it("can chunk a simple document by heading levels", function() {
            var document = createSimpleDocument();
            var chunker = new documentChunking.DocumentChunker({
                strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
                maxLevel: 2
            });
            
            return chunker.chunkDocument(document, []).then(function(result) {
                assert.equal(result.messages.length, 0);
                assert.notEqual(result.value, null);
                
                var chunks = result.value.chunks;
                assert.equal(chunks.length, 3); // Intro, Chapter 1, Chapter 2
                assert.equal(chunks[0].title, "Introduction");
                assert.equal(chunks[1].title, "Chapter 1");
                assert.equal(chunks[2].title, "Chapter 2");
            });
        });
        
        it("can chunk by chapter level only", function() {
            var document = createDocumentWithSubheadings();
            var chunker = new documentChunking.DocumentChunker({
                strategy: documentChunking.ChunkingStrategies.BY_CHAPTER
            });
            
            return chunker.chunkDocument(document, []).then(function(result) {
                var chunks = result.value.chunks;
                assert.equal(chunks.length, 2); // Only H1 elements create new chunks
                assert.equal(chunks[0].title, "Chapter 1");
                assert.equal(chunks[1].title, "Chapter 2");
                // H2 elements should be included in chunk content
                assert(chunks[0].headings.length > 0);
            });
        });
        
        it("can chunk by size limit", function() {
            var document = createLargeDocument();
            var chunker = new documentChunking.DocumentChunker({
                strategy: documentChunking.ChunkingStrategies.BY_SIZE,
                chunkSizeLimit: 100 // Very small limit for testing
            });
            
            return chunker.chunkDocument(document, []).then(function(result) {
                var chunks = result.value.chunks;
                assert(chunks.length > 1); // Should create multiple chunks due to size
                
                // Check that chunks don't exceed size limit significantly
                chunks.forEach(function(chunk) {
                    assert(chunk.metadata.characterCount <= 200); // Allow some overhead
                });
            });
        });
        
        it("generates metadata for chunks", function() {
            var document = createSimpleDocument();
            var chunker = new documentChunking.DocumentChunker({
                includeMetadata: true
            });
            
            return chunker.chunkDocument(document, []).then(function(result) {
                var chunks = result.value.chunks;
                
                chunks.forEach(function(chunk) {
                    assert(typeof chunk.metadata.wordCount === "number");
                    assert(typeof chunk.metadata.readingTime === "number");
                    assert(typeof chunk.metadata.characterCount === "number");
                    assert(chunk.metadata.wordCount >= 0);
                });
            });
        });
        
        it("preserves cross-references between chunks", function() {
            var document = createDocumentWithReferences();
            var chunker = new documentChunking.DocumentChunker({
                preserveLinks: true
            });
            
            return chunker.chunkDocument(document, []).then(function(result) {
                var chunks = result.value.chunks;
                
                // Find chunk with internal link
                var chunkWithLink = chunks.find(function(chunk) {
                    return chunk.links.length > 0;
                });
                
                if (chunkWithLink) {
                    var link = chunkWithLink.links[0];
                    assert(link.targetChunk !== undefined);
                    assert(link.targetFile !== undefined);
                }
            });
        });
    });
    
    describe("TableOfContentsGenerator", function() {
        
        it("can generate a table of contents from chunks", function() {
            var chunks = createMockChunks();
            var analysis = createMockAnalysis();
            var generator = new documentChunking.TableOfContentsGenerator({
                maxDepth: 3,
                numbering: true
            });
            
            var toc = generator.generateTOC(chunks, analysis);
            
            assert(toc.entries.length > 0);
            assert(typeof toc.metadata.totalEntries === "number");
            assert(typeof toc.metadata.maxDepth === "number");
            assert(toc.metadata.generated instanceof Date);
            
            // Check that entries have required properties
            toc.entries.forEach(function(entry) {
                assert(typeof entry.title === "string");
                assert(typeof entry.level === "number");
                assert(typeof entry.href === "string");
            });
        });
        
        it("respects max depth setting", function() {
            var chunks = createMockChunksWithDeepHeadings();
            var analysis = createMockAnalysisWithDeepHeadings();
            var generator = new documentChunking.TableOfContentsGenerator({
                maxDepth: 2
            });
            
            var toc = generator.generateTOC(chunks, analysis);
            
            // All entries should be level 2 or less
            toc.entries.forEach(function(entry) {
                assert(entry.level <= 2);
            });
        });
    });
    
    describe("NavigationBuilder", function() {
        
        it("can build previous/next navigation", function() {
            var chunks = createMockChunks();
            var analysis = createMockAnalysis();
            var builder = new documentChunking.NavigationBuilder();
            
            var navigation = builder.buildNavigation(chunks, analysis);
            
            assert(navigation.prevNext);
            
            // First chunk should have no previous
            assert(navigation.prevNext[chunks[0].id].previous === undefined);
            assert(navigation.prevNext[chunks[0].id].next !== undefined);
            
            // Last chunk should have no next
            var lastChunk = chunks[chunks.length - 1];
            assert(navigation.prevNext[lastChunk.id].next === undefined);
            assert(navigation.prevNext[lastChunk.id].previous !== undefined);
            
            // Middle chunks should have both
            if (chunks.length > 2) {
                var middleChunk = chunks[1];
                assert(navigation.prevNext[middleChunk.id].previous !== undefined);
                assert(navigation.prevNext[middleChunk.id].next !== undefined);
            }
        });
        
        it("can build breadcrumbs", function() {
            var chunks = createMockChunks();
            var analysis = createMockAnalysis();
            var builder = new documentChunking.NavigationBuilder({
                includeBreadcrumbs: true
            });
            
            var navigation = builder.buildNavigation(chunks, analysis);
            
            assert(navigation.breadcrumbs);
            
            chunks.forEach(function(chunk) {
                var crumbs = navigation.breadcrumbs[chunk.id];
                assert(Array.isArray(crumbs));
                assert(crumbs.length >= 2); // At least Home + Current
                assert(crumbs[0].isFirst);
                assert(crumbs[crumbs.length - 1].isLast);
            });
        });
        
        it("can build sidebar navigation", function() {
            var chunks = createMockChunks();
            var analysis = createMockAnalysis();
            var builder = new documentChunking.NavigationBuilder({
                includeSidebar: true
            });
            
            var navigation = builder.buildNavigation(chunks, analysis);
            
            assert(navigation.sidebar);
            assert(navigation.sidebar.items);
            assert(navigation.sidebar.html);
            assert(navigation.sidebar.items.length === chunks.length);
        });
    });
    
    describe("DocumentAnalyzer", function() {
        
        it("can analyze document structure", function() {
            var document = createDocumentWithMultipleElements();
            var analyzer = new documentChunking.DocumentAnalyzer();
            
            var analysis = analyzer.analyzeDocument(document);
            
            assert(typeof analysis.maxHeadingLevel === "number");
            assert(Array.isArray(analysis.headings));
            assert(Array.isArray(analysis.tables));
            assert(Array.isArray(analysis.images));
            assert(Array.isArray(analysis.links));
            assert(Array.isArray(analysis.bookmarks));
            assert(typeof analysis.structure === "object");
        });
        
        it("detects heading levels correctly", function() {
            var document = documents.Document([
                documents.Paragraph([documents.Text("Chapter 1")], {styleId: "Heading1"}),
                documents.Paragraph([documents.Text("Section 1.1")], {styleId: "Heading2"}),
                documents.Paragraph([documents.Text("Subsection 1.1.1")], {styleId: "Heading3"})
            ]);
            
            var analyzer = new documentChunking.DocumentAnalyzer();
            var analysis = analyzer.analyzeDocument(document);
            
            assert.equal(analysis.headings.length, 3);
            assert.equal(analysis.headings[0].level, 1);
            assert.equal(analysis.headings[1].level, 2);
            assert.equal(analysis.headings[2].level, 3);
            assert.equal(analysis.maxHeadingLevel, 3);
        });
        
        it("counts structural elements", function() {
            var document = createDocumentWithMultipleElements();
            var analyzer = new documentChunking.DocumentAnalyzer();
            
            var analysis = analyzer.analyzeDocument(document);
            
            assert(analysis.structure.chapterCount >= 0);
            assert(analysis.structure.sectionCount >= 0);
        });
    });
    
    describe("CrossReferenceResolver", function() {
        
        it("can resolve cross-references between chunks", function() {
            var chunks = createMockChunksWithReferences();
            var resolver = new documentChunking.CrossReferenceResolver();
            
            var resolvedChunks = resolver.resolveReferences(chunks);
            
            // Find chunk with resolved reference
            var chunkWithResolvedLink = resolvedChunks.find(function(chunk) {
                return chunk.links.some(function(link) {
                    return link.targetChunk !== undefined;
                });
            });
            
            if (chunkWithResolvedLink) {
                var resolvedLink = chunkWithResolvedLink.links.find(function(link) {
                    return link.targetChunk !== undefined;
                });
                assert(resolvedLink.targetFile);
                assert(resolvedLink.resolvedHref);
            }
        });
    });
    
    describe("IndexGenerator", function() {
        
        it("can generate search index from chunks", function() {
            var chunks = createMockChunksWithContent();
            var generator = new documentChunking.IndexGenerator({
                minWordLength: 3
            });
            
            var index = generator.generateIndex(chunks);
            
            assert(typeof index.index === "object");
            assert(typeof index.wordCount === "number");
            assert(index.generated instanceof Date);
            assert(index.wordCount > 0);
            
            // Check that index contains word entries
            var words = Object.keys(index.index);
            assert(words.length > 0);
            
            words.forEach(function(word) {
                assert(Array.isArray(index.index[word]));
                assert(word.length >= 3); // Respects minWordLength
            });
        });
        
        it("excludes common words", function() {
            var chunks = createMockChunksWithContent();
            var generator = new documentChunking.IndexGenerator({
                excludeWords: ['the', 'and', 'programming']
            });
            
            var index = generator.generateIndex(chunks);
            
            // Excluded words should not appear in index
            assert(index.index.the === undefined);
            assert(index.index.and === undefined);
            assert(index.index.programming === undefined);
        });
    });
    
    describe("GlossaryExtractor", function() {
        
        it("can extract glossary terms from chunks", function() {
            var chunks = createMockChunksWithDefinitions();
            var extractor = new documentChunking.GlossaryExtractor();
            
            var glossary = extractor.extractGlossary(chunks);
            
            assert(typeof glossary.entries === "object");
            assert(typeof glossary.count === "number");
            assert(glossary.generated instanceof Date);
            
            if (glossary.count > 0) {
                var terms = Object.keys(glossary.entries);
                terms.forEach(function(term) {
                    var entry = glossary.entries[term];
                    assert(typeof entry.term === "string");
                    assert(typeof entry.definition === "string");
                    assert(typeof entry.chunkId !== "undefined");
                    assert(typeof entry.fileName === "string");
                });
            }
        });
        
        it("recognizes different definition patterns", function() {
            var chunks = [{
                id: 1,
                fileName: "test.html",
                content: [{
                    type: "paragraph",
                    children: [{
                        type: "text", 
                        value: "API is a set of protocols. Machine Learning means automated learning. Database: structured data storage."
                    }]
                }]
            }];
            
            var extractor = new documentChunking.GlossaryExtractor();
            var glossary = extractor.extractGlossary(chunks);
            
            // Should extract at least one term from each pattern
            assert(glossary.count >= 1);
        });
    });
});

// Helper functions to create test data

function createSimpleDocument() {
    return documents.Document([
        documents.Paragraph([documents.Text("Introduction")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("This is the introduction.")]),
        documents.Paragraph([documents.Text("Chapter 1")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("This is chapter 1.")]),
        documents.Paragraph([documents.Text("Chapter 2")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("This is chapter 2.")])
    ]);
}

function createDocumentWithSubheadings() {
    return documents.Document([
        documents.Paragraph([documents.Text("Chapter 1")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("Introduction to chapter 1.")]),
        documents.Paragraph([documents.Text("Section 1.1")], {styleId: "Heading2"}),
        documents.Paragraph([documents.Text("Details of section 1.1.")]),
        documents.Paragraph([documents.Text("Section 1.2")], {styleId: "Heading2"}),
        documents.Paragraph([documents.Text("Details of section 1.2.")]),
        documents.Paragraph([documents.Text("Chapter 2")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("Introduction to chapter 2.")])
    ]);
}

function createLargeDocument() {
    var elements = [];
    for (var i = 1; i <= 5; i++) {
        elements.push(documents.Paragraph([documents.Text("Section " + i)], {styleId: "Heading1"}));
        for (var j = 1; j <= 10; j++) {
            elements.push(documents.Paragraph([documents.Text("This is paragraph " + j + " in section " + i + ". It contains multiple sentences to increase the content size. Each paragraph adds to the total character count of the document.")]));
        }
    }
    return documents.Document(elements);
}

function createDocumentWithReferences() {
    return documents.Document([
        documents.Paragraph([documents.Text("Chapter 1")], {styleId: "Heading1"}),
        documents.Paragraph([
            documents.Text("See "),
            documents.Hyperlink([documents.Text("Chapter 2")], {anchor: "chapter2"}),
            documents.Text(" for more details.")
        ]),
        documents.BookmarkStart({name: "chapter2"}),
        documents.Paragraph([documents.Text("Chapter 2")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("This is chapter 2 content.")])
    ]);
}

function createDocumentWithMultipleElements() {
    return documents.Document([
        documents.Paragraph([documents.Text("Chapter 1")], {styleId: "Heading1"}),
        documents.Paragraph([documents.Text("Section 1.1")], {styleId: "Heading2"}),
        documents.Table([
            documents.TableRow([
                documents.TableCell([documents.Paragraph([documents.Text("Cell 1")])])
            ])
        ]),
        documents.Paragraph([
            documents.Hyperlink([documents.Text("External Link")], {href: "http://example.com"})
        ]),
        documents.BookmarkStart({name: "bookmark1"})
    ]);
}

function createMockChunks() {
    return [
        {
            id: 1,
            title: "Introduction",
            level: 1,
            fileName: "intro.html",
            headings: [],
            links: [],
            images: [],
            tables: [],
            metadata: {wordCount: 100, readingTime: 1}
        },
        {
            id: 2,
            title: "Chapter 1",
            level: 1,
            fileName: "chapter1.html",
            headings: [
                {level: 2, text: "Section 1.1"},
                {level: 2, text: "Section 1.2"}
            ],
            links: [],
            images: [],
            tables: [],
            metadata: {wordCount: 200, readingTime: 1}
        },
        {
            id: 3,
            title: "Chapter 2",
            level: 1,
            fileName: "chapter2.html",
            headings: [],
            links: [],
            images: [],
            tables: [],
            metadata: {wordCount: 150, readingTime: 1}
        }
    ];
}

function createMockChunksWithDeepHeadings() {
    return [
        {
            id: 1,
            title: "Chapter 1",
            level: 1,
            fileName: "chapter1.html",
            headings: [
                {level: 2, text: "Section 1.1"},
                {level: 3, text: "Subsection 1.1.1"},
                {level: 4, text: "Deep Subsection"}, // Level 4 - should be excluded when maxDepth=2
                {level: 2, text: "Section 1.2"}
            ],
            links: [],
            images: [],
            tables: [],
            metadata: {wordCount: 200, readingTime: 1}
        }
    ];
}

function createMockAnalysis() {
    return {
        headings: [
            {level: 1, text: "Introduction"},
            {level: 1, text: "Chapter 1"},
            {level: 2, text: "Section 1.1"},
            {level: 2, text: "Section 1.2"},
            {level: 1, text: "Chapter 2"}
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

function createMockAnalysisWithDeepHeadings() {
    return {
        headings: [
            {level: 1, text: "Chapter 1"},
            {level: 2, text: "Section 1.1"},
            {level: 3, text: "Subsection 1.1.1"},
            {level: 4, text: "Deep Subsection"},
            {level: 2, text: "Section 1.2"}
        ],
        maxHeadingLevel: 4,
        tables: [],
        images: [],
        links: [],
        bookmarks: [],
        structure: {
            hasTableOfContents: false,
            hasIndex: false,
            hasGlossary: false,
            chapterCount: 1,
            sectionCount: 2
        }
    };
}

function createMockChunksWithReferences() {
    return [
        {
            id: 1,
            title: "Chapter 1",
            fileName: "chapter1.html",
            links: [
                {href: "#chapter2", text: "See Chapter 2"}
            ],
            content: [
                documents.BookmarkStart({name: "chapter1"})
            ]
        },
        {
            id: 2,
            title: "Chapter 2",
            fileName: "chapter2.html",
            links: [],
            content: [
                documents.BookmarkStart({name: "chapter2"})
            ]
        }
    ];
}

function createMockChunksWithContent() {
    return [
        {
            id: 1,
            title: "Programming Concepts",
            fileName: "programming.html",
            content: [{
                type: "paragraph",
                children: [{type: "text", value: "Programming involves writing code using various programming languages and development tools for software applications."}]
            }]
        },
        {
            id: 2,
            title: "Software Development",
            fileName: "development.html", 
            content: [{
                type: "paragraph",
                children: [{type: "text", value: "Software development requires understanding algorithms, data structures, and system design principles."}]
            }]
        }
    ];
}

function createMockChunksWithDefinitions() {
    return [
        {
            id: 1,
            title: "Technical Terms",
            fileName: "terms.html",
            content: [{
                type: "paragraph",
                children: [{
                    type: "text", 
                    value: "API is a set of protocols and tools for building software applications. Machine Learning means the ability of computers to learn without being explicitly programmed. Database: a structured collection of data that is organized for easy access and management."
                }]
            }]
        }
    ];
}
