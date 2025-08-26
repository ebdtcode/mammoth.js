var _ = require("underscore");
var results = require("../results");

/**
 * XSLT-based transformation support for complex document matching
 * Provides extensible XSLT processing capabilities for advanced matcher scenarios
 */
var XsltProcessor = function(options) {
    options = options || {};
    
    this._transformCache = {};
    this._processors = {};
    this._templates = {};
    this._namespaces = {};
    
    // Configuration options
    this._cacheEnabled = options.cacheEnabled !== false;
    this._maxCacheSize = options.maxCacheSize || 100;
    this._defaultProcessor = options.defaultProcessor || "native";
    this._transformPaths = options.transformPaths || ["./transforms"];
    
    this._registerBuiltinProcessors();
};

XsltProcessor.prototype._registerBuiltinProcessors = function() {
    var self = this;
    
    // Register native JavaScript XSLT processor (simplified implementation)
    this.registerProcessor("native", {
        name: "Native JavaScript XSLT",
        transform: function(xmlInput, xsltTemplate, parameters) {
            return self._nativeTransform(xmlInput, xsltTemplate, parameters);
        },
        supports: ["xslt1.0"],
        priority: 1
    });
    
    // Register libxml-based processor (if available)
    try {
        var libxmljs = require("libxmljs2");
        this.registerProcessor("libxml", {
            name: "libxml2-based XSLT",
            transform: function(xmlInput, xsltTemplate, parameters) {
                return self._libxmlTransform(xmlInput, xsltTemplate, parameters, libxmljs);
            },
            supports: ["xslt1.0", "xslt2.0"],
            priority: 10
        });
    } catch (error) {
        // libxmljs not available, skip registration
    }
    
    // Register Saxon-based processor (if available)
    try {
        var saxon = require("saxon-js");
        this.registerProcessor("saxon", {
            name: "Saxon-JS XSLT",
            transform: function(xmlInput, xsltTemplate, parameters) {
                return self._saxonTransform(xmlInput, xsltTemplate, parameters, saxon);
            },
            supports: ["xslt1.0", "xslt2.0", "xslt3.0"],
            priority: 20
        });
    } catch (error) {
        // Saxon-JS not available, skip registration
    }
};

/**
 * Register an XSLT processor
 */
XsltProcessor.prototype.registerProcessor = function(name, processor) {
    if (!processor || typeof processor.transform !== "function") {
        throw new Error("XSLT processor must have a transform function");
    }
    
    this._processors[name] = processor;
    return this;
};

/**
 * Register an XSLT template
 */
XsltProcessor.prototype.registerTemplate = function(name, template, options) {
    options = options || {};
    
    this._templates[name] = {
        name: name,
        template: template,
        processor: options.processor || this._defaultProcessor,
        parameters: options.parameters || {},
        namespaces: options.namespaces || {},
        cacheKey: options.cacheKey,
        version: options.version || "1.0"
    };
    
    return this;
};

/**
 * Load XSLT template from file
 */
XsltProcessor.prototype.loadTemplate = function(name, filePath, options) {
    var fs = require("fs");
    var path = require("path");
    
    // Try to find template in configured paths
    var templatePath = this._findTemplatePath(filePath);
    if (!templatePath) {
        throw new Error("XSLT template not found: " + filePath);
    }
    
    var templateContent = fs.readFileSync(templatePath, "utf8");
    return this.registerTemplate(name, templateContent, options);
};

/**
 * Transform XML using XSLT template
 */
