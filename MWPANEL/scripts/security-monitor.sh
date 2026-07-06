#!/bin/bash
#
# Security Monitor Script for MW Panel
# Runs every 5 minutes via cron to detect suspicious activity
#
# Created: 2026-01-01
# Purpose: Automated security monitoring after incident remediation
#

LOG_FILE="/var/log/mw-panel-security.log"
ALERT_EMAIL="diegomusica88@gmail.com"
RESEND_API_KEY="re_4i33V69C_8cBXkLJ3jT4gNg4zKurTcSHS"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"

    curl -s -X POST "https://api.resend.com/emails" \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"MW Panel Security <no-reply@mundoworld.school>\",
            \"to\": [\"$ALERT_EMAIL\"],
            \"subject\": \"🚨 $subject\",
            \"html\": \"<h2>Alerta de Seguridad MW Panel</h2><p>$message</p><p><small>Servidor: $(hostname) - $(date)</small></p>\"
        }" > /dev/null 2>&1
}

# Check 1: Failed SSH attempts (con cooldown de 1 hora para no saturar el email)
check_ssh_attacks() {
    local failed_attempts=$(journalctl -u ssh --since "5 minutes ago" 2>/dev/null | grep -c "Failed password\|Invalid user")
    local cooldown_file="/tmp/.ssh_alert_cooldown"
    local cooldown_seconds=3600  # 1 hora entre alertas

    # Solo alertar si hay muchos intentos (fail2ban ya bloquea la mayoría)
    if [ "$failed_attempts" -gt 25 ]; then
        local banned_count=$(fail2ban-client status sshd 2>/dev/null | grep "Currently banned" | awk '{print $NF}')

        # Verificar cooldown: solo enviar email si ha pasado más de 1 hora
        local should_send=true
        if [ -f "$cooldown_file" ]; then
            local last_alert
            last_alert=$(cat "$cooldown_file" 2>/dev/null)
            local now
            now=$(date +%s)
            local elapsed=$(( now - last_alert ))
            if [ "$elapsed" -lt "$cooldown_seconds" ]; then
                should_send=false
            fi
        fi

        log_message "ALERT: $failed_attempts intentos SSH fallidos en los últimos 5 minutos (fail2ban tiene $banned_count IPs baneadas)"

        if [ "$should_send" = true ]; then
            date +%s > "$cooldown_file"
            send_alert "Ataques SSH Detectados (resumen horario)" "$failed_attempts intentos de login SSH fallidos en los últimos 5 minutos. Fail2ban tiene $banned_count IPs baneadas permanentemente. Esta alerta no se repetirá durante 1 hora aunque continúen los intentos."
        fi
        return 1
    elif [ "$failed_attempts" -gt 0 ]; then
        # Intentos normales gestionados por fail2ban, solo loguear sin email
        log_message "INFO: $failed_attempts intentos SSH - gestionados por fail2ban (normal)"
    fi
    return 0
}

# Check 2: Connections to known malicious IPs
check_malicious_connections() {
    local malicious_ips="16.185.242.248 78.153.140.50 78.153.140.250 87.121.84.154 45.225.251.3"

    for ip in $malicious_ips; do
        if ss -tn | grep -q "$ip"; then
            log_message "CRITICAL: Conexión detectada a IP maliciosa $ip"
            send_alert "Conexión a IP Maliciosa" "Se ha detectado una conexión activa a la IP conocida como maliciosa: $ip. Investigar inmediatamente."
            return 1
        fi
    done
    return 0
}

# Check 3: Container health
check_container_health() {
    local unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" 2>/dev/null)

    if [ -n "$unhealthy" ]; then
        log_message "WARNING: Contenedores no saludables: $unhealthy"
        send_alert "Contenedores No Saludables" "Los siguientes contenedores no están saludables: $unhealthy"
        return 1
    fi
    return 0
}

# Check 4: Disk space
check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

    if [ "$usage" -gt 90 ]; then
        log_message "WARNING: Uso de disco alto: ${usage}%"
        send_alert "Disco Casi Lleno" "El uso de disco ha alcanzado el ${usage}%. Liberar espacio."
        return 1
    fi
    return 0
}

# Check 5: Suspicious processes
check_suspicious_processes() {
    # Look for processes with suspicious names
    local suspicious=$(ps aux | grep -E "cryptominer|xmrig|\.elf|\.uhavenobotsxd" | grep -v grep)

    if [ -n "$suspicious" ]; then
        log_message "CRITICAL: Procesos sospechosos detectados: $suspicious"
        send_alert "Procesos Sospechosos" "Se han detectado procesos sospechosos en el sistema. Revisar inmediatamente."
        return 1
    fi
    return 0
}

# Check 6: New executable files in temp directories
check_temp_executables() {
    local new_execs=$(find /tmp /var/tmp /dev/shm -type f -executable -mmin -10 2>/dev/null)

    if [ -n "$new_execs" ]; then
        log_message "WARNING: Nuevos ejecutables en directorios temporales: $new_execs"
        send_alert "Ejecutables en /tmp" "Se han encontrado nuevos archivos ejecutables en directorios temporales: $new_execs"
        return 1
    fi
    return 0
}

# Check 7: API health
check_api_health() {
    # Get the backend container's current IP (it changes on restart)
    local backend_ip=$(docker inspect mw-panel-backend-prod --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null | awk '{print $1}')

    if [ -z "$backend_ip" ]; then
        log_message "ERROR: Contenedor mw-panel-backend-prod no encontrado o no está corriendo"
        send_alert "API No Disponible" "El contenedor mw-panel-backend-prod no está corriendo o no tiene IP asignada."
        return 1
    fi

    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://${backend_ip}:3000/api/health/status 2>/dev/null)

    if [ "$status" != "200" ]; then
        log_message "ERROR: API no responde correctamente en ${backend_ip}:3000 (código: $status)"
        send_alert "API No Disponible" "La API de MW Panel no está respondiendo correctamente. IP: ${backend_ip}. Código HTTP: $status"
        return 1
    fi
    return 0
}

# Main execution
main() {
    local issues=0

    log_message "=== Iniciando verificación de seguridad ==="

    check_ssh_attacks || ((issues++))
    check_malicious_connections || ((issues++))
    check_container_health || ((issues++))
    check_disk_space || ((issues++))
    check_suspicious_processes || ((issues++))
    check_temp_executables || ((issues++))
    check_api_health || ((issues++))

    if [ "$issues" -eq 0 ]; then
        log_message "✅ Todas las verificaciones pasadas - Sistema seguro"
    else
        log_message "⚠️ Se encontraron $issues problemas de seguridad"
    fi

    log_message "=== Verificación completada ==="
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
