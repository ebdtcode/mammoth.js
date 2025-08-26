#!/usr/bin/env node

/**
 * Web Interface for Mammoth Publication Converter
 * 
 * Elegant web-based UI for document conversion
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { PublicationConverter } = require('./publication-converter');
const chalk = require('chalk');

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        await fs.ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.docx') {
            cb(null, true);
        } else {
            cb(new Error('Only DOCX files are allowed'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Middleware
app.use(express.static(path.join(__dirname, '../web')));
app.use(express.json());

// Store conversion jobs
const conversionJobs = new Map();

// Home page
app.get('/', (req, res) => {
    res.send(getHomePage());
});

// Single file conversion
app.post('/api/convert', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const jobId = Date.now().toString();
    const options = JSON.parse(req.body.options || '{}');
    
    // Store job status
    conversionJobs.set(jobId, { status: 'processing', progress: 0 });
    
    try {
        const converter = new PublicationConverter(options);
        const outputPath = req.file.path.replace('.docx', '.html');
        
        const result = await converter.convertDocument(req.file.path, outputPath);
        
        // Read the generated HTML
        const html = await fs.readFile(outputPath, 'utf8');
        
        // Clean up uploaded file
        await fs.remove(req.file.path);
        await fs.remove(outputPath);
        
        conversionJobs.set(jobId, {
            status: 'completed',
            progress: 100,
            result: {
                html: html,
                statistics: result.statistics
            }
        });
        
        res.json({
            jobId: jobId,
            status: 'completed',
            statistics: result.statistics
        });
        
    } catch (error) {
        conversionJobs.set(jobId, {
            status: 'error',
            error: error.message
        });
        
        res.status(500).json({
            jobId: jobId,
            status: 'error',
            error: error.message
        });
    }
});

// Batch conversion
app.post('/api/convert-batch', upload.array('documents', 20), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const jobId = Date.now().toString();
    const options = JSON.parse(req.body.options || '{}');
    
    conversionJobs.set(jobId, {
        status: 'processing',
        progress: 0,
        total: req.files.length
    });
    
    try {
        const converter = new PublicationConverter(options);
        const results = [];
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const outputPath = file.path.replace('.docx', '.html');
            
            const result = await converter.convertDocument(file.path, outputPath);
            const html = await fs.readFile(outputPath, 'utf8');
            
            results.push({
                filename: file.originalname,
                html: html,
                statistics: result.statistics
            });
            
            // Update progress
            conversionJobs.set(jobId, {
                status: 'processing',
                progress: ((i + 1) / req.files.length) * 100,
                total: req.files.length,
                processed: i + 1
            });
            
            // Clean up
            await fs.remove(file.path);
            await fs.remove(outputPath);
        }
        
        conversionJobs.set(jobId, {
            status: 'completed',
            progress: 100,
            results: results
        });
        
        res.json({
            jobId: jobId,
            status: 'completed',
            count: results.length,
            statistics: converter.statistics
        });
        
    } catch (error) {
        conversionJobs.set(jobId, {
            status: 'error',
            error: error.message
        });
        
        res.status(500).json({
            jobId: jobId,
            status: 'error',
            error: error.message
        });
    }
});

// Get job status
app.get('/api/job/:jobId', (req, res) => {
    const job = conversionJobs.get(req.params.jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
});

// Download result
app.get('/api/download/:jobId', (req, res) => {
    const job = conversionJobs.get(req.params.jobId);
    
    if (!job || job.status !== 'completed') {
        return res.status(404).json({ error: 'Result not available' });
    }
    
    if (job.result) {
        // Single file result
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', 'attachment; filename="converted.html"');
        res.send(job.result.html);
    } else if (job.results) {
        // Multiple files - create a ZIP
        // This would require additional implementation
        res.json({ message: 'Batch download not yet implemented' });
    }
});

// Get home page HTML
function getHomePage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mammoth Publication Converter</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .content {
            padding: 40px;
        }
        
        .upload-area {
            border: 3px dashed #e0e0e0;
            border-radius: 15px;
            padding: 60px 40px;
            text-align: center;
            transition: all 0.3s;
            cursor: pointer;
            background: #fafafa;
        }
        
        .upload-area:hover {
            border-color: #667eea;
            background: #f5f7ff;
        }
        
        .upload-area.dragover {
            border-color: #764ba2;
            background: #f0f3ff;
            transform: scale(1.02);
        }
        
        .upload-icon {
            font-size: 4em;
            color: #667eea;
            margin-bottom: 20px;
        }
        
        .upload-text {
            font-size: 1.3em;
            color: #555;
            margin-bottom: 10px;
        }
        
        .upload-hint {
            color: #999;
            font-size: 0.9em;
        }
        
        input[type="file"] {
            display: none;
        }
        
        .file-list {
            margin-top: 30px;
        }
        
        .file-item {
            background: #f5f5f5;
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .file-name {
            font-weight: 500;
            color: #333;
        }
        
        .file-size {
            color: #999;
            font-size: 0.9em;
        }
        
        .remove-file {
            background: #ff4757;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .options {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        
        .option-group {
            margin-bottom: 20px;
        }
        
        .option-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
            display: block;
        }
        
        .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .checkbox-item input {
            width: 18px;
            height: 18px;
        }
        
        .convert-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.1em;
            font-weight: 600;
            border-radius: 10px;
            cursor: pointer;
            width: 100%;
            margin-top: 30px;
            transition: transform 0.2s;
        }
        
        .convert-button:hover {
            transform: translateY(-2px);
        }
        
        .convert-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .progress-bar {
            margin-top: 30px;
            display: none;
        }
        
        .progress-bar.active {
            display: block;
        }
        
        .progress-track {
            background: #e0e0e0;
            height: 10px;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress-fill {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100%;
            width: 0%;
            transition: width 0.3s;
        }
        
        .progress-text {
            text-align: center;
            margin-top: 10px;
            color: #666;
        }
        
        .results {
            margin-top: 30px;
            display: none;
        }
        
        .results.active {
            display: block;
        }
        
        .result-card {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
        }
        
        .result-title {
            font-weight: 600;
            color: #2e7d32;
            margin-bottom: 10px;
        }
        
        .result-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .stat-value {
            font-weight: 600;
            color: #333;
        }
        
        .download-button {
            background: #4caf50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 600;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .feature-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .feature-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .feature-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        
        .feature-desc {
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦣 Mammoth Publication Converter</h1>
            <p>Convert DOCX documents with advanced features</p>
        </div>
        
        <div class="content">
            <div class="upload-area" id="uploadArea">
                <input type="file" id="fileInput" accept=".docx" multiple>
                <div class="upload-icon">📄</div>
                <div class="upload-text">Drag & drop your DOCX files here</div>
                <div class="upload-hint">or click to browse</div>
            </div>
            
            <div class="file-list" id="fileList"></div>
            
            <div class="options">
                <div class="option-group">
                    <label class="option-label">Features to Enable:</label>
                    <div class="checkbox-group">
                        <div class="checkbox-item">
                            <input type="checkbox" id="deepLists" checked>
                            <label for="deepLists">Deep Nested Lists</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="semanticSections" checked>
                            <label for="semanticSections">Semantic Sections</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="multiLineFigures" checked>
                            <label for="multiLineFigures">Multi-line Figures</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="tableOfContents" checked>
                            <label for="tableOfContents">Table of Contents</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <button class="convert-button" id="convertButton" disabled>
                Convert Documents
            </button>
            
            <div class="progress-bar" id="progressBar">
                <div class="progress-track">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">Processing...</div>
            </div>
            
            <div class="results" id="results"></div>
            
            <div class="features">
                <div class="feature-card">
                    <div class="feature-icon">📝</div>
                    <div class="feature-title">Deep Lists</div>
                    <div class="feature-desc">10+ levels of nesting</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📑</div>
                    <div class="feature-title">Semantic Sections</div>
                    <div class="feature-desc">NOTE, REFERENCE, etc.</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🖼️</div>
                    <div class="feature-title">Smart Figures</div>
                    <div class="feature-desc">Multi-line detection</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">♿</div>
                    <div class="feature-title">Accessible</div>
                    <div class="feature-desc">WCAG 2.1 compliant</div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let selectedFiles = [];
        
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');
        const convertButton = document.getElementById('convertButton');
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const results = document.getElementById('results');
        
        // Upload area click
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
        
        function handleFiles(files) {
            selectedFiles = Array.from(files).filter(file => 
                file.name.toLowerCase().endsWith('.docx')
            );
            
            updateFileList();
            convertButton.disabled = selectedFiles.length === 0;
        }
        
        function updateFileList() {
            fileList.innerHTML = selectedFiles.map((file, index) => \`
                <div class="file-item">
                    <div>
                        <div class="file-name">\${file.name}</div>
                        <div class="file-size">\${formatFileSize(file.size)}</div>
                    </div>
                    <button class="remove-file" onclick="removeFile(\${index})">Remove</button>
                </div>
            \`).join('');
        }
        
        function removeFile(index) {
            selectedFiles.splice(index, 1);
            updateFileList();
            convertButton.disabled = selectedFiles.length === 0;
        }
        
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        convertButton.addEventListener('click', async () => {
            if (selectedFiles.length === 0) return;
            
            const formData = new FormData();
            
            // Add files
            if (selectedFiles.length === 1) {
                formData.append('document', selectedFiles[0]);
            } else {
                selectedFiles.forEach(file => {
                    formData.append('documents', file);
                });
            }
            
            // Add options
            const options = {
                features: {
                    deepNestedLists: document.getElementById('deepLists').checked,
                    semanticSections: document.getElementById('semanticSections').checked,
                    multiLineFigures: document.getElementById('multiLineFigures').checked,
                    tableOfContents: document.getElementById('tableOfContents').checked
                }
            };
            
            formData.append('options', JSON.stringify(options));
            
            // Show progress
            progressBar.classList.add('active');
            results.classList.remove('active');
            convertButton.disabled = true;
            
            try {
                const endpoint = selectedFiles.length === 1 ? '/api/convert' : '/api/convert-batch';
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Get full results
                    const jobResponse = await fetch(\`/api/job/\${data.jobId}\`);
                    const jobData = await jobResponse.json();
                    
                    displayResults(jobData);
                } else {
                    alert('Conversion failed: ' + data.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                progressBar.classList.remove('active');
                convertButton.disabled = false;
            }
        });
        
        function displayResults(jobData) {
            results.classList.add('active');
            
            if (jobData.result) {
                // Single file result
                results.innerHTML = \`
                    <div class="result-card">
                        <div class="result-title">✅ Conversion Complete</div>
                        <div class="result-stats">
                            <div class="stat-item">
                                📑 <span class="stat-value">\${jobData.result.statistics.sections || 0}</span> sections
                            </div>
                            <div class="stat-item">
                                📝 <span class="stat-value">\${jobData.result.statistics.lists || 0}</span> lists
                            </div>
                            <div class="stat-item">
                                🖼️ <span class="stat-value">\${jobData.result.statistics.figures || 0}</span> figures
                            </div>
                        </div>
                        <button class="download-button" onclick="downloadResult('\${jobData.jobId}')">
                            Download HTML
                        </button>
                    </div>
                \`;
            } else if (jobData.results) {
                // Multiple files result
                results.innerHTML = jobData.results.map(result => \`
                    <div class="result-card">
                        <div class="result-title">✅ \${result.filename}</div>
                        <div class="result-stats">
                            <div class="stat-item">
                                📑 <span class="stat-value">\${result.statistics.sections || 0}</span> sections
                            </div>
                            <div class="stat-item">
                                📝 <span class="stat-value">\${result.statistics.lists || 0}</span> lists
                            </div>
                            <div class="stat-item">
                                🖼️ <span class="stat-value">\${result.statistics.figures || 0}</span> figures
                            </div>
                        </div>
                    </div>
                \`).join('');
            }
        }
        
        async function downloadResult(jobId) {
            window.location.href = \`/api/download/\${jobId}\`;
        }
    </script>
</body>
</html>`;
}

// Start server
app.listen(port, () => {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🦣  MAMMOTH WEB CONVERTER                                ║
║                                                               ║
║     Web interface running at:                                ║
║     ${chalk.bold.green(`http://localhost:${port}`)}                                   ║
║                                                               ║
║     Press Ctrl+C to stop                                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `));
});

module.exports = app;