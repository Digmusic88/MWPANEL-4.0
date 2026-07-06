#!/bin/bash

# Script ejecutor de limpieza automática
# Ejecuta la limpieza SQL y registra resultados

LOG_FILE="/var/log/mw-panel/shared-notes-cleanup.log"
SQL_SCRIPT="/opt/mw-panel/scripts/cleanup-expired-shared-notes.sql"

echo "============================================" >> "$LOG_FILE"
echo "🧹 LIMPIEZA AUTOMÁTICA INICIADA: $(date)" >> "$LOG_FILE"
echo "============================================" >> "$LOG_FILE"

# Ejecutar limpieza SQL (usando cat para pasar el contenido del script)
if cat "$SQL_SCRIPT" | docker-compose -f /opt/mw-panel/docker-compose.yml exec -T postgres psql -U mwpanel -d mwpanel >> "$LOG_FILE" 2>&1; then
    echo "✅ LIMPIEZA COMPLETADA EXITOSAMENTE: $(date)" >> "$LOG_FILE"
    EXIT_CODE=0
else
    echo "❌ ERROR EN LIMPIEZA: $(date)" >> "$LOG_FILE"
    EXIT_CODE=1
fi

echo "============================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

exit $EXIT_CODE
