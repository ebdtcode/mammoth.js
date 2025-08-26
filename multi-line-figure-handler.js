#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Multi-line Figure Handler
 * 
 * Handles figures with the structure:
 * - Figure number on separate line (e.g., "FIG 3-7-1")
 * - Figure title on separate line (e.g., "Precision Obstacle Free Zone (POFZ)")
 * - Actual figure/image below
 */

// Configuration for multi-line figure patterns
const MULTILINE_FIGURE_PATTERNS = {
    // Figure number patterns
    figureNumbers: [
        /^FIG\.?\s+(\d+[-–—]\d+[-–—]\d+)$/i,           // FIG 3-7-1, FIG. 3-7-1
        /^FIG\.?\s+(\d+\.\d+\.\d+)$/i,                 // FIG 3.7.1, FIG. 3.7.1
        /^FIGURE\s+(\d+[-–—]\d+[-–—]\d+)$/i,           // FIGURE 3-7-1
        /^FIGURE\s+(\d+\.\d+\.\d+)$/i,                 // FIGURE 3.7.1
        /^Fig\.?\s+(\d+[-–—]\d+[-–—]\d+)$/i,           // Fig 3-7-1, Fig. 3-7-1
        /^Fig\.?\s+(\d+\.\d+\.\d+)$/i,                 // Fig 3.7.1, Fig. 3.7.1
    ],
    
    // Title validation patterns (optional - for validation)
    titlePatterns: [
        /^[A-Z][A-Za-z\s\(\),-]+$/,                    // Capital letter start, words, parentheses
        /^[A-Z][A-Za-z0-9\s\(\),-–—]+$/                // Include numbers and dashes
    ]
};

/**
 * Detect if an element contains a figure number
 */
function detectFigureNumber(element) {
    const text = element.textContent.trim();
    
    for (const pattern of MULTILINE_FIGURE_PATTERNS.figureNumbers) {
        const match = text.match(pattern);
        if (match) {
            return {
                fullText: text,
                number: match[1],
                pattern: pattern.toString()
            };
        }
    }
    
    return null;
}

/**
 * Validate if an element could be a figure title
 */
function couldBeFigureTitle(element) {
    const text = element.textContent.trim();
    
    // Basic validation
    if (!text || text.length < 3 || text.length > 200) {
        return false;
    }
    
    // Check against title patterns
    for (const pattern of MULTILINE_FIGURE_PATTERNS.titlePatterns) {
        if (pattern.test(text)) {
            return true;
        }
    }
    
    // Fallback: if it's not obviously something else
    const isNotTitle = [
        /^\d+\./,                      // Numbered list
        /^[a-z]\./,                    // Lettered list
        /^NOTE[-–—:]?/i,               // NOTE sections
        /^PHRASEOLOGY[-–—:]?/i,        // PHRASEOLOGY sections
        /^REFERENCE[-–—:]?/i,          // REFERENCE sections
        /^EXAMPLE[-–—:]?/i,            // EXAMPLE sections
        /^EXCEPTION[-–—:]?/i,          // EXCEPTION sections
    ].some(pattern => pattern.test(text));
    
    return !isNotTitle;
}

/**
 * Find the next figure element (image, table, or other visual element)
 */
function findNextFigureElement(startElement) {
    let current = startElement.nextElementSibling;
    let searchDepth = 0;
    const maxSearchDepth = 10; // Prevent infinite searching
    
    while (current && searchDepth < maxSearchDepth) {
        // Check if this element contains a figure
        if (current.tagName === 'IMG' || 
            current.querySelector('img') ||
            current.tagName === 'TABLE' ||
            current.querySelector('table') ||
            current.classList.contains('chart-placeholder') ||
            current.classList.contains('media-placeholder') ||
            current.classList.contains('video-placeholder') ||
            current.classList.contains('audio-placeholder')) {
            return current;
        }
        
        // Skip text-only paragraphs and continue searching
        current = current.nextElementSibling;
        searchDepth++;
    }
    
    return null;
}

/**
 * Create a multi-line figure structure
 */
