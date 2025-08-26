#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { convertWithModularHierarchy } = require('./modular-hierarchical-converter');
const { enhancedImageConverter, enhanceFiguresAndCaptions } = require('./enhanced-image-converter');

/**
 * Ultimate Document Converter
 * 
 * Combines all enhancements:
 * - Hierarchical list structures
 * - Semantic HTML5 elements
 * - Enhanced image and figure handling
 * - Media placeholders
 * - Comprehensive reporting
 */

async function ultimateConvert(inputPath, outputPath, options = {}) {
    try {
        console.log(`🚀 Ultimate Document Conversion: ${inputPath}\n`);
        console.log('🔧 Features enabled:');
        console.log('   ✅ Hierarchical list structures');
        console.log('   ✅ Semantic HTML5 elements (NOTE, PHRASEOLOGY, etc.)');
        console.log('   ✅ Enhanced image and figure handling');
        console.log('   ✅ Media placeholder generation');
        console.log('   ✅ Accessibility features');
        console.log('   ✅ Dark mode support\n');
        
        // Prepare directories
        const imageDir = options.imageDir || path.join(path.dirname(outputPath), 'images');
        
        // Comprehensive style map
        const styleMap = [
            "p[style-name='Title'] => h1.document-title:fresh",
            "p[style-name='Subtitle'] => h2.document-subtitle:fresh",
            "p[style-name='Body Text'] => p.body-text",
            "p[style-name='BodyText'] => p.body-text",
            "p[style-name='Normal'] => p.normal",
            "p[style-name='heading 1'] => h1.heading-1",
            "p[style-name='heading 2'] => h2.heading-2",
            "p[style-name='heading 3'] => h3.heading-3",
            "p[style-name='heading 4'] => h4.heading-4",
            "p[style-name='heading 5'] => h5.heading-5",
            "p[style-name='heading 6'] => h6.heading-6",
            "p[style-name='heading 7'] => h6.heading-7",
            "p[style-name='heading 8'] => h6.heading-8",
            "p[style-name='Heading1'] => h1.heading-1",
            "p[style-name='Heading2'] => h2.heading-2",
            "p[style-name='Heading3'] => h3.heading-3",
            "p[style-name='Heading4'] => h4.heading-4",
            "p[style-name='Heading5'] => h5.heading-5",
            "p[style-name='Heading6'] => h6.heading-6",
            "p[style-name='Heading7'] => h6.heading-7",
            "p[style-name='Heading8'] => h6.heading-8",
            "p[style-name='List Paragraph'] => p.list-item",
            "p[style-name='ListParagraph'] => p.list-item",
            "p[style-name='Table Paragraph'] => p.table-paragraph",
            "p[style-name='Caption'] => p.caption",
            "p[style-name='Figure'] => p.figure-caption",
            "p[style-name='Quote'] => blockquote.quote",
            "p[style-name='Code'] => pre.code",
            "r[style-name='Strong'] => strong",
            "r[style-name='Bold'] => strong",
            "r[style-name='Emphasis'] => em",
            "r[style-name='Italic'] => em",
            "r[style-name='Underline'] => u",
            "r[style-name='Code'] => code"
        ];
        
        // Create image converter
        const imageConverter = enhancedImageConverter({
            imageDir: imageDir,
            extractImages: options.extractImages !== false
        });
        
        // Initial conversion with mammoth
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: styleMap,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false,
            convertImage: imageConverter.convertImage
        });
        
        console.log(`📄 Phase 1: Initial conversion complete`);
        const stats = {
            paragraphs: (result.value.match(/<p/g) || []).length,
            listItems: (result.value.match(/class="list-item"/g) || []).length,
            images: (result.value.match(/<img /g) || []).length,
            tables: (result.value.match(/<table/g) || []).length,
            headings: (result.value.match(/<h[1-6]/g) || []).length
        };
        console.log(`   📊 Statistics:`)
        console.log(`      • Paragraphs: ${stats.paragraphs}`);
        console.log(`      • List items: ${stats.listItems}`);
        console.log(`      • Images: ${stats.images}`);
        console.log(`      • Tables: ${stats.tables}`);
        console.log(`      • Headings: ${stats.headings}\n`);
        
        // Phase 2: Process hierarchical structures and semantic elements
        console.log('📄 Phase 2: Creating hierarchical structures...');
        const hierarchicalHtml = await processHierarchicalStructure(result.value);
        
        // Phase 3: Enhance images and figures
        console.log('📄 Phase 3: Enhancing images and figures...');
        const enhancedHtml = await enhanceFiguresAndCaptions(hierarchicalHtml);
        
        // Phase 4: Generate final HTML with all styles
        const finalHtml = generateFinalHtml(enhancedHtml);
        
        // Save output
        fs.writeFileSync(outputPath, finalHtml);
        
        // Generate comprehensive report
        const report = generateUltimateReport(result, finalHtml, stats);
        const reportPath = outputPath.replace('.html', '_ultimate_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n✅ Ultimate conversion completed!`);
        console.log(`📄 HTML saved to: ${outputPath}`);
        console.log(`📊 Report saved to: ${reportPath}`);
        
        if (options.extractImages !== false && fs.existsSync(imageDir)) {
            const extractedImages = fs.readdirSync(imageDir).length;
            if (extractedImages > 0) {
                console.log(`🖼️  Images extracted to: ${imageDir} (${extractedImages} files)`);
            }
        }
        
        // Display quality metrics
        console.log('\n📈 Quality Metrics:');
        console.log(`   • Semantic sections: ${report.enhancements.semanticSections.total}`);
        console.log(`   • Hierarchical lists: ${report.enhancements.hierarchicalLists}`);
        console.log(`   • Figures with captions: ${report.enhancements.figuresWithCaptions}`);
        console.log(`   • Alt text coverage: ${report.quality.altTextCoverage}%`);
        console.log(`   • Accessibility score: ${report.quality.accessibilityScore}/100`);
        
        if (result.messages && result.messages.length > 0) {
            console.log(`\n⚠️  Conversion messages (${result.messages.length}):`)
            result.messages.slice(0, 5).forEach(msg => {
                console.log(`   • ${msg.message}`);
            });
            if (result.messages.length > 5) {
                console.log(`   ... and ${result.messages.length - 5} more`);
            }
        }
        
        return { result, finalHtml, report };
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}

