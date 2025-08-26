var _ = require("underscore");
var results = require("../results");

/**
 * Configuration system for custom document matchers
 * Supports JSON/YAML configuration files and runtime configuration
 */
var MatcherConfiguration = function(options) {
    options = options || {};
    
    this._config = {};
    this._schema = {};
    this._validators = {};
    this._transformers = {};
    this._defaultConfig = this._getDefaultConfiguration();
    
    // Allow configuration validation
    this._validateConfig = options.validateConfig !== false;
    this._strict = options.strict !== false;
    
    this._registerBuiltinValidators();
    this._registerBuiltinTransformers();
};

MatcherConfiguration.prototype._getDefaultConfiguration = function() {
    return {
        matchers: {
            // Built-in matcher configurations can be customized
        },
        plugins: {
            enabled: [],
            disabled: [],
            autoload: true,
            searchPaths: ["./plugins", "../plugins"]
        },
        xsltTransforms: {
            enabled: true,
            cachingEnabled: true,
            transformPaths: ["./transforms", "../transforms"]
        },
        errorHandling: {
            strictMode: false,
            logLevel: "warn",
            maxErrors: 100,
            fallbackStrategy: "ignore"
        },
        performance: {
            cacheMatchers: true,
            maxCacheSize: 1000,
            enableMetrics: false
        }
    };
};

MatcherConfiguration.prototype._registerBuiltinValidators = function() {
    var self = this;
    
    // String validator
    this.registerValidator("string", function(value, constraints) {
        if (typeof value !== "string") {
            return ["Value must be a string"];
        }
        
        var errors = [];
        if (constraints.minLength && value.length < constraints.minLength) {
            errors.push("String must be at least " + constraints.minLength + " characters");
        }
        if (constraints.maxLength && value.length > constraints.maxLength) {
            errors.push("String must be no more than " + constraints.maxLength + " characters");
        }
        if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) {
            errors.push("String must match pattern: " + constraints.pattern);
        }
        if (constraints.enum && constraints.enum.indexOf(value) === -1) {
            errors.push("String must be one of: " + constraints.enum.join(", "));
        }
        
        return errors;
    });
    
    // Number validator
    this.registerValidator("number", function(value, constraints) {
        if (typeof value !== "number" || isNaN(value)) {
            return ["Value must be a number"];
        }
        
        var errors = [];
        if (constraints.min !== undefined && value < constraints.min) {
            errors.push("Number must be at least " + constraints.min);
        }
        if (constraints.max !== undefined && value > constraints.max) {
            errors.push("Number must be no more than " + constraints.max);
        }
        if (constraints.integer && !Number.isInteger(value)) {
            errors.push("Number must be an integer");
        }
        
        return errors;
    });
    
    // Boolean validator
    this.registerValidator("boolean", function(value, constraints) {
        if (typeof value !== "boolean") {
            return ["Value must be a boolean"];
        }
        return [];
    });
    
    // Array validator
    this.registerValidator("array", function(value, constraints) {
        if (!Array.isArray(value)) {
            return ["Value must be an array"];
        }
        
        var errors = [];
        if (constraints.minItems && value.length < constraints.minItems) {
            errors.push("Array must have at least " + constraints.minItems + " items");
        }
        if (constraints.maxItems && value.length > constraints.maxItems) {
            errors.push("Array must have no more than " + constraints.maxItems + " items");
        }
        
        // Validate each item if itemSchema provided
        if (constraints.itemSchema) {
            for (var i = 0; i < value.length; i++) {
                var itemErrors = self.validateValue(value[i], constraints.itemSchema);
                if (itemErrors.length > 0) {
                    errors.push("Item " + i + ": " + itemErrors.join(", "));
                }
            }
        }
        
        return errors;
    });
    
    // Object validator
    this.registerValidator("object", function(value, constraints) {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return ["Value must be an object"];
        }
        
        var errors = [];
        
        // Validate required properties
        if (constraints.required) {
            constraints.required.forEach(function(prop) {
                if (!(prop in value)) {
                    errors.push("Missing required property: " + prop);
                }
            });
        }
        
        // Validate property schemas
        if (constraints.properties) {
            for (var prop in constraints.properties) {
                if (prop in value) {
                    var propErrors = self.validateValue(value[prop], constraints.properties[prop]);
                    if (propErrors.length > 0) {
                        errors.push("Property " + prop + ": " + propErrors.join(", "));
                    }
                }
            }
        }
        
        // Check for unexpected properties in strict mode
        if (constraints.additionalProperties === false) {
            var allowedProps = Object.keys(constraints.properties || {});
            for (var prop in value) {
                if (allowedProps.indexOf(prop) === -1) {
                    errors.push("Unexpected property: " + prop);
                }
            }
        }
        
        return errors;
    });
};

