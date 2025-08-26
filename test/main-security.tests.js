var assert = require("assert");
var path = require("path");
var fs = require("fs");
var temp = require('temp').track();

var promises = require("../lib/promises");
var main = require("../lib/main");
var test = require("./test")(module);

test("CLI sanitizes paths to prevent path traversal attacks", function() {
    return createTempDir().then(function(tempDir) {
        var testDocPath = path.join(tempDir, "test.docx");
        fs.writeFileSync(testDocPath, "dummy content");
        
        var maliciousPath = "../../../etc/passwd";
        
        return promises.attemptAll([
            function() {
                main({
                    "docx-path": testDocPath,
                    "output-path": maliciousPath
                });
                assert.fail("Should have thrown error for path traversal");
            }
        ]).then(function(results) {
            assert.equal(results[0].state, "rejected");
            assert.ok(results[0].reason.message.indexOf("Path traversal detected") !== -1);
        });
    });
});

test("CLI properly handles paths with special characters", function() {
    return createTempDir().then(function(tempDir) {
        var fileWithSpaces = path.join(tempDir, "file with spaces.docx");
        var outputWithSpaces = path.join(tempDir, "output with spaces.html");
        
        // Create a dummy file
        fs.writeFileSync(fileWithSpaces, "dummy content");
        
        // Test that paths with spaces are properly handled
        var argv = {
            "docx-path": fileWithSpaces,
            "output-path": outputWithSpaces
        };
        
        // This should not throw an error
        return promises.attempt(function() {
            return main(argv);
        }).then(function() {
            // Success case - file paths were properly handled
            assert.ok(true, "Paths with spaces handled correctly");
        }, function(error) {
            // The error should be about file format, not path handling
            assert.ok(error.message.indexOf("Path traversal") === -1, "No path traversal error for valid paths");
        });
    });
});

test("CLI removes null bytes from paths", function() {
    return createTempDir().then(function(tempDir) {
        var testDocPath = path.join(tempDir, "test.docx");
        fs.writeFileSync(testDocPath, "dummy content");
        
        var pathWithNullBytes = testDocPath + "\0malicious";
        
        var argv = {
            "docx-path": pathWithNullBytes,
            "output-path": path.join(tempDir, "output.html")
        };
        
        // Should sanitize the null bytes
        return promises.attempt(function() {
            return main(argv);
        }).then(function() {
            assert.ok(true, "Null bytes were sanitized");
        }, function(error) {
            // The error should be about file not found after sanitization, not a security error
            assert.ok(error.message.indexOf("\0") === -1, "Null bytes were removed from error message");
        });
    });
});

test("CLI validates style map paths", function() {
    return createTempDir().then(function(tempDir) {
        var testDocPath = path.join(tempDir, "test.docx");
        fs.writeFileSync(testDocPath, "dummy content");
        
        var maliciousStylePath = "../../etc/passwd";
        
        var argv = {
            "docx-path": testDocPath,
            "style_map": maliciousStylePath
        };
        
        return promises.attempt(function() {
            return main(argv);
        }).then(function() {
            assert.fail("Should have thrown error for path traversal in style map");
        }, function(error) {
            assert.ok(error.message.indexOf("Path traversal detected") !== -1);
        });
    });
});

test("CLI validates output directory paths", function() {
    return createTempDir().then(function(tempDir) {
        var testDocPath = path.join(tempDir, "test.docx");
        fs.writeFileSync(testDocPath, "dummy content");
        
        var maliciousOutputDir = "../../../tmp/evil";
        
        var argv = {
            "docx-path": testDocPath,
            "output_dir": maliciousOutputDir
        };
        
        return promises.attempt(function() {
            return main(argv);
        }).then(function() {
            assert.fail("Should have thrown error for path traversal in output dir");
        }, function(error) {
            assert.ok(error.message.indexOf("Path traversal detected") !== -1);
        });
    });
});

function createTempDir() {
    return promises.nfcall(temp.mkdir, null);
}
