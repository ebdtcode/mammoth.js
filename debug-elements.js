#!/usr/bin/env node

const mammoth = require('./lib/index');

// Debug handler that logs all unrecognized elements
mammoth.handlers.registerFallback(function(element, messages, options) {
    console.log('🔍 Unrecognized element:', {
        name: element.name,
        type: element.type,
        namespace: element.namespace,
        attributes: element.attributes || {},
        children: element.children ? element.children.length : 0
    });
    
    // Return empty array to suppress the default warning but capture info
    return [];
});

async function debugConversion(inputPath) {
    console.log('🐛 Debug mode - analyzing document elements...\n');
    
    try {
        const result = await mammoth.convertToHtml({
            path: inputPath
        });
        
        console.log('\n✅ Analysis complete');
        console.log('Messages:', result.messages.length);
        
        return result;
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const inputPath = process.argv[2];
    if (!inputPath) {
        console.log('Usage: node debug-elements.js <input.docx>');
        process.exit(1);
    }
    
    debugConversion(inputPath).catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}