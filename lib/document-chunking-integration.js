/**
 * Document Chunking Integration Module
 * 
 * This module provides seamless integration between mammoth.js core functionality
 * and the document chunking system, making it easy to convert and chunk documents
 * in a single workflow.
 */

var _ = require("underscore");
var promises = require("./promises");
var results = require("./results");
var documentChunking = require("./document-chunking");
var Html = require("./html");
var writers = require("./writers");

exports.convertAndChunk = convertAndChunk;
exports.ChunkedDocumentConverter = ChunkedDocumentConverter;
exports.ChunkingOptions = ChunkingOptions;
exports.OutputFormats = OutputFormats;

/**
 * High-level function to convert and chunk a document in one operation
 */
function convertAndChunk(input, options) {
    options = options || {};
    
    var mammothOptions = options.mammoth || {};
    var chunkingOptions = options.chunking || {};
    var outputOptions = options.output || {};
    
    var mammoth = require("./index");
    
    return mammoth.convert(input, _.extend(mammothOptions, {
        transformDocument: function(document) {
            var converter = new ChunkedDocumentConverter(chunkingOptions, outputOptions);
            return converter.convertAndChunk(document, mammothOptions);
        }
    }));
}

/**
 * Main converter class that handles both conversion and chunking
 */
function ChunkedDocumentConverter(chunkingOptions, outputOptions) {
    chunkingOptions = chunkingOptions || {};
    outputOptions = outputOptions || {};
    
    this.chunkingOptions = _.extend({
        strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
        maxLevel: 3,
        generateNavigation: true,
        includeMetadata: true,
        preserveLinks: true,
        baseUrl: "./",
        filePrefix: "chunk-",
        fileSuffix: ".html"
    }, chunkingOptions);
    
    this.outputOptions = _.extend({
        format: OutputFormats.SEPARATE_FILES,
        includeCSS: true,
        includeNavigation: true,
        generateIndex: true,
        generateTOC: true,
        generateGlossary: false,
        outputDirectory: "./chunks",
        wrapperTemplate: null,
        customCSS: null
    }, outputOptions);
    
    return this;
}

/**
 * Main method to convert and chunk a document
 */
ChunkedDocumentConverter.prototype.convertAndChunk = function(document, mammothOptions) {
    var self = this;
    var messages = [];
    
    return promises.resolve()
        .then(function() {
            // Step 1: Chunk the document
            var chunker = new documentChunking.DocumentChunker(self.chunkingOptions);
            return chunker.chunkDocument(document, messages);
        })
        .then(function(chunkResult) {
            if (!chunkResult.value) {
                throw new Error("Document chunking failed");
            }
            
            // Step 2: Convert each chunk to HTML
            return self._convertChunksToHTML(chunkResult.value, mammothOptions, messages);
        })
        .then(function(conversionResult) {
            // Step 3: Generate additional components
            return self._generateAdditionalComponents(conversionResult, messages);
        })
        .then(function(finalResult) {
            // Step 4: Apply output formatting
            return self._applyOutputFormatting(finalResult, messages);
        })
        .then(function(formattedResult) {
            return new results.Result(formattedResult, messages);
        })
        .caught(function(error) {
            messages.push(results.error("Document conversion and chunking failed: " + error.message));
            return new results.Result(null, messages);
        });
};

/**
 * Convert document chunks to HTML
 */
ChunkedDocumentConverter.prototype._convertChunksToHTML = function(chunkingResult, mammothOptions, messages) {
    var self = this;
    var DocumentConverter = require("./document-to-html").DocumentConverter;
    
    // Create a document converter with the same options used for the full document
    var converter = new DocumentConverter(mammothOptions);
    
    var chunkPromises = chunkingResult.chunks.map(function(chunk) {
        // Create a temporary document containing just this chunk's content
        var chunkDocument = {
            type: "document",
            children: chunk.content,
            notes: {
                resolve: function() { return null; } // Simplified notes handling
            },
            comments: []
        };
        
        return converter.convertToHtml(chunkDocument)
            .then(function(htmlResult) {
                chunk.html = htmlResult.value;
                chunk.htmlMessages = htmlResult.messages;
                messages = messages.concat(htmlResult.messages);
                return chunk;
            })
            .caught(function(error) {
                messages.push(results.error("Failed to convert chunk '" + chunk.title + "': " + error.message));
                chunk.html = "<p>Error converting chunk content</p>";
                chunk.htmlMessages = [results.error(error.message)];
                return chunk;
            });
    });
    
    return promises.all(chunkPromises)
        .then(function(convertedChunks) {
            return _.extend(chunkingResult, {
                chunks: convertedChunks
            });
        });
};

