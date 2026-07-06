#!/bin/bash
# ===========================================
# APPLY SECURITY RULES - Bloqueo de IPs C&C
# Ejecutar después de que Docker inicie
# ===========================================

LOG_FILE="/var/log/mw-panel-security.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# IPs de C&C de malware a bloquear
BLOCKED_RANGES=(
    "141.95.72.0/24"
)

log "=== APLICANDO REGLAS DE SEGURIDAD ==="

# Esperar a que Docker esté listo
for i in {1..30}; do
    if docker info >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

# Verificar que la cadena DOCKER-USER existe
if iptables -L DOCKER-USER >/dev/null 2>&1; then
    for RANGE in "${BLOCKED_RANGES[@]}"; do
        # Verificar si la regla ya existe
        if ! iptables -C DOCKER-USER -d "$RANGE" -j DROP 2>/dev/null; then
            iptables -I DOCKER-USER -d "$RANGE" -j DROP
            log "Bloqueado destino: $RANGE"
        fi
        if ! iptables -C DOCKER-USER -s "$RANGE" -j DROP 2>/dev/null; then
            iptables -I DOCKER-USER -s "$RANGE" -j DROP
            log "Bloqueado origen: $RANGE"
        fi
    done
    log "Reglas DOCKER-USER aplicadas correctamente"
else
    log "ERROR: Cadena DOCKER-USER no existe. Docker puede no estar iniciado."
    exit 1
fi

log "=== REGLAS DE SEGURIDAD APLICADAS ==="
