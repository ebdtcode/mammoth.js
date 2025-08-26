var _ = require("underscore");

var types = exports.types = {
    document: "document",
    paragraph: "paragraph",
    run: "run",
    text: "text",
    tab: "tab",
    checkbox: "checkbox",
    hyperlink: "hyperlink",
    noteReference: "noteReference",
    image: "image",
    note: "note",
    commentReference: "commentReference",
    comment: "comment",
    table: "table",
    tableRow: "tableRow",
    tableCell: "tableCell",
    "break": "break",
    bookmarkStart: "bookmarkStart",
    // Extended types for unsupported elements
    drawing: "drawing",
    field: "field",
    math: "math",
    media: "media",
    object: "object",
    unknownElement: "unknownElement"
};

function Document(children, options) {
    options = options || {};
    return {
        type: types.document,
        children: children,
        notes: options.notes || new Notes({}),
        comments: options.comments || []
    };
}

function Paragraph(children, properties) {
    properties = properties || {};
    var indent = properties.indent || {};
    return {
        type: types.paragraph,
        children: children,
        styleId: properties.styleId || null,
        styleName: properties.styleName || null,
        numbering: properties.numbering || null,
        alignment: properties.alignment || null,
        indent: {
            start: indent.start || null,
            end: indent.end || null,
            firstLine: indent.firstLine || null,
            hanging: indent.hanging || null
        }
    };
}

function Run(children, properties) {
    properties = properties || {};
    return {
        type: types.run,
        children: children,
        styleId: properties.styleId || null,
        styleName: properties.styleName || null,
        isBold: !!properties.isBold,
        isUnderline: !!properties.isUnderline,
        isItalic: !!properties.isItalic,
        isStrikethrough: !!properties.isStrikethrough,
        isAllCaps: !!properties.isAllCaps,
        isSmallCaps: !!properties.isSmallCaps,
        verticalAlignment: properties.verticalAlignment || verticalAlignment.baseline,
        font: properties.font || null,
        fontSize: properties.fontSize || null,
        highlight: properties.highlight || null
    };
}

var verticalAlignment = {
    baseline: "baseline",
    superscript: "superscript",
    subscript: "subscript"
};

function Text(value) {
    return {
        type: types.text,
        value: value
    };
}

function Tab() {
    return {
        type: types.tab
    };
}

function Checkbox(options) {
    return {
        type: types.checkbox,
        checked: options.checked
    };
}

function Hyperlink(children, options) {
    return {
        type: types.hyperlink,
        children: children,
        href: options.href,
        anchor: options.anchor,
        targetFrame: options.targetFrame
    };
}

function NoteReference(options) {
    return {
        type: types.noteReference,
        noteType: options.noteType,
        noteId: options.noteId
    };
}

function Notes(notes) {
    this._notes = _.indexBy(notes, function(note) {
        return noteKey(note.noteType, note.noteId);
    });
}

Notes.prototype.resolve = function(reference) {
    return this.findNoteByKey(noteKey(reference.noteType, reference.noteId));
};

Notes.prototype.findNoteByKey = function(key) {
    return this._notes[key] || null;
};

function Note(options) {
    return {
        type: types.note,
        noteType: options.noteType,
        noteId: options.noteId,
        body: options.body
    };
}

function commentReference(options) {
    return {
        type: types.commentReference,
        commentId: options.commentId
    };
}

function comment(options) {
    return {
        type: types.comment,
        commentId: options.commentId,
        body: options.body,
        authorName: options.authorName,
        authorInitials: options.authorInitials
    };
}

function noteKey(noteType, id) {
    return noteType + "-" + id;
}

function Image(options) {
    return {
        type: types.image,
        // `read` is retained for backwards compatibility, but other read
        // methods should be preferred.
        read: function(encoding) {
            if (encoding) {
                return options.readImage(encoding);
            } else {
                return options.readImage().then(function(arrayBuffer) {
                    return Buffer.from(arrayBuffer);
                });
            }
        },
        readAsArrayBuffer: function() {
            return options.readImage();
        },
        readAsBase64String: function() {
            return options.readImage("base64");
        },
        readAsBuffer: function() {
            return options.readImage().then(function(arrayBuffer) {
                return Buffer.from(arrayBuffer);
            });
        },
        altText: options.altText,
        contentType: options.contentType
    };
}

