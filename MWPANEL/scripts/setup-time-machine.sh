#!/bin/bash

# Setup Time Machine automatic backups with cron for MW Panel
echo "Configurando Time Machine backups automáticos para MW Panel..."

# Install cronie (cron daemon for Alpine)
echo "Instalando cron daemon..."
apk add --no-cache cronie 2>/dev/null || echo "cronie ya instalado o no disponible"

# Create directories for Time Machine backups
echo "Creando directorios de backups..."
mkdir -p /app/time-machine-backups/{hourly,daily,weekly,monthly,logs}
mkdir -p /app/scripts

# Create backup script that handles rotation
echo "Creando script de backup automático..."
cat > /app/scripts/time-machine-backup.sh << 'EOF'
#!/bin/bash

BACKUP_TYPE="$1"
BACKUP_BASE_DIR="/app/time-machine-backups"
RETENTION=7

# Function to create backup
create_backup() {
    local type="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="${BACKUP_BASE_DIR}/${type}/${timestamp}"
    
    echo "[$(date)] Creating Time Machine ${type} backup: ${timestamp}"
    
    # Create backup directory
    mkdir -p "${backup_dir}"
    
    # Backup PostgreSQL database
    echo "[$(date)] Backing up PostgreSQL database..."
    if docker exec mw-panel-db-prod pg_isready -U mwpanel >/dev/null 2>&1; then
        docker exec mw-panel-db-prod pg_dump -U mwpanel mwpanel > "${backup_dir}/database.sql"
        gzip "${backup_dir}/database.sql"
        echo "[$(date)] Database backup completed"
    else
        echo "[$(date)] Database not available, creating placeholder"
        touch "${backup_dir}/database.sql.gz"
    fi
    
    # Backup MW Panel source files
    echo "[$(date)] Backing up MW Panel source files..."
    cd /opt/mw-panel || cd /app
    tar -czf "${backup_dir}/source-files.tar.gz" \
        --exclude=node_modules \
        --exclude=time-machine-backups \
        --exclude=dist \
        --exclude=.git \
        --exclude=*.log \
        --exclude=cambridge-mocks-data \
        backend frontend package.json docker-compose.yml nginx/ 2>/dev/null || true
    
    echo "[$(date)] Source files backup completed"
    
    # Calculate size
    local size=$(du -sm "${backup_dir}" 2>/dev/null | cut -f1 || echo "0")
    echo "[$(date)] Time Machine backup ${timestamp} completed: ${size}MB"
    
    # Cleanup old backups (keep only RETENTION newest)
    cleanup_old_backups "${type}"
}

# Function to cleanup old backups
cleanup_old_backups() {
    local type="$1"
    local type_dir="${BACKUP_BASE_DIR}/${type}"
    
    if [ -d "${type_dir}" ]; then
        # Count current backups
        local count=$(ls -1 "${type_dir}" 2>/dev/null | wc -l)
        
        if [ ${count} -gt ${RETENTION} ]; then
            echo "[$(date)] Cleaning up old Time Machine ${type} backups (keeping ${RETENTION})"
            
            # Get oldest backups to delete
            local to_delete=$((count - RETENTION))
            ls -1t "${type_dir}" 2>/dev/null | tail -n ${to_delete} | while read backup_name; do
                local backup_path="${type_dir}/${backup_name}"
                echo "[$(date)] Removing old Time Machine backup: ${backup_name}"
                rm -rf "${backup_path}" 2>/dev/null || true
            done
        fi
    fi
}

# Main execution
if [ -z "$1" ]; then
    echo "Usage: $0 <hourly|daily|weekly|monthly>"
    exit 1
fi

create_backup "$1"
EOF

chmod +x /app/scripts/time-machine-backup.sh

# Setup cron jobs for Time Machine
echo "Configurando trabajos cron de Time Machine..."
cat > /tmp/time-machine-crontab << 'EOF'
# Time Machine Backup System - MW Panel
# Run every hour at minute 0
0 * * * * /app/scripts/time-machine-backup.sh hourly >> /app/time-machine-backups/logs/cron.log 2>&1

# Run daily at 2:00 AM
0 2 * * * /app/scripts/time-machine-backup.sh daily >> /app/time-machine-backups/logs/cron.log 2>&1

# Run weekly on Sundays at 3:00 AM  
0 3 * * 0 /app/scripts/time-machine-backup.sh weekly >> /app/time-machine-backups/logs/cron.log 2>&1

# Run monthly on 1st day at 4:00 AM
0 4 1 * * /app/scripts/time-machine-backup.sh monthly >> /app/time-machine-backups/logs/cron.log 2>&1
EOF

# Install crontab
crontab /tmp/time-machine-crontab

# Start cron daemon in background
echo "Iniciando daemon cron..."
crond -f -d 8 &

echo "Time Machine setup completado. Trabajos cron configurados:"
crontab -l

echo "Probando backup manual..."
/app/scripts/time-machine-backup.sh hourly

echo "Time Machine sistema iniciado correctamente."
echo "Logs disponibles en: /app/time-machine-backups/logs/cron.log"