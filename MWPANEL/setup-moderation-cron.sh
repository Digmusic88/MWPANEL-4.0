#!/bin/bash

# Script para configurar el cron job de moderación
echo "🕒 Configurando cron job para procesamiento de reportes vencidos..."

# Crear entrada de cron (cada hora)
CRON_ENTRY="0 * * * * /opt/mw-panel/scripts/moderation-cron.sh"

# Verificar si ya existe la entrada
if crontab -l 2>/dev/null | grep -q "moderation-cron.sh"; then
    echo "⚠️  Cron job de moderación ya existe"
else
    # Agregar la entrada al crontab
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    echo "✅ Cron job configurado: cada hora a los minutos :00"
fi

# Crear directorio de logs
mkdir -p /var/log/mw-panel

# Mostrar cron jobs actuales
echo ""
echo "📋 Cron jobs actuales:"
crontab -l | grep -E "(moderation|mw-panel)" || echo "  (ninguno relacionado con MW Panel)"

echo ""
echo "🎯 El cron job procesará reportes vencidos automáticamente cada hora"
echo "📁 Logs disponibles en: /var/log/mw-panel/moderation-cron.log"