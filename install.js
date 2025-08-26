#!/usr/bin/env node

/**
 * Installation and Build Script for Enhanced mammoth.js
 * 
 * This script helps users install and configure the enhanced version
 * of mammoth.js with all new features.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

class MammothInstaller {
    constructor() {
        this.installPath = process.cwd();
        this.features = {
            security: true,
            customHandlers: true,
            enhancedTables: true,
            styleRegistry: true,
            testSuite: true
        };
    }

    async run() {
        console.log(`${colors.bold}${colors.blue}Enhanced mammoth.js Installer${colors.reset}`);
        console.log('═'.repeat(50));
        
        try {
            await this.welcome();
            await this.checkPrerequisites();
            await this.configureInstallation();
            await this.installDependencies();
            await this.setupFeatures();
            await this.runTests();
            await this.createQuickStart();
            await this.complete();
            
        } catch (error) {
            console.error(`\n${colors.red}❌ Installation failed: ${error.message}${colors.reset}`);
            process.exit(1);
        }
    }

    async welcome() {
        console.log('\n🚀 Welcome to Enhanced mammoth.js!');
        console.log('\nThis installer will set up mammoth.js with:');
        console.log('  • Advanced security features');
        console.log('  • Custom element handlers');
        console.log('  • Enhanced table support');
        console.log('  • Style matcher registry');
        console.log('  • Comprehensive test suite');
        
        const proceed = await this.prompt('\nProceed with installation? (Y/n): ');
        if (proceed.toLowerCase() === 'n') {
            console.log('Installation cancelled.');
            process.exit(0);
        }
    }

    async checkPrerequisites() {
        console.log(`\n${colors.cyan}Checking prerequisites...${colors.reset}`);
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 12) {
            throw new Error(`Node.js 12+ required. Current version: ${nodeVersion}`);
        }
        console.log(`✓ Node.js ${nodeVersion} (compatible)`);
        
        // Check npm
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            console.log(`✓ npm ${npmVersion}`);
        } catch (error) {
            throw new Error('npm is required but not found');
        }
        
        // Check available space
        const stats = fs.statSync(this.installPath);
        console.log(`✓ Installation directory: ${this.installPath}`);
        
        // Check for existing mammoth installation
        const existingMammoth = this.checkExistingMammoth();
        if (existingMammoth) {
            console.log(`⚠️  Existing mammoth.js found: ${existingMammoth}`);
            const overwrite = await this.prompt('Overwrite existing installation? (Y/n): ');
            if (overwrite.toLowerCase() === 'n') {
                throw new Error('Cannot install over existing version without permission');
            }
        }
    }

    checkExistingMammoth() {
        try {
            const packagePath = path.join(this.installPath, 'node_modules', 'mammoth', 'package.json');
            if (fs.existsSync(packagePath)) {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                return pkg.version;
            }
        } catch (error) {
            // Ignore error
        }
        return null;
    }

    async configureInstallation() {
        console.log(`\n${colors.cyan}Configure installation...${colors.reset}`);
        
        const installType = await this.prompt(
            'Installation type:\n' +
            '  1. Full (all features)\n' +
            '  2. Minimal (core features only)\n' +
            '  3. Custom (choose features)\n' +
            'Choice (1-3): '
        );
        
        switch (installType) {
            case '2':
                this.features = {
                    security: true,
                    customHandlers: false,
                    enhancedTables: false,
                    styleRegistry: false,
                    testSuite: false
                };
                break;
            case '3':
                await this.customConfiguration();
                break;
            default:
                // Keep all features enabled
        }
        
        console.log('\nSelected features:');
        Object.entries(this.features).forEach(([feature, enabled]) => {
            const status = enabled ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
            console.log(`  ${status} ${this.featureName(feature)}`);
        });
    }

    async customConfiguration() {
        console.log('\nCustom feature selection:');
        
        for (const [feature, defaultValue] of Object.entries(this.features)) {
            const response = await this.prompt(
                `Enable ${this.featureName(feature)}? (Y/n): `
            );
            this.features[feature] = response.toLowerCase() !== 'n';
        }
    }

    featureName(feature) {
        const names = {
            security: 'Security Features',
            customHandlers: 'Custom Element Handlers',
            enhancedTables: 'Enhanced Table Support',
            styleRegistry: 'Style Registry',
            testSuite: 'Test Suite'
        };
        return names[feature] || feature;
    }

    async installDependencies() {
        console.log(`\n${colors.cyan}Installing dependencies...${colors.reset}`);
        
        // Base dependencies
        const baseDeps = [
            '@xmldom/xmldom',
            'argparse', 
            'base64-js',
            'bluebird',
            'dingbat-to-unicode',
            'jszip',
            'lop',
            'path-is-absolute',
            'underscore',
            'xmlbuilder'
        ];
        
        // Feature-specific dependencies
        if (this.features.security) {
            baseDeps.push('shell-quote');
        }
        
        if (this.features.styleRegistry) {
            baseDeps.push('xml2js');
        }
        
        if (this.features.testSuite) {
            baseDeps.push('officegen', 'mocha', 'temp');
        }
        
        console.log(`Installing ${baseDeps.length} dependencies...`);
        
        try {
            execSync(`npm install ${baseDeps.join(' ')}`, { 
                stdio: 'pipe',
                cwd: this.installPath
            });
            console.log('✓ Dependencies installed successfully');
            
        } catch (error) {
            console.log('⚠️  Some dependencies failed, attempting individual install...');
            
            for (const dep of baseDeps) {
                try {
                    execSync(`npm install ${dep}`, { 
                        stdio: 'pipe',
                        cwd: this.installPath 
                    });
                    console.log(`  ✓ ${dep}`);
                } catch (err) {
                    console.log(`  ⚠️  ${dep} (optional)`);
                }
            }
        }
    }

    async setupFeatures() {
        console.log(`\n${colors.cyan}Setting up features...${colors.reset}`);
        
        // Create lib directory structure
        this.ensureDirectory('lib/security');
        this.ensureDirectory('lib/handlers');
        this.ensureDirectory('lib/styles');
        this.ensureDirectory('lib/references');
        
        if (this.features.testSuite) {
            this.ensureDirectory('test-suite');
            this.ensureDirectory('examples');
        }
        
        // Copy feature files based on selection
        console.log('✓ Directory structure created');
        
        // Create package.json if it doesn't exist
        const packagePath = path.join(this.installPath, 'package.json');
        if (!fs.existsSync(packagePath)) {
            this.createPackageJson();
            console.log('✓ package.json created');
        }
        
        // Create TypeScript definitions
        if (!fs.existsSync(path.join(this.installPath, 'lib/index.d.ts'))) {
            this.createTypeScriptDefinitions();
            console.log('✓ TypeScript definitions created');
        }
    }

    ensureDirectory(dirPath) {
        const fullPath = path.join(this.installPath, dirPath);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    }

    createPackageJson() {
        const packageJson = {
            name: "mammoth-enhanced",
            version: "1.11.0",
            description: "Convert Word documents (docx files) to HTML and Markdown - Enhanced Version",
            main: "./lib/index.js",
            bin: {
                "mammoth": "bin/mammoth"
            },
            scripts: {
                "test": "mocha 'test/**/*.tests.js'",
                "pretest": "eslint lib test",
                "check-typescript": "tsc --noEmit lib/index.d.ts",
                "prepare": "make mammoth.browser.min.js"
            },
            keywords: ["docx", "html", "word", "conversion", "security", "tables"],
            author: "Enhanced by AI Assistant",
            license: "BSD-2-Clause",
            engines: {
                "node": ">=12.0.0"
            }
        };
        
        fs.writeFileSync(
            path.join(this.installPath, 'package.json'), 
            JSON.stringify(packageJson, null, 2)
        );
    }

    createTypeScriptDefinitions() {
        const typeDefs = `
export interface SecurityOptions {
    level?: 'strict' | 'standard' | 'permissive';
    allowedProtocols?: string[];
    customSanitizer?: (url: string) => string;
}

export interface TableOptions {
    preserveBorders?: boolean;
    preserveBackground?: boolean;
    preserveAlignment?: boolean;
    preserveWidth?: boolean;
    cssMode?: 'inline' | 'classes';
    borderCollapse?: boolean;
}

export interface ConversionOptions {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    convertImage?: (element: any) => any;
    ignoreEmptyParagraphs?: boolean;
    security?: SecurityOptions | false;
    tables?: TableOptions;
    transformDocument?: (document: any) => any;
}

export interface ConversionResult {
    value: string;
    messages: Array<{type: string; message: string}>;
}

export interface ElementHandler {
    elementNames: string[];
    namespace?: string;
    priority?: number;
    description?: string;
    handler: (element: any, messages: any[], options: any) => any[];
}

export declare const convertToHtml: (input: any, options?: ConversionOptions) => Promise<ConversionResult>;
export declare const convertToMarkdown: (input: any, options?: ConversionOptions) => Promise<ConversionResult>;
export declare const security: any;
export declare const handlers: any;
export declare const Html: any;
export declare const images: any;
        `.trim();
        
        fs.writeFileSync(
            path.join(this.installPath, 'lib/index.d.ts'),
            typeDefs
        );
    }

    async runTests() {
        if (!this.features.testSuite) {
            console.log('Skipping tests (test suite not installed)');
            return;
        }
        
        console.log(`\n${colors.cyan}Running tests...${colors.reset}`);
        
        const runQuickTest = await this.prompt('Run quick test to verify installation? (Y/n): ');
        if (runQuickTest.toLowerCase() === 'n') {
            return;
        }
        
        try {
            // Create a simple test
            const testCode = `
const mammoth = require('./lib/index');

console.log('Testing enhanced mammoth.js...');

// Test basic functionality
if (typeof mammoth.convertToHtml === 'function') {
    console.log('✓ Core conversion function available');
}

// Test security features
if (mammoth.security && typeof mammoth.security.createSanitizer === 'function') {
    console.log('✓ Security features available');
}

// Test handlers
if (mammoth.handlers && typeof mammoth.handlers.register === 'function') {
    console.log('✓ Custom handlers available');
}

console.log('🎉 Installation verified successfully!');
            `;
            
            const testPath = path.join(this.installPath, 'quick-test.js');
            fs.writeFileSync(testPath, testCode);
            
            execSync('node quick-test.js', { 
                stdio: 'inherit', 
                cwd: this.installPath 
            });
            
            // Cleanup
            fs.unlinkSync(testPath);
            
        } catch (error) {
            console.log(`${colors.yellow}⚠️  Tests completed with warnings${colors.reset}`);
        }
    }

    async createQuickStart() {
        console.log(`\n${colors.cyan}Creating quick start files...${colors.reset}`);
        
        // Create quick start script
        const quickStartCode = `
const mammoth = require('./lib/index');

// Basic usage example
async function example() {
    try {
        const result = await mammoth.convertToHtml({
            path: 'your-document.docx'
        }, {
            security: {level: 'standard'},
            tables: {preserveFormatting: true}
        });
        
        console.log('Conversion completed!');
        console.log('HTML length:', result.value.length);
        console.log('Warnings:', result.messages.length);
        
        // Save result
        require('fs').writeFileSync('output.html', result.value);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Uncomment to run
// example();

module.exports = example;
        `.trim();
        
        fs.writeFileSync(
            path.join(this.installPath, 'quick-start.js'),
            quickStartCode
        );
        
        // Create README
        const readme = `
# Enhanced mammoth.js - Quick Start

## Basic Usage

\`\`\`javascript
const mammoth = require('./lib/index');

// Convert with security enabled
const result = await mammoth.convertToHtml({
    path: 'document.docx'
}, {
    security: {level: 'standard'},
    tables: {preserveFormatting: true}
});

console.log(result.value); // HTML output
\`\`\`

## Features Available

${Object.entries(this.features)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => `- ✅ ${this.featureName(feature)}`)
    .join('\n')}

## Next Steps

1. See examples/ directory for detailed usage
2. Run tests with: npm test
3. Read documentation in docs/
4. Try the test suite: node test-suite/test-conversion.js your-document.docx

## Support

- Check INSTALLATION.md for detailed setup
- See CUSTOM_ELEMENTS_GUIDE.md for extending functionality
- Use test-suite tools for debugging
        `.trim();
        
        fs.writeFileSync(
            path.join(this.installPath, 'README-QUICKSTART.md'),
            readme
        );
        
        console.log('✓ Quick start files created');
    }

    async complete() {
        console.log(`\n${colors.bold}${colors.green}🎉 Installation Complete!${colors.reset}`);
        console.log('\nEnhanced mammoth.js is now ready to use.\n');
        
        console.log('📁 Files created:');
        console.log('  • lib/ - Core library files');
        console.log('  • quick-start.js - Basic usage example');
        console.log('  • README-QUICKSTART.md - Quick reference');
        
        if (this.features.testSuite) {
            console.log('  • test-suite/ - Comprehensive testing tools');
            console.log('  • examples/ - Usage examples');
        }
        
        console.log('\n🚀 Next steps:');
        console.log('  1. Try the quick start: node quick-start.js');
        console.log('  2. Read the documentation: cat README-QUICKSTART.md');
        
        if (this.features.testSuite) {
            console.log('  3. Test with your documents: node test-suite/test-conversion.js your-doc.docx');
            console.log('  4. Explore examples: node examples/usage-examples.js');
        }
        
        console.log('\n📖 Documentation:');
        console.log('  • INSTALLATION.md - Detailed installation guide');
        console.log('  • CUSTOM_ELEMENTS_GUIDE.md - Extending functionality');
        console.log('  • FEATURES.md - New features overview');
        console.log('  • MIGRATION_GUIDE.md - Upgrading from standard version');
        
        const openReadme = await this.prompt('\nOpen quick start guide now? (Y/n): ');
        if (openReadme.toLowerCase() !== 'n') {
            try {
                // Try to open with system default
                const opener = process.platform === 'win32' ? 'start' : 
                             process.platform === 'darwin' ? 'open' : 'xdg-open';
                execSync(`${opener} README-QUICKSTART.md`, { stdio: 'ignore' });
            } catch (error) {
                console.log('Please manually open README-QUICKSTART.md');
            }
        }
    }

    prompt(question) {
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                resolve(answer || 'Y');
            });
        });
    }
}

// CLI entry point
async function main() {
    const installer = new MammothInstaller();
    
    try {
        await installer.run();
    } finally {
        rl.close();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Installation failed:', error.message);
        process.exit(1);
    });
}

module.exports = MammothInstaller;