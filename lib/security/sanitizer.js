var _ = require("underscore");

/**
 * Security sanitizer module for mammoth.js
 * Provides URL sanitization and content security to prevent XSS and other vulnerabilities
 */

// Default security configuration
var DEFAULT_SECURITY_CONFIG = {
    // Security level: 'strict', 'standard', 'permissive'
    level: 'standard',
    
    // Allowed URL protocols
    allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'],
    
    // Whether to allow relative URLs
    allowRelativeUrls: true,
    
    // Whether to allow fragment URLs (#anchor)
    allowFragments: true,
    
    // Whether to allow data: URLs for images
    allowDataUrls: true,
    
    // Custom sanitization function (optional)
    customSanitizer: null,
    
    // Whether to throw errors or just sanitize silently
    strict: false
};

var STRICT_SECURITY_CONFIG = {
    level: 'strict',
    allowedProtocols: ['https:', 'mailto:', 'tel:'],
    allowRelativeUrls: true,
    allowFragments: true,
    allowDataUrls: false,
    customSanitizer: null,
    strict: true
};

var PERMISSIVE_SECURITY_CONFIG = {
    level: 'permissive',
    allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:', 'ftp:', 'file:'],
    allowRelativeUrls: true,
    allowFragments: true,
    allowDataUrls: true,
    customSanitizer: null,
    strict: false
};

// Dangerous protocols that should never be allowed
var DANGEROUS_PROTOCOLS = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:application/',
    'livescript:',
    'mocha:',
    'about:'
];

// Image data URL patterns that are considered safe
var SAFE_IMAGE_DATA_PATTERNS = [
    /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i
];

/**
 * Creates a new sanitizer with the given configuration
 */
function createSanitizer(config) {
    config = config || {};
    
    if (config.level === 'strict') {
        config = _.extend({}, STRICT_SECURITY_CONFIG, config);
    } else if (config.level === 'permissive') {
        config = _.extend({}, PERMISSIVE_SECURITY_CONFIG, config);
    } else {
        config = _.extend({}, DEFAULT_SECURITY_CONFIG, config);
    }
    
    return {
        sanitizeUrl: function(url) {
            return sanitizeUrl(url, config);
        },
        sanitizeAttributes: function(attributes) {
            return sanitizeAttributes(attributes, config);
        },
        getConfig: function() {
            return _.clone(config);
        }
    };
}

/**
 * Sanitizes a URL according to the security configuration
 */
function sanitizeUrl(url, config) {
    if (!url || typeof url !== 'string') {
        return url;
    }
    
    // Trim whitespace
    url = url.trim();
    
    if (!url) {
        return url;
    }
    
    // Apply custom sanitizer if provided
    if (config.customSanitizer && typeof config.customSanitizer === 'function') {
        try {
            url = config.customSanitizer(url);
        } catch (error) {
            if (config.strict) {
                throw new Error('Custom sanitizer failed: ' + error.message);
            }
            return '#';
        }
    }
    
    // Check for dangerous protocols first
    var lowerUrl = url.toLowerCase();
    for (var i = 0; i < DANGEROUS_PROTOCOLS.length; i++) {
        if (lowerUrl.indexOf(DANGEROUS_PROTOCOLS[i]) === 0) {
            if (config.strict) {
                throw new Error('Dangerous protocol detected: ' + DANGEROUS_PROTOCOLS[i]);
            }
            return '#';
        }
    }
    
    // Handle fragment URLs
    if (url.charAt(0) === '#') {
        if (config.allowFragments) {
            return sanitizeFragment(url);
        } else {
            return config.strict ? null : '#';
        }
    }
    
    // Handle relative URLs
    if (isRelativeUrl(url)) {
        if (config.allowRelativeUrls) {
            return sanitizeRelativeUrl(url);
        } else {
            return config.strict ? null : '#';
        }
    }
    
    // Handle data URLs
    if (lowerUrl.indexOf('data:') === 0) {
        return sanitizeDataUrl(url, config);
    }
    
    // Handle absolute URLs with protocols
    var protocol = extractProtocol(url);
    if (protocol) {
        if (config.allowedProtocols.indexOf(protocol) !== -1) {
            return sanitizeAbsoluteUrl(url, protocol);
        } else {
            if (config.strict) {
                throw new Error('Protocol not allowed: ' + protocol);
            }
            return '#';
        }
    }
    
    // If we can't determine the URL type, treat as relative if allowed
    if (config.allowRelativeUrls) {
        return sanitizeRelativeUrl(url);
    }
    
    return config.strict ? null : '#';
}