/**
 * Generate additional components like TOC, index, glossary
 */
ChunkedDocumentConverter.prototype._generateAdditionalComponents = function(conversionResult, messages) {
    var components = {};
    
    // Generate Table of Contents
    if (this.outputOptions.generateTOC) {
        var tocGenerator = new documentChunking.TableOfContentsGenerator({
            maxDepth: this.chunkingOptions.maxLevel,
            numbering: true,
            collapsible: true,
            baseUrl: this.chunkingOptions.baseUrl
        });
        
        components.toc = tocGenerator.generateTOC(conversionResult.chunks, conversionResult.analysis);
        messages.push(results.info("Table of contents generated with " + components.toc.metadata.totalEntries + " entries"));
    }
    
    // Generate search index
    if (this.outputOptions.generateIndex) {
        var indexGenerator = new documentChunking.IndexGenerator({
            minWordLength: 3,
            excludeWords: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
        });
        
        components.searchIndex = indexGenerator.generateIndex(conversionResult.chunks);
        messages.push(results.info("Search index generated with " + components.searchIndex.wordCount + " unique words"));
    }
    
    // Generate glossary
    if (this.outputOptions.generateGlossary) {
        var glossaryExtractor = new documentChunking.GlossaryExtractor();
        components.glossary = glossaryExtractor.extractGlossary(conversionResult.chunks);
        messages.push(results.info("Glossary generated with " + components.glossary.count + " terms"));
    }
    
    return _.extend(conversionResult, {
        components: components
    });
};

/**
 * Apply output formatting based on selected format
 */
ChunkedDocumentConverter.prototype._applyOutputFormatting = function(conversionResult, messages) {
    switch (this.outputOptions.format) {
        case OutputFormats.SEPARATE_FILES:
            return this._formatAsSeparateFiles(conversionResult, messages);
        case OutputFormats.SINGLE_FILE:
            return this._formatAsSingleFile(conversionResult, messages);
        case OutputFormats.JSON:
            return this._formatAsJSON(conversionResult, messages);
        case OutputFormats.ARCHIVE:
            return this._formatAsArchive(conversionResult, messages);
        default:
            return this._formatAsSeparateFiles(conversionResult, messages);
    }
};

/**
 * Format as separate HTML files
 */
ChunkedDocumentConverter.prototype._formatAsSeparateFiles = function(conversionResult, messages) {
    var self = this;
    var files = {};
    
    // Generate individual chunk files
    conversionResult.chunks.forEach(function(chunk) {
        var wrappedHTML = self._wrapChunkHTML(chunk, conversionResult);
        files[chunk.fileName] = {
            content: wrappedHTML,
            type: 'text/html',
            encoding: 'utf8'
        };
    });
    
    // Generate index file
    files['index.html'] = {
        content: this._generateIndexFile(conversionResult),
        type: 'text/html',
        encoding: 'utf8'
    };
    
    // Generate table of contents file
    if (conversionResult.components.toc) {
        files['table-of-contents.html'] = {
            content: this._generateTOCFile(conversionResult.components.toc, conversionResult),
            type: 'text/html',
            encoding: 'utf8'
        };
    }
    
    // Generate search index file
    if (conversionResult.components.searchIndex) {
        files['search-index.json'] = {
            content: JSON.stringify(conversionResult.components.searchIndex, null, 2),
            type: 'application/json',
            encoding: 'utf8'
        };
    }
    
    // Generate glossary file
    if (conversionResult.components.glossary) {
        files['glossary.html'] = {
            content: this._generateGlossaryFile(conversionResult.components.glossary, conversionResult),
            type: 'text/html',
            encoding: 'utf8'
        };
    }
    
    // Generate CSS file
    if (this.outputOptions.includeCSS) {
        files['styles.css'] = {
            content: this._generateCSS(),
            type: 'text/css',
            encoding: 'utf8'
        };
    }
    
    // Generate navigation JavaScript
    if (this.outputOptions.includeNavigation && conversionResult.navigation) {
        files['navigation.js'] = {
            content: this._generateNavigationJS(conversionResult.navigation),
            type: 'text/javascript',
            encoding: 'utf8'
        };
    }
    
    messages.push(results.info("Generated " + Object.keys(files).length + " files"));
    
    return {
        format: OutputFormats.SEPARATE_FILES,
        files: files,
        metadata: conversionResult.metadata,
        chunks: conversionResult.chunks,
        navigation: conversionResult.navigation,
        components: conversionResult.components
    };
};

