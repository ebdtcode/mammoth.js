/**
 * Usage example for the enhanced document matcher system
 * This demonstrates how to use the registry, plugins, configuration, and XSLT features
 */

var styleReader = require("../style-reader");
var ExtendedBreakPlugin = require("./plugins/extended-break-plugin");
var CustomElementPlugin = require("./plugins/custom-element-plugin");
var XsltProcessor = require("./xslt-processor");
var MatcherConfiguration = require("./matcher-configuration");

// Example 1: Basic usage with unknown matcher types
console.log("=== Example 1: Basic Usage ===");

// This will now handle unknown break types gracefully
var unknownBreakResult = styleReader.readStyle('br[type="custom-section"] => p');
console.log("Unknown break type result:", unknownBreakResult);

// Example 2: Register and use plugins
console.log("\n=== Example 2: Plugin Usage ===");

// Register the extended break plugin
var extendedBreakPlugin = new ExtendedBreakPlugin();
var pluginResult = styleReader.registerPlugin(extendedBreakPlugin);
console.log("Plugin registration result:", pluginResult);

// Register the custom element plugin
var customElementPlugin = new CustomElementPlugin();
styleReader.registerPlugin(customElementPlugin);

// Now these break types will be supported
var sectionBreakResult = styleReader.readStyle('br[type="section"] => p');
console.log("Section break result:", sectionBreakResult);

// Test form field matching
var formFieldResult = styleReader.readStyle('form-field[fieldType="text"] => input');
console.log("Form field result:", formFieldResult);

// Example 3: Configuration-based setup
console.log("\n=== Example 3: Configuration ===");

var config = {
    matchers: {
        "watermark": {
            template: {
                elementType: "text",
                conditions: [
                    {
                        type: "property",
                        property: "type",
                        value: "watermark"
                    }
                ]
            },
            options: {
                priority: 10,
                namespace: "document-elements",
                description: "Matches watermark text elements"
            }
        },
        "footnote-ref": {
            template: {
                elementType: "reference",
                conditions: [
                    {
                        type: "property",
                        property: "referenceType",
                        value: "footnote"
                    }
                ]
            }
        }
    },
    errorHandling: {
        strictMode: false,
        enableSuggestions: true,
        fallbackStrategy: "suggest-alternatives"
    }
};

var configResult = styleReader.configureMatchers(config);
console.log("Configuration result:", configResult);

// Test the configured matchers
var watermarkResult = styleReader.readStyle('watermark => span.watermark');
console.log("Watermark matcher result:", watermarkResult);

// Example 4: XSLT-based matching
console.log("\n=== Example 4: XSLT Matching ===");

try {
    var xsltProcessor = new XsltProcessor();
    
    // Define common templates
    xsltProcessor.defineCommonTemplates();
    
    // Register the XSLT processor with the registry
    styleReader.registry.registerXsltTransform("complex-style", "./transforms/complex-style-matcher.xsl", {
        priority: 20,
        caching: true
    });
    
    // Create a custom XSLT-based matcher
    var xsltMatcherResult = xsltProcessor.createMatcher("style-matcher", {
        parameters: {
            styleId: "Heading1",
            matchMode: "exact"
        }
    });
    
    console.log("XSLT matcher creation result:", xsltMatcherResult.value ? "Success" : "Failed");
    
} catch (error) {
    console.log("XSLT example skipped (dependencies not available):", error.message);
}

// Example 5: Error handling and suggestions
console.log("\n=== Example 5: Error Handling ===");

// Try an unknown matcher type to see suggestions
var unknownResult = styleReader.readStyle('unknown-element[type="test"] => div');
console.log("Unknown element result:", unknownResult);

// Check what matchers are available
var availableTypes = styleReader.registry.getAvailableTypes();
console.log("Available matcher types:", availableTypes);

// Get information about a specific matcher
var matcherInfo = styleReader.registry.getMatcherInfo("paragraph");
console.log("Paragraph matcher info:", matcherInfo);

// Example 6: Advanced configuration with file loading
console.log("\n=== Example 6: File Configuration ===");

try {
    // Load configuration from JSON file
    var fileConfigResult = styleReader.configureMatchers("./styles/example-matcher-config.json");
    console.log("File configuration result:", fileConfigResult);
    
    // Test matchers defined in the configuration file
    var footnoteResult = styleReader.readStyle('footnote => span.footnote');
    console.log("Footnote matcher result:", footnoteResult);
    
} catch (error) {
    console.log("File configuration example failed:", error.message);
}

// Example 7: Registry inspection and debugging
console.log("\n=== Example 7: Registry Inspection ===");

// Get all available types after configuration
var allTypes = styleReader.registry.getAvailableTypes();
console.log("All available matcher types after configuration:");
allTypes.forEach(function(type) {
    var info = styleReader.registry.getMatcherInfo(type);
    console.log("  " + type + ": " + (info ? info.description : "No description"));
});

// Test error handler capabilities
var errorHandler = styleReader.errorHandler;
var suggestions = errorHandler.getSuggestions("paragrap", allTypes);
console.log("Suggestions for 'paragrap':", suggestions);

// Example 8: Performance and caching
console.log("\n=== Example 8: Performance Features ===");

// The registry supports caching of matchers for better performance
console.log("Registry caching is enabled by default for better performance");

// XSLT transformations also support caching
console.log("XSLT transformations are cached when enabled in configuration");

// Example 9: Creating custom matchers at runtime
console.log("\n=== Example 9: Runtime Matcher Creation ===");

// Register a custom matcher directly
styleReader.registry.register("citation", function(options) {
    options = options || {};
    
    function CitationMatcher(citationOptions) {
        this._citationType = citationOptions.citationType || "any";
        this._format = citationOptions.format;
    }
    
    CitationMatcher.prototype.matches = function(element) {
        return element.type === "citation" &&
               (this._citationType === "any" || element.citationType === this._citationType) &&
               (!this._format || element.format === this._format);
    };
    
    return new CitationMatcher(options);
}, {
    priority: 15,
    namespace: "academic",
    description: "Matches citation elements with various formats"
});

// Test the custom matcher
var citationResult = styleReader.readStyle('citation[citationType="book"] => cite.book');
console.log("Custom citation matcher result:", citationResult);

console.log("\n=== Examples Complete ===");
console.log("The enhanced document matcher system provides:");
console.log("✓ Extensible matcher registry with fallback strategies");
console.log("✓ Plugin architecture for custom matcher types");
console.log("✓ Configuration-based matcher definition");
console.log("✓ XSLT transformation support for complex matching");
console.log("✓ Enhanced error handling with suggestions");
console.log("✓ Performance optimizations with caching");
console.log("✓ Runtime matcher registration capabilities");
