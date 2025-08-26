/**
 * Example demonstrating the extensible element handler system in mammoth.js
 * 
 * This example shows how to:
 * 1. Register custom handlers for unsupported document elements
 * 2. Handle both DOCX and OpenOffice elements
 * 3. Create fallback handlers for unknown elements
 * 4. Use different handler priorities
 * 5. Access conversion utilities from within handlers
 */

var mammoth = require("../lib/");
var Html = require("../lib/html");

// Example 1: Register a handler for custom drawing elements
mammoth.handlers.register({
    elementNames: ["draw:custom-shape", "draw:annotation"],
    namespace: "draw",
    priority: 200,
    description: "Custom handler for OpenOffice drawing annotations",
    handler: function(element, messages, options) {
        console.log("Handling drawing element:", element.name);
        
        // Extract text content if any
        var textContent = extractTextContent(element);
        
        // Create a styled placeholder
        return [Html.freshElement("div", {
            class: "custom-drawing",
            style: "border: 2px solid #4CAF50; padding: 10px; margin: 5px 0; background-color: #E8F5E8;",
            title: "Custom drawing: " + element.name
        }, [
            Html.text("🎨 " + (textContent || "Custom Drawing Element"))
        ])];
    }
});

// Example 2: Register a handler for complex field elements
mammoth.handlers.register({
    elementNames: ["w:sdt", "w:sdtContent"],
    namespace: "w",
    priority: 180,
    description: "Handler for Word content controls (structured document tags)",
    handler: function(element, messages, options) {
        console.log("Handling content control:", element.name);
        
        // Check if this is a content control
        if (element.name === "w:sdt") {
            var alias = getContentControlAlias(element);
            var tag = getContentControlTag(element);
            
            messages.push({
                type: "info",
                message: "Content control converted: " + (alias || tag || "unnamed")
            });
            
            // Process the content
            var content = [];
            if (element.children) {
                element.children.forEach(function(child) {
                    if (child.name === "w:sdtContent") {
                        // Use the conversion pipeline to process content
                        var converted = options.convertElements(child.children || [], messages, options);
                        content = content.concat(converted);
                    }
                });
            }
            
            // Wrap in a styled container
            return [Html.freshElement("div", {
                class: "content-control",
                "data-alias": alias,
                "data-tag": tag,
                style: "border-left: 3px solid #2196F3; padding-left: 8px; margin: 5px 0;"
            }, content)];
        }
        
        // For sdtContent, just process children
        if (element.children) {
            return options.convertElements(element.children, messages, options);
        }
        
        return [];
    }
});

// Example 3: Register a handler for math equations with MathJax support
mammoth.handlers.register({
    elementNames: ["m:oMath", "m:oMathPara"],
    namespace: "m",
    priority: 250,
    description: "Enhanced math handler with MathJax support",
    handler: function(element, messages, options) {
        console.log("Handling math element:", element.name);
        
        // Extract the math content
        var mathText = extractMathText(element);
        
        // Check if MathJax support is requested
        if (options.mathJax || options.outputMathML) {
            // Create MathJax-compatible markup
            var mathElement = Html.freshElement("script", {
                type: "math/tex" + (element.name === "m:oMathPara" ? "; mode=display" : "")
            }, [Html.text(mathText)]);
            
            if (element.name === "m:oMathPara") {
                return [Html.freshElement("div", {class: "math-display"}, [mathElement])];
            } else {
                return [Html.freshElement("span", {class: "math-inline"}, [mathElement])];
            }
        } else {
            // Create a styled placeholder
            var containerTag = element.name === "m:oMathPara" ? "div" : "span";
            var containerClass = element.name === "m:oMathPara" ? "math-placeholder-block" : "math-placeholder-inline";
            var containerStyle = element.name === "m:oMathPara" ? 
                "display: block; text-align: center; margin: 10px 0; padding: 10px; background-color: #FFF3E0; border: 1px solid #FF9800;" :
                "background-color: #FFF3E0; border: 1px solid #FF9800; padding: 2px 4px; border-radius: 3px;";
            
            return [Html.freshElement(containerTag, {
                class: containerClass,
                style: containerStyle,
                title: "Math equation: " + mathText.substring(0, 50) + (mathText.length > 50 ? "..." : "")
            }, [Html.text("📐 " + (mathText || "Math Equation"))])];
        }
    }
});

