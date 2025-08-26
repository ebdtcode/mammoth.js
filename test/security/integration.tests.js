var assert = require("assert");

var documents = require("../../lib/documents");
var DocumentConverter = require("../../lib/document-to-html").DocumentConverter;

describe("Security Integration", function() {
    describe("hyperlink sanitization", function() {
        it("should sanitize javascript: URLs in hyperlinks", function() {
            var element = documents.Hyperlink([documents.Text("Click me")], {
                href: "javascript:alert('xss')"
            });
            
            var converter = new DocumentConverter({
                security: {level: 'standard'}
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="#">Click me</a>');
                assert.equal(result.messages.length, 1);
                assert.ok(result.messages[0].message.indexOf("sanitized for security reasons") !== -1);
            });
        });
        
        it("should allow safe URLs in hyperlinks", function() {
            var element = documents.Hyperlink([documents.Text("Safe link")], {
                href: "https://example.com"
            });
            
            var converter = new DocumentConverter({
                security: {level: 'standard'}
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="https://example.com">Safe link</a>');
                assert.equal(result.messages.length, 0);
            });
        });
        
        it("should add rel='noopener' to _blank targets", function() {
            var element = documents.Hyperlink([documents.Text("External link")], {
                href: "https://example.com",
                targetFrame: "_blank"
            });
            
            var converter = new DocumentConverter({
                security: {level: 'standard'}
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="https://example.com" target="_blank" rel="noopener">External link</a>');
            });
        });
        
        it("should sanitize custom target frames", function() {
            var element = documents.Hyperlink([documents.Text("Custom target")], {
                href: "https://example.com",
                targetFrame: "myframe<script>alert('xss')</script>"
            });
            
            var converter = new DocumentConverter({
                security: {level: 'standard'}
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="https://example.com" target="myframescriptalert(xss)/script">Custom target</a>');
            });
        });
        
        it("should allow fragment URLs", function() {
            var element = documents.Hyperlink([documents.Text("Go to section")], {
                anchor: "section1"
            });
            
            var converter = new DocumentConverter({
                security: {level: 'standard'},
                idPrefix: "doc-"
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="#doc-section1">Go to section</a>');
                assert.equal(result.messages.length, 0);
            });
        });
        
        it("should block dangerous URLs in strict mode", function() {
            var element = documents.Hyperlink([documents.Text("Dangerous link")], {
                href: "javascript:alert('xss')"
            });
            
            var converter = new DocumentConverter({
                security: {level: 'strict'}
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="#">Dangerous link</a>');
                assert.equal(result.messages.length, 1);
                assert.ok(result.messages[0].type === "error");
                if (result.messages[0].message) {
                    assert.ok(result.messages[0].message.indexOf("blocked for security reasons") !== -1);
                }
            });
        });
        
        it("should allow more protocols in permissive mode", function() {
            var element = documents.Hyperlink([documents.Text("FTP link")], {
                href: "ftp://files.example.com/file.txt"
            });
            
            var converter = new DocumentConverter({
                security: {level: 'permissive'}
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="ftp://files.example.com/file.txt">FTP link</a>');
                assert.equal(result.messages.length, 0);
            });
        });
        
        it("should work without security when disabled", function() {
            var element = documents.Hyperlink([documents.Text("Dangerous link")], {
                href: "javascript:alert('xss')"
            });
            
            var converter = new DocumentConverter({
                security: false
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="javascript:alert(\'xss\')">Dangerous link</a>');
                assert.equal(result.messages.length, 0);
            });
        });
    });
    
    describe("security configuration", function() {
        it("should use standard security level by default", function() {
            var element = documents.Hyperlink([documents.Text("Test")], {
                href: "javascript:alert('xss')"
            });
            
            var converter = new DocumentConverter({});
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="#">Test</a>');
                assert.equal(result.messages.length, 1);
                assert.ok(result.messages[0].message.indexOf("sanitized") !== -1);
            });
        });
        
        it("should respect custom security configuration", function() {
            var element = documents.Hyperlink([documents.Text("FTP")], {
                href: "ftp://example.com"
            });
            
            var converter = new DocumentConverter({
                security: {
                    allowedProtocols: ['https:', 'ftp:'],
                    level: 'standard'
                }
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="ftp://example.com">FTP</a>');
                assert.equal(result.messages.length, 0);
            });
        });
        
        it("should support custom sanitizer functions", function() {
            var element = documents.Hyperlink([documents.Text("Custom")], {
                href: "https://example.com"
            });
            
            var converter = new DocumentConverter({
                security: {
                    customSanitizer: function(url) {
                        return url + "?sanitized=true";
                    }
                }
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="https://example.com?sanitized=true">Custom</a>');
                assert.equal(result.messages.length, 0);
            });
        });
    });
    
    describe("error handling", function() {
        it("should handle sanitizer errors in non-strict mode", function() {
            var element = documents.Hyperlink([documents.Text("Test")], {
                href: "https://example.com"
            });
            
            var converter = new DocumentConverter({
                security: {
                    customSanitizer: function(url) {
                        throw new Error("Sanitizer error");
                    }
                }
            });
            
            return converter.convertToHtml(element).then(function(result) {
                assert.equal(result.value, '<a href="#">Test</a>');
                assert.equal(result.messages.length, 1);
                assert.ok(result.messages[0].message.indexOf("sanitized for security reasons") !== -1);
            });
        });
    });
});
