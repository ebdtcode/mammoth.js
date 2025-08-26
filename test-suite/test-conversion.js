#!/usr/bin/env node

/**
 * Comprehensive test suite for mammoth.js conversion capabilities
 * Tests various document features and outputs detailed reports
 */

const mammoth = require('../lib/index');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

class DocumentTester {
    constructor(docPath, options = {}) {
        this.docPath = docPath;
        this.docName = path.basename(docPath);
        this.options = options;
        this.results = {
            features: {},
            warnings: [],
            errors: [],
            stats: {}
        };
    }

    async runFullTest() {
        console.log(`\n${colors.bold}${colors.blue}Testing: ${this.docName}${colors.reset}`);
        console.log('═'.repeat(50));

        // Test 1: Basic conversion
        await this.testBasicConversion();
        
        // Test 2: Security features
        await this.testSecurityFeatures();
        
        // Test 3: Table handling
        await this.testTableHandling();
        
        // Test 4: Custom handlers
        await this.testCustomHandlers();
        
        // Test 5: Style mappings
        await this.testStyleMappings();
        
        // Test 6: Image handling
        await this.testImageHandling();
        
        // Test 7: Footnotes and references
        await this.testFootnotes();
        
        // Test 8: Performance
        await this.testPerformance();
        
        // Generate report
        this.generateReport();
    }

    async testBasicConversion() {
        console.log(`\n${colors.cyan}1. Basic Conversion Test${colors.reset}`);
        
        try {
            const result = await mammoth.convertToHtml({path: this.docPath});
            
            this.results.features.basicConversion = true;
            this.results.stats.htmlLength = result.value.length;
            this.results.warnings = result.messages.filter(m => m.type === 'warning');
            
            // Analyze content
            const analysis = this.analyzeHTML(result.value);
            this.results.stats = {...this.results.stats, ...analysis};
            
            console.log(`   ✓ HTML generated: ${result.value.length} characters`);
            console.log(`   ✓ Warnings: ${this.results.warnings.length}`);
            console.log(`   ✓ Paragraphs: ${analysis.paragraphs}`);
            console.log(`   ✓ Headers: ${analysis.headers}`);
            console.log(`   ✓ Lists: ${analysis.lists}`);
            console.log(`   ✓ Tables: ${analysis.tables}`);
            
            // Save output
            const outputPath = path.join(path.dirname(this.docPath), 
                `${path.basename(this.docPath, '.docx')}_basic.html`);
            fs.writeFileSync(outputPath, this.wrapHTML(result.value, 'Basic Conversion'));
            console.log(`   → Output saved to: ${outputPath}`);
            
        } catch (error) {
            this.results.errors.push({test: 'basic', error: error.message});
            console.log(`   ${colors.red}✗ Error: ${error.message}${colors.reset}`);
        }
    }

    async testSecurityFeatures() {
        console.log(`\n${colors.cyan}2. Security Features Test${colors.reset}`);
        
        const securityLevels = ['standard', 'strict', 'permissive'];
        
        for (const level of securityLevels) {
            try {
                const result = await mammoth.convertToHtml(
                    {path: this.docPath},
                    {
                        security: {
                            level: level,
                            customSanitizer: (url) => {
                                console.log(`   → URL sanitized (${level}): ${url}`);
                                return url;
                            }
                        }
                    }
                );
                
                this.results.features[`security_${level}`] = true;
                console.log(`   ✓ Security level '${level}' tested`);
                
                // Check for blocked content
                const blocked = result.messages.filter(m => 
                    m.message.includes('blocked') || m.message.includes('sanitized')
                );
                if (blocked.length > 0) {
                    console.log(`   → ${blocked.length} URLs sanitized`);
                }
                
            } catch (error) {
                console.log(`   ${colors.red}✗ Security ${level}: ${error.message}${colors.reset}`);
            }
        }
    }