/**
 * Format as a single HTML file
 */
ChunkedDocumentConverter.prototype._formatAsSingleFile = function(conversionResult, messages) {
    var sections = [];
    
    conversionResult.chunks.forEach(function(chunk, index) {
        sections.push('<section id="chunk-' + chunk.id + '" class="document-chunk">');
        sections.push('<h1>' + this._escapeHTML(chunk.title) + '</h1>');
        sections.push(chunk.html || '<p>No content available</p>');
        sections.push('</section>');
        
        if (index < conversionResult.chunks.length - 1) {
            sections.push('<hr class="chunk-separator">');
        }
    }, this);
    
    var htmlContent = this._wrapSingleFileHTML(sections.join('\n'), conversionResult);
    
    messages.push(results.info("Generated single HTML file with " + conversionResult.chunks.length + " sections"));
    
    return {
        format: OutputFormats.SINGLE_FILE,
        content: htmlContent,
        metadata: conversionResult.metadata,
        chunks: conversionResult.chunks,
        navigation: conversionResult.navigation,
        components: conversionResult.components
    };
};

/**
 * Format as JSON
 */
ChunkedDocumentConverter.prototype._formatAsJSON = function(conversionResult, messages) {
    var jsonOutput = {
        metadata: conversionResult.metadata,
        chunks: conversionResult.chunks.map(function(chunk) {
            return {
                id: chunk.id,
                title: chunk.title,
                level: chunk.level,
                fileName: chunk.fileName,
                html: chunk.html,
                metadata: chunk.metadata,
                headings: chunk.headings,
                links: chunk.links,
                images: chunk.images,
                tables: chunk.tables
            };
        }),
        navigation: conversionResult.navigation,
        components: conversionResult.components,
        generated: new Date()
    };
    
    messages.push(results.info("Generated JSON output with " + jsonOutput.chunks.length + " chunks"));
    
    return {
        format: OutputFormats.JSON,
        content: JSON.stringify(jsonOutput, null, 2),
        data: jsonOutput
    };
};

/**
 * Format as archive (placeholder for future ZIP implementation)
 */
ChunkedDocumentConverter.prototype._formatAsArchive = function(conversionResult, messages) {
    // This would require a ZIP library - for now, fall back to separate files
    messages.push(results.warning("Archive format not yet implemented, using separate files format"));
    return this._formatAsSeparateFiles(conversionResult, messages);
};

/**
 * Wrap chunk HTML with navigation and styling
 */
