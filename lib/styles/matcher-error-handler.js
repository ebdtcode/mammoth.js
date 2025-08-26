var results = require("../results");
var _ = require("underscore");

/**
 * Enhanced error handling and warning system for document matchers
 * Provides detailed error messages, suggestions, and recovery strategies
 */
var MatcherErrorHandler = function() {
    this._errorStrategies = [];
    this._warningHandlers = [];
    this._suggestionProviders = [];
    this._errorCategories = {};
    
    this._registerBuiltinStrategies();
};

MatcherErrorHandler.prototype._registerBuiltinStrategies = function() {
    var self = this;
    
    // Register error categories
    this._errorCategories = {
        UNKNOWN_TYPE: {
            code: "MATCHER_001",
            severity: "warning",
            description: "Unknown matcher type encountered"
        },
        INVALID_OPTIONS: {
            code: "MATCHER_002",
            severity: "error",
            description: "Invalid options provided for matcher"
        },
        VALIDATION_FAILED: {
            code: "MATCHER_003",
            severity: "error",
            description: "Matcher validation failed"
        },
        PLUGIN_ERROR: {
            code: "MATCHER_004",
            severity: "error",
            description: "Plugin encountered an error"
        },
        XSLT_ERROR: {
            code: "MATCHER_005",
            severity: "error",
            description: "XSLT transformation error"
        },
        DEPENDENCY_ERROR: {
            code: "MATCHER_006",
            severity: "error",
            description: "Plugin dependency error"
        }
    };
    
    // Register suggestion providers
    this.registerSuggestionProvider({
        name: "fuzzy-matcher",
        priority: 10,
        provide: function(unknownType, availableTypes) {
            return self._getFuzzyMatches(unknownType, availableTypes);
        }
    });
    
    this.registerSuggestionProvider({
        name: "category-matcher",
        priority: 5,
        provide: function(unknownType, availableTypes) {
            return self._getCategoryMatches(unknownType, availableTypes);
        }
    });
    
    // Register warning handlers
    this.registerWarningHandler({
        name: "unknown-type-handler",
        handles: ["MATCHER_001"],
        handle: function(error, context) {
            var suggestions = self.getSuggestions(error.unknownType, context.availableTypes);
            var message = "Unknown document matcher type: '" + error.unknownType + "'";
            
            if (suggestions.length > 0) {
                message += ". Did you mean: " + suggestions.slice(0, 3).join(", ") + "?";
            }
            
            message += "\nAvailable types: " + context.availableTypes.join(", ");
            
            return {
                message: message,
                code: "MATCHER_001",
                severity: "warning",
                suggestions: suggestions,
                recoverable: true,
                recovery: function() {
                    // Return a no-op matcher as recovery
                    return {
                        matches: function() {
                            return false;
                        }
                    };
                }
            };
        }
    });
    
    this.registerWarningHandler({
        name: "validation-handler",
        handles: ["MATCHER_003"],
        handle: function(error, context) {
            return {
                message: "Validation failed for matcher '" + error.matcherType + "': " + error.details,
                code: "MATCHER_003",
                severity: "error",
                recoverable: false,
                validationErrors: error.validationErrors || []
            };
        }
    });
};

/**
 * Register an error handling strategy
 */
MatcherErrorHandler.prototype.registerErrorStrategy = function(strategy) {
    if (!strategy || typeof strategy.handle !== "function") {
        throw new Error("Error strategy must have a handle function");
    }
    
    this._errorStrategies.push(strategy);
    this._errorStrategies.sort(function(a, b) {
        return (b.priority || 0) - (a.priority || 0);
    });
    
    return this;
};

/**
 * Register a warning handler
 */
MatcherErrorHandler.prototype.registerWarningHandler = function(handler) {
    if (!handler || typeof handler.handle !== "function") {
        throw new Error("Warning handler must have a handle function");
    }
    
    this._warningHandlers.push(handler);
    return this;
};

/**
 * Register a suggestion provider
 */
MatcherErrorHandler.prototype.registerSuggestionProvider = function(provider) {
    if (!provider || typeof provider.provide !== "function") {
        throw new Error("Suggestion provider must have a provide function");
    }
    
    this._suggestionProviders.push(provider);
    this._suggestionProviders.sort(function(a, b) {
        return (b.priority || 0) - (a.priority || 0);
    });
    
    return this;
};

/**
 * Handle an unknown matcher type
 */
MatcherErrorHandler.prototype.handleUnknownType = function(unknownType, context) {
    var error = {
        category: "UNKNOWN_TYPE",
        unknownType: unknownType,
        timestamp: new Date(),
        context: context
    };
    
    var handler = this._findWarningHandler("MATCHER_001");
    if (handler) {
        var result = handler.handle(error, context);
        
        if (result.recoverable && result.recovery) {
            var recoveryMatcher = result.recovery();
            return new results.Result(recoveryMatcher, [
                results.warning(result.message)
            ]);
        }
        
        return new results.Result(null, [results.warning(result.message)]);
    }
    
    // Fallback handling
    return new results.Result(null, [
        results.warning("Unknown matcher type: " + unknownType)
    ]);
};

/**
 * Handle validation errors
 */
MatcherErrorHandler.prototype.handleValidationError = function(matcherType, validationErrors, context) {
    var error = {
        category: "VALIDATION_FAILED",
        matcherType: matcherType,
        validationErrors: validationErrors,
        details: validationErrors.join("; "),
        timestamp: new Date(),
        context: context
    };
    
    var handler = this._findWarningHandler("MATCHER_003");
    if (handler) {
        var result = handler.handle(error, context);
        return new results.Result(null, [
            results.error(new Error(result.message))
        ]);
    }
    
    // Fallback handling
    return new results.Result(null, [
        results.error(new Error("Validation failed for matcher: " + matcherType))
    ]);
};

