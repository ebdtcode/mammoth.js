var Html = require("../html");
var results = require("../results");

/**
 * MediaHandler processes multimedia elements including embedded objects,
 * audio, video, and other media content from documents.
 */
var MediaHandler = {
    
    /**
     * Handle media elements
     *
     * @param {Object} element Media element
     * @param {Array} messages Message array
     * @param {Object} options Conversion options
     * @returns {Array} HTML nodes
     */
    handle: function(element, messages, options) {
        try {
            var elementName = element.name || element.type;
            
            if (elementName === "w:object") {
                return this._handleWordObject(element, messages, options);
            } else if (elementName === "w:pict") {
                return this._handleWordPicture(element, messages, options);
            } else if (elementName.includes("video") || elementName.includes("audio")) {
                return this._handleMediaElement(element, messages, options);
            } else if (elementName.includes("embed") || elementName.includes("object")) {
                return this._handleEmbeddedObject(element, messages, options);
            }
            
            return this._handleGenericMedia(element, messages, options);
        } catch (error) {
            messages.push(results.error("Error handling media element: " + error.message));
            return this._createMediaPlaceholder("Media Error", messages);
        }
    },
    
    /**
     * Handle Word object elements (w:object)
     */
    _handleWordObject: function(element, messages, options) {
        var objectType = this._determineObjectType(element);
        var objectData = this._extractObjectData(element);
        
        switch (objectType) {
        case "oleObject":
            return this._handleOLEObject(element, objectData, messages, options);
        case "package":
            return this._handlePackage(element, objectData, messages, options);
        case "equation":
            return this._handleEquationObject(element, objectData, messages, options);
        case "chart":
            return this._handleChartObject(element, objectData, messages, options);
        case "media":
            return this._handleMediaObject(element, objectData, messages, options);
        default:
            return this._handleUnknownObject(element, objectData, messages, options);
        }
    },
    
    /**
     * Handle Word picture elements (w:pict) - legacy VML
     */
    _handleWordPicture: function(element, messages, options) {
        var pictData = this._extractPictureData(element);
        
        if (pictData.isImage) {
            return this._handleVMLImage(element, pictData, messages, options);
        } else if (pictData.isShape) {
            return this._handleVMLShape(element, pictData, messages, options);
        } else {
            messages.push(results.warning("VML picture element converted to placeholder"));
            return this._createMediaPlaceholder("VML Picture", messages);
        }
    },
    
    /**
     * Handle generic media elements (audio, video)
     */
    _handleMediaElement: function(element, messages, options) {
        var elementName = element.name || element.type;
        
        if (elementName.includes("video")) {
            return this._handleVideo(element, messages, options);
        } else if (elementName.includes("audio")) {
            return this._handleAudio(element, messages, options);
        }
        
        return this._handleGenericMedia(element, messages, options);
    },
    
    /**
     * Handle embedded objects
     */
    _handleEmbeddedObject: function(element, messages, options) {
        var objectInfo = this._extractEmbedInfo(element);
        
        messages.push(results.warning(
            "Embedded object converted to placeholder. Type: " + (objectInfo.type || "unknown")
        ));
        
        return this._createEmbedPlaceholder(objectInfo, messages);
    },
    
    /**
     * Handle generic media elements
     */
    _handleGenericMedia: function(element, messages, options) {
        var elementName = element.name || element.type;
        messages.push(results.warning("Generic media handler used for: " + elementName));
        
        return this._createMediaPlaceholder("Media: " + elementName, messages);
    },
    
    // Specific object type handlers
    
    /**
     * Handle OLE (Object Linking and Embedding) objects
     */
    _handleOLEObject: function(element, objectData, messages, options) {
        var progId = objectData.progId || "Unknown";
        var objectInfo = this._identifyOLEObject(progId);
        
        messages.push(results.warning(
            "OLE object converted to placeholder: " + objectInfo.description
        ));
        
        // Create appropriate placeholder based on object type
        if (objectInfo.category === "spreadsheet") {
            return this._createSpreadsheetPlaceholder(objectInfo, messages);
        } else if (objectInfo.category === "presentation") {
            return this._createPresentationPlaceholder(objectInfo, messages);
        } else if (objectInfo.category === "media") {
            return this._createMediaPlayerPlaceholder(objectInfo, messages);
        } else {
            return this._createOLEPlaceholder(objectInfo, messages);
        }
    },
    
    /**
     * Handle package objects (embedded files)
     */
    _handlePackage: function(element, objectData, messages, options) {
        var packageInfo = {
            name: objectData.name || "Embedded File",
            size: objectData.size || "Unknown size",
            type: objectData.type || "Unknown type"
        };
        
        messages.push(results.warning("Package object (embedded file): " + packageInfo.name));
        
        return this._createPackagePlaceholder(packageInfo, messages);
    },
    
    /**
     * Handle equation objects (legacy equation editor)
     */
    _handleEquationObject: function(element, objectData, messages, options) {
        messages.push(results.warning("Legacy equation object converted to placeholder"));
        
        return this._createEquationPlaceholder(messages);
    },
    
    /**
     * Handle chart objects
     */
    _handleChartObject: function(element, objectData, messages, options) {
        var chartType = objectData.chartType || "Unknown";
        messages.push(results.warning("Chart object: " + chartType));
        
        return this._createChartPlaceholder(chartType, messages);
    },
    
    /**
     * Handle media objects (audio, video embedded as OLE)
     */
    _handleMediaObject: function(element, objectData, messages, options) {
        var mediaType = objectData.mediaType || "Unknown";
        messages.push(results.warning("Media object: " + mediaType));
        
        if (mediaType.startsWith("audio")) {
            return this._createAudioPlaceholder(objectData, messages);
        } else if (mediaType.startsWith("video")) {
            return this._createVideoPlaceholder(objectData, messages);
        } else {
            return this._createMediaPlaceholder("Media Object", messages);
        }
    },
    
    /**
     * Handle unknown object types
     */
    _handleUnknownObject: function(element, objectData, messages, options) {
        messages.push(results.warning("Unknown object type: " + (objectData.type || "unspecified")));
        
        return this._createMediaPlaceholder("Unknown Object", messages);
    },
    
    /**
     * Handle VML images
     */
    _handleVMLImage: function(element, pictData, messages, options) {
        if (pictData.src) {
            var imgAttrs = {
                src: pictData.src,
                alt: pictData.alt || "VML Image"
            };
            
            if (pictData.width) {
                imgAttrs.style = "width: " + pictData.width + ";";
            }
            if (pictData.height) {
                imgAttrs.style = (imgAttrs.style || "") + "height: " + pictData.height + ";";
            }
            
            return [Html.freshElement("img", imgAttrs)];
        } else {
            messages.push(results.warning("VML image missing source"));
            return this._createMediaPlaceholder("VML Image", messages);
        }
    },
    
    /**
     * Handle VML shapes
     */
    _handleVMLShape: function(element, pictData, messages, options) {
        messages.push(results.warning("VML shape converted to placeholder"));
        
        return this._createShapePlaceholder(pictData, messages);
    },
    
    /**
     * Handle video elements
     */
    _handleVideo: function(element, messages, options) {
        var videoSrc = this._extractMediaSource(element);
        
        if (videoSrc) {
            var videoAttrs = {
                controls: "controls",
                style: "max-width: 100%; height: auto;"
            };
            
            if (this._isValidVideoUrl(videoSrc, options)) {
                videoAttrs.src = videoSrc;
                return [Html.freshElement("video", videoAttrs, [
                    Html.text("Your browser does not support the video tag.")
                ])];
            } else {
                messages.push(results.warning("Video source blocked or invalid: " + videoSrc));
                return this._createVideoPlaceholder({src: videoSrc}, messages);
            }
        } else {
            return this._createVideoPlaceholder({}, messages);
        }
    },
    
    /**
     * Handle audio elements
     */
    _handleAudio: function(element, messages, options) {
        var audioSrc = this._extractMediaSource(element);
        
        if (audioSrc) {
            var audioAttrs = {
                controls: "controls"
            };
            
            if (this._isValidAudioUrl(audioSrc, options)) {
                audioAttrs.src = audioSrc;
                return [Html.freshElement("audio", audioAttrs, [
                    Html.text("Your browser does not support the audio element.")
                ])];
            } else {
                messages.push(results.warning("Audio source blocked or invalid: " + audioSrc));
                return this._createAudioPlaceholder({src: audioSrc}, messages);
            }
        } else {
            return this._createAudioPlaceholder({}, messages);
        }
    },
    
    // Data extraction methods
    
    _determineObjectType: function(element) {
        // Analyze object element to determine type
        var oleObject = element.first("o:OLEObject");
        if (oleObject) {
            var progId = oleObject.attributes["ProgID"];
            if (progId) {
                if (progId.includes("Excel") || progId.includes("Calc")) {
                    return "spreadsheet";
                } else if (progId.includes("PowerPoint") || progId.includes("Impress")) {
                    return "presentation";
                } else if (progId.includes("Equation")) {
                    return "equation";
                } else if (progId.includes("Chart")) {
                    return "chart";
                } else if (progId.includes("Media") || progId.includes("Player")) {
                    return "media";
                }
            }
            return "oleObject";
        }
        
        var pkg = element.first("pkg:package");
        if (pkg) {
            return "package";
        }
        
        return "unknown";
    },
    
    _extractObjectData: function(element) {
        var data = {};
        
        // Extract OLE object data
        var oleObject = element.first("o:OLEObject");
        if (oleObject) {
            data.progId = oleObject.attributes["ProgID"];
            data.type = oleObject.attributes["Type"];
            data.classId = oleObject.attributes["ClassID"];
        }
        
        // Extract package data
        var pkg = element.first("pkg:package");
        if (pkg) {
            data.name = pkg.attributes["name"];
            data.contentType = pkg.attributes["contentType"];
        }
        
        return data;
    },
    
    _extractPictureData: function(element) {
        var data = {
            isImage: false,
            isShape: false
        };
        
        // Look for VML image elements
        var imageData = element.first("v:imagedata");
        if (imageData) {
            data.isImage = true;
            data.src = imageData.attributes["r:id"] || imageData.attributes["o:href"];
            data.alt = imageData.attributes["o:title"];
        }
        
        // Look for VML shapes
        var shape = element.first("v:shape") || element.first("v:rect") || element.first("v:oval");
        if (shape) {
            data.isShape = true;
            data.shapeType = shape.name.split(':')[1];
            data.style = shape.attributes["style"];
        }
        
        return data;
    },
    
    _extractEmbedInfo: function(element) {
        return {
            type: element.attributes["type"] || "unknown",
            src: element.attributes["src"],
            width: element.attributes["width"],
            height: element.attributes["height"]
        };
    },
    
    _extractMediaSource: function(element) {
        return element.attributes["src"] ||
               element.attributes["href"] ||
               (element.first("source") && element.first("source").attributes["src"]);
    },
    
    _identifyOLEObject: function(progId) {
        var objectMap = {
            "Excel.Sheet": {description: "Excel Spreadsheet", category: "spreadsheet"},
            "Excel.Chart": {description: "Excel Chart", category: "chart"},
            "PowerPoint.Slide": {description: "PowerPoint Slide", category: "presentation"},
            "Word.Document": {description: "Word Document", category: "document"},
            "Equation.3": {description: "Equation Editor 3.0", category: "equation"},
            "Equation.DSMT4": {description: "MathType Equation", category: "equation"},
            "AcroExch.Document": {description: "Adobe Acrobat Document", category: "document"},
            "MediaPlayer": {description: "Windows Media Player", category: "media"}
        };
        
        return objectMap[progId] || {
            description: progId || "Unknown Object",
            category: "unknown"
        };
    },
    
    // Validation methods
    
    _isValidVideoUrl: function(url, options) {
        if (!options.urlSanitizer) {
            return true;
        }
        
        try {
            return options.urlSanitizer.sanitizeUrl(url) !== '#';
        } catch (error) {
            return false;
        }
    },
    
    _isValidAudioUrl: function(url, options) {
        if (!options.urlSanitizer) {
            return true;
        }
        
        try {
            return options.urlSanitizer.sanitizeUrl(url) !== '#';
        } catch (error) {
            return false;
        }
    },
    
    // Placeholder creation methods
    
    _createMediaPlaceholder: function(mediaType, messages) {
        return [Html.freshElement("div", {
            class: "media-placeholder",
            style: "border: 2px dashed #9c27b0; background-color: #f3e5f5; padding: 15px; text-align: center; margin: 10px 0;",
            title: "Media element: " + mediaType
        }, [
            Html.text("🎬 " + mediaType)
        ])];
    },
    
    _createOLEPlaceholder: function(objectInfo, messages) {
        return [Html.freshElement("div", {
            class: "ole-placeholder",
            style: "border: 2px solid #ff9800; background-color: #fff3e0; padding: 15px; text-align: center; margin: 10px 0;",
            title: "OLE Object: " + objectInfo.description
        }, [
            Html.text("📄 " + objectInfo.description)
        ])];
    },
    
    _createSpreadsheetPlaceholder: function(objectInfo, messages) {
        return [Html.freshElement("div", {
            class: "spreadsheet-placeholder",
            style: "border: 2px solid #4caf50; background-color: #e8f5e8; padding: 20px; text-align: center; margin: 10px 0;",
            title: objectInfo.description
        }, [
            Html.text("📊 " + objectInfo.description)
        ])];
    },
    
    _createPresentationPlaceholder: function(objectInfo, messages) {
        return [Html.freshElement("div", {
            class: "presentation-placeholder",
            style: "border: 2px solid #f44336; background-color: #ffebee; padding: 20px; text-align: center; margin: 10px 0;",
            title: objectInfo.description
        }, [
            Html.text("📽️ " + objectInfo.description)
        ])];
    },
    
    _createPackagePlaceholder: function(packageInfo, messages) {
        return [Html.freshElement("div", {
            class: "package-placeholder",
            style: "border: 2px solid #607d8b; background-color: #f5f5f5; padding: 15px; margin: 10px 0;",
            title: "Embedded file: " + packageInfo.name + " (" + packageInfo.size + ")"
        }, [
            Html.freshElement("div", {style: "font-weight: bold;"}, [
                Html.text("📎 " + packageInfo.name)
            ]),
            Html.freshElement("div", {style: "font-size: 0.9em; color: #666; margin-top: 5px;"}, [
                Html.text(packageInfo.type + " • " + packageInfo.size)
            ])
        ])];
    },
    
    _createEquationPlaceholder: function(messages) {
        return [Html.freshElement("span", {
            class: "equation-placeholder",
            style: "background-color: #e1f5fe; border: 1px solid #0288d1; padding: 4px 8px; border-radius: 3px; font-style: italic;",
            title: "Mathematical equation (legacy format)"
        }, [Html.text("∑ Equation")])];
    },
    
    _createChartPlaceholder: function(chartType, messages) {
        return [Html.freshElement("div", {
            class: "chart-placeholder",
            style: "border: 2px solid #2196f3; background-color: #e3f2fd; padding: 20px; text-align: center; margin: 10px 0; min-height: 150px; position: relative;",
            title: "Chart: " + chartType
        }, [
            Html.freshElement("div", {
                style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
            }, [
                Html.text("📈 " + chartType + " Chart")
            ])
        ])];
    },
    
    _createVideoPlaceholder: function(videoData, messages) {
        return [Html.freshElement("div", {
            class: "video-placeholder",
            style: "border: 2px solid #e91e63; background-color: #fce4ec; padding: 20px; text-align: center; margin: 10px 0; min-height: 150px; position: relative;",
            title: "Video content" + (videoData.src ? ": " + videoData.src : "")
        }, [
            Html.freshElement("div", {
                style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
            }, [
                Html.text("🎥 Video Content"),
                videoData.src ? Html.freshElement("br", {}) : null,
                videoData.src ? Html.freshElement("small", {style: "color: #666;"}, [Html.text(videoData.src)]) : null
            ].filter(Boolean))
        ])];
    },
    
    _createAudioPlaceholder: function(audioData, messages) {
        return [Html.freshElement("div", {
            class: "audio-placeholder",
            style: "border: 2px solid #795548; background-color: #efebe9; padding: 15px; text-align: center; margin: 10px 0;",
            title: "Audio content" + (audioData.src ? ": " + audioData.src : "")
        }, [
            Html.text("🎵 Audio Content"),
            audioData.src ? Html.freshElement("br", {}) : null,
            audioData.src ? Html.freshElement("small", {style: "color: #666;"}, [Html.text(audioData.src)]) : null
        ].filter(Boolean))];
    },
    
    _createMediaPlayerPlaceholder: function(objectInfo, messages) {
        return [Html.freshElement("div", {
            class: "mediaplayer-placeholder",
            style: "border: 2px solid #9c27b0; background-color: #f3e5f5; padding: 20px; text-align: center; margin: 10px 0; min-height: 120px; position: relative;",
            title: objectInfo.description
        }, [
            Html.freshElement("div", {
                style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
            }, [
                Html.text("▶️ " + objectInfo.description)
            ])
        ])];
    },
    
    _createShapePlaceholder: function(pictData, messages) {
        return [Html.freshElement("div", {
            class: "vml-shape-placeholder",
            style: "border: 2px dashed #607d8b; background-color: #f5f5f5; padding: 10px; text-align: center; margin: 5px; display: inline-block; min-width: 50px; min-height: 30px;",
            title: "VML Shape: " + (pictData.shapeType || "unknown")
        }, [
            Html.text("◇ " + (pictData.shapeType || "Shape"))
        ])];
    },
    
    _createEmbedPlaceholder: function(objectInfo, messages) {
        return [Html.freshElement("div", {
            class: "embed-placeholder",
            style: "border: 2px solid #ff5722; background-color: #fbe9e7; padding: 15px; text-align: center; margin: 10px 0;",
            title: "Embedded object: " + objectInfo.type
        }, [
            Html.text("🔗 " + (objectInfo.type || "Embedded Object"))
        ])];
    }
};

module.exports = MediaHandler;
