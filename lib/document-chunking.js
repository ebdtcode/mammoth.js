var _ = require("underscore");
var promises = require("./promises");
var documents = require("./documents");
var Html = require("./html");
var results = require("./results");

/**
 * Chunking Strategies enumeration
 */
var ChunkingStrategies = {
    BY_HEADING_LEVEL: "byHeadingLevel",
    BY_CHAPTER: "byChapter", 
    BY_SECTION: "bySection",
    BY_SIZE: "bySize",
    CUSTOM: "custom"
};

/**
 * Document Chunking and Navigation System for mammoth.js
 * 
 * This module provides comprehensive document chunking capabilities including:
 * - Document splitting by heading levels
 * - Table of contents generation
 * - Navigation utilities
 * - Cross-reference resolution
 * - Metadata extraction
 */

exports.DocumentChunker = DocumentChunker;
exports.TableOfContentsGenerator = TableOfContentsGenerator;
exports.NavigationBuilder = NavigationBuilder;
exports.DocumentAnalyzer = DocumentAnalyzer;
exports.ChunkingStrategies = ChunkingStrategies;

/**
 * Main document chunker class
 */
function DocumentChunker(options) {
    options = options || {};
    
    this.strategy = options.strategy || ChunkingStrategies.BY_HEADING_LEVEL;
    this.maxLevel = options.maxLevel || 6; // H1-H6
    this.preserveLinks = options.preserveLinks !== false;
    this.generateNavigation = options.generateNavigation !== false;
    this.includeMetadata = options.includeMetadata !== false;
    this.chunkSizeLimit = options.chunkSizeLimit || null; // Optional size limit
    this.baseUrl = options.baseUrl || "./";
    this.filePrefix = options.filePrefix || "chunk-";
    this.fileSuffix = options.fileSuffix || ".html";
    
    return this;
}

/**
 * Main chunking method
 */
DocumentChunker.prototype.chunkDocument = function(document, messages) {
    messages = messages || [];
    
    try {
        // Analyze document structure
        var analyzer = new DocumentAnalyzer();
        var analysis = analyzer.analyzeDocument(document);
        
        // Generate chunks based on strategy
        var chunks = this._generateChunks(document, analysis, messages);
        
        // Process cross-references
        if (this.preserveLinks) {
            chunks = this._processChunkReferences(chunks, analysis);
        }
        
        // Generate navigation if requested
        var navigation = null;
        if (this.generateNavigation) {
            var navBuilder = new NavigationBuilder({
                baseUrl: this.baseUrl,
                filePrefix: this.filePrefix,
                fileSuffix: this.fileSuffix
            });
            navigation = navBuilder.buildNavigation(chunks, analysis);
        }
        
        var result = {
            chunks: chunks,
            navigation: navigation,
            analysis: analysis,
            metadata: this._extractGlobalMetadata(document, analysis)
        };
        
        return promises.resolve(new results.Result(result, messages));
        
    } catch (error) {
        messages.push(results.error("Document chunking failed: " + error.message));
        return promises.resolve(new results.Result(null, messages));
    }
};

/**
 * Generate chunks based on selected strategy
 */
DocumentChunker.prototype._generateChunks = function(document, analysis, messages) {
    switch (this.strategy) {
        case ChunkingStrategies.BY_HEADING_LEVEL:
            return this._chunkByHeadingLevel(document, analysis, messages);
        case ChunkingStrategies.BY_CHAPTER:
            return this._chunkByChapter(document, analysis, messages);
        case ChunkingStrategies.BY_SECTION:
            return this._chunkBySection(document, analysis, messages);
        case ChunkingStrategies.BY_SIZE:
            return this._chunkBySize(document, analysis, messages);
        case ChunkingStrategies.CUSTOM:
            return this._chunkCustom(document, analysis, messages);
        default:
            return this._chunkByHeadingLevel(document, analysis, messages);
    }
};

/**
 * Chunk by heading levels (default strategy)
 */