/**
 * Sanitizes HTML attributes, focusing on URL-containing attributes
 */
function sanitizeAttributes(attributes, config) {
    if (!attributes || typeof attributes !== 'object') {
        return attributes;
    }
    
    var sanitizedAttributes = {};
    var urlAttributes = ['href', 'src', 'action', 'formaction', 'data'];
    
    for (var key in attributes) {
        if (attributes.hasOwnProperty(key)) {
            var value = attributes[key];
            
            if (urlAttributes.indexOf(key.toLowerCase()) !== -1) {
                // This is a URL attribute, sanitize it
                sanitizedAttributes[key] = sanitizeUrl(value, config);
            } else {
                // For non-URL attributes, just escape HTML entities
                sanitizedAttributes[key] = escapeAttributeValue(value);
            }
        }
    }
    
    return sanitizedAttributes;
}

/**
 * Checks if URL is relative
 */
function isRelativeUrl(url) {
    if (!url) {
        return false;
    }
    var protocol = extractProtocol(url);
    // It's relative if no protocol and doesn't start with / or #
    return !protocol && url.charAt(0) !== '/' && url.charAt(0) !== '#';
}

/**
 * Extracts protocol from URL
 */
function extractProtocol(url) {
    var protocolMatch = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)/);
    return protocolMatch ? protocolMatch[1].toLowerCase() : null;
}

/**
 * Sanitizes fragment URLs (#anchor)
 */
function sanitizeFragment(url) {
    // Remove dangerous characters from fragment
    return url.replace(/[<>"']/g, '');
}

/**
 * Sanitizes relative URLs
 */
function sanitizeRelativeUrl(url) {
    // Allow relative paths but prevent excessive path traversal
    var normalizedPath = url.replace(/\\/g, '/');  // Normalize backslashes
    var segments = normalizedPath.split('/');
    var upLevels = 0;
    
    for (var i = 0; i < segments.length; i++) {
        if (segments[i] === '..') {
            upLevels++;
        }
    }
    
    // Block if trying to traverse up too many levels (potential attack)
    if (upLevels > 3) {
        return '#';
    }
    
    // Remove dangerous characters
    return url.replace(/[<>"']/g, '');
}

/**
 * Sanitizes data URLs
 */
function sanitizeDataUrl(url, config) {
    if (!config.allowDataUrls) {
        return config.strict ? null : '#';
    }
    
    // Only allow safe image data URLs
    for (var i = 0; i < SAFE_IMAGE_DATA_PATTERNS.length; i++) {
        if (SAFE_IMAGE_DATA_PATTERNS[i].test(url)) {
            return url;
        }
    }
    
    if (config.strict) {
        throw new Error('Unsafe data URL detected');
    }
    
    return '#';
}

/**
 * Sanitizes absolute URLs
 */
function sanitizeAbsoluteUrl(url, protocol) {
    // Remove dangerous characters
    url = url.replace(/[<>"']/g, '');
    
    // Basic validation for well-formed URLs
    try {
        if (typeof URL !== 'undefined') {
            // Validate URL format - suppress linting for global URL
            // eslint-disable-next-line no-undef
            var testUrl = new URL(url);
            // Use testUrl to avoid no-unused-vars error
            if (testUrl.protocol) {
                // URL is valid
            }
        }
        return url;
    } catch (error) {
        return '#';
    }
}

/**
 * Escapes attribute values to prevent HTML injection
 */
function escapeAttributeValue(value) {
    if (typeof value !== 'string') {
        return value;
    }
    
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Default sanitizer instance
 */
var defaultSanitizer = createSanitizer();

// Export functions
exports.createSanitizer = createSanitizer;
exports.sanitizeUrl = function(url, config) {
    return defaultSanitizer.sanitizeUrl(url);
};
exports.sanitizeAttributes = function(attributes, config) {
    return defaultSanitizer.sanitizeAttributes(attributes);
};

// Export configurations
exports.SECURITY_LEVELS = {
    STRICT: 'strict',
    STANDARD: 'standard',
    PERMISSIVE: 'permissive'
};

exports.DEFAULT_CONFIG = DEFAULT_SECURITY_CONFIG;
exports.STRICT_CONFIG = STRICT_SECURITY_CONFIG;
exports.PERMISSIVE_CONFIG = PERMISSIVE_SECURITY_CONFIG;
