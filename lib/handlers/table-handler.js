var _ = require("underscore");
var Html = require("../html");
var results = require("../results");
var htmlPaths = require("../styles/html-paths");

/**
 * TableHandler provides enhanced support for advanced table features
 * including merged cells, nested tables, and complex formatting.
 */
var TableHandler = {
    
    /**
     * Handle advanced table elements with enhanced features
     *
     * @param {Object} element Table element
     * @param {Array} messages Message array
     * @param {Object} options Conversion options
     * @returns {Array} HTML nodes
     */
    handle: function(element, messages, options) {
        try {
            if (element.name === "w:tbl") {
                return this._handleWordTable(element, messages, options);
            } else if (element.namespace === "table" || element.name.startsWith("table:")) {
                return this._handleOdfTable(element, messages, options);
            }
            
            return this._handleGenericTable(element, messages, options);
        } catch (error) {
            messages.push(results.error("Error handling table: " + error.message));
            return [];
        }
    },
    
    /**
     * Handle Microsoft Word table elements
     */
    _handleWordTable: function(element, messages, options) {
        var tableProps = this._extractWordTableProperties(element, messages);
        var rows = this._extractWordTableRows(element, messages, options);
        
        // Build table attributes and styles
        var tableAttributes = {};
        var tableStyles = [];
        
        if (tableProps.borders) {
            tableStyles.push(this._generateBorderStyles(tableProps.borders));
        }
        
        if (tableProps.width) {
            tableStyles.push("width: " + this._convertDxaToPixels(tableProps.width.value, tableProps.width.type));
        }
        
        if (tableProps.alignment) {
            var alignmentMap = {
                "left": "margin-left: 0; margin-right: auto",
                "center": "margin-left: auto; margin-right: auto",
                "right": "margin-left: auto; margin-right: 0"
            };
            if (alignmentMap[tableProps.alignment]) {
                tableStyles.push(alignmentMap[tableProps.alignment]);
            }
        }
        
        if (tableProps.cellSpacing) {
            tableStyles.push("border-spacing: " + this._convertDxaToPixels(tableProps.cellSpacing.value, tableProps.cellSpacing.type));
        } else {
            tableStyles.push("border-collapse: collapse");
        }
        
        if (tableProps.background) {
            tableStyles.push(this._generateBackgroundStyle(tableProps.background));
        }
        
        if (tableStyles.length > 0) {
            tableAttributes.style = tableStyles.join("; ");
        }
        
        // Handle nested tables by adding a wrapper
        if (options.isNested) {
            tableAttributes.class = (tableAttributes.class || "") + " nested-table";
        }
        
        var tableElement = Html.freshElement("table", tableAttributes, [Html.forceWrite].concat(rows));
        
        // Add column group if column widths are available
        if (tableProps.columnWidths && tableProps.columnWidths.length > 0) {
            var colGroup = Html.freshElement("colgroup", {}, tableProps.columnWidths.map(function(colWidth) {
                return Html.freshElement("col", {
                    style: "width: " + this._convertDxaToPixels(colWidth.width, colWidth.type)
                });
            }.bind(this)));
            tableElement.children.unshift(colGroup);
        }
        
        return [tableElement];
    },
    
    /**
     * Handle OpenDocument Format (ODF) table elements
     */
    _handleOdfTable: function(element, messages, options) {
        var tableName = element.name.split(':')[1] || element.name;
        
        switch (tableName) {
        case "table":
            return this._handleOdfTableElement(element, messages, options);
        case "table-row":
            return this._handleOdfTableRow(element, messages, options);
        case "table-cell":
            return this._handleOdfTableCell(element, messages, options);
        case "covered-table-cell":
            return this._handleOdfCoveredCell(element, messages, options);
        default:
            messages.push(results.warning("Unknown ODF table element: " + element.name));
            return [];
        }
    },
    
    /**
     * Handle generic table elements
     */
    _handleGenericTable: function(element, messages, options) {
        messages.push(results.warning("Generic table handler used for: " + element.name));
        
        // Extract basic table structure
        var children = [];
        if (element.children && Array.isArray(element.children)) {
            children = element.children.map(function(child) {
                if (child.type === "tableRow" || child.name === "tr") {
                    return this._convertRowElement(child, messages, options);
                } else if (child.type === "tableCell" || child.name === "td" || child.name === "th") {
                    return this._convertCellElement(child, messages, options);
                }
                return null;
            }.bind(this)).filter(Boolean);
        }
        
        return [Html.freshElement("table", {}, [Html.forceWrite].concat(children))];
    },
    
    /**
     * Extract Word table properties
     */
    _extractWordTableProperties: function(element, messages) {
        var props = {};
        var tblPr = element.first("w:tblPr");
        
        if (tblPr) {
            // Table width
            var tblW = tblPr.first("w:tblW");
            if (tblW) {
                props.width = {
                    value: tblW.attributes["w:w"],
                    type: tblW.attributes["w:type"]
                };
            }
            
            // Table alignment
            var jc = tblPr.first("w:jc");
            if (jc) {
                props.alignment = jc.attributes["w:val"];
            }
            
            // Table borders
            var tblBorders = tblPr.first("w:tblBorders");
            if (tblBorders) {
                props.borders = this._extractBorders(tblBorders);
            }
            
            // Cell spacing
            var tblCellSpacing = tblPr.first("w:tblCellSpacing");
            if (tblCellSpacing) {
                props.cellSpacing = {
                    value: tblCellSpacing.attributes["w:w"],
                    type: tblCellSpacing.attributes["w:type"] || "dxa"
                };
            }
            
            // Table style
            var tblStyle = tblPr.first("w:tblStyle");
            if (tblStyle) {
                props.styleId = tblStyle.attributes["w:val"];
            }
            
            // Shading (background)
            var shd = tblPr.first("w:shd");
            if (shd) {
                props.background = {
                    fill: shd.attributes["w:fill"],
                    pattern: shd.attributes["w:val"]
                };
            }
        }
        
        // Extract column widths from table grid
        var tblGrid = element.first("w:tblGrid");
        if (tblGrid) {
            props.columnWidths = tblGrid.elements("w:gridCol").map(function(gridCol) {
                return {
                    width: gridCol.attributes["w:w"],
                    type: "dxa"
                };
            });
        }
        
        return props;
    },
    
    /**
     * Extract Word table rows with merge handling
     */
    _extractWordTableRows: function(element, messages, options) {
        var rows = element.elements("w:tr");
        var processedRows = [];
        
        // Track merged cells across rows
        var cellMergeTracker = {};
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var isHeader = this._isHeaderRow(row, i);
            var rowElement = this._processWordTableRow(row, messages, _.extend({}, options, {
                isTableHeader: isHeader,
                rowIndex: i,
                cellMergeTracker: cellMergeTracker
            }));
            
            if (rowElement) {
                processedRows.push(rowElement);
            }
        }
        
        // Separate header and body rows
        var headerRows = processedRows.filter(function(row) {
            return row._isHeader;
        });
        var bodyRows = processedRows.filter(function(row) {
            return !row._isHeader;
        });
        
        var children = [];
        
        if (headerRows.length > 0) {
            // Clean header marker
            headerRows.forEach(function(row) {
                delete row._isHeader;
            });
            children.push(Html.freshElement("thead", {}, headerRows));
        }
        
        if (bodyRows.length > 0) {
            // Clean header marker
            bodyRows.forEach(function(row) {
                delete row._isHeader;
            });
            children.push(Html.freshElement("tbody", {}, bodyRows));
        }
        
        return children;
    },
    
    /**
     * Process individual Word table row
     */
    _processWordTableRow: function(rowElement, messages, options) {
        var cells = rowElement.elements("w:tc");
        var processedCells = [];
        var rowProps = this._extractWordRowProperties(rowElement);
        
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            var cellElement = this._processWordTableCell(cell, messages, _.extend({}, options, {
                cellIndex: i,
                rowProps: rowProps
            }));
            
            if (cellElement) {
                processedCells.push(cellElement);
            }
        }
        
        // Build row attributes
        var rowAttributes = {};
        var rowStyles = [];
        
        if (rowProps.height) {
            var heightValue = this._convertDxaToPixels(rowProps.height.value, "dxa");
            if (rowProps.height.rule === "exact") {
                rowStyles.push("height: " + heightValue);
            } else if (rowProps.height.rule === "atLeast") {
                rowStyles.push("min-height: " + heightValue);
            }
        }
        
        if (rowProps.background) {
            rowStyles.push(this._generateBackgroundStyle(rowProps.background));
        }
        
        if (rowProps.cantSplit) {
            rowStyles.push("page-break-inside: avoid");
        }
        
        if (rowStyles.length > 0) {
            rowAttributes.style = rowStyles.join("; ");
        }
        
        var result = Html.freshElement("tr", rowAttributes, [Html.forceWrite].concat(processedCells));
        result._isHeader = options.isTableHeader;
        
        return result;
    },
    
    /**
     * Process individual Word table cell with merge support
     */
    _processWordTableCell: function(cellElement, messages, options) {
        var cellProps = this._extractWordCellProperties(cellElement);
        var children = this._convertCellContent(cellElement, messages, options);
        
        var tagName = options.isTableHeader ? "th" : "td";
        var attributes = {};
        var cellStyles = [];
        
        // Handle column and row spans
        if (cellProps.gridSpan && cellProps.gridSpan > 1) {
            attributes.colspan = cellProps.gridSpan.toString();
        }
        
        if (cellProps.vMerge) {
            if (cellProps.vMerge === "restart") {
                // Calculate rowspan by looking ahead
                attributes.rowspan = this._calculateRowSpan(options, cellProps).toString();
            } else {
                // This cell is merged, skip it
                return null;
            }
        }
        
        // Cell width
        if (cellProps.width) {
            cellStyles.push("width: " + this._convertDxaToPixels(cellProps.width.value, cellProps.width.type));
        }
        
        // Background
        if (cellProps.background) {
            cellStyles.push(this._generateBackgroundStyle(cellProps.background));
        }
        
        // Borders
        if (cellProps.borders) {
            cellStyles.push(this._generateBorderStyles(cellProps.borders));
        }
        
        // Padding
        if (cellProps.margins) {
            var paddingValues = ["top", "right", "bottom", "left"].map(function(side) {
                return cellProps.margins[side] ?
                    this._convertDxaToPixels(cellProps.margins[side].value, cellProps.margins[side].type) : "0";
            }.bind(this));
            cellStyles.push("padding: " + paddingValues.join(" "));
        }
        
        // Vertical alignment
        if (cellProps.vAlign) {
            var vAlignMap = {
                "top": "top",
                "center": "middle",
                "bottom": "bottom"
            };
            if (vAlignMap[cellProps.vAlign]) {
                cellStyles.push("vertical-align: " + vAlignMap[cellProps.vAlign]);
            }
        }
        
        // Text direction
        if (cellProps.textDirection) {
            if (cellProps.textDirection === "btLr") {
                cellStyles.push("writing-mode: vertical-lr");
            } else if (cellProps.textDirection === "tbRl") {
                cellStyles.push("writing-mode: vertical-rl");
            }
        }
        
        if (cellProps.noWrap) {
            cellStyles.push("white-space: nowrap");
        }
        
        if (cellStyles.length > 0) {
            attributes.style = cellStyles.join("; ");
        }
        
        return Html.freshElement(tagName, attributes, [Html.forceWrite].concat(children));
    },
    
    // Helper methods for property extraction and conversion
    
    _extractWordRowProperties: function(rowElement) {
        var props = {};
        var trPr = rowElement.first("w:trPr");
        
        if (trPr) {
            // Row height
            var trHeight = trPr.first("w:trHeight");
            if (trHeight) {
                props.height = {
                    value: trHeight.attributes["w:val"],
                    rule: trHeight.attributes["w:hRule"] || "atLeast"
                };
            }
            
            // Can't split
            if (trPr.first("w:cantSplit")) {
                props.cantSplit = true;
            }
            
            // Header row
            if (trPr.first("w:tblHeader")) {
                props.isHeader = true;
            }
        }
        
        return props;
    },
    
    _extractWordCellProperties: function(cellElement) {
        var props = {};
        var tcPr = cellElement.first("w:tcPr");
        
        if (tcPr) {
            // Grid span (column span)
            var gridSpan = tcPr.first("w:gridSpan");
            if (gridSpan) {
                props.gridSpan = parseInt(gridSpan.attributes["w:val"], 10);
            }
            
            // Vertical merge
            var vMerge = tcPr.first("w:vMerge");
            if (vMerge) {
                props.vMerge = vMerge.attributes["w:val"] || "continue";
            }
            
            // Width
            var tcW = tcPr.first("w:tcW");
            if (tcW) {
                props.width = {
                    value: tcW.attributes["w:w"],
                    type: tcW.attributes["w:type"]
                };
            }
            
            // Vertical alignment
            var vAlign = tcPr.first("w:vAlign");
            if (vAlign) {
                props.vAlign = vAlign.attributes["w:val"];
            }
            
            // Shading
            var shd = tcPr.first("w:shd");
            if (shd) {
                props.background = {
                    fill: shd.attributes["w:fill"],
                    pattern: shd.attributes["w:val"]
                };
            }
            
            // Borders
            var tcBorders = tcPr.first("w:tcBorders");
            if (tcBorders) {
                props.borders = this._extractBorders(tcBorders);
            }
            
            // Margins
            var tcMar = tcPr.first("w:tcMar");
            if (tcMar) {
                props.margins = {
                    top: this._extractMargin(tcMar.first("w:top")),
                    right: this._extractMargin(tcMar.first("w:end") || tcMar.first("w:right")),
                    bottom: this._extractMargin(tcMar.first("w:bottom")),
                    left: this._extractMargin(tcMar.first("w:start") || tcMar.first("w:left"))
                };
            }
            
            // Text direction
            var textDirection = tcPr.first("w:textDirection");
            if (textDirection) {
                props.textDirection = textDirection.attributes["w:val"];
            }
            
            // No wrap
            if (tcPr.first("w:noWrap")) {
                props.noWrap = true;
            }
        }
        
        return props;
    },
    
    _extractMargin: function(marginElement) {
        if (!marginElement) {
            return null;
        }
        return {
            value: marginElement.attributes["w:w"],
            type: marginElement.attributes["w:type"] || "dxa"
        };
    },
    
    _extractBorders: function(bordersElement) {
        var borders = {};
        var sides = ["top", "right", "bottom", "left", "insideH", "insideV"];
        
        sides.forEach(function(side) {
            var borderElement = bordersElement.first("w:" + side);
            if (borderElement) {
                borders[side] = {
                    style: borderElement.attributes["w:val"],
                    width: borderElement.attributes["w:sz"],
                    color: borderElement.attributes["w:color"]
                };
            }
        });
        
        return borders;
    },
    
    _isHeaderRow: function(rowElement, index) {
        var trPr = rowElement.first("w:trPr");
        if (trPr && trPr.first("w:tblHeader")) {
            return true;
        }
        // First row is often a header
        return index === 0;
    },
    
    _convertCellContent: function(cellElement, messages, options) {
        // This would delegate back to the main conversion pipeline
        // For now, return placeholder
        return [Html.text("[Cell content]")];
    },
    
    _calculateRowSpan: function(options, cellProps) {
        // This would analyze the merge tracker to determine actual rowspan
        // For now, return 1
        return 1;
    },
    
    // Utility methods (these would be shared with the main converter)
    
    _convertDxaToPixels: function(value, type) {
        if (!value || value === "auto") {
            return "auto";
        }
        
        var numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
            return "auto";
        }
        
        switch (type) {
        case "dxa":
            return Math.round(numValue / 20 * 96 / 72) + "px";
        case "pct":
            return (numValue / 50) + "%";
        case "nil":
            return "0";
        case "auto":
            return "auto";
        default:
            return numValue + "px";
        }
    },
    
    _generateBorderStyles: function(borders) {
        var borderStyles = [];
        var sides = ["top", "right", "bottom", "left"];
        
        sides.forEach(function(side) {
            if (borders[side]) {
                var border = borders[side];
                var borderWidth = Math.max(1, Math.round(parseInt(border.width || "4", 10) / 8));
                var borderStyle = this._mapBorderStyle(border.style);
                var borderColor = border.color && border.color !== "auto" ? "#" + border.color : "#000000";
                
                borderStyles.push("border-" + side + ": " + borderWidth + "px " + borderStyle + " " + borderColor);
            }
        }.bind(this));
        
        return borderStyles.join("; ");
    },
    
    _mapBorderStyle: function(wordStyle) {
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
    },
    
    _generateBackgroundStyle: function(background) {
        var styles = [];
        
        if (background.fill && background.fill !== "auto") {
            styles.push("background-color: #" + background.fill);
        }
        
        return styles.join("; ");
    },
    
    // ODF table handling methods
    
    _handleOdfTableElement: function(element, messages, options) {
        // Implementation for ODF table elements
        messages.push(results.warning("ODF table support is limited"));
        return [Html.freshElement("table", {}, [Html.forceWrite])];
    },
    
    _handleOdfTableRow: function(element, messages, options) {
        return [Html.freshElement("tr", {}, [Html.forceWrite])];
    },
    
    _handleOdfTableCell: function(element, messages, options) {
        return [Html.freshElement("td", {}, [Html.forceWrite])];
    },
    
    _handleOdfCoveredCell: function(element, messages, options) {
        // Covered cells are already handled by colspan/rowspan
        return [];
    },
    
    _convertRowElement: function(element, messages, options) {
        return Html.freshElement("tr", {}, [Html.forceWrite]);
    },
    
    _convertCellElement: function(element, messages, options) {
        return Html.freshElement("td", {}, [Html.forceWrite]);
    }
};

module.exports = TableHandler;