DocumentChunker.prototype._chunkByHeadingLevel = function(document, analysis, messages) {
    var chunks = [];
    var currentChunk = null;
    var chunkId = 1;
    
    // Group content by top-level headings
    var currentSection = null;
    var sectionContent = [];
    
    for (var i = 0; i < document.children.length; i++) {
        var element = document.children[i];
        
        if (this._isHeading(element, analysis)) {
            var headingLevel = this._getHeadingLevel(element, analysis);
            
            // Start new chunk at configured level
            if (headingLevel === 1 || (currentChunk === null)) {
                // Save previous chunk if exists
                if (currentChunk) {
                    chunks.push(this._finalizeChunk(currentChunk, analysis));
                }
                
                // Start new chunk
                currentChunk = this._createNewChunk(chunkId++, element, headingLevel);
                currentChunk.content.push(element);
                
            } else if (headingLevel <= this.maxLevel) {
                // Add to current chunk
                if (currentChunk) {
                    currentChunk.content.push(element);
                    
                    // Update chunk metadata
                    this._updateChunkWithHeading(currentChunk, element, headingLevel);
                }
            } else {
                // Regular content - add to current chunk
                if (currentChunk) {
                    currentChunk.content.push(element);
                }
            }
        } else {
            // Non-heading content
            if (currentChunk) {
                currentChunk.content.push(element);
            } else {
                // Content before first heading - create intro chunk
                if (!chunks.some(function(chunk) { return chunk.isIntro; })) {
                    currentChunk = this._createIntroChunk();
                }
                if (currentChunk) {
                    currentChunk.content.push(element);
                }
            }
        }
    }
    
    // Add final chunk
    if (currentChunk) {
        chunks.push(this._finalizeChunk(currentChunk, analysis));
    }
    
    // Ensure we have at least one chunk
    if (chunks.length === 0) {
        var singleChunk = this._createSingleChunk(document);
        chunks.push(this._finalizeChunk(singleChunk, analysis));
    }
    
    return chunks;
};

/**
 * Chunk by chapters (H1 elements)
 */
DocumentChunker.prototype._chunkByChapter = function(document, analysis, messages) {
    // Split only on H1 headings - chapters
    var chunks = [];
    var currentChunk = null;
    var chunkId = 1;
    
    for (var i = 0; i < document.children.length; i++) {
        var element = document.children[i];
        
        if (this._isHeading(element, analysis)) {
            var headingLevel = this._getHeadingLevel(element, analysis);
            
            // Start new chunk only on H1
            if (headingLevel === 1) {
                // Save previous chunk if exists
                if (currentChunk) {
                    chunks.push(this._finalizeChunk(currentChunk, analysis));
                }
                
                // Start new chunk
                currentChunk = this._createNewChunk(chunkId++, element, headingLevel);
                currentChunk.content.push(element);
                
            } else {
                // Lower-level headings - add to current chunk
                if (currentChunk) {
                    currentChunk.content.push(element);
                    this._updateChunkWithHeading(currentChunk, element, headingLevel);
                } else {
                    // No current chunk - create one for this heading
                    currentChunk = this._createNewChunk(chunkId++, element, headingLevel);
                    currentChunk.content.push(element);
                }
            }
        } else {
            // Non-heading content
            if (currentChunk) {
                currentChunk.content.push(element);
            } else {
                // Content before first chapter - create intro chunk
                if (!chunks.some(function(chunk) { return chunk.isIntro; })) {
                    currentChunk = this._createIntroChunk();
                }
                if (currentChunk) {
                    currentChunk.content.push(element);
                }
            }
        }
    }
    
    // Add final chunk
    if (currentChunk) {
        chunks.push(this._finalizeChunk(currentChunk, analysis));
    }
    
    // Ensure we have at least one chunk
    if (chunks.length === 0) {
        var singleChunk = this._createSingleChunk(document);
        chunks.push(this._finalizeChunk(singleChunk, analysis));
    }
    
    return chunks;
};

/**
 * Chunk by sections (H1 and H2 elements)
 */
DocumentChunker.prototype._chunkBySection = function(document, analysis, messages) {
    var originalMaxLevel = this.maxLevel;
    this.maxLevel = 2; // Override to split on H1 and H2
    var result = this._chunkByHeadingLevel(document, analysis, messages);
    this.maxLevel = originalMaxLevel; // Restore
    return result;
};

/**
 * Chunk by size limits
 */
DocumentChunker.prototype._chunkBySize = function(document, analysis, messages) {
    if (!this.chunkSizeLimit) {
        messages.push(results.warning("Size-based chunking requires chunkSizeLimit option"));
        return this._chunkByHeadingLevel(document, analysis, messages);
    }
    
    var chunks = [];
    var currentChunk = null;
    var currentSize = 0;
    var chunkId = 1;
    
    for (var i = 0; i < document.children.length; i++) {
        var element = document.children[i];
        var elementSize = this._estimateElementSize(element);
        
        // Start new chunk if size limit exceeded or no current chunk
        if (!currentChunk || (currentSize + elementSize) > this.chunkSizeLimit) {
            if (currentChunk) {
                chunks.push(this._finalizeChunk(currentChunk, analysis));
            }
            
            var title = this._isHeading(element, analysis) ? 
                this._extractTextFromElement(element) : 
                "Section " + chunkId;
            
            currentChunk = this._createNewChunk(chunkId++, element, 1, title);
            currentSize = 0;
        }
        
        currentChunk.content.push(element);
        currentSize += elementSize;
    }
    
    if (currentChunk) {
        chunks.push(this._finalizeChunk(currentChunk, analysis));
    }
    
    return chunks;
};

