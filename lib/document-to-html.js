var _ = require("underscore");

var promises = require("./promises");
var documents = require("./documents");
var htmlPaths = require("./styles/html-paths");
var results = require("./results");
var images = require("./images");
var Html = require("./html");
var writers = require("./writers");
var sanitizer = require("./security/sanitizer");
var elementHandlerRegistry = require("./handlers/element-handler-registry");

exports.DocumentConverter = DocumentConverter;


function DocumentConverter(options) {
    return {
        convertToHtml: function(element) {
            var comments = _.indexBy(
                element.type === documents.types.document ? element.comments : [],
                "commentId"
            );
            var conversion = new DocumentConversion(options, comments);
            return conversion.convertToHtml(element);
        },
        
        /**
         * Access to the extensible element handler registry
         * Allows registration of custom handlers for unsupported elements
         */
        handlers: elementHandlerRegistry
    };
}

function DocumentConversion(options, comments) {
    var noteNumber = 1;

    var noteReferences = [];
    
    // Track unique notes and their references for deduplication
    var uniqueNotes = {}; // Object<noteKey, {note: noteObject, refs: [refInfo], displayNumber: number}>
    var noteRefCounter = {}; // Object<noteKey, counter> for generating unique ref IDs

    var referencedComments = [];

    options = _.extend({ignoreEmptyParagraphs: true}, options);
    var idPrefix = options.idPrefix === undefined ? "" : options.idPrefix;
    var ignoreEmptyParagraphs = options.ignoreEmptyParagraphs;
    
    // Initialize security sanitizer
    var urlSanitizer = null;
    if (options.security !== false) {
        urlSanitizer = sanitizer.createSanitizer(options.security);
    }

    var defaultParagraphStyle = htmlPaths.topLevelElement("p");

    var styleMap = options.styleMap || [];

    function convertToHtml(document) {
        var messages = [];

        var html = elementToHtml(document, messages, {});

        var deferredNodes = [];
        walkHtml(html, function(node) {
            if (node.type === "deferred") {
                deferredNodes.push(node);
            }
        });
        var deferredValues = {};
        return promises.mapSeries(deferredNodes, function(deferred) {
            return deferred.value().then(function(value) {
                deferredValues[deferred.id] = value;
            });
        }).then(function() {
            function replaceDeferred(nodes) {
                return flatMap(nodes, function(node) {
                    if (node.type === "deferred") {
                        return deferredValues[node.id];
                    } else if (node.children) {
                        return [
                            _.extend({}, node, {
                                children: replaceDeferred(node.children)
                            })
                        ];
                    } else {
                        return [node];
                    }
                });
            }
            var writer = writers.writer({
                prettyPrint: options.prettyPrint,
                outputFormat: options.outputFormat
            });
            Html.write(writer, Html.simplify(replaceDeferred(html)));
            return new results.Result(writer.asString(), messages);
        });
    }

    function convertElements(elements, messages, options) {
        return flatMap(elements, function(element) {
            return elementToHtml(element, messages, options);
        });
    }

    function elementToHtml(element, messages, options) {
        if (!options) {
            throw new Error("options not set");
        }
        
        // First, check built-in element converters
        var handler = elementConverters[element.type];
        if (handler) {
            return handler(element, messages, options);
        }
        
        // If no built-in handler, check the extensible handler registry
        if (elementHandlerRegistry.hasHandler(element)) {
            // Enhance options with additional context for handlers
            var enhancedOptions = _.extend({}, options, {
                convertElements: convertElements,
                convertToHtml: elementToHtml,
                urlSanitizer: urlSanitizer,
                styleMap: styleMap
            });
            
            return elementHandlerRegistry.handle(element, messages, enhancedOptions);
        }
        
        // No handler found - check if it's an unrecognized XML element
        if (element.name) {
            // This is likely an XML element that wasn't converted to a document model
            messages.push(results.warning("Unrecognized XML element was ignored: " + element.name));
        }
        
        return [];
    }

    function convertParagraph(element, messages, options) {
        return htmlPathForParagraph(element, messages).wrap(function() {
            var content = convertElements(element.children, messages, options);
            if (ignoreEmptyParagraphs) {
                return content;
            } else {
                return [Html.forceWrite].concat(content);
            }
        });
    }

    function htmlPathForParagraph(element, messages) {
        var style = findStyle(element);

        if (style) {
            return style.to;
        } else {
            if (element.styleId) {
                messages.push(unrecognisedStyleWarning("paragraph", element));
            }
            return defaultParagraphStyle;
        }
    }

    function convertRun(run, messages, options) {
        var nodes = function() {
            return convertElements(run.children, messages, options);
        };
        var paths = [];
        if (run.highlight !== null) {
            var path = findHtmlPath({type: "highlight", color: run.highlight});
            if (path) {
                paths.push(path);
            }
        }
        if (run.isSmallCaps) {
            paths.push(findHtmlPathForRunProperty("smallCaps"));
        }
        if (run.isAllCaps) {
            paths.push(findHtmlPathForRunProperty("allCaps"));
        }
        if (run.isStrikethrough) {
            paths.push(findHtmlPathForRunProperty("strikethrough", "s"));
        }
        if (run.isUnderline) {
            paths.push(findHtmlPathForRunProperty("underline"));
        }
        if (run.verticalAlignment === documents.verticalAlignment.subscript) {
            paths.push(htmlPaths.element("sub", {}, {fresh: false}));
        }
        if (run.verticalAlignment === documents.verticalAlignment.superscript) {
            paths.push(htmlPaths.element("sup", {}, {fresh: false}));
        }
        if (run.isItalic) {
            paths.push(findHtmlPathForRunProperty("italic", "em"));
        }
        if (run.isBold) {
            paths.push(findHtmlPathForRunProperty("bold", "strong"));
        }
        var stylePath = htmlPaths.empty;
        var style = findStyle(run);
        if (style) {
            stylePath = style.to;
        } else if (run.styleId) {
            messages.push(unrecognisedStyleWarning("run", run));
        }
        paths.push(stylePath);

        paths.forEach(function(path) {
            nodes = path.wrap.bind(path, nodes);
        });

        return nodes();
    }

    function findHtmlPathForRunProperty(elementType, defaultTagName) {
        var path = findHtmlPath({type: elementType});
        if (path) {
            return path;
        } else if (defaultTagName) {
            return htmlPaths.element(defaultTagName, {}, {fresh: false});
        } else {
            return htmlPaths.empty;
        }
    }

    function findHtmlPath(element, defaultPath) {
        var style = findStyle(element);
        return style ? style.to : defaultPath;
    }

    function findStyle(element) {
        for (var i = 0; i < styleMap.length; i++) {
            if (styleMap[i].from.matches(element)) {
                return styleMap[i];
            }
        }
    }

    function recoveringConvertImage(convertImage) {
        return function(image, messages) {
            return promises.attempt(function() {
                return convertImage(image, messages).then(function(elements) {
                    // Sanitize image src attributes if security is enabled
                    if (urlSanitizer && elements && elements.length > 0) {
                        return elements.map(function(element) {
                            if (element.tag === 'img' && element.attributes && element.attributes.src) {
                                try {
                                    var originalSrc = element.attributes.src;
                                    var sanitizedSrc = urlSanitizer.sanitizeUrl(originalSrc);
                                    
                                    if (sanitizedSrc !== originalSrc) {
                                        if (sanitizedSrc === '#') {
                                            messages.push(results.warning(
                                                "Image src was blocked for security reasons: '" + originalSrc + "'"
                                            ));
                                            // Remove the image element if URL is blocked
                                            return null;
                                        } else {
                                            element.attributes.src = sanitizedSrc;
                                        }
                                    }
                                } catch (error) {
                                    messages.push(results.error(
                                        "Image src blocked for security reasons: " + error.message
                                    ));
                                    return null;
                                }
                            }
                            return element;
                        }).filter(function(element) {
                            return element !== null;
                        });
                    }
                    return elements;
                });
            }).caught(function(error) {
                messages.push(results.error(error));
                return [];
            });
        };
    }

    function noteHtmlId(note) {
        return referentHtmlId(note.noteType, note.noteId);
    }

    function noteRefHtmlId(note) {
        return referenceHtmlId(note.noteType, note.noteId);
    }

    function referentHtmlId(referenceType, referenceId) {
        return htmlId(referenceType + "-" + referenceId);
    }

    function referenceHtmlId(referenceType, referenceId) {
        return htmlId(referenceType + "-ref-" + referenceId);
    }

    function htmlId(suffix) {
        return idPrefix + suffix;
    }

    // Helper function to create unique note key
    function createNoteKey(note) {
        return note.noteType + ":" + note.noteId;
    }

    // Helper function to get or create unique note info
    function getOrCreateUniqueNote(note) {
        var noteKey = createNoteKey(note);
        if (!uniqueNotes[noteKey]) {
            uniqueNotes[noteKey] = {
                note: note,
                refs: [],
                displayNumber: noteNumber++
            };
            noteRefCounter[noteKey] = 0;
        }
        return uniqueNotes[noteKey];
    }

    // Helper function to generate unique reference ID
    function generateUniqueRefId(note) {
        var noteKey = createNoteKey(note);
        var counter = (noteRefCounter[noteKey] || 0) + 1;
        noteRefCounter[noteKey] = counter;
        
        if (counter === 1) {
            return referenceHtmlId(note.noteType, note.noteId);
        } else {
            return referenceHtmlId(note.noteType, note.noteId) + "-" + counter;
        }
    }

    var defaultTablePath = htmlPaths.elements([
        htmlPaths.element("table", {}, {fresh: true})
    ]);

    function convertTable(element, messages, options) {
        return findHtmlPath(element, defaultTablePath).wrap(function() {
            var tableAttributes = {};
            var tableStyles = [];
            
            // Generate CSS classes and inline styles for table formatting
            if (element.borders) {
                tableStyles.push(generateBorderStyles(element.borders));
            }
            
            if (element.width) {
                tableStyles.push("width: " + convertDxaToPixels(element.width.value, element.width.type));
            }
            
            if (element.alignment) {
                var alignmentMap = {
                    "left": "margin-left: 0; margin-right: auto",
                    "center": "margin-left: auto; margin-right: auto",
                    "right": "margin-left: auto; margin-right: 0"
                };
                if (alignmentMap[element.alignment]) {
                    tableStyles.push(alignmentMap[element.alignment]);
                }
            }
            
            if (element.cellSpacing) {
                tableStyles.push("border-spacing: " + convertDxaToPixels(element.cellSpacing.value, element.cellSpacing.type));
            } else {
                tableStyles.push("border-collapse: collapse");
            }
            
            if (element.background) {
                tableStyles.push(generateBackgroundStyle(element.background));
            }
            
            if (element.indent) {
                tableStyles.push("margin-left: " + convertDxaToPixels(element.indent.value, element.indent.type));
            }
            
            if (tableStyles.length > 0) {
                tableAttributes.style = tableStyles.join("; ");
            }
            
            var tableElement = Html.freshElement("table", tableAttributes, [Html.forceWrite].concat(convertTableChildren(element, messages, options)));
            
            // Add column width information if available
            if (element.columnWidths && element.columnWidths.length > 0) {
                var colGroup = Html.freshElement("colgroup", {}, element.columnWidths.map(function(colWidth) {
                    return Html.freshElement("col", {
                        style: "width: " + convertDxaToPixels(colWidth.width, colWidth.type)
                    });
                }));
                tableElement.children.unshift(colGroup);
            }
            
            return [tableElement];
        });
    }

    function convertTableChildren(element, messages, options) {
        var bodyIndex = _.findIndex(element.children, function(child) {
            return !child.type === documents.types.tableRow || !child.isHeader;
        });
        if (bodyIndex === -1) {
            bodyIndex = element.children.length;
        }
        var children;
        if (bodyIndex === 0) {
            children = convertElements(
                element.children,
                messages,
                _.extend({}, options, {isTableHeader: false})
            );
        } else {
            var headRows = convertElements(
                element.children.slice(0, bodyIndex),
                messages,
                _.extend({}, options, {isTableHeader: true})
            );
            var bodyRows = convertElements(
                element.children.slice(bodyIndex),
                messages,
                _.extend({}, options, {isTableHeader: false})
            );
            children = [
                Html.freshElement("thead", {}, headRows),
                Html.freshElement("tbody", {}, bodyRows)
            ];
        }
        return [Html.forceWrite].concat(children);
    }

    function convertTableRow(element, messages, options) {
        var children = convertElements(element.children, messages, options);
        var rowAttributes = {};
        var rowStyles = [];
        
        // Generate CSS for row formatting
        if (element.height) {
            var heightValue = convertDxaToPixels(element.height.value, "dxa");
            if (element.height.rule === "exact") {
                rowStyles.push("height: " + heightValue);
            } else if (element.height.rule === "atLeast") {
                rowStyles.push("min-height: " + heightValue);
            }
        }
        
        if (element.background) {
            rowStyles.push(generateBackgroundStyle(element.background));
        }
        
        if (element.borders) {
            rowStyles.push(generateBorderStyles(element.borders));
        }
        
        if (element.cantSplit) {
            rowStyles.push("page-break-inside: avoid");
        }
        
        if (rowStyles.length > 0) {
            rowAttributes.style = rowStyles.join("; ");
        }
        
        return [
            Html.freshElement("tr", rowAttributes, [Html.forceWrite].concat(children))
        ];
    }

    function convertTableCell(element, messages, options) {
        var tagName = options.isTableHeader ? "th" : "td";
        var children = convertElements(element.children, messages, options);
        var attributes = {};
        var cellStyles = [];
        
        if (element.colSpan !== 1) {
            attributes.colspan = element.colSpan.toString();
        }
        if (element.rowSpan !== 1) {
            attributes.rowspan = element.rowSpan.toString();
        }
        
        // Generate CSS for cell formatting
        if (element.width) {
            cellStyles.push("width: " + convertDxaToPixels(element.width.value, element.width.type));
        }
        
        if (element.background) {
            cellStyles.push(generateBackgroundStyle(element.background));
        }
        
        if (element.borders) {
            cellStyles.push(generateBorderStyles(element.borders));
        }
        
        if (element.padding) {
            var paddingValues = [];
            var sides = ["top", "right", "bottom", "left"];
            sides.forEach(function(side) {
                if (element.padding[side]) {
                    paddingValues.push(convertDxaToPixels(element.padding[side].value, element.padding[side].type));
                } else {
                    paddingValues.push("0");
                }
            });
            cellStyles.push("padding: " + paddingValues.join(" "));
        }
        
        if (element.verticalAlignment) {
            var vAlignMap = {
                "top": "top",
                "center": "middle",
                "bottom": "bottom"
            };
            if (vAlignMap[element.verticalAlignment]) {
                cellStyles.push("vertical-align: " + vAlignMap[element.verticalAlignment]);
            }
        }
        
        if (element.textDirection) {
            if (element.textDirection === "btLr") {
                cellStyles.push("writing-mode: vertical-lr");
            } else if (element.textDirection === "tbRl") {
                cellStyles.push("writing-mode: vertical-rl");
            }
        }
        
        if (element.noWrap) {
            cellStyles.push("white-space: nowrap");
        }
        
        if (element.fitText) {
            cellStyles.push("font-size: smaller");
        }
        
        if (cellStyles.length > 0) {
            attributes.style = cellStyles.join("; ");
        }

        return [
            Html.freshElement(tagName, attributes, [Html.forceWrite].concat(children))
        ];
    }

    function convertCommentReference(reference, messages, options) {
        return findHtmlPath(reference, htmlPaths.ignore).wrap(function() {
            var comment = comments[reference.commentId];
            var count = referencedComments.length + 1;
            var label = "[" + commentAuthorLabel(comment) + count + "]";
            referencedComments.push({label: label, comment: comment});
            // TODO: remove duplication with note references
            return [
                Html.freshElement("a", {
                    href: "#" + referentHtmlId("comment", reference.commentId),
                    id: referenceHtmlId("comment", reference.commentId)
                }, [Html.text(label)])
            ];
        });
    }

    function convertComment(referencedComment, messages, options) {
        // TODO: remove duplication with note references

        var label = referencedComment.label;
        var comment = referencedComment.comment;
        var body = convertElements(comment.body, messages, options).concat([
            Html.nonFreshElement("p", {}, [
                Html.text(" "),
                Html.freshElement("a", {"href": "#" + referenceHtmlId("comment", comment.commentId)}, [
                    Html.text("↑")
                ])
            ])
        ]);

        return [
            Html.freshElement(
                "dt",
                {"id": referentHtmlId("comment", comment.commentId)},
                [Html.text("Comment " + label)]
            ),
            Html.freshElement("dd", {}, body)
        ];
    }

    function convertBreak(element, messages, options) {
        return htmlPathForBreak(element).wrap(function() {
            return [];
        });
    }

    function htmlPathForBreak(element) {
        var style = findStyle(element);
        if (style) {
            return style.to;
        } else if (element.breakType === "line") {
            return htmlPaths.topLevelElement("br");
        } else {
            return htmlPaths.empty;
        }
    }

    var elementConverters = {
        "document": function(document, messages, options) {
            var children = convertElements(document.children, messages, options);
            
            // Get unique notes in display order (by displayNumber)
            var uniqueNotesArray = Object.keys(uniqueNotes).map(function(key) {
                return uniqueNotes[key];
            });
            uniqueNotesArray.sort(function(a, b) {
                return a.displayNumber - b.displayNumber;
            });
            
            var notes = uniqueNotesArray.map(function(uniqueNote) {
                return document.notes.resolve(uniqueNote.note);
            });
            
            var notesNodes = convertElements(notes, messages, options);
            return children.concat([
                Html.freshElement("ol", {}, notesNodes),
                Html.freshElement("dl", {}, flatMap(referencedComments, function(referencedComment) {
                    return convertComment(referencedComment, messages, options);
                }))
            ]);
        },
        "paragraph": convertParagraph,
        "run": convertRun,
        "text": function(element, messages, options) {
            return [Html.text(element.value)];
        },
        "tab": function(element, messages, options) {
            return [Html.text("\t")];
        },
        "hyperlink": function(element, messages, options) {
            var href = element.anchor ? "#" + htmlId(element.anchor) : element.href;
            
            // Sanitize the URL if security is enabled
            if (urlSanitizer) {
                try {
                    var originalHref = href;
                    href = urlSanitizer.sanitizeUrl(href);
                    
                    // Log a warning if the URL was modified
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
            if (element.targetFrame != null) {
                // Sanitize target attribute to prevent window.name attacks
                var target = element.targetFrame.toString();
                if (target === '_blank' || target === '_self' || target === '_parent' || target === '_top') {
                    attributes.target = target;
                    // Add rel="noopener" for security when opening in new window
                    if (target === '_blank') {
                        attributes.rel = 'noopener';
                    }
                } else if (urlSanitizer) {
                    // Custom target frames need sanitization
                    attributes.target = target.replace(/[<>"']/g, '');
                } else {
                    attributes.target = target;
                }
            }

            var children = convertElements(element.children, messages, options);
            return [Html.nonFreshElement("a", attributes, children)];
        },
        "checkbox": function(element) {
            var attributes = {type: "checkbox"};
            if (element.checked) {
                attributes["checked"] = "checked";
            }
            return [Html.freshElement("input", attributes)];
        },
        "bookmarkStart": function(element, messages, options) {
            var anchor = Html.freshElement("a", {
                id: htmlId(element.name)
            }, [Html.forceWrite]);
            return [anchor];
        },
        "noteReference": function(element, messages, options) {
            // Track this note and get its unique info
            var uniqueNote = getOrCreateUniqueNote(element);
            
            // Generate unique reference ID for this specific reference
            var uniqueRefId = generateUniqueRefId(element);
            
            // Store reference info for backlink generation
            uniqueNote.refs.push({
                element: element,
                refId: uniqueRefId
            });
            
            // Keep original behavior for backward compatibility
            noteReferences.push(element);
            
            var anchor = Html.freshElement("a", {
                href: "#" + noteHtmlId(element),
                id: uniqueRefId
            }, [Html.text("[" + uniqueNote.displayNumber + "]")]);

            return [Html.freshElement("sup", {}, [anchor])];
        },
        "note": function(element, messages, options) {
            var children = convertElements(element.body, messages, options);
            
            // Get unique note info to build multiple backlinks
            var noteKey = createNoteKey(element);
            var uniqueNote = uniqueNotes[noteKey];
            
            var backLinks = [];
            if (uniqueNote && uniqueNote.refs.length > 0) {
                uniqueNote.refs.forEach(function(refInfo) {
                    backLinks.push(Html.freshElement("a", {href: "#" + refInfo.refId}, [Html.text("↑")]));
                });
            } else {
                // Fallback to original behavior if no tracking info
                backLinks.push(Html.freshElement("a", {href: "#" + noteRefHtmlId(element)}, [Html.text("↑")]));
            }
            
            var backLinkContainer = Html.elementWithTag(htmlPaths.element("p", {}, {fresh: false}),
                [Html.text(" ")].concat(backLinks));
            var body = children.concat([backLinkContainer]);

            return Html.freshElement("li", {id: noteHtmlId(element)}, body);
        },
        "commentReference": convertCommentReference,
        "comment": convertComment,
        "image": deferredConversion(recoveringConvertImage(options.convertImage || images.dataUri)),
        "table": convertTable,
        "tableRow": convertTableRow,
        "tableCell": convertTableCell,
        "break": convertBreak
    };
    return {
        convertToHtml: convertToHtml
    };
}

var deferredId = 1;

function deferredConversion(func) {
    return function(element, messages, options) {
        return [
            {
                type: "deferred",
                id: deferredId++,
                value: function() {
                    return func(element, messages, options);
                }
            }
        ];
    };
}

function unrecognisedStyleWarning(type, element) {
    return results.warning(
        "Unrecognised " + type + " style: '" + element.styleName + "'" +
        " (Style ID: " + element.styleId + ")"
    );
}

// Utility functions for table formatting
function convertDxaToPixels(value, type) {
    if (!value || value === "auto") {
        return "auto";
    }
    
    var numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
        return "auto";
    }
    
    switch (type) {
    case "dxa": // twentieths of a point (1/20 pt)
        return Math.round(numValue / 20 * 96 / 72) + "px"; // Convert to pixels assuming 96 DPI
    case "pct": // percentage
        return (numValue / 50) + "%"; // pct values are in 50ths of a percent
    case "nil": // no width
        return "0";
    case "auto":
        return "auto";
    default:
        return numValue + "px";
    }
}

function generateBorderStyles(borders) {
    var borderStyles = [];
    var sides = ["top", "right", "bottom", "left"];
    
    sides.forEach(function(side) {
        if (borders[side]) {
            var border = borders[side];
            var borderWidth = Math.max(1, Math.round(parseInt(border.width || "4", 10) / 8)); // Convert from eighths of a point
            var borderStyle = mapBorderStyle(border.style);
            var borderColor = border.color && border.color !== "auto" ? "#" + border.color : "#000000";
            
            borderStyles.push("border-" + side + ": " + borderWidth + "px " + borderStyle + " " + borderColor);
        }
    });
    
    // Handle inside borders for table cells
    if (borders.insideH) {
        borderStyles.push("border-top: " + generateSingleBorderStyle(borders.insideH));
        borderStyles.push("border-bottom: " + generateSingleBorderStyle(borders.insideH));
    }
    if (borders.insideV) {
        borderStyles.push("border-left: " + generateSingleBorderStyle(borders.insideV));
        borderStyles.push("border-right: " + generateSingleBorderStyle(borders.insideV));
    }
    
    return borderStyles.join("; ");
}

function generateSingleBorderStyle(border) {
    var borderWidth = Math.max(1, Math.round(parseInt(border.width || "4", 10) / 8));
    var borderStyle = mapBorderStyle(border.style);
    var borderColor = border.color && border.color !== "auto" ? "#" + border.color : "#000000";
    return borderWidth + "px " + borderStyle + " " + borderColor;
}

function mapBorderStyle(wordStyle) {
    var styleMap = {
        "single": "solid",
        "double": "double",
        "dotted": "dotted",
        "dashed": "dashed",
        "thick": "solid",
        "thin": "solid",
        "none": "none",
        "nil": "none"
    };
    return styleMap[wordStyle] || "solid";
}

function generateBackgroundStyle(background) {
    var styles = [];
    
    if (background.fill && background.fill !== "auto") {
        styles.push("background-color: #" + background.fill);
    }
    
    if (background.pattern && background.pattern !== "clear") {
        // Add pattern styles for more complex backgrounds
        var patternMap = {
            "solid": "solid",
            "pct5": "repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2px)",
            "pct10": "repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)",
            "pct25": "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 4px)",
            "pct50": "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)"
        };
        
        if (patternMap[background.pattern]) {
            styles.push("background-image: " + patternMap[background.pattern]);
        }
    }
    
    return styles.join("; ");
}

function flatMap(values, func) {
    return _.flatten(values.map(func), true);
}

function walkHtml(nodes, callback) {
    nodes.forEach(function(node) {
        callback(node);
        if (node.children) {
            walkHtml(node.children, callback);
        }
    });
}

var commentAuthorLabel = exports.commentAuthorLabel = function commentAuthorLabel(comment) {
    return comment.authorInitials || "";
};
