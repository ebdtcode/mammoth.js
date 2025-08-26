#!/usr/bin/env node

/**
 * CLI Tool for Mammoth Publication Converter
 * 
 * User-friendly command-line interface for batch document processing
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const { PublicationConverter } = require('./publication-converter');

const program = new Command();

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🦣  MAMMOTH PUBLICATION CONVERTER                        ║
║     Enterprise Document Processing Suite                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;

/**
 * Convert single document command
 */
program
    .command('convert-file <input> [output]')
    .description('Convert a single DOCX document to HTML')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--no-toc', 'Disable table of contents generation')
    .option('--no-semantic', 'Disable semantic section processing')
    .option('--no-figures', 'Disable multi-line figure processing')
    .action(async (input, output, options) => {
        console.log(chalk.cyan(banner));
        
        const spinner = ora('Initializing converter...').start();
        
        try {
            // Load configuration
            let config = {};
            if (options.config) {
                config = await fs.readJson(options.config);
                spinner.text = 'Configuration loaded';
            }
            
            // Apply command-line options
            if (options.toc === false) {
                config.features = { ...config.features, tableOfContents: false };
            }
            if (options.semantic === false) {
                config.features = { ...config.features, semanticSections: false };
            }
            if (options.figures === false) {
                config.features = { ...config.features, multiLineFigures: false };
            }
            
            // Initialize converter
            const converter = new PublicationConverter(config);
            
            // Determine output path
            if (!output) {
                output = input.replace(/\.docx$/i, '.html');
            }
            
            spinner.text = 'Converting document...';
            
            // Convert document
            const result = await converter.convertDocument(input, output);
            
            spinner.succeed('Document converted successfully!');
            
            // Display statistics
            console.log('\n' + chalk.bold('📊 Conversion Statistics:'));
            console.log(chalk.gray('─'.repeat(40)));
            console.log(`  📑 Sections processed: ${chalk.green(result.statistics.sections || 0)}`);
            console.log(`  📝 Lists processed: ${chalk.green(result.statistics.lists || 0)}`);
            console.log(`  🖼️  Figures processed: ${chalk.green(result.statistics.figures || 0)}`);
            console.log('\n' + chalk.blue(`✨ Output saved to: ${output}`));
            
        } catch (error) {
            spinner.fail('Conversion failed');
            console.error(chalk.red('\n❌ Error:'), error.message);
            process.exit(1);
        }
    });

/**
 * Convert publication (multiple documents) command
 */
program
    .command('convert [input] [output]')
    .description('Convert an entire publication (folder of DOCX files)')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-p, --pattern <pattern>', 'File pattern (default: **/*.docx)')
    .option('--combine', 'Combine all chapters into single document')
    .option('--no-index', 'Skip index generation')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input = '.', output = './output', options) => {
        console.log(chalk.cyan(banner));
        
        const spinner = ora('Initializing publication converter...').start();
        
        try {
            // Load configuration
            let config = {};
            if (options.config) {
                config = await fs.readJson(options.config);
                spinner.text = 'Configuration loaded';
            }
            
            // Apply command-line options
            if (options.combine) {
                config.output = { ...config.output, combineChapters: true };
            }
            if (options.index === false) {
                config.output = { ...config.output, generateIndex: false };
            }
            
            // Initialize converter
            const converter = new PublicationConverter(config);
            
            // Find documents
            spinner.text = 'Scanning for documents...';
            const pattern = options.pattern || '**/*.docx';
            const docxFiles = glob.sync(path.join(input, pattern), {
                ignore: ['**/~$*.docx']
            });
            
            if (docxFiles.length === 0) {
                spinner.fail('No DOCX files found');
                console.error(chalk.red(`\n❌ No files matching pattern: ${pattern}`));
                process.exit(1);
            }
            
            spinner.succeed(`Found ${docxFiles.length} document(s)`);
            
            if (options.verbose) {
                console.log('\n' + chalk.bold('📚 Documents to process:'));
                docxFiles.forEach(file => {
                    console.log(`  • ${path.basename(file)}`);
                });
            }
            
            // Convert publication
            console.log('\n' + chalk.bold('🚀 Starting conversion...'));
            const result = await converter.convertPublication(input, output);
            
            // Display final statistics
            console.log('\n' + chalk.bold.green('✅ Conversion Complete!'));
            console.log('\n' + chalk.bold('📊 Final Statistics:'));
            console.log(chalk.gray('─'.repeat(40)));
            console.log(`  📄 Documents processed: ${chalk.green(result.statistics.filesProcessed)}`);
            console.log(`  📑 Total sections: ${chalk.green(result.statistics.totalSections)}`);
            console.log(`  📝 Total lists: ${chalk.green(result.statistics.totalLists)}`);
            console.log(`  🖼️  Total figures: ${chalk.green(result.statistics.totalFigures)}`);
            
            if (result.statistics.warnings.length > 0) {
                console.log(`  ⚠️  Warnings: ${chalk.yellow(result.statistics.warnings.length)}`);
                if (options.verbose) {
                    result.statistics.warnings.forEach(warning => {
                        console.log(chalk.yellow(`     - ${warning}`));
                    });
                }
            }
            
            if (result.statistics.errors.length > 0) {
                console.log(`  ❌ Errors: ${chalk.red(result.statistics.errors.length)}`);
                result.statistics.errors.forEach(error => {
                    console.log(chalk.red(`     - ${error.file}: ${error.error}`));
                });
            }
            
            console.log('\n' + chalk.blue(`📁 Output directory: ${path.resolve(output)}`));
            
            if (config.output.generateIndex) {
                console.log(chalk.blue(`📋 Index page: ${path.join(output, 'index.html')}`));
            }
            
            if (config.output.combineChapters) {
                console.log(chalk.blue(`📖 Combined document: ${path.join(output, 'combined.html')}`));
            }
            
        } catch (error) {
            spinner.fail('Publication conversion failed');
            console.error(chalk.red('\n❌ Error:'), error.message);
            if (options.verbose) {
                console.error(error.stack);
            }
            process.exit(1);
        }
    });

