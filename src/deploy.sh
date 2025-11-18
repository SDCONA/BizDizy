#!/bin/bash

# BizDizy Deployment Script for DigitalOcean Droplet
# This script automates the deployment process on a VPS

set -e  # Exit on any error

echo "🚀 Starting BizDizy deployment..."

# Configuration
APP_DIR="/var/www/bizdizy"
BACKUP_DIR="/var/www/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup current deployment
if [ -d "$APP_DIR/dist" ]; then
    echo "📦 Creating backup..."
    tar -czf "$BACKUP_DIR/bizdizy_backup_$TIMESTAMP.tar.gz" -C "$APP_DIR" dist
    echo -e "${GREEN}✓ Backup created: bizdizy_backup_$TIMESTAMP.tar.gz${NC}"
    
    # Keep only last 5 backups
    cd "$BACKUP_DIR"
    ls -t bizdizy_backup_*.tar.gz | tail -n +6 | xargs -r rm
fi

# Navigate to app directory
cd "$APP_DIR"

# Stash any local changes (if any)
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Stashing local changes..."
    git stash
fi

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Git pull failed. Deployment aborted.${NC}"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ npm install failed. Deployment aborted.${NC}"
    exit 1
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed. Deployment aborted.${NC}"
    
    # Restore from backup
    if [ -f "$BACKUP_DIR/bizdizy_backup_$TIMESTAMP.tar.gz" ]; then
        echo "🔄 Restoring from backup..."
        tar -xzf "$BACKUP_DIR/bizdizy_backup_$TIMESTAMP.tar.gz" -C "$APP_DIR"
        echo -e "${YELLOW}✓ Restored from backup${NC}"
    fi
    
    exit 1
fi

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR/dist"

# Reload nginx
echo "🔄 Reloading nginx..."
nginx -t && systemctl reload nginx

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Nginx reload failed${NC}"
    exit 1
fi

# Clear old node_modules to save space (optional)
# Uncomment if disk space is a concern
# echo "🧹 Cleaning up..."
# rm -rf node_modules

echo ""
echo -e "${GREEN}✓✓✓ Deployment completed successfully! ✓✓✓${NC}"
echo ""
echo "Deployment details:"
echo "  Time: $(date)"
echo "  Backup: $BACKUP_DIR/bizdizy_backup_$TIMESTAMP.tar.gz"
echo ""
echo "Next steps:"
echo "  • Verify: Visit your domain to check the deployment"
echo "  • Monitor: tail -f /var/log/nginx/bizdizy-access.log"
echo ""

# Optional: Send deployment notification
# Uncomment and configure if you want Slack/Discord notifications
# curl -X POST -H 'Content-type: application/json' \
#   --data '{"text":"BizDizy deployed successfully!"}' \
#   YOUR_WEBHOOK_URL

exit 0
