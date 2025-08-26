/**
 * Base plugin interface for extending document matcher functionality
 * All plugins should inherit from or implement this interface
 */

var BasePlugin = function(name, version) {
    this.name = name || "BasePlugin";
    this.version = version || "1.0.0";
    this.dependencies = [];
    this.enabled = true;
};

/**
 * Register matcher types with the registry
 * This method should be implemented by concrete plugins
 * @param {DocumentMatcherRegistry} registry - The matcher registry
 */
BasePlugin.prototype.register = function(registry) {
    throw new Error("Plugin must implement register method");
};

/**
 * Initialize plugin - called after registration
 * Override this method to perform initialization tasks
 * @param {DocumentMatcherRegistry} registry - The matcher registry
 */
BasePlugin.prototype.initialize = function(registry) {
    // Default implementation - no initialization needed
};

/**
 * Check if plugin dependencies are satisfied
 * @param {Array} availablePlugins - Array of loaded plugin names
 * @returns {boolean} true if dependencies are satisfied
 */
BasePlugin.prototype.checkDependencies = function(availablePlugins) {
    if (!this.dependencies || this.dependencies.length === 0) {
        return true;
    }
    
    return this.dependencies.every(function(dependency) {
        return availablePlugins.indexOf(dependency) !== -1;
    });
};

/**
 * Get plugin metadata
 * @returns {Object} Plugin metadata
 */
BasePlugin.prototype.getMetadata = function() {
    return {
        name: this.name,
        version: this.version,
        dependencies: this.dependencies,
        enabled: this.enabled,
        description: this.getDescription()
    };
};

/**
 * Get plugin description
 * Override this method to provide a meaningful description
 * @returns {string} Plugin description
 */
BasePlugin.prototype.getDescription = function() {
    return "Base plugin for extending document matcher functionality";
};

/**
 * Enable the plugin
 */
BasePlugin.prototype.enable = function() {
    this.enabled = true;
};

/**
 * Disable the plugin
 */
BasePlugin.prototype.disable = function() {
    this.enabled = false;
};

/**
 * Validate plugin configuration
 * Override this method to validate plugin-specific configuration
 * @param {Object} config - Plugin configuration
 * @returns {Array} Array of validation errors (empty if valid)
 */
BasePlugin.prototype.validateConfiguration = function(config) {
    return [];
};

module.exports = BasePlugin;
