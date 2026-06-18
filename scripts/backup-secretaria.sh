#!/bin/bash
# =====================================================================
# Backup de la plataforma Secretaría (secretaria.mundoworld.school)
#   - DATOS: volcado del esquema 'secretaria' de PostgreSQL (incluye los
#     campos cifrados bytea tal cual; la BD se comparte con MW Panel, que
#     tiene su propio backup completo aparte).
#   - CÓDIGO/CONFIG: backend (incl. .env y migraciones) + frontend src.
#     Se excluye lo regenerable (node_modules, dist, frontend-dist, .git).
#
# Uso: backup-secretaria.sh [daily|weekly|monthly|manual]
# Retención por tier (nº de copias máximas a conservar).
# =====================================================================
set -uo pipefail

TIER="${1:-daily}"
case "$TIER" in
  daily)   KEEP=14 ;;
  weekly)  KEEP=8  ;;
  monthly) KEEP=12 ;;
  manual)  KEEP=10 ;;
  *) echo "Tier no válido: '$TIER' (usa daily|weekly|monthly|manual)"; exit 1 ;;
esac

ROOT=/opt/mw-secretaria
DEST="$ROOT/backups/$TIER"
TS=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER=mw-panel-db-prod
DB_FILE="$DEST/secretaria_db_${TS}.sql.gz"
CODE_FILE="$DEST/secretaria_code_${TS}.tar.gz"
mkdir -p "$DEST"

# --- 1) Datos: esquema 'secretaria' ---
if ! docker exec "$DB_CONTAINER" pg_dump -U mwpanel -d mwpanel --schema=secretaria --no-owner 2>/dev/null | gzip > "$DB_FILE"; then
  echo "[$(date '+%F %T')] ERROR [$TIER]: pg_dump del esquema secretaria falló" >&2
  rm -f "$DB_FILE"
  exit 1
fi
# Verifica integridad del gzip y que no esté vacío
if [ ! -s "$DB_FILE" ] || ! gzip -t "$DB_FILE" 2>/dev/null; then
  echo "[$(date '+%F %T')] ERROR [$TIER]: dump vacío o corrupto" >&2
  rm -f "$DB_FILE"
  exit 1
fi

# --- 2) Código + configuración ---
tar czf "$CODE_FILE" -C /opt \
  --exclude='*/node_modules' \
  --exclude='mw-secretaria/frontend/dist' \
  --exclude='mw-secretaria/frontend-dist' \
  --exclude='mw-secretaria/backups' \
  --exclude='*/.git' \
  mw-secretaria 2>/dev/null || echo "[$(date '+%F %T')] AVISO [$TIER]: tar de código terminó con avisos"

# --- 3) Retención: conserva las KEEP copias más recientes de cada tipo ---
ls -1t "$DEST"/secretaria_db_*.sql.gz  2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
ls -1t "$DEST"/secretaria_code_*.tar.gz 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f

NDB=$(ls -1 "$DEST"/secretaria_db_*.sql.gz 2>/dev/null | wc -l)
NCODE=$(ls -1 "$DEST"/secretaria_code_*.tar.gz 2>/dev/null | wc -l)
echo "[$(date '+%F %T')] OK [$TIER] db=$(du -h "$DB_FILE" | cut -f1) code=$(du -h "$CODE_FILE" 2>/dev/null | cut -f1) | conservadas: ${NDB} db / ${NCODE} code (máx ${KEEP})"
