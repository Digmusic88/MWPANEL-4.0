#!/bin/bash

# Script para procesar reportes de moderación vencidos
# Se ejecuta cada hora vía cron job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/mw-panel/moderation-cron.log"
API_URL="https://plataforma.mundoworld.school/api/student-notes/cron/moderation/process-expired"

# Crear directorio de logs si no existe
mkdir -p "$(dirname "$LOG_FILE")"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "🕒 MODERATION-CRON: Starting expired reports processing"

# Llamar al endpoint del cron job
response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -w "HTTP_CODE:%{http_code}")

# Extraer código HTTP
http_code=$(echo "$response" | sed -n 's/.*HTTP_CODE:\([0-9]*\)$/\1/p')
response_body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    log "✅ MODERATION-CRON: Successfully processed expired reports"
    log "📊 MODERATION-CRON: Response: $response_body"
else
    log "❌ MODERATION-CRON: Failed to process expired reports (HTTP $http_code)"
    log "🔍 MODERATION-CRON: Response: $response_body"
fi

log "🏁 MODERATION-CRON: Finished processing"