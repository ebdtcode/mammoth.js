# Migration Checklist - Enhanced mammoth.js

Use this checklist to safely upgrade from standard mammoth.js to the enhanced version.

## ☑️ Pre-Migration Checklist

### 1. Backup Current Setup
- [ ] Backup existing `node_modules/mammoth` directory
- [ ] Backup current project code using mammoth.js
- [ ] Document current mammoth.js configuration and options
- [ ] Save example outputs from current version for comparison

### 2. System Requirements Check
- [ ] Node.js 12+ installed (`node --version`)
- [ ] npm 6+ available (`npm --version`)
- [ ] Adequate disk space (additional 50MB)
- [ ] Git available (if installing from repository)

### 3. Compatibility Assessment
- [ ] Identify documents that use complex features (tables, images, etc.)
- [ ] List any custom mammoth.js integrations in your code
- [ ] Check for any mammoth.js monkey-patches or modifications
- [ ] Note any specific style mappings you rely on

## 🔄 Installation Process

### Step 1: Remove Old Version
- [ ] `npm uninstall mammoth`
- [ ] Clear npm cache: `npm cache clean --force`
- [ ] Remove any global mammoth installations: `npm uninstall -g mammoth`

### Step 2: Install Enhanced Version

**Option A: Automated Installer**
- [ ] `git clone https://github.com/yourusername/mammoth.js.git`
- [ ] `cd mammoth.js`
- [ ] `node install.js`
- [ ] Follow installer prompts

**Option B: Manual Installation**
- [ ] Download enhanced mammoth.js
- [ ] `npm install /path/to/enhanced-mammoth.js`
- [ ] Verify installation: `npm list mammoth`

**Option C: Local Development**
- [ ] Clone repository to desired location
- [ ] `npm link` in mammoth.js directory
- [ ] `npm link mammoth` in your project

### Step 3: Verify Installation
- [ ] Run: `node -e "console.log(require('mammoth'))"`
- [ ] Check new features available: security, handlers, etc.
- [ ] Run any existing tests

## 🧪 Testing & Validation

### Basic Functionality Test
- [ ] Convert a simple document with old and new versions
- [ ] Compare HTML outputs for major differences
- [ ] Verify image handling works as expected
- [ ] Check footnotes/endnotes render correctly

### Security Features Test
```javascript
// Add to your test file
const mammoth = require('mammoth');

// Test 1: Default security
console.log('✓ Security available:', !!mammoth.security);

// Test 2: URL sanitization
const sanitizer = mammoth.security.createSanitizer({level: 'strict'});
console.log('✓ Sanitizer works:', sanitizer.sanitizeUrl('https://safe.com'));

// Test 3: Custom handlers
console.log('✓ Handlers available:', !!mammoth.handlers);
```
- [ ] Run security test
- [ ] Test with documents containing links
- [ ] Verify dangerous URLs are blocked

### Performance Comparison
```javascript
// Performance test
const fs = require('fs');
const mammoth = require('mammoth');

async function timeConversion(file) {
    const start = Date.now();
    await mammoth.convertToHtml({path: file});
    return Date.now() - start;
}

// Test with your typical documents
timeConversion('typical-document.docx').then(time => 
    console.log(`Conversion time: ${time}ms`)
);
```
- [ ] Compare conversion times
- [ ] Test memory usage
- [ ] Check output file sizes

## 🔧 Code Migration

### Update Basic Usage
**Before:**
```javascript
const mammoth = require('mammoth');

mammoth.convertToHtml({path: "document.docx"})
    .then(result => {
        // Manual security checks needed
        const cleanHtml = sanitizeHtml(result.value);
        displayHtml(cleanHtml);
    });
```

**After:**
```javascript
const mammoth = require('mammoth');

mammoth.convertToHtml({path: "document.docx"}, {
    security: {level: 'standard'} // Security built-in
}).then(result => {
    displayHtml(result.value); // Already sanitized
});
```
- [ ] Update all basic conversion calls
- [ ] Remove manual URL sanitization code
- [ ] Add security configuration where needed

### Update Style Mappings
**Before:**
```javascript
const styleMap = [
    "p[style-name='Title'] => h1",
    "p[style-name='Code'] => pre"
];
```

**After:**
```javascript
const styleMap = [
    "p[style-name='Title'] => h1.document-title",  // Enhanced with classes
    "p[style-name='Code'] => pre.code-block",      // Better semantic HTML
    // New: Custom element support
    "sdt[alias='author'] => span.author-name"
];
```
- [ ] Review and update style mappings
- [ ] Add CSS classes for better styling
- [ ] Consider new custom element mappings

### Handle New Options
```javascript
// Add new options to existing conversions
const options = {
    // Existing options
    styleMap: myStyleMap,
    convertImage: myImageHandler,
    
    // New options
    security: {
        level: 'standard',
        customSanitizer: (url) => {
            if (url.includes('internal')) return url;
            if (url.includes('tracking')) return '#';
            return url;
        }
    },
    tables: {
        preserveBorders: true,
        preserveBackground: true,
        preserveAlignment: true
    }
};
```
- [ ] Add security options to all conversions
- [ ] Configure table preservation settings
- [ ] Update any custom image handlers

## 🚨 Common Migration Issues

### Issue 1: URLs Being Blocked
**Problem:** Links that worked before are now blocked
**Solution:**
```javascript
// Option 1: Lower security level
{security: {level: 'permissive'}}

// Option 2: Add specific protocols
{security: {allowedProtocols: ['http:', 'https:', 'ftp:', 'file:']}}

// Option 3: Custom sanitizer
{security: {customSanitizer: (url) => {
    // Your custom logic
    return url;
}}}
```
- [ ] Identify blocked URLs
- [ ] Choose appropriate security level
- [ ] Test with your specific use case

