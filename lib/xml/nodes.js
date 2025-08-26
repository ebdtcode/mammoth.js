var _ = require("underscore");


exports.Element = Element;
exports.element = function(name, attributes, children) {
    return new Element(name, attributes, children);
};
exports.text = function(value) {
    return {
        type: "text",
        value: value
    };
};


var emptyElement = exports.emptyElement = {
    first: function() {
        return null;
    },
    firstOrEmpty: function() {
        return emptyElement;
    },
    attributes: {},
    children: []
};

function Element(name, attributes, children) {
    this.type = "element";
    this.name = name;
    this.attributes = attributes || {};
    this.children = children || [];
}

Element.prototype.first = function(name) {
    return _.find(this.children, function(child) {
        return child.name === name;
    });
};

Element.prototype.firstOrEmpty = function(name) {
    return this.first(name) || emptyElement;
};

Element.prototype.getElementsByTagName = function(name) {
    var elements = _.filter(this.children, function(child) {
        return child.name === name;
    });
    return toElementList(elements);
};

// Enhanced XML operations for comprehensive document processing
Element.prototype.getAllChildren = function() {
    var result = [];
    function traverse(element) {
        if (element.children) {
            element.children.forEach(function(child) {
                result.push(child);
                if (child.type === "element") {
                    traverse(child);
                }
            });
        }
    }
    traverse(this);
    return toElementList(result);
};

// XPath-like query support for elements
Element.prototype.selectNodes = function(path) {
    var parts = path.split("/").filter(function(part) {
        return part !== "";
    });
    var results = [this];
    
    parts.forEach(function(part) {
        var newResults = [];
        results.forEach(function(element) {
            if (part === "*") {
                // Select all element children
                newResults = newResults.concat(element.children.filter(function(child) {
                    return child.type === "element";
                }));
            } else if (part.startsWith("@")) {
                // Attribute selector - return attribute values as text nodes
                var attrName = part.substring(1);
                if (element.attributes && element.attributes[attrName]) {
                    newResults.push({
                        type: "text",
                        value: element.attributes[attrName]
                    });
                }
            } else {
                // Element name selector
                newResults = newResults.concat(element.children.filter(function(child) {
                    return child.type === "element" && child.name === part;
                }));
            }
        });
        results = newResults;
    });
    
    return toElementList(results);
};

// Get text content of element and all descendants
Element.prototype.getInnerText = function() {
    var text = "";
    
    function collectText(element) {
        if (element.type === "text") {
            text += element.value;
        } else if (element.children) {
            element.children.forEach(collectText);
        }
    }
    
    collectText(this);
    return text;
};

// Enhanced attribute access
Element.prototype.getAttribute = function(name, defaultValue) {
    return this.attributes[name] || defaultValue || null;
};

Element.prototype.hasAttribute = function(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name);
};

// Namespace-aware element lookup
Element.prototype.firstByNamespace = function(namespace, localName) {
    var qualifiedName = namespace + ":" + localName;
    return this.first(qualifiedName) || this.first(localName);
};

Element.prototype.firstOrEmptyByNamespace = function(namespace, localName) {
    return this.firstByNamespace(namespace, localName) || emptyElement;
};

Element.prototype.text = function() {
    if (this.children.length === 0) {
        return "";
    } else if (this.children.length === 1 && this.children[0].type === "text") {
        return this.children[0].value;
    } else {
        // Handle mixed content by concatenating all text nodes
        return this.children
            .filter(function(child) {
                return child.type === "text";
            })
            .map(function(child) {
                return child.value;
            })
            .join("");
    }
};

// Simple XSLT-like transformation support
Element.prototype.transform = function(template) {
    var self = this;
    
    function processTemplate(templateNode, context) {
        if (typeof templateNode === "string") {
            // Text template - perform variable substitution
            return templateNode.replace(/\{([^}]+)\}/g, function(match, path) {
                var nodes = context.selectNodes(path);
                if (nodes.length > 0) {
                    return nodes[0].type === "text" ? nodes[0].value : nodes[0].getInnerText();
                }
                return "";
            });
        } else if (templateNode.type === "element") {
            // Element template
            var newElement = new Element(templateNode.name, templateNode.attributes, []);
            
            if (templateNode.children) {
                templateNode.children.forEach(function(child) {
                    var result = processTemplate(child, context);
                    if (typeof result === "string") {
                        newElement.children.push({type: "text", value: result});
                    } else if (result) {
                        newElement.children.push(result);
                    }
                });
            }
            
            return newElement;
        }
        return templateNode;
    }
    
    return processTemplate(template, self);
};

// Convert element to simple object for template processing
Element.prototype.toObject = function() {
    var obj = {
        name: this.name,
        attributes: this.attributes,
        text: this.getInnerText()
    };
    
    if (this.children && this.children.length > 0) {
        obj.children = this.children.map(function(child) {
            return child.type === "element" ? child.toObject() : child;
        });
    }
    
    return obj;
};

var elementListPrototype = {
    getElementsByTagName: function(name) {
        return toElementList(_.flatten(this.map(function(element) {
            return element.getElementsByTagName(name);
        }, true)));
    },
    
    selectNodes: function(path) {
        return toElementList(_.flatten(this.map(function(element) {
            return element.selectNodes ? element.selectNodes(path) : [];
        }, true)));
    },
    
    text: function() {
        return this.map(function(element) {
            return element.type === "text" ? element.value : element.getInnerText();
        }).join("");
    }
};

function toElementList(array) {
    return _.extend(array, elementListPrototype);
}
