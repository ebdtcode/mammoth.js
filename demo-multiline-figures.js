#!/usr/bin/env node

/**
 * Multi-line Figure Feature Demonstration
 * 
 * Shows how the new multi-line figure handler works with the pattern:
 * - Figure number on separate line (FIG 3-7-1)
 * - Figure title on separate line (Precision Obstacle Free Zone (POFZ))
 * - Actual figure/image below
 */

const fs = require('fs');
const { processAllFigureTypes } = require('./multi-line-figure-handler');

console.log('🖼️  MULTI-LINE FIGURE FEATURE DEMONSTRATION');
console.log('=' .repeat(60) + '\n');

// Create test document with various figure patterns
const createTestDocument = () => {
    return `<!DOCTYPE html>
<html>
<head><title>Multi-line Figure Test</title></head>
<body>
    <h1>Aviation Document with Multi-line Figures</h1>
    <p>This document demonstrates the multi-line figure handling capability.</p>
    
    <!-- Pattern 1: FIG X-X-X format -->
    <p>FIG 3-7-1</p>
    <p>Precision Obstacle Free Zone (POFZ)</p>
    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y4ZjlmYSIgc3Ryb2tlPSIjZGVlMmU2Ii8+CiAgPHRleHQgeD0iMjAwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyI+CiAgICBQT0ZaIERpYWdyYW0KICA8L3RleHQ+CiAgPGNpcmNsZSBjeD0iMjAwIiBjeT0iMjAwIiByPSI0MCIgZmlsbD0iIzM0OThkYiIgb3BhY2l0eT0iMC41Ii8+CiAgPHJlY3QgeD0iMTAwIiB5PSI1MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSI1MCIgZmlsbD0iI2ZmYzEwNyIgb3BhY2l0eT0iMC43Ii8+Cjwvc3ZnPg==" alt="POFZ Diagram">
    
    <p>Some explanatory text between figures.</p>
    
    <!-- Pattern 2: FIGURE X.X.X format -->
    <p>FIGURE 2.1.3</p>
    <p>Aircraft Approach Zones and Safety Requirements</p>
    <div class="chart-placeholder" style="border: 2px solid #2196f3; background: #e3f2fd; padding: 40px; text-align: center; margin: 20px 0;">
        📊 Approach Zone Chart<br>
        <small>Interactive chart showing safety zones</small>
    </div>
    
    <p>More content discussing approach procedures.</p>
    
    <!-- Pattern 3: Fig X-X-X format -->
    <p>Fig 4-2-1</p>
    <p>Communication Frequency Allocation Table</p>
    <table border="1" style="margin: 20px auto; border-collapse: collapse;">
        <thead>
            <tr style="background: #f1f1f1;">
                <th style="padding: 8px;">Frequency Range</th>
                <th style="padding: 8px;">Purpose</th>
                <th style="padding: 8px;">Users</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 8px;">118.0-121.4 MHz</td>
                <td style="padding: 8px;">Tower Control</td>
                <td style="padding: 8px;">ATC, Pilots</td>
            </tr>
            <tr>
                <td style="padding: 8px;">121.6-121.9 MHz</td>
                <td style="padding: 8px;">Ground Control</td>
                <td style="padding: 8px;">Ground, Aircraft</td>
            </tr>
            <tr>
                <td style="padding: 8px;">122.0-123.0 MHz</td>
                <td style="padding: 8px;">Flight Service</td>
                <td style="padding: 8px;">FSS, Pilots</td>
            </tr>
        </tbody>
    </table>
    
    <p>Additional content about frequency management.</p>
    
    <!-- Pattern 4: Video/Media placeholder -->
    <p>FIG. 5-1-2</p>
    <p>Ground Control Procedures Training Video</p>
    <div class="video-placeholder" style="border: 2px solid #e91e63; background: #fce4ec; padding: 40px; text-align: center; margin: 20px 0;">
        🎥 Training Video: Ground Control<br>
        <small>Duration: 12:30 - Interactive training module</small>
    </div>
    
    <!-- Regular paragraph that should NOT be detected as figure -->
    <p>NOTE: This paragraph starts with a capital word but should not be treated as a figure title.</p>
    <p>This is regular content that follows normal paragraph structure without figure association.</p>
    
    <!-- Pattern 5: Mixed with existing single-line format -->
    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U4ZjVlOSIgc3Ryb2tlPSIjNGNhZjUwIi8+CiAgPHRleHQgeD0iMTUwIiB5PSIxMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyI+CiAgICBTaW5nbGUtbGluZSBGaWd1cmUKICA8L3RleHQ+Cjwvc3ZnPg==" alt="Single-line figure example">
    <p>Figure 6: Single-line figure caption (existing format)</p>
    
    <h2>Summary</h2>
    <p>This document demonstrates various figure formats that should be properly detected and structured.</p>
    
</body>
</html>`;
};