ChunkedDocumentConverter.prototype._wrapChunkHTML = function(chunk, conversionResult) {
    var template = this.outputOptions.wrapperTemplate || this._getDefaultHTMLTemplate();
    var navigation = conversionResult.navigation;
    var navHTML = '';
    
    if (this.outputOptions.includeNavigation && navigation) {
        var nav = navigation.prevNext[chunk.id] || {};
        var prevLink = nav.previous ? 
            '<a href="' + nav.previous.href + '" class="nav-link prev-link" data-nav="previous">← ' + this._escapeHTML(nav.previous.title) + '</a>' : 
            '<span class="nav-link prev-link disabled">← Previous</span>';
        var nextLink = nav.next ? 
            '<a href="' + nav.next.href + '" class="nav-link next-link" data-nav="next">' + this._escapeHTML(nav.next.title) + ' →</a>' : 
            '<span class="nav-link next-link disabled">Next →</span>';
        
        navHTML = '<nav class="chunk-navigation"><div class="nav-links">' + prevLink + nextLink + '</div></nav>';
    }
    
    var cssLink = this.outputOptions.includeCSS ? '<link rel="stylesheet" href="styles.css">' : '';
    var jsScript = this.outputOptions.includeNavigation ? '<script src="navigation.js"></script>' : '';
    
    return template
        .replace('{{TITLE}}', this._escapeHTML(chunk.title))
        .replace('{{CSS_LINK}}', cssLink)
        .replace('{{NAVIGATION}}', navHTML)
        .replace('{{CONTENT}}', chunk.html || '<p>No content available</p>')
        .replace('{{METADATA}}', this._generateMetadataHTML(chunk.metadata))
        .replace('{{JS_SCRIPT}}', jsScript);
};

/**
 * Wrap single file HTML
 */
ChunkedDocumentConverter.prototype._wrapSingleFileHTML = function(content, conversionResult) {
    var template = "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>{{TITLE}}</title>\n    {{CSS_STYLES}}\n</head>\n<body>\n    {{TOC}}\n    <main class=\"document-content\">\n        {{CONTENT}}\n    </main>\n    {{JS_SCRIPT}}\n</body>\n</html>";
    
    var title = "Document";
    if (conversionResult.metadata && conversionResult.metadata.title) {
        title = conversionResult.metadata.title;
    }
    
    var tocHTML = '';
    if (conversionResult.components && conversionResult.components.toc) {
        tocHTML = '<aside class="table-of-contents">' + this._renderTOCHTML(conversionResult.components.toc) + '</aside>';
    }
    
    var cssStyles = '<style>' + this._generateCSS() + '</style>';
    if (this.outputOptions.customCSS) {
        cssStyles += '<style>' + this.outputOptions.customCSS + '</style>';
    }
    
    return template
        .replace('{{TITLE}}', this._escapeHTML(title))
        .replace('{{CSS_STYLES}}', cssStyles)
        .replace('{{TOC}}', tocHTML)
        .replace('{{CONTENT}}', content)
        .replace('{{JS_SCRIPT}}', this.outputOptions.includeNavigation ? '<script>' + this._generateNavigationJS() + '</script>' : '');
};

/**
 * Generate index file
 */
ChunkedDocumentConverter.prototype._generateIndexFile = function(conversionResult) {
    var chunkLinks = conversionResult.chunks.map(function(chunk) {
        return '<li><a href="' + chunk.fileName + '">' + this._escapeHTML(chunk.title) + '</a> (' + chunk.metadata.wordCount + ' words)</li>';
    }, this).join('\n');
    
    var additionalLinks = [];
    if (conversionResult.components.toc) {
        additionalLinks.push('<li><a href="table-of-contents.html">Table of Contents</a></li>');
    }
    if (conversionResult.components.glossary) {
        additionalLinks.push('<li><a href="glossary.html">Glossary</a></li>');
    }
    
    return "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Document Index</title>\n    <link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n    <h1>Document Index</h1>\n    \n    <section class=\"document-info\">\n        <h2>Document Information</h2>\n        <ul>\n            <li>Total chunks: " + conversionResult.chunks.length + "</li>\n            <li>Total words: " + conversionResult.metadata.totalWordCount + "</li>\n            <li>Estimated reading time: " + conversionResult.metadata.estimatedReadingTime + " minutes</li>\n            <li>Generated: " + conversionResult.metadata.generated + "</li>\n        </ul>\n    </section>\n    \n    <section class=\"chunk-list\">\n        <h2>Document Sections</h2>\n        <ul>\n            " + chunkLinks + "\n        </ul>\n    </section>\n    \n    " + (additionalLinks.length > 0 ? "\n    <section class=\"additional-resources\">\n        <h2>Additional Resources</h2>\n        <ul>\n            " + additionalLinks.join('\n') + "\n        </ul>\n    </section>\n    " : '') + "\n    \n    <script src=\"navigation.js\"></script>\n</body>\n</html>";
};