function createMultiLineFigure(figureNumber, titleElement, figureElement, figureCounter) {
    const figure = figureElement.ownerDocument.createElement('figure');
    figure.className = 'multi-line-figure';
    figure.setAttribute('role', 'img');
    figure.setAttribute('aria-labelledby', `multiline-fig-caption-${figureCounter}`);
    
    // Create the caption with number and title
    const figcaption = figureElement.ownerDocument.createElement('figcaption');
    figcaption.id = `multiline-fig-caption-${figureCounter}`;
    figcaption.className = 'multi-line-figure-caption';
    
    // Create figure number element
    const figureNumberEl = figureElement.ownerDocument.createElement('div');
    figureNumberEl.className = 'figure-number';
    figureNumberEl.textContent = figureNumber.fullText;
    
    // Create figure title element  
    const figureTitleEl = figureElement.ownerDocument.createElement('div');
    figureTitleEl.className = 'figure-title';
    figureTitleEl.innerHTML = titleElement.innerHTML;
    
    // Combine number and title in caption
    figcaption.appendChild(figureNumberEl);
    figcaption.appendChild(figureTitleEl);
    
    // Clone the figure element
    const clonedFigure = figureElement.cloneNode(true);
    
    // Structure: Caption at top, then figure
    figure.appendChild(figcaption);
    figure.appendChild(clonedFigure);
    
    return figure;
}

/**
 * Process HTML content to detect and enhance multi-line figures
 */
