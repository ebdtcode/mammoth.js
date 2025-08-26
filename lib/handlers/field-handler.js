var Html = require("../html");
var results = require("../results");

/**
 * FieldHandler manages complex fields and forms including form controls,
 * field codes, hyperlinks, and other interactive elements.
 */
var FieldHandler = {
    
    /**
     * Handle field elements
     *
     * @param {Object} element Field element
     * @param {Array} messages Message array
     * @param {Object} options Conversion options
     * @returns {Array} HTML nodes
     */
    handle: function(element, messages, options) {
        try {
            var elementName = element.name || element.type;
            
            if (elementName === "w:fldSimple") {
                return this._handleSimpleField(element, messages, options);
            } else if (elementName === "w:hyperlink") {
                return this._handleHyperlink(element, messages, options);
            } else if (elementName.includes("form") || elementName.includes("input")) {
                return this._handleFormElement(element, messages, options);
            } else if (elementName.includes("fld") || elementName.includes("field")) {
                return this._handleComplexField(element, messages, options);
            }
            
            return this._handleGenericField(element, messages, options);
        } catch (error) {
            messages.push(results.error("Error handling field element: " + error.message));
            return [];
        }
    },
    
    /**
     * Handle simple field elements (w:fldSimple)
     */
    _handleSimpleField: function(element, messages, options) {
        var fieldCode = element.attributes && element.attributes["w:instr"];
        var fieldInfo = this._parseFieldCode(fieldCode);
        
        switch (fieldInfo.type.toLowerCase()) {
        case "hyperlink":
            return this._createHyperlinkFromField(fieldInfo, element, messages, options);
        case "date":
        case "time":
        case "datetime":
            return this._createDateTimeField(fieldInfo, element, messages, options);
        case "page":
            return this._createPageField(fieldInfo, element, messages, options);
        case "numpages":
            return this._createNumPagesField(fieldInfo, element, messages, options);
        case "author":
        case "title":
        case "subject":
        case "keywords":
            return this._createDocumentPropertyField(fieldInfo, element, messages, options);
        case "toc":
        case "tableofcontents":
            return this._createTocField(fieldInfo, element, messages, options);
        case "ref":
        case "pageref":
            return this._createReferenceField(fieldInfo, element, messages, options);
        case "seq":
            return this._createSequenceField(fieldInfo, element, messages, options);
        case "includepicture":
            return this._createIncludePictureField(fieldInfo, element, messages, options);
        default:
            return this._createGenericFieldPlaceholder(fieldInfo, element, messages, options);
        }
    },
    
    /**
     * Handle hyperlink elements with enhanced features
     */
    _handleHyperlink: function(element, messages, options) {
        var href = element.attributes["r:id"] ?
            this._resolveRelationshipId(element.attributes["r:id"], options) :
            element.attributes["w:anchor"] ? "#" + element.attributes["w:anchor"] : "#";
        
        var target = element.attributes["w:tgtFrame"];
        var tooltip = element.attributes["w:tooltip"];
        
        // Sanitize URL if security is enabled
        if (options.urlSanitizer) {
            try {
                var originalHref = href;
                href = options.urlSanitizer.sanitizeUrl(href);
                
                if (href !== originalHref && href === '#') {
                    messages.push(results.warning(
                        "Hyperlink URL was sanitized for security reasons: '" + originalHref + "'"
                    ));
                }
            } catch (error) {
                messages.push(results.error(
                    "Hyperlink URL blocked for security reasons: " + error.message
                ));
                href = '#';
            }
        }
        
        var attributes = {href: href};
        
        if (target) {
            if (target === '_blank' || target === '_self' || target === '_parent' || target === '_top') {
                attributes.target = target;
                if (target === '_blank') {
                    attributes.rel = 'noopener';
                }
            } else if (options.urlSanitizer) {
                attributes.target = target.replace(/[<>"']/g, '');
            } else {
                attributes.target = target;
            }
        }
        
        if (tooltip) {
            attributes.title = tooltip;
        }
        
        // Process child content
        var children = this._processFieldContent(element, messages, options);
        
        return [Html.nonFreshElement("a", attributes, children)];
    },
    
    /**
     * Handle form elements (checkboxes, text inputs, dropdowns)
     */
    _handleFormElement: function(element, messages, options) {
        var elementName = element.name || element.type;
        
        if (elementName.includes("checkbox")) {
            return this._handleFormCheckbox(element, messages, options);
        } else if (elementName.includes("textinput") || elementName.includes("text")) {
            return this._handleFormTextInput(element, messages, options);
        } else if (elementName.includes("dropdown") || elementName.includes("select")) {
            return this._handleFormDropdown(element, messages, options);
        }
        
        messages.push(results.warning("Unknown form element: " + elementName));
        return this._createFormPlaceholder(elementName, messages);
    },
    
    /**
     * Handle complex field structures (field begin/separate/end)
     */
    _handleComplexField: function(element, messages, options) {
        messages.push(results.warning("Complex field converted to placeholder: " + (element.name || element.type)));
        return this._createFieldPlaceholder("Complex Field", messages);
    },
    
    /**
     * Handle generic field elements
     */
    _handleGenericField: function(element, messages, options) {
        var elementName = element.name || element.type;
        messages.push(results.warning("Generic field handler used for: " + elementName));
        
        var textContent = this._extractTextContent(element);
        return textContent ? [Html.text(textContent)] : this._createFieldPlaceholder(elementName, messages);
    },
    
    // Specific field type handlers
    
    _createHyperlinkFromField: function(fieldInfo, element, messages, options) {
        var url = fieldInfo.args[0] || "#";
        var children = this._processFieldContent(element, messages, options);
        
        return [Html.nonFreshElement("a", {href: url}, children)];
    },
    
    _createDateTimeField: function(fieldInfo, element, messages, options) {
        var now = new Date();
        var dateText;
        
        switch (fieldInfo.type.toLowerCase()) {
        case "date":
            dateText = now.toLocaleDateString();
            break;
        case "time":
            dateText = now.toLocaleTimeString();
            break;
        default:
            dateText = now.toLocaleString();
        }
        
        return [Html.freshElement("span", {
            class: "field-date",
            title: "Field: " + fieldInfo.type + " (computed at conversion time)"
        }, [Html.text(dateText)])];
    },
    
    _createPageField: function(fieldInfo, element, messages, options) {
        return [Html.freshElement("span", {
            class: "field-page"
        }, [Html.text("[Page]")])];
    },
    
    _createNumPagesField: function(fieldInfo, element, messages, options) {
        return [Html.freshElement("span", {
            class: "field-numpages"
        }, [Html.text("[Total Pages]")])];
    },
    
    _createDocumentPropertyField: function(fieldInfo, element, messages, options) {
        var propertyName = fieldInfo.type;
        var placeholderText = "[" + propertyName.toUpperCase() + "]";
        
        return [Html.freshElement("span", {
            class: "field-docproperty",
            "data-property": propertyName
        }, [Html.text(placeholderText)])];
    },
    
    _createTocField: function(fieldInfo, element, messages, options) {
        messages.push(results.warning("Table of Contents field converted to placeholder"));
        
        return [Html.freshElement("div", {
            class: "field-toc",
            style: "border: 1px dashed #ccc; padding: 10px; background-color: #f9f9f9;"
        }, [
            Html.freshElement("h3", {}, [Html.text("Table of Contents")]),
            Html.freshElement("p", {style: "font-style: italic; color: #666;"},
                [Html.text("(Table of Contents would be generated here)")])
        ])];
    },
    
    _createReferenceField: function(fieldInfo, element, messages, options) {
        var refType = fieldInfo.type.toLowerCase();
        var bookmark = fieldInfo.args[0] || "unknown";
        
        var linkText = refType === "pageref" ? "[Page Reference]" : "[Reference]";
        
        return [Html.freshElement("a", {
            href: "#" + bookmark,
            class: "field-reference",
            title: "Reference to: " + bookmark
        }, [Html.text(linkText)])];
    },
    
    _createSequenceField: function(fieldInfo, element, messages, options) {
        var seqName = fieldInfo.args[0] || "figure";
        return [Html.freshElement("span", {
            class: "field-sequence",
            "data-sequence": seqName
        }, [Html.text("[" + seqName + " #]")])];
    },
    
    _createIncludePictureField: function(fieldInfo, element, messages, options) {
        var imagePath = fieldInfo.args[0];
        
        if (imagePath) {
            messages.push(results.warning("INCLUDEPICTURE field: " + imagePath));
            return [Html.freshElement("img", {
                src: imagePath,
                alt: "Included picture",
                style: "max-width: 100%; height: auto;"
            })];
        } else {
            return this._createFieldPlaceholder("Include Picture", messages);
        }
    },
    
    _createGenericFieldPlaceholder: function(fieldInfo, element, messages, options) {
        var fieldCode = fieldInfo.original || fieldInfo.type;
        messages.push(results.warning("Unknown field type converted to placeholder: " + fieldInfo.type));
        
        return [Html.freshElement("span", {
            class: "field-placeholder",
            title: "Field code: " + fieldCode,
            style: "background-color: #fff3cd; border: 1px solid #856404; padding: 2px 4px; font-family: monospace;"
        }, [Html.text("[" + fieldInfo.type + "]")])];
    },
    
    // Form element handlers
    
    _handleFormCheckbox: function(element, messages, options) {
        var checked = this._isCheckboxChecked(element);
        var attributes = {type: "checkbox"};
        
        if (checked) {
            attributes.checked = "checked";
        }
        
        // Add name if available
        var name = element.attributes && element.attributes["w:name"];
        if (name) {
            attributes.name = name;
        }
        
        return [Html.freshElement("input", attributes)];
    },
    
    _handleFormTextInput: function(element, messages, options) {
        var attributes = {
            type: "text",
            class: "form-textinput"
        };
        
        // Extract properties
        var defaultValue = element.attributes && element.attributes["w:default"];
        if (defaultValue) {
            attributes.value = defaultValue;
        }
        
        var maxLength = element.attributes && element.attributes["w:maxLength"];
        if (maxLength) {
            attributes.maxlength = maxLength;
        }
        
        var name = element.attributes && element.attributes["w:name"];
        if (name) {
            attributes.name = name;
        }
        
        return [Html.freshElement("input", attributes)];
    },
    
    _handleFormDropdown: function(element, messages, options) {
        var selectAttrs = {
            class: "form-dropdown"
        };
        
        var name = element.attributes && element.attributes["w:name"];
        if (name) {
            selectAttrs.name = name;
        }
        
        var options = this._extractDropdownOptions(element);
        var optionElements = options.map(function(option) {
            var optionAttrs = {value: option.value};
            if (option.selected) {
                optionAttrs.selected = "selected";
            }
            return Html.freshElement("option", optionAttrs, [Html.text(option.text)]);
        });
        
        return [Html.freshElement("select", selectAttrs, optionElements)];
    },
    
    // Utility methods
    
    _parseFieldCode: function(fieldCode) {
        if (!fieldCode) {
            return {type: "unknown", args: [], original: fieldCode};
        }
        
        // Simple field code parsing
        var parts = fieldCode.trim().split(/\s+/);
        var type = parts[0] || "unknown";
        var args = parts.slice(1);
        
        // Handle quoted arguments
        var processedArgs = [];
        var currentArg = "";
        var inQuotes = false;
        
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            
            if (arg.startsWith('"') && arg.endsWith('"') && arg.length > 1) {
                processedArgs.push(arg.slice(1, -1));
            } else if (arg.startsWith('"')) {
                inQuotes = true;
                currentArg = arg.slice(1);
            } else if (arg.endsWith('"') && inQuotes) {
                inQuotes = false;
                currentArg += " " + arg.slice(0, -1);
                processedArgs.push(currentArg);
                currentArg = "";
            } else if (inQuotes) {
                currentArg += " " + arg;
            } else {
                processedArgs.push(arg);
            }
        }
        
        return {
            type: type,
            args: processedArgs,
            original: fieldCode
        };
    },
    
    _processFieldContent: function(element, messages, options) {
        if (element.children && Array.isArray(element.children)) {
            // This would delegate back to main conversion pipeline
            // For now, extract text content
            return [Html.text(this._extractTextContent(element))];
        }
        
        return [Html.text("[Field Content]")];
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
    
    _resolveRelationshipId: function(rId, options) {
        // This would lookup relationship by ID in document relationships
        // For now, return placeholder
        return "#relationship-" + rId;
    },
    
    _isCheckboxChecked: function(element) {
        // Check various ways a checkbox might be marked as checked
        if (element.attributes) {
            return element.attributes["w:checked"] === "1" ||
                   element.attributes["w:checked"] === "true" ||
                   element.attributes["w:default"] === "1";
        }
        return false;
    },
    
    _extractDropdownOptions: function(element) {
        // Extract dropdown options from form element
        // This would parse w:ddlList or similar elements
        return [
            {value: "option1", text: "Option 1", selected: false},
            {value: "option2", text: "Option 2", selected: true}
        ];
    },
    
    _createFieldPlaceholder: function(fieldType, messages) {
        return [Html.freshElement("span", {
            class: "field-placeholder",
            style: "background-color: #e3f2fd; border: 1px solid #1976d2; padding: 2px 4px; font-style: italic;"
        }, [Html.text("[" + fieldType + "]")])];
    },
    
    _createFormPlaceholder: function(formType, messages) {
        return [Html.freshElement("span", {
            class: "form-placeholder",
            style: "background-color: #f3e5f5; border: 1px solid #7b1fa2; padding: 2px 4px; font-style: italic;"
        }, [Html.text("[" + formType + "]")])];
    }
};

module.exports = FieldHandler;