async function processHierarchicalStructure(htmlContent) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate(() => {
        const SEMANTIC_TYPES = {
            note: { patterns: ['NOTE−', 'NOTE—', 'NOTE:', 'NOTE '] },
            phraseology: { patterns: ['PHRASEOLOGY−', 'PHRASEOLOGY—', 'PHRASEOLOGY:'] },
            reference: { patterns: ['REFERENCE−', 'REFERENCE—', 'REFERENCE:'] },
            example: { patterns: ['EXAMPLE−', 'EXAMPLE—', 'EXAMPLE:'] },
            exception: { patterns: ['EXCEPTION.', 'EXCEPTION:', 'EXCEPTION—'] }
        };
        
        function detectSemanticType(element) {
            const text = element.textContent.trim().toUpperCase();
            const hasEmphasis = element.innerHTML.includes('<strong>') || element.innerHTML.includes('<em>');
            
            if (!hasEmphasis) return null;
            
            for (const [type, config] of Object.entries(SEMANTIC_TYPES)) {
                for (const pattern of config.patterns) {
                    if (text.startsWith(pattern) || text === pattern.replace(' ', '')) {
                        return type;
                    }
                }
            }
            return null;
        }
        
        // Process sections for hierarchical lists
        const sections = document.querySelectorAll('h6.heading-8');
        let processedLists = 0;
        
        sections.forEach(section => {
            const sectionElements = [];
            let currentElement = section.nextElementSibling;
            
            while (currentElement && !currentElement.matches('h1, h2, h3, h4, h5, h6')) {
                sectionElements.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }
            
            const listItemIndices = [];
            sectionElements.forEach((el, index) => {
                if (el.tagName === 'P' && el.classList.contains('list-item')) {
                    listItemIndices.push(index);
                }
            });
            
            if (listItemIndices.length >= 2) {
                const mainList = document.createElement('ol');
                mainList.className = 'hierarchical-list';
                mainList.style.listStyleType = 'lower-alpha';
                
                for (let i = 0; i < listItemIndices.length; i++) {
                    const startIndex = listItemIndices[i];
                    const endIndex = (i < listItemIndices.length - 1) 
                        ? listItemIndices[i + 1] 
                        : sectionElements.length;
                    
                    const li = document.createElement('li');
                    
                    const listItemElement = sectionElements[startIndex];
                    const mainContent = document.createElement('div');
                    mainContent.className = 'list-item-content';
                    mainContent.innerHTML = listItemElement.innerHTML;
                    li.appendChild(mainContent);
                    
                    // Process nested content
                    for (let j = startIndex + 1; j < endIndex; j++) {
                        const element = sectionElements[j];
                        const semanticType = detectSemanticType(element);
                        
                        if (semanticType) {
                            const wrapper = document.createElement(semanticType === 'note' ? 'aside' : 'div');
                            wrapper.className = `${semanticType}-section`;
                            wrapper.innerHTML = element.innerHTML;
                            li.appendChild(wrapper);
                        } else {
                            const nestedDiv = document.createElement('div');
                            nestedDiv.className = 'nested-paragraph';
                            nestedDiv.innerHTML = element.innerHTML;
                            li.appendChild(nestedDiv);
                        }
                    }
                    
                    mainList.appendChild(li);
                }
                
                const firstElement = sectionElements[listItemIndices[0]];
                firstElement.parentNode.insertBefore(mainList, firstElement);
                
                for (let i = listItemIndices[0]; i < sectionElements.length; i++) {
                    if (sectionElements[i].parentNode) {
                        sectionElements[i].remove();
                    }
                }
                
                processedLists++;
            }
        });
        
        console.log(`   Processed ${processedLists} hierarchical lists`);
        return document.documentElement.outerHTML;
    });
    
    await browser.close();
    return transformedHtml;
}

