#!/bin/bash

# MW Panel Database Backup Script

set -e

# Configuration
BACKUP_DIR="/opt/mw-panel/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mwpanel_backup_$DATE.sql"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

print_info "Starting backup process..."

# Get database connection details from .env
if [ -f .env ]; then
    source .env
else
    print_error ".env file not found"
    exit 1
fi

# Create database backup
print_info "Creating database backup..."
docker-compose exec -T postgres pg_dump \
    -U "${DB_USER:-mwpanel}" \
    -d "${DB_NAME:-mwpanel}" \
    --clean --if-exists --create \
    > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    print_success "Database backup created: $BACKUP_FILE"
else
    print_error "Database backup failed"
    exit 1
fi

# Compress backup
print_info "Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
print_success "Backup compressed: $BACKUP_FILE ($BACKUP_SIZE)"

# Remove old backups
print_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "mwpanel_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "mwpanel_backup_*.sql.gz" | wc -l)
print_success "Backup completed. Total backups retained: $BACKUP_COUNT"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# print_info "Uploading to cloud storage..."
# aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" s3://your-backup-bucket/mw-panel/
# print_success "Backup uploaded to cloud storage"

print_success "Backup process completed successfully"