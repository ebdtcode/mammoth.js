#!/usr/bin/env node

const mammoth = require('./lib/index');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

/**
 * Enhanced Image and Figure Converter
 * 
 * Comprehensive handling of images, figures, captions, and media elements
 * with proper semantic HTML5 structure and accessibility features.
 */

// Configuration for figure and caption detection
const FIGURE_PATTERNS = {
    figure: ['Figure', 'Fig.', 'Fig ', 'FIGURE'],
    table: ['Table', 'TABLE'],
    chart: ['Chart', 'CHART', 'Graph', 'GRAPH'],
    diagram: ['Diagram', 'DIAGRAM'],
    illustration: ['Illustration', 'ILLUSTRATION'],
    photo: ['Photo', 'PHOTO', 'Photograph'],
    image: ['Image', 'IMAGE', 'Picture', 'PICTURE']
};

/**
 * Enhanced image converter with caption detection
 */
function enhancedImageConverter(options = {}) {
    const imageDir = options.imageDir || 'images';
    const extractImages = options.extractImages !== false;
    let imageCounter = 0;
    
    return {
        convertImage: mammoth.images.imgElement(function(element) {
            imageCounter++;
            
            if (extractImages && element.readAsBase64String) {
                // Extract image to file
                const imageFileName = `image_${imageCounter}.${element.contentType.split('/')[1]}`;
                const imagePath = path.join(imageDir, imageFileName);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(imageDir)) {
                    fs.mkdirSync(imageDir, { recursive: true });
                }
                
                // Save image
                return element.readAsBase64String().then(function(base64) {
                    const buffer = Buffer.from(base64, 'base64');
                    fs.writeFileSync(imagePath, buffer);
                    
                    return {
                        src: imagePath,
                        'data-original-alt': element.altText || '',
                        loading: 'lazy',
                        decoding: 'async'
                    };
                });
            } else {
                // Use data URI
                return element.readAsBase64String().then(function(base64) {
                    return {
                        src: 'data:' + element.contentType + ';base64,' + base64,
                        'data-original-alt': element.altText || '',
                        loading: 'lazy',
                        decoding: 'async'
                    };
                });
            }
        })
    };
}

/**
 * Process HTML to enhance figures and captions
 */
