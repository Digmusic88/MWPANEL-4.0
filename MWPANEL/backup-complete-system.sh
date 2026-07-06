#!/bin/bash

# MW Panel - Complete System Backup Script
# Includes: Database, Application Files, Uploads, Configurations, SSL, TypeQuest
# Author: Claude Code
# Date: $(date +%Y-%m-%d)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/opt/mw-panel/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mw-panel-complete-backup-${TIMESTAMP}"
TEMP_BACKUP_DIR="${BACKUP_DIR}/${BACKUP_NAME}"
FINAL_ARCHIVE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ $1${NC}"
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Create backup directory structure
log "Creating backup directory structure..."
mkdir -p "${TEMP_BACKUP_DIR}"
mkdir -p "${TEMP_BACKUP_DIR}/database"
mkdir -p "${TEMP_BACKUP_DIR}/application"
mkdir -p "${TEMP_BACKUP_DIR}/uploads"
mkdir -p "${TEMP_BACKUP_DIR}/configuration"
mkdir -p "${TEMP_BACKUP_DIR}/ssl"
mkdir -p "${TEMP_BACKUP_DIR}/typequest"
mkdir -p "${TEMP_BACKUP_DIR}/scripts"

log "Starting complete MW Panel system backup..."

# 1. Database Backup
log "Backing up PostgreSQL database..."
if docker-compose -f /opt/mw-panel/docker-compose.yml exec -T postgres pg_dump -U mwpanel -d mwpanel > "${TEMP_BACKUP_DIR}/database/mwpanel_${TIMESTAMP}.sql"; then
    log_success "Database backup completed"
    gzip "${TEMP_BACKUP_DIR}/database/mwpanel_${TIMESTAMP}.sql"
    log_success "Database backup compressed"
else
    log_error "Database backup failed"
    exit 1
fi

# 2. Application Files Backup
log "Backing up application source code..."
# Backend
if [ -d "/opt/mw-panel/backend" ]; then
    cp -r /opt/mw-panel/backend "${TEMP_BACKUP_DIR}/application/"
    # Remove node_modules and dist to save space
    rm -rf "${TEMP_BACKUP_DIR}/application/backend/node_modules"
    rm -rf "${TEMP_BACKUP_DIR}/application/backend/dist"
    log_success "Backend source code backed up"
fi

# Frontend
if [ -d "/opt/mw-panel/frontend" ]; then
    cp -r /opt/mw-panel/frontend "${TEMP_BACKUP_DIR}/application/"
    # Remove node_modules and dist to save space
    rm -rf "${TEMP_BACKUP_DIR}/application/frontend/node_modules"
    rm -rf "${TEMP_BACKUP_DIR}/application/frontend/dist"
    log_success "Frontend source code backed up"
fi

# 3. TypeQuest Backup
log "Backing up TypeQuest system..."
if [ -d "/opt/typequest" ]; then
    cp -r /opt/typequest "${TEMP_BACKUP_DIR}/"
    rm -rf "${TEMP_BACKUP_DIR}/typequest/frontend/node_modules"
    rm -rf "${TEMP_BACKUP_DIR}/typequest/frontend/dist"
    log_success "TypeQuest source code backed up"
fi

if [ -d "/opt/mw-panel/typequest-dist" ]; then
    cp -r /opt/mw-panel/typequest-dist "${TEMP_BACKUP_DIR}/typequest/"
    log_success "TypeQuest distribution files backed up"
fi

# 4. Uploads and User Files
log "Backing up user uploads and files..."
if [ -d "/opt/mw-panel/backend/uploads" ]; then
    cp -r /opt/mw-panel/backend/uploads "${TEMP_BACKUP_DIR}/"
    log_success "User uploads backed up"
fi

# 5. Configuration Files
log "Backing up configuration files..."
# Docker configurations
cp /opt/mw-panel/docker-compose.yml "${TEMP_BACKUP_DIR}/configuration/" 2>/dev/null || true
cp /opt/mw-panel/docker-compose.prod.yml "${TEMP_BACKUP_DIR}/configuration/" 2>/dev/null || true
cp /opt/mw-panel/docker-compose.dev.yml "${TEMP_BACKUP_DIR}/configuration/" 2>/dev/null || true