XsltProcessor.prototype.transform = function(xmlInput, templateName, parameters, options) {
    options = options || {};
    parameters = parameters || {};
    
    // Get template configuration
    var template = this._templates[templateName];
    if (!template) {
        return new results.Result(null, [
            results.error(new Error("XSLT template not found: " + templateName))
        ]);
    }
    
    // Get processor
    var processorName = options.processor || template.processor;
    var processor = this._processors[processorName];
    if (!processor) {
        return new results.Result(null, [
            results.error(new Error("XSLT processor not found: " + processorName))
        ]);
    }
    
    // Create cache key
    var cacheKey = this._createCacheKey(xmlInput, templateName, parameters);
    
    // Check cache
    if (this._cacheEnabled && this._transformCache[cacheKey]) {
        return results.success(this._transformCache[cacheKey]);
    }
    
    try {
        // Merge parameters
        var allParameters = _.extend({}, template.parameters, parameters);
        
        // Perform transformation
        var transformResult = processor.transform(xmlInput, template.template, allParameters);
        
        // Cache result
        if (this._cacheEnabled) {
            this._cacheResult(cacheKey, transformResult);
        }
        
        return results.success(transformResult);
        
    } catch (error) {
        return new results.Result(null, [
            results.error(error)
        ]);
    }
};

/**
 * Create a matcher using XSLT transformation
 */
XsltProcessor.prototype.createMatcher = function(templateName, options) {
    options = options || {};
    
    var self = this;
    var template = this._templates[templateName];
    
    if (!template) {
        return new results.Result(null, [
            results.error(new Error("XSLT template not found: " + templateName))
        ]);
    }
    
    // Create XSLT-based matcher
    var XsltMatcher = function(templateName, matcherOptions) {
        this._templateName = templateName;
        this._options = matcherOptions || {};
        this._parameters = this._options.parameters || {};
    };
    
    XsltMatcher.prototype.matches = function(element) {
        try {
            // Convert element to XML representation
            var xmlInput = self._elementToXml(element);
            
            // Transform using XSLT
            var transformResult = self.transform(
                xmlInput, 
                this._templateName, 
                this._parameters
            );
            
            if (!transformResult.value) {
                return false;
            }
            
            // Parse transform result as boolean
            return self._parseMatchResult(transformResult.value);
            
        } catch (error) {
            // Log error but don't throw - return false for failed matches
            console.warn("XSLT matcher error:", error.message);
            return false;
        }
    };
    
    var matcher = new XsltMatcher(templateName, options);
    return results.success(matcher);
};

/**
 * Define common XSLT templates for document matching
 */
XsltProcessor.prototype.defineCommonTemplates = function() {
    // Style-based matching template
    this.registerTemplate("style-matcher", `
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:param name="styleId"/>
            <xsl:param name="styleName"/>
            <xsl:param name="matchType" select="'exact'"/>
            
            <xsl:template match="/">
                <xsl:choose>
                    <xsl:when test="$styleId and /element/@styleId = $styleId">
                        <result>true</result>
                    </xsl:when>
                    <xsl:when test="$styleName">
                        <xsl:choose>
                            <xsl:when test="$matchType = 'contains' and contains(/element/@styleName, $styleName)">
                                <result>true</result>
                            </xsl:when>
                            <xsl:when test="$matchType = 'startsWith' and starts-with(/element/@styleName, $styleName)">
                                <result>true</result>
                            </xsl:when>
                            <xsl:when test="$matchType = 'exact' and /element/@styleName = $styleName">
                                <result>true</result>
                            </xsl:when>
                            <xsl:otherwise>
                                <result>false</result>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                    <xsl:otherwise>
                        <result>false</result>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:template>
        </xsl:stylesheet>
    `);
    
    // Complex element matching template
    this.registerTemplate("complex-matcher", `
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:param name="elementType"/>
            <xsl:param name="minChildren" select="0"/>
            <xsl:param name="maxChildren" select="999"/>
            <xsl:param name="hasAttributes" select="'false'"/>
            
            <xsl:template match="/">
                <xsl:variable name="element" select="/element"/>
                <xsl:variable name="childCount" select="count($element/children/*)"/>
                <xsl:variable name="hasAttrs" select="count($element/@*) > 0"/>
                
                <xsl:choose>
                    <xsl:when test="$elementType and $element/@type != $elementType">
                        <result>false</result>
                    </xsl:when>
                    <xsl:when test="$childCount &lt; $minChildren or $childCount > $maxChildren">
                        <result>false</result>
                    </xsl:when>
                    <xsl:when test="$hasAttributes = 'true' and not($hasAttrs)">
                        <result>false</result>
                    </xsl:when>
                    <xsl:when test="$hasAttributes = 'false' and $hasAttrs">
                        <result>false</result>
                    </xsl:when>
                    <xsl:otherwise>
                        <result>true</result>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:template>
        </xsl:stylesheet>
    `);
    
    // Conditional matching template
    this.registerTemplate("conditional-matcher", `
        <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:param name="condition"/>
            <xsl:param name="xpath"/>
            
            <xsl:template match="/">
                <xsl:choose>
                    <xsl:when test="$xpath">
                        <xsl:variable name="xpathResult">
                            <xsl:call-template name="evaluate-xpath">
                                <xsl:with-param name="expression" select="$xpath"/>
                                <xsl:with-param name="context" select="/"/>
                            </xsl:call-template>
                        </xsl:variable>
                        <result><xsl:value-of select="$xpathResult"/></result>
                    </xsl:when>
                    <xsl:otherwise>
                        <result>false</result>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:template>
            
            <xsl:template name="evaluate-xpath">
                <xsl:param name="expression"/>
                <xsl:param name="context"/>
                <!-- Simplified XPath evaluation - would need more sophisticated implementation -->
                <xsl:value-of select="boolean($context)"/>
            </xsl:template>
        </xsl:stylesheet>
    `);
    
    return this;
};