/**
 * Generate table of contents file
 */
ChunkedDocumentConverter.prototype._generateTOCFile = function(toc, conversionResult) {
    return "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Table of Contents</title>\n    <link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n    <nav class=\"back-navigation\">\n        <a href=\"index.html\">← Back to Index</a>\n    </nav>\n    \n    <h1>Table of Contents</h1>\n    \n    " + this._renderTOCHTML(toc) + "\n    \n    <script src=\"navigation.js\"></script>\n</body>\n</html>";
};

/**
 * Generate glossary file
 */
ChunkedDocumentConverter.prototype._generateGlossaryFile = function(glossary, conversionResult) {
    var entries = Object.keys(glossary.entries).sort().map(function(term) {
        var entry = glossary.entries[term];
        return "\n        <div class=\"glossary-entry\">\n            <dt class=\"term\">" + this._escapeHTML(entry.term) + "</dt>\n            <dd class=\"definition\">\n                " + this._escapeHTML(entry.definition) + "\n                <span class=\"source\">\n                    <a href=\"" + entry.fileName + "\">Source: " + entry.fileName + "</a>\n                </span>\n            </dd>\n        </div>";
    }, this).join('\n');
    
    return "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Glossary</title>\n    <link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n    <nav class=\"back-navigation\">\n        <a href=\"index.html\">← Back to Index</a>\n    </nav>\n    \n    <h1>Glossary</h1>\n    <p class=\"glossary-info\">" + glossary.count + " terms found</p>\n    \n    <dl class=\"glossary\">\n        " + entries + "\n    </dl>\n    \n    <script src=\"navigation.js\"></script>\n</body>\n</html>";
};

/**
 * Generate default CSS
 */
ChunkedDocumentConverter.prototype._generateCSS = function() {
    return "/* Document Chunking Styles */\nbody {\n    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n    line-height: 1.6;\n    max-width: 800px;\n    margin: 0 auto;\n    padding: 20px;\n    color: #333;\n}\n\n/* Navigation */\n.chunk-navigation {\n    border-bottom: 1px solid #e0e0e0;\n    padding-bottom: 15px;\n    margin-bottom: 30px;\n}\n\n.nav-links {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n}\n\n.nav-link {\n    padding: 8px 16px;\n    border-radius: 4px;\n    text-decoration: none;\n    color: #0066cc;\n    border: 1px solid #0066cc;\n    transition: all 0.2s;\n}\n\n.nav-link:hover:not(.disabled) {\n    background-color: #0066cc;\n    color: white;\n}\n\n.nav-link.disabled {\n    color: #999;\n    border-color: #ddd;\n    cursor: not-allowed;\n}\n\n.back-navigation {\n    margin-bottom: 20px;\n}\n\n.back-navigation a {\n    color: #0066cc;\n    text-decoration: none;\n}\n\n/* Content */\n.document-chunk {\n    margin-bottom: 40px;\n    padding-bottom: 20px;\n}\n\n.chunk-separator {\n    border: none;\n    border-top: 2px solid #e0e0e0;\n    margin: 40px 0;\n}\n\n/* Metadata */\n.metadata {\n    background-color: #f8f9fa;\n    border-left: 4px solid #0066cc;\n    padding: 15px;\n    margin: 20px 0;\n    border-radius: 0 4px 4px 0;\n}\n\n.metadata h3 {\n    margin-top: 0;\n    color: #0066cc;\n}\n\n.metadata ul {\n    margin: 10px 0 0 0;\n    padding-left: 20px;\n}\n\n/* Table of Contents */\n.table-of-contents {\n    background-color: #f8f9fa;\n    padding: 20px;\n    border-radius: 8px;\n    margin: 20px 0;\n}\n\n.table-of-contents ol {\n    padding-left: 20px;\n}\n\n.table-of-contents li {\n    margin: 8px 0;\n}\n\n.toc-link {\n    color: #333;\n    text-decoration: none;\n    display: block;\n    padding: 4px 0;\n}\n\n.toc-link:hover {\n    color: #0066cc;\n    text-decoration: underline;\n}\n\n.toc-link.chunk-title {\n    font-weight: 600;\n}\n\n/* Document Info */\n.document-info {\n    background-color: #e8f4fd;\n    padding: 20px;\n    border-radius: 8px;\n    margin: 20px 0;\n}\n\n.chunk-list ul {\n    list-style-type: none;\n    padding: 0;\n}\n\n.chunk-list li {\n    padding: 10px 0;\n    border-bottom: 1px solid #e0e0e0;\n}\n\n.chunk-list li:last-child {\n    border-bottom: none;\n}\n\n/* Glossary */\n.glossary {\n    margin: 20px 0;\n}\n\n.glossary-entry {\n    margin: 20px 0;\n    padding: 15px;\n    border-left: 3px solid #0066cc;\n    background-color: #f8f9fa;\n}\n\n.term {\n    font-weight: 600;\n    color: #0066cc;\n    margin-bottom: 8px;\n}\n\n.definition {\n    margin: 0;\n    line-height: 1.5;\n}\n\n.source {\n    display: block;\n    margin-top: 10px;\n    font-size: 0.9em;\n    color: #666;\n}\n\n.source a {\n    color: #0066cc;\n    text-decoration: none;\n}\n\n/* Responsive Design */\n@media (max-width: 600px) {\n    body {\n        padding: 15px;\n    }\n    \n    .nav-links {\n        flex-direction: column;\n        gap: 10px;\n    }\n    \n    .nav-link {\n        text-align: center;\n        display: block;\n    }\n}\n\n/* Print Styles */\n@media print {\n    .chunk-navigation,\n    .back-navigation {\n        display: none;\n    }\n    \n    body {\n        max-width: none;\n        margin: 0;\n        padding: 0;\n    }\n    \n    .document-chunk {\n        page-break-after: always;\n    }\n    \n    .document-chunk:last-child {\n        page-break-after: auto;\n    }\n}";
};

