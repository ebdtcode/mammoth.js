/* global process */

var fs = require("fs");
var path = require("path");

var mammoth = require("./");
var promises = require("./promises");
var images = require("./images");
var shellQuote = require("shell-quote");

function main(argv) {
    var docxPath = sanitizePath(argv["docx-path"]);
    var outputPath = argv["output-path"] ? sanitizePath(argv["output-path"]) : null;
    var outputDir = argv.output_dir ? sanitizePath(argv.output_dir) : null;
    var outputFormat = argv.output_format;
    var styleMapPath = argv.style_map ? sanitizePath(argv.style_map) : null;
    
    readStyleMap(styleMapPath).then(function(styleMap) {
        var options = {
            styleMap: styleMap,
            outputFormat: outputFormat
        };
        
        if (outputDir) {
            var basename = path.basename(docxPath, ".docx");
            outputPath = path.join(outputDir, basename + ".html");
            var imageIndex = 0;
            options.convertImage = images.imgElement(function(element) {
                imageIndex++;
                var extension = element.contentType.split("/")[1];
                var filename = imageIndex + "." + extension;
                
                return element.read().then(function(imageBuffer) {
                    var imagePath = path.join(outputDir, filename);
                    return promises.nfcall(fs.writeFile, imagePath, imageBuffer);
                }).then(function() {
                    return {src: filename};
                });
            });
        }
        
        return mammoth.convert({path: docxPath}, options)
            .then(function(result) {
                result.messages.forEach(function(message) {
                    process.stderr.write(message.message);
                    process.stderr.write("\n");
                });
                
                var outputStream = outputPath ? fs.createWriteStream(outputPath) : process.stdout;
                
                outputStream.write(result.value);
            });
    }).done();
}

function readStyleMap(styleMapPath) {
    if (styleMapPath) {
        return promises.nfcall(fs.readFile, styleMapPath, "utf8");
    } else {
        return promises.resolve(null);
    }
}

function sanitizePath(inputPath) {
    if (!inputPath) {
        return null;
    }
    
    // Parse the path if it contains special characters
    var parsed = shellQuote.parse(inputPath);
    if (parsed.length > 0) {
        inputPath = parsed[0];
    }
    
    // Prevent path traversal attacks
    var normalizedPath = path.normalize(inputPath);
    
    // Check for dangerous patterns
    if (normalizedPath.indexOf('..') !== -1) {
        // Allow relative paths but validate they don't escape the working directory
        var resolvedPath = path.resolve(normalizedPath);
        var workingDir = path.resolve(process.cwd());
        
        if (!resolvedPath.startsWith(workingDir)) {
            throw new Error("Path traversal detected: " + inputPath);
        }
    }
    
    // Remove any null bytes
    normalizedPath = normalizedPath.replace(/\0/g, '');
    
    return normalizedPath;
}

module.exports = main;
