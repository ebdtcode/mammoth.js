var _ = require("underscore");
var results = require("../results");

/**
 * ElementHandlerRegistry provides an extensible system for handling unsupported
 * OpenOffice and DOCX elements during document conversion.
 *
 * Features:
 * - Namespace-aware element matching
 * - Priority-based handler selection
 * - Fallback handling strategies
 * - Support for both built-in and custom handlers
 */
function ElementHandlerRegistry() {
    this._handlers = [];
    this._namespaceHandlers = {};
    this._fallbackHandlers = [];
    
    // Register built-in handlers
    this._registerBuiltInHandlers();
}

ElementHandlerRegistry.prototype = {
    /**
     * Register a handler for specific elements
     *
     * @param {Object} handlerConfig Configuration object
     * @param {string|Array<string>} handlerConfig.elementNames Element name(s) to handle
     * @param {string} [handlerConfig.namespace] XML namespace (optional)
     * @param {number} [handlerConfig.priority=100] Handler priority (higher = more specific)
     * @param {Function} handlerConfig.handler Handler function (element, messages, options) => htmlNodes
     * @param {string} [handlerConfig.description] Human-readable description
     */
    register: function(handlerConfig) {
        if (!handlerConfig.handler || typeof handlerConfig.handler !== 'function') {
            throw new Error("Handler must be a function");
        }
        
        if (!handlerConfig.elementNames) {
            throw new Error("elementNames is required");
        }
        
        var elementNames = Array.isArray(handlerConfig.elementNames)
            ? handlerConfig.elementNames
            : [handlerConfig.elementNames];
        
        var handlerEntry = {
            elementNames: elementNames,
            namespace: handlerConfig.namespace || null,
            priority: handlerConfig.priority || 100,
            handler: handlerConfig.handler,
            description: handlerConfig.description || "Custom handler",
            matcher: this._createMatcher(elementNames, handlerConfig.namespace)
        };
        
        // Insert at correct position based on priority
        var insertIndex = _.sortedIndex(this._handlers, handlerEntry, function(entry) {
            return -entry.priority; // Negative for descending order
        });
        
        this._handlers.splice(insertIndex, 0, handlerEntry);
        
        // Also register by namespace for quick lookup
        if (handlerConfig.namespace) {
            if (!this._namespaceHandlers[handlerConfig.namespace]) {
                this._namespaceHandlers[handlerConfig.namespace] = [];
            }
            this._namespaceHandlers[handlerConfig.namespace].push(handlerEntry);
        }
    },
    
    /**
     * Register a fallback handler for unhandled elements
     *
     * @param {Function} handler Fallback handler function
     * @param {number} [priority=0] Handler priority
     */
    registerFallback: function(handler, priority) {
        this._fallbackHandlers.push({
            handler: handler,
            priority: priority || 0
        });
        
        this._fallbackHandlers.sort(function(a, b) {
            return b.priority - a.priority;
        });
    },
    
    /**
     * Find and execute the appropriate handler for an element
     *
     * @param {Object} element Element to handle
     * @param {Array} messages Array to collect conversion messages
     * @param {Object} options Conversion options
     * @returns {Array} Array of HTML nodes
     */
    handle: function(element, messages, options) {
        var handler = this._findHandler(element);
        
        if (handler) {
            try {
                var result = handler.handler(element, messages, options);
                return Array.isArray(result) ? result : [result];
            } catch (error) {
                messages.push(results.error(
                    "Error in element handler for " + element.name + ": " + error.message
                ));
                return this._handleFallback(element, messages, options);
            }
        }
        
        return this._handleFallback(element, messages, options);
    },
    
    /**
     * Check if a handler exists for the given element
     *
     * @param {Object} element Element to check
     * @returns {boolean} True if handler exists
     */
    hasHandler: function(element) {
        return !!this._findHandler(element);
    },
    
    /**
     * Get information about registered handlers
     *
     * @returns {Array} Array of handler information
     */
    getHandlerInfo: function() {
        return this._handlers.map(function(entry) {
            return {
                elementNames: entry.elementNames,
                namespace: entry.namespace,
                priority: entry.priority,
                description: entry.description
            };
        });
    },
    
    /**
     * Unregister handlers by element name or namespace
     *
     * @param {string|Object} criteria Element name or {elementName, namespace}
     */
    unregister: function(criteria) {
        var self = this;
        
        if (typeof criteria === 'string') {
            this._handlers = this._handlers.filter(function(entry) {
                return entry.elementNames.indexOf(criteria) === -1;
            });
        } else if (criteria && criteria.elementName) {
            this._handlers = this._handlers.filter(function(entry) {
                return !(entry.elementNames.indexOf(criteria.elementName) !== -1 &&
                        entry.namespace === criteria.namespace);
            });
        }
        
        // Rebuild namespace cache
        this._namespaceHandlers = {};
        this._handlers.forEach(function(entry) {
            if (entry.namespace) {
                if (!self._namespaceHandlers[entry.namespace]) {
                    self._namespaceHandlers[entry.namespace] = [];
                }
                self._namespaceHandlers[entry.namespace].push(entry);
            }
        });
    },
    
    // Private methods
    
    _findHandler: function(element) {
        var elementName = element.name || element.type;
        var namespace = element.namespace || this._extractNamespace(elementName);
        
        // Try namespace-specific lookup first for performance
        if (namespace && this._namespaceHandlers[namespace]) {
            for (var i = 0; i < this._namespaceHandlers[namespace].length; i++) {
                var entry = this._namespaceHandlers[namespace][i];
                if (entry.matcher(element)) {
                    return entry;
                }
            }
        }
        
        // Fall back to linear search through all handlers
        for (var j = 0; j < this._handlers.length; j++) {
            var handler = this._handlers[j];
            if (handler.matcher(element)) {
                return handler;
            }
        }
        
        return null;
    },
    
    _createMatcher: function(elementNames, namespace) {
        return function(element) {
            var elementName = element.name || element.type;
            var elementNamespace = element.namespace || extractNamespace(elementName);
            
            // Check element name match
            var nameMatch = elementNames.some(function(name) {
                return elementName === name || elementName.endsWith(":" + name);
            });
            
            if (!nameMatch) {
                return false;
            }
            
            // Check namespace match if specified
            if (namespace && elementNamespace !== namespace) {
                return false;
            }
            
            return true;
        };
        
        function extractNamespace(elementName) {
            var colonIndex = elementName.indexOf(':');
            return colonIndex !== -1 ? elementName.substring(0, colonIndex) : null;
        }
    },
    
    _extractNamespace: function(elementName) {
        var colonIndex = elementName.indexOf(':');
        return colonIndex !== -1 ? elementName.substring(0, colonIndex) : null;
    },
    
    _handleFallback: function(element, messages, options) {
        // Try registered fallback handlers
        for (var i = 0; i < this._fallbackHandlers.length; i++) {
            try {
                var result = this._fallbackHandlers[i].handler(element, messages, options);
                if (result !== null && result !== undefined) {
                    return Array.isArray(result) ? result : [result];
                }
            } catch (error) {
                messages.push(results.error(
                    "Error in fallback handler: " + error.message
                ));
            }
        }
        
        // Default behavior: warn about unrecognized element
        var elementName = element.name || element.type;
        messages.push(results.warning(
            "Unrecognized element was ignored: " + elementName +
            (element.namespace ? " (namespace: " + element.namespace + ")" : "")
        ));
        
        return [];
    },
    
    _registerBuiltInHandlers: function() {
        var self = this;
        
        // Register built-in handlers for common unsupported elements
        
        // OpenOffice drawing elements
        this.register({
            elementNames: ["draw:frame", "draw:text-box", "draw:image"],
            namespace: "draw",
            priority: 200,
            description: "Built-in OpenOffice drawing handler",
            handler: function(element, messages, options) {
                try {
                    return require("./drawing-handler").handle(element, messages, options);
                } catch (error) {
                    messages.push(results.error("Drawing handler error: " + error.message));
                    return [];
                }
            }
        });
        
        // Complex fields
        this.register({
            elementNames: ["w:fldSimple", "w:hyperlink"],
            namespace: "w",
            priority: 200,
            description: "Built-in field handler",
            handler: function(element, messages, options) {
                try {
                    return require("./field-handler").handle(element, messages, options);
                } catch (error) {
                    messages.push(results.error("Field handler error: " + error.message));
                    return [];
                }
            }
        });
        
        // Math equations
        this.register({
            elementNames: ["m:oMath", "m:oMathPara"],
            namespace: "m",
            priority: 200,
            description: "Built-in math equation handler",
            handler: function(element, messages, options) {
                try {
                    return require("./math-handler").handle(element, messages, options);
                } catch (error) {
                    messages.push(results.error("Math handler error: " + error.message));
                    return [];
                }
            }
        });
        
        // Media elements
        this.register({
            elementNames: ["w:object", "w:pict"],
            namespace: "w",
            priority: 150,
            description: "Built-in media handler",
            handler: function(element, messages, options) {
                try {
                    return require("./media-handler").handle(element, messages, options);
                } catch (error) {
                    messages.push(results.error("Media handler error: " + error.message));
                    return [];
                }
            }
        });
        
        // Advanced table features
        this.register({
            elementNames: ["w:tbl"],
            namespace: "w",
            priority: 180,
            description: "Enhanced table handler with advanced features",
            handler: function(element, messages, options) {
                try {
                    return require("./table-handler").handle(element, messages, options);
                } catch (error) {
                    messages.push(results.error("Table handler error: " + error.message));
                    return [];
                }
            }
        });
        
        // Generic fallback handler
        this.registerFallback(function(element, messages, options) {
            // Try to extract text content from unknown elements
            var text = extractTextContent(element);
            if (text && text.trim()) {
                messages.push(results.warning(
                    "Unknown element " + (element.name || element.type) +
                    " converted to text: " + text.substring(0, 50) +
                    (text.length > 50 ? "..." : "")
                ));
                return [require("../html").text(text)];
            }
            return null;
        }, -100);
    }
};

function extractTextContent(element) {
    if (element.type === "text") {
        return element.value || "";
    }
    
    if (element.children && Array.isArray(element.children)) {
        return element.children.map(extractTextContent).join(" ");
    }
    
    return "";
}

// Export singleton instance
module.exports = new ElementHandlerRegistry();