/**
 * Generate navigation JavaScript
 */
ChunkedDocumentConverter.prototype._generateNavigationJS = function(navigation) {
    return "\n// Document Navigation JavaScript\n(function() {\n    'use strict';\n    \n    // Keyboard navigation\n    document.addEventListener('keydown', function(event) {\n        // Don't interfere with form inputs\n        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {\n            return;\n        }\n        \n        // Don't interfere with modifier keys\n        if (event.ctrlKey || event.altKey || event.metaKey) {\n            return;\n        }\n        \n        switch(event.key) {\n            case 'ArrowLeft':\n                var prevLink = document.querySelector('[data-nav=\"previous\"]');\n                if (prevLink && !prevLink.classList.contains('disabled')) {\n                    window.location.href = prevLink.href;\n                    event.preventDefault();\n                }\n                break;\n                \n            case 'ArrowRight':\n                var nextLink = document.querySelector('[data-nav=\"next\"]');\n                if (nextLink && !nextLink.classList.contains('disabled')) {\n                    window.location.href = nextLink.href;\n                    event.preventDefault();\n                }\n                break;\n                \n            case 'Home':\n                window.location.href = './index.html';\n                event.preventDefault();\n                break;\n                \n            case 'h':\n            case 'H':\n                window.location.href = './index.html';\n                event.preventDefault();\n                break;\n        }\n    });\n    \n    // Jump dropdown functionality\n    var jumpDropdown = document.querySelector('.jump-dropdown');\n    if (jumpDropdown) {\n        jumpDropdown.addEventListener('change', function() {\n            if (this.value) {\n                window.location.href = this.value;\n            }\n        });\n    }\n    \n    // Add keyboard shortcut hints\n    var shortcuts = document.createElement('div');\n    shortcuts.className = 'keyboard-shortcuts';\n    shortcuts.innerHTML = \n        '<small>Keyboard shortcuts: ← Previous | → Next | Home/H Index</small>';\n    shortcuts.style.cssText = \n        'position: fixed; bottom: 10px; right: 10px; ' +\n        'background: rgba(0,0,0,0.7); color: white; ' +\n        'padding: 5px 10px; border-radius: 3px; ' +\n        'font-size: 11px; z-index: 1000; ' +\n        'opacity: 0; transition: opacity 0.3s;';\n    \n    document.body.appendChild(shortcuts);\n    \n    // Show shortcuts on key press\n    var showTimeout;\n    document.addEventListener('keydown', function() {\n        clearTimeout(showTimeout);\n        shortcuts.style.opacity = '1';\n        showTimeout = setTimeout(function() {\n            shortcuts.style.opacity = '0';\n        }, 2000);\n    });\n    \n})();";
};