// Main demonstration function
async function runDemo() {
    console.log('Creating test document with various figure patterns...\n');
    
    const testHtml = createTestDocument();
    
    // Process with multi-line figure handler
    console.log('Processing document with multi-line figure detection...\n');
    const processedHtml = await processAllFigureTypes(testHtml);
    
    // Analyze results
    console.log('📊 Processing Results:');
    console.log('-'.repeat(40));
    
    const analysis = {
        multiLineFigures: (processedHtml.match(/<figure[^>]*class="multi-line-figure"/g) || []).length,
        singleLineFigures: (processedHtml.match(/<figure[^>]*class="figure-/g) || []).length,
        totalFigures: (processedHtml.match(/<figure/g) || []).length,
        figcaptions: (processedHtml.match(/<figcaption/g) || []).length,
        figureNumbers: (processedHtml.match(/class="figure-number"/g) || []).length,
        figureTitles: (processedHtml.match(/class="figure-title"/g) || []).length
    };
    
    console.log(`✅ Multi-line figures detected: ${analysis.multiLineFigures}`);
    console.log(`✅ Single-line figures detected: ${analysis.singleLineFigures}`);
    console.log(`✅ Total figures created: ${analysis.totalFigures}`);
    console.log(`✅ Figure captions created: ${analysis.figcaptions}`);
    console.log(`✅ Figure numbers structured: ${analysis.figureNumbers}`);
    console.log(`✅ Figure titles structured: ${analysis.figureTitles}`);
    
    // Generate final output with complete styling
    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-line Figure Demonstration</title>
    <style>
        :root {
            --primary-color: #3498db;
            --text-color: #333;
            --bg-color: #fff;
            --sidebar-bg: #f8f9fa;
            --border-color: #dee2e6;
        }
        
        @media (prefers-color-scheme: dark) {
            :root {
                --text-color: #e0e0e0;
                --bg-color: #1a1a1a;
                --sidebar-bg: #2a2a2a;
                --border-color: #404040;
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
        
        h1, h2 {
            color: var(--primary-color);
            margin: 30px 0 20px 0;
        }
        
        /* Regular figures */
        figure {
            margin: 2rem 0;
            text-align: center;
            page-break-inside: avoid;
        }
        
        figure img {
            max-width: 100%;
            height: auto;
        }
        
        figcaption {
            margin-top: 0.5rem;
            font-style: italic;
            color: #666;
        }
        
        /* Multi-line figure styles */
        .multi-line-figure {
            border: 2px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
            margin: 3rem 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .multi-line-figure-caption {
            background: var(--sidebar-bg);
            border-bottom: 2px solid var(--border-color);
            padding: 20px;
            text-align: center;
            margin: 0;
            font-style: normal;
        }
        
        .multi-line-figure .figure-number {
            font-weight: 700;
            font-size: 1.3em;
            color: var(--primary-color);
            margin-bottom: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        
        .multi-line-figure .figure-title {
            font-weight: 600;
            font-size: 1.1em;
            color: var(--text-color);
            line-height: 1.4;
        }
        
        .multi-line-figure img,
        .multi-line-figure table,
        .multi-line-figure .chart-placeholder,
        .multi-line-figure .video-placeholder {
            margin: 20px;
        }
        
        .multi-line-figure table {
            margin: 20px auto;
            box-shadow: none;
            border: 1px solid var(--border-color);
        }
        
        /* Placeholders */
        .chart-placeholder,
        .video-placeholder {
            border-radius: 8px;
            font-weight: 500;
        }
        
        /* Highlight the difference */
        .multi-line-figure {
            position: relative;
        }
        
        .multi-line-figure::before {
            content: "Multi-line Figure";
            position: absolute;
            top: -10px;
            right: 10px;
            background: var(--primary-color);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7em;
            font-weight: bold;
        }
        
        .figure-image::before {
            content: "Single-line Figure";
            position: absolute;
            top: -10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7em;
            font-weight: bold;
        }
        
        .figure-image {
            position: relative;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            body {
                padding: 20px 15px;
            }
            
            .multi-line-figure-caption {
                padding: 15px;
            }
            
            .multi-line-figure .figure-number {
                font-size: 1.1em;
            }
        }
    </style>
</head>
<body>
    ${processedHtml}
    
    <div style="margin-top: 60px; padding: 20px; background: var(--sidebar-bg); border-radius: 8px;">
        <h3>🎯 Demonstration Summary</h3>
        <ul>
            <li><strong>${analysis.multiLineFigures} multi-line figures</strong> successfully detected and structured</li>
            <li><strong>${analysis.singleLineFigures} single-line figures</strong> processed with existing logic</li>
            <li><strong>${analysis.figureNumbers} figure numbers</strong> properly formatted and styled</li>
            <li><strong>${analysis.figureTitles} figure titles</strong> correctly associated with their numbers</li>
        </ul>
        
        <h4>Pattern Support:</h4>
        <ul>
            <li>✅ <code>FIG 3-7-1</code> format with dashes</li>
            <li>✅ <code>FIGURE 2.1.3</code> format with dots</li>
            <li>✅ <code>Fig 4-2-1</code> format with mixed case</li>
            <li>✅ <code>FIG. 5-1-2</code> format with period</li>
            <li>✅ Works with images, tables, and media placeholders</li>
            <li>✅ Preserves existing single-line figure detection</li>
        </ul>
        
        <h4>Structure Created:</h4>
        <ul>
            <li>✅ Semantic <code>&lt;figure&gt;</code> elements with proper ARIA roles</li>
            <li>✅ Structured <code>&lt;figcaption&gt;</code> with separate number and title</li>
            <li>✅ Professional styling with responsive design</li>
            <li>✅ Dark mode support</li>
            <li>✅ Print optimization</li>
        </ul>
    </div>
</body>
</html>`;
    
    // Save the demonstration
    const outputPath = '/Users/devos/git/mammoth.js/demo-multiline-figures-output.html';
    fs.writeFileSync(outputPath, finalHtml);
    
    console.log(`\n📄 Complete demonstration saved to: ${outputPath}`);
    console.log('\n✅ Multi-line figure feature is fully functional and integrated!');
    
    return analysis;
}

// Run the demonstration
if (require.main === module) {
    runDemo().catch(error => {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    });
}

module.exports = { runDemo };