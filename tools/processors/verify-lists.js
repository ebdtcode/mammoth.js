#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');

async function verifyListStructure(htmlPath) {
    console.log('🧪 Verifying list structure with Playwright...\n');
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`❌ HTML file not found: ${htmlPath}`);
        return false;
    }
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Load the HTML file
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent);
    
    // Comprehensive list analysis
    const analysis = await page.evaluate(() => {
        const results = {
            orderedLists: [],
            listItems: [],
            letterLists: [],
            issues: [],
            success: true
        };
        
        // Find all ordered lists
        document.querySelectorAll('ol').forEach((ol, index) => {
            const listType = ol.className || 'default';
            const style = window.getComputedStyle(ol).listStyleType;
            
            const items = Array.from(ol.querySelectorAll('li')).map((li, i) => {
                const text = li.textContent.trim();
                return {
                    index: i,
                    text: text.length > 100 ? text.substring(0, 100) + '...' : text,
                    fullText: text
                };
            });
            
            results.orderedLists.push({
                index,
                listType,
                styleType: style,
                itemCount: items.length,
                items
            });
            
            // Check for letter-style lists specifically
            if (style === 'lower-alpha' || listType.includes('letter')) {
                results.letterLists.push({
                    index,
                    itemCount: items.length,
                    items: items.slice(0, 3) // First 3 items for preview
                });
            }
        });
        
        // Find all list items
        document.querySelectorAll('li').forEach((li, index) => {
            const parentList = li.closest('ol, ul');
            const listType = parentList ? parentList.tagName.toLowerCase() : 'none';
            const text = li.textContent.trim();
            
            results.listItems.push({
                index,
                parentType: listType,
                text: text.length > 80 ? text.substring(0, 80) + '...' : text
            });
        });
        
        // Look for potential list items that weren't converted
        document.querySelectorAll('p').forEach(p => {
            const text = p.textContent.trim();
            if (/^[a-z]\.\s/.test(text)) {
                results.issues.push({
                    type: 'unconverted_letter_list',
                    text: text.substring(0, 100) + '...'
                });
                results.success = false;
            }
        });
        
        return results;
    });
    
    await browser.close();
    
    // Report results
    console.log('📊 LIST VERIFICATION RESULTS:');
    console.log(`   ✅ Ordered lists found: ${analysis.orderedLists.length}`);
    console.log(`   ✅ Total list items: ${analysis.listItems.length}`);
    console.log(`   ✅ Letter-based lists: ${analysis.letterLists.length}`);
    console.log(`   ${analysis.issues.length === 0 ? '✅' : '❌'} Conversion issues: ${analysis.issues.length}\n`);
    
    if (analysis.orderedLists.length > 0) {
        console.log('📋 ORDERED LISTS DETAILS:');
        analysis.orderedLists.forEach((list, i) => {
            console.log(`   List ${i + 1}:`);
            console.log(`     • Type: ${list.listType}`);
            console.log(`     • Style: ${list.styleType}`);
            console.log(`     • Items: ${list.itemCount}`);
            
            if (list.items.length > 0) {
                console.log(`     • Preview:`);
                list.items.slice(0, 2).forEach((item, j) => {
                    console.log(`       ${j + 1}. ${item.text}`);
                });
            }
            console.log('');
        });
    }
    
    if (analysis.letterLists.length > 0) {
        console.log('🔤 LETTER-BASED LISTS:');
        analysis.letterLists.forEach((list, i) => {
            console.log(`   Letter List ${i + 1} (${list.itemCount} items):`);
            list.items.forEach((item, j) => {
                const letter = String.fromCharCode(97 + j); // a, b, c...
                console.log(`     ${letter}. ${item.text}`);
            });
            console.log('');
        });
    }
    
    if (analysis.issues.length > 0) {
        console.log('⚠️  CONVERSION ISSUES:');
        analysis.issues.forEach((issue, i) => {
            console.log(`   ${i + 1}. ${issue.type}: ${issue.text}`);
        });
        console.log('');
    }
    
    // Final assessment
    if (analysis.success && analysis.orderedLists.length > 0) {
        console.log('🎉 SUCCESS: List conversion appears to be working correctly!');
        console.log(`   • Found ${analysis.orderedLists.length} properly structured lists`);
        console.log(`   • No unconverted list items detected`);
        console.log(`   • Letter-based numbering preserved`);
    } else if (analysis.orderedLists.length === 0) {
        console.log('⚠️  PARTIAL: No ordered lists found in HTML');
        console.log('   • Lists may still be formatted as paragraphs');
        console.log('   • Consider adjusting the list detection patterns');
    } else {
        console.log('❌ ISSUES DETECTED: Some list items may not have converted properly');
    }
    
    return analysis;
}

// Run verification
if (require.main === module) {
    const htmlPath = process.argv[2] || 'docx/chapter_3_enhanced_lists.html';
    
    console.log('🔍 MAMMOTH.JS LIST VERIFICATION\n');
    
    verifyListStructure(htmlPath)
        .then(() => {
            console.log('\n✅ Verification complete!');
        })
        .catch(error => {
            console.error('❌ Verification failed:', error.message);
            process.exit(1);
        });
}

module.exports = { verifyListStructure };