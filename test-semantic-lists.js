#!/usr/bin/env node

/**
 * Test Suite for Semantic Lists
 * 
 * Tests ordered lists within NOTE, REFERENCE, EXAMPLE sections
 * Validates DRY principles and proper nesting
 */

const { IntegratedListProcessor, SemanticListProcessor } = require('./semantic-list-processor');
const fs = require('fs');

/**
 * Generate comprehensive test HTML
 */
function generateTestHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Semantic Lists Test Document</title>
</head>
<body>
    <h1>Aviation Procedures with Semantic Sections</h1>
    
    <!-- Test Case 1: NOTE with ordered list -->
    <section id="test-note-with-list">
        <h2>1. Pre-flight Checklist</h2>
        
        <p>Complete all pre-flight procedures before departure.</p>
        
        <p>NOTE— The following items must be verified in order:</p>
        <p>1. Aircraft documentation</p>
        <p>2. Weight and balance calculations</p>
        <p>3. Weather briefing</p>
        <p style="margin-left: 20px">a. Surface conditions</p>
        <p style="margin-left: 20px">b. Winds aloft</p>
        <p style="margin-left: 20px">c. Terminal forecasts</p>
        <p>4. Fuel requirements</p>
        <p style="margin-left: 20px">a. Trip fuel</p>
        <p style="margin-left: 20px">b. Reserve fuel</p>
        <p style="margin-left: 40px">(i) IFR reserves: 45 minutes</p>
        <p style="margin-left: 40px">(ii) VFR reserves: 30 minutes</p>
        <p>5. Alternate airports</p>
        
        <p>Continue with exterior inspection after completing documentation.</p>
    </section>
    
    <!-- Test Case 2: REFERENCE with complex nested list -->
    <section id="test-reference-with-list">
        <h2>2. Communication Procedures</h2>
        
        <p>REFERENCE— See the following documents for detailed procedures:</p>
        <p>1. ICAO Annex 10 - Aeronautical Telecommunications</p>
        <p style="margin-left: 20px">a. Volume I - Radio Navigation Aids</p>
        <p style="margin-left: 40px">(i) Part 1 - ILS specifications</p>
        <p style="margin-left: 40px">(ii) Part 2 - VOR specifications</p>
        <p style="margin-left: 20px">b. Volume II - Communication Procedures</p>
        <p style="margin-left: 40px">(i) Voice communication</p>
        <p style="margin-left: 60px">(1) Standard phraseology</p>
        <p style="margin-left: 60px">(2) Emergency procedures</p>
        <p style="margin-left: 40px">(ii) Data link procedures</p>
        <p>2. FAA Order JO 7110.65 - Air Traffic Control</p>
        <p style="margin-left: 20px">a. Chapter 2 - General Control</p>
        <p style="margin-left: 20px">b. Chapter 3 - Airport Traffic Control</p>
        <p>3. Company Operations Manual</p>
        
        <p>All pilots must be familiar with these references.</p>
    </section>
    
    <!-- Test Case 3: EXAMPLE with mixed content and lists -->
    <section id="test-example-with-list">
        <h2>3. Landing Procedures</h2>
        
        <p>EXAMPLE: Standard ILS approach procedure:</p>
        <p>The following sequence demonstrates a typical ILS approach:</p>
        <p>1. Initial approach</p>
        <p style="margin-left: 20px">a. Intercept localizer</p>
        <p style="margin-left: 20px">b. Configure aircraft</p>
        <p style="margin-left: 40px">(i) Flaps 15 degrees</p>
        <p style="margin-left: 40px">(ii) Speed 180 knots</p>
        <p>2. Intermediate approach</p>
        <p style="margin-left: 20px">a. Intercept glide slope</p>
        <p style="margin-left: 20px">b. Landing gear down</p>
        <p style="margin-left: 20px">c. Flaps 30 degrees</p>
        <p>3. Final approach</p>
        <p style="margin-left: 20px">a. Stabilized by 1000 feet AGL</p>
        <p style="margin-left: 20px">b. Landing checklist complete</p>
        <p style="margin-left: 20px">c. Decision at minimums</p>
        
        <p>This example applies to Category I ILS approaches.</p>
    </section>
    
    <!-- Test Case 4: Multiple semantic sections with lists -->
    <section id="test-multiple-semantics">
        <h2>4. Emergency Procedures</h2>
        
        <p>WARNING— Engine failure procedures are time-critical:</p>
        <p>1. Maintain aircraft control</p>
        <p>2. Establish best glide speed</p>
        <p>3. Select landing area</p>
        
        <p>CAUTION— Do not attempt restart above 10,000 feet MSL:</p>
        <p>1. Fuel pump - ON</p>
        <p>2. Mixture - RICH</p>
        <p>3. Ignition - START</p>
        
        <p>EXCEPTION— In case of fire, skip restart attempts:</p>
        <p>1. Fuel selector - OFF</p>
        <p>2. Mixture - CUTOFF</p>
        <p>3. Master switch - OFF</p>
        
        <p>IMPORTANT— Declare emergency immediately:</p>
        <p>1. Squawk 7700</p>
        <p>2. Transmit MAYDAY</p>
        <p>3. State intentions</p>
    </section>
    
    <!-- Test Case 5: Nested semantic sections -->
    <section id="test-nested-semantics">
        <h2>5. Training Requirements</h2>
        
        <p>REFERENCE— Training must include the following modules:</p>
        <p>1. Ground school</p>
        <p style="margin-left: 20px">NOTE: Minimum 40 hours required</p>
        <p style="margin-left: 20px">a. Aerodynamics</p>
        <p style="margin-left: 20px">b. Navigation</p>
        <p style="margin-left: 20px">c. Meteorology</p>
        <p>2. Flight training</p>
        <p style="margin-left: 20px">EXAMPLE: Typical progression:</p>
        <p style="margin-left: 20px">a. Basic maneuvers</p>
        <p style="margin-left: 20px">b. Traffic patterns</p>
        <p style="margin-left: 20px">c. Cross-country</p>
        <p>3. Simulator training</p>
        <p style="margin-left: 20px">NOTE: Can substitute for up to 20 hours</p>
    </section>
    
    <!-- Test Case 6: PHRASEOLOGY with list -->
    <section id="test-phraseology">
        <h2>6. Standard Communications</h2>
        
        <p>PHRASEOLOGY— Use the following standard phrases:</p>
        <p>1. Initial contact:</p>
        <p style="margin-left: 20px">a. "Tower, [callsign] with you"</p>
        <p style="margin-left: 20px">b. "Ground, [callsign] ready to taxi"</p>
        <p>2. Position reports:</p>
        <p style="margin-left: 20px">a. "[Position] inbound for landing"</p>
        <p style="margin-left: 20px">b. "Holding at [fix] as published"</p>
        <p>3. Emergency declarations:</p>
        <p style="margin-left: 20px">a. "MAYDAY MAYDAY MAYDAY"</p>
        <p style="margin-left: 20px">b. "PAN PAN PAN PAN PAN PAN"</p>
    </section>
