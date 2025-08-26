var BasePlugin = require("./base-plugin");
var _ = require("underscore");

/**
 * Custom Element Plugin - adds support for custom document elements
 * that may not be supported by the core matcher system
 */
var CustomElementPlugin = function() {
    BasePlugin.call(this, "CustomElementPlugin", "1.0.0");
    this.dependencies = [];
};

// Inherit from BasePlugin
CustomElementPlugin.prototype = Object.create(BasePlugin.prototype);
CustomElementPlugin.prototype.constructor = CustomElementPlugin;

CustomElementPlugin.prototype.getDescription = function() {
    return "Adds support for custom document elements including form fields, equations, and media objects";
};

CustomElementPlugin.prototype.register = function(registry) {
    var self = this;
    
    // Register form field matcher
    registry.register("form-field", function(options) {
        return new FormFieldMatcher(options);
    }, {
        priority: 20,
        namespace: "custom-elements",
        description: "Matches form fields (text inputs, checkboxes, etc.)",
        validation: function(type, options) {
            return !options.fieldType ||
                   ["text", "checkbox", "dropdown", "date", "number"].indexOf(options.fieldType) !== -1;
        }
    });
    
    // Register equation matcher
    registry.register("equation", function(options) {
        return new EquationMatcher(options);
    }, {
        priority: 20,
        namespace: "custom-elements",
        description: "Matches mathematical equations and formulas",
        validation: function(type, options) {
            return true;
        }
    });
    
    // Register media object matcher
    registry.register("media", function(options) {
        return new MediaMatcher(options);
    }, {
        priority: 20,
        namespace: "custom-elements",
        description: "Matches media objects (audio, video, embedded content)",
        validation: function(type, options) {
            return !options.mediaType ||
                   ["image", "video", "audio", "embed"].indexOf(options.mediaType) !== -1;
        }
    });
    
    // Register custom container matcher
    registry.register("container", function(options) {
        return new CustomContainerMatcher(options);
    }, {
        priority: 15,
        namespace: "custom-elements",
        description: "Matches custom container elements with nested content",
        validation: function(type, options) {
            return options && (options.containerType || options.className || options.attributes);
        }
    });
    
    // Register template-based matcher for maximum flexibility
    registry.register("template", function(options) {
        return new TemplateMatcher(options);
    }, {
        priority: 5,
        namespace: "custom-elements",
        description: "Template-based matcher for complex custom elements",
        validation: function(type, options) {
            return options && options.template && typeof options.template === "object";
        }
    });
};

/**
 * Form Field Matcher
 * Matches various types of form fields in documents
 */
function FormFieldMatcher(options) {
    options = options || {};
    this._fieldType = options.fieldType; // text, checkbox, dropdown, date, number
    this._fieldName = options.fieldName;
    this._required = options.required;
    this._placeholder = options.placeholder;
}

FormFieldMatcher.prototype.matches = function(element) {
    if (element.type !== "formField") {
        return false;
    }
    
    if (this._fieldType && element.fieldType !== this._fieldType) {
        return false;
    }
    
    if (this._fieldName && element.name !== this._fieldName) {
        return false;
    }
    
    if (this._required !== undefined && element.required !== this._required) {
        return false;
    }
    
    if (this._placeholder && element.placeholder !== this._placeholder) {
        return false;
    }
    
    return true;
};

/**
 * Equation Matcher
 * Matches mathematical equations and formulas
 */
function EquationMatcher(options) {
    options = options || {};
    this._mathType = options.mathType; // inline, display, numbered
    this._notation = options.notation; // latex, mathml, etc.
}

EquationMatcher.prototype.matches = function(element) {
    if (element.type !== "equation" && element.type !== "math") {
        return false;
    }
    
    if (this._mathType && element.mathType !== this._mathType) {
        return false;
    }
    
    if (this._notation && element.notation !== this._notation) {
        return false;
    }
    
    return true;
};

/**
 * Media Matcher
 * Matches various media objects in documents
 */
function MediaMatcher(options) {
    options = options || {};
    this._mediaType = options.mediaType; // image, video, audio, embed
    this._mimeType = options.mimeType;
    this._source = options.source;
}