/**
 * Utility methods
 */
ChunkedDocumentConverter.prototype._getDefaultHTMLTemplate = function() {
    return "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>{{TITLE}}</title>\n    {{CSS_LINK}}\n</head>\n<body>\n    {{NAVIGATION}}\n    \n    <main class=\"chunk-content\">\n        {{CONTENT}}\n    </main>\n    \n    {{METADATA}}\n    {{JS_SCRIPT}}\n</body>\n</html>";
};

ChunkedDocumentConverter.prototype._generateMetadataHTML = function(metadata) {
    if (!metadata || !this.outputOptions.includeMetadata) {
        return '';
    }
    
    return "\n    <aside class=\"metadata\">\n        <h3>Section Information</h3>\n        <ul>\n            <li>Word count: " + (metadata.wordCount || 0) + "</li>\n            <li>Estimated reading time: " + (metadata.readingTime || 0) + " minute(s)</li>\n            <li>Character count: " + (metadata.characterCount || 0) + "</li>\n            <li>Headings: " + (metadata.headingCount || 0) + "</li>\n            <li>Links: " + (metadata.linkCount || 0) + "</li>\n            <li>Images: " + (metadata.imageCount || 0) + "</li>\n            <li>Tables: " + (metadata.tableCount || 0) + "</li>\n        </ul>\n    </aside>";
};

ChunkedDocumentConverter.prototype._renderTOCHTML = function(toc) {
    if (!toc || !toc.entries || toc.entries.length === 0) {
        return '<p>No table of contents available</p>';
    }
    
    var tocHTML = '<ol class="toc-list">';
    var currentLevel = 0;
    
    toc.entries.forEach(function(entry, index) {
        if (entry.level > currentLevel) {
            // Opening deeper levels
            while (currentLevel < entry.level) {
                tocHTML += '<ol class="toc-level-' + (currentLevel + 1) + '">';
                currentLevel++;
            }
        } else if (entry.level < currentLevel) {
            // Closing to shallower level
            while (currentLevel > entry.level) {
                tocHTML += '</ol>';
                currentLevel--;
            }
        }
        
        var linkClass = entry.isChunkTitle ? 'toc-link chunk-title' : 'toc-link sub-heading';
        tocHTML += '<li class="toc-entry level-' + entry.level + '">';
        tocHTML += '<a href="' + entry.href + '" class="' + linkClass + '">' + this._escapeHTML(entry.title) + '</a>';
        tocHTML += '</li>';
    }, this);
    
    // Close remaining levels
    while (currentLevel > 0) {
        tocHTML += '</ol>';
        currentLevel--;
    }
    
    return tocHTML;
};

ChunkedDocumentConverter.prototype._escapeHTML = function(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Configuration helpers
 */
function ChunkingOptions() {
    return {
        strategy: documentChunking.ChunkingStrategies.BY_HEADING_LEVEL,
        maxLevel: 3,
        generateNavigation: true,
        includeMetadata: true,
        preserveLinks: true,
        chunkSizeLimit: null,
        baseUrl: "./",
        filePrefix: "chunk-",
        fileSuffix: ".html"
    };
}

/**
 * Output format enumeration
 */
var OutputFormats = {
    SEPARATE_FILES: "separate_files",
    SINGLE_FILE: "single_file",
    JSON: "json",
    ARCHIVE: "archive"
};

exports.OutputFormats = OutputFormats;