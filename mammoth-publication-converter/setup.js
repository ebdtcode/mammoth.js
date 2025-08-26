#!/usr/bin/env node

/**
 * Setup Script for Mammoth Publication Converter
 * 
 * Automated setup and sample generation
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🦣  MAMMOTH PUBLICATION CONVERTER SETUP                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

async function setup() {
    const spinner = ora('Initializing setup...').start();
    
    try {
        // Create directory structure
        spinner.text = 'Creating directory structure...';
        await createDirectories();
        
        // Generate sample configuration
        spinner.text = 'Generating configuration files...';
        await generateConfigurations();
        
        // Create sample content
        spinner.text = 'Creating sample content...';
        await createSampleContent();
        
        // Install dependencies if needed
        spinner.text = 'Checking dependencies...';
        await checkDependencies();
        
        spinner.succeed('Setup completed successfully!');
        
        // Display next steps
        console.log('\n' + chalk.bold.green('✅ Setup Complete!'));
        console.log('\n' + chalk.bold('📋 Next Steps:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log('1. Test single file conversion:');
        console.log(chalk.cyan('   npm start convert-file samples/sample-aviation-manual.html'));
        console.log('\n2. Test batch conversion:');
        console.log(chalk.cyan('   npm run demo'));
        console.log('\n3. Start web interface:');
        console.log(chalk.cyan('   npm run web'));
        console.log('\n4. View documentation:');
        console.log(chalk.cyan('   cat README.md'));
        
    } catch (error) {
        spinner.fail('Setup failed');
        console.error(chalk.red('\n❌ Error:'), error.message);
        process.exit(1);
    }
}

async function createDirectories() {
    const dirs = [
        'samples',
        'output',
        'config',
        'web',
        'uploads',
        'temp'
    ];
    
    for (const dir of dirs) {
        await fs.ensureDir(path.join(__dirname, dir));
    }
}

async function generateConfigurations() {
    // Default configuration
    const defaultConfig = {
        conversion: {
            styleMap: [
                "p[style-name='Title'] => h1.document-title:fresh",
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Heading 4'] => h4:fresh",
                "p[style-name='heading 8'] => h6.heading-8",
                "p[style-name='List Paragraph'] => li.list-paragraph"
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
            semanticSectionTypes: ['note', 'reference', 'example', 'warning', 'caution', 'phraseology']
        }
    };
    
    await fs.writeJson(
        path.join(__dirname, 'config', 'default.config.json'),
        defaultConfig,
        { spaces: 2 }
    );
    
    // Aviation-specific configuration
    const aviationConfig = {
        ...defaultConfig,
        advanced: {
            ...defaultConfig.advanced,
            semanticSectionTypes: [
                'note', 'reference', 'example', 'warning', 'caution',
                'phraseology', 'exception', 'important'
            ]
        }
    };
    
    await fs.writeJson(
        path.join(__dirname, 'config', 'aviation.config.json'),
        aviationConfig,
        { spaces: 2 }
    );
}

async function createSampleContent() {
    // Sample Aviation Manual HTML (simulating DOCX content)
    const aviationSample = `<!DOCTYPE html>
<html>
<head>
    <title>Sample Aviation Operations Manual</title>
</head>
<body>
    <h1>Aviation Operations Manual</h1>
    
    <h2>Chapter 1: Pre-flight Procedures</h2>
    
    <p>1. Aircraft Inspection Requirements</p>
    
    <p>NOTE— All pre-flight inspections must be completed in accordance with manufacturer specifications and regulatory requirements.</p>
    
    <p style="margin-left: 20px">a. External Inspection</p>
    <p style="margin-left: 40px">(i) Fuselage condition</p>
    <p style="margin-left: 40px">(ii) Control surfaces</p>
    <p style="margin-left: 60px">(1) Ailerons</p>
    <p style="margin-left: 60px">(2) Elevators</p>
    <p style="margin-left: 60px">(3) Rudder</p>
    <p style="margin-left: 40px">(iii) Landing gear</p>
    
    <p style="margin-left: 20px">b. Internal Inspection</p>
    <p style="margin-left: 40px">(i) Cockpit instruments</p>
    <p style="margin-left: 40px">(ii) Avionics systems</p>
    <p style="margin-left: 40px">(iii) Emergency equipment</p>
    
    <p>REFERENCE— See Aircraft Maintenance Manual Chapter 5 for detailed inspection procedures.</p>
    <p style="margin-left: 20px">1. AMM Section 5.1 - Daily Inspections</p>
    <p style="margin-left: 20px">2. AMM Section 5.2 - Pre-flight Checks</p>
    <p style="margin-left: 20px">3. AMM Section 5.3 - Post-flight Procedures</p>
    
    <p>2. Weather Briefing Requirements</p>
    
    <p>EXAMPLE: Standard weather briefing should include:</p>
    <p style="margin-left: 20px">a. Current conditions at departure and destination</p>
    <p style="margin-left: 20px">b. Enroute weather</p>
    <p style="margin-left: 40px">(i) Winds aloft</p>
    <p style="margin-left: 40px">(ii) Turbulence forecasts</p>
    <p style="margin-left: 40px">(iii) Icing conditions</p>
    <p style="margin-left: 20px">c. Terminal area forecasts</p>
    
    <p>WARNING— Never attempt flight operations when weather conditions are below personal or aircraft minimums.</p>
    
    <p>FIG 1-1</p>
    <p>Pre-flight Inspection Checklist</p>
    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y4ZjlmYSIgc3Ryb2tlPSIjZGVlMmU2Ii8+CiAgPHRleHQgeD0iMjAwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyI+CiAgICBDaGVja2xpc3QgRGlhZ3JhbQogIDwvdGV4dD4KPC9zdmc+" alt="Checklist">
    
    <h2>Chapter 2: Communication Procedures</h2>
    
    <p>PHRASEOLOGY— Standard radio communications:</p>
    <p style="margin-left: 20px">1. Initial contact</p>
    <p style="margin-left: 40px">a. "Tower, [callsign] with information [ATIS]"</p>
    <p style="margin-left: 40px">b. "[Callsign], Tower, runway [number], cleared to land"</p>
    <p style="margin-left: 20px">2. Ground operations</p>
    <p style="margin-left: 40px">a. "Ground, [callsign] request taxi"</p>
    <p style="margin-left: 40px">b. "[Callsign], taxi via [route] to runway [number]"</p>
    
    <p>CAUTION— Always verify clearance instructions by reading back critical elements.</p>
    
    <p>IMPORTANT— Maintain situational awareness at all times during ground operations.</p>
</body>
</html>`;
    
    await fs.writeFile(
        path.join(__dirname, 'samples', 'sample-aviation-manual.html'),
        aviationSample
    );
    
    // Technical Documentation Sample
    const technicalSample = `<!DOCTYPE html>
<html>
<head>
    <title>Technical API Documentation</title>
</head>
<body>
    <h1>API Documentation</h1>
    
    <h2>1. Authentication</h2>
    
    <p>NOTE: All API requests require authentication using Bearer tokens.</p>
    
    <p>1.1 Token Generation</p>
    <p style="margin-left: 20px">a. Request authentication token</p>
    <p style="margin-left: 40px">(i) Send credentials to /auth/token</p>
    <p style="margin-left: 40px">(ii) Receive JWT token</p>
    <p style="margin-left: 40px">(iii) Token expires after 24 hours</p>
    
    <p>REFERENCE: See Security Documentation for detailed authentication flows.</p>
    
    <p>EXAMPLE: Authentication request:</p>
    <p style="margin-left: 20px">POST /api/auth/token</p>
    <p style="margin-left: 20px">Headers:</p>
    <p style="margin-left: 40px">Content-Type: application/json</p>
    <p style="margin-left: 20px">Body:</p>
    <p style="margin-left: 40px">{</p>
    <p style="margin-left: 60px">"username": "user@example.com",</p>
    <p style="margin-left: 60px">"password": "secure_password"</p>
    <p style="margin-left: 40px">}</p>
    
    <p>WARNING: Never expose API tokens in client-side code or public repositories.</p>
</body>
</html>`;
    
    await fs.writeFile(
        path.join(__dirname, 'samples', 'sample-technical-doc.html'),
        technicalSample
    );
    
    // Create a .gitignore for output
    const gitignore = `# Output files
output/
uploads/
temp/
*.log
.DS_Store
node_modules/
`;
    
    await fs.writeFile(
        path.join(__dirname, '.gitignore'),
        gitignore
    );
}

async function checkDependencies() {
    const packageJson = await fs.readJson(path.join(__dirname, 'package.json'));
    const requiredDeps = Object.keys(packageJson.dependencies || {});
    
    // Check if node_modules exists
    const nodeModulesExists = await fs.pathExists(path.join(__dirname, 'node_modules'));
    
    if (!nodeModulesExists || requiredDeps.length === 0) {
        console.log(chalk.yellow('\n⚠️  Dependencies not installed'));
        console.log(chalk.gray('Run: npm install'));
    }
}

// Run setup
setup().catch(error => {
    console.error(chalk.red('Setup failed:'), error);
    process.exit(1);
});