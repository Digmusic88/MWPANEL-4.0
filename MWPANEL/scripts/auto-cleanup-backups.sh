#!/bin/bash
# =============================================================================
# Auto Cleanup Script - MW Panel
# Limpieza automática de backups antiguos y caché de Docker
# Ejecutar diariamente via cron
# =============================================================================

set -e

LOG_FILE="/var/log/mw-panel-cleanup.log"
BACKUP_DIR="/opt/mw-panel/backups"
# local-backups lo genera el backend (LocalBackupService) con copias completas de ~3.8GB.
# Sin rotación llenaba el disco; se poda con la misma retención que el resto.
LOCAL_BACKUP_DIR="/opt/mw-panel/local-backups"
RETENTION_DAYS=2  # Mantener backups de los últimos 2 días

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== Iniciando limpieza automática =========="

# 1. Limpiar backups antiguos (más de 2 días)
log "Limpiando backups con más de ${RETENTION_DAYS} días..."
DELETED_BACKUPS=0

if [ -d "$BACKUP_DIR" ]; then
    while IFS= read -r -d '' file; do
        log "  Eliminando: $(basename "$file")"
        rm -f "$file"
        DELETED_BACKUPS=$((DELETED_BACKUPS + 1))
    done < <(find "$BACKUP_DIR" -type f \( -name "*.sql" -o -name "*.sql.gz" -o -name "*.tar.gz" \) -mtime +${RETENTION_DAYS} -print0 2>/dev/null)

    log "  Backups eliminados: $DELETED_BACKUPS"
else
    log "  Directorio de backups no existe: $BACKUP_DIR"
fi

# 1b. Limpiar local-backups antiguos (copias completas grandes del backend)
if [ -d "$LOCAL_BACKUP_DIR" ]; then
    DELETED_LOCAL=0
    while IFS= read -r -d '' file; do
        log "  Eliminando local-backup: $(basename "$file")"
        rm -f "$file"
        DELETED_LOCAL=$((DELETED_LOCAL + 1))
    done < <(find "$LOCAL_BACKUP_DIR" -type f \( -name "*.sql" -o -name "*.sql.gz" -o -name "*.tar.gz" \) -mtime +${RETENTION_DAYS} -print0 2>/dev/null)
    log "  Local-backups eliminados: $DELETED_LOCAL"
fi

# 2. Limpiar Docker build cache
log "Limpiando Docker build cache..."
DOCKER_CLEANED=$(docker builder prune -af 2>/dev/null | tail -1 || echo "0B")
log "  Docker build cache liberado: $DOCKER_CLEANED"

# 2b. Limpiar imágenes Docker HUÉRFANAS (sin tag) SIN filtro de edad.
# Cada rebuild de una imagen grande (backend ~5.5GB) deja la anterior como dangling;
# el filtro until=48h NO las pilla si son recientes → se acumulaban y llenaban el disco.
# Las dangling son seguras de borrar (no las usa ningún contenedor, no sirven para rollback).
log "Limpiando imágenes Docker huérfanas (sin tag)..."
DANGLING_CLEANED=$(docker image prune -f 2>/dev/null | tail -1 || echo "0B")
log "  Imágenes huérfanas liberadas: $DANGLING_CLEANED"

# 3. Limpiar imágenes Docker no usadas y con tag (más de 48h; deja margen de rollback)
log "Limpiando imágenes Docker antiguas..."
IMAGES_CLEANED=$(docker image prune -a -f --filter "until=48h" 2>/dev/null | tail -1 || echo "0B")
log "  Imágenes Docker liberadas: $IMAGES_CLEANED"

# 4. Limpiar logs del sistema (journalctl)
log "Limpiando logs del sistema (mantener 500MB)..."
journalctl --vacuum-size=500M 2>/dev/null || true

# 5. Limpiar logs antiguos de mw-panel
log "Limpiando logs antiguos de mw-panel..."
find /var/log -name "mw-panel*.log" -size +50M -exec truncate -s 10M {} \; 2>/dev/null || true
find /opt/mw-panel -name "*.log" -size +50M -exec truncate -s 10M {} \; 2>/dev/null || true
find /opt/cambridge-mocks-prod/logs -name "*.log" -size +20M -exec truncate -s 5M {} \; 2>/dev/null || true

# 6. Limpiar Time Machine Backups (usando script especializado)
log "Limpiando Time Machine Backups con política de retención..."
if [ -f "/opt/mw-panel/scripts/cleanup-time-machine-backups.sh" ]; then
    /opt/mw-panel/scripts/cleanup-time-machine-backups.sh >> "$LOG_FILE" 2>&1
    log "  Time Machine Backups limpiados según política (24h/7d/4w/3m)"
else
    log "  Script de limpieza Time Machine no encontrado, saltando..."
fi

# 7. Mostrar espacio en disco actual
DISK_USAGE=$(df -h /opt | tail -1 | awk '{print $5 " usado (" $4 " disponible)"}')
log "Espacio en disco: $DISK_USAGE"

log "========== Limpieza completada =========="