    async testTableHandling() {
        console.log(`\n${colors.cyan}3. Table Handling Test${colors.reset}`);
        
        try {
            const result = await mammoth.convertToHtml(
                {path: this.docPath},
                {
                    tables: {
                        preserveBorders: true,
                        preserveBackground: true,
                        preserveAlignment: true,
                        preserveWidth: true,
                        cssMode: 'inline'
                    }
                }
            );
            
            const tables = (result.value.match(/<table/g) || []).length;
            const bordersPreserved = result.value.includes('border:') || result.value.includes('border-');
            const backgroundsPreserved = result.value.includes('background-color:');
            
            this.results.features.tableFormatting = {
                count: tables,
                borders: bordersPreserved,
                backgrounds: backgroundsPreserved
            };
            
            console.log(`   ✓ Tables found: ${tables}`);
            console.log(`   ✓ Borders preserved: ${bordersPreserved ? 'Yes' : 'No'}`);
            console.log(`   ✓ Backgrounds preserved: ${backgroundsPreserved ? 'Yes' : 'No'}`);
            
            if (tables > 0) {
                const outputPath = path.join(path.dirname(this.docPath), 
                    `${path.basename(this.docPath, '.docx')}_tables.html`);
                fs.writeFileSync(outputPath, this.wrapHTML(result.value, 'Table Formatting Test'));
                console.log(`   → Output saved to: ${outputPath}`);
            }
            
        } catch (error) {
            console.log(`   ${colors.red}✗ Table handling: ${error.message}${colors.reset}`);
        }
    }

    async testCustomHandlers() {
        console.log(`\n${colors.cyan}4. Custom Handlers Test${colors.reset}`);
        
        // Register a test handler
        mammoth.handlers.register({
            elementNames: ['w:customXml', 'w:sdt'],
            priority: 200,
            handler: function(element, messages, options) {
                return [mammoth.Html.text(`[Custom Element: ${element.name}]`)];
            }
        });
        
        // Register fallback handler
        let fallbackCount = 0;
        mammoth.handlers.registerFallback(function(element, messages, options) {
            fallbackCount++;
            return [mammoth.Html.text(`[Unknown: ${element.name}]`)];
        }, 10);
        
        try {
            const result = await mammoth.convertToHtml({path: this.docPath});
            
            this.results.features.customHandlers = {
                registered: true,
                fallbackTriggered: fallbackCount > 0,
                fallbackCount: fallbackCount
            };
            
            console.log(`   ✓ Custom handlers registered`);
            console.log(`   ✓ Fallback handler triggered: ${fallbackCount} times`);
            
            if (fallbackCount > 0) {
                const unknownElements = result.messages
                    .filter(m => m.message.includes('Unknown') || m.message.includes('Unrecognized'))
                    .map(m => m.message);
                console.log(`   → Unknown elements: ${unknownElements.length}`);
            }
            
        } catch (error) {
            console.log(`   ${colors.red}✗ Custom handlers: ${error.message}${colors.reset}`);
        }
    }

    async testStyleMappings() {
        console.log(`\n${colors.cyan}5. Style Mappings Test${colors.reset}`);
        
        const styleMap = [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Heading 1'] => h2:fresh",
            "p[style-name='Heading 2'] => h3:fresh",
            "p[style-name='Quote'] => blockquote:fresh",
            "r[style-name='Strong'] => strong",
            "p[style-name='Code'] => pre:fresh",
            "p[style-name='Caption'] => figcaption:fresh"
        ];
        
        try {
            const result = await mammoth.convertToHtml(
                {path: this.docPath},
                {styleMap: styleMap}
            );
            
            // Check which styles were applied
            const appliedStyles = {
                h1: (result.value.match(/<h1/g) || []).length,
                h2: (result.value.match(/<h2/g) || []).length,
                h3: (result.value.match(/<h3/g) || []).length,
                blockquote: (result.value.match(/<blockquote/g) || []).length,
                pre: (result.value.match(/<pre/g) || []).length,
                figcaption: (result.value.match(/<figcaption/g) || []).length
            };
            
            this.results.features.styleMappings = appliedStyles;
            
            console.log(`   ✓ Style map applied`);
            Object.entries(appliedStyles).forEach(([tag, count]) => {
                if (count > 0) {
                    console.log(`   ✓ ${tag}: ${count} instances`);
                }
            });
            
            const outputPath = path.join(path.dirname(this.docPath), 
                `${path.basename(this.docPath, '.docx')}_styled.html`);
            fs.writeFileSync(outputPath, this.wrapHTML(result.value, 'Style Mappings Test'));
            console.log(`   → Output saved to: ${outputPath}`);
            
        } catch (error) {
            console.log(`   ${colors.red}✗ Style mappings: ${error.message}${colors.reset}`);
        }
    }

