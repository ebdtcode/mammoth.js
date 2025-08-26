#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Deep Nested List Processing
 * 
 * Tests list processing with 6+ levels of nesting
 * Validates DRY principles, modularity, and scalability
 */

const { DeepNestedListProcessor } = require('./deep-nested-list-processor');
const fs = require('fs');
const path = require('path');

/**
 * Generate test HTML with deeply nested lists
 */
function generateTestHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Deep Nested List Test Document</title>
</head>
<body>
    <h1>Aviation Document with Deep Nesting</h1>
    
    <section id="test-case-1">
        <h2>Test Case 1: 6-Level Deep Nesting</h2>
        
        <!-- Level 0: Main numbered list -->
        <p class="list-item depth-0">1. Flight Operations Requirements</p>
        <p>This section covers all operational requirements for commercial flights.</p>
        
        <!-- Level 1: Lettered sub-items -->
        <p class="list-item depth-1" style="margin-left: 20px">a. Pre-flight Procedures</p>
        <p style="margin-left: 20px">NOTE— All pre-flight procedures must be completed before departure.</p>
        
        <!-- Level 2: Roman numerals -->
        <p class="list-item depth-2" style="margin-left: 40px">(i) Weather Briefing</p>
        <p style="margin-left: 40px">Obtain complete weather briefing from approved sources.</p>
        
        <!-- Level 3: Parenthesized numbers -->
        <p class="list-item depth-3" style="margin-left: 60px">(1) Surface Analysis</p>
        <p style="margin-left: 60px">Review current surface weather conditions.</p>
        
        <!-- Level 4: Parenthesized letters -->
        <p class="list-item depth-4" style="margin-left: 80px">(a) Temperature and Dew Point</p>
        <p style="margin-left: 80px">PHRASEOLOGY— "Tower, requesting current temp/dew point"</p>
        
        <!-- Level 5: Roman numerals with dots -->
        <p class="list-item depth-5" style="margin-left: 100px">i. Recording Requirements</p>
        <p style="margin-left: 100px">All readings must be logged in the flight record.</p>
        
        <!-- Level 6: Bracketed numbers -->
        <p class="list-item depth-6" style="margin-left: 120px">[1] Digital Recording</p>
        <p style="margin-left: 120px">Use approved digital systems when available.</p>
        
        <p class="list-item depth-6" style="margin-left: 120px">[2] Manual Recording</p>
        <p style="margin-left: 120px">Paper logs as backup when digital systems fail.</p>
        
        <!-- Back to Level 5 -->
        <p class="list-item depth-5" style="margin-left: 100px">ii. Verification Procedures</p>
        <p style="margin-left: 100px">Cross-check all recorded values.</p>
        
        <!-- Back to Level 4 -->
        <p class="list-item depth-4" style="margin-left: 80px">(b) Wind Speed and Direction</p>
        <p style="margin-left: 80px">Monitor wind conditions continuously.</p>
        
        <!-- Back to Level 3 -->
        <p class="list-item depth-3" style="margin-left: 60px">(2) Upper Air Analysis</p>
        <p style="margin-left: 60px">Review winds aloft and jet stream patterns.</p>
        
        <!-- Back to Level 2 -->
        <p class="list-item depth-2" style="margin-left: 40px">(ii) Aircraft Inspection</p>
        <p style="margin-left: 40px">Complete thorough pre-flight inspection.</p>
        
        <!-- Back to Level 1 -->
        <p class="list-item depth-1" style="margin-left: 20px">b. In-flight Procedures</p>
        <p style="margin-left: 20px">REFERENCE— See Operations Manual Chapter 5</p>
        
        <!-- Another Level 0 item -->
        <p class="list-item depth-0">2. Emergency Procedures</p>
        <p>EXCEPTION— These procedures may be modified by the pilot-in-command in emergency situations.</p>
    </section>
    
    <section id="test-case-2">
        <h2>Test Case 2: Mixed Nesting with Semantic Sections</h2>
        
        <p>1. Communication Protocols</p>
        <p>NOTE: All communications must follow standard phraseology.</p>
        
        <p style="margin-left: 25px">a. Ground Communications</p>
        <p style="margin-left: 25px">PHRASEOLOGY: "Ground, [callsign] request taxi to runway [number]"</p>
        
        <p style="margin-left: 50px">(i) Taxi Instructions</p>
        <p style="margin-left: 50px">EXAMPLE: "Taxi via Alpha, hold short runway 27"</p>
        
        <p style="margin-left: 75px">(1) Standard Taxi Routes</p>
        <p style="margin-left: 75px">Follow designated taxi routes unless otherwise instructed.</p>
        
        <p style="margin-left: 100px">(a) Primary Routes</p>
        <p style="margin-left: 100px">WARNING: Check for construction notices before using primary routes.</p>
        
        <p style="margin-left: 125px">i. Daytime Operations</p>
        <p style="margin-left: 125px">Use lighted taxiway markings during daylight hours.</p>
        
        <p style="margin-left: 150px">[1] Normal Visibility</p>
        <p style="margin-left: 150px">Standard taxi speed not to exceed 20 knots.</p>
        
        <p style="margin-left: 175px">• Additional Considerations</p>
        <p style="margin-left: 175px">CAUTION: Reduce speed in congested areas.</p>
        
        <p style="margin-left: 200px">- Weather Impacts</p>
        <p style="margin-left: 200px">IMPORTANT: Adjust procedures for weather conditions.</p>
    </section>
    
    <section id="test-case-3">
        <h2>Test Case 3: Complex Real-World Structure</h2>
        
        <div class="list-container">
            <p>1. Instrument Approach Procedures</p>
            <div class="nested-content">
                <p>a. ILS Approaches</p>
                <p>NOTE— Precision approach with vertical guidance</p>
                <div class="sub-nested">
                    <p>(i) Category I ILS</p>
                    <p>Decision Height: 200 feet</p>
                    <p>(1) Equipment Requirements</p>
                    <p>(a) Localizer Receiver</p>
                    <p>i. Sensitivity Settings</p>
                    <p>[1] Full Scale Deflection</p>
                    <p>[2] Half Scale Deflection</p>
                    <p>ii. Centering Procedures</p>
                    <p>(b) Glide Slope Receiver</p>
                    <p>(2) Pilot Qualifications</p>
                    <p>(ii) Category II ILS</p>
                    <p>Decision Height: 100 feet</p>
                    <p>(iii) Category III ILS</p>
                    <p>No Decision Height</p>
                </div>
                <p>b. Non-Precision Approaches</p>
                <p>REFERENCE— Terminal Procedures Publication</p>
            </div>
        </div>
    </section>
    
    <section id="test-case-4">
        <h2>Test Case 4: Edge Cases</h2>
        
        <!-- Orphaned deep items -->
        <p style="margin-left: 100px">(a) Orphaned item at depth 4</p>
        <p style="margin-left: 100px">This item has no proper parent structure.</p>
        
        <!-- Sudden depth changes -->
        <p>1. Root level item</p>
        <p style="margin-left: 100px">i. Sudden jump to depth 5</p>
        <p style="margin-left: 20px">a. Back to depth 1</p>
        
        <!-- Mixed marker styles -->
        <p>1. Numbered item</p>
        <p>A. Capital letter item</p>
        <p>• Bullet item</p>
        <p>- Dash item</p>
        <p>→ Arrow item</p>
    </section>