### Issue 2: Table Formatting Different
**Problem:** Tables look different after upgrade
**Solution:**
```javascript
// Enable table formatting preservation
{tables: {
    preserveBorders: true,
    preserveBackground: true,
    preserveAlignment: true,
    cssMode: 'inline' // or 'classes'
}}
```
- [ ] Compare table outputs
- [ ] Enable table preservation options
- [ ] Update CSS styles if needed

### Issue 3: New Warnings Appearing
**Problem:** More warnings than before
**Solution:** Enhanced version detects more issues
```javascript
// Filter warnings by type
const importantWarnings = result.messages.filter(msg => 
    !msg.message.includes('unrecognised') // Filter element warnings
);
```
- [ ] Review new warnings
- [ ] Decide which warnings to address
- [ ] Consider custom handlers for unrecognized elements

### Issue 4: Performance Changes
**Problem:** Conversion speed different
**Solution:** Security processing adds minimal overhead
```javascript
// Disable security for trusted content only
{security: false} // Use with caution!

// Or optimize images
{convertImage: mammoth.images.imgElement(function(element) {
    // Optimize image processing
    return fastImageHandler(element);
})}
```
- [ ] Measure actual performance difference
- [ ] Optimize where necessary
- [ ] Consider async processing for large documents

## 🎯 Feature Adoption Plan

### Phase 1: Basic Migration (Week 1)
- [ ] Install enhanced version
- [ ] Update basic conversion calls
- [ ] Configure security settings
- [ ] Test critical workflows

### Phase 2: Enhanced Features (Week 2)
- [ ] Implement table formatting preservation
- [ ] Add custom element handlers for important elements
- [ ] Enhance style mappings with classes
- [ ] Update error handling

### Phase 3: Optimization (Week 3)
- [ ] Fine-tune security settings
- [ ] Optimize performance for large documents
- [ ] Implement custom handlers for all unrecognized elements
- [ ] Add comprehensive testing

### Phase 4: Advanced Usage (Ongoing)
- [ ] Explore custom matcher registry
- [ ] Implement advanced image handling
- [ ] Use testing tools for new documents
- [ ] Contribute improvements back

## ✅ Migration Validation

### Functional Testing
- [ ] All existing documents convert successfully
- [ ] HTML output matches expected structure
- [ ] Images display correctly
- [ ] Links work as intended (with security)
- [ ] Tables maintain visual appearance
- [ ] Footnotes appear correctly

### Security Testing
- [ ] Dangerous URLs are blocked appropriately
- [ ] XSS attempts are prevented
- [ ] Path traversal attacks fail
- [ ] Custom security rules work correctly

### Performance Testing
- [ ] Conversion speed acceptable for your use case
- [ ] Memory usage within acceptable limits
- [ ] Large documents process without issues
- [ ] Concurrent conversions work properly

### Integration Testing
- [ ] Web applications work correctly
- [ ] API endpoints function properly
- [ ] CLI tools operate as expected
- [ ] Error handling works appropriately

## 📋 Post-Migration Tasks

### Documentation Updates
- [ ] Update internal documentation
- [ ] Modify code comments
- [ ] Update user guides
- [ ] Document new security features

### Team Training
- [ ] Train team on new security features
- [ ] Explain table formatting options
- [ ] Show custom handler capabilities
- [ ] Provide troubleshooting guide

### Monitoring Setup
- [ ] Monitor conversion warnings
- [ ] Track performance metrics
- [ ] Set up error alerting
- [ ] Document common issues

### Optimization
- [ ] Fine-tune security settings
- [ ] Optimize style mappings
- [ ] Create custom handlers for frequently encountered elements
- [ ] Set up automated testing

## 🆘 Rollback Plan

If serious issues occur during migration:

### Immediate Rollback Steps
1. [ ] `npm uninstall mammoth`
2. [ ] Restore from backup: `cp -r mammoth-backup node_modules/mammoth`
3. [ ] Revert code changes from version control
4. [ ] Test basic functionality
5. [ ] Document issues for future resolution

### Rollback Validation
- [ ] All critical functions work
- [ ] Performance is acceptable
- [ ] No security regressions
- [ ] User workflows unaffected

## 📞 Getting Help

If you encounter issues:

1. **Check Documentation**
   - [ ] Read INSTALLATION.md
   - [ ] Review FEATURES.md
   - [ ] Check CUSTOM_ELEMENTS_GUIDE.md

2. **Use Testing Tools**
   - [ ] `node test-suite/test-conversion.js your-document.docx`
   - [ ] `node test-suite/element-inspector.js your-document.docx`

3. **Debug Issues**
   - [ ] Enable debug logging
   - [ ] Check conversion warnings
   - [ ] Compare with backup version

4. **Community Support**
   - [ ] Check GitHub issues
   - [ ] Review documentation
   - [ ] Test with minimal examples

---

## ✨ Migration Complete!

Once all items are checked:

- [ ] Enhanced mammoth.js is fully operational
- [ ] All critical workflows validated
- [ ] Team trained on new features
- [ ] Documentation updated
- [ ] Performance acceptable
- [ ] Security properly configured

**Congratulations!** You're now using enhanced mammoth.js with:
- 🔒 Built-in security features
- 📊 Enhanced table support  
- 🔧 Custom element handlers
- 🎨 Advanced style mappings
- 🧪 Comprehensive testing tools

Enjoy the enhanced functionality and improved security!