async function processMultiLineFigures(htmlContent) {
    console.log('🖼️  Processing multi-line figures...');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    
    const transformedHtml = await page.evaluate((patterns) => {
        const FIGURE_PATTERNS = patterns;
        let figureCounter = 0;
        let processedElements = new Set();
        
        // Statistics
        let stats = {
            multiLineFiguresFound: 0,
            figureNumbersDetected: 0,
            titlesMatched: 0,
            figureElementsFound: 0
        };
        
        // Helper functions (need to be redefined in page context)
        function detectFigureNumber(element) {
            const text = element.textContent.trim();
            
            for (const patternStr of FIGURE_PATTERNS.figureNumbers) {
                // Convert pattern string back to RegExp
                const match = patternStr.match(/^\/(.+)\/([gimuy]*)$/);
                if (match) {
                    const pattern = new RegExp(match[1], match[2]);
                    const result = text.match(pattern);
                    if (result) {
                        return {
                            fullText: text,
                            number: result[1],
                            pattern: patternStr
                        };
                    }
                }
            }
            
            return null;
        }
        
        function couldBeFigureTitle(element) {
            const text = element.textContent.trim();
            
            if (!text || text.length < 3 || text.length > 200) {
                return false;
            }
            
            // Check if it's obviously not a title
            const isNotTitle = [
                /^\d+\./,
                /^[a-z]\./,
                /^NOTE[-–—:]?/i,
                /^PHRASEOLOGY[-–—:]?/i,
                /^REFERENCE[-–—:]?/i,
                /^EXAMPLE[-–—:]?/i,
                /^EXCEPTION[-–—:]?/i,
            ].some(pattern => pattern.test(text));
            
            return !isNotTitle;
        }
        
        function findNextFigureElement(startElement) {
            let current = startElement.nextElementSibling;
            let searchDepth = 0;
            const maxSearchDepth = 10;
            
            while (current && searchDepth < maxSearchDepth) {
                if (current.tagName === 'IMG' || 
                    current.querySelector('img') ||
                    current.tagName === 'TABLE' ||
                    current.querySelector('table') ||
                    current.classList.contains('chart-placeholder') ||
                    current.classList.contains('media-placeholder') ||
                    current.classList.contains('video-placeholder') ||
                    current.classList.contains('audio-placeholder')) {
                    return current;
                }
                
                current = current.nextElementSibling;
                searchDepth++;
            }
            
            return null;
        }
        
        // Find all paragraph elements that might contain figure numbers
        const allParagraphs = Array.from(document.querySelectorAll('p'));
        
        allParagraphs.forEach(paragraph => {
            // Skip if already processed
            if (processedElements.has(paragraph)) {
                return;
            }
            
            // Check if this paragraph contains a figure number
            const figureNumber = detectFigureNumber(paragraph);
            if (!figureNumber) {
                return;
            }
            
            stats.figureNumbersDetected++;
            console.log(`Found figure number: ${figureNumber.fullText}`);
            
            // Look for the title in the next paragraph
            const nextElement = paragraph.nextElementSibling;
            if (!nextElement || nextElement.tagName !== 'P') {
                console.log(`No title element found for ${figureNumber.fullText}`);
                return;
            }
            
            // Validate if the next element could be a title
            if (!couldBeFigureTitle(nextElement)) {
                console.log(`Next element is not a valid title for ${figureNumber.fullText}: "${nextElement.textContent.trim()}"`);
                return;
            }
            
            stats.titlesMatched++;
            console.log(`Found title: "${nextElement.textContent.trim()}"`);
            
            // Look for the actual figure element
            const figureElement = findNextFigureElement(nextElement);
            if (!figureElement) {
                console.log(`No figure element found for ${figureNumber.fullText}`);
                return;
            }
            
            stats.figureElementsFound++;
            console.log(`Found figure element: ${figureElement.tagName}`);
            
            // Create the multi-line figure
            figureCounter++;
            const figure = document.createElement('figure');
            figure.className = 'multi-line-figure';
            figure.setAttribute('role', 'img');
            figure.setAttribute('aria-labelledby', `multiline-fig-caption-${figureCounter}`);
            
            // Create the caption
            const figcaption = document.createElement('figcaption');
            figcaption.id = `multiline-fig-caption-${figureCounter}`;
            figcaption.className = 'multi-line-figure-caption';
            
            // Create figure number element
            const figureNumberEl = document.createElement('div');
            figureNumberEl.className = 'figure-number';
            figureNumberEl.textContent = figureNumber.fullText;
            
            // Create figure title element
            const figureTitleEl = document.createElement('div');
            figureTitleEl.className = 'figure-title';
            figureTitleEl.innerHTML = nextElement.innerHTML;
            
            // Combine in caption
            figcaption.appendChild(figureNumberEl);
            figcaption.appendChild(figureTitleEl);
            
            // Clone the figure element
            const clonedFigure = figureElement.cloneNode(true);
            
            // Structure the figure
            figure.appendChild(figcaption);
            figure.appendChild(clonedFigure);
            
            // Replace the original figure number paragraph with the new figure
            paragraph.parentNode.replaceChild(figure, paragraph);
            
            // Mark elements as processed and remove them
            processedElements.add(nextElement);
            processedElements.add(figureElement);
            nextElement.remove();
            figureElement.remove();
            
            stats.multiLineFiguresFound++;
            console.log(`Created multi-line figure ${figureCounter}: ${figureNumber.fullText}`);
        });
        
        // Add statistics as comment
        const statsComment = document.createComment(`
            Multi-line Figure Processing Statistics:
            - Figure numbers detected: ${stats.figureNumbersDetected}
            - Titles matched: ${stats.titlesMatched}
            - Figure elements found: ${stats.figureElementsFound}
            - Multi-line figures created: ${stats.multiLineFiguresFound}
        `);
        document.body.insertBefore(statsComment, document.body.firstChild);
        
        console.log('Multi-line figure processing stats:', stats);
        
        return {
            html: document.documentElement.outerHTML,
            stats: stats
        };
    }, {
        figureNumbers: MULTILINE_FIGURE_PATTERNS.figureNumbers.map(p => p.toString()),
        titlePatterns: MULTILINE_FIGURE_PATTERNS.titlePatterns.map(p => p.toString())
    });
    
    await browser.close();
    
    console.log(`✅ Multi-line figure processing complete`);
    console.log(`   • Figure numbers detected: ${transformedHtml.stats.figureNumbersDetected}`);
    console.log(`   • Titles matched: ${transformedHtml.stats.titlesMatched}`);
    console.log(`   • Figure elements found: ${transformedHtml.stats.figureElementsFound}`);
    console.log(`   • Multi-line figures created: ${transformedHtml.stats.multiLineFiguresFound}`);
    
    return transformedHtml.html;
}

/**
 * Enhanced figure processor that combines both single-line and multi-line detection
 */
async function processAllFigureTypes(htmlContent) {
    console.log('🖼️  Processing all figure types (single-line + multi-line)...');
    
    // First process multi-line figures
    let processedHtml = await processMultiLineFigures(htmlContent);
    
    // Then process any remaining single-line figures using existing logic
    const { enhanceFiguresAndCaptions } = require('./enhanced-image-converter');
    processedHtml = await enhanceFiguresAndCaptions(processedHtml);
    
    return processedHtml;
}

/**
 * Get CSS styles for multi-line figures
 */