/**
 * Custom chunking - placeholder for user-defined strategies
 */
DocumentChunker.prototype._chunkCustom = function(document, analysis, messages) {
    // This would be overridden by user-provided custom chunking function
    messages.push(results.warning("Custom chunking strategy not implemented, falling back to heading-based"));
    return this._chunkByHeadingLevel(document, analysis, messages);
};

/**
 * Helper method to create a new chunk
 */
DocumentChunker.prototype._createNewChunk = function(id, headingElement, level, customTitle) {
    var title = customTitle || (headingElement ? this._extractTextFromElement(headingElement) : "Section " + id);
    
    return {
        id: id,
        title: title,
        level: level,
        content: [],
        fileName: this.filePrefix + id + this.fileSuffix,
        headings: [],
        links: [],
        images: [],
        tables: [],
        metadata: {
            wordCount: 0,
            readingTime: 0,
            created: new Date()
        },
        isIntro: false
    };
};

/**
 * Helper method to create intro chunk
 */
DocumentChunker.prototype._createIntroChunk = function() {
    return {
        id: 0,
        title: "Introduction",
        level: 0,
        content: [],
        fileName: this.filePrefix + "intro" + this.fileSuffix,
        headings: [],
        links: [],
        images: [],
        tables: [],
        metadata: {
            wordCount: 0,
            readingTime: 0,
            created: new Date()
        },
        isIntro: true
    };
};

/**
 * Helper method to create single chunk for simple documents
 */
DocumentChunker.prototype._createSingleChunk = function(document) {
    return {
        id: 1,
        title: "Document",
        level: 1,
        content: document.children,
        fileName: this.filePrefix + "1" + this.fileSuffix,
        headings: [],
        links: [],
        images: [],
        tables: [],
        metadata: {
            wordCount: 0,
            readingTime: 0,
            created: new Date()
        },
        isIntro: false
    };
};

/**
 * Finalize chunk by computing metadata
 */
DocumentChunker.prototype._finalizeChunk = function(chunk, analysis) {
    // Extract headings, links, images, tables
    this._extractChunkElements(chunk);
    
    // Compute metadata
    if (this.includeMetadata) {
        chunk.metadata = this._computeChunkMetadata(chunk);
    }
    
    return chunk;
};

/**
 * Extract structural elements from chunk content
 */
DocumentChunker.prototype._extractChunkElements = function(chunk) {
    var self = this;
    
    function walkElement(element) {
        if (element.type === documents.types.paragraph) {
            // Check if it's a heading
            if (self._isHeadingParagraph(element)) {
                chunk.headings.push({
                    level: self._getHeadingLevelFromParagraph(element),
                    text: self._extractTextFromElement(element),
                    element: element
                });
            }
        } else if (element.type === documents.types.hyperlink) {
            chunk.links.push({
                href: element.href || element.anchor,
                text: self._extractTextFromElement(element),
                element: element
            });
        } else if (element.type === documents.types.image) {
            chunk.images.push({
                altText: element.altText,
                contentType: element.contentType,
                element: element
            });
        } else if (element.type === documents.types.table) {
            chunk.tables.push({
                element: element
            });
        }
        
        // Recursively process children
        if (element.children) {
            element.children.forEach(walkElement);
        }
    }
    
    chunk.content.forEach(walkElement);
};

/**
 * Compute chunk metadata (word count, reading time, etc.)
 */
DocumentChunker.prototype._computeChunkMetadata = function(chunk) {
    var text = this._extractAllTextFromChunk(chunk);
    var wordCount = this._countWords(text);
    var readingTime = Math.ceil(wordCount / 200); // Assume 200 WPM reading speed
    
    return _.extend(chunk.metadata, {
        wordCount: wordCount,
        readingTime: readingTime,
        characterCount: text.length,
        headingCount: chunk.headings.length,
        linkCount: chunk.links.length,
        imageCount: chunk.images.length,
        tableCount: chunk.tables.length
    });
};

/**
 * Process cross-references between chunks
 */
DocumentChunker.prototype._processChunkReferences = function(chunks, analysis) {
    // Build reference map
    var chunkMap = {};
    chunks.forEach(function(chunk) {
        chunkMap[chunk.id] = chunk;
    });
    
    // Process internal links and update hrefs
    chunks.forEach(function(chunk) {
        chunk.links.forEach(function(link) {
            if (link.href && link.href.charAt(0) === '#') {
                // Internal link - find target chunk
                var targetChunkId = this._findChunkForAnchor(chunks, link.href.substring(1));
                if (targetChunkId && targetChunkId !== chunk.id) {
                    var targetChunk = chunkMap[targetChunkId];
                    if (targetChunk) {
                        link.targetChunk = targetChunkId;
                        link.targetFile = targetChunk.fileName;
                    }
                }
            }
        }, this);
    }, this);
    
    return chunks;
};