async function enhanceFiguresAndCaptions(htmlContent) {
    console.log('🖼️  Enhancing figures and captions...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate((patterns) => {
        let figureCount = 0;
        let tableCount = 0;
        let mediaStats = {
            images: 0,
            figures: 0,
            tables: 0,
            charts: 0,
            videos: 0,
            audio: 0,
            embeds: 0
        };
        
        // Helper function to detect caption text
        function isCaptionText(text) {
            if (!text) return false;
            const upperText = text.toUpperCase();
            
            for (const [type, keywords] of Object.entries(patterns)) {
                for (const keyword of keywords) {
                    if (upperText.includes(keyword.toUpperCase()) && 
                        (upperText.match(/\d+/) || upperText.includes(':'))) {
                        return { type, text };
                    }
                }
            }
            return false;
        }
        
        // Helper function to find caption for an image
        function findImageCaption(img) {
            // Check next sibling
            let nextElement = img.nextElementSibling;
            if (nextElement && nextElement.tagName === 'P') {
                const captionInfo = isCaptionText(nextElement.textContent);
                if (captionInfo) {
                    return { element: nextElement, info: captionInfo };
                }
            }
            
            // Check previous sibling
            let prevElement = img.previousElementSibling;
            if (prevElement && prevElement.tagName === 'P') {
                const captionInfo = isCaptionText(prevElement.textContent);
                if (captionInfo) {
                    return { element: prevElement, info: captionInfo, position: 'before' };
                }
            }
            
            // Check parent's next sibling
            if (img.parentElement && img.parentElement.nextElementSibling) {
                const sibling = img.parentElement.nextElementSibling;
                if (sibling.tagName === 'P') {
                    const captionInfo = isCaptionText(sibling.textContent);
                    if (captionInfo) {
                        return { element: sibling, info: captionInfo };
                    }
                }
            }
            
            return null;
        }
        
        // Process all images
        const images = document.querySelectorAll('img');
        images.forEach((img) => {
            mediaStats.images++;
            
            // Skip if already in a figure
            if (img.closest('figure')) {
                return;
            }
            
            const caption = findImageCaption(img);
            
            if (caption) {
                figureCount++;
                mediaStats.figures++;
                
                // Create figure element
                const figure = document.createElement('figure');
                figure.className = `figure-${caption.info.type}`;
                figure.setAttribute('role', 'img');
                figure.setAttribute('aria-labelledby', `fig-caption-${figureCount}`);
                
                // Clone and enhance image
                const enhancedImg = img.cloneNode(true);
                if (!enhancedImg.getAttribute('alt') && caption.info.text) {
                    enhancedImg.setAttribute('alt', caption.info.text);
                }
                
                // Create figcaption
                const figcaption = document.createElement('figcaption');
                figcaption.id = `fig-caption-${figureCount}`;
                figcaption.innerHTML = caption.element.innerHTML;
                figcaption.className = 'figure-caption';
                
                // Structure the figure
                if (caption.position === 'before') {
                    figure.appendChild(figcaption);
                    figure.appendChild(enhancedImg);
                } else {
                    figure.appendChild(enhancedImg);
                    figure.appendChild(figcaption);
                }
                
                // Replace original image with figure
                img.parentNode.replaceChild(figure, img);
                
                // Remove the caption paragraph
                caption.element.remove();
                
            } else {
                // Wrap standalone images in figure for consistency
                const figure = document.createElement('figure');
                figure.className = 'figure-image';
                figure.setAttribute('role', 'img');
                
                const enhancedImg = img.cloneNode(true);
                if (!enhancedImg.getAttribute('alt')) {
                    enhancedImg.setAttribute('alt', 'Image');
                }
                
                figure.appendChild(enhancedImg);
                img.parentNode.replaceChild(figure, img);
            }
        });
        
        // Process tables with captions
        const tables = document.querySelectorAll('table');
        tables.forEach((table) => {
            mediaStats.tables++;
            
            // Skip if already in a figure
            if (table.closest('figure')) {
                return;
            }
            
            // Look for table caption
            let captionElement = null;
            let captionText = '';
            
            // Check previous sibling for caption
            const prevElement = table.previousElementSibling;
            if (prevElement && prevElement.tagName === 'P') {
                const text = prevElement.textContent;
                if (text && text.toUpperCase().includes('TABLE')) {
                    captionElement = prevElement;
                    captionText = text;
                }
            }
            
            if (captionElement) {
                tableCount++;
                
                // Create figure for table
                const figure = document.createElement('figure');
                figure.className = 'figure-table';
                figure.setAttribute('role', 'table');
                figure.setAttribute('aria-labelledby', `table-caption-${tableCount}`);
                
                // Create figcaption
                const figcaption = document.createElement('figcaption');
                figcaption.id = `table-caption-${tableCount}`;
                figcaption.innerHTML = captionElement.innerHTML;
                figcaption.className = 'table-caption';
                
                // Clone table
                const tableClone = table.cloneNode(true);
                
                // Structure the figure
                figure.appendChild(figcaption);
                figure.appendChild(tableClone);
                
                // Replace original table
                table.parentNode.replaceChild(figure, table);
                
                // Remove caption paragraph
                captionElement.remove();
            }
        });
        
        // Process media placeholders
        document.querySelectorAll('.media-placeholder').forEach(() => mediaStats.embeds++);
        document.querySelectorAll('.video-placeholder').forEach(() => mediaStats.videos++);
        document.querySelectorAll('.audio-placeholder').forEach(() => mediaStats.audio++);
        document.querySelectorAll('.chart-placeholder').forEach(() => mediaStats.charts++);
        
        // Add media statistics to page
        const statsComment = document.createComment(`
            Media Statistics:
            - Images: ${mediaStats.images}
            - Figures with captions: ${mediaStats.figures}
            - Tables: ${mediaStats.tables}
            - Charts: ${mediaStats.charts}
            - Videos: ${mediaStats.videos}
            - Audio: ${mediaStats.audio}
            - Embedded objects: ${mediaStats.embeds}
        `);
        document.body.insertBefore(statsComment, document.body.firstChild);
        
        console.log('Media Statistics:', mediaStats);
        
        return document.documentElement.outerHTML;
        
    }, FIGURE_PATTERNS);
    
    await browser.close();
    
    console.log('✅ Figure and caption enhancement complete');
    return transformedHtml;
}

