#!/bin/bash
# =============================================================================
# Disk Space Alert Script - MW Panel
# Alerta por email cuando el disco supera el umbral configurado
# Ejecutar cada 15 minutos via cron
# =============================================================================

LOG_FILE="/var/log/mw-panel-disk-alert.log"
ALERT_THRESHOLD=80
CRITICAL_THRESHOLD=90
ADMIN_EMAIL="info@mundoworld.school"
RESEND_API_KEY="re_4i33V69C_8cBXkLJ3jT4gNg4zKurTcSHS"
ALERT_SENT_FILE="/tmp/disk_alert_sent"
HOSTNAME=$(hostname)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_email() {
    local subject="$1"
    local body="$2"

    curl -s -X POST 'https://api.resend.com/emails' \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H 'Content-Type: application/json' \
        -d "{
            \"from\": \"MW Panel Alerts <no-reply@mundoworld.school>\",
            \"to\": [\"$ADMIN_EMAIL\"],
            \"subject\": \"$subject\",
            \"html\": \"$body\"
        }" > /dev/null 2>&1

    return $?
}

# Obtener uso del disco
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
DISK_AVAILABLE=$(df -h / | tail -1 | awk '{print $4}')
DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')

log "Verificando disco: ${DISK_USAGE}% usado (${DISK_AVAILABLE} disponible de ${DISK_TOTAL})"

# Verificar si ya se envió alerta hoy para este nivel
TODAY=$(date +%Y%m%d)
ALERT_KEY="${TODAY}_${DISK_USAGE}"

# Nivel CRÍTICO (>90%)
if [ "$DISK_USAGE" -ge "$CRITICAL_THRESHOLD" ]; then
    if [ ! -f "${ALERT_SENT_FILE}_critical_${TODAY}" ]; then
        log "⚠️ CRÍTICO: Disco al ${DISK_USAGE}% - Ejecutando limpieza automática"

        # Ejecutar limpieza automática
        /opt/mw-panel/scripts/auto-cleanup-backups.sh >> "$LOG_FILE" 2>&1

        # Obtener nuevo uso después de limpieza
        NEW_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
        NEW_AVAILABLE=$(df -h / | tail -1 | awk '{print $4}')

        SUBJECT="🚨 CRÍTICO: Disco al ${DISK_USAGE}% en ${HOSTNAME}"
        BODY="<h2>⚠️ Alerta Crítica de Disco</h2>
<p><strong>Servidor:</strong> ${HOSTNAME}</p>
<p><strong>Uso antes de limpieza:</strong> ${DISK_USAGE}%</p>
<p><strong>Uso después de limpieza:</strong> ${NEW_USAGE}%</p>
<p><strong>Espacio disponible:</strong> ${NEW_AVAILABLE}</p>
<p><strong>Fecha:</strong> $(date '+%Y-%m-%d %H:%M:%S')</p>
<hr>
<p>Se ejecutó limpieza automática. Si el problema persiste, revisar manualmente.</p>
<p><strong>Acciones sugeridas:</strong></p>
<ul>
<li>Revisar logs grandes en /var/log</li>
<li>Verificar backups en /opt/mw-panel/backups</li>
<li>Ejecutar: docker system prune -a</li>
</ul>"

        if send_email "$SUBJECT" "$BODY"; then
            log "✅ Email crítico enviado a $ADMIN_EMAIL"
            touch "${ALERT_SENT_FILE}_critical_${TODAY}"
        else
            log "❌ Error enviando email crítico"
        fi
    fi

# Nivel WARNING (>80%)
elif [ "$DISK_USAGE" -ge "$ALERT_THRESHOLD" ]; then
    if [ ! -f "${ALERT_SENT_FILE}_warning_${TODAY}" ]; then
        log "⚠️ WARNING: Disco al ${DISK_USAGE}%"

        SUBJECT="⚠️ Alerta: Disco al ${DISK_USAGE}% en ${HOSTNAME}"
        BODY="<h2>⚠️ Alerta de Espacio en Disco</h2>
<p><strong>Servidor:</strong> ${HOSTNAME}</p>
<p><strong>Uso actual:</strong> ${DISK_USAGE}%</p>
<p><strong>Espacio disponible:</strong> ${DISK_AVAILABLE}</p>
<p><strong>Espacio total:</strong> ${DISK_TOTAL}</p>
<p><strong>Fecha:</strong> $(date '+%Y-%m-%d %H:%M:%S')</p>
<hr>
<p>El disco está alcanzando el límite. La limpieza automática se ejecutará a las 3:00 AM.</p>
<p><strong>Para limpiar ahora:</strong></p>
<pre>/opt/mw-panel/scripts/auto-cleanup-backups.sh</pre>"

        if send_email "$SUBJECT" "$BODY"; then
            log "✅ Email de alerta enviado a $ADMIN_EMAIL"
            touch "${ALERT_SENT_FILE}_warning_${TODAY}"
        else
            log "❌ Error enviando email de alerta"
        fi
    fi
else
    log "✅ Disco OK: ${DISK_USAGE}%"
    # Limpiar archivos de alerta del día anterior
    find /tmp -name "disk_alert_sent_*" -mtime +1 -delete 2>/dev/null
fi