MatcherConfiguration.prototype._registerBuiltinTransformers = function() {
    // Environment variable transformer
    this.registerTransformer("env", function(value) {
        if (typeof value === "string" && value.startsWith("${") && value.endsWith("}")) {
            var envVar = value.slice(2, -1);
            return process.env[envVar] || value;
        }
        return value;
    });
    
    // File path transformer
    this.registerTransformer("path", function(value) {
        if (typeof value === "string") {
            // Resolve relative paths
            return require("path").resolve(value);
        }
        return value;
    });
    
    // JSON parser transformer
    this.registerTransformer("json", function(value) {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch (error) {
                return value;
            }
        }
        return value;
    });
};

/**
 * Load configuration from object, file, or string
 */
MatcherConfiguration.prototype.loadConfiguration = function(source, format) {
    format = format || "json";
    
    var config;
    
    if (typeof source === "object") {
        config = source;
    } else if (typeof source === "string") {
        if (this._isFilePath(source)) {
            config = this._loadConfigurationFile(source, format);
        } else {
            config = this._parseConfigurationString(source, format);
        }
    } else {
        throw new Error("Configuration source must be object, file path, or configuration string");
    }
    
    // Merge with default configuration
    this._config = this._mergeConfigurations(this._defaultConfig, config);
    
    // Transform configuration values
    this._config = this._transformConfiguration(this._config);
    
    // Validate configuration if enabled
    if (this._validateConfig) {
        var validationResult = this.validateConfiguration(this._config);
        if (!validationResult.isValid) {
            var errorMessage = "Configuration validation failed:\n" +
                             validationResult.errors.join("\n");
            throw new Error(errorMessage);
        }
    }
    
    return this;
};

/**
 * Get configuration value by path
 */
MatcherConfiguration.prototype.get = function(path, defaultValue) {
    var value = this._getNestedValue(this._config, path);
    return value !== undefined ? value : defaultValue;
};

/**
 * Set configuration value by path
 */
MatcherConfiguration.prototype.set = function(path, value) {
    this._setNestedValue(this._config, path, value);
    return this;
};

/**
 * Register a custom validator
 */
MatcherConfiguration.prototype.registerValidator = function(type, validator) {
    if (typeof validator !== "function") {
        throw new Error("Validator must be a function");
    }
    
    this._validators[type] = validator;
    return this;
};

/**
 * Register a configuration transformer
 */
MatcherConfiguration.prototype.registerTransformer = function(name, transformer) {
    if (typeof transformer !== "function") {
        throw new Error("Transformer must be a function");
    }
    
    this._transformers[name] = transformer;
    return this;
};

/**
 * Define configuration schema
 */
MatcherConfiguration.prototype.defineSchema = function(schema) {
    this._schema = schema;
    return this;
};

/**
 * Validate configuration against schema
 */
MatcherConfiguration.prototype.validateConfiguration = function(config) {
    config = config || this._config;
    
    if (!this._schema || Object.keys(this._schema).length === 0) {
        return {isValid: true, errors: []};
    }
    
    var errors = this.validateValue(config, this._schema);
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
};

/**
 * Validate a value against a schema
 */
MatcherConfiguration.prototype.validateValue = function(value, schema) {
    if (!schema || !schema.type) {
        return [];
    }
    
    var validator = this._validators[schema.type];
    if (!validator) {
        return ["Unknown validator type: " + schema.type];
    }
    
    return validator(value, schema);
};

/**
 * Get the current configuration
 */
MatcherConfiguration.prototype.getConfiguration = function() {
    return _.clone(this._config);
};

/**
 * Create a matcher configuration from template
 */
MatcherConfiguration.prototype.createMatcherConfig = function(type, template, options) {
    options = options || {};
    
    var config = {
        type: type,
        factory: template.factory,
        options: _.extend({}, template.defaultOptions, options),
        validation: template.validation,
        description: template.description || "Custom matcher: " + type
    };
    
    // Apply any configuration transformations
    if (template.transforms) {
        config = this._applyTransformations(config, template.transforms);
    }
    
    return config;
};

/**
 * Export configuration to various formats
 */