/**
 * Main converter function with enhanced image handling
 */
async function convertWithEnhancedImages(inputPath, outputPath, options = {}) {
    try {
        console.log(`🚀 Converting with enhanced image handling: ${inputPath}\n`);
        
        // Prepare image directory
        const imageDir = options.imageDir || path.join(path.dirname(outputPath), 'images');
        
        // Style map
        const styleMap = [
            "p[style-name='Title'] => h1.document-title:fresh",
            "p[style-name='Body Text'] => p.body-text",
            "p[style-name='BodyText'] => p.body-text",
            "p[style-name='heading 8'] => h6.heading-8",
            "p[style-name='Heading8'] => h6.heading-8",
            "p[style-name='Table Paragraph'] => p.table-paragraph",
            "p[style-name='List Paragraph'] => p.list-item",
            "p[style-name='Caption'] => p.caption",
            "p[style-name='Figure'] => p.figure-caption",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
        ];
        
        // Create image converter
        const imageConverter = enhancedImageConverter({
            imageDir: imageDir,
            extractImages: options.extractImages !== false
        });
        
        // Convert with mammoth
        const result = await mammoth.convertToHtml({
            path: inputPath
        }, {
            styleMap: styleMap,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false,
            convertImage: imageConverter.convertImage
        });
        
        console.log(`📄 Initial conversion complete`);
        
        // Count media elements
        const imageCount = (result.value.match(/<img /g) || []).length;
        const tableCount = (result.value.match(/<table/g) || []).length;
        console.log(`   Found ${imageCount} images`);
        console.log(`   Found ${tableCount} tables`);
        
        // Enhance figures and captions
        const enhancedContent = await enhanceFiguresAndCaptions(result.value);
        
        // Create final HTML with comprehensive styling
        const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Document with Images</title>
    <style>
        :root {
            --primary-color: #3498db;
            --text-color: #333;
            --bg-color: #fff;
            --border-color: #e0e0e0;
            --caption-bg: #f8f9fa;
            --figure-border: #dee2e6;
        }
        
        @media (prefers-color-scheme: dark) {
            :root {
                --text-color: #e0e0e0;
                --bg-color: #1a1a1a;
                --border-color: #404040;
                --caption-bg: #2a2a2a;
                --figure-border: #404040;
            }
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            color: var(--text-color);
            background: var(--bg-color);
        }
        
        /* Figure and image styles */
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
            color: var(--text-color);
        }
        
        .figure-caption {
            font-weight: 500;
        }
        
        .table-caption {
            margin-bottom: 10px;
            margin-top: 0;
            font-weight: 600;
            text-align: center;
            background: transparent;
            border-left: none;
            font-style: normal;
        }
        
        /* Table in figure */
        figure.figure-table {
            overflow-x: auto;
        }
        
        figure.figure-table table {
            margin: 0 auto;
            border-collapse: collapse;
            width: 100%;
        }
        
        figure.figure-table th,
        figure.figure-table td {
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            text-align: left;
        }
        
        figure.figure-table th {
            background: var(--caption-bg);
            font-weight: 600;
        }
        
        /* Different figure types */
        .figure-chart img,
        .figure-diagram img {
            background: white;
            padding: 10px;
        }
        
        .figure-photo img {
            border-radius: 8px;
        }
        
        /* Inline images without captions */
        .figure-image {
            margin: 20px 0;
        }
        
        .figure-image img {
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        
        /* Media placeholders */
        .media-placeholder,
        .video-placeholder,
        .audio-placeholder,
        .chart-placeholder,
        .ole-placeholder,
        .spreadsheet-placeholder,
        .presentation-placeholder {
            margin: 20px 0;
            border-radius: 8px;
            font-weight: 500;
        }
        
        /* Image loading states */
        img[loading="lazy"] {
            background: var(--caption-bg);
            min-height: 100px;
        }
        
        /* Accessibility */
        figure[role="img"]:focus,
        figure[role="table"]:focus {
            outline: 2px solid var(--primary-color);
            outline-offset: 4px;
        }
        
        /* Document structure */
        .document-title { 
            color: var(--primary-color);
            font-size: 2.2em;
            font-weight: 700;
            border-bottom: 3px solid var(--primary-color);
            padding-bottom: 15px; 
            margin: 0 0 30px 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--text-color);
            margin: 24px 0 16px 0;
        }
        
        p {
            margin: 12px 0;
            text-align: justify;
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
        
        /* Print styles */
        @media print {
            figure {
                page-break-inside: avoid;
            }
            
            figcaption {
                page-break-before: avoid;
            }
            
            img {
                max-width: 100% !important;
                page-break-inside: avoid;
            }
        }
        
        /* Responsive images */
        @media (max-width: 768px) {
            figure {
                margin: 20px -15px;
            }
            
            figcaption {
                margin: 10px 15px 0 15px;
            }
        }
        
        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            figure img {
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
            }
        }
    </style>
</head>
<body>
${enhancedContent}
</body>
</html>`;
        
        fs.writeFileSync(outputPath, finalHtml);
        
        console.log(`\n✅ Enhanced image conversion completed!`);
        console.log(`📄 HTML saved to: ${outputPath}`);
        
        if (options.extractImages !== false) {
            const extractedImages = fs.readdirSync(imageDir).length;
            console.log(`🖼️  Images extracted to: ${imageDir} (${extractedImages} files)`);
        }
        
        // Generate report
        const report = generateImageReport(result, enhancedContent, imageDir);
        const reportPath = outputPath.replace('.html', '_image_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Image report saved to: ${reportPath}`);
        
        if (result.messages && result.messages.length > 0) {
            console.log(`\n📋 Conversion messages (${result.messages.length}):`)
            result.messages.forEach(msg => {
                console.log(`   • ${msg.message}`);
            });
        }
        
        return { result, finalHtml, report };
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        throw error;
    }
}