/**
 * Watch mode for automatic conversion
 */
program
    .command('watch <input> <output>')
    .description('Watch directory for changes and auto-convert')
    .option('-c, --config <path>', 'Path to configuration file')
    .action(async (input, output, options) => {
        console.log(chalk.cyan(banner));
        console.log(chalk.yellow('👁️  Watch mode activated\n'));
        
        const chokidar = require('chokidar');
        
        // Load configuration
        let config = {};
        if (options.config) {
            config = await fs.readJson(options.config);
        }
        
        const converter = new PublicationConverter(config);
        
        // Watch for changes
        const watcher = chokidar.watch(path.join(input, '**/*.docx'), {
            ignored: '**/~$*.docx',
            persistent: true
        });
        
        watcher
            .on('add', async filePath => {
                console.log(chalk.green(`➕ New file detected: ${path.basename(filePath)}`));
                await processFile(filePath);
            })
            .on('change', async filePath => {
                console.log(chalk.blue(`📝 File changed: ${path.basename(filePath)}`));
                await processFile(filePath);
            })
            .on('unlink', filePath => {
                console.log(chalk.red(`➖ File deleted: ${path.basename(filePath)}`));
            });
        
        console.log(chalk.gray(`Watching for changes in: ${input}`));
        console.log(chalk.gray('Press Ctrl+C to stop\n'));
        
        async function processFile(filePath) {
            const relativePath = path.relative(input, filePath);
            const outputPath = path.join(output, relativePath.replace(/\.docx$/i, '.html'));
            
            try {
                await converter.convertDocument(filePath, outputPath);
                console.log(chalk.green(`  ✅ Converted to: ${outputPath}\n`));
            } catch (error) {
                console.error(chalk.red(`  ❌ Failed: ${error.message}\n`));
            }
        }
    });

/**
 * Generate configuration file
 */
program
    .command('init')
    .description('Generate a configuration file template')
    .option('-o, --output <path>', 'Output path (default: ./converter.config.json)')
    .action(async (options) => {
        const configPath = options.output || './converter.config.json';
        
        const defaultConfig = {
            conversion: {
                styleMap: [
                    "p[style-name='Title'] => h1.document-title:fresh",
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh"
                ],
                includeDefaultStyleMap: true,
                ignoreEmptyParagraphs: false
            },
            features: {
                deepNestedLists: true,
                semanticSections: true,
                multiLineFigures: true,
                tableOfContents: true,
                accessibility: true
            },
            output: {
                format: 'html',
                generateIndex: true,
                combineChapters: false
            },
            advanced: {
                maxNestingDepth: 10,
                semanticSectionTypes: ['note', 'reference', 'example', 'warning', 'caution']
            }
        };
        
        await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
        
        console.log(chalk.green(`✅ Configuration file created: ${configPath}`));
        console.log(chalk.gray('\nYou can now use this file with the --config option'));
    });

/**
 * List supported features
 */
program
    .command('features')
    .description('List all supported conversion features')
    .action(() => {
        console.log(chalk.cyan(banner));
        console.log(chalk.bold('✨ Supported Features:\n'));
        
        const features = [
            {
                name: 'Deep Nested Lists',
                icon: '📝',
                description: 'Support for 10+ levels of list nesting with proper numbering'
            },
            {
                name: 'Semantic Sections',
                icon: '📑',
                description: 'NOTE, REFERENCE, EXAMPLE sections with embedded lists'
            },
            {
                name: 'Multi-line Figures',
                icon: '🖼️',
                description: 'Detect and structure figures with separate number/title lines'
            },
            {
                name: 'Table of Contents',
                icon: '📚',
                description: 'Automatic TOC generation with navigation links'
            },
            {
                name: 'Document Chunking',
                icon: '✂️',
                description: 'Split large documents into manageable chunks'
            },
            {
                name: 'Accessibility',
                icon: '♿',
                description: 'WCAG 2.1 Level AA compliant output'
            },
            {
                name: 'Batch Processing',
                icon: '📦',
                description: 'Convert entire publications with multiple documents'
            },
            {
                name: 'Index Generation',
                icon: '📋',
                description: 'Create index pages for multi-document publications'
            }
        ];
        
        features.forEach(feature => {
            console.log(`${feature.icon}  ${chalk.bold(feature.name)}`);
            console.log(`   ${chalk.gray(feature.description)}\n`);
        });
    });

// Main program configuration
program
    .name('mammoth-convert')
    .description('Enterprise-grade document publication converter')
    .version('1.0.0')
    .helpOption('-h, --help', 'Display help information')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  $ mammoth-convert convert-file document.docx
  $ mammoth-convert convert ./documents ./output
  $ mammoth-convert convert ./book --combine
  $ mammoth-convert watch ./source ./dist
  $ mammoth-convert init

${chalk.bold('For more information:')}
  https://github.com/your-repo/mammoth-publication-converter
`);

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
    program.outputHelp();
}