function Table(children, properties) {
    properties = properties || {};
    return {
        type: types.table,
        children: children,
        styleId: properties.styleId || null,
        styleName: properties.styleName || null,
        // Enhanced table formatting properties
        borders: properties.borders || null,
        columnWidths: properties.columnWidths || null,
        alignment: properties.alignment || null,
        cellSpacing: properties.cellSpacing || null,
        cellPadding: properties.cellPadding || null,
        width: properties.width || null,
        background: properties.background || null,
        indent: properties.indent || null
    };
}

function TableRow(children, options) {
    options = options || {};
    return {
        type: types.tableRow,
        children: children,
        isHeader: options.isHeader || false,
        // Enhanced row formatting properties
        height: options.height || null,
        heightRule: options.heightRule || null,
        background: options.background || null,
        borders: options.borders || null,
        cantSplit: options.cantSplit || false
    };
}

function TableCell(children, options) {
    options = options || {};
    return {
        type: types.tableCell,
        children: children,
        colSpan: options.colSpan == null ? 1 : options.colSpan,
        rowSpan: options.rowSpan == null ? 1 : options.rowSpan,
        // Enhanced cell formatting properties
        width: options.width || null,
        widthType: options.widthType || null,
        background: options.background || null,
        borders: options.borders || null,
        padding: options.padding || null,
        verticalAlignment: options.verticalAlignment || null,
        textDirection: options.textDirection || null,
        noWrap: options.noWrap || false,
        fitText: options.fitText || false
    };
}

function Break(breakType) {
    return {
        type: types["break"],
        breakType: breakType
    };
}

function BookmarkStart(options) {
    return {
        type: types.bookmarkStart,
        name: options.name
    };
}

exports.document = exports.Document = Document;
exports.paragraph = exports.Paragraph = Paragraph;
exports.run = exports.Run = Run;
exports.text = exports.Text = Text;
exports.tab = exports.Tab = Tab;
exports.checkbox = exports.Checkbox = Checkbox;
exports.Hyperlink = Hyperlink;
exports.noteReference = exports.NoteReference = NoteReference;
exports.Notes = Notes;
exports.Note = Note;
exports.commentReference = commentReference;
exports.comment = comment;
exports.Image = Image;
exports.Table = Table;
exports.TableRow = TableRow;
exports.TableCell = TableCell;
exports.lineBreak = Break("line");
exports.pageBreak = Break("page");
exports.columnBreak = Break("column");
exports.BookmarkStart = BookmarkStart;

exports.verticalAlignment = verticalAlignment;

// Extended element constructors for unsupported elements

function Drawing(options) {
    return {
        type: types.drawing,
        name: options.name,
        namespace: options.namespace,
        attributes: options.attributes || {},
        children: options.children || []
    };
}

function Field(options) {
    return {
        type: types.field,
        name: options.name,
        namespace: options.namespace,
        fieldType: options.fieldType,
        attributes: options.attributes || {},
        children: options.children || []
    };
}

function MathElement(options) {
    return {
        type: types.math,
        name: options.name,
        namespace: options.namespace,
        attributes: options.attributes || {},
        children: options.children || []
    };
}

function Media(options) {
    return {
        type: types.media,
        name: options.name,
        namespace: options.namespace,
        mediaType: options.mediaType,
        attributes: options.attributes || {},
        children: options.children || []
    };
}

function DocumentObject(options) {
    return {
        type: types.object,
        name: options.name,
        namespace: options.namespace,
        objectType: options.objectType,
        attributes: options.attributes || {},
        children: options.children || []
    };
}

function UnknownElement(options) {
    return {
        type: types.unknownElement,
        name: options.name,
        namespace: options.namespace,
        attributes: options.attributes || {},
        children: options.children || []
    };
}

exports.Drawing = Drawing;
exports.Field = Field;
exports.Math = MathElement;
exports.Media = Media;
exports.Object = DocumentObject;
exports.UnknownElement = UnknownElement;