/**
 * Find which chunk contains a specific anchor
 */
DocumentChunker.prototype._findChunkForAnchor = function(chunks, anchorName) {
    for (var i = 0; i < chunks.length; i++) {
        var chunk = chunks[i];
        for (var j = 0; j < chunk.content.length; j++) {
            if (this._elementContainsAnchor(chunk.content[j], anchorName)) {
                return chunk.id;
            }
        }
    }
    return null;
};

/**
 * Check if element contains a specific anchor
 */
DocumentChunker.prototype._elementContainsAnchor = function(element, anchorName) {
    if (element.type === documents.types.bookmarkStart && element.name === anchorName) {
        return true;
    }
    
    if (element.children) {
        for (var i = 0; i < element.children.length; i++) {
            if (this._elementContainsAnchor(element.children[i], anchorName)) {
                return true;
            }
        }
    }
    
    return false;
};

/**
 * Extract global document metadata
 */
DocumentChunker.prototype._extractGlobalMetadata = function(document, analysis) {
    var allText = this._extractAllTextFromElement(document);
    return {
        totalWordCount: this._countWords(allText),
        totalCharacterCount: allText.length,
        chunkCount: 0, // Will be updated by caller
        headingCount: analysis.headings.length,
        tableCount: analysis.tables.length,
        imageCount: analysis.images.length,
        linkCount: analysis.links.length,
        estimatedReadingTime: Math.ceil(this._countWords(allText) / 200),
        structureDepth: analysis.maxHeadingLevel,
        generated: new Date()
    };
};

/**
 * Utility methods
 */
DocumentChunker.prototype._isHeading = function(element, analysis) {
    return analysis.headingElements.indexOf(element) !== -1;
};

DocumentChunker.prototype._getHeadingLevel = function(element, analysis) {
    // Find the heading info by searching the headings array
    for (var i = 0; i < analysis.headings.length; i++) {
        if (analysis.headings[i].element === element) {
            return analysis.headings[i].level;
        }
    }
    return 1; // Default fallback
};

DocumentChunker.prototype._isHeadingParagraph = function(element) {
    if (element.type !== documents.types.paragraph) {
        return false;
    }
    
    // Check style-based heading detection
    var styleId = element.styleId;
    if (styleId) {
        return /^heading\d+$/i.test(styleId) || /^h\d+$/i.test(styleId);
    }
    
    return false;
};