MediaMatcher.prototype.matches = function(element) {
    if (element.type !== "media" && element.type !== "image" &&
        element.type !== "video" && element.type !== "audio") {
        return false;
    }
    
    if (this._mediaType) {
        var elementMediaType = element.mediaType || element.type;
        if (elementMediaType !== this._mediaType) {
            return false;
        }
    }
    
    if (this._mimeType && element.mimeType !== this._mimeType) {
        return false;
    }
    
    if (this._source && (!element.src || element.src.indexOf(this._source) === -1)) {
        return false;
    }
    
    return true;
};

/**
 * Custom Container Matcher
 * Matches custom container elements with specific properties
 */
function CustomContainerMatcher(options) {
    options = options || {};
    this._containerType = options.containerType;
    this._className = options.className;
    this._attributes = options.attributes || {};
    this._children = options.children;
}

CustomContainerMatcher.prototype.matches = function(element) {
    if (!element.type || element.type === "text") {
        return false;
    }
    
    if (this._containerType && element.containerType !== this._containerType) {
        return false;
    }
    
    if (this._className) {
        if (!element.className || element.className.indexOf(this._className) === -1) {
            return false;
        }
    }
    
    if (Object.keys(this._attributes).length > 0) {
        if (!element.attributes) {
            return false;
        }
        
        for (var attr in this._attributes) {
            if (element.attributes[attr] !== this._attributes[attr]) {
                return false;
            }
        }
    }
    
    if (this._children && element.children) {
        if (this._children.minCount && element.children.length < this._children.minCount) {
            return false;
        }
        if (this._children.maxCount && element.children.length > this._children.maxCount) {
            return false;
        }
    }
    
    return true;
};

/**
 * Template Matcher
 * Highly flexible matcher based on template definitions
 */
function TemplateMatcher(options) {
    options = options || {};
    this._template = options.template;
    this._strict = options.strict !== false; // Default to strict matching
}

TemplateMatcher.prototype.matches = function(element) {
    if (!this._template) {
        return false;
    }
    
    return this._matchesTemplate(element, this._template, this._strict);
};

TemplateMatcher.prototype._matchesTemplate = function(element, template, strict) {
    // Match element type
    if (template.type && element.type !== template.type) {
        return false;
    }
    
    // Match properties
    if (template.properties) {
        for (var prop in template.properties) {
            var expectedValue = template.properties[prop];
            var actualValue = element[prop];
            
            if (!this._matchesValue(actualValue, expectedValue, strict)) {
                return false;
            }
        }
    }
    
    // Match attributes
    if (template.attributes) {
        if (!element.attributes && strict) {
            return false;
        }
        
        for (var attr in template.attributes) {
            var expectedValue = template.attributes[attr];
            var actualValue = element.attributes ? element.attributes[attr] : undefined;
            
            if (!this._matchesValue(actualValue, expectedValue, strict)) {
                return false;
            }
        }
    }
    
    // Match nested templates (for children)
    if (template.children && element.children) {
        if (template.children.length !== element.children.length && strict) {
            return false;
        }
        
        var minLength = Math.min(template.children.length, element.children.length);
        for (var i = 0; i < minLength; i++) {
            if (!this._matchesTemplate(element.children[i], template.children[i], strict)) {
                return false;
            }
        }
    }
    
    // Custom matching function
    if (template.customMatcher && typeof template.customMatcher === "function") {
        try {
            return template.customMatcher(element);
        } catch (error) {
            return false;
        }
    }
    
    return true;
};

TemplateMatcher.prototype._matchesValue = function(actual, expected, strict) {
    if (expected === null || expected === undefined) {
        return !strict || (actual === null || actual === undefined);
    }
    
    if (typeof expected === "object" && expected.regex) {
        // Regular expression matching
        var regex = new RegExp(expected.regex, expected.flags || "");
        return regex.test(actual);
    }
    
    if (typeof expected === "object" && expected.oneOf) {
        // Match one of several values
        return expected.oneOf.indexOf(actual) !== -1;
    }
    
    if (typeof expected === "function") {
        // Custom matching function
        try {
            return expected(actual);
        } catch (error) {
            return false;
        }
    }
    
    // Direct equality
    return actual === expected;
};

module.exports = CustomElementPlugin;