// Private implementation methods

XsltProcessor.prototype._nativeTransform = function(xmlInput, xsltTemplate, parameters) {
    // Simplified native JavaScript XSLT implementation
    // This is a basic implementation - production would need a full XSLT processor
    
    var DOMParser = require("xmldom").DOMParser;
    var XMLSerializer = require("xmldom").XMLSerializer;
    
    // Parse XML input
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xmlInput, "text/xml");
    var xsltDoc = parser.parseFromString(xsltTemplate, "text/xml");
    
    // Very basic template matching - this would need to be much more sophisticated
    var templates = xsltDoc.getElementsByTagName("xsl:template");
    var result = this._applyTemplates(xmlDoc, templates, parameters);
    
    return new XMLSerializer().serializeToString(result);
};

XsltProcessor.prototype._libxmlTransform = function(xmlInput, xsltTemplate, parameters, libxmljs) {
    var xmlDoc = libxmljs.parseXml(xmlInput);
    var xsltDoc = libxmljs.parseXml(xsltTemplate);
    
    // Apply XSLT transformation
    var result = xmlDoc.xsltApply(xsltDoc, parameters);
    return result.toString();
};

XsltProcessor.prototype._saxonTransform = function(xmlInput, xsltTemplate, parameters, saxon) {
    // Saxon-JS transformation
    var result = saxon.XPath.evaluate(
        xsltTemplate,
        xmlInput,
        { params: parameters }
    );
    
    return result;
};

XsltProcessor.prototype._applyTemplates = function(xmlDoc, templates, parameters) {
    // Simplified template application - real implementation would be much more complex
    var result = xmlDoc.cloneNode(true);
    
    // Apply parameter substitutions
    for (var param in parameters) {
        var value = parameters[param];
        this._substituteParameter(result, param, value);
    }
    
    return result;
};

XsltProcessor.prototype._substituteParameter = function(node, paramName, value) {
    // Simple parameter substitution - real XSLT would be much more sophisticated
    if (node.nodeType === 1) { // Element node
        var attributes = node.attributes;
        for (var i = 0; i < attributes.length; i++) {
            var attr = attributes[i];
            if (attr.value.indexOf("$" + paramName) !== -1) {
                attr.value = attr.value.replace("$" + paramName, value);
            }
        }
        
        // Process child nodes
        var children = node.childNodes;
        for (var j = 0; j < children.length; j++) {
            this._substituteParameter(children[j], paramName, value);
        }
    } else if (node.nodeType === 3) { // Text node
        if (node.nodeValue && node.nodeValue.indexOf("$" + paramName) !== -1) {
            node.nodeValue = node.nodeValue.replace("$" + paramName, value);
        }
    }
};

