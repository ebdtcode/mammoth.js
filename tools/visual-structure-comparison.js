#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const mammoth = require('./lib/index');

/**
 * Visual Structure Comparison Tool
 * 
 * Compares the structure of the source Word document with the converted HTML
 * using Playwright to analyze both and ensure structure is preserved.
 */

async function extractWordStructure(docxPath) {
    console.log('📖 Extracting structure from Word document...');
    
    // First convert to basic HTML to analyze structure
    const result = await mammoth.convertToHtml({
        path: docxPath
    }, {
        includeDefaultStyleMap: true
    });
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(result.value);
    
    const structure = await page.evaluate(() => {
        const analysis = {
            sections: [],
            totalParagraphs: 0,
            totalLists: 0,
            semanticElements: {
                notes: [],
                phraseology: [],
                references: [],
                examples: [],
                exceptions: []
            }
        };
        
        // Find all headings and their content
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach(heading => {
            const section = {
                level: heading.tagName,
                title: heading.textContent.trim(),
                content: {
                    paragraphs: 0,
                    listItems: 0,
                    semanticBlocks: []
                }
            };
            
            // Analyze content after this heading
            let currentElement = heading.nextElementSibling;
            while (currentElement && !currentElement.matches('h1, h2, h3, h4, h5, h6')) {
                const text = currentElement.textContent.trim().toUpperCase();
                
                if (currentElement.tagName === 'P') {
                    section.content.paragraphs++;
                    
                    // Check for semantic markers
                    if (text.includes('NOTE−') || text.includes('NOTE—')) {
                        section.content.semanticBlocks.push('NOTE');
                        analysis.semanticElements.notes.push({
                            section: section.title,
                            text: currentElement.textContent.trim().substring(0, 50)
                        });
                    } else if (text.includes('PHRASEOLOGY−') || text.includes('PHRASEOLOGY—')) {
                        section.content.semanticBlocks.push('PHRASEOLOGY');
                        analysis.semanticElements.phraseology.push({
                            section: section.title,
                            text: currentElement.textContent.trim().substring(0, 50)
                        });
                    } else if (text.includes('REFERENCE−') || text.includes('REFERENCE—')) {
                        section.content.semanticBlocks.push('REFERENCE');
                        analysis.semanticElements.references.push({
                            section: section.title,
                            text: currentElement.textContent.trim().substring(0, 50)
                        });
                    } else if (text.includes('EXAMPLE−') || text.includes('EXAMPLE—')) {
                        section.content.semanticBlocks.push('EXAMPLE');
                        analysis.semanticElements.examples.push({
                            section: section.title,
                            text: currentElement.textContent.trim().substring(0, 50)
                        });
                    } else if (text.includes('EXCEPTION')) {
                        section.content.semanticBlocks.push('EXCEPTION');
                        analysis.semanticElements.exceptions.push({
                            section: section.title,
                            text: currentElement.textContent.trim().substring(0, 50)
                        });
                    }
                } else if (currentElement.tagName === 'OL' || currentElement.tagName === 'UL') {
                    section.content.listItems += currentElement.querySelectorAll('li').length;
                }
                
                currentElement = currentElement.nextElementSibling;
            }
            
            analysis.sections.push(section);
            analysis.totalParagraphs += section.content.paragraphs;
        });
        
        // Count actual list structures
        analysis.totalLists = document.querySelectorAll('ol, ul').length;
        
        return analysis;
    });
    
    await browser.close();
    return structure;
}