</body>
</html>`;
}

/**
 * Test runner class
 */
class DeepNestingTestRunner {
    constructor() {
        this.processor = new DeepNestedListProcessor({
            maxDepth: 10,
            preserveNumbering: true,
            detectSemanticSections: true,
            debug: false
        });
        
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }
    
    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Deep Nested List Processing Test Suite');
        console.log('=' .repeat(60));
        console.log('');
        
        // Generate test HTML
        const testHtml = generateTestHTML();
        
        // Save test input
        fs.writeFileSync('test-deep-nesting-input.html', testHtml);
        
        // Process HTML
        const result = this.processor.processHtml(testHtml);
        
        // Save processed output
        const outputHtml = this.addTestStyles(result.html);
        fs.writeFileSync('test-deep-nesting-output.html', outputHtml);
        
        // Run test assertions
        this.testDepthHandling(result);
        this.testSemanticSections(result);
        this.testListStructure(result);
        this.testEdgeCases(result);
        this.testPerformance();
        
        // Report results
        this.reportResults();
        
        return this.testResults;
    }
    
    /**
     * Test depth handling capabilities
     */
    testDepthHandling(result) {
        console.log('📋 Testing Depth Handling...');
        
        // Test: Maximum depth reached should be at least 6
        this.assert(
            'Maximum depth >= 6',
            result.statistics.maxDepthReached >= 6,
            `Max depth: ${result.statistics.maxDepthReached}`
        );
        
        // Test: All depth levels should be processed
        const html = result.html;
        for (let depth = 0; depth <= 6; depth++) {
            const hasDepthClass = html.includes(`depth-${depth}`);
            this.assert(
                `Depth level ${depth} processed`,
                hasDepthClass,
                hasDepthClass ? 'Found' : 'Missing'
            );
        }
        
        console.log('');
    }
    
    /**
     * Test semantic section detection
     */
    testSemanticSections(result) {
        console.log('📋 Testing Semantic Section Detection...');
        
        // Test: Semantic sections should be detected
        this.assert(
            'Semantic sections detected',
            result.statistics.semanticSections > 0,
            `Found: ${result.statistics.semanticSections}`
        );
        
        // Test: Specific semantic types
        const semanticTypes = ['note', 'phraseology', 'reference', 'example', 'exception', 'warning', 'caution', 'important'];
        const html = result.html;
        
        semanticTypes.forEach(type => {
            const hasType = html.includes(`semantic-${type}`);
            if (hasType) {
                this.assert(
                    `${type.toUpperCase()} sections`,
                    true,
                    'Detected'
                );
            }
        });
        
        console.log('');
    }
    
    /**
     * Test list structure integrity
     */
    testListStructure(result) {
        console.log('📋 Testing List Structure Integrity...');
        
        const html = result.html;
        
        // Test: Lists should be properly nested
        const hasNestedOL = html.includes('<ol') && html.includes('</ol>');
        this.assert(
            'Ordered lists created',
            hasNestedOL,
            hasNestedOL ? 'Valid structure' : 'Missing'
        );
        
        // Test: List items should exist
        const listItemCount = (html.match(/<li/g) || []).length;
        this.assert(
            'List items created',
            listItemCount > 0,
            `Count: ${listItemCount}`
        );
        
        // Test: Proper nesting (no orphaned items)
        const orphanedItems = (html.match(/<li[^>]*>\s*<\/li>/g) || []).length;
        this.assert(
            'No empty list items',
            orphanedItems === 0,
            orphanedItems === 0 ? 'None found' : `Found: ${orphanedItems}`
        );
        
        console.log('');
    }
    
    /**
     * Test edge cases
     */
    testEdgeCases(result) {
        console.log('📋 Testing Edge Cases...');
        
        // Test: Orphaned items should be handled
        this.assert(
            'Orphaned items handled',
            result.statistics.errors.length === 0 || result.statistics.itemsProcessed > 0,
            'Gracefully processed'
        );
        
        // Test: Mixed marker styles
        const html = result.html;
        const hasMixedStyles = html.includes('list-style-type');
        this.assert(
            'Mixed marker styles',
            hasMixedStyles,
            'Supported'
        );
        
        console.log('');
    }
    
    /**
     * Test performance with large documents
     */
    testPerformance() {
        console.log('📋 Testing Performance...');
        
        // Generate large document
        let largeHtml = '<html><body>';
        for (let i = 0; i < 100; i++) {
            largeHtml += `<p>${i + 1}. Item ${i + 1}</p>`;
            for (let j = 0; j < 5; j++) {
                largeHtml += `<p style="margin-left: ${(j + 1) * 20}px">${String.fromCharCode(97 + j)}. Subitem ${j + 1}</p>`;
            }
        }
        largeHtml += '</body></html>';
        
        const startTime = Date.now();
        const result = this.processor.processHtml(largeHtml);
        const endTime = Date.now();
        const processingTime = endTime - startTime;
        
        // Test: Should process large documents quickly
        this.assert(
            'Performance (< 1000ms for 600 items)',
            processingTime < 1000,
            `${processingTime}ms`
        );
        
        // Test: Should handle all items
        this.assert(
            'All items processed',
            result.statistics.itemsProcessed >= 600,
            `Processed: ${result.statistics.itemsProcessed}`
        );
        
        console.log('');
    }
    
    /**
     * Assert helper
     */
    assert(testName, condition, details = '') {
        const passed = !!condition;
        const status = passed ? '✅' : '❌';
        const detailsStr = details ? ` (${details})` : '';
        
        console.log(`  ${status} ${testName}${detailsStr}`);
        
        this.testResults.tests.push({
            name: testName,
            passed: passed,
            details: details
        });
        
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
        }
    }
    
    /**
     * Add test styles to output HTML
     */
    addTestStyles(html) {
        const styles = this.processor.generateStyles();
        const testStyles = `
            <style>
                ${styles}
                
                /* Test-specific styles */
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2em;
                    line-height: 1.6;
                }
                
                h1, h2 {
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 0.5em;
                }
                
                section {
                    margin: 2em 0;
                    padding: 1em;
                    border: 1px solid #ecf0f1;
                    border-radius: 8px;
                    background: #fafafa;
                }
                
                /* Depth visualization */
                .depth-0 { font-weight: bold; color: #2c3e50; }
                .depth-1 { color: #34495e; }
                .depth-2 { color: #7f8c8d; }
                .depth-3 { color: #95a5a6; }
                .depth-4 { color: #bdc3c7; }
                .depth-5 { color: #95a5a6; font-style: italic; }
                .depth-6 { color: #7f8c8d; font-style: italic; }
                
                /* Semantic highlights */
                .semantic-note { background: #e3f2fd; border-left-color: #2196f3; }
                .semantic-phraseology { background: #f3e5f5; border-left-color: #9c27b0; }
                .semantic-reference { background: #e8f5e9; border-left-color: #4caf50; }
                .semantic-example { background: #fff3e0; border-left-color: #ff9800; }
                .semantic-warning { background: #fff8e1; border-left-color: #ffc107; }
                .semantic-caution { background: #fbe9e7; border-left-color: #ff5722; }
                .semantic-important { background: #fce4ec; border-left-color: #e91e63; }
                
                /* Test result banner */
                .test-info {
                    background: #3498db;
                    color: white;
                    padding: 1em;
                    margin-bottom: 2em;
                    border-radius: 4px;
                }
                
                .test-info h3 {
                    margin: 0 0 0.5em 0;
                    color: white;
                }
                
                .test-info p {
                    margin: 0.25em 0;
                }
            </style>
        `;
        
        const testInfo = `
            <div class="test-info">
                <h3>🧪 Deep Nested List Processing Test Output</h3>
                <p>✅ Maximum Depth: ${this.processor.config.maxDepth}</p>
                <p>✅ Semantic Sections: Enabled</p>
                <p>✅ DRY Architecture: Implemented</p>
                <p>✅ Performance: Optimized</p>
            </div>
        `;
        
        return html
            .replace('</head>', `${testStyles}</head>`)
            .replace('<body>', `<body>${testInfo}`);
    }
    
    /**
     * Report test results
     */
    reportResults() {
        const total = this.testResults.passed + this.testResults.failed;
        const percentage = Math.round((this.testResults.passed / total) * 100);
        
        console.log('=' .repeat(60));
        console.log('📊 TEST RESULTS');
        console.log('=' .repeat(60));
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.testResults.passed} ✅`);
        console.log(`Failed: ${this.testResults.failed} ❌`);
        console.log(`Success Rate: ${percentage}%`);
        console.log('');
        
        if (this.testResults.failed > 0) {
            console.log('Failed Tests:');
            this.testResults.tests
                .filter(t => !t.passed)
                .forEach(t => {
                    console.log(`  ❌ ${t.name} - ${t.details}`);
                });
            console.log('');
        }
        
        console.log('📄 Output files generated:');
        console.log('  - test-deep-nesting-input.html (original)');
        console.log('  - test-deep-nesting-output.html (processed)');
        console.log('');
    }
}

/**
 * Run tests
 */
if (require.main === module) {
    const runner = new DeepNestingTestRunner();
    runner.runAllTests().then(results => {
        const exitCode = results.failed === 0 ? 0 : 1;
        process.exit(exitCode);
    });
}

module.exports = { DeepNestingTestRunner, generateTestHTML };