var BasePlugin = require("./base-plugin");
var documentMatchers = require("../document-matchers");
var _ = require("underscore");

/**
 * Extended Break Plugin - adds support for additional break types
 * beyond the standard line, page, and column breaks
 */
var ExtendedBreakPlugin = function() {
    BasePlugin.call(this, "ExtendedBreakPlugin", "1.0.0");
    this.dependencies = [];
};

// Inherit from BasePlugin
ExtendedBreakPlugin.prototype = Object.create(BasePlugin.prototype);
ExtendedBreakPlugin.prototype.constructor = ExtendedBreakPlugin;

ExtendedBreakPlugin.prototype.getDescription = function() {
    return "Adds support for extended break types including section, wrap-text, and clear breaks";
};

ExtendedBreakPlugin.prototype.register = function(registry) {
    var self = this;
    
    // Register section break matcher
    registry.register("section", function(options) {
        return new SectionBreakMatcher(options);
    }, {
        priority: 10,
        namespace: "extended-breaks",
        description: "Matches section breaks in documents",
        validation: function(type, options) {
            return true; // Accept any options for section breaks
        }
    });
    
    // Register wrap text break matcher
    registry.register("wrap-text", function(options) {
        return new WrapTextBreakMatcher(options);
    }, {
        priority: 10,
        namespace: "extended-breaks",
        description: "Matches text wrapping breaks",
        validation: function(type, options) {
            return !options.side || ["left", "right", "both"].indexOf(options.side) !== -1;
        }
    });
    
    // Register clear break matcher
    registry.register("clear", function(options) {
        return new ClearBreakMatcher(options);
    }, {
        priority: 10,
        namespace: "extended-breaks",
        description: "Matches clear breaks (similar to CSS clear)",
        validation: function(type, options) {
            return !options.clear || ["left", "right", "both", "none"].indexOf(options.clear) !== -1;
        }
    });
    
    // Register conditional break matcher
    registry.register("conditional", function(options) {
        return new ConditionalBreakMatcher(options);
    }, {
        priority: 15,
        namespace: "extended-breaks",
        description: "Matches breaks based on conditions",
        validation: function(type, options) {
            return options && options.condition && typeof options.condition === "function";
        }
    });
};

/**
 * Section Break Matcher
 * Matches section breaks that divide document into logical sections
 */
function SectionBreakMatcher(options) {
    options = options || {};
    this._sectionType = options.sectionType || "nextPage";
    this._continuous = options.continuous || false;
}

SectionBreakMatcher.prototype.matches = function(element) {
    return element.type === "break" &&
           element.breakType === "section" &&
           (this._sectionType === undefined || element.sectionType === this._sectionType) &&
           (this._continuous === undefined || element.continuous === this._continuous);
};

/**
 * Wrap Text Break Matcher
 * Matches breaks that control text wrapping around objects
 */
function WrapTextBreakMatcher(options) {
    options = options || {};
    this._side = options.side; // left, right, both
    this._wrapType = options.wrapType || "around";
}

WrapTextBreakMatcher.prototype.matches = function(element) {
    return element.type === "break" &&
           element.breakType === "wrapText" &&
           (this._side === undefined || element.side === this._side) &&
           (this._wrapType === undefined || element.wrapType === this._wrapType);
};

/**
 * Clear Break Matcher
 * Matches breaks that clear floating elements (similar to CSS clear)
 */
function ClearBreakMatcher(options) {
    options = options || {};
    this._clear = options.clear || "both"; // left, right, both, none
}

ClearBreakMatcher.prototype.matches = function(element) {
    return element.type === "break" &&
           element.breakType === "clear" &&
           (this._clear === undefined || element.clear === this._clear);
};

/**
 * Conditional Break Matcher
 * Matches breaks based on custom conditions
 */
function ConditionalBreakMatcher(options) {
    options = options || {};
    this._condition = options.condition;
    this._fallbackMatcher = options.fallbackMatcher;
}

ConditionalBreakMatcher.prototype.matches = function(element) {
    if (!this._condition) {
        return false;
    }
    
    try {
        var conditionResult = this._condition(element);
        if (!conditionResult && this._fallbackMatcher) {
            return this._fallbackMatcher.matches(element);
        }
        return conditionResult;
    } catch (error) {
        // If condition evaluation fails, try fallback matcher
        return this._fallbackMatcher ? this._fallbackMatcher.matches(element) : false;
    }
};

module.exports = ExtendedBreakPlugin;
