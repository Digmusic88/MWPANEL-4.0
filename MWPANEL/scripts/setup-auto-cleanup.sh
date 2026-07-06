#!/bin/bash

# ============================================
# CONFIGURADOR DE LIMPIEZA AUTOMÁTICA 
# ============================================
# 
# DESCRIPCIÓN:
# Este script configura la limpieza automática diaria
# de comparticiones de apuntes expiradas.
#
# FUNCIONES:
# 1. Configura cron job para ejecución diaria a las 2:00 AM
# 2. Crea script ejecutor con logging
# 3. Verifica permisos y configuración
# 4. Permite ejecución manual para testing
# ============================================

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/mw-panel"
LOG_FILE="$LOG_DIR/shared-notes-cleanup.log"

echo "🔧 CONFIGURANDO LIMPIEZA AUTOMÁTICA DE APUNTES COMPARTIDOS..."

# Crear directorio de logs si no existe
sudo mkdir -p "$LOG_DIR"
sudo chown mwpanel-user:mwpanel-user "$LOG_DIR" 2>/dev/null || true

# Crear script ejecutor
cat > "$SCRIPT_DIR/run-cleanup.sh" << 'EOF'
#!/bin/bash

# Script ejecutor de limpieza automática
# Ejecuta la limpieza SQL y registra resultados

LOG_FILE="/var/log/mw-panel/shared-notes-cleanup.log"
SQL_SCRIPT="/opt/mw-panel/scripts/cleanup-expired-shared-notes.sql"

echo "============================================" >> "$LOG_FILE"
echo "🧹 LIMPIEZA AUTOMÁTICA INICIADA: $(date)" >> "$LOG_FILE"
echo "============================================" >> "$LOG_FILE"

# Ejecutar limpieza SQL
if docker-compose -f /opt/mw-panel/docker-compose.yml exec -T postgres psql -U mwpanel -d mwpanel -f "$SQL_SCRIPT" >> "$LOG_FILE" 2>&1; then
    echo "✅ LIMPIEZA COMPLETADA EXITOSAMENTE: $(date)" >> "$LOG_FILE"
    EXIT_CODE=0
else
    echo "❌ ERROR EN LIMPIEZA: $(date)" >> "$LOG_FILE"
    EXIT_CODE=1
fi

echo "============================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

exit $EXIT_CODE
EOF

# Hacer ejecutable
chmod +x "$SCRIPT_DIR/run-cleanup.sh"

echo "✅ Script ejecutor creado: $SCRIPT_DIR/run-cleanup.sh"

# Configurar cron job
CRON_JOB="0 2 * * * $SCRIPT_DIR/run-cleanup.sh"
CRON_COMMENT="# MW Panel: Limpieza automática de apuntes compartidos expirados"

# Verificar si ya existe el cron job
if crontab -l 2>/dev/null | grep -q "run-cleanup.sh"; then
    echo "⚠️ Cron job ya existe. Actualizando..."
    # Remover cron job existente y agregar nuevo
    (crontab -l 2>/dev/null | grep -v "run-cleanup.sh") | crontab -
fi

# Agregar nuevo cron job
(crontab -l 2>/dev/null; echo "$CRON_COMMENT"; echo "$CRON_JOB") | crontab -

echo "✅ Cron job configurado: Ejecución diaria a las 2:00 AM"

# Verificar configuración
echo ""
echo "📋 CONFIGURACIÓN ACTUAL:"
echo "   - Script SQL: $SCRIPT_DIR/cleanup-expired-shared-notes.sql"
echo "   - Script ejecutor: $SCRIPT_DIR/run-cleanup.sh"
echo "   - Log de ejecución: $LOG_FILE"
echo "   - Horario: Todos los días a las 2:00 AM"

# Mostrar cron jobs relacionados
echo ""
echo "📅 CRON JOBS CONFIGURADOS:"
crontab -l | grep -A1 -B1 "MW Panel" || echo "   (Ningún cron job encontrado)"

echo ""
echo "🧪 PARA PROBAR MANUALMENTE:"
echo "   $SCRIPT_DIR/run-cleanup.sh"
echo ""
echo "📊 PARA VER LOGS:"
echo "   tail -f $LOG_FILE"

echo ""
echo "🎉 ¡CONFIGURACIÓN COMPLETADA!"
echo "   La limpieza automática se ejecutará diariamente a las 2:00 AM"
echo "   Los logs se guardarán en: $LOG_FILE"