function generateFinalHtml(content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ultimate Converted Document</title>
    <style>
        :root {
            --primary-color: #3498db;
            --text-color: #333;
            --bg-color: #fff;
            --border-color: #e0e0e0;
            --caption-bg: #f8f9fa;
            --figure-border: #dee2e6;
            --note-bg: #fff9e6;
            --note-border: #ffc107;
            --phraseology-bg: #e8f4f8;
            --phraseology-border: #17a2b8;
            --reference-bg: #f3e5f5;
            --reference-border: #9c27b0;
            --example-bg: #e8f5e9;
            --example-border: #4caf50;
            --exception-bg: #ffebee;
            --exception-border: #f44336;
        }
        
        @media (prefers-color-scheme: dark) {
            :root {
                --text-color: #e0e0e0;
                --bg-color: #1a1a1a;
                --border-color: #404040;
                --caption-bg: #2a2a2a;
                --figure-border: #404040;
                --note-bg: #3d3100;
                --phraseology-bg: #003344;
                --reference-bg: #2d0036;
                --example-bg: #003300;
                --exception-bg: #330000;
            }
        }
        
        * {
            box-sizing: border-box;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; 
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            color: var(--text-color);
            background: var(--bg-color);
        }
        
        /* Typography */
        .document-title { 
            color: var(--primary-color);
            font-size: 2.5em;
            font-weight: 700;
            border-bottom: 3px solid var(--primary-color);
            padding-bottom: 15px; 
            margin: 0 0 30px 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--text-color);
            margin: 24px 0 16px 0;
            line-height: 1.3;
        }
        
        p {
            margin: 12px 0;
            text-align: justify;
        }
        
        /* Hierarchical lists */
        .hierarchical-list {
            list-style-type: lower-alpha;
            padding-left: 30px;
            margin: 16px 0;
        }
        
        .hierarchical-list > li {
            margin: 16px 0;
            line-height: 1.6;
        }
        
        .hierarchical-list > li::marker {
            font-weight: 600;
            color: var(--primary-color);
        }
        
        .list-item-content {
            margin-bottom: 12px;
        }
        
        .nested-paragraph {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        /* Semantic sections */
        .note-section,
        .phraseology-section,
        .reference-section,
        .example-section,
        .exception-section {
            padding: 12px 16px;
            margin: 12px 0 12px 20px;
            border-radius: 4px;
            border-left: 4px solid;
        }
        
        .note-section {
            background: var(--note-bg);
            border-left-color: var(--note-border);
        }
        
        .phraseology-section {
            background: var(--phraseology-bg);
            border-left-color: var(--phraseology-border);
        }
        
        .reference-section {
            background: var(--reference-bg);
            border-left-color: var(--reference-border);
        }
        
        .example-section {
            background: var(--example-bg);
            border-left-color: var(--example-border);
        }
        
        .exception-section {
            background: var(--exception-bg);
            border-left-color: var(--exception-border);
        }
        
        /* Figures and images */
        figure {
            margin: 30px 0;
            padding: 0;
            text-align: center;
            page-break-inside: avoid;
        }
        
        figure img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
            border: 1px solid var(--figure-border);
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        figcaption {
            margin-top: 10px;
            padding: 8px 16px;
            background: var(--caption-bg);
            border-left: 3px solid var(--primary-color);
            text-align: left;
            font-size: 0.9em;
            font-style: italic;
        }
        
        /* Tables */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background: var(--caption-bg);
            font-weight: 600;
        }
        
        /* Media placeholders */
        [class*="-placeholder"] {
            margin: 20px 0;
            border-radius: 8px;
            font-weight: 500;
        }
        
        /* Utility classes */
        .body-text, .normal {
            margin: 16px 0;
            line-height: 1.7;
        }
        
        .heading-8 {
            font-size: 0.9em;
            font-weight: 600;
            color: #7f8c8d;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Print optimization */
        @media print {
            body {
                margin: 0;
                padding: 20px;
                color: #000;
                background: #fff;
            }
            
            figure, .hierarchical-list > li {
                page-break-inside: avoid;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            body {
                padding: 20px 15px;
            }
            
            .document-title {
                font-size: 2em;
            }
            
            .hierarchical-list {
                padding-left: 20px;
            }
            
            .nested-paragraph {
                padding-left: 15px;
            }
            
            figure {
                margin: 20px -15px;
            }
            
            figcaption {
                margin: 10px 15px 0 15px;
            }
        }
        
        /* Accessibility */
        :focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
        }
        
        /* Skip to content link */
        .skip-to-content {
            position: absolute;
            top: -40px;
            left: 0;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            z-index: 100;
        }
        
        .skip-to-content:focus {
            top: 0;
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
            :root {
                --primary-color: #0066cc;
                --text-color: #000;
                --bg-color: #fff;
                --border-color: #000;
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body>
    <a href="#main-content" class="skip-to-content">Skip to main content</a>
    <main id="main-content">
${content}
    </main>
</body>
</html>`;
}

function generateUltimateReport(conversionResult, finalHtml, initialStats) {
    const report = {
        timestamp: new Date().toISOString(),
        document: {
            initialStats,
            finalStats: {
                totalSize: Buffer.byteLength(finalHtml, 'utf8'),
                elements: {
                    paragraphs: (finalHtml.match(/<p/g) || []).length,
                    lists: (finalHtml.match(/<ol|<ul/g) || []).length,
                    images: (finalHtml.match(/<img /g) || []).length,
                    figures: (finalHtml.match(/<figure/g) || []).length,
                    tables: (finalHtml.match(/<table/g) || []).length,
                    headings: (finalHtml.match(/<h[1-6]/g) || []).length
                }
            }
        },
        enhancements: {
            hierarchicalLists: (finalHtml.match(/class="hierarchical-list"/g) || []).length,
            semanticSections: {
                total: 0,
                notes: (finalHtml.match(/class="note-section"/g) || []).length,
                phraseology: (finalHtml.match(/class="phraseology-section"/g) || []).length,
                references: (finalHtml.match(/class="reference-section"/g) || []).length,
                examples: (finalHtml.match(/class="example-section"/g) || []).length,
                exceptions: (finalHtml.match(/class="exception-section"/g) || []).length
            },
            figuresWithCaptions: (finalHtml.match(/<figcaption/g) || []).length,
            imagesWithAlt: (finalHtml.match(/alt="[^"]+"/g) || []).length
        },
        quality: {
            altTextCoverage: 0,
            captionCoverage: 0,
            semanticStructure: 'Ultimate',
            accessibilityScore: 0
        },
        conversionMessages: conversionResult.messages || []
    };
    
    // Calculate totals
    report.enhancements.semanticSections.total = 
        report.enhancements.semanticSections.notes +
        report.enhancements.semanticSections.phraseology +
        report.enhancements.semanticSections.references +
        report.enhancements.semanticSections.examples +
        report.enhancements.semanticSections.exceptions;
    
    // Calculate quality metrics
    if (report.document.finalStats.elements.images > 0) {
        report.quality.altTextCoverage = Math.min(100, Math.round(
            (report.enhancements.imagesWithAlt / report.document.finalStats.elements.images) * 100
        ));
        report.quality.captionCoverage = Math.round(
            (report.enhancements.figuresWithCaptions / report.document.finalStats.elements.images) * 100
        );
    }
    
    // Calculate accessibility score
    let accessibilityScore = 0;
    if (report.quality.altTextCoverage > 80) accessibilityScore += 25;
    if (report.enhancements.hierarchicalLists > 0) accessibilityScore += 25;
    if (report.enhancements.semanticSections.total > 0) accessibilityScore += 25;
    if (finalHtml.includes('aria-labelledby')) accessibilityScore += 15;
    if (finalHtml.includes('loading="lazy"')) accessibilityScore += 10;
    report.quality.accessibilityScore = accessibilityScore;
    
    return report;
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log(`
Ultimate Document Converter for Mammoth.js

USAGE:
  node ultimate-converter.js <input.docx> [output.html] [options]

OPTIONS:
  --extract-images    Extract images to separate files
  --no-extract       Keep images as data URIs
  --image-dir <dir>  Directory for extracted images

FEATURES:
  ✅ Hierarchical list structures with continuous numbering
  ✅ Semantic HTML5 elements for special sections
  ✅ Enhanced image and figure handling with captions
  ✅ Media placeholder generation
  ✅ Full accessibility support (ARIA, alt text)
  ✅ Dark mode support
  ✅ Print optimization
  ✅ Responsive design
  ✅ Comprehensive quality reporting

EXAMPLE:
  node ultimate-converter.js document.docx
  node ultimate-converter.js report.docx output.html --extract-images
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_ultimate.html');
    
    const options = {
        extractImages: !args.includes('--no-extract'),
        imageDir: args.includes('--image-dir') 
            ? args[args.indexOf('--image-dir') + 1]
            : undefined
    };
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    ultimateConvert(inputPath, outputPath, options)
        .then(() => {
            console.log('\n🎯 Ultimate conversion successful!');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { ultimateConvert };