// Example 4: Register a handler for multimedia elements
mammoth.handlers.register({
    elementNames: ["w:object", "w:pict", "draw:object"],
    priority: 150,
    description: "Enhanced multimedia handler with different placeholder styles",
    handler: function(element, messages, options) {
        console.log("Handling multimedia element:", element.name);
        
        var objectType = determineMultimediaType(element);
        var objectInfo = extractObjectInfo(element);
        
        messages.push({
            type: "warning", 
            message: "Multimedia object converted to placeholder: " + objectType
        });
        
        // Create different placeholders based on object type
        var placeholderConfig = getPlaceholderConfig(objectType);
        
        return [Html.freshElement("div", {
            class: "media-placeholder " + placeholderConfig.class,
            style: placeholderConfig.style,
            title: objectInfo.description || "Multimedia object: " + objectType,
            "data-object-type": objectType
        }, [
            Html.text(placeholderConfig.icon + " " + placeholderConfig.label),
            objectInfo.name ? Html.freshElement("br", {}) : null,
            objectInfo.name ? Html.freshElement("small", {style: "color: #666;"}, [Html.text(objectInfo.name)]) : null
        ].filter(Boolean))];
    }
});

// Example 5: Register a smart fallback handler
mammoth.handlers.registerFallback(function(element, messages, options) {
    var elementName = element.name || element.type;
    
    // Skip elements that should be ignored
    if (isIgnorableElement(elementName)) {
        return null;
    }
    
    console.log("Fallback handler for:", elementName);
    
    // Try to extract meaningful content
    var textContent = extractTextContent(element);
    var hasAttributes = element.attributes && Object.keys(element.attributes).length > 0;
    
    if (textContent && textContent.trim()) {
        messages.push({
            type: "info",
            message: "Unknown element '" + elementName + "' converted to text: " + textContent.substring(0, 50) + (textContent.length > 50 ? "..." : "")
        });
        
        return [Html.freshElement("span", {
            class: "unknown-element-text",
            "data-original-element": elementName,
            title: "Original element: " + elementName
        }, [Html.text(textContent)])];
    } else if (hasAttributes || element.children) {
        messages.push({
            type: "info",
            message: "Unknown element '" + elementName + "' converted to placeholder"
        });
        
        return [Html.freshElement("span", {
            class: "unknown-element-placeholder",
            style: "background-color: #FFF9C4; border: 1px dashed #F57F17; padding: 1px 3px; font-size: 0.8em;",
            title: "Unknown element: " + elementName + (hasAttributes ? " (with attributes)" : "") + (element.children ? " (with children)" : "")
        }, [Html.text("[" + elementName + "]")])];
    }
    
    // Return null to let the next fallback handler try
    return null;
}, 10);

// Example 6: Register a specialized table handler for complex features
mammoth.handlers.register({
    elementNames: ["w:tbl"],
    namespace: "w", 
    priority: 300, // Higher priority than built-in table handler
    description: "Enhanced table handler with advanced formatting",
    handler: function(element, messages, options) {
        console.log("Using enhanced table handler");
        
        // Check if this table has complex features that need special handling
        if (hasComplexTableFeatures(element)) {
            messages.push({
                type: "info",
                message: "Table with advanced features detected"
            });
            
            // Use the specialized table handler
            var TableHandler = require("../lib/handlers/table-handler");
            return TableHandler.handle(element, messages, options);
        } else {
            // Fall back to default table handling by returning null
            // This allows the built-in table converter to handle it
            return null;
        }
    }
});

// Utility functions for the examples

function extractTextContent(element) {
    if (element.type === "text") {
        return element.value || "";
    }
    
    if (element.children && Array.isArray(element.children)) {
        return element.children.map(extractTextContent).join(" ");
    }
    
    return "";
}

function getContentControlAlias(element) {
    var sdtPr = findChildElement(element, "w:sdtPr");
    if (sdtPr) {
        var alias = findChildElement(sdtPr, "w:alias");
        return alias && alias.attributes ? alias.attributes["w:val"] : null;
    }
    return null;
}