    async testImageHandling() {
        console.log(`\n${colors.cyan}6. Image Handling Test${colors.reset}`);
        
        const imageStats = {
            inline: 0,
            extracted: 0,
            total: 0
        };
        
        // Test 1: Inline images (base64)
        try {
            const result = await mammoth.convertToHtml({path: this.docPath});
            imageStats.inline = (result.value.match(/data:image/g) || []).length;
            imageStats.total = (result.value.match(/<img/g) || []).length;
            
            console.log(`   ✓ Inline images (base64): ${imageStats.inline}`);
            
        } catch (error) {
            console.log(`   ${colors.yellow}⚠ Inline images: ${error.message}${colors.reset}`);
        }
        
        // Test 2: Extract images to files
        const outputDir = path.join(path.dirname(this.docPath), 'extracted_images');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        
        let imageIndex = 0;
        try {
            const result = await mammoth.convertToHtml(
                {path: this.docPath},
                {
                    convertImage: mammoth.images.imgElement(function(element) {
                        imageIndex++;
                        const extension = element.contentType.split('/')[1];
                        const filename = `image_${imageIndex}.${extension}`;
                        
                        return element.read().then(function(imageBuffer) {
                            const imagePath = path.join(outputDir, filename);
                            fs.writeFileSync(imagePath, imageBuffer);
                            return {src: `extracted_images/${filename}`};
                        });
                    })
                }
            );
            
            imageStats.extracted = imageIndex;
            console.log(`   ✓ Extracted images: ${imageStats.extracted}`);
            console.log(`   → Images saved to: ${outputDir}`);
            
            this.results.features.images = imageStats;
            
        } catch (error) {
            console.log(`   ${colors.yellow}⚠ Image extraction: ${error.message}${colors.reset}`);
        }
    }

    async testFootnotes() {
        console.log(`\n${colors.cyan}7. Footnotes & References Test${colors.reset}`);
        
        try {
            const result = await mammoth.convertToHtml({path: this.docPath});
            
            const footnotes = (result.value.match(/id="footnote-\d+"/g) || []).length;
            const endnotes = (result.value.match(/id="endnote-\d+"/g) || []).length;
            const hyperlinks = (result.value.match(/<a href=/g) || []).length;
            
            this.results.features.references = {
                footnotes: footnotes,
                endnotes: endnotes,
                hyperlinks: hyperlinks
            };
            
            console.log(`   ✓ Footnotes: ${footnotes}`);
            console.log(`   ✓ Endnotes: ${endnotes}`);
            console.log(`   ✓ Hyperlinks: ${hyperlinks}`);
            
            // Check for duplicate footnotes
            const footnoteIds = result.value.match(/id="footnote-\d+"/g) || [];
            const uniqueIds = new Set(footnoteIds);
            if (footnoteIds.length !== uniqueIds.size) {
                console.log(`   ${colors.yellow}⚠ Duplicate footnotes detected${colors.reset}`);
            } else if (footnotes > 0) {
                console.log(`   ✓ No duplicate footnotes`);
            }
            
        } catch (error) {
            console.log(`   ${colors.red}✗ References: ${error.message}${colors.reset}`);
        }
    }