DocumentChunker.prototype._getHeadingLevelFromParagraph = function(element) {
    var styleId = element.styleId;
    if (styleId) {
        var match = styleId.match(/(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    return 1;
};

DocumentChunker.prototype._updateChunkWithHeading = function(chunk, element, level) {
    // Update chunk title if this is a higher-priority heading
    if (!chunk.title || level < chunk.level) {
        chunk.title = this._extractTextFromElement(element);
        chunk.level = level;
    }
};

DocumentChunker.prototype._extractTextFromElement = function(element) {
    var text = "";
    
    function extractText(el) {
        if (el.type === documents.types.text) {
            text += el.value;
        } else if (el.children) {
            el.children.forEach(extractText);
        }
    }
    
    extractText(element);
    return text.trim();
};

DocumentChunker.prototype._extractAllTextFromChunk = function(chunk) {
    var text = "";
    var self = this;
    
    chunk.content.forEach(function(element) {
        text += self._extractTextFromElement(element) + " ";
    });
    
    return text.trim();
};

DocumentChunker.prototype._extractAllTextFromElement = function(element) {
    return this._extractTextFromElement(element);
};

DocumentChunker.prototype._countWords = function(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(function(word) {
        return word.length > 0;
    }).length;
};

DocumentChunker.prototype._estimateElementSize = function(element) {
    var text = this._extractTextFromElement(element);
    var baseSize = text.length;
    
    // Add weight for structural elements
    if (element.type === documents.types.table) {
        baseSize += 500; // Tables are "heavier"
    } else if (element.type === documents.types.image) {
        baseSize += 100; // Images add content weight
    } else if (this._isHeadingParagraph(element)) {
        baseSize += 50; // Headings are slightly heavier
    }
    
    return baseSize;
};

/**
 * Table of Contents Generator
 */
function TableOfContentsGenerator(options) {
    options = options || {};
    
    this.maxDepth = options.maxDepth || 6;
    this.includePageNumbers = options.includePageNumbers || false;
    this.generateIds = options.generateIds !== false;
    this.collapsible = options.collapsible || false;
    this.numbering = options.numbering || false; // true, false, or "auto"
    this.baseUrl = options.baseUrl || "./";
    
    return this;
}

TableOfContentsGenerator.prototype.generateTOC = function(chunks, analysis) {
    var tocEntries = this._extractTOCEntries(chunks, analysis);
    var tocHtml = this._buildTOCHtml(tocEntries);
    
    return {
        entries: tocEntries,
        html: tocHtml,
        metadata: {
            totalEntries: tocEntries.length,
            maxDepth: this._calculateMaxDepth(tocEntries),
            generated: new Date()
        }
    };
};

TableOfContentsGenerator.prototype._extractTOCEntries = function(chunks, analysis) {
    var entries = [];
    var entryId = 1;
    
    chunks.forEach(function(chunk) {
        // Add main chunk entry
        entries.push({
            id: entryId++,
            title: chunk.title,
            level: chunk.level,
            href: this.baseUrl + chunk.fileName,
            chunkId: chunk.id,
            isChunkTitle: true
        });
        
        // Add sub-headings within chunk
        chunk.headings.forEach(function(heading) {
            if (heading.level <= this.maxDepth) {
                entries.push({
                    id: entryId++,
                    title: heading.text,
                    level: heading.level,
                    href: this.baseUrl + chunk.fileName + "#heading-" + entryId,
                    chunkId: chunk.id,
                    isChunkTitle: false
                });
            }
        }, this);
    }, this);
    
    return entries;
};

TableOfContentsGenerator.prototype._buildTOCHtml = function(entries) {
    if (entries.length === 0) {
        return Html.text("No table of contents available");
    }
    
    var tocList = this._buildNestedList(entries, 1);
    var tocContainer = Html.freshElement("div", {
        "class": "table-of-contents" + (this.collapsible ? " collapsible" : "")
    }, [
        Html.freshElement("h2", {}, [Html.text("Table of Contents")]),
        tocList
    ]);
    
    return tocContainer;
};

TableOfContentsGenerator.prototype._buildNestedList = function(entries, minLevel) {
    var listItems = [];
    var i = 0;
    
    while (i < entries.length) {
        var entry = entries[i];
        
        if (entry.level < minLevel) {
            break;
        } else if (entry.level === minLevel) {
            var listItem = this._createTOCListItem(entry);
            
            // Look ahead for sub-entries
            var subEntries = [];
            var j = i + 1;
            while (j < entries.length && entries[j].level > minLevel) {
                subEntries.push(entries[j]);
                j++;
            }
            
            if (subEntries.length > 0) {
                var subList = this._buildNestedList(subEntries, minLevel + 1);
                listItem.children.push(subList);
            }
            
            listItems.push(listItem);
            i = j;
        } else {
            i++;
        }
    }
    
    return Html.freshElement("ol", {"class": "toc-level-" + minLevel}, listItems);
};

TableOfContentsGenerator.prototype._createTOCListItem = function(entry) {
    var linkText = this.numbering ? 
        entry.id + ". " + entry.title : 
        entry.title;
    
    var link = Html.freshElement("a", {
        href: entry.href,
        "class": "toc-link" + (entry.isChunkTitle ? " chunk-title" : " sub-heading")
    }, [Html.text(linkText)]);
    
    return Html.freshElement("li", {
        "class": "toc-entry level-" + entry.level
    }, [link]);
};

TableOfContentsGenerator.prototype._calculateMaxDepth = function(entries) {
    return entries.reduce(function(max, entry) {
        return Math.max(max, entry.level);
    }, 0);
};

/**
 * Navigation Builder
 */
function NavigationBuilder(options) {
    options = options || {};
    
    this.baseUrl = options.baseUrl || "./";
    this.filePrefix = options.filePrefix || "chunk-";
    this.fileSuffix = options.fileSuffix || ".html";
    this.includeBreadcrumbs = options.includeBreadcrumbs !== false;
    this.includeNavButtons = options.includeNavButtons !== false;
    this.includeSidebar = options.includeSidebar !== false;
    this.includeJumpDropdown = options.includeJumpDropdown !== false;
    
    return this;
}

NavigationBuilder.prototype.buildNavigation = function(chunks, analysis) {
    return {
        prevNext: this._buildPrevNextNavigation(chunks),
        breadcrumbs: this.includeBreadcrumbs ? this._buildBreadcrumbs(chunks) : null,
        sidebar: this.includeSidebar ? this._buildSidebar(chunks) : null,
        jumpDropdown: this.includeJumpDropdown ? this._buildJumpDropdown(chunks) : null,
        keyboardShortcuts: this._buildKeyboardNavigation(chunks)
    };
};

NavigationBuilder.prototype._buildPrevNextNavigation = function(chunks) {
    var navigation = {};
    
    chunks.forEach(function(chunk, index) {
        var nav = {};
        
        if (index > 0) {
            nav.previous = {
                title: chunks[index - 1].title,
                href: this.baseUrl + chunks[index - 1].fileName,
                chunkId: chunks[index - 1].id
            };
        }
        
        if (index < chunks.length - 1) {
            nav.next = {
                title: chunks[index + 1].title,
                href: this.baseUrl + chunks[index + 1].fileName,
                chunkId: chunks[index + 1].id
            };
        }
        
        navigation[chunk.id] = nav;
    }, this);
    
    return navigation;
};

NavigationBuilder.prototype._buildBreadcrumbs = function(chunks) {
    var breadcrumbs = {};
    
    chunks.forEach(function(chunk) {
        var crumbs = [
            {
                title: "Home",
                href: this.baseUrl + "index.html",
                isFirst: true
            },
            {
                title: chunk.title,
                href: this.baseUrl + chunk.fileName,
                isLast: true,
                isActive: true
            }
        ];
        
        breadcrumbs[chunk.id] = crumbs;
    }, this);
    
    return breadcrumbs;
};

NavigationBuilder.prototype._buildSidebar = function(chunks) {
    var sidebarItems = chunks.map(function(chunk) {
        return {
            title: chunk.title,
            href: this.baseUrl + chunk.fileName,
            chunkId: chunk.id,
            level: chunk.level,
            subItems: chunk.headings.map(function(heading) {
                return {
                    title: heading.text,
                    href: this.baseUrl + chunk.fileName + "#heading-" + heading.level,
                    level: heading.level
                };
            })
        };
    }, this);
    
    return {
        items: sidebarItems,
        html: this._buildSidebarHtml(sidebarItems)
    };
};

NavigationBuilder.prototype._buildSidebarHtml = function(items) {
    var listItems = items.map(function(item) {
        var mainLink = Html.freshElement("a", {
            href: item.href,
            "class": "sidebar-main-link"
        }, [Html.text(item.title)]);
        
        var children = [mainLink];
        
        if (item.subItems.length > 0) {
            var subList = Html.freshElement("ul", {"class": "sidebar-sub-list"}, 
                item.subItems.map(function(subItem) {
                    return Html.freshElement("li", {}, [
                        Html.freshElement("a", {
                            href: subItem.href,
                            "class": "sidebar-sub-link"
                        }, [Html.text(subItem.title)])
                    ]);
                })
            );
            children.push(subList);
        }
        
        return Html.freshElement("li", {"class": "sidebar-item"}, children);
    });
    
    return Html.freshElement("nav", {"class": "document-sidebar"}, [
        Html.freshElement("ul", {"class": "sidebar-main-list"}, listItems)
    ]);
};

NavigationBuilder.prototype._buildJumpDropdown = function(chunks) {
    var options = chunks.map(function(chunk) {
        return {
            value: this.baseUrl + chunk.fileName,
            text: chunk.title,
            chunkId: chunk.id
        };
    }, this);
    
    return {
        options: options,
        html: this._buildDropdownHtml(options)
    };
};

NavigationBuilder.prototype._buildDropdownHtml = function(options) {
    var selectOptions = options.map(function(option) {
        return Html.freshElement("option", {
            value: option.value
        }, [Html.text(option.text)]);
    });
    
    return Html.freshElement("div", {"class": "jump-navigation"}, [
        Html.freshElement("label", {}, [Html.text("Jump to section:")]),
        Html.freshElement("select", {
            "class": "jump-dropdown",
            "onchange": "window.location.href = this.value"
        }, selectOptions)
    ]);
};

NavigationBuilder.prototype._buildKeyboardNavigation = function(chunks) {
    return {
        shortcuts: {
            "ArrowLeft": "previous",
            "ArrowRight": "next",
            "Home": "first",
            "End": "last",
            "h": "home"
        },
        script: this._generateKeyboardScript()
    };
};

NavigationBuilder.prototype._generateKeyboardScript = function() {
    return "\n" +
"document.addEventListener('keydown', function(event) {\n" +
"    if (event.ctrlKey || event.altKey || event.metaKey) return;\n" +
"    \n" +
"    switch(event.key) {\n" +
"        case 'ArrowLeft':\n" +
"            var prevLink = document.querySelector('[data-nav=\"previous\"]');\n" +
"            if (prevLink) window.location.href = prevLink.href;\n" +
"            break;\n" +
"        case 'ArrowRight':\n" +
"            var nextLink = document.querySelector('[data-nav=\"next\"]');\n" +
"            if (nextLink) window.location.href = nextLink.href;\n" +
"            break;\n" +
"        case 'Home':\n" +
"            window.location.href = './index.html';\n" +
"            break;\n" +
"        case 'h':\n" +
"            window.location.href = './index.html';\n" +
"            break;\n" +
"    }\n" +
"});";
};

/**
 * Document Analyzer - analyzes document structure
 */
function DocumentAnalyzer() {
    return this;
}

DocumentAnalyzer.prototype.analyzeDocument = function(document) {
    var analysis = {
        headings: [],
        headingElements: [],
        headingLevels: {},
        tables: [],
        images: [],
        links: [],
        bookmarks: [],
        maxHeadingLevel: 0,
        structure: {
            hasTableOfContents: false,
            hasIndex: false,
            hasGlossary: false,
            chapterCount: 0,
            sectionCount: 0
        }
    };
    
    this._walkDocument(document, analysis);
    this._analyzeStructure(analysis);
    
    return analysis;
};

DocumentAnalyzer.prototype._walkDocument = function(element, analysis) {
    var self = this;
    
    function walkElement(el) {
        if (el.type === documents.types.paragraph && self._isHeadingParagraph(el)) {
            var level = self._getHeadingLevelFromParagraph(el);
            var text = self._extractTextFromElement(el);
            
            analysis.headings.push({
                level: level,
                text: text,
                element: el
            });
            analysis.headingElements.push(el);
            var headingInfo = { level: level, text: text };
            analysis.headingLevels[el] = headingInfo;
            analysis.maxHeadingLevel = Math.max(analysis.maxHeadingLevel, level);
            
        } else if (el.type === documents.types.table) {
            analysis.tables.push(el);
            
        } else if (el.type === documents.types.image) {
            analysis.images.push(el);
            
        } else if (el.type === documents.types.hyperlink) {
            analysis.links.push({
                href: el.href || el.anchor,
                text: self._extractTextFromElement(el),
                element: el
            });
            
        } else if (el.type === documents.types.bookmarkStart) {
            analysis.bookmarks.push({
                name: el.name,
                element: el
            });
        }
        
        if (el.children) {
            el.children.forEach(walkElement);
        }
    }
    
    walkElement(element);
};

DocumentAnalyzer.prototype._analyzeStructure = function(analysis) {
    var h1Count = 0;
    var h2Count = 0;
    
    analysis.headings.forEach(function(heading) {
        if (heading.level === 1) {
            h1Count++;
        } else if (heading.level === 2) {
            h2Count++;
        }
        
        // Check for common document sections
        var text = heading.text.toLowerCase();
        if (text.includes("table of contents") || text.includes("contents")) {
            analysis.structure.hasTableOfContents = true;
        } else if (text.includes("index")) {
            analysis.structure.hasIndex = true;
        } else if (text.includes("glossary")) {
            analysis.structure.hasGlossary = true;
        }
    });
    
    analysis.structure.chapterCount = h1Count;
    analysis.structure.sectionCount = h2Count;
};

DocumentAnalyzer.prototype._isHeadingParagraph = function(element) {
    if (element.type !== documents.types.paragraph) {
        return false;
    }
    
    var styleId = element.styleId;
    if (styleId) {
        return /^heading\d+$/i.test(styleId) || /^h\d+$/i.test(styleId);
    }
    
    return false;
};

DocumentAnalyzer.prototype._getHeadingLevelFromParagraph = function(element) {
    var styleId = element.styleId;
    if (styleId) {
        var match = styleId.match(/(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    return 1;
};

DocumentAnalyzer.prototype._extractTextFromElement = function(element) {
    var text = "";
    
    function extractText(el) {
        if (el.type === documents.types.text) {
            text += el.value;
        } else if (el.children) {
            el.children.forEach(extractText);
        }
    }
    
    extractText(element);
    return text.trim();
};

/**
 * Utility functions for cross-reference resolution and indexing
 */
function CrossReferenceResolver() {
    return this;
}

CrossReferenceResolver.prototype.resolveReferences = function(chunks) {
    var referenceMap = this._buildReferenceMap(chunks);
    return this._updateReferences(chunks, referenceMap);
};

CrossReferenceResolver.prototype._buildReferenceMap = function(chunks) {
    var map = {};
    
    chunks.forEach(function(chunk) {
        // Map bookmarks to chunk locations
        chunk.content.forEach(function(element) {
            this._findBookmarks(element, function(bookmark) {
                map[bookmark.name] = {
                    chunkId: chunk.id,
                    fileName: chunk.fileName,
                    element: bookmark
                };
            });
        }, this);
    }, this);
    
    return map;
};

CrossReferenceResolver.prototype._findBookmarks = function(element, callback) {
    var self = this;
    
    function walk(el) {
        if (el.type === documents.types.bookmarkStart) {
            callback(el);
        }
        if (el.children) {
            el.children.forEach(walk);
        }
    }
    
    walk(element);
};

CrossReferenceResolver.prototype._updateReferences = function(chunks, referenceMap) {
    chunks.forEach(function(chunk) {
        chunk.links.forEach(function(link) {
            if (link.href && link.href.charAt(0) === '#') {
                var anchorName = link.href.substring(1);
                var reference = referenceMap[anchorName];
                if (reference) {
                    link.targetChunk = reference.chunkId;
                    link.targetFile = reference.fileName;
                    link.resolvedHref = reference.fileName + link.href;
                }
            }
        });
    });
    
    return chunks;
};

/**
 * Index Generator for search preparation
 */
function IndexGenerator(options) {
    options = options || {};
    this.minWordLength = options.minWordLength || 3;
    this.excludeWords = options.excludeWords || ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return this;
}

IndexGenerator.prototype.generateIndex = function(chunks) {
    var index = {};
    var self = this;
    
    chunks.forEach(function(chunk) {
        var text = self._extractAllTextFromChunk(chunk);
        var words = self._extractWords(text);
        
        words.forEach(function(word) {
            if (!index[word]) {
                index[word] = [];
            }
            
            index[word].push({
                chunkId: chunk.id,
                fileName: chunk.fileName,
                title: chunk.title,
                context: self._getWordContext(text, word)
            });
        });
    });
    
    return {
        index: index,
        wordCount: Object.keys(index).length,
        generated: new Date()
    };
};

IndexGenerator.prototype._extractWords = function(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(function(word) {
            return word.length >= this.minWordLength && 
                   this.excludeWords.indexOf(word) === -1;
        }, this);
};

IndexGenerator.prototype._extractAllTextFromChunk = function(chunk) {
    var text = "";
    var self = this;
    
    chunk.content.forEach(function(element) {
        text += self._extractTextFromElement(element) + " ";
    });
    
    return text.trim();
};

IndexGenerator.prototype._extractTextFromElement = function(element) {
    var text = "";
    
    function extractText(el) {
        if (el.type === documents.types.text) {
            text += el.value;
        } else if (el.children) {
            el.children.forEach(extractText);
        }
    }
    
    extractText(element);
    return text.trim();
};

IndexGenerator.prototype._getWordContext = function(text, word) {
    var index = text.toLowerCase().indexOf(word.toLowerCase());
    if (index === -1) return "";
    
    var start = Math.max(0, index - 50);
    var end = Math.min(text.length, index + word.length + 50);
    return "..." + text.substring(start, end) + "...";
};

/**
 * Glossary Extractor
 */
function GlossaryExtractor(options) {
    options = options || {};
    this.definitionPatterns = options.definitionPatterns || [
        /(.+?)\s+is\s+(.+?)\./gi,
        /(.+?)\s+means\s+(.+?)\./gi,
        /(.+?):\s+(.+?)\./gi
    ];
    return this;
}

GlossaryExtractor.prototype.extractGlossary = function(chunks) {
    var glossary = {};
    var self = this;
    
    chunks.forEach(function(chunk) {
        var text = self._extractAllTextFromChunk(chunk);
        
        self.definitionPatterns.forEach(function(pattern) {
            var matches = text.match(pattern);
            if (matches) {
                matches.forEach(function(match) {
                    var parts = self._parseDefinition(match, pattern);
                    if (parts.term && parts.definition) {
                        glossary[parts.term.toLowerCase()] = {
                            term: parts.term,
                            definition: parts.definition,
                            chunkId: chunk.id,
                            fileName: chunk.fileName,
                            source: match
                        };
                    }
                });
            }
        });
    });
    
    return {
        entries: glossary,
        count: Object.keys(glossary).length,
        generated: new Date()
    };
};

GlossaryExtractor.prototype._parseDefinition = function(text, pattern) {
    var result = pattern.exec(text);
    if (result && result.length >= 3) {
        return {
            term: result[1].trim(),
            definition: result[2].trim()
        };
    }
    return { term: null, definition: null };
};

GlossaryExtractor.prototype._extractAllTextFromChunk = function(chunk) {
    var text = "";
    var self = this;
    
    chunk.content.forEach(function(element) {
        text += self._extractTextFromElement(element) + " ";
    });
    
    return text.trim();
};

GlossaryExtractor.prototype._extractTextFromElement = function(element) {
    var text = "";
    
    function extractText(el) {
        if (el.type === documents.types.text) {
            text += el.value;
        } else if (el.children) {
            el.children.forEach(extractText);
        }
    }
    
    extractText(element);
    return text.trim();
};

// Export utility classes
exports.CrossReferenceResolver = CrossReferenceResolver;
exports.IndexGenerator = IndexGenerator;
exports.GlossaryExtractor = GlossaryExtractor;