function getMultiLineFigureStyles() {
    return `
        /* Multi-line figure styles */
        .multi-line-figure {
            margin: 30px 0;
            padding: 0;
            text-align: center;
            page-break-inside: avoid;
            border: 1px solid var(--figure-border, #dee2e6);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .multi-line-figure-caption {
            background: var(--caption-bg, #f8f9fa);
            border-bottom: 1px solid var(--figure-border, #dee2e6);
            padding: 16px;
            text-align: center;
            margin: 0;
        }
        
        .multi-line-figure .figure-number {
            font-weight: 700;
            font-size: 1.1em;
            color: var(--primary-color, #3498db);
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        
        .multi-line-figure .figure-title {
            font-weight: 600;
            font-size: 1em;
            color: var(--text-color, #333);
            line-height: 1.4;
        }
        
        .multi-line-figure img,
        .multi-line-figure table,
        .multi-line-figure .chart-placeholder,
        .multi-line-figure .media-placeholder {
            max-width: 100%;
            height: auto;
            margin: 0;
            border: none;
            border-radius: 0;
        }
        
        .multi-line-figure table {
            margin: 20px auto;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .multi-line-figure {
                border-color: #404040;
            }
            
            .multi-line-figure-caption {
                background: #2a2a2a;
                border-bottom-color: #404040;
            }
        }
        
        /* Print styles */
        @media print {
            .multi-line-figure {
                page-break-inside: avoid;
                border: 1px solid #000;
            }
            
            .multi-line-figure-caption {
                background: #f5f5f5 !important;
                border-bottom: 1px solid #000;
            }
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
            .multi-line-figure {
                margin: 20px -15px;
            }
            
            .multi-line-figure-caption {
                padding: 12px;
            }
        }
    `;
}

// Test function
async function testMultiLineFigures() {
    const testHtml = `
        <html>
        <body>
            <h1>Test Document</h1>
            <p>Some content before the figure.</p>
            
            <p>FIG 3-7-1</p>
            <p>Precision Obstacle Free Zone (POFZ)</p>
            <img src="data:image/svg+xml;base64,..." alt="POFZ Diagram">
            
            <p>Some content between figures.</p>
            
            <p>FIGURE 2.1.3</p>
            <p>Aircraft Approach Zones and Safety Areas</p>
            <div class="chart-placeholder">Chart showing approach zones</div>
            
            <p>More content after figures.</p>
        </body>
        </html>
    `;
    
    console.log('🧪 Testing multi-line figure detection...\n');
    
    const result = await processMultiLineFigures(testHtml);
    
    // Count results
    const figureCount = (result.match(/<figure[^>]*class="multi-line-figure"/g) || []).length;
    const captionCount = (result.match(/<figcaption[^>]*class="multi-line-figure-caption"/g) || []).length;
    
    console.log(`\n📊 Test Results:`);
    console.log(`   • Multi-line figures created: ${figureCount}`);
    console.log(`   • Captions created: ${captionCount}`);
    
    // Save test result
    const outputPath = '/Users/devos/git/mammoth.js/test-multiline-figures.html';
    const completeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-line Figures Test</title>
    <style>
        ${getMultiLineFigureStyles()}
        
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        
        :root {
            --primary-color: #3498db;
            --text-color: #333;
            --caption-bg: #f8f9fa;
            --figure-border: #dee2e6;
        }
    </style>
</head>
<body>
${result}
</body>
</html>`;
    
    fs.writeFileSync(outputPath, completeHtml);
    console.log(`   • Test output saved: ${outputPath}`);
    
    return figureCount > 0;
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--test') {
        testMultiLineFigures().then(success => {
            if (success) {
                console.log('\n✅ Multi-line figure detection is working correctly!');
            } else {
                console.log('\n❌ Multi-line figure detection failed.');
            }
        });
    } else {
        console.log(`
Multi-line Figure Handler for Mammoth.js

USAGE:
  node multi-line-figure-handler.js --test
  
DESCRIPTION:
  Handles figures with multi-line structure:
  - Figure number on separate line (FIG 3-7-1)
  - Figure title on separate line (Precision Obstacle Free Zone)
  - Actual figure/image below
  
PATTERNS SUPPORTED:
  • FIG 3-7-1, FIG. 3-7-1
  • FIGURE 3-7-1, Fig 3-7-1
  • FIG 3.7.1, FIGURE 3.7.1
  
INTEGRATION:
  Use processMultiLineFigures() or processAllFigureTypes() functions
  to process HTML content with multi-line figure detection.
        `);
    }
}

module.exports = {
    processMultiLineFigures,
    processAllFigureTypes,
    getMultiLineFigureStyles,
    detectFigureNumber,
    couldBeFigureTitle,
    findNextFigureElement,
    MULTILINE_FIGURE_PATTERNS
};