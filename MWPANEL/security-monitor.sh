#!/bin/bash
# Security Monitor Script - MW Panel
# Monitorea actividad sospechosa y alerta

LOG_FILE="/var/log/security-monitor.log"
ALERT_EMAIL="diegomusica88@gmail.com"

log_event() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_outbound_connections() {
    # Contar conexiones salientes inusuales
    CONN_COUNT=$(ss -tunap | grep -v "LISTEN" | grep -v "127.0.0.1" | wc -l)
    if [ "$CONN_COUNT" -gt 100 ]; then
        log_event "ALERTA: $CONN_COUNT conexiones salientes detectadas"
    fi
}

check_failed_logins() {
    # Verificar intentos de login fallidos en la última hora
    FAILED=$(grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date '+%b %_d %H')" | wc -l)
    if [ "$FAILED" -gt 10 ]; then
        log_event "ALERTA: $FAILED intentos de login fallidos en la última hora"
    fi
}

check_suspicious_processes() {
    # Buscar procesos en ubicaciones sospechosas
    SUSPICIOUS=$(ps aux | grep -E "/tmp/|/dev/shm/" | grep -v grep | wc -l)
    if [ "$SUSPICIOUS" -gt 0 ]; then
        log_event "ALERTA: $SUSPICIOUS procesos sospechosos ejecutando desde /tmp o /dev/shm"
        ps aux | grep -E "/tmp/|/dev/shm/" | grep -v grep >> "$LOG_FILE"
    fi
}

check_network_traffic() {
    # Monitorear tráfico a puertos sospechosos
    SUSPICIOUS_PORTS=$(ss -tunap | grep -E ":19139|:50959" | wc -l)
    if [ "$SUSPICIOUS_PORTS" -gt 0 ]; then
        log_event "ALERTA CRÍTICA: Tráfico detectado en puertos del ataque anterior"
        ss -tunap | grep -E ":19139|:50959" >> "$LOG_FILE"
    fi
}

# Ejecutar checks
log_event "Iniciando monitoreo de seguridad..."
check_outbound_connections
check_failed_logins
check_suspicious_processes
check_network_traffic
log_event "Monitoreo completado"