/**
 * Generate comprehensive image handling report
 */
function generateImageReport(conversionResult, enhancedHtml, imageDir) {
    const report = {
        timestamp: new Date().toISOString(),
        statistics: {
            images: {
                total: (enhancedHtml.match(/<img /g) || []).length,
                withAltText: (enhancedHtml.match(/alt="[^"]+"/g) || []).length,
                inFigures: (enhancedHtml.match(/<figure[^>]*>[\s\S]*?<img/g) || []).length,
                withCaptions: (enhancedHtml.match(/<figcaption/g) || []).length
            },
            figures: {
                total: (enhancedHtml.match(/<figure/g) || []).length,
                images: (enhancedHtml.match(/class="figure-image"/g) || []).length,
                photos: (enhancedHtml.match(/class="figure-photo"/g) || []).length,
                charts: (enhancedHtml.match(/class="figure-chart"/g) || []).length,
                diagrams: (enhancedHtml.match(/class="figure-diagram"/g) || []).length,
                tables: (enhancedHtml.match(/class="figure-table"/g) || []).length
            },
            media: {
                videos: (enhancedHtml.match(/video-placeholder/g) || []).length,
                audio: (enhancedHtml.match(/audio-placeholder/g) || []).length,
                embeds: (enhancedHtml.match(/embed-placeholder/g) || []).length,
                charts: (enhancedHtml.match(/chart-placeholder/g) || []).length
            },
            tables: {
                total: (enhancedHtml.match(/<table/g) || []).length,
                inFigures: (enhancedHtml.match(/<figure[^>]*>[\s\S]*?<table/g) || []).length
            }
        },
        extraction: {
            enabled: imageDir ? true : false,
            directory: imageDir,
            extractedFiles: imageDir && fs.existsSync(imageDir) ? fs.readdirSync(imageDir).length : 0
        },
        accessibility: {
            imagesWithAlt: 0,
            imagesWithoutAlt: 0,
            figuresWithAriaLabel: (enhancedHtml.match(/aria-labelledby=/g) || []).length,
            lazyLoading: (enhancedHtml.match(/loading="lazy"/g) || []).length
        },
        conversionMessages: conversionResult.messages || []
    };
    
    // Calculate accessibility metrics
    report.accessibility.imagesWithAlt = report.statistics.images.withAltText;
    report.accessibility.imagesWithoutAlt = report.statistics.images.total - report.statistics.images.withAltText;
    
    // Add quality metrics
    report.quality = {
        captionCoverage: report.statistics.images.total > 0 
            ? Math.round((report.statistics.images.withCaptions / report.statistics.images.total) * 100) 
            : 0,
        altTextCoverage: report.statistics.images.total > 0
            ? Math.round((report.statistics.images.withAltText / report.statistics.images.total) * 100)
            : 0,
        semanticStructure: report.statistics.figures.total > 0 ? 'Enhanced' : 'Basic'
    };
    
    return report;
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log(`
Enhanced Image and Figure Converter for Mammoth.js

USAGE:
  node enhanced-image-converter.js <input.docx> [output.html] [options]

OPTIONS:
  --extract-images    Extract images to separate files (default: true)
  --no-extract       Keep images as data URIs
  --image-dir <dir>  Directory for extracted images (default: ./images)

FEATURES:
  • Automatic figure and caption detection
  • Semantic HTML5 <figure> and <figcaption> elements
  • Image extraction to separate files
  • Alt text preservation and enhancement
  • Table caption handling
  • Media placeholder generation
  • Lazy loading and async decoding
  • Accessibility attributes (ARIA)
  • Comprehensive image report generation

FIGURE DETECTION:
  Automatically detects and wraps:
  • Images with captions (Figure X, Table X, etc.)
  • Tables with titles
  • Charts and diagrams
  • Photographs with descriptions

OUTPUT:
  • Enhanced HTML with proper semantic structure
  • Extracted image files (optional)
  • JSON report with statistics and metrics

EXAMPLE:
  node enhanced-image-converter.js document.docx output.html --extract-images
  node enhanced-image-converter.js report.docx --no-extract
        `.trim());
        process.exit(0);
    }
    
    const inputPath = args[0];
    const outputPath = args[1] || inputPath.replace(/\.docx$/i, '_enhanced_images.html');
    
    // Parse options
    const options = {
        extractImages: !args.includes('--no-extract'),
        imageDir: args.includes('--image-dir') 
            ? args[args.indexOf('--image-dir') + 1]
            : path.join(path.dirname(outputPath), 'images')
    };
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        process.exit(1);
    }
    
    convertWithEnhancedImages(inputPath, outputPath, options)
        .then(({ report }) => {
            console.log('\n📊 CONVERSION SUMMARY:');
            console.log(`   • Total images: ${report.statistics.images.total}`);
            console.log(`   • Images with captions: ${report.statistics.images.withCaptions}`);
            console.log(`   • Figures created: ${report.statistics.figures.total}`);
            console.log(`   • Alt text coverage: ${report.quality.altTextCoverage}%`);
            console.log(`   • Caption coverage: ${report.quality.captionCoverage}%`);
            console.log('\n🎯 Success! Document converted with enhanced image handling.');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { 
    convertWithEnhancedImages, 
    enhanceFiguresAndCaptions,
    enhancedImageConverter,
    generateImageReport 
};