/**
 * Handle plugin errors
 */
MatcherErrorHandler.prototype.handlePluginError = function(pluginName, error, context) {
    var errorInfo = {
        category: "PLUGIN_ERROR",
        pluginName: pluginName,
        error: error,
        message: error.message || "Unknown plugin error",
        timestamp: new Date(),
        context: context
    };
    
    return new results.Result(null, [
        results.error(new Error("Plugin '" + pluginName + "' error: " + errorInfo.message))
    ]);
};

/**
 * Handle XSLT transformation errors
 */
MatcherErrorHandler.prototype.handleXsltError = function(transformPath, error, context) {
    var errorInfo = {
        category: "XSLT_ERROR",
        transformPath: transformPath,
        error: error,
        message: error.message || "XSLT transformation failed",
        timestamp: new Date(),
        context: context
    };
    
    return new results.Result(null, [
        results.error(new Error("XSLT transform '" + transformPath + "' error: " + errorInfo.message))
    ]);
};

/**
 * Get suggestions for an unknown type
 */
MatcherErrorHandler.prototype.getSuggestions = function(unknownType, availableTypes) {
    var allSuggestions = [];
    
    for (var i = 0; i < this._suggestionProviders.length; i++) {
        var provider = this._suggestionProviders[i];
        try {
            var suggestions = provider.provide(unknownType, availableTypes);
            if (suggestions && suggestions.length > 0) {
                allSuggestions = allSuggestions.concat(suggestions);
            }
        } catch (error) {
            // Continue with other providers if one fails
            console.warn("Suggestion provider '" + provider.name + "' failed:", error.message);
        }
    }
    
    // Remove duplicates and sort by relevance
    return _.uniq(allSuggestions);
};

/**
 * Find warning handler for error code
 */
MatcherErrorHandler.prototype._findWarningHandler = function(errorCode) {
    return _.find(this._warningHandlers, function(handler) {
        return handler.handles && handler.handles.indexOf(errorCode) !== -1;
    });
};

/**
 * Get fuzzy matches using simple string similarity
 */
MatcherErrorHandler.prototype._getFuzzyMatches = function(unknownType, availableTypes) {
    var suggestions = [];
    var unknownLower = unknownType.toLowerCase();
    
    // Exact prefix matches
    var prefixMatches = availableTypes.filter(function(type) {
        return type.toLowerCase().indexOf(unknownLower) === 0;
    });
    
    // Contains matches
    var containsMatches = availableTypes.filter(function(type) {
        return type.toLowerCase().indexOf(unknownLower) > 0;
    });
    
    // Similar length matches (edit distance approximation)
    var lengthMatches = availableTypes.filter(function(type) {
        var lengthDiff = Math.abs(type.length - unknownType.length);
        return lengthDiff <= 2 && this._calculateSimilarity(unknownType, type) > 0.5;
    }.bind(this));
    
    return prefixMatches.concat(containsMatches).concat(lengthMatches);
};

/**
 * Get category-based matches
 */
MatcherErrorHandler.prototype._getCategoryMatches = function(unknownType, availableTypes) {
    var categories = {
        "break": ["line", "page", "column", "section", "wrap-text", "clear"],
        "format": ["bold", "italic", "underline", "strikethrough"],
        "text": ["all-caps", "small-caps", "highlight"],
        "structure": ["paragraph", "run", "table"],
        "form": ["form-field", "checkbox", "dropdown"],
        "media": ["image", "video", "audio", "media"]
    };
    
    var unknownLower = unknownType.toLowerCase();
    var suggestions = [];
    
    // Check if unknown type suggests a category
    for (var category in categories) {
        if (unknownLower.indexOf(category) !== -1) {
            var categoryTypes = categories[category].filter(function(type) {
                return availableTypes.indexOf(type) !== -1;
            });
            suggestions = suggestions.concat(categoryTypes);
        }
    }
    
    return suggestions;
};

/**
 * Calculate simple string similarity (0-1)
 */
MatcherErrorHandler.prototype._calculateSimilarity = function(str1, str2) {
    var longer = str1.length > str2.length ? str1 : str2;
    var shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
        return 1.0;
    }
    
    var editDistance = this._levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 */
MatcherErrorHandler.prototype._levenshteinDistance = function(str1, str2) {
    var matrix = [];
    
    for (var i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (var j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (i = 1; i <= str2.length; i++) {
        for (j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
};

/**
 * Create a detailed error report
 */
MatcherErrorHandler.prototype.createErrorReport = function(errors, context) {
    var report = {
        timestamp: new Date(),
        context: context,
        summary: {
            totalErrors: 0,
            totalWarnings: 0,
            criticalErrors: 0
        },
        details: [],
        suggestions: []
    };
    
    errors.forEach(function(error) {
        var errorDetail = {
            type: error.type,
            message: error.message,
            code: error.code || "UNKNOWN",
            severity: error.severity || (error.type === "error" ? "error" : "warning"),
            timestamp: error.timestamp || new Date()
        };
        
        if (error.type === "error") {
            report.summary.totalErrors++;
            if (errorDetail.severity === "critical") {
                report.summary.criticalErrors++;
            }
        } else {
            report.summary.totalWarnings++;
        }
        
        report.details.push(errorDetail);
    });
    
    return report;
};

module.exports = MatcherErrorHandler;