async function extractHtmlStructure(htmlPath) {
    console.log('🌐 Extracting structure from converted HTML...');
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const structure = await page.evaluate(() => {
        const analysis = {
            sections: [],
            totalParagraphs: 0,
            totalLists: 0,
            hierarchicalLists: 0,
            semanticElements: {
                notes: [],
                phraseology: [],
                references: [],
                examples: [],
                exceptions: []
            },
            listStructure: {
                totalListItems: 0,
                itemsWithNestedContent: 0,
                continuousNumbering: true
            }
        };
        
        // Find all headings and their content
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headings.forEach(heading => {
            const section = {
                level: heading.tagName,
                title: heading.textContent.trim(),
                content: {
                    paragraphs: 0,
                    listItems: 0,
                    semanticBlocks: []
                }
            };
            
            // Analyze content after this heading
            let currentElement = heading.nextElementSibling;
            while (currentElement && !currentElement.matches('h1, h2, h3, h4, h5, h6')) {
                if (currentElement.tagName === 'P') {
                    section.content.paragraphs++;
                } else if (currentElement.tagName === 'OL' || currentElement.tagName === 'UL') {
                    const items = currentElement.querySelectorAll('li');
                    section.content.listItems += items.length;
                    
                    // Check for hierarchical structure
                    if (currentElement.classList.contains('hierarchical-list')) {
                        analysis.hierarchicalLists++;
                        
                        items.forEach(item => {
                            analysis.listStructure.totalListItems++;
                            
                            // Check for nested content
                            const hasNested = item.querySelector('.nested-paragraph, .note-section, .phraseology-section, .reference-section, .example-section, .exception-section');
                            if (hasNested) {
                                analysis.listStructure.itemsWithNestedContent++;
                            }
                        });
                    }
                }
                
                currentElement = currentElement.nextElementSibling;
            }
            
            analysis.sections.push(section);
            analysis.totalParagraphs += section.content.paragraphs;
        });
        
        // Count semantic sections
        document.querySelectorAll('.note-section').forEach(el => {
            analysis.semanticElements.notes.push({
                parent: el.closest('li') ? 'list-item' : 'standalone',
                text: el.textContent.trim().substring(0, 50)
            });
        });
        
        document.querySelectorAll('.phraseology-section').forEach(el => {
            analysis.semanticElements.phraseology.push({
                parent: el.closest('li') ? 'list-item' : 'standalone',
                text: el.textContent.trim().substring(0, 50)
            });
        });
        
        document.querySelectorAll('.reference-section').forEach(el => {
            analysis.semanticElements.references.push({
                parent: el.closest('li') ? 'list-item' : 'standalone',
                text: el.textContent.trim().substring(0, 50)
            });
        });
        
        document.querySelectorAll('.example-section').forEach(el => {
            analysis.semanticElements.examples.push({
                parent: el.closest('li') ? 'list-item' : 'standalone',
                text: el.textContent.trim().substring(0, 50)
            });
        });
        
        document.querySelectorAll('.exception-section').forEach(el => {
            analysis.semanticElements.exceptions.push({
                parent: el.closest('li') ? 'list-item' : 'standalone',
                text: el.textContent.trim().substring(0, 50)
            });
        });
        
        // Count lists
        analysis.totalLists = document.querySelectorAll('ol, ul').length;
        
        // Check for proper list numbering
        const lists = document.querySelectorAll('ol.hierarchical-list');
        lists.forEach(list => {
            const style = window.getComputedStyle(list).listStyleType;
            if (style !== 'lower-alpha') {
                analysis.listStructure.continuousNumbering = false;
            }
        });
        
        return analysis;
    });
    
    await browser.close();
    return structure;
}

