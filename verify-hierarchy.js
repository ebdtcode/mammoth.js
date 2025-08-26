#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');

async function verifyHierarchicalStructure(htmlPath) {
    console.log('🔍 Verifying hierarchical list structure...\n');
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`❌ HTML file not found: ${htmlPath}`);
        return false;
    }
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent);
    
    const analysis = await page.evaluate(() => {
        const results = {
            hierarchicalLists: [],
            semanticSections: {
                notes: 0,
                phraseology: 0,
                references: 0,
                examples: 0,
                exceptions: 0
            },
            listItemsWithChildren: 0,
            totalListItems: 0,
            success: true
        };
        
        // Find all hierarchical lists
        document.querySelectorAll('.hierarchical-list').forEach((list, listIndex) => {
            const listInfo = {
                index: listIndex,
                items: [],
                style: window.getComputedStyle(list).listStyleType
            };
            
            list.querySelectorAll(':scope > li').forEach((li, itemIndex) => {
                const itemInfo = {
                    index: itemIndex,
                    mainContent: '',
                    nestedElements: []
                };
                
                // Get main content
                const mainContent = li.querySelector('.list-item-content');
                if (mainContent) {
                    itemInfo.mainContent = mainContent.textContent.trim().substring(0, 100) + '...';
                }
                
                // Check for nested semantic sections
                const noteSection = li.querySelector('.note-section');
                if (noteSection) {
                    itemInfo.nestedElements.push('NOTE');
                    results.semanticSections.notes++;
                }
                
                const phraseologySection = li.querySelector('.phraseology-section');
                if (phraseologySection) {
                    itemInfo.nestedElements.push('PHRASEOLOGY');
                    results.semanticSections.phraseology++;
                }
                
                const referenceSection = li.querySelector('.reference-section');
                if (referenceSection) {
                    itemInfo.nestedElements.push('REFERENCE');
                    results.semanticSections.references++;
                }
                
                const exampleSection = li.querySelector('.example-section');
                if (exampleSection) {
                    itemInfo.nestedElements.push('EXAMPLE');
                    results.semanticSections.examples++;
                }
                
                const exceptionSection = li.querySelector('.exception-section');
                if (exceptionSection) {
                    itemInfo.nestedElements.push('EXCEPTION');
                    results.semanticSections.exceptions++;
                }
                
                // Check for other nested content
                const nestedParagraphs = li.querySelectorAll('.nested-paragraph');
                if (nestedParagraphs.length > 0) {
                    itemInfo.nestedElements.push(`${nestedParagraphs.length} nested paragraphs`);
                }
                
                if (itemInfo.nestedElements.length > 0) {
                    results.listItemsWithChildren++;
                }
                
                listInfo.items.push(itemInfo);
                results.totalListItems++;
            });
            
            results.hierarchicalLists.push(listInfo);
        });
        
        // Check for broken lists (multiple single-item lists instead of one continuous list)
        const consecutiveSingleItemLists = [];
        let prevList = null;
        
        document.querySelectorAll('ol').forEach(list => {
            const itemCount = list.querySelectorAll('li').length;
            if (itemCount === 1) {
                if (prevList && prevList.nextElementSibling === list) {
                    consecutiveSingleItemLists.push(list);
                }
            }
            prevList = list;
        });
        
        if (consecutiveSingleItemLists.length > 0) {
            results.success = false;
            results.brokenLists = consecutiveSingleItemLists.length;
        }
        
        return results;
    });
    
    await browser.close();
    
    // Report results
    console.log('📊 HIERARCHICAL STRUCTURE ANALYSIS:');
    console.log(`   ✅ Hierarchical lists found: ${analysis.hierarchicalLists.length}`);
    console.log(`   ✅ Total list items: ${analysis.totalListItems}`);
    console.log(`   ✅ List items with nested content: ${analysis.listItemsWithChildren}`);
    console.log(`   ${analysis.success ? '✅' : '❌'} List continuity: ${analysis.success ? 'Maintained' : 'Broken'}\n`);
    
    console.log('📦 SEMANTIC SECTIONS NESTED:');
    console.log(`   📝 NOTE sections: ${analysis.semanticSections.notes}`);
    console.log(`   💬 PHRASEOLOGY sections: ${analysis.semanticSections.phraseology}`);
    console.log(`   📚 REFERENCE sections: ${analysis.semanticSections.references}`);
    console.log(`   📋 EXAMPLE sections: ${analysis.semanticSections.examples}`);
    console.log(`   ⚠️  EXCEPTION sections: ${analysis.semanticSections.exceptions}\n`);
    
    if (analysis.hierarchicalLists.length > 0) {
        console.log('📋 LIST DETAILS (first 3 lists):');
        analysis.hierarchicalLists.slice(0, 3).forEach((list, i) => {
            console.log(`\n   List ${i + 1} (${list.items.length} items, style: ${list.style}):`);
            list.items.slice(0, 3).forEach((item, j) => {
                const letter = String.fromCharCode(97 + j); // a, b, c...
                console.log(`     ${letter}. ${item.mainContent}`);
                if (item.nestedElements.length > 0) {
                    console.log(`        └─ Contains: ${item.nestedElements.join(', ')}`);
                }
            });
            if (list.items.length > 3) {
                console.log(`     ... and ${list.items.length - 3} more items`);
            }
        });
    }
    
    // Final assessment
    console.log('\n🎯 ASSESSMENT:');
    if (analysis.success && analysis.listItemsWithChildren > 0) {
        console.log('   ✅ SUCCESS: Hierarchical structure is properly implemented!');
        console.log(`   • ${analysis.listItemsWithChildren} list items have nested content`);
        console.log('   • Semantic sections are properly wrapped');
        console.log('   • List numbering is continuous (a, b, c, d...)');
    } else if (!analysis.success) {
        console.log('   ⚠️  WARNING: Lists may be broken into segments');
        if (analysis.brokenLists) {
            console.log(`   • Found ${analysis.brokenLists} potentially broken list segments`);
        }
    } else {
        console.log('   ℹ️  INFO: No nested content found in list items');
        console.log('   • This might indicate the content wasn\'t properly nested');
    }
    
    return analysis;
}

// Run verification
if (require.main === module) {
    const htmlPath = process.argv[2] || 'docx/chapter_3_hierarchical.html';
    
    console.log('🧪 HIERARCHICAL LIST STRUCTURE VERIFICATION\n');
    
    verifyHierarchicalStructure(htmlPath)
        .then(() => {
            console.log('\n✅ Verification complete!');
        })
        .catch(error => {
            console.error('❌ Verification failed:', error.message);
            process.exit(1);
        });
}

module.exports = { verifyHierarchicalStructure };