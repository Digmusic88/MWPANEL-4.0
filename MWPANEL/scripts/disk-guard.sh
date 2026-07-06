#!/bin/bash
# =============================================================================
# Disk Guard - MW Panel
# Poda de emergencia cuando el disco supera un umbral, para que NO se llene
# entre las limpiezas diarias (auto-cleanup-backups.sh a las 3 AM).
#
# Motivo: varias reconstrucciones de imágenes grandes durante el día dejan
# imágenes huérfanas (sin tag) y build cache que pueden llenar el disco en horas.
# Este guard solo actúa por encima del umbral y SOLO poda cosas SEGURAS:
#   - imágenes huérfanas (dangling, sin tag → no las usa ningún contenedor)
#   - build cache de Docker
# NUNCA detiene contenedores ni toca imágenes con tag en uso (Cambridge Mocks incluido).
#
# Pensado para cron cada 30 min.
# =============================================================================

set -e

THRESHOLD=80          # % de uso de disco a partir del cual se poda
LOG="/var/log/mw-panel-disk-guard.log"

usage_pct() { df --output=pcent / | tail -1 | tr -dc '0-9'; }
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; }

USAGE=$(usage_pct)
if [ "${USAGE:-0}" -lt "$THRESHOLD" ]; then
    exit 0   # disco bajo el umbral: no hacer nada (silencioso, no ensucia el log)
fi

log "Disco al ${USAGE}% (umbral ${THRESHOLD}%) → podando imágenes huérfanas + build cache"
DANGLING=$(docker image prune -f 2>/dev/null | tail -1 || echo "0B")
log "  Imágenes huérfanas: $DANGLING"
CACHE=$(docker builder prune -af 2>/dev/null | tail -1 || echo "0B")
log "  Build cache: $CACHE"
AFTER=$(usage_pct)
log "  Disco tras poda: ${AFTER}%"

# Si tras la poda segura sigue alto, avisar en el log (no se borra nada más por seguridad).
if [ "${AFTER:-0}" -ge "$THRESHOLD" ]; then
    log "  ⚠️ Sigue al ${AFTER}% tras poda segura. Revisar manualmente (backups/imágenes con tag antiguas)."
fi