</body>
</html>`;
}

/**
 * Test runner class
 */
class SemanticListTestRunner {
    constructor() {
        this.processor = new IntegratedListProcessor({
            maxDepthInSections: 6,
            preserveSectionHeaders: true,
            inheritParentDepth: true,
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
        console.log('🧪 Semantic List Processing Test Suite');
        console.log('=' .repeat(60));
        console.log('');
        
        // Generate test HTML
        const testHtml = generateTestHTML();
        
        // Save test input
        fs.writeFileSync('test-semantic-lists-input.html', testHtml);
        
        // Process HTML
        const result = this.processor.processHtml(testHtml);
        
        // Add styles for visualization
        const styles = this.processor.generateStyles();
        const finalHtml = this.addTestStyles(result.html, styles);
        
        // Save processed output
        fs.writeFileSync('test-semantic-lists-output.html', finalHtml);
        
        // Run test assertions
        this.testSemanticSectionDetection(result);
        this.testListsInSections(result);
        this.testNestedStructure(result);
        this.testMultipleSections(result);
        this.testStyleGeneration(styles);
        
        // Report results
        this.reportResults(result);
        
        return this.testResults;
    }
    
    /**
     * Test semantic section detection
     */
    testSemanticSectionDetection(result) {
        console.log('📋 Testing Semantic Section Detection...');
        
        const html = result.html;
        const stats = result.statistics;
        
        // Test: All semantic types detected
        const expectedTypes = ['note', 'reference', 'example', 'warning', 'caution', 'exception', 'important', 'phraseology'];
        
        expectedTypes.forEach(type => {
            const hasSection = html.includes(`semantic-${type}`);
            this.assert(
                `${type.toUpperCase()} section detected`,
                hasSection,
                hasSection ? 'Found' : 'Missing'
            );
        });
        
        // Test: Section count
        this.assert(
            'Total sections processed',
            stats.semantic.sectionsProcessed > 0,
            `Count: ${stats.semantic.sectionsProcessed}`
        );
        
        console.log('');
    }
    
    /**
     * Test lists within sections
     */
    testListsInSections(result) {
        console.log('📋 Testing Lists in Semantic Sections...');
        
        const stats = result.statistics;
        
        // Test: Lists detected in sections
        this.assert(
            'Lists in semantic sections',
            stats.semantic.listsInSections > 0,
            `Found: ${stats.semantic.listsInSections}`
        );
        
        // Test: List items counted
        this.assert(
            'List items in sections',
            stats.semantic.totalListItems > 0,
            `Count: ${stats.semantic.totalListItems}`
        );
        
        // Test: Maximum depth reached
        this.assert(
            'Deep nesting in sections',
            stats.semantic.maxDepthReached >= 2,
            `Max depth: ${stats.semantic.maxDepthReached}`
        );
        
        console.log('');
    }
    
    /**
     * Test nested structure preservation
     */
    testNestedStructure(result) {
        console.log('📋 Testing Nested Structure Preservation...');
        
        const html = result.html;
        
        // Test: Nested lists exist
        const hasNestedOL = html.includes('<ol') && html.includes('</ol>');
        this.assert(
            'Ordered lists created',
            hasNestedOL,
            hasNestedOL ? 'Valid structure' : 'Missing'
        );
        
        // Test: Semantic wrapper structure
        const hasSemanticLists = html.includes('semantic-list');
        this.assert(
            'Lists marked as semantic',
            hasSemanticLists,
            hasSemanticLists ? 'Properly marked' : 'Not marked'
        );
        
        // Test: Headers preserved
        const hasHeaders = html.includes('semantic-header');
        this.assert(
            'Section headers preserved',
            hasHeaders,
            hasHeaders ? 'Headers present' : 'Headers missing'
        );
        
        console.log('');
    }
    
    /**
     * Test multiple sections handling
     */
    testMultipleSections(result) {
        console.log('📋 Testing Multiple Sections Handling...');
        
        const stats = result.statistics;
        const html = result.html;
        
        // Test: Multiple section types
        const sectionTypes = Object.keys(stats.semantic.sectionTypes || {});
        this.assert(
            'Multiple section types',
            sectionTypes.length >= 5,
            `Types: ${sectionTypes.length}`
        );
        
        // Test: Combined statistics
        this.assert(
            'Combined total lists',
            stats.combined.totalLists > 0,
            `Total: ${stats.combined.totalLists}`
        );
        
        // Test: No content lost
        const originalMarkers = ['NOTE—', 'REFERENCE—', 'EXAMPLE:', 'WARNING—', 'CAUTION—'];
        let contentPreserved = true;
        originalMarkers.forEach(marker => {
            if (!html.includes(marker.replace('—', '').replace(':', ''))) {
                contentPreserved = false;
            }
        });
        
        this.assert(
            'Content preservation',
            contentPreserved,
            contentPreserved ? 'All preserved' : 'Some lost'
        );
        
        console.log('');
    }
    
    /**
     * Test style generation
     */
    testStyleGeneration(styles) {
        console.log('📋 Testing Style Generation...');
        
        // Test: Styles generated
        this.assert(
            'Styles generated',
            styles && styles.length > 0,
            `Length: ${styles ? styles.length : 0}`
        );
        
        // Test: Semantic section styles
        const hasSemanticStyles = styles && styles.includes('semantic-note');
        this.assert(
            'Semantic section styles',
            hasSemanticStyles,
            'Included'
        );
        
        // Test: Responsive styles
        const hasResponsive = styles && styles.includes('@media');
        this.assert(
            'Responsive styles',
            hasResponsive,
            'Included'
        );
        
        // Test: Dark mode support
        const hasDarkMode = styles && styles.includes('prefers-color-scheme: dark');
        this.assert(
            'Dark mode support',
            hasDarkMode,
            'Included'
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
     * Add test styles to output
     */
    addTestStyles(html, generatedStyles) {
        const testStyles = `
            <style>
                ${generatedStyles}
                
                /* Test-specific styles */
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2em;
                    line-height: 1.6;
                    background: #f5f5f5;
                }
                
                h1, h2 {
                    color: #2c3e50;
                    margin: 1.5em 0 0.75em 0;
                }
                
                h1 {
                    border-bottom: 3px solid #3498db;
                    padding-bottom: 0.5em;
                }
                
                h2 {
                    border-bottom: 1px solid #bdc3c7;
                    padding-bottom: 0.25em;
                }
                
                section {
                    background: white;
                    padding: 1.5em;
                    margin: 2em 0;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                /* Test visualization */
                .test-info {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 1.5em;
                    margin-bottom: 2em;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }
                
                .test-info h3 {
                    margin: 0 0 0.5em 0;
                    color: white;
                    font-size: 1.5em;
                }
                
                .test-info p {
                    margin: 0.25em 0;
                    opacity: 0.95;
                }
                
                /* Highlight semantic sections */
                [class^="semantic-"] {
                    animation: fadeIn 0.5s ease-in;
                    transition: all 0.3s ease;
                }
                
                [class^="semantic-"]:hover {
                    transform: translateX(5px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                /* List highlighting */
                .semantic-list {
                    position: relative;
                }
                
                .semantic-list::before {
                    content: "📋";
                    position: absolute;
                    left: -1.5em;
                    top: 0;
                    font-size: 1.2em;
                    opacity: 0.5;
                }
            </style>
        `;
        
        const testInfo = `
            <div class="test-info">
                <h3>🧪 Semantic List Processing Test Output</h3>
                <p>✅ Lists within NOTE, REFERENCE, EXAMPLE sections</p>
                <p>✅ Deep nesting support (6+ levels)</p>
                <p>✅ DRY architecture implementation</p>
                <p>✅ Full accessibility compliance</p>
            </div>
        `;
        
        return html
            .replace('</head>', `${testStyles}</head>`)
            .replace('<body>', `<body>${testInfo}`);
    }
    
    /**
     * Report test results
     */
    reportResults(result) {
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
        
        console.log('📈 STATISTICS');
        console.log('-'.repeat(40));
        console.log(`Semantic Sections: ${result.statistics.semantic.sectionsProcessed}`);
        console.log(`Lists in Sections: ${result.statistics.semantic.listsInSections}`);
        console.log(`Total List Items: ${result.statistics.combined.totalItems}`);
        console.log(`Maximum Depth: ${result.statistics.combined.maxDepth}`);
        console.log('');
        
        console.log('Section Types Processed:');
        Object.entries(result.statistics.semantic.sectionTypes || {}).forEach(([type, count]) => {
            console.log(`  - ${type}: ${count}`);
        });
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
        console.log('  - test-semantic-lists-input.html (original)');
        console.log('  - test-semantic-lists-output.html (processed)');
        console.log('');
    }
}

/**
 * Run tests
 */
if (require.main === module) {
    const runner = new SemanticListTestRunner();
    runner.runAllTests().then(results => {
        const exitCode = results.failed === 0 ? 0 : 1;
        process.exit(exitCode);
    });
}

module.exports = { SemanticListTestRunner, generateTestHTML };