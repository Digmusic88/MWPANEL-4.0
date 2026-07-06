#!/bin/bash

# ====================================================================
# MW Panel 2.0 - Script de Monitoreo y Auto-Restart
# ====================================================================
# Este script monitorea continuamente el estado del sistema MW Panel 2.0
# y reinicia automáticamente los servicios que fallen
# ====================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuración
CHECK_INTERVAL=30
LOG_FILE="/var/log/mw-panel-monitor.log"
COMPOSE_FILE="/opt/mw-panel/docker-compose.prod.yml"

# Función para logging
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_line="[$level] $timestamp - $message"
    
    echo -e "$log_line" | tee -a "$LOG_FILE"
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
        "MONITOR")
            echo -e "${BLUE}[MONITOR]${NC} ${timestamp} - $message"
            ;;
    esac
}

# Función para verificar si un contenedor está funcionando
check_container_health() {
    local container_name=$1
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null)
    local running_status=$(docker inspect --format='{{.State.Running}}' "$container_name" 2>/dev/null)
    
    if [ "$running_status" = "true" ]; then
        if [ "$health_status" = "healthy" ] || [ "$health_status" = "" ]; then
            return 0  # Contenedor funcionando
        else
            return 1  # Contenedor corriendo pero no saludable
        fi
    else
        return 2  # Contenedor no corriendo
    fi
}

# Función para reiniciar un contenedor específico
restart_container() {
    local container_name=$1
    local service_name=$2
    
    log_message "WARN" "Reiniciando contenedor $container_name ($service_name)..."
    
    if docker compose -f "$COMPOSE_FILE" restart "$service_name" &> /dev/null; then
        log_message "INFO" "✅ Contenedor $container_name reiniciado exitosamente"
        return 0
    else
        log_message "ERROR" "❌ Error al reiniciar contenedor $container_name"
        return 1
    fi
}

# Función para verificar conectividad web
check_web_connectivity() {
    # Verificar HTTPS
    if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/health 2>/dev/null | grep -q "200"; then
        return 0
    # Verificar HTTP como fallback
    elif curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null | grep -q "200"; then
        return 0
    else
        return 1
    fi
}

# Función para verificar API backend
check_backend_api() {
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me 2>/dev/null | grep -q "401\|200"; then
        return 0
    else
        return 1
    fi
}

# Función principal de monitoreo
monitor_system() {
    log_message "INFO" "🚀 Iniciando monitoreo del sistema MW Panel 2.0..."
    log_message "INFO" "📊 Intervalo de verificación: ${CHECK_INTERVAL}s"
    log_message "INFO" "📝 Log file: $LOG_FILE"
    
    while true; do
        log_message "MONITOR" "🔍 Verificando estado del sistema..."
        
        # Lista de contenedores a monitorear
        declare -A containers=(
            ["mw-panel-db-prod"]="postgres"
            ["mw-panel-redis-prod"]="redis"
            ["mw-panel-backend-prod"]="backend"
            ["mw-panel-frontend-prod"]="frontend"
            ["mw-panel-nginx-prod"]="nginx"
        )
        
        local containers_restarted=0
        local all_healthy=true
        
        # Verificar cada contenedor
        for container_name in "${!containers[@]}"; do
            service_name="${containers[$container_name]}"
            
            check_container_health "$container_name"
            case $? in
                0)
                    log_message "MONITOR" "✅ $container_name - SALUDABLE"
                    ;;
                1)
                    log_message "WARN" "⚠️ $container_name - NO SALUDABLE, reiniciando..."
                    restart_container "$container_name" "$service_name"
                    containers_restarted=$((containers_restarted + 1))
                    all_healthy=false
                    ;;
                2)
                    log_message "ERROR" "❌ $container_name - NO EJECUTÁNDOSE, reiniciando..."
                    restart_container "$container_name" "$service_name"
                    containers_restarted=$((containers_restarted + 1))
                    all_healthy=false
                    ;;
            esac
        done
        
        # Verificar conectividad web
        if ! check_web_connectivity; then
            log_message "WARN" "🌐 Conectividad web fallando, reiniciando nginx y frontend..."
            restart_container "mw-panel-nginx-prod" "nginx"
            restart_container "mw-panel-frontend-prod" "frontend"
            containers_restarted=$((containers_restarted + 2))
            all_healthy=false
        else
            log_message "MONITOR" "✅ Conectividad web - OK"
        fi
        
        # Verificar API backend
        if ! check_backend_api; then
            log_message "WARN" "🔧 API Backend no responde, reiniciando backend..."
            restart_container "mw-panel-backend-prod" "backend"
            containers_restarted=$((containers_restarted + 1))
            all_healthy=false
        else
            log_message "MONITOR" "✅ API Backend - OK"
        fi
        
        # Resumen del ciclo de monitoreo
        if [ "$all_healthy" = true ]; then
            log_message "INFO" "🎉 Sistema completamente saludable"
        else
            log_message "WARN" "⚙️ Contenedores reiniciados en este ciclo: $containers_restarted"
        fi
        
        log_message "MONITOR" "⏰ Próxima verificación en ${CHECK_INTERVAL}s..."
        sleep "$CHECK_INTERVAL"
    done
}

# Función para cleanup al recibir señales
cleanup() {
    log_message "INFO" "🛑 Recibida señal de terminación, deteniendo monitoreo..."
    exit 0
}

# Configurar traps para señales
trap cleanup SIGTERM SIGINT

# Crear directorio de logs si no existe
mkdir -p "$(dirname "$LOG_FILE")"

# Inicializar log file
echo "=== MW Panel 2.0 Monitor Started at $(date) ===" >> "$LOG_FILE"

# Verificar que docker compose esté disponible
if ! command -v docker &> /dev/null; then
    log_message "ERROR" "Docker no está disponible"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    log_message "ERROR" "Docker Compose no está disponible"
    exit 1
fi

# Verificar que el archivo compose existe
if [ ! -f "$COMPOSE_FILE" ]; then
    log_message "ERROR" "Archivo docker-compose.prod.yml no encontrado en $COMPOSE_FILE"
    exit 1
fi

# Iniciar monitoreo
monitor_system