    async testPerformance() {
        console.log(`\n${colors.cyan}8. Performance Test${colors.reset}`);
        
        const runs = 5;
        const times = [];
        
        try {
            // Warm up
            await mammoth.convertToHtml({path: this.docPath});
            
            // Timed runs
            for (let i = 0; i < runs; i++) {
                const start = process.hrtime.bigint();
                await mammoth.convertToHtml({path: this.docPath});
                const end = process.hrtime.bigint();
                times.push(Number(end - start) / 1000000); // Convert to ms
            }
            
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            this.results.features.performance = {
                average: avgTime.toFixed(2),
                min: minTime.toFixed(2),
                max: maxTime.toFixed(2)
            };
            
            console.log(`   ✓ Average time: ${avgTime.toFixed(2)}ms`);
            console.log(`   ✓ Min time: ${minTime.toFixed(2)}ms`);
            console.log(`   ✓ Max time: ${maxTime.toFixed(2)}ms`);
            
            // File size analysis
            const stats = fs.statSync(this.docPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            console.log(`   ✓ File size: ${fileSizeMB.toFixed(2)}MB`);
            console.log(`   ✓ Processing speed: ${(fileSizeMB / (avgTime / 1000)).toFixed(2)}MB/s`);
            
        } catch (error) {
            console.log(`   ${colors.red}✗ Performance: ${error.message}${colors.reset}`);
        }
    }

    analyzeHTML(html) {
        return {
            paragraphs: (html.match(/<p>/g) || []).length,
            headers: (html.match(/<h[1-6]>/g) || []).length,
            lists: (html.match(/<ul>|<ol>/g) || []).length,
            listItems: (html.match(/<li>/g) || []).length,
            tables: (html.match(/<table/g) || []).length,
            images: (html.match(/<img/g) || []).length,
            links: (html.match(/<a href=/g) || []).length,
            strong: (html.match(/<strong>/g) || []).length,
            emphasis: (html.match(/<em>/g) || []).length
        };
    }

    wrapHTML(content, title) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${this.docName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
        }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 20px;
            margin-left: 0;
            color: #666;
        }
        pre {
            background-color: #f5f5f5;
            padding: 12px;
            overflow-x: auto;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        .test-info {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="test-info">
        <h2>mammoth.js Conversion Test: ${title}</h2>
        <p><strong>Document:</strong> ${this.docName}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    </div>
    ${content}
</body>
</html>`;
    }

    generateReport() {
        console.log(`\n${colors.bold}${colors.green}═══ TEST REPORT ═══${colors.reset}`);
        
        // Overall summary
        console.log(`\n${colors.bold}Document:${colors.reset} ${this.docName}`);
        
        // Features summary
        console.log(`\n${colors.bold}Features Tested:${colors.reset}`);
        Object.entries(this.results.features).forEach(([feature, result]) => {
            if (typeof result === 'boolean') {
                const icon = result ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
                console.log(`  ${icon} ${feature}`);
            }
        });
        
        // Statistics
        if (this.results.stats && Object.keys(this.results.stats).length > 0) {
            console.log(`\n${colors.bold}Content Statistics:${colors.reset}`);
            Object.entries(this.results.stats).forEach(([stat, value]) => {
                if (value > 0) {
                    console.log(`  • ${stat}: ${value}`);
                }
            });
        }
        
        // Warnings
        if (this.results.warnings.length > 0) {
            console.log(`\n${colors.bold}${colors.yellow}Warnings (${this.results.warnings.length}):${colors.reset}`);
            this.results.warnings.slice(0, 5).forEach(w => {
                console.log(`  ⚠ ${w.message}`);
            });
            if (this.results.warnings.length > 5) {
                console.log(`  ... and ${this.results.warnings.length - 5} more`);
            }
        }
        
        // Errors
        if (this.results.errors.length > 0) {
            console.log(`\n${colors.bold}${colors.red}Errors:${colors.reset}`);
            this.results.errors.forEach(e => {
                console.log(`  ✗ ${e.test}: ${e.error}`);
            });
        }
        
        // Save JSON report
        const reportPath = path.join(path.dirname(this.docPath), 
            `${path.basename(this.docPath, '.docx')}_report.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n${colors.bold}Full report saved to:${colors.reset} ${reportPath}`);
        
        console.log('\n' + '═'.repeat(50));
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
${colors.bold}mammoth.js Test Suite${colors.reset}

Usage: node test-conversion.js <document.docx> [options]

Options:
  --quick     Run quick test (basic conversion only)
  --security  Focus on security testing
  --tables    Focus on table conversion
  --all       Run all tests (default)

Examples:
  node test-conversion.js sample.docx
  node test-conversion.js complex-doc.docx --tables
  node test-conversion.js "~/Documents/My Report.docx"
        `);
        process.exit(0);
    }
    
    const docPath = args[0];
    const options = args.slice(1);
    
    if (!fs.existsSync(docPath)) {
        console.error(`${colors.red}Error: File not found: ${docPath}${colors.reset}`);
        process.exit(1);
    }
    
    const tester = new DocumentTester(docPath, options);
    
    try {
        if (options.includes('--quick')) {
            await tester.testBasicConversion();
        } else if (options.includes('--security')) {
            await tester.testSecurityFeatures();
        } else if (options.includes('--tables')) {
            await tester.testTableHandling();
        } else {
            await tester.runFullTest();
        }
    } catch (error) {
        console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = DocumentTester;