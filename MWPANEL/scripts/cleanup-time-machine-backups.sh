#!/bin/bash
# =============================================================================
# Time Machine Backup Cleanup Script - MW Panel
# Limpieza automática de backups time-machine con política de retención
#
# IMPORTANTE: Estas políticas DEBEN coincidir con las del backend
# (time-machine-backup.service.ts) para evitar conflictos
# =============================================================================

set -e

LOG_FILE="/var/log/mw-panel-time-machine-cleanup.log"
BACKUP_BASE="/opt/mw-panel/time-machine-backups"

# =============================================================================
# POLÍTICA DE RETENCIÓN SINCRONIZADA CON BACKEND (Actualizado Enero 2026)
# =============================================================================
# Hourly: Solo DB (~5MB cada uno)           → 24 últimos = ~120MB
# Daily:  Solo DB (~5MB cada uno)           → 4 últimos  = ~20MB
# Weekly: DB + Uploads + Config (~2.5GB)    → 4 últimos  = ~10GB
# Monthly: Todo completo (~5GB cada uno)    → 3 últimos  = ~15GB
# =============================================================================
# TOTAL ESTIMADO: ~25GB (reducido de ~43GB)
# =============================================================================
# NOTA: Los uploads SOLO se guardan en weekly/monthly para ahorrar espacio

HOURLY_KEEP=24     # Mantener últimos 24 backups horarios (24 horas)
DAILY_KEEP=4       # Mantener últimos 4 backups diarios (solo DB, ligero)
WEEKLY_KEEP=4      # Mantener últimas 4 semanas (incluye uploads)
MONTHLY_KEEP=3     # Mantener últimos 3 meses (backup completo)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup_directory() {
    local dir=$1
    local keep_count=$2
    local type=$3

    if [ ! -d "$dir" ]; then
        log "  📁 Directorio no existe: $dir (se creará automáticamente)"
        return
    fi

    # Contar solo directorios (los backups son directorios)
    local total=$(find "$dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)

    if [ "$total" -eq 0 ]; then
        log "  📁 $type: Sin backups"
        return
    fi

    log "  📊 $type: Total=$total, Mantener=$keep_count"

    # Si hay más backups de los que debemos mantener, eliminar los más antiguos
    if [ "$total" -gt "$keep_count" ]; then
        local to_delete=$((total - keep_count))
        log "  🗑️  Eliminando $to_delete backups $type antiguos..."

        # Listar directorios ordenados por nombre (timestamp) - más antiguos primero
        # y eliminar los primeros N
        find "$dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | \
            sort | head -n "$to_delete" | while read -r backup_dir; do
            local full_path="$dir/$backup_dir"
            local size=$(du -sh "$full_path" 2>/dev/null | cut -f1)
            log "      🗑️ Eliminando: $backup_dir ($size)"
            rm -rf "$full_path"
        done

        log "  ✅ Eliminados $to_delete backups $type"
    else
        log "  ✅ $type dentro del límite (no se requiere limpieza)"
    fi
}

log "========== Iniciando limpieza Time Machine Backups =========="
log "📁 Base directory: $BACKUP_BASE"
log ""
log "📋 Política de retención (sincronizada con backend):"
log "   - Hourly: últimos $HOURLY_KEEP backups (solo DB ~10MB c/u)"
log "   - Daily:  últimos $DAILY_KEEP backups (DB + Uploads ~2.5GB c/u)"
log "   - Weekly: últimas $WEEKLY_KEEP semanas (DB + Uploads + Config)"
log "   - Monthly: últimos $MONTHLY_KEEP meses (backup completo ~5GB c/u)"
log ""

# Limpiar cada tipo de backup
cleanup_directory "$BACKUP_BASE/hourly" "$HOURLY_KEEP" "Hourly"
log ""
cleanup_directory "$BACKUP_BASE/daily" "$DAILY_KEEP" "Daily"
log ""
cleanup_directory "$BACKUP_BASE/weekly" "$WEEKLY_KEEP" "Weekly"
log ""
cleanup_directory "$BACKUP_BASE/monthly" "$MONTHLY_KEEP" "Monthly"

# Mostrar resumen final
log ""
log "========== Resumen Final =========="
total_size=0
for type in hourly daily weekly monthly; do
    dir="$BACKUP_BASE/$type"
    if [ -d "$dir" ]; then
        count=$(find "$dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
        size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')
        size_mb=$(du -sm "$dir" 2>/dev/null | awk '{print $1}')
        total_size=$((total_size + size_mb))
        log "  ${type^}: $count backups ($size)"
    else
        log "  ${type^}: 0 backups (directorio no existe)"
    fi
done

# Espacio total usado por Time Machine
total_human=$(echo "scale=2; $total_size/1024" | bc 2>/dev/null || echo "$total_size MB")
if [ "$total_size" -gt 1024 ]; then
    total_human="${total_human}GB"
else
    total_human="${total_size}MB"
fi
log "  📦 Total Time Machine: ~${total_size}MB"

# Espacio en disco
DISK_USAGE=$(df -h /opt 2>/dev/null | tail -1 | awk '{print $5 " usado (" $4 " disponible)"}')
log "  💾 Espacio en disco: $DISK_USAGE"

log "========== Limpieza completada =========="
