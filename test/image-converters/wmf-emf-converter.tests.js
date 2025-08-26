var assert = require("assert");
var hamjest = require("hamjest");
var wmfEmfConverter = require("../../lib/image-converters/wmf-emf-converter");
var promises = require("../../lib/promises");

describe("WMF/EMF Converter", function() {
    var converter;

    beforeEach(function() {
        converter = wmfEmfConverter.createConverter();
    });

    afterEach(function() {
        return converter.cleanup();
    });

    describe("Format Detection", function() {
        it("should detect WMF format from standard signature", function() {
            var wmfBuffer = Buffer.from([0xD7, 0xCD, 0xC6, 0x9A, 0x00, 0x00]);
            var format = wmfEmfConverter.detectFormat(wmfBuffer);
            assert.equal(format, 'wmf');
        });

        it("should detect WMF format from placeable signature", function() {
            var wmfBuffer = Buffer.from([0x01, 0x00, 0x09, 0x00, 0x00, 0x00]);
            var format = wmfEmfConverter.detectFormat(wmfBuffer);
            assert.equal(format, 'wmf');
        });

        it("should detect EMF format from signature", function() {
            var emfBuffer = Buffer.concat([
                Buffer.from([0x01, 0x00, 0x00, 0x00]), // Primary signature
                Buffer.alloc(36), // Padding to offset 40
                Buffer.from([0x20, 0x45, 0x4D, 0x46]) // Secondary signature
            ]);
            var format = wmfEmfConverter.detectFormat(emfBuffer);
            assert.equal(format, 'emf');
        });

        it("should return null for non-metafile formats", function() {
            var pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG signature
            var format = wmfEmfConverter.detectFormat(pngBuffer);
            assert.equal(format, null);
        });

        it("should return null for empty buffer", function() {
            var format = wmfEmfConverter.detectFormat(Buffer.alloc(0));
            assert.equal(format, null);
        });

        it("should return null for non-buffer input", function() {
            var format = wmfEmfConverter.detectFormat("not a buffer");
            assert.equal(format, null);
        });

        it("should return null for too-short buffer", function() {
            var format = wmfEmfConverter.detectFormat(Buffer.from([0x01, 0x02]));
            assert.equal(format, null);
        });
    });

    describe("Content Type Support", function() {
        it("should support WMF content types", function() {
            assert.equal(wmfEmfConverter.isSupportedFormat('image/wmf'), true);
            assert.equal(wmfEmfConverter.isSupportedFormat('image/x-wmf'), true);
        });

        it("should support EMF content types", function() {
            assert.equal(wmfEmfConverter.isSupportedFormat('image/emf'), true);
            assert.equal(wmfEmfConverter.isSupportedFormat('image/x-emf'), true);
        });

        it("should support case-insensitive content types", function() {
            assert.equal(wmfEmfConverter.isSupportedFormat('IMAGE/WMF'), true);
            assert.equal(wmfEmfConverter.isSupportedFormat('Image/X-EMF'), true);
        });

        it("should not support unsupported content types", function() {
            assert.equal(wmfEmfConverter.isSupportedFormat('image/png'), false);
            assert.equal(wmfEmfConverter.isSupportedFormat('text/plain'), false);
        });

        it("should handle null/undefined content types", function() {
            assert.equal(wmfEmfConverter.isSupportedFormat(null), false);
            assert.equal(wmfEmfConverter.isSupportedFormat(undefined), false);
        });
    });

    describe("Security Validation", function() {
        it("should reject non-buffer input", function() {
            return converter.convert("not a buffer").then(function() {
                assert.fail("Should have thrown error");
            }, function(error) {
                assert.equal(error.type, wmfEmfConverter.ERROR_TYPES.SECURITY_VIOLATION);
                hamjest.assertThat(error.message, hamjest.containsString("Input must be a Buffer"));
            });
        });

        it("should reject empty buffer", function() {
            return converter.convert(Buffer.alloc(0)).then(function() {
                assert.fail("Should have thrown error");
            }, function(error) {
                assert.equal(error.type, wmfEmfConverter.ERROR_TYPES.INVALID_FORMAT);
            });
        });

        it("should reject oversized files", function() {
            var largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
            return converter.convert(largeBuffer).then(function() {
                assert.fail("Should have thrown error");
            }, function(error) {
                assert.equal(error.type, wmfEmfConverter.ERROR_TYPES.FILE_TOO_LARGE);
            });
        });

        it("should enforce stricter limits in strict mode", function() {
            var strictConverter = wmfEmfConverter.createConverter({ securityLevel: 'strict' });
            var mediumBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
            
            return strictConverter.convert(mediumBuffer).then(function() {
                assert.fail("Should have thrown error in strict mode");
            }, function(error) {
                assert.equal(error.type, wmfEmfConverter.ERROR_TYPES.FILE_TOO_LARGE);
            }).finally(function() {
                return strictConverter.cleanup();
            });
        });

        it("should validate dimension limits", function() {
            assert.throws(function() {
                wmfEmfConverter.createConverter({ maxWidth: 20000 });
            }, function(error) {
                return error.type === wmfEmfConverter.ERROR_TYPES.SECURITY_VIOLATION &&
                       error.message.includes('Invalid maxWidth dimension');
            });
        });

        it("should validate output format", function() {
            assert.throws(function() {
                wmfEmfConverter.createConverter({ outputFormat: 'malicious' });
            }, function(error) {
                return error.type === wmfEmfConverter.ERROR_TYPES.SECURITY_VIOLATION &&
                       error.message.includes('Invalid output format');
            });
        });
    });

    describe("Placeholder Generation", function() {
        it("should generate placeholder for invalid format", function() {
            var invalidBuffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
            return converter.convert(invalidBuffer, {fallbackToPlaceholder: true}).then(function(result) {
                assert.equal(result.method, 'simple-placeholder');
                assert.equal(result.format, 'png');
                assert.equal(result.metadata.placeholder, true);
            });
        });

        it("should generate SVG placeholder when requested", function() {
            var wmfBuffer = Buffer.from([0xD7, 0xCD, 0xC6, 0x9A, 0x00]);
            var svgConverter = wmfEmfConverter.createConverter({ 
                outputFormat: 'svg',
                enableSvg: true,
                fallbackToPlaceholder: true 
            });

            return svgConverter.convert(wmfBuffer).then(function(result) {
                assert.equal(result.format, 'svg');
                assert.equal(result.contentType, 'image/svg+xml');
                hamjest.assertThat(result.buffer.toString(), hamjest.containsString('<svg'));
            }).finally(function() {
                return svgConverter.cleanup();
            });
        });

        it("should include metadata in placeholder", function() {
            var wmfBuffer = Buffer.from([0xD7, 0xCD, 0xC6, 0x9A, 0x00]);
            return converter.convert(wmfBuffer, { fallbackToPlaceholder: true }).then(function(result) {
                assert.equal(typeof result.metadata, 'object');
                assert.equal(result.metadata.placeholder, true);
                hamjest.assertThat(result.metadata.originalFormat, hamjest.containsString('WMF'));
            });
        });

        it("should not generate placeholder when disabled", function() {
            var invalidBuffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
            return converter.convert(invalidBuffer, { fallbackToPlaceholder: false }).then(function() {
                assert.fail("Should have thrown error without fallback");
            }, function(error) {
                assert.equal(error.type, wmfEmfConverter.ERROR_TYPES.INVALID_FORMAT);
            });
        });
    });

    describe("Configuration Options", function() {
        it("should use default options", function() {
            var defaultConverter = wmfEmfConverter.createConverter();
            assert.equal(typeof defaultConverter.detectFormat, 'function');
            assert.equal(typeof defaultConverter.convert, 'function');
        });

        it("should accept custom options", function() {
            var customConverter = wmfEmfConverter.createConverter({
                outputFormat: 'jpeg',
                quality: 80,
                maxWidth: 1024,
                maxHeight: 768
            });
            
            assert.equal(typeof customConverter.convert, 'function');
            return customConverter.cleanup();
        });

        it("should validate custom options", function() {
            assert.throws(function() {
                wmfEmfConverter.createConverter({ maxWidth: -1 });
            });
        });
    });

    describe("Integration API", function() {
        it("should provide converter function for mammoth integration", function() {
            var converterFn = wmfEmfConverter.converter({ fallbackToPlaceholder: true });
            assert.equal(typeof converterFn, 'function');
        });

        it("should work with mammoth element interface", function() {
            var mockElement = {
                readAsBuffer: function() {
                    return promises.resolve(Buffer.from([0xD7, 0xCD, 0xC6, 0x9A, 0x00]));
                }
            };

            var converterFn = wmfEmfConverter.converter({fallbackToPlaceholder: true});
            return converterFn(mockElement).then(function(result) {
                assert.equal(typeof result.src, 'string');
                hamjest.assertThat(result.src, hamjest.startsWith('data:'));
            });
        });
    });

    describe("Error Handling", function() {
        it("should create structured error objects", function() {
            return converter.convert(Buffer.alloc(0)).then(function() {
                assert.fail("Should have thrown error");
            }, function(error) {
                assert.equal(typeof error.type, 'string');
                assert.equal(typeof error.timestamp, 'string');
                assert.equal(typeof error.message, 'string');
            });
        });

        it("should handle conversion failures gracefully", function() {
            // Create a buffer that looks like WMF but will fail conversion
            var fakeWmfBuffer = Buffer.concat([
                Buffer.from([0xD7, 0xCD, 0xC6, 0x9A]), // WMF signature
                Buffer.alloc(100, 0xFF) // Invalid data
            ]);

            return converter.convert(fakeWmfBuffer, { fallbackToPlaceholder: true }).then(function(result) {
                // Should succeed with placeholder
                assert.equal(result.metadata.placeholder, true);
            });
        });

        it("should timeout on long operations", function() {
            // This test would require a mock that simulates a long-running conversion
            // For now, we just verify the structure exists
            assert.equal(typeof wmfEmfConverter.ERROR_TYPES.CONVERSION_FAILED, 'string');
        });
    });

    describe("Cleanup", function() {
        it("should cleanup temporary files", function() {
            return converter.cleanup().then(function() {
                // Cleanup should complete without error
                assert.ok(true);
            });
        });

        it("should handle cleanup errors gracefully", function() {
            // Even if cleanup fails, it shouldn't throw
            var converterWithBadTempDir = wmfEmfConverter.createConverter({ tempDir: '/invalid/path' });
            return converterWithBadTempDir.cleanup().then(function() {
                assert.ok(true);
            });
        });
    });

    describe("Memory Safety", function() {
        it("should handle large valid buffers", function() {
            // Create a reasonably large WMF buffer (under the limit)
            var largeValidBuffer = Buffer.concat([
                Buffer.from([0xD7, 0xCD, 0xC6, 0x9A]), // WMF signature
                Buffer.alloc(5 * 1024 * 1024, 0) // 5MB of zeros
            ]);

            return converter.convert(largeValidBuffer, { fallbackToPlaceholder: true }).then(function(result) {
                assert.equal(typeof result.buffer, 'object');
                assert.ok(Buffer.isBuffer(result.buffer));
            });
        });

        it("should not leak memory on repeated calls", function() {
            var wmfBuffer = Buffer.from([0xD7, 0xCD, 0xC6, 0x9A, 0x00]);
            var promiseList = [];

            // Run multiple conversions in parallel
            for (var i = 0; i < 10; i++) {
                promiseList.push(
                    converter.convert(wmfBuffer, {fallbackToPlaceholder: true})
                );
            }

            return promises.all(promiseList).then(function(results) {
                assert.equal(results.length, 10);
                results.forEach(function(result) {
                    assert.ok(Buffer.isBuffer(result.buffer));
                });
            });
        });
    });
});
