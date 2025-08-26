#!/bin/bash

# Mammoth Publication Converter - Quick Start Script
# This script sets up and runs the converter with sample documents

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🦣  MAMMOTH PUBLICATION CONVERTER - QUICK START          ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 14+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Running setup..."
npm run setup

echo ""
echo "🎯 Quick Start Options:"
echo "─────────────────────────────────────────"
echo ""
echo "1) Convert a single sample document"
echo "2) Convert all samples (batch mode)"
echo "3) Start web interface"
echo "4) Start watch mode"
echo "5) View help"
echo ""
read -p "Select an option (1-5): " choice

case $choice in
    1)
        echo ""
        echo "📄 Converting single sample document..."
        npm start convert-file samples/sample-aviation-manual.html output/sample-aviation-manual-converted.html
        echo ""
        echo "✅ Conversion complete!"
        echo "📁 Output: output/sample-aviation-manual-converted.html"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open output/sample-aviation-manual-converted.html
        fi
        ;;
    
    2)
        echo ""
        echo "📚 Converting all sample documents..."
        npm run demo
        echo ""
        echo "✅ All documents converted!"
        echo "📁 Output directory: output/"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open output/index.html
        fi
        ;;
    
    3)
        echo ""
        echo "🌐 Starting web interface..."
        echo "   Open http://localhost:3000 in your browser"
        echo "   Press Ctrl+C to stop"
        echo ""
        npm run web
        ;;
    
    4)
        echo ""
        echo "👁️  Starting watch mode..."
        echo "   Monitoring samples/ directory for changes"
        echo "   Press Ctrl+C to stop"
        echo ""
        npm start watch samples output
        ;;
    
    5)
        echo ""
        npm start -- --help
        ;;
    
    *)
        echo "Invalid option. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "─────────────────────────────────────────"
echo "📖 For more information, see README.md"
echo "💡 Tip: Run 'npm start -- --help' for all CLI options"
echo ""