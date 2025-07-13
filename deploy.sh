#\!/bin/bash

# OpenSubtitles Uploader - Deploy Script
# Syncs from GitHub, builds, and starts the preview server
# Usage: ./deploy.sh [--force-install]

set -e  # Exit on any error

FORCE_INSTALL=false
if [[ "$1" == "--force-install" ]]; then
  FORCE_INSTALL=true
fi

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Checking dependencies..."
if [ "$FORCE_INSTALL" = true ] || [ ! -f "node_modules/.install-state" ] || [ "package.json" -nt "node_modules/.install-state" ] || [ "package-lock.json" -nt "node_modules/.install-state" ]; then
  echo "📦 Installing/updating dependencies..."
  npm install
  touch node_modules/.install-state
else
  echo "📦 Dependencies are up to date, skipping install"
fi

echo "🏗️  Building production version..."
npm run build

echo "🚀 Starting preview server..."
echo "Server will be available at http://localhost:4173"
echo "Press Ctrl+C to stop the server"

npm run preview -- --host 0.0.0.0 --port 4173