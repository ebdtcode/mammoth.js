var _ = require("underscore");
var documentMatchers = require("./document-matchers");
var results = require("../results");

// Registry for document matchers with extensible plugin architecture
var DocumentMatcherRegistry = function() {
    this._matchers = {};
    this._plugins = [];
    this._fallbackStrategies = [];
    this._xsltTransforms = {};
    
    // Register built-in matchers
    this._registerBuiltinMatchers();
};

DocumentMatcherRegistry.prototype._registerBuiltinMatchers = function() {
    // Break type matchers
    this.register("line", function() {
        return documentMatchers.lineBreak;
    });
    
    this.register("page", function() {
        return documentMatchers.pageBreak;
    });
    
    this.register("column", function() {
        return documentMatchers.columnBreak;
    });
    
    // Element type matchers
    this.register("paragraph", function(options) {
        return documentMatchers.paragraph(options);
    });
    
    this.register("run", function(options) {
        return documentMatchers.run(options);
    });
    
    this.register("table", function(options) {
        return documentMatchers.table(options);
    });
    
    // Text formatting matchers
    this.register("bold", function() {
        return documentMatchers.bold;
    });
    
    this.register("italic", function() {
        return documentMatchers.italic;
    });
    
    this.register("underline", function() {
        return documentMatchers.underline;
    });
    
    this.register("strikethrough", function() {
        return documentMatchers.strikethrough;
    });
    
    this.register("all-caps", function() {
        return documentMatchers.allCaps;
    });
    
    this.register("small-caps", function() {
        return documentMatchers.smallCaps;
    });
    
    this.register("highlight", function(options) {
        return documentMatchers.highlight(options);
    });
    
    this.register("comment-reference", function() {
        return documentMatchers.commentReference;
    });
};

// Register a new matcher type
DocumentMatcherRegistry.prototype.register = function(type, factory, options) {
    options = options || {};
    
    this._matchers[type] = {
        factory: factory,
        priority: options.priority || 0,
        namespace: options.namespace || "default",
        validation: options.validation || null,
        description: options.description || "Custom matcher for " + type
    };
    
    return this;
};

// Register a plugin that can provide multiple matchers
DocumentMatcherRegistry.prototype.registerPlugin = function(plugin) {
    if (!plugin || typeof plugin.register !== "function") {
        throw new Error("Plugin must have a register function");
    }
    
    this._plugins.push(plugin);
    plugin.register(this);
    
    return this;
};

// Register an XSLT transformation for complex matching
DocumentMatcherRegistry.prototype.registerXsltTransform = function(type, xsltPath, options) {
    options = options || {};
    
    this._xsltTransforms[type] = {
        path: xsltPath,
        priority: options.priority || 0,
        namespace: options.namespace || "xslt",
        caching: options.caching !== false
    };
    
    return this;
};

// Register a fallback strategy for unknown matchers
DocumentMatcherRegistry.prototype.registerFallbackStrategy = function(strategy) {
    if (!strategy || typeof strategy.handle !== "function") {
        throw new Error("Fallback strategy must have a handle function");
    }
    
    this._fallbackStrategies.push(strategy);
    return this;
};

// Create a matcher for the given type
DocumentMatcherRegistry.prototype.createMatcher = function(type, options) {
    options = options || {};
    
    // Try registered matchers first
    if (this._matchers[type]) {
        var matcherConfig = this._matchers[type];
        
        // Validate if validator provided
        if (matcherConfig.validation && !matcherConfig.validation(type, options)) {
            return results.Result(null, [results.warning("Invalid options for matcher type: " + type)]);
        }
        
        try {
            var matcher = matcherConfig.factory(options);
            return results.success(matcher);
        } catch (error) {
            return new results.Result(null, [results.error(error)]);
        }
    }
    
    // Try XSLT transforms
    if (this._xsltTransforms[type]) {
        return this._createXsltMatcher(type, options);
    }
    
    // Try fallback strategies
    for (var i = 0; i < this._fallbackStrategies.length; i++) {
        var strategy = this._fallbackStrategies[i];
        var result = strategy.handle(type, options);
        if (result.value) {
            return result;
        }
    }
    
    // Return warning for completely unknown types
    return new results.Result(null, [results.warning("Unknown document matcher type: " + type + ". Available types: " + this.getAvailableTypes().join(", "))]);
};

// Create matcher using XSLT transformation
DocumentMatcherRegistry.prototype._createXsltMatcher = function(type, options) {
    var transform = this._xsltTransforms[type];
    
    try {
        // Create XSLT-based matcher
        var XsltMatcher = function(transformPath, matcherOptions) {
            this._transformPath = transformPath;
            this._options = matcherOptions || {};
        };
        
        XsltMatcher.prototype.matches = function(element) {
            // This would need actual XSLT processor implementation
            // For now, provide a stub that can be extended
            return this._applyXsltTransform(element);
        };
        
        XsltMatcher.prototype._applyXsltTransform = function(element) {
            // Placeholder for XSLT transformation logic
            // Implementation would depend on chosen XSLT processor
            return false;
        };
        
        var matcher = new XsltMatcher(transform.path, options);
        return results.success(matcher);
        
    } catch (error) {
        return new results.Result(null, [results.error(error)]);
    }
};