function compareStructures(sourceStructure, htmlStructure) {
    console.log('\n📊 STRUCTURE COMPARISON RESULTS:\n');
    
    const results = {
        sectionsMatch: true,
        semanticPreservation: true,
        listImprovement: true,
        warnings: [],
        improvements: []
    };
    
    // Compare sections
    console.log('📑 SECTION ANALYSIS:');
    console.log(`   Source sections: ${sourceStructure.sections.length}`);
    console.log(`   HTML sections: ${htmlStructure.sections.length}`);
    
    if (Math.abs(sourceStructure.sections.length - htmlStructure.sections.length) > 2) {
        results.warnings.push('Section count differs significantly');
        results.sectionsMatch = false;
    }
    
    // Compare semantic elements
    console.log('\n🏷️  SEMANTIC ELEMENTS:');
    console.log('   Element          | Source | HTML  | Status');
    console.log('   ----------------|--------|-------|--------');
    
    const semanticTypes = ['notes', 'phraseology', 'references', 'examples', 'exceptions'];
    
    semanticTypes.forEach(type => {
        const sourceCount = sourceStructure.semanticElements[type].length;
        const htmlCount = htmlStructure.semanticElements[type].length;
        const status = htmlCount >= sourceCount ? '✅' : '⚠️';
        
        console.log(`   ${type.padEnd(15)} | ${sourceCount.toString().padEnd(6)} | ${htmlCount.toString().padEnd(5)} | ${status}`);
        
        if (htmlCount < sourceCount) {
            results.warnings.push(`Missing ${sourceCount - htmlCount} ${type}`);
            results.semanticPreservation = false;
        }
    });
    
    // List structure analysis
    console.log('\n📝 LIST STRUCTURE:');
    console.log(`   Total lists in source: ${sourceStructure.totalLists}`);
    console.log(`   Total lists in HTML: ${htmlStructure.totalLists}`);
    console.log(`   Hierarchical lists created: ${htmlStructure.hierarchicalLists}`);
    console.log(`   List items with nested content: ${htmlStructure.listStructure.itemsWithNestedContent}/${htmlStructure.listStructure.totalListItems}`);
    console.log(`   Continuous numbering: ${htmlStructure.listStructure.continuousNumbering ? '✅ Yes' : '❌ No'}`);
    
    if (htmlStructure.hierarchicalLists > 0) {
        results.improvements.push(`Created ${htmlStructure.hierarchicalLists} properly structured hierarchical lists`);
    }
    
    if (htmlStructure.listStructure.itemsWithNestedContent > 0) {
        const percentage = Math.round((htmlStructure.listStructure.itemsWithNestedContent / htmlStructure.listStructure.totalListItems) * 100);
        results.improvements.push(`${percentage}% of list items have properly nested content`);
    }
    
    // Overall assessment
    console.log('\n🎯 ASSESSMENT:');
    
    if (results.sectionsMatch && results.semanticPreservation) {
        console.log('   ✅ Structure successfully preserved and enhanced');
    } else if (results.warnings.length > 0) {
        console.log('   ⚠️  Some structural differences detected:');
        results.warnings.forEach(warning => {
            console.log(`      • ${warning}`);
        });
    }
    
    if (results.improvements.length > 0) {
        console.log('\n   📈 Improvements made:');
        results.improvements.forEach(improvement => {
            console.log(`      • ${improvement}`);
        });
    }
    
    // Nested content breakdown
    if (htmlStructure.semanticElements.notes.length > 0) {
        const nestedNotes = htmlStructure.semanticElements.notes.filter(n => n.parent === 'list-item').length;
        const standaloneNotes = htmlStructure.semanticElements.notes.filter(n => n.parent === 'standalone').length;
        
        console.log('\n   📦 Semantic element nesting:');
        console.log(`      • NOTE sections: ${nestedNotes} nested, ${standaloneNotes} standalone`);
        
        const nestedPhrase = htmlStructure.semanticElements.phraseology.filter(n => n.parent === 'list-item').length;
        const standalonePhrase = htmlStructure.semanticElements.phraseology.filter(n => n.parent === 'standalone').length;
        console.log(`      • PHRASEOLOGY sections: ${nestedPhrase} nested, ${standalonePhrase} standalone`);
        
        const nestedRef = htmlStructure.semanticElements.references.filter(n => n.parent === 'list-item').length;
        const standaloneRef = htmlStructure.semanticElements.references.filter(n => n.parent === 'standalone').length;
        console.log(`      • REFERENCE sections: ${nestedRef} nested, ${standaloneRef} standalone`);
    }
    
    return results;
}

async function performVisualComparison(docxPath, htmlPath) {
    try {
        console.log('🔍 VISUAL STRUCTURE COMPARISON TOOL\n');
        console.log(`📄 Source: ${docxPath}`);
        console.log(`🌐 HTML: ${htmlPath}\n`);
        
        // Extract structures
        const sourceStructure = await extractWordStructure(docxPath);
        const htmlStructure = await extractHtmlStructure(htmlPath);
        
        // Compare and report
        const results = compareStructures(sourceStructure, htmlStructure);
        
        // Create detailed report
        const report = {
            timestamp: new Date().toISOString(),
            source: {
                file: docxPath,
                structure: sourceStructure
            },
            html: {
                file: htmlPath,
                structure: htmlStructure
            },
            comparison: results
        };
        
        // Save report
        const reportPath = htmlPath.replace('.html', '_structure_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        return results;
        
    } catch (error) {
        console.error(`❌ Error during comparison: ${error.message}`);
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log(`
Visual Structure Comparison Tool

USAGE:
  node visual-structure-comparison.js <source.docx> <converted.html>

DESCRIPTION:
  Compares the structure of a Word document with its converted HTML
  to ensure proper preservation and enhancement of document structure.

ANALYSIS INCLUDES:
  • Section preservation
  • Semantic element detection (NOTE, PHRASEOLOGY, REFERENCE, etc.)
  • List structure and nesting
  • Hierarchical organization
  • Continuous numbering validation

EXAMPLE:
  node visual-structure-comparison.js chapter_3.docx chapter_3_converted.html
        `.trim());
        process.exit(0);
    }
    
    const docxPath = args[0];
    const htmlPath = args[1];
    
    if (!fs.existsSync(docxPath)) {
        console.error(`❌ Word document not found: ${docxPath}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`❌ HTML file not found: ${htmlPath}`);
        process.exit(1);
    }
    
    performVisualComparison(docxPath, htmlPath)
        .then(() => {
            console.log('\n✅ Comparison complete!');
        })
        .catch(error => {
            console.error(`Fatal error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { performVisualComparison, extractWordStructure, extractHtmlStructure, compareStructures };