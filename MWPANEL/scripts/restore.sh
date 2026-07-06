#!/bin/bash

# MW Panel Database Restore Script

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
BACKUP_DIR="/opt/mw-panel/backups"

# Check if backup file is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <backup_file>"
    print_info "Available backups:"
    ls -la "$BACKUP_DIR"/mwpanel_backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

# Warning
print_warning "This will COMPLETELY REPLACE the current database!"
print_warning "All current data will be LOST!"
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Restore cancelled"
    exit 0
fi

# Get database connection details from .env
if [ -f .env ]; then
    source .env
else
    print_error ".env file not found"
    exit 1
fi

print_info "Starting restore process..."

# Stop the application
print_info "Stopping application containers..."
docker-compose stop backend frontend

# Create temporary file for decompressed backup
TEMP_FILE="/tmp/restore_$(date +%s).sql"

# Decompress backup if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    print_info "Decompressing backup file..."
    gunzip -c "$BACKUP_DIR/$BACKUP_FILE" > "$TEMP_FILE"
else
    cp "$BACKUP_DIR/$BACKUP_FILE" "$TEMP_FILE"
fi

# Restore database
print_info "Restoring database..."
docker-compose exec -T postgres psql \
    -U "${DB_USER:-mwpanel}" \
    -d postgres \
    < "$TEMP_FILE"

if [ $? -eq 0 ]; then
    print_success "Database restored successfully"
else
    print_error "Database restore failed"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Clean up temporary file
rm -f "$TEMP_FILE"

# Restart application
print_info "Restarting application containers..."
docker-compose start backend frontend

# Wait for services to be ready
print_info "Waiting for services to restart..."
sleep 10

print_success "Restore process completed successfully"
print_info "Please verify that the application is working correctly"