MatcherConfiguration.prototype.exportConfiguration = function(format, options) {
    format = format || "json";
    options = options || {};
    
    var config = options.includeDefaults ?
        this._config :
        this._removeDefaultValues(this._config, this._defaultConfig);
    
    switch (format.toLowerCase()) {
    case "json":
        return JSON.stringify(config, null, options.indent || 2);
    case "yaml":
        // Would need a YAML library - placeholder for now
        throw new Error("YAML export not implemented");
    case "javascript":
        return "module.exports = " + JSON.stringify(config, null, options.indent || 2) + ";";
    default:
        throw new Error("Unsupported export format: " + format);
    }
};

// Private helper methods

MatcherConfiguration.prototype._isFilePath = function(str) {
    // Simple heuristic to detect file paths
    return str.indexOf("/") !== -1 || str.indexOf("\\") !== -1 || str.endsWith(".json") || str.endsWith(".yaml");
};

MatcherConfiguration.prototype._loadConfigurationFile = function(filePath, format) {
    var fs = require("fs");
    var path = require("path");
    
    if (!fs.existsSync(filePath)) {
        throw new Error("Configuration file not found: " + filePath);
    }
    
    var content = fs.readFileSync(filePath, "utf8");
    var actualFormat = format || path.extname(filePath).slice(1) || "json";
    
    return this._parseConfigurationString(content, actualFormat);
};

MatcherConfiguration.prototype._parseConfigurationString = function(content, format) {
    switch (format.toLowerCase()) {
    case "json":
        return JSON.parse(content);
    case "yaml":
    case "yml":
        // Would need a YAML library - placeholder for now
        throw new Error("YAML parsing not implemented");
    default:
        throw new Error("Unsupported configuration format: " + format);
    }
};

MatcherConfiguration.prototype._mergeConfigurations = function(base, override) {
    var merged = {};
    
    // Deep merge configurations
    for (var key in base) {
        if (key in override) {
            if (typeof base[key] === "object" && typeof override[key] === "object" &&
                !Array.isArray(base[key]) && !Array.isArray(override[key])) {
                merged[key] = this._mergeConfigurations(base[key], override[key]);
            } else {
                merged[key] = override[key];
            }
        } else {
            merged[key] = base[key];
        }
    }
    
    // Add new keys from override
    for (var key in override) {
        if (!(key in base)) {
            merged[key] = override[key];
        }
    }
    
    return merged;
};

MatcherConfiguration.prototype._transformConfiguration = function(config) {
    var self = this;
    
    function transformValue(value) {
        if (typeof value === "string") {
            // Apply all transformers
            for (var name in self._transformers) {
                value = self._transformers[name](value);
            }
        } else if (Array.isArray(value)) {
            return value.map(transformValue);
        } else if (typeof value === "object" && value !== null) {
            var transformed = {};
            for (var key in value) {
                transformed[key] = transformValue(value[key]);
            }
            return transformed;
        }
        
        return value;
    }
    
    return transformValue(config);
};

MatcherConfiguration.prototype._getNestedValue = function(obj, path) {
    var keys = path.split(".");
    var current = obj;
    
    for (var i = 0; i < keys.length; i++) {
        if (current === null || typeof current !== "object" || !(keys[i] in current)) {
            return undefined;
        }
        current = current[keys[i]];
    }
    
    return current;
};

MatcherConfiguration.prototype._setNestedValue = function(obj, path, value) {
    var keys = path.split(".");
    var current = obj;
    
    for (var i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current) || typeof current[keys[i]] !== "object") {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
};

MatcherConfiguration.prototype._removeDefaultValues = function(config, defaults) {
    var result = {};
    
    for (var key in config) {
        if (key in defaults) {
            if (typeof config[key] === "object" && typeof defaults[key] === "object" &&
                !Array.isArray(config[key]) && !Array.isArray(defaults[key])) {
                var nested = this._removeDefaultValues(config[key], defaults[key]);
                if (Object.keys(nested).length > 0) {
                    result[key] = nested;
                }
            } else if (config[key] !== defaults[key]) {
                result[key] = config[key];
            }
        } else {
            result[key] = config[key];
        }
    }
    
    return result;
};

MatcherConfiguration.prototype._applyTransformations = function(config, transforms) {
    var transformed = _.clone(config);
    
    transforms.forEach(function(transform) {
        if (typeof transform === "function") {
            transformed = transform(transformed);
        } else if (typeof transform === "string" && this._transformers[transform]) {
            transformed = this._transformers[transform](transformed);
        }
    }.bind(this));
    
    return transformed;
};

module.exports = MatcherConfiguration;