// Get all available matcher types
DocumentMatcherRegistry.prototype.getAvailableTypes = function() {
    var types = Object.keys(this._matchers);
    var xsltTypes = Object.keys(this._xsltTransforms);
    return types.concat(xsltTypes).sort();
};

// Get matcher information
DocumentMatcherRegistry.prototype.getMatcherInfo = function(type) {
    if (this._matchers[type]) {
        return {
            type: type,
            namespace: this._matchers[type].namespace,
            description: this._matchers[type].description,
            priority: this._matchers[type].priority,
            source: "registered"
        };
    }
    
    if (this._xsltTransforms[type]) {
        return {
            type: type,
            namespace: this._xsltTransforms[type].namespace,
            description: "XSLT-based matcher",
            priority: this._xsltTransforms[type].priority,
            source: "xslt",
            transformPath: this._xsltTransforms[type].path
        };
    }
    
    return null;
};

// Load configuration for custom matchers
DocumentMatcherRegistry.prototype.loadConfiguration = function(config) {
    config = config || {};
    
    // Load custom matchers from configuration
    if (config.matchers) {
        var self = this;
        Object.keys(config.matchers).forEach(function(type) {
            var matcherConfig = config.matchers[type];
            
            if (matcherConfig.factory) {
                // Custom factory function
                self.register(type, matcherConfig.factory, matcherConfig.options);
            } else if (matcherConfig.template) {
                // Template-based matcher
                self._registerTemplateMatcher(type, matcherConfig);
            }
        });
    }
    
    // Load XSLT transforms from configuration
    if (config.xsltTransforms) {
        var self = this;
        Object.keys(config.xsltTransforms).forEach(function(type) {
            var transform = config.xsltTransforms[type];
            self.registerXsltTransform(type, transform.path, transform.options);
        });
    }
    
    // Load plugins from configuration
    if (config.plugins) {
        var self = this;
        config.plugins.forEach(function(pluginPath) {
            try {
                var Plugin = require(pluginPath);
                self.registerPlugin(new Plugin());
            } catch (error) {
                // Log plugin loading error but continue
                console.warn("Failed to load plugin: " + pluginPath, error.message);
            }
        });
    }
    
    return this;
};

// Register template-based matcher
DocumentMatcherRegistry.prototype._registerTemplateMatcher = function(type, config) {
    var self = this;
    
    this.register(type, function(options) {
        // Create matcher based on template
        var TemplateMatcher = function(template, matcherOptions) {
            this._template = template;
            this._options = matcherOptions || {};
        };
        
        TemplateMatcher.prototype.matches = function(element) {
            // Apply template matching logic
            return self._applyTemplate(this._template, element, this._options);
        };
        
        return new TemplateMatcher(config.template, options);
    }, config.options);
};

// Apply template matching logic
DocumentMatcherRegistry.prototype._applyTemplate = function(template, element, options) {
    // Template matching implementation
    // This is a simplified version - real implementation would be more sophisticated
    
    if (template.elementType && element.type !== template.elementType) {
        return false;
    }
    
    if (template.styleId && element.styleId !== template.styleId) {
        return false;
    }
    
    if (template.styleName && (!element.styleName || element.styleName !== template.styleName)) {
        return false;
    }
    
    // Apply additional template conditions
    if (template.conditions) {
        for (var i = 0; i < template.conditions.length; i++) {
            var condition = template.conditions[i];
            if (!this._evaluateCondition(condition, element, options)) {
                return false;
            }
        }
    }
    
    return true;
};

// Evaluate template condition
DocumentMatcherRegistry.prototype._evaluateCondition = function(condition, element, options) {
    switch (condition.type) {
    case "property":
        return element[condition.property] === condition.value;
    case "attribute":
        return element.attributes && element.attributes[condition.attribute] === condition.value;
    case "custom":
        return condition.evaluator(element, options);
    default:
        return true;
    }
};

// Create default registry instance
var defaultRegistry = new DocumentMatcherRegistry();

// Built-in fallback strategies
defaultRegistry.registerFallbackStrategy({
    name: "ignore-unknown",
    handle: function(type, options) {
        // Strategy: create a no-op matcher for unknown types
        var NoOpMatcher = function() {};
        NoOpMatcher.prototype.matches = function() {
            return false;
        };
        
        return new results.Result(new NoOpMatcher(), [
            results.warning("Unknown matcher type '" + type + "' ignored")
        ]);
    }
});

defaultRegistry.registerFallbackStrategy({
    name: "suggest-alternatives",
    handle: function(type, options) {
        var availableTypes = defaultRegistry.getAvailableTypes();
        var suggestions = availableTypes.filter(function(availableType) {
            // Simple fuzzy matching - suggest types that start with same letter
            return availableType.charAt(0).toLowerCase() === type.charAt(0).toLowerCase();
        });
        
        var message = "Unknown matcher type: " + type;
        if (suggestions.length > 0) {
            message += ". Did you mean: " + suggestions.slice(0, 3).join(", ") + "?";
        }
        
        return new results.Result(null, [results.warning(message)]);
    }
});

exports.DocumentMatcherRegistry = DocumentMatcherRegistry;
exports.defaultRegistry = defaultRegistry;
