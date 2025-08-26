var assert = require("assert");

var sanitizer = require("../../lib/security/sanitizer");

describe("Security Sanitizer", function() {
    describe("createSanitizer", function() {
        it("should create sanitizer with default configuration", function() {
            var instance = sanitizer.createSanitizer();
            var config = instance.getConfig();
            
            assert.equal(config.level, 'standard');
            assert.deepEqual(config.allowedProtocols, ['http:', 'https:', 'mailto:', 'tel:', 'ftp:']);
            assert.equal(config.allowRelativeUrls, true);
            assert.equal(config.allowFragments, true);
            assert.equal(config.allowDataUrls, true);
        });
        
        it("should create sanitizer with strict configuration", function() {
            var instance = sanitizer.createSanitizer({level: 'strict'});
            var config = instance.getConfig();
            
            assert.equal(config.level, 'strict');
            assert.deepEqual(config.allowedProtocols, ['https:', 'mailto:', 'tel:']);
            assert.equal(config.allowDataUrls, false);
            assert.equal(config.strict, true);
        });
        
        it("should create sanitizer with permissive configuration", function() {
            var instance = sanitizer.createSanitizer({level: 'permissive'});
            var config = instance.getConfig();
            
            assert.equal(config.level, 'permissive');
            assert.deepEqual(config.allowedProtocols, ['http:', 'https:', 'mailto:', 'tel:', 'ftp:', 'file:']);
            assert.equal(config.allowDataUrls, true);
        });
    });
    
    describe("sanitizeUrl", function() {
        describe("dangerous protocols", function() {
            it("should block javascript: URLs", function() {
                var result = sanitizer.sanitizeUrl("javascript:alert('xss')");
                assert.equal(result, '#');
            });
            
            it("should block vbscript: URLs", function() {
                var result = sanitizer.sanitizeUrl("vbscript:msgbox('xss')");
                assert.equal(result, '#');
            });
            
            it("should block data:text/html URLs", function() {
                var result = sanitizer.sanitizeUrl("data:text/html,<script>alert('xss')</script>");
                assert.equal(result, '#');
            });
            
            it("should block data:application/ URLs", function() {
                var result = sanitizer.sanitizeUrl("data:application/javascript,alert('xss')");
                assert.equal(result, '#');
            });
            
            it("should throw in strict mode for dangerous protocols", function() {
                var strictSanitizer = sanitizer.createSanitizer({level: 'strict'});
                assert.throws(function() {
                    strictSanitizer.sanitizeUrl("javascript:alert('xss')");
                }, /Dangerous protocol detected/);
            });
        });
        
        describe("safe protocols", function() {
            it("should allow http URLs", function() {
                var result = sanitizer.sanitizeUrl("http://example.com");
                assert.equal(result, "http://example.com");
            });
            
            it("should allow https URLs", function() {
                var result = sanitizer.sanitizeUrl("https://example.com");
                assert.equal(result, "https://example.com");
            });
            
            it("should allow mailto URLs", function() {
                var result = sanitizer.sanitizeUrl("mailto:test@example.com");
                assert.equal(result, "mailto:test@example.com");
            });
            
            it("should allow tel URLs", function() {
                var result = sanitizer.sanitizeUrl("tel:+1234567890");
                assert.equal(result, "tel:+1234567890");
            });
            
            it("should block http in strict mode", function() {
                var strictSanitizer = sanitizer.createSanitizer({level: 'strict'});
                assert.throws(function() {
                    strictSanitizer.sanitizeUrl("http://example.com");
                }, /Protocol not allowed/);
            });
        });
        
        describe("fragment URLs", function() {
            it("should allow fragment URLs by default", function() {
                var result = sanitizer.sanitizeUrl("#section1");
                assert.equal(result, "#section1");
            });
            
            it("should sanitize dangerous characters in fragments", function() {
                var result = sanitizer.sanitizeUrl("#section<script>");
                assert.equal(result, "#sectionscript");
            });
            
            it("should block fragment URLs when not allowed", function() {
                var instance = sanitizer.createSanitizer({allowFragments: false});
                var result = instance.sanitizeUrl("#section1");
                assert.equal(result, '#');
            });
        });
        
        describe("relative URLs", function() {
            it("should allow relative URLs by default", function() {
                var result = sanitizer.sanitizeUrl("../path/file.html");
                assert.equal(result, '../path/file.html');
            });
            
            it("should block excessive path traversal attempts", function() {
                var result = sanitizer.sanitizeUrl("../../../../etc/passwd");
                assert.equal(result, '#');
            });
            
            it("should block relative URLs when not allowed", function() {
                var instance = sanitizer.createSanitizer({allowRelativeUrls: false});
                var result = instance.sanitizeUrl("path/file.html");
                assert.equal(result, '#');
            });
        });
        
        describe("data URLs", function() {
            it("should allow safe image data URLs", function() {
                var dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
                var result = sanitizer.sanitizeUrl(dataUrl);
                assert.equal(result, dataUrl);
            });
            
            it("should allow jpeg data URLs", function() {
                var dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD//2Q==";
                var result = sanitizer.sanitizeUrl(dataUrl);
                assert.equal(result, dataUrl);
            });
            
            it("should block unsafe data URLs", function() {
                var result = sanitizer.sanitizeUrl("data:text/html,<script>alert('xss')</script>");
                assert.equal(result, '#');
            });
            
            it("should block data URLs when not allowed", function() {
                var instance = sanitizer.createSanitizer({allowDataUrls: false});
                var dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
                var result = instance.sanitizeUrl(dataUrl);
                assert.equal(result, '#');
            });
        });
        
        describe("edge cases", function() {
            it("should handle null/undefined URLs", function() {
                assert.equal(sanitizer.sanitizeUrl(null), null);
                assert.equal(sanitizer.sanitizeUrl(undefined), undefined);
                assert.equal(sanitizer.sanitizeUrl(""), "");
            });
            
            it("should handle whitespace-only URLs", function() {
                assert.equal(sanitizer.sanitizeUrl("   "), "");
            });
            
            it("should trim whitespace from URLs", function() {
                var result = sanitizer.sanitizeUrl("  https://example.com  ");
                assert.equal(result, "https://example.com");
            });
        });
        
        describe("custom sanitizer", function() {
            it("should use custom sanitizer when provided", function() {
                var instance = sanitizer.createSanitizer({
                    customSanitizer: function(url) {
                        return url.toUpperCase();
                    }
                });
                
                var result = instance.sanitizeUrl("https://example.com");
                assert.equal(result, "HTTPS://EXAMPLE.COM");
            });
            
            it("should handle custom sanitizer errors gracefully", function() {
                var instance = sanitizer.createSanitizer({
                    customSanitizer: function(url) {
                        throw new Error("Custom error");
                    }
                });
                
                var result = instance.sanitizeUrl("https://example.com");
                assert.equal(result, '#');
            });
            
            it("should throw custom sanitizer errors in strict mode", function() {
                var instance = sanitizer.createSanitizer({
                    strict: true,
                    customSanitizer: function(url) {
                        throw new Error("Custom error");
                    }
                });
                
                assert.throws(function() {
                    instance.sanitizeUrl("https://example.com");
                }, /Custom sanitizer failed/);
            });
        });
    });
    
    describe("sanitizeAttributes", function() {
        it("should sanitize href attributes", function() {
            var attributes = {
                href: "javascript:alert('xss')",
                title: "Link title"
            };
            
            var instance = sanitizer.createSanitizer();
            var result = instance.sanitizeAttributes(attributes);
            
            assert.equal(result.href, '#');
            assert.equal(result.title, 'Link title');
        });
        
        it("should sanitize src attributes", function() {
            var attributes = {
                src: "javascript:alert('xss')",
                alt: "Image alt"
            };
            
            var instance = sanitizer.createSanitizer();
            var result = instance.sanitizeAttributes(attributes);
            
            assert.equal(result.src, '#');
            assert.equal(result.alt, 'Image alt');
        });
        
        it("should escape HTML entities in non-URL attributes", function() {
            var attributes = {
                title: "Title with <script> tag",
                alt: 'Alt with "quotes" and <tags>'
            };
            
            var instance = sanitizer.createSanitizer();
            var result = instance.sanitizeAttributes(attributes);
            
            assert.equal(result.title, 'Title with &lt;script&gt; tag');
            assert.equal(result.alt, 'Alt with &quot;quotes&quot; and &lt;tags&gt;');
        });
        
        it("should handle null/undefined attributes", function() {
            var instance = sanitizer.createSanitizer();
            
            assert.equal(instance.sanitizeAttributes(null), null);
            assert.equal(instance.sanitizeAttributes(undefined), undefined);
        });
        
        it("should handle empty attributes object", function() {
            var instance = sanitizer.createSanitizer();
            var result = instance.sanitizeAttributes({});
            
            assert.deepEqual(result, {});
        });
    });
    
    describe("configuration levels", function() {
        it("should export security levels constants", function() {
            assert.equal(sanitizer.SECURITY_LEVELS.STRICT, 'strict');
            assert.equal(sanitizer.SECURITY_LEVELS.STANDARD, 'standard');
            assert.equal(sanitizer.SECURITY_LEVELS.PERMISSIVE, 'permissive');
        });
        
        it("should export configuration objects", function() {
            assert.ok(sanitizer.DEFAULT_CONFIG);
            assert.ok(sanitizer.STRICT_CONFIG);
            assert.ok(sanitizer.PERMISSIVE_CONFIG);
        });
    });
    
    describe("standalone functions", function() {
        it("should provide standalone sanitizeUrl function", function() {
            var result = sanitizer.sanitizeUrl("javascript:alert('xss')");
            assert.equal(result, '#');
        });
        
        it("should provide standalone sanitizeAttributes function", function() {
            var attributes = {href: "javascript:alert('xss')"};
            var result = sanitizer.sanitizeAttributes(attributes);
            assert.equal(result.href, '#');
        });
    });
});
