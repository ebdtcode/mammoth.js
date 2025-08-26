var Html = require("../html");
var results = require("../results");

/**
 * DrawingHandler manages drawing elements including shapes, diagrams,
 * charts, and other graphical content from both DOCX and ODF formats.
 */
var DrawingHandler = {
    
    /**
     * Handle drawing elements
     *
     * @param {Object} element Drawing element
     * @param {Array} messages Message array
     * @param {Object} options Conversion options
     * @returns {Array} HTML nodes
     */
    handle: function(element, messages, options) {
        try {
            var elementName = element.name || element.type;
            var namespace = this._extractNamespace(elementName);
            
            if (namespace === "draw" || elementName.startsWith("draw:")) {
                return this._handleOdfDrawing(element, messages, options);
            } else if (namespace === "w" && (elementName.includes("drawing") || elementName.includes("pict"))) {
                return this._handleWordDrawing(element, messages, options);
            } else if (elementName.includes("chart") || elementName.includes("diagram")) {
                return this._handleChart(element, messages, options);
            }
            
            return this._handleGenericDrawing(element, messages, options);
        } catch (error) {
            messages.push(results.error("Error handling drawing element: " + error.message));
            return [];
        }
    },
    
    /**
     * Handle ODF drawing elements (draw:frame, draw:text-box, draw:image, etc.)
     */
    _handleOdfDrawing: function(element, messages, options) {
        var drawingType = element.name.split(':')[1];
        
        switch (drawingType) {
        case "frame":
            return this._handleOdfFrame(element, messages, options);
        case "text-box":
            return this._handleOdfTextBox(element, messages, options);
        case "image":
            return this._handleOdfImage(element, messages, options);
        case "object":
            return this._handleOdfObject(element, messages, options);
        case "custom-shape":
            return this._handleOdfShape(element, messages, options);
        case "line":
        case "rect":
        case "circle":
        case "ellipse":
        case "polygon":
        case "polyline":
            return this._handleOdfBasicShape(element, messages, options);
        default:
            messages.push(results.warning("Unknown ODF drawing element: " + element.name));
            return this._createPlaceholder("ODF Drawing: " + drawingType, messages);
        }
    },
    
    /**
     * Handle Word drawing elements
     */
    _handleWordDrawing: function(element, messages, options) {
        var elementName = element.name || element.type;
        
        if (elementName.includes("pict")) {
            return this._handleWordPicture(element, messages, options);
        } else if (elementName.includes("drawing")) {
            return this._handleWordDrawingML(element, messages, options);
        }
        
        return this._handleGenericDrawing(element, messages, options);
    },
    
    /**
     * Handle chart and diagram elements
     */
    _handleChart: function(element, messages, options) {
        var chartInfo = this._extractChartInfo(element);
        
        messages.push(results.warning(
            "Chart element converted to placeholder. Type: " + (chartInfo.type || "unknown")
        ));
        
        return this._createChartPlaceholder(chartInfo, messages);
    },
    
    /**
     * Handle ODF frame elements (containers for other drawing objects)
     */
    _handleOdfFrame: function(element, messages, options) {
        var frameProps = this._extractOdfFrameProperties(element);
        var children = [];
        
        // Process child elements
        if (element.children && Array.isArray(element.children)) {
            children = element.children.map(function(child) {
                return this.handle(child, messages, options);
            }.bind(this)).reduce(function(acc, val) {
                return acc.concat(val);
            }, []);
        }
        
        // Create container div with positioning
        var containerAttrs = {
            class: "odf-frame"
        };
        
        var styles = [];
        
        if (frameProps.width) {
            styles.push("width: " + frameProps.width);
        }
        if (frameProps.height) {
            styles.push("height: " + frameProps.height);
        }
        if (frameProps.x || frameProps.y) {
            styles.push("position: absolute");
            if (frameProps.x) {
                styles.push("left: " + frameProps.x);
            }
            if (frameProps.y) {
                styles.push("top: " + frameProps.y);
            }
        }
        
        if (styles.length > 0) {
            containerAttrs.style = styles.join("; ");
        }
        
        if (children.length === 0) {
            children = [Html.text("[Drawing Frame]")];
        }
        
        return [Html.freshElement("div", containerAttrs, children)];
    },
    
    /**
     * Handle ODF text box elements
     */
    _handleOdfTextBox: function(element, messages, options) {
        var textContent = this._extractTextContent(element);
        var textboxAttrs = {
            class: "odf-textbox"
        };
        
        // Add basic styling
        var styles = ["border: 1px solid #ccc", "padding: 8px", "display: inline-block"];
        textboxAttrs.style = styles.join("; ");
        
        return [Html.freshElement("div", textboxAttrs, [
            Html.text(textContent || "[Text Box]")
        ])];
    },
    
    /**
     * Handle ODF image elements
     */
    _handleOdfImage: function(element, messages, options) {
        var imageProps = this._extractOdfImageProperties(element);
        
        if (imageProps.href) {
            var imgAttrs = {
                src: imageProps.href,
                alt: imageProps.alt || "Image"
            };
            
            if (imageProps.width) {
                imgAttrs.style = (imgAttrs.style || "") + "width: " + imageProps.width + ";";
            }
            if (imageProps.height) {
                imgAttrs.style = (imgAttrs.style || "") + "height: " + imageProps.height + ";";
            }
            
            return [Html.freshElement("img", imgAttrs)];
        } else {
            messages.push(results.warning("ODF image element missing href attribute"));
            return this._createPlaceholder("ODF Image", messages);
        }
    },
    
    /**
     * Handle ODF embedded objects (like spreadsheets, presentations)
     */
    _handleOdfObject: function(element, messages, options) {
        var objectProps = this._extractOdfObjectProperties(element);
        
        messages.push(results.warning(
            "ODF embedded object converted to placeholder. Type: " + (objectProps.type || "unknown")
        ));
        
        return this._createPlaceholder("Embedded Object: " + (objectProps.type || "Unknown"), messages);
    },
    
    /**
     * Handle ODF custom shapes
     */
    _handleOdfShape: function(element, messages, options) {
        var shapeProps = this._extractOdfShapeProperties(element);
        
        messages.push(results.warning("ODF custom shape converted to placeholder"));
        
        return this._createPlaceholder("Custom Shape", messages, {
            width: shapeProps.width,
            height: shapeProps.height
        });
    },
    
    /**
     * Handle ODF basic shapes (lines, rectangles, circles, etc.)
     */
    _handleOdfBasicShape: function(element, messages, options) {
        var shapeType = element.name.split(':')[1];
        var shapeProps = this._extractOdfShapeProperties(element);
        
        // For basic shapes, we could potentially use SVG or CSS
        // For now, create styled placeholders
        var shapeAttrs = {
            class: "odf-shape odf-" + shapeType
        };
        
        var styles = [];
        
        if (shapeProps.width) {
            styles.push("width: " + shapeProps.width);
        }
        if (shapeProps.height) {
            styles.push("height: " + shapeProps.height);
        }
        
        // Basic shape styling
        switch (shapeType) {
        case "rect":
            styles.push("border: 1px solid #000", "background-color: transparent");
            break;
        case "circle":
        case "ellipse":
            styles.push("border: 1px solid #000", "border-radius: 50%", "background-color: transparent");
            break;
        case "line":
            styles.push("border-top: 1px solid #000", "height: 0");
            break;
        }
        
        if (styles.length > 0) {
            shapeAttrs.style = styles.join("; ");
        }
        
        return [Html.freshElement("div", shapeAttrs, [
            Html.text("[" + shapeType.toUpperCase() + "]")
        ])];
    },
    
    /**
     * Handle Word picture elements (legacy VML)
     */
    _handleWordPicture: function(element, messages, options) {
        messages.push(results.warning("Word VML picture element converted to placeholder"));
        return this._createPlaceholder("VML Picture", messages);
    },
    
    /**
     * Handle Word DrawingML elements (modern Office graphics)
     */
    _handleWordDrawingML: function(element, messages, options) {
        messages.push(results.warning("Word DrawingML element converted to placeholder"));
        return this._createPlaceholder("DrawingML Element", messages);
    },
    
    /**
     * Handle generic drawing elements
     */
    _handleGenericDrawing: function(element, messages, options) {
        var elementName = element.name || element.type;
        messages.push(results.warning("Generic drawing handler used for: " + elementName));
        
        return this._createPlaceholder("Drawing: " + elementName, messages);
    },
    
    // Property extraction methods
    
    _extractOdfFrameProperties: function(element) {
        var props = {};
        
        // SVG positioning and sizing attributes
        if (element.attributes) {
            props.width = element.attributes["svg:width"];
            props.height = element.attributes["svg:height"];
            props.x = element.attributes["svg:x"];
            props.y = element.attributes["svg:y"];
        }
        
        return props;
    },
    
    _extractOdfImageProperties: function(element) {
        var props = {};
        
        if (element.attributes) {
            props.href = element.attributes["xlink:href"];
            props.alt = element.attributes["svg:title"] || element.attributes["svg:desc"];
            props.width = element.attributes["svg:width"];
            props.height = element.attributes["svg:height"];
        }
        
        return props;
    },
    
    _extractOdfObjectProperties: function(element) {
        var props = {};
        
        if (element.attributes) {
            props.href = element.attributes["xlink:href"];
            props.type = element.attributes["xlink:type"];
        }
        
        return props;
    },
    
    _extractOdfShapeProperties: function(element) {
        var props = {};
        
        if (element.attributes) {
            props.width = element.attributes["svg:width"];
            props.height = element.attributes["svg:height"];
            props.x = element.attributes["svg:x"];
            props.y = element.attributes["svg:y"];
        }
        
        return props;
    },
    
    _extractChartInfo: function(element) {
        var info = {};
        
        // Try to extract chart type and other metadata
        if (element.attributes) {
            info.type = element.attributes["type"] || element.attributes["chart:class"];
        }
        
        return info;
    },
    
    // Utility methods
    
    _extractNamespace: function(elementName) {
        var colonIndex = elementName.indexOf(':');
        return colonIndex !== -1 ? elementName.substring(0, colonIndex) : null;
    },
    
    _extractTextContent: function(element) {
        if (element.type === "text") {
            return element.value || "";
        }
        
        if (element.children && Array.isArray(element.children)) {
            return element.children.map(function(child) {
                return this._extractTextContent(child);
            }.bind(this)).join(" ");
        }
        
        return "";
    },
    
    /**
     * Create a styled placeholder for unsupported drawing elements
     */
    _createPlaceholder: function(text, messages, dimensions) {
        var placeholderAttrs = {
            class: "drawing-placeholder",
            title: "Unsupported drawing element: " + text
        };
        
        var styles = [
            "display: inline-block",
            "border: 2px dashed #ccc",
            "background-color: #f9f9f9",
            "padding: 8px",
            "text-align: center",
            "color: #666",
            "font-style: italic"
        ];
        
        if (dimensions) {
            if (dimensions.width) {
                styles.push("width: " + dimensions.width);
            }
            if (dimensions.height) {
                styles.push("height: " + dimensions.height);
            }
        } else {
            styles.push("min-width: 100px", "min-height: 50px");
        }
        
        placeholderAttrs.style = styles.join("; ");
        
        return [Html.freshElement("div", placeholderAttrs, [
            Html.text("[" + text + "]")
        ])];
    },
    
    /**
     * Create a placeholder specifically for charts
     */
    _createChartPlaceholder: function(chartInfo, messages) {
        var chartType = chartInfo.type || "Chart";
        var placeholderAttrs = {
            class: "chart-placeholder",
            title: "Chart element: " + chartType
        };
        
        var styles = [
            "display: block",
            "border: 2px solid #4CAF50",
            "background-color: #E8F5E8",
            "padding: 20px",
            "text-align: center",
            "color: #2E7D32",
            "font-weight: bold",
            "margin: 10px 0",
            "min-height: 200px",
            "position: relative"
        ];
        
        placeholderAttrs.style = styles.join("; ");
        
        return [Html.freshElement("div", placeholderAttrs, [
            Html.freshElement("div", {
                style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
            }, [
                Html.text("📊 " + chartType)
            ])
        ])];
    }
};

module.exports = DrawingHandler;