function getContentControlTag(element) {
    var sdtPr = findChildElement(element, "w:sdtPr");
    if (sdtPr) {
        var tag = findChildElement(sdtPr, "w:tag");
        return tag && tag.attributes ? tag.attributes["w:val"] : null;
    }
    return null;
}

function findChildElement(element, name) {
    if (element.children) {
        return element.children.find(function(child) {
            return child.name === name;
        });
    }
    return null;
}

function extractMathText(element) {
    // Simple math text extraction - in practice this would be more sophisticated
    var text = extractTextContent(element);
    return text || "Math Expression";
}

function determineMultimediaType(element) {
    var name = element.name || "";
    
    if (name.includes("object")) {
        return "object";
    } else if (name.includes("pict")) {
        return "picture"; 
    } else if (name.includes("draw")) {
        return "drawing";
    }
    
    return "unknown";
}

function extractObjectInfo(element) {
    return {
        name: element.attributes && element.attributes["name"],
        description: element.attributes && element.attributes["description"],
        type: element.attributes && element.attributes["type"]
    };
}

function getPlaceholderConfig(objectType) {
    var configs = {
        "object": {
            class: "object-placeholder",
            style: "border: 2px solid #FF9800; background-color: #FFF3E0; padding: 15px; text-align: center; margin: 10px 0;",
            icon: "📄",
            label: "Embedded Object"
        },
        "picture": {
            class: "picture-placeholder", 
            style: "border: 2px solid #9C27B0; background-color: #F3E5F5; padding: 15px; text-align: center; margin: 10px 0;",
            icon: "🖼️",
            label: "Picture"
        },
        "drawing": {
            class: "drawing-placeholder",
            style: "border: 2px solid #4CAF50; background-color: #E8F5E8; padding: 15px; text-align: center; margin: 10px 0;", 
            icon: "🎨",
            label: "Drawing"
        }
    };
    
    return configs[objectType] || configs["object"];
}

function isIgnorableElement(elementName) {
    var ignorableElements = [
        "w:bookmarkStart",
        "w:bookmarkEnd", 
        "w:proofErr",
        "w:noProof",
        "w:lang",
        "w:rsidR",
        "w:rsidRDefault"
    ];
    
    return ignorableElements.indexOf(elementName) !== -1;
}

function hasComplexTableFeatures(element) {
    // Check for merged cells, nested tables, complex borders, etc.
    // This is a simplified check - in practice would be more comprehensive
    
    if (!element.children) return false;
    
    // Look for merged cells
    for (var i = 0; i < element.children.length; i++) {
        var row = element.children[i];
        if (row.children) {
            for (var j = 0; j < row.children.length; j++) {
                var cell = row.children[j];
                var tcPr = findChildElement(cell, "w:tcPr");
                if (tcPr) {
                    if (findChildElement(tcPr, "w:gridSpan") || findChildElement(tcPr, "w:vMerge")) {
                        return true;
                    }
                }
            }
        }
    }
    
    return false;
}

// Usage example
console.log("Custom element handlers registered!");
console.log("Available handlers:", mammoth.handlers.getHandlerInfo().length);

// Example conversion (this would be used in your application)
function convertWithCustomHandlers(inputPath, outputPath) {
    var fs = require("fs");
    
    mammoth.convertToHtml({path: inputPath}, {
        // Enable MathJax support for math handlers  
        mathJax: true,
        
        // Custom style mappings
        styleMap: [
            "p[style-name='Custom Style'] => div.custom-paragraph"
        ]
    })
    .then(function(result) {
        console.log("Conversion completed with " + result.messages.length + " messages");
        
        result.messages.forEach(function(message) {
            console.log(message.type + ": " + message.message);
        });
        
        if (outputPath) {
            fs.writeFileSync(outputPath, result.value);
            console.log("Output written to:", outputPath);
        } else {
            console.log("HTML output:", result.value.substring(0, 200) + "...");
        }
    })
    .catch(function(error) {
        console.error("Conversion failed:", error);
    });
}

// Example usage (commented out - uncomment to test with real files)
// convertWithCustomHandlers("test-document.docx", "output.html");

module.exports = {
    convertWithCustomHandlers: convertWithCustomHandlers
};