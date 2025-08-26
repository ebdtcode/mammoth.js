// Example demonstrating enhanced table formatting in mammoth.js
var mammoth = require("../lib");

// Example of converting a document with enhanced table formatting
mammoth.convertToHtml(
    {
        path: "example-with-tables.docx"
    },
    {
        // Enable enhanced table formatting
        enhancedTableFormatting: true,
        
        // Optional: Custom style mappings for table elements
        styleMap: [
            "table => table.custom-table",
            "table.table-heading => table.heading-table",
            "tr.table-header => tr.header-row",
            "td.table-cell => td.formatted-cell"
        ]
    }
).then(function(result) {
    console.log("Converted HTML with enhanced table formatting:");
    console.log(result.value);
    
    // The generated HTML now includes:
    // - Border styles from Word documents
    // - Cell background colors and patterns
    // - Column width information
    // - Cell padding and alignment
    // - Proper merged cell handling
    // - Table alignment and spacing
    
    if (result.messages && result.messages.length > 0) {
        console.log("\nConversion messages:");
        result.messages.forEach(function(message) {
            console.log("- " + message.message);
        });
    }
}).catch(function(error) {
    console.error("Error:", error);
});

/*
Enhanced table features now supported:

1. XML Node Operations:
   - Fixed "Not implemented" error in text() method
   - Added XPath-like node selection with selectNodes()
   - XSLT-like transformation capabilities
   - Enhanced element traversal methods

2. Table Formatting:
   - Border styles (w:tblBorders, w:tcBorders)
   - Cell backgrounds and patterns (w:shd)
   - Column widths (w:tblGrid)
   - Table alignment (w:jc)
   - Cell spacing and padding
   - Row heights and properties
   - Vertical cell alignment
   - Text direction support

3. Merged Cell Support:
   - Enhanced vertical merge handling
   - Complex table layout support
   - Proper colspan/rowspan calculation
   - Better error handling for malformed tables

4. OpenOffice Support:
   - table:table, table:table-row, table:table-cell elements
   - OpenOffice text content (text:p, text:span)
   - Column width definitions
   - Merged cell support for ODF format

5. CSS Generation:
   - Automatic border CSS generation
   - Background color and pattern styles
   - Responsive width calculations
   - Proper vertical alignment
   - Support for various units (dxa, pct, etc.)

The implementation maintains full backward compatibility while adding
comprehensive table formatting support for both DOCX and OpenOffice formats.
*/