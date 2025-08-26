var Html = require("../html");
var results = require("../results");

/**
 * MathHandler processes mathematical equations and formulas from
 * Office Math Markup Language (OMML) and OpenDocument Formula (ODF).
 */
var MathHandler = {
    
    /**
     * Handle math elements
     *
     * @param {Object} element Math element
     * @param {Array} messages Message array
     * @param {Object} options Conversion options
     * @returns {Array} HTML nodes
     */
    handle: function(element, messages, options) {
        try {
            var elementName = element.name || element.type;
            var namespace = this._extractNamespace(elementName);
            
            if (namespace === "m") {
                return this._handleOfficeMath(element, messages, options);
            } else if (namespace === "math" || elementName.startsWith("math:")) {
                return this._handleOdfMath(element, messages, options);
            } else if (elementName.includes("equation") || elementName.includes("formula")) {
                return this._handleGenericMath(element, messages, options);
            }
            
            return this._handleUnknownMath(element, messages, options);
        } catch (error) {
            messages.push(results.error("Error handling math element: " + error.message));
            return this._createMathPlaceholder("Math Error", messages);
        }
    },
    
    /**
     * Handle Office Math Markup Language (OMML) elements
     */
    _handleOfficeMath: function(element, messages, options) {
        var mathType = element.name.split(':')[1];
        
        switch (mathType) {
        case "oMath":
            return this._handleOMathElement(element, messages, options);
        case "oMathPara":
            return this._handleOMathPara(element, messages, options);
        case "r":
            return this._handleMathRun(element, messages, options);
        case "t":
            return this._handleMathText(element, messages, options);
        case "f":
            return this._handleFraction(element, messages, options);
        case "sup":
            return this._handleSuperscript(element, messages, options);
        case "sub":
            return this._handleSubscript(element, messages, options);
        case "sSup":
            return this._handleSubSuperscript(element, messages, options);
        case "rad":
            return this._handleRadical(element, messages, options);
        case "d":
            return this._handleDelimiter(element, messages, options);
        case "m":
            return this._handleMatrix(element, messages, options);
        case "func":
            return this._handleFunction(element, messages, options);
        case "acc":
            return this._handleAccent(element, messages, options);
        case "lim":
            return this._handleLimit(element, messages, options);
        default:
            messages.push(results.warning("Unknown OMML math element: " + element.name));
            return this._handleGenericOMMLElement(element, messages, options);
        }
    },
    
    /**
     * Handle OpenDocument Formula (ODF) math elements
     */
    _handleOdfMath: function(element, messages, options) {
        messages.push(results.warning("ODF math support is limited"));
        return this._createMathPlaceholder("ODF Formula", messages);
    },
    
    /**
     * Handle main math element (m:oMath)
     */
    _handleOMathElement: function(element, messages, options) {
        var mathContent = this._processMathChildren(element, messages, options);
        
        // Create container with proper math styling
        return [Html.freshElement("span", {
            class: "math-container",
            style: "font-family: 'Times New Roman', serif; font-style: italic;"
        }, mathContent)];
    },
    
    /**
     * Handle math paragraph (m:oMathPara) - displayed math
     */
    _handleOMathPara: function(element, messages, options) {
        var mathContent = this._processMathChildren(element, messages, options);
        
        // Create block-level math container
        return [Html.freshElement("div", {
            class: "math-para",
            style: "text-align: center; margin: 10px 0; font-family: 'Times New Roman', serif; font-style: italic;"
        }, mathContent)];
    },
    
    /**
     * Handle math run (m:r) - basic math text container
     */
    _handleMathRun: function(element, messages, options) {
        return this._processMathChildren(element, messages, options);
    },
    
    /**
     * Handle math text (m:t) - actual math text content
     */
    _handleMathText: function(element, messages, options) {
        var text = this._extractTextContent(element);
        return [Html.text(text)];
    },
    
    /**
     * Handle fractions (m:f)
     */
    _handleFraction: function(element, messages, options) {
        var numerator = this._getMathChild(element, "m:num", messages, options);
        var denominator = this._getMathChild(element, "m:den", messages, options);
        
        if (options.outputFormat === "mathml") {
            return this._createMathMLFraction(numerator, denominator);
        } else {
            return this._createHTMLFraction(numerator, denominator);
        }
    },
    
    /**
     * Handle superscript (m:sup)
     */
    _handleSuperscript: function(element, messages, options) {
        var base = this._getMathChild(element, "m:e", messages, options);
        var superscript = this._getMathChild(element, "m:sup", messages, options);
        
        return base.concat([
            Html.freshElement("sup", {
                style: "font-size: 0.8em;"
            }, superscript)
        ]);
    },
    
    /**
     * Handle subscript (m:sub)
     */
    _handleSubscript: function(element, messages, options) {
        var base = this._getMathChild(element, "m:e", messages, options);
        var subscript = this._getMathChild(element, "m:sub", messages, options);
        
        return base.concat([
            Html.freshElement("sub", {
                style: "font-size: 0.8em;"
            }, subscript)
        ]);
    },
    
    /**
     * Handle subscript-superscript (m:sSup)
     */
    _handleSubSuperscript: function(element, messages, options) {
        var base = this._getMathChild(element, "m:e", messages, options);
        var subscript = this._getMathChild(element, "m:sub", messages, options);
        var superscript = this._getMathChild(element, "m:sup", messages, options);
        
        return base.concat([
            Html.freshElement("sub", {
                style: "font-size: 0.8em;"
            }, subscript),
            Html.freshElement("sup", {
                style: "font-size: 0.8em;"
            }, superscript)
        ]);
    },
    
    /**
     * Handle radical/square root (m:rad)
     */
    _handleRadical: function(element, messages, options) {
        var base = this._getMathChild(element, "m:e", messages, options);
        var degree = this._getMathChild(element, "m:deg", messages, options);
        
        if (degree && degree.length > 0) {
            // nth root
            return [Html.freshElement("span", {
                class: "math-radical",
                style: "position: relative;"
            }, [
                Html.freshElement("sup", {
                    style: "font-size: 0.7em; position: absolute; left: 0; top: -0.3em;"
                }, degree),
                Html.text("√"),
                Html.freshElement("span", {
                    style: "border-top: 1px solid; padding-top: 1px;"
                }, base)
            ])];
        } else {
            // square root
            return [
                Html.text("√"),
                Html.freshElement("span", {
                    style: "border-top: 1px solid; padding-top: 1px;"
                }, base)
            ];
        }
    },
    
    /**
     * Handle delimiters (m:d) - parentheses, brackets, etc.
     */
    _handleDelimiter: function(element, messages, options) {
        var content = this._getMathChild(element, "m:e", messages, options);
        var delimiterProps = this._extractDelimiterProperties(element);
        
        var openChar = delimiterProps.open || "(";
        var closeChar = delimiterProps.close || ")";
        
        return [
            Html.text(openChar)
        ].concat(content).concat([
            Html.text(closeChar)
        ]);
    },
    
    /**
     * Handle matrix (m:m)
     */
    _handleMatrix: function(element, messages, options) {
        messages.push(results.warning("Matrix converted to simplified representation"));
        
        var matrixRows = element.elements("m:mr");
        var tableRows = matrixRows.map(function(row) {
            var cells = row.elements("m:e").map(function(cell) {
                var cellContent = this._processMathChildren(cell, messages, options);
                return Html.freshElement("td", {
                    style: "padding: 4px 8px; text-align: center; border: none;"
                }, cellContent);
            }.bind(this));
            
            return Html.freshElement("tr", {}, cells);
        }.bind(this));
        
        return [Html.freshElement("table", {
            class: "math-matrix",
            style: "display: inline-table; vertical-align: middle; border-collapse: collapse;"
        }, tableRows)];
    },
    
    /**
     * Handle function (m:func)
     */
    _handleFunction: function(element, messages, options) {
        var funcName = this._getMathChild(element, "m:fName", messages, options);
        var argument = this._getMathChild(element, "m:e", messages, options);
        
        return funcName.concat(argument);
    },
    
    /**
     * Handle accent (m:acc)
     */
    _handleAccent: function(element, messages, options) {
        var base = this._getMathChild(element, "m:e", messages, options);
        var accent = this._extractAccentChar(element);
        
        return [Html.freshElement("span", {
            class: "math-accent",
            style: "position: relative;"
        }, base.concat([
            Html.freshElement("span", {
                style: "position: absolute; top: -0.8em; left: 50%; transform: translateX(-50%); font-size: 0.8em;"
            }, [Html.text(accent)])
        ]))];
    },
    
    /**
     * Handle limit (m:lim)
     */
    _handleLimit: function(element, messages, options) {
        messages.push(results.warning("Limit structure simplified"));
        return this._processMathChildren(element, messages, options);
    },
    
    /**
     * Handle generic OMML elements
     */
    _handleGenericOMMLElement: function(element, messages, options) {
        return this._processMathChildren(element, messages, options);
    },
    
    /**
     * Handle generic math expressions
     */
    _handleGenericMath: function(element, messages, options) {
        var mathText = this._extractTextContent(element);
        if (mathText.trim()) {
            messages.push(results.warning("Generic math expression: " + mathText));
            return [Html.freshElement("span", {
                class: "math-expression",
                style: "font-family: 'Times New Roman', serif; font-style: italic;"
            }, [Html.text(mathText)])];
        }
        
        return this._createMathPlaceholder("Math Expression", messages);
    },
    
    /**
     * Handle unknown math elements
     */
    _handleUnknownMath: function(element, messages, options) {
        var elementName = element.name || element.type;
        messages.push(results.warning("Unknown math element: " + elementName));
        return this._createMathPlaceholder("Unknown Math: " + elementName, messages);
    },
    
    // Utility methods
    
    _processMathChildren: function(element, messages, options) {
        if (!element.children || !Array.isArray(element.children)) {
            return [];
        }
        
        return element.children.map(function(child) {
            return this.handle(child, messages, options);
        }.bind(this)).reduce(function(acc, val) {
            return acc.concat(val);
        }, []);
    },
    
    _getMathChild: function(element, childName, messages, options) {
        var child = element.first(childName);
        if (child) {
            return this._processMathChildren(child, messages, options);
        }
        return [];
    },
    
    _extractDelimiterProperties: function(element) {
        var props = {};
        var dPr = element.first("m:dPr");
        
        if (dPr) {
            var begChr = dPr.first("m:begChr");
            var endChr = dPr.first("m:endChr");
            
            if (begChr) {
                props.open = begChr.attributes["m:val"] || "(";
            }
            if (endChr) {
                props.close = endChr.attributes["m:val"] || ")";
            }
        }
        
        return props;
    },
    
    _extractAccentChar: function(element) {
        var accPr = element.first("m:accPr");
        if (accPr) {
            var chr = accPr.first("m:chr");
            if (chr) {
                return chr.attributes["m:val"] || "̂";
            }
        }
        return "̂"; // Default circumflex accent
    },
    
    _extractTextContent: function(element) {
        if (element.type === "text") {
            return element.value || "";
        }
        
        if (element.children && Array.isArray(element.children)) {
            return element.children.map(function(child) {
                return this._extractTextContent(child);
            }.bind(this)).join("");
        }
        
        return "";
    },
    
    _extractNamespace: function(elementName) {
        var colonIndex = elementName.indexOf(':');
        return colonIndex !== -1 ? elementName.substring(0, colonIndex) : null;
    },
    
    /**
     * Create HTML fraction representation
     */
    _createHTMLFraction: function(numerator, denominator) {
        return [Html.freshElement("span", {
            class: "math-fraction",
            style: "display: inline-block; vertical-align: middle; text-align: center;"
        }, [
            Html.freshElement("div", {
                style: "border-bottom: 1px solid; padding-bottom: 2px;"
            }, numerator),
            Html.freshElement("div", {
                style: "padding-top: 2px;"
            }, denominator)
        ])];
    },
    
    /**
     * Create MathML fraction representation
     */
    _createMathMLFraction: function(numerator, denominator) {
        return [Html.freshElement("mfrac", {}, [
            Html.freshElement("mrow", {}, numerator),
            Html.freshElement("mrow", {}, denominator)
        ])];
    },
    
    /**
     * Create a styled placeholder for math elements
     */
    _createMathPlaceholder: function(mathType, messages) {
        return [Html.freshElement("span", {
            class: "math-placeholder",
            style: "background-color: #fff3e0; border: 1px solid #f57c00; padding: 2px 6px; border-radius: 3px; font-family: monospace;",
            title: "Mathematical expression: " + mathType
        }, [Html.text("🔢 " + mathType)])];
    },
    
    /**
     * Convert common math symbols to Unicode
     */
    _convertMathSymbols: function(text) {
        var symbolMap = {
            "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε",
            "theta": "θ", "lambda": "λ", "mu": "μ", "pi": "π", "sigma": "σ",
            "phi": "φ", "omega": "ω",
            "Alpha": "Α", "Beta": "Β", "Gamma": "Γ", "Delta": "Δ", "Theta": "Θ",
            "Lambda": "Λ", "Pi": "Π", "Sigma": "Σ", "Phi": "Φ", "Omega": "Ω",
            "sum": "∑", "prod": "∏", "int": "∫", "partial": "∂",
            "infty": "∞", "pm": "±", "mp": "∓",
            "le": "≤", "ge": "≥", "ne": "≠", "approx": "≈", "equiv": "≡",
            "subset": "⊂", "supset": "⊃", "in": "∈", "ni": "∋",
            "cap": "∩", "cup": "∪", "vee": "∨", "wedge": "∧"
        };
        
        return text.replace(/\\([a-zA-Z]+)/g, function(match, symbol) {
            return symbolMap[symbol] || match;
        });
    }
};

module.exports = MathHandler;
