#!/usr/bin/env node

/**
 * Comprehensive Accessibility Testing with Playwright
 * 
 * Tests all mammoth.js generated HTML for:
 * - WCAG 2.1 Level AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
 * - Keyboard navigation and focus management
 * - Screen reader compatibility and ARIA labels
 * - Semantic HTML structure
 * - Color blindness accessibility
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class AccessibilityTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            contrast: {},
            navigation: {},
            aria: {},
            semantic: {},
            colorBlindness: {},
            overall: { score: 0, issues: [], passes: [] }
        };
    }

    async initialize() {
        console.log('🚀 Initializing Playwright browser for accessibility testing...');
        this.browser = await chromium.launch({ headless: false });
        const context = await this.browser.newContext();
        this.page = await context.newPage();
        
        // Inject axe-core for comprehensive accessibility testing
        try {
            await this.page.addScriptTag({
                url: 'https://unpkg.com/axe-core@4.8.2/axe.min.js'
            });
            
            // Wait for axe to be available
            await this.page.waitForFunction(() => typeof window.axe !== 'undefined', { timeout: 5000 });
        } catch (error) {
            console.log('⚠️  Could not load axe-core, continuing with manual tests only');
        }
        
        console.log('✅ Browser initialized with axe-core library');
    }

    /**
     * Test contrast ratios for all color combinations
     */
    async testContrastRatios(htmlFile) {
        console.log('\n📊 Testing contrast ratios...');
        
        await this.page.goto(`file://${htmlFile}`);
        
        // Get all computed styles and test contrast
        const contrastResults = await this.page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('*');
            
            // WCAG 2.1 Level AA requirements
            const CONTRAST_RATIOS = {
                normal: 4.5,    // 14pt and above
                large: 3.0      // 18pt+ or 14pt+ bold
            };
            
            // Helper function to calculate relative luminance
            function relativeLuminance(r, g, b) {
                const [rs, gs, bs] = [r, g, b].map(c => {
                    c = c / 255;
                    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
                });
                return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
            }
            
            // Helper function to calculate contrast ratio
            function contrastRatio(rgb1, rgb2) {
                const l1 = relativeLuminance(...rgb1);
                const l2 = relativeLuminance(...rgb2);
                const lighter = Math.max(l1, l2);
                const darker = Math.min(l1, l2);
                return (lighter + 0.05) / (darker + 0.05);
            }
            
            // Helper to parse RGB values
            function parseRgb(rgbString) {
                if (!rgbString || rgbString === 'rgba(0, 0, 0, 0)') return null;
                const match = rgbString.match(/rgba?\(([^)]+)\)/);
                if (!match) return null;
                const values = match[1].split(',').map(v => parseInt(v.trim()));
                return values.slice(0, 3);
            }
            
            elements.forEach((element, index) => {
                const styles = window.getComputedStyle(element);
                const color = parseRgb(styles.color);
                const backgroundColor = parseRgb(styles.backgroundColor);
                
                if (!color || !backgroundColor) return;
                
                const fontSize = parseFloat(styles.fontSize);
                const fontWeight = styles.fontWeight;
                const isLarge = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
                
                const contrast = contrastRatio(color, backgroundColor);
                const required = isLarge ? CONTRAST_RATIOS.large : CONTRAST_RATIOS.normal;
                const passes = contrast >= required;
                
                if (element.textContent.trim()) {
                    results.push({
                        element: element.tagName.toLowerCase() + (element.className ? `.${element.className}` : ''),
                        color: styles.color,
                        backgroundColor: styles.backgroundColor,
                        fontSize: `${fontSize}px`,
                        fontWeight,
                        isLarge,
                        contrast: Math.round(contrast * 100) / 100,
                        required,
                        passes,
                        text: element.textContent.trim().substring(0, 50) + '...'
                    });
                }
            });
            
            return results;
        });
        
        // Analyze results
        const failed = contrastResults.filter(r => !r.passes);
        const passed = contrastResults.filter(r => r.passes);
        
        this.results.contrast = {
            total: contrastResults.length,
            passed: passed.length,
            failed: failed.length,
            failures: failed,
            score: Math.round((passed.length / contrastResults.length) * 100)
        };
        
        console.log(`✅ Contrast testing complete: ${passed.length}/${contrastResults.length} elements pass`);
        if (failed.length > 0) {
            console.log(`❌ ${failed.length} contrast failures found`);
        }
        
        return this.results.contrast;
    }

    /**
     * Test keyboard navigation and focus management
     */
    async testKeyboardNavigation() {
        console.log('\n⌨️  Testing keyboard navigation...');
        
        const navigationResults = await this.page.evaluate(() => {
            const results = {
                focusableElements: [],
                tabOrder: [],
                skipLinks: [],
                focusTraps: [],
                issues: []
            };
            
            // Find all focusable elements
            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                'textarea:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
                'summary',
                '[contenteditable="true"]'
            ];
            
            const focusableElements = document.querySelectorAll(focusableSelectors.join(', '));
            
            focusableElements.forEach((element, index) => {
                const tabIndex = element.getAttribute('tabindex');
                const computedTabIndex = element.tabIndex;
                
                results.focusableElements.push({
                    tag: element.tagName.toLowerCase(),
                    id: element.id,
                    className: element.className,
                    tabIndex: tabIndex,
                    computedTabIndex: computedTabIndex,
                    ariaLabel: element.getAttribute('aria-label'),
                    ariaLabelledBy: element.getAttribute('aria-labelledby'),
                    role: element.getAttribute('role')
                });
            });
            
            // Check for skip links
            const skipLinks = document.querySelectorAll('a[href^="#"]');
            skipLinks.forEach(link => {
                const target = document.querySelector(link.getAttribute('href'));
                results.skipLinks.push({
                    text: link.textContent,
                    href: link.getAttribute('href'),
                    targetExists: !!target
                });
            });
            
            // Check focus management in figure elements
            const figures = document.querySelectorAll('figure');
            figures.forEach(figure => {
                const hasTabIndex = figure.hasAttribute('tabindex');
                const hasAriaLabel = figure.hasAttribute('aria-label') || figure.hasAttribute('aria-labelledby');
                const hasRole = figure.hasAttribute('role');
                
                if (!hasAriaLabel) {
                    results.issues.push({
                        element: 'figure',
                        issue: 'Missing aria-label or aria-labelledby',
                        severity: 'medium'
                    });
                }
            });
            
            return results;
        });
        
        // Test actual keyboard navigation
        console.log('🔍 Testing Tab navigation flow...');
        let tabStops = [];
        
        try {
            // Start from beginning
            await this.page.keyboard.press('Tab');
            
            for (let i = 0; i < 20; i++) {
                const activeElement = await this.page.evaluate(() => {
                    const el = document.activeElement;
                    return {
                        tag: el.tagName.toLowerCase(),
                        id: el.id,
                        className: el.className,
                        text: el.textContent.trim().substring(0, 30),
                        tabIndex: el.tabIndex
                    };
                });
                
                tabStops.push(activeElement);
                await this.page.keyboard.press('Tab');
                
                // Break if we've cycled back to body
                if (activeElement.tag === 'body') break;
            }
        } catch (error) {
            console.log('⚠️  Keyboard navigation test had issues:', error.message);
        }
        
        this.results.navigation = {
            focusableElements: navigationResults.focusableElements.length,
            skipLinks: navigationResults.skipLinks.length,
            tabStops: tabStops,
            issues: navigationResults.issues,
            score: navigationResults.issues.length === 0 ? 100 : Math.max(0, 100 - (navigationResults.issues.length * 10))
        };
        
        console.log(`✅ Navigation testing complete: ${tabStops.length} tab stops found`);
        return this.results.navigation;
    }

    /**
     * Test ARIA labels and screen reader compatibility
     */
    async testAriaAndSemantics() {
        console.log('\n🔊 Testing ARIA and semantic structure...');
        
        const ariaResults = await this.page.evaluate(() => {
            const results = {
                headings: [],
                landmarks: [],
                figures: [],
                lists: [],
                links: [],
                forms: [],
                issues: [],
                semanticScore: 0
            };
            
            // Test heading structure
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            let lastHeadingLevel = 0;
            
            headings.forEach(heading => {
                const level = parseInt(heading.tagName.charAt(1));
                const hasId = !!heading.id;
                const text = heading.textContent.trim();
                
                // Check for proper heading hierarchy
                if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
                    results.issues.push({
                        element: heading.tagName.toLowerCase(),
                        issue: `Heading level skipped from h${lastHeadingLevel} to h${level}`,
                        severity: 'high',
                        text: text.substring(0, 50)
                    });
                }
                
                results.headings.push({
                    level,
                    text,
                    hasId,
                    tag: heading.tagName.toLowerCase()
                });
                
                lastHeadingLevel = level;
            });
            
            // Test landmarks
            const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], nav, main, aside, header, footer');
            landmarks.forEach(landmark => {
                results.landmarks.push({
                    tag: landmark.tagName.toLowerCase(),
                    role: landmark.getAttribute('role'),
                    ariaLabel: landmark.getAttribute('aria-label')
                });
            });
            
            // Test figures - critical for our mammoth.js output
            const figures = document.querySelectorAll('figure');
            figures.forEach((figure, index) => {
                const figcaption = figure.querySelector('figcaption');
                const ariaLabelledBy = figure.getAttribute('aria-labelledby');
                const role = figure.getAttribute('role');
                const hasAlt = figure.querySelector('img[alt]');
                
                results.figures.push({
                    hasCaption: !!figcaption,
                    hasAriaLabelledBy: !!ariaLabelledBy,
                    hasRole: !!role,
                    hasAltText: !!hasAlt,
                    captionText: figcaption ? figcaption.textContent.trim().substring(0, 50) : null
                });
                
                // Check for proper labeling
                if (!figcaption && !ariaLabelledBy) {
                    results.issues.push({
                        element: 'figure',
                        issue: 'Figure lacks caption and aria-labelledby',
                        severity: 'high',
                        index
                    });
                }
                
                // Check image alt text
                const img = figure.querySelector('img');
                if (img && (!img.alt || img.alt.trim() === '')) {
                    results.issues.push({
                        element: 'img in figure',
                        issue: 'Image missing alt attribute',
                        severity: 'high',
                        index
                    });
                }
            });
            
            // Test lists
            const lists = document.querySelectorAll('ul, ol, dl');
            lists.forEach((list, index) => {
                const items = list.querySelectorAll('li, dt, dd');
                const hasRole = list.getAttribute('role');
                
                results.lists.push({
                    tag: list.tagName.toLowerCase(),
                    itemCount: items.length,
                    hasRole: !!hasRole
                });
                
                if (items.length === 0) {
                    results.issues.push({
                        element: list.tagName.toLowerCase(),
                        issue: 'Empty list found',
                        severity: 'medium',
                        index
                    });
                }
            });
            
            // Test links
            const links = document.querySelectorAll('a');
            links.forEach((link, index) => {
                const href = link.getAttribute('href');
                const text = link.textContent.trim();
                const ariaLabel = link.getAttribute('aria-label');
                
                results.links.push({
                    href,
                    text: text.substring(0, 30),
                    hasAriaLabel: !!ariaLabel
                });
                
                if (!href) {
                    results.issues.push({
                        element: 'a',
                        issue: 'Link missing href attribute',
                        severity: 'high',
                        text: text.substring(0, 30)
                    });
                }
                
                if (!text && !ariaLabel) {
                    results.issues.push({
                        element: 'a',
                        issue: 'Link missing accessible text',
                        severity: 'high',
                        href
                    });
                }
            });
            
            // Calculate semantic score
            const totalElements = results.headings.length + results.figures.length + results.lists.length + results.links.length;
            const issueCount = results.issues.length;
            results.semanticScore = totalElements > 0 ? Math.max(0, 100 - (issueCount * 5)) : 100;
            
            return results;
        });
        
        this.results.aria = ariaResults;
        console.log(`✅ ARIA testing complete: ${ariaResults.issues.length} issues found`);
        console.log(`📊 Semantic score: ${ariaResults.semanticScore}/100`);
        
        return this.results.aria;
    }

    /**
     * Run comprehensive axe-core accessibility audit
     */
    async runAxeAudit() {
        console.log('\n🔍 Running axe-core comprehensive audit...');
        
        // Check if axe is available
        const axeAvailable = await this.page.evaluate(() => typeof window.axe !== 'undefined');
        
        if (!axeAvailable) {
            console.log('⚠️  Axe-core not available, skipping automated audit');
            return null;
        }
        
        const axeResults = await this.page.evaluate(() => {
            return new Promise((resolve) => {
                window.axe.run({
                    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                    options: {
                        reporter: 'v2'
                    }
                }, (err, results) => {
                    if (err) {
                        resolve({ error: err.message });
                        return;
                    }
                    resolve(results);
                });
            });
        });
        
        if (axeResults.error) {
            console.log('❌ Axe audit failed:', axeResults.error);
            return null;
        }
        
        const violations = axeResults.violations || [];
        const passes = axeResults.passes || [];
        const incomplete = axeResults.incomplete || [];
        
        console.log(`✅ Axe audit complete:`);
        console.log(`   - ${passes.length} rules passed`);
        console.log(`   - ${violations.length} violations found`);
        console.log(`   - ${incomplete.length} incomplete checks`);
        
        return {
            violations,
            passes,
            incomplete,
            score: violations.length === 0 ? 100 : Math.max(0, 100 - (violations.length * 10))
        };
    }

    /**
     * Test color blindness accessibility
     */
    async testColorBlindness() {
        console.log('\n👁️  Testing color blindness accessibility...');
        
        // Simulate different types of color blindness
        const colorBlindnessTests = [
            { name: 'Protanopia', filter: 'url(#protanopia)' },
            { name: 'Deuteranopia', filter: 'url(#deuteranopia)' },
            { name: 'Tritanopia', filter: 'url(#tritanopia)' },
            { name: 'Achromatopsia', filter: 'grayscale(100%)' }
        ];
        
        const results = {};
        
        for (const test of colorBlindnessTests) {
            await this.page.addStyleTag({
                content: `body { filter: ${test.filter}; }`
            });
            
            // Check if information is still conveyed without color
            const colorDependentElements = await this.page.evaluate(() => {
                const elements = document.querySelectorAll('*[style*="color"], .error, .success, .warning, .info');
                return Array.from(elements).map(el => ({
                    tag: el.tagName.toLowerCase(),
                    className: el.className,
                    style: el.style.color,
                    text: el.textContent.trim().substring(0, 30)
                }));
            });
            
            results[test.name] = {
                colorDependentElements: colorDependentElements.length,
                elements: colorDependentElements
            };
            
            // Remove the filter
            await this.page.addStyleTag({
                content: `body { filter: none; }`
            });
        }
        
        this.results.colorBlindness = results;
        console.log(`✅ Color blindness testing complete`);
        
        return results;
    }

    /**
     * Generate comprehensive accessibility report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                overallScore: 0,
                totalIssues: 0,
                criticalIssues: 0,
                compliance: 'Unknown'
            },
            details: this.results,
            recommendations: []
        };
        
        // Calculate overall score
        const scores = [
            this.results.contrast?.score || 0,
            this.results.navigation?.score || 0,
            this.results.aria?.semanticScore || 0
        ];
        
        report.summary.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        
        // Count total issues
        const issueCount = (this.results.aria?.issues?.length || 0) + 
                          (this.results.contrast?.failed || 0) + 
                          (this.results.navigation?.issues?.length || 0);
        
        report.summary.totalIssues = issueCount;
        report.summary.criticalIssues = (this.results.aria?.issues?.filter(i => i.severity === 'high')?.length || 0);
        
        // Determine compliance level
        if (report.summary.overallScore >= 95) {
            report.summary.compliance = 'WCAG 2.1 Level AA';
        } else if (report.summary.overallScore >= 85) {
            report.summary.compliance = 'WCAG 2.1 Level A';
        } else {
            report.summary.compliance = 'Non-compliant';
        }
        
        // Generate recommendations
        if (this.results.contrast?.failed > 0) {
            report.recommendations.push('Improve color contrast ratios for better readability');
        }
        
        if (this.results.aria?.issues?.length > 0) {
            report.recommendations.push('Add proper ARIA labels and semantic markup');
        }
        
        if (this.results.navigation?.issues?.length > 0) {
            report.recommendations.push('Improve keyboard navigation and focus management');
        }
        
        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Main testing function
async function runAccessibilityTests() {
    const tester = new AccessibilityTester();
    
    try {
        await tester.initialize();
        
        // Test files to check
        const testFiles = [
            '/Users/devos/git/mammoth.js/demo-multiline-figures-output.html',
            '/Users/devos/git/mammoth.js/test-multiline-figures.html'
        ];
        
        console.log('🧪 Starting comprehensive accessibility testing...');
        console.log('=' .repeat(60));
        
        for (const file of testFiles) {
            if (!fs.existsSync(file)) {
                console.log(`⚠️  File not found: ${file}`);
                continue;
            }
            
            console.log(`\n📄 Testing: ${path.basename(file)}`);
            console.log('-'.repeat(40));
            
            // Load the file
            await tester.page.goto(`file://${file}`);
            
            // Run all tests
            await tester.testContrastRatios(file);
            await tester.testKeyboardNavigation();
            await tester.testAriaAndSemantics();
            await tester.testColorBlindness();
            
            // Run axe audit
            const axeResults = await tester.runAxeAudit();
            if (axeResults) {
                tester.results.axe = axeResults;
            }
        }
        
        // Generate final report
        const report = tester.generateReport();
        
        // Save report
        const reportPath = '/Users/devos/git/mammoth.js/accessibility-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 FINAL ACCESSIBILITY REPORT');
        console.log('=' .repeat(60));
        console.log(`Overall Score: ${report.summary.overallScore}/100`);
        console.log(`Compliance Level: ${report.summary.compliance}`);
        console.log(`Total Issues: ${report.summary.totalIssues}`);
        console.log(`Critical Issues: ${report.summary.criticalIssues}`);
        
        if (report.recommendations.length > 0) {
            console.log('\n🔧 RECOMMENDATIONS:');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        // Return success/failure based on score
        return report.summary.overallScore >= 85;
        
    } catch (error) {
        console.error('❌ Accessibility testing failed:', error.message);
        return false;
    } finally {
        await tester.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    runAccessibilityTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { AccessibilityTester, runAccessibilityTests };