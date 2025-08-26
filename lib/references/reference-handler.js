var htmlPaths = require("../styles/html-paths");
var Html = require("../html");

function ReferenceHandler(options) {
    var noteNumber = 0;
    var noteReferences = [];
    var referencedComments = [];
    
    options = options || {};
    
    function handleReference(reference, converter) {
        switch (reference.type) {
        case "noteReference":
            return handleNoteReference(reference, converter);
        case "commentReference":
            return handleCommentReference(reference, converter);
        default:
            return null;
        }
    }
    
    function handleNoteReference(reference, converter) {
        noteReferences.push(reference);
        
        var note = reference.note;
        var uniqueNote = converter.uniqueNotes[converter.createNoteKey(note)];
        
        var noteNumber = uniqueNote ? uniqueNote.displayNumber : (++noteNumber);
        var referenceId = converter.generateUniqueRefId(note);
        
        var noteAnchor = Html.elementWithTag(htmlPaths.element("a", {
            href: "#" + noteHtmlId(note.noteType, note.noteId),
            id: referenceId
        }, {fresh: false}), [Html.text("[" + noteNumber + "]")]);
        
        return Html.elementWithTag(htmlPaths.element("sup", {}, {fresh: false}), [noteAnchor]);
    }
    
    function handleCommentReference(reference, converter) {
        var comment = reference.comment;
        var hasAuthorInitials = comment.authorInitials && comment.authorInitials !== "";
        
        referencedComments.push({
            label: "[" + (hasAuthorInitials ? comment.authorInitials : "?") + (++converter.commentNumber) + "]",
            comment: comment
        });
        
        var commentAnchor = Html.elementWithTag(htmlPaths.element("a", {
            href: "#" + commentHtmlId(comment.commentId),
            id: commentHtmlReferenceId(comment.commentId)
        }, {fresh: false}), [Html.text(referencedComments[referencedComments.length - 1].label)]);
        
        return Html.elementWithTag(htmlPaths.element("sup", {}, {fresh: false}), [commentAnchor]);
    }
    
    function getNotes() {
        return noteReferences.map(function(ref) {
            return ref.note;
        });
    }
    
    function getComments() {
        return referencedComments;
    }
    
    function noteHtmlId(noteType, noteId) {
        return noteType + "-" + noteId;
    }
    
    function noteHtmlReferenceId(noteType, noteId, counter) {
        var baseId = noteType + "-ref-" + noteId;
        return counter > 1 ? baseId + "-" + counter : baseId;
    }
    
    function commentHtmlId(commentId) {
        return "comment-" + commentId;
    }
    
    function commentHtmlReferenceId(commentId) {
        return "comment-ref-" + commentId;
    }
    
    return {
        handleReference: handleReference,
        getNotes: getNotes,
        getComments: getComments,
        noteHtmlId: noteHtmlId,
        commentHtmlId: commentHtmlId
    };
}

module.exports = ReferenceHandler;