XsltProcessor.prototype._elementToXml = function(element) {
    // Convert document element to XML representation
    var xml = "<element";
    
    // Add element properties as attributes
    if (element.type) xml += ' type="' + this._escapeXml(element.type) + '"';
    if (element.styleId) xml += ' styleId="' + this._escapeXml(element.styleId) + '"';
    if (element.styleName) xml += ' styleName="' + this._escapeXml(element.styleName) + '"';
    
    // Add other element properties
    for (var prop in element) {
        if (["type", "styleId", "styleName", "children", "text"].indexOf(prop) === -1) {
            xml += ' ' + prop + '="' + this._escapeXml(String(element[prop])) + '"';
        }
    }
    
    xml += ">";
    
    // Add text content
    if (element.text) {
        xml += "<text>" + this._escapeXml(element.text) + "</text>";
    }
    
    // Add children
    if (element.children && element.children.length > 0) {
        xml += "<children>";
        for (var i = 0; i < element.children.length; i++) {
            xml += this._elementToXml(element.children[i]);
        }
        xml += "</children>";
    }
    
    xml += "</element>";
    return xml;
};

XsltProcessor.prototype._escapeXml = function(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};

XsltProcessor.prototype._parseMatchResult = function(transformResult) {
    // Parse XSLT transformation result as boolean
    if (typeof transformResult === "boolean") {
        return transformResult;
    }
    
    if (typeof transformResult === "string") {
        var trimmed = transformResult.trim().toLowerCase();
        
        // Check for XML result elements
        if (trimmed.indexOf("<result>") !== -1) {
            var match = trimmed.match(/<result>(.*?)<\/result>/);
            if (match) {
                return match[1].trim() === "true";
            }
        }
        
        // Direct string evaluation
        return trimmed === "true" || trimmed === "1";
    }
    
    return Boolean(transformResult);
};

XsltProcessor.prototype._findTemplatePath = function(filePath) {
    var fs = require("fs");
    var path = require("path");
    
    // If absolute path, check directly
    if (path.isAbsolute(filePath)) {
        return fs.existsSync(filePath) ? filePath : null;
    }
    
    // Search in configured paths
    for (var i = 0; i < this._transformPaths.length; i++) {
        var fullPath = path.join(this._transformPaths[i], filePath);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    
    return null;
};

XsltProcessor.prototype._createCacheKey = function(xmlInput, templateName, parameters) {
    var crypto = require("crypto");
    var key = xmlInput + "|" + templateName + "|" + JSON.stringify(parameters);
    return crypto.createHash("md5").update(key).digest("hex");
};

XsltProcessor.prototype._cacheResult = function(key, result) {
    // Implement LRU cache behavior
    if (Object.keys(this._transformCache).length >= this._maxCacheSize) {
        // Remove oldest entry (simplified - real LRU would track access times)
        var firstKey = Object.keys(this._transformCache)[0];
        delete this._transformCache[firstKey];
    }
    
    this._transformCache[key] = result;
};

/**
 * Clear transformation cache
 */
XsltProcessor.prototype.clearCache = function() {
    this._transformCache = {};
    return this;
};

/**
 * Get processor information
 */
XsltProcessor.prototype.getProcessorInfo = function() {
    var processors = [];
    
    for (var name in this._processors) {
        var processor = this._processors[name];
        processors.push({
            name: name,
            displayName: processor.name,
            supports: processor.supports || [],
            priority: processor.priority || 0
        });
    }
    
    return processors.sort(function(a, b) {
        return b.priority - a.priority;
    });
};

module.exports = XsltProcessor;