# Nginx configurations
if [ -d "/opt/mw-panel/nginx" ]; then
    cp -r /opt/mw-panel/nginx "${TEMP_BACKUP_DIR}/configuration/"
    log_success "Nginx configuration backed up"
fi

# Environment files
cp /opt/mw-panel/.env "${TEMP_BACKUP_DIR}/configuration/" 2>/dev/null || true
cp /opt/mw-panel/backend/.env "${TEMP_BACKUP_DIR}/configuration/backend.env" 2>/dev/null || true

# Package.json files
cp /opt/mw-panel/backend/package.json "${TEMP_BACKUP_DIR}/configuration/backend-package.json" 2>/dev/null || true
cp /opt/mw-panel/frontend/package.json "${TEMP_BACKUP_DIR}/configuration/frontend-package.json" 2>/dev/null || true

log_success "Configuration files backed up"

# 6. SSL Certificates
log "Backing up SSL certificates..."
if [ -d "/opt/mw-panel/ssl" ]; then
    cp -r /opt/mw-panel/ssl "${TEMP_BACKUP_DIR}/"
    log_success "SSL certificates backed up"
fi

if [ -d "/opt/mw-panel/nginx/ssl" ]; then
    cp -r /opt/mw-panel/nginx/ssl "${TEMP_BACKUP_DIR}/ssl/nginx-ssl"
    log_success "Nginx SSL certificates backed up"
fi

# 7. Important Scripts
log "Backing up important scripts..."
cp /opt/mw-panel/*.sh "${TEMP_BACKUP_DIR}/scripts/" 2>/dev/null || true
cp /opt/mw-panel/scripts/* "${TEMP_BACKUP_DIR}/scripts/" 2>/dev/null || true

# 8. System Documentation
log "Backing up system documentation..."
cp /opt/mw-panel/CLAUDE.md "${TEMP_BACKUP_DIR}/" 2>/dev/null || true
cp /opt/mw-panel/README.md "${TEMP_BACKUP_DIR}/" 2>/dev/null || true
cp /opt/mw-panel/*.md "${TEMP_BACKUP_DIR}/" 2>/dev/null || true

# 9. Create backup manifest
log "Creating backup manifest..."
cat > "${TEMP_BACKUP_DIR}/BACKUP_MANIFEST.txt" << EOF
MW Panel Complete System Backup
Generated: $(date)
Backup ID: ${BACKUP_NAME}
System: $(uname -a)

Contents:
- Database: PostgreSQL dump (compressed)
- Application: Backend + Frontend source code
- TypeQuest: Complete TypeQuest system
- Uploads: All user uploaded files
- Configuration: Docker, Nginx, Environment files
- SSL: All certificates and keys
- Scripts: Management and deployment scripts
- Documentation: System documentation

Restoration Notes:
1. Restore database: gunzip database/*.sql.gz && restore to PostgreSQL
2. Copy application files to /opt/mw-panel/
3. Copy configuration files and update paths if needed
4. Restore SSL certificates
5. Run docker-compose up -d
6. Verify all services are running

Total backup size: $(du -sh ${TEMP_BACKUP_DIR} | cut -f1)
EOF

log_success "Backup manifest created"

# 10. Create final compressed archive
log "Creating final compressed archive..."
cd "${BACKUP_DIR}"
if tar -czf "${FINAL_ARCHIVE}" "${BACKUP_NAME}/"; then
    log_success "Backup archive created: ${FINAL_ARCHIVE}"
    # Remove temporary directory
    rm -rf "${TEMP_BACKUP_DIR}"
    log_success "Temporary files cleaned up"
else
    log_error "Failed to create backup archive"
    exit 1
fi

# 11. Display backup information
BACKUP_SIZE=$(du -sh "${FINAL_ARCHIVE}" | cut -f1)
log_success "Complete system backup finished!"
echo
echo "============================================="
echo "       MW PANEL COMPLETE BACKUP REPORT"
echo "============================================="
echo "Backup File: ${FINAL_ARCHIVE}"
echo "Backup Size: ${BACKUP_SIZE}"
echo "Timestamp: $(date)"
echo "============================================="
echo
echo "To restore this backup:"
echo "1. Extract: tar -xzf ${FINAL_ARCHIVE}"
echo "2. Follow instructions in BACKUP_MANIFEST.txt"
echo
log_success "Backup process completed successfully!"