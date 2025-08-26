#!/usr/bin/env node

/**
 * Publication Converter - Main Processing Engine
 * 
 * Handles conversion of entire publications with advanced features:
 * - Deep nested lists (10+ levels)
 * - Semantic sections (NOTE, REFERENCE, EXAMPLE)
 * - Multi-line figures
 * - Table of contents generation
 * - Document chunking
 * - Accessibility compliance
 */

const mammoth = require('../../lib/index');
const fs = require('fs-extra');
const path = require('path');
const { IntegratedListProcessor } = require('../../semantic-list-processor');
const { DeepNestedListProcessor } = require('../../deep-nested-list-processor');
const chalk = require('chalk');

/**
 * Publication Converter Configuration
 */
const DEFAULT_CONFIG = {
    // Conversion settings
    conversion: {
        styleMap: [
            "p[style-name='Title'] => h1.document-title:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='Heading 5'] => h5:fresh",
            "p[style-name='Heading 6'] => h6:fresh",
            "p[style-name='heading 8'] => h6.heading-8",
            "p[style-name='List Paragraph'] => li.list-paragraph",
            "p[style-name='Body Text'] => p.body-text",
            "p[style-name='Normal'] => p",
            "p[style-name='Quote'] => blockquote",
            "p[style-name='Code'] => pre.code",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
        ],
        includeDefaultStyleMap: true,
        ignoreEmptyParagraphs: false,
        convertImage: mammoth.images.imgElement(function(image) {
            return image.read("base64").then(function(imageBuffer) {
                return {
                    src: "data:" + image.contentType + ";base64," + imageBuffer
                };
            });
        })
    },
    
    // Processing features
    features: {
        deepNestedLists: true,
        semanticSections: true,
        multiLineFigures: true,
        tableOfContents: true,
        documentChunking: false,
        accessibility: true
    },
    
    // Output settings
    output: {
        format: 'html',
        styling: 'integrated',
        generateIndex: true,
        combineChapters: false,
        preserveStructure: true
    },
    
    // Advanced settings
    advanced: {
        maxNestingDepth: 10,
        chunkSize: 5000,
        semanticSectionTypes: ['note', 'reference', 'example', 'warning', 'caution', 'phraseology'],
        figurePatterns: ['FIG', 'FIGURE', 'Fig', 'Table', 'TABLE']
    }
};

/**
 * Main Publication Converter Class
 */
class PublicationConverter {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.statistics = {
            filesProcessed: 0,
            totalSections: 0,
            totalLists: 0,
            totalFigures: 0,
            errors: [],
            warnings: []
        };
        
        // Initialize processors
        this.initializeProcessors();
    }
    
    /**
     * Initialize all document processors
     */
    initializeProcessors() {
        // Integrated list processor for semantic sections and deep nesting
        this.listProcessor = new IntegratedListProcessor({
            maxDepthInSections: this.config.advanced.maxNestingDepth,
            preserveSectionHeaders: true,
            detectSemanticSections: this.config.features.semanticSections
        });
        
        // Deep nested list processor for standalone lists
        this.deepListProcessor = new DeepNestedListProcessor({
            maxDepth: this.config.advanced.maxNestingDepth,
            preserveNumbering: true
        });
    }
    
    /**
     * Convert a single document
     */
    async convertDocument(inputPath, outputPath = null) {
        console.log(chalk.blue(`📄 Converting: ${path.basename(inputPath)}`));
        
        try {
            // Step 1: Convert DOCX to HTML using mammoth
            const result = await mammoth.convertToHtml({
                path: inputPath,
                options: {
                    styleMap: this.config.conversion.styleMap,
                    includeDefaultStyleMap: this.config.conversion.includeDefaultStyleMap,
                    ignoreEmptyParagraphs: this.config.conversion.ignoreEmptyParagraphs,
                    convertImage: this.config.conversion.convertImage
                }
            });
            
            // Log warnings
            if (result.messages && result.messages.length > 0) {
                result.messages.forEach(msg => {
                    if (msg.type === 'warning') {
                        this.statistics.warnings.push(msg.message);
                    }
                });
            }
            
            // Step 2: Process HTML with enhanced features
            let processedHtml = result.value;
            
            // Apply deep nested lists and semantic sections
            if (this.config.features.deepNestedLists || this.config.features.semanticSections) {
                const listResult = this.listProcessor.processHtml(processedHtml);
                processedHtml = listResult.html;
                
                // Update statistics
                this.statistics.totalSections += listResult.statistics.combined.totalSections || 0;
                this.statistics.totalLists += listResult.statistics.combined.totalLists || 0;
            }
            
            // Apply multi-line figure processing
            if (this.config.features.multiLineFigures) {
                processedHtml = await this.processMultiLineFigures(processedHtml);
            }
            
            // Generate table of contents
            let toc = '';
            if (this.config.features.tableOfContents) {
                const tocResult = this.generateTableOfContents(processedHtml);
                toc = tocResult.toc;
                processedHtml = tocResult.html;
            }
            
            // Step 3: Generate final HTML document
            const finalHtml = this.generateFinalDocument(processedHtml, inputPath, toc);
            
            // Step 4: Save output
            if (outputPath) {
                await fs.ensureDir(path.dirname(outputPath));
                await fs.writeFile(outputPath, finalHtml);
                console.log(chalk.green(`✅ Saved to: ${outputPath}`));
            }
            
            this.statistics.filesProcessed++;
            
            return {
                html: finalHtml,
                statistics: {
                    sections: this.statistics.totalSections,
                    lists: this.statistics.totalLists,
                    figures: this.statistics.totalFigures
                }
            };
            
        } catch (error) {
            console.error(chalk.red(`❌ Error converting ${inputPath}:`), error.message);
            this.statistics.errors.push({
                file: inputPath,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Convert multiple documents (entire publication)
     */
    async convertPublication(inputDir, outputDir) {
        console.log(chalk.bold.cyan('\n📚 Converting Publication\n'));
        console.log(chalk.gray(`Input: ${inputDir}`));
        console.log(chalk.gray(`Output: ${outputDir}\n`));
        
        try {
            // Find all DOCX files
            const glob = require('glob');
            const docxFiles = glob.sync(path.join(inputDir, '**/*.docx'), {
                ignore: ['**/~$*.docx'] // Ignore temporary Word files
            });
            
            if (docxFiles.length === 0) {
                throw new Error('No DOCX files found in the specified directory');
            }
            
            console.log(chalk.yellow(`Found ${docxFiles.length} document(s)\n`));
            
            // Sort files for consistent chapter ordering
            docxFiles.sort((a, b) => {
                // Try to extract chapter numbers
                const aMatch = a.match(/chapter[_-]?(\d+)/i) || a.match(/(\d+)/);
                const bMatch = b.match(/chapter[_-]?(\d+)/i) || b.match(/(\d+)/);
                
                if (aMatch && bMatch) {
                    return parseInt(aMatch[1]) - parseInt(bMatch[1]);
                }
                return a.localeCompare(b);
            });
            
            // Convert each document
            const results = [];
            for (const docxFile of docxFiles) {
                const relativePath = path.relative(inputDir, docxFile);
                const outputPath = path.join(
                    outputDir,
                    relativePath.replace(/\.docx$/i, '.html')
                );
                
                const result = await this.convertDocument(docxFile, outputPath);
                results.push({
                    input: docxFile,
                    output: outputPath,
                    ...result
                });
            }
            
            // Generate index if configured
            if (this.config.output.generateIndex) {
                await this.generateIndex(results, outputDir);
            }
            
            // Generate combined document if configured
            if (this.config.output.combineChapters) {
                await this.generateCombinedDocument(results, outputDir);
            }
            
            return {
                results,
                statistics: this.statistics
            };
            
        } catch (error) {
            console.error(chalk.red('❌ Publication conversion failed:'), error.message);
            throw error;
        }
    }
    
    /**
     * Process multi-line figures
     */
    async processMultiLineFigures(html) {
        // Import multi-line figure handler if available
        try {
            const { processAllFigureTypes } = require('../../multi-line-figure-handler');
            const processed = await processAllFigureTypes(html);
            
            // Count figures
            const figureCount = (processed.match(/<figure/g) || []).length;
            this.statistics.totalFigures += figureCount;
            
            return processed;
        } catch (error) {
            // Multi-line figure handler not available, return original
            return html;
        }
    }
    
    /**
     * Generate table of contents
     */
    generateTableOfContents(html) {
        const headings = [];
        const headingRegex = /<h([1-6])[^>]*(?:id="([^"]*)")?[^>]*>([^<]+)<\/h\1>/gi;
        let match;
        let headingCounter = 0;
        
        // Extract headings and add IDs if missing
        let processedHtml = html;
        while ((match = headingRegex.exec(html)) !== null) {
            const level = parseInt(match[1]);
            let id = match[2];
            const text = match[3].trim();
            
            // Generate ID if missing
            if (!id) {
                id = `heading-${++headingCounter}`;
                const originalHeading = match[0];
                const newHeading = originalHeading.replace(/<h([1-6])/, `<h$1 id="${id}"`);
                processedHtml = processedHtml.replace(originalHeading, newHeading);
            }
            
            headings.push({ level, id, text });
        }
        
        // Generate TOC HTML
        let toc = '<nav class="table-of-contents" role="navigation" aria-label="Table of Contents">\n';
        toc += '  <h2>Table of Contents</h2>\n';
        toc += '  <ol>\n';
        
        let currentLevel = 0;
        headings.forEach(heading => {
            // Adjust nesting level
            while (currentLevel < heading.level) {
                toc += '    <ol>\n';
                currentLevel++;
            }
            while (currentLevel > heading.level) {
                toc += '    </ol>\n';
                currentLevel--;
            }
            
            // Add TOC entry
            toc += `    <li><a href="#${heading.id}">${heading.text}</a></li>\n`;
        });
        
        // Close remaining lists
        while (currentLevel > 0) {
            toc += '  </ol>\n';
            currentLevel--;
        }
        
        toc += '</nav>\n';
        
        return { toc, html: processedHtml };
    }
    
    /**
     * Generate final HTML document
     */
    generateFinalDocument(content, sourcePath, toc = '') {
        const title = path.basename(sourcePath, path.extname(sourcePath));
        const styles = this.generateStyles();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="generator" content="Mammoth Publication Converter">
    <title>${title}</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    <div class="document-container">
        ${toc}
        <main class="document-content" role="main">
            ${content}
        </main>
    </div>
    <footer class="document-footer">
        <p>Generated by Mammoth Publication Converter | ${new Date().toLocaleDateString()}</p>
    </footer>
</body>
</html>`;
    }
    
    /**
     * Generate comprehensive styles
     */
    generateStyles() {
        const listStyles = this.listProcessor.generateStyles();
        
        return `
        /* Document Layout */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .document-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        /* Typography */
        h1, h2, h3, h4, h5, h6 {
            margin-top: 2em;
            margin-bottom: 1em;
            font-weight: 600;
            line-height: 1.3;
            color: #2c3e50;
        }
        
        h1 { font-size: 2.5em; border-bottom: 3px solid #3498db; padding-bottom: 0.3em; }
        h2 { font-size: 2em; border-bottom: 1px solid #ecf0f1; padding-bottom: 0.2em; }
        h3 { font-size: 1.5em; }
        h4 { font-size: 1.25em; }
        h5 { font-size: 1.1em; }
        h6 { font-size: 1em; }
        
        p {
            margin: 1em 0;
        }
        
        /* Table of Contents */
        .table-of-contents {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 2em 0;
        }
        
        .table-of-contents h2 {
            margin-top: 0;
            color: #495057;
            border: none;
        }
        
        .table-of-contents ol {
            counter-reset: toc-counter;
            list-style: none;
            padding-left: 0;
        }
        
        .table-of-contents li {
            counter-increment: toc-counter;
            margin: 0.5em 0;
        }
        
        .table-of-contents li::before {
            content: counters(toc-counter, ".") ". ";
            font-weight: 600;
            color: #6c757d;
        }
        
        .table-of-contents a {
            color: #007bff;
            text-decoration: none;
        }
        
        .table-of-contents a:hover {
            text-decoration: underline;
        }
        
        .table-of-contents ol ol {
            padding-left: 2em;
            margin-top: 0.25em;
        }
        
        /* Images and Figures */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em auto;
        }
        
        figure {
            margin: 2em 0;
            text-align: center;
        }
        
        figcaption {
            margin-top: 0.5em;
            font-style: italic;
            color: #6c757d;
        }
        
        /* Tables */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 2em 0;
        }
        
        th, td {
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        /* Document Footer */
        .document-footer {
            margin-top: 4em;
            padding-top: 2em;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .document-container {
                padding: 20px;
            }
            
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            
            .table-of-contents {
                padding: 15px;
            }
        }
        
        /* Print Styles */
        @media print {
            body {
                background: white;
                color: black;
            }
            
            .document-container {
                box-shadow: none;
                padding: 0;
            }
            
            .table-of-contents {
                page-break-after: always;
            }
            
            h1, h2 {
                page-break-after: avoid;
            }
            
            figure, table {
                page-break-inside: avoid;
            }
            
            .document-footer {
                display: none;
            }
        }
        
        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            body {
                background: #1a1a1a;
                color: #e0e0e0;
            }
            
            .document-container {
                background: #2a2a2a;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: #fff;
            }
            
            .table-of-contents {
                background: #333;
                border-color: #444;
            }
            
            th {
                background: #333;
            }
            
            tr:nth-child(even) {
                background: #333;
            }
        }
        
        /* Include list processor styles */
        ${listStyles}
        `;
    }
    
    /**
     * Generate index page for publication
     */
    async generateIndex(results, outputDir) {
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Publication Index</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .index-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 0.5em;
        }
        
        .document-list {
            list-style: none;
            padding: 0;
        }
        
        .document-item {
            margin: 1em 0;
            padding: 20px;
            background: #f8f9fa;
            border-left: 4px solid #3498db;
            border-radius: 4px;
            transition: transform 0.2s;
        }
        
        .document-item:hover {
            transform: translateX(5px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .document-item a {
            font-size: 1.2em;
            font-weight: 600;
            color: #2c3e50;
            text-decoration: none;
        }
        
        .document-item a:hover {
            color: #3498db;
        }
        
        .document-stats {
            margin-top: 0.5em;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .statistics {
            margin-top: 2em;
            padding: 20px;
            background: #e3f2fd;
            border-radius: 8px;
        }
        
        .statistics h2 {
            margin-top: 0;
            color: #1976d2;
        }
        
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 1em;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 4px;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #1976d2;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="index-container">
        <h1>📚 Publication Index</h1>
        <p>Complete publication with ${results.length} document(s)</p>
        
        <ul class="document-list">
            ${results.map((result, index) => `
            <li class="document-item">
                <a href="${path.relative(outputDir, result.output)}">
                    ${path.basename(result.input, '.docx')}
                </a>
                <div class="document-stats">
                    📊 ${result.statistics.sections || 0} sections | 
                    📝 ${result.statistics.lists || 0} lists | 
                    🖼️ ${result.statistics.figures || 0} figures
                </div>
            </li>
            `).join('')}
        </ul>
        
        <div class="statistics">
            <h2>📈 Publication Statistics</h2>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${this.statistics.filesProcessed}</div>
                    <div class="stat-label">Documents</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.statistics.totalSections}</div>
                    <div class="stat-label">Sections</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.statistics.totalLists}</div>
                    <div class="stat-label">Lists</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.statistics.totalFigures}</div>
                    <div class="stat-label">Figures</div>
                </div>
            </div>
        </div>
        
        <footer>
            <p style="text-align: center; color: #6c757d; margin-top: 2em;">
                Generated on ${new Date().toLocaleString()} | 
                Powered by Mammoth Publication Converter
            </p>
        </footer>
    </div>
</body>
</html>`;
        
        await fs.writeFile(path.join(outputDir, 'index.html'), indexHtml);
        console.log(chalk.green('✅ Generated index.html'));
    }
    
    /**
     * Generate combined document
     */
    async generateCombinedDocument(results, outputDir) {
        let combinedContent = '';
        let combinedToc = '<nav class="table-of-contents" role="navigation">\n<h2>Complete Table of Contents</h2>\n<ol>\n';
        
        results.forEach((result, index) => {
            const chapterTitle = path.basename(result.input, '.docx');
            combinedContent += `
                <section class="chapter" id="chapter-${index + 1}">
                    <h1>${chapterTitle}</h1>
                    ${result.html.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1]}
                </section>
            `;
            
            combinedToc += `<li><a href="#chapter-${index + 1}">${chapterTitle}</a></li>\n`;
        });
        
        combinedToc += '</ol>\n</nav>\n';
        
        const combinedHtml = this.generateFinalDocument(combinedContent, 'Combined Publication', combinedToc);
        
        await fs.writeFile(path.join(outputDir, 'combined.html'), combinedHtml);
        console.log(chalk.green('✅ Generated combined.html'));
    }
}

module.exports = { PublicationConverter, DEFAULT_CONFIG };