#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT DE MONITOREO DEL SISTEMA
# =============================================================================
# Monitoreo completo de servicios, recursos y estado de la aplicación
# =============================================================================

set -euo pipefail

# Colores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Variables de configuración
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="/var/log/mw-panel-monitor.log"
readonly STATUS_FILE="/tmp/mw-panel-status.json"

# Thresholds configurables
CPU_THRESHOLD=${CPU_THRESHOLD:-80}
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-85}
DISK_THRESHOLD=${DISK_THRESHOLD:-90}
LOAD_THRESHOLD=${LOAD_THRESHOLD:-2.0}

# Variables para alertas
ALERT_EMAIL=${ALERT_EMAIL:-}
WEBHOOK_URL=${WEBHOOK_URL:-}
SLACK_WEBHOOK=${SLACK_WEBHOOK:-}

# Funciones de logging
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} $*" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}"
    log "[INFO] $*"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}"
    log "[SUCCESS] $*"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}"
    log "[WARNING] $*"
}

log_error() {
    echo -e "${RED}❌ $*${NC}"
    log "[ERROR] $*"
}

log_critical() {
    echo -e "${RED}🚨 $*${NC}"
    log "[CRITICAL] $*"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
MW Panel 2.0 - Script de Monitoreo

USO:
    $0 [OPCIONES]

OPCIONES:
    -h, --help              Mostrar esta ayuda
    -c, --continuous        Monitoreo continuo (cada 60 segundos)
    -i, --interval SEGUNDOS Intervalo de monitoreo continuo
    -j, --json              Salida en formato JSON
    -q, --quiet             Modo silencioso (solo errores)
    -v, --verbose           Modo verboso
    --alerts-only           Solo mostrar alertas
    --services-only         Solo verificar servicios
    --resources-only        Solo verificar recursos del sistema
    --health-only           Solo verificar endpoints de salud

EJEMPLOS:
    $0                      # Verificación única
    $0 -c                   # Monitoreo continuo cada 60 segundos
    $0 -c -i 30            # Monitoreo continuo cada 30 segundos
    $0 -j                   # Salida en formato JSON
    $0 --alerts-only        # Solo mostrar problemas

VARIABLES DE ENTORNO:
    CPU_THRESHOLD           Umbral de CPU (por defecto: 80%)
    MEMORY_THRESHOLD        Umbral de memoria (por defecto: 85%)
    DISK_THRESHOLD          Umbral de disco (por defecto: 90%)
    LOAD_THRESHOLD          Umbral de carga (por defecto: 2.0)
    ALERT_EMAIL             Email para alertas
    WEBHOOK_URL             URL de webhook para alertas
    SLACK_WEBHOOK           Webhook de Slack para notificaciones
EOF
}

# Función para verificar estado de Docker
check_docker_status() {
    local status="OK"
    local message=""
    
    if ! docker info >/dev/null 2>&1; then
        status="ERROR"
        message="Docker no está corriendo"
        log_error "$message"
    else
        log_success "Docker está corriendo"
    fi
    
    echo "{\"service\":\"docker\",\"status\":\"$status\",\"message\":\"$message\"}"
}

# Función para verificar servicios de la aplicación
check_application_services() {
    local services_status=()
    
    cd "$APP_DIR"
    
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        echo "{\"service\":\"application\",\"status\":\"ERROR\",\"message\":\"docker-compose.prod.yml no encontrado\"}"
        return
    fi
    
    # Obtener lista de servicios
    local services=($(docker-compose -f docker-compose.prod.yml config --services))
    
    for service in "${services[@]}"; do
        local status="OK"
        local message=""
        local container_status=""
        
        # Verificar si el contenedor está corriendo
        if container_status=$(docker-compose -f docker-compose.prod.yml ps -q "$service" 2>/dev/null); then
            if [[ -n "$container_status" ]]; then
                local container_state=$(docker inspect --format='{{.State.Status}}' "$container_status" 2>/dev/null || echo "unknown")
                local container_health=$(docker inspect --format='{{.State.Health.Status}}' "$container_status" 2>/dev/null || echo "none")
                
                case "$container_state" in
                    running)
                        if [[ "$container_health" == "healthy" || "$container_health" == "none" ]]; then
                            status="OK"
                            message="Servicio corriendo correctamente"
                            log_success "Servicio $service: OK"
                        else
                            status="WARNING"
                            message="Servicio corriendo pero no saludable"
                            log_warning "Servicio $service: $message"
                        fi
                        ;;
                    restarting)
                        status="WARNING"
                        message="Servicio reiniciándose"
                        log_warning "Servicio $service: $message"
                        ;;
                    *)
                        status="ERROR"
                        message="Servicio no está corriendo (estado: $container_state)"
                        log_error "Servicio $service: $message"
                        ;;
                esac
            else
                status="ERROR"
                message="Contenedor no encontrado"
                log_error "Servicio $service: $message"
            fi
        else
            status="ERROR"
            message="No se pudo verificar el estado del servicio"
            log_error "Servicio $service: $message"
        fi
        
        services_status+=("{\"service\":\"$service\",\"status\":\"$status\",\"message\":\"$message\"}")
    done
    
    # Combinar resultados
    local services_json=$(IFS=,; echo "[${services_status[*]}]")
    echo "$services_json"
}

# Función para verificar recursos del sistema
check_system_resources() {
    local resources_status=()
    
    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' || echo "0")
    local cpu_status="OK"
    local cpu_message="Uso de CPU: ${cpu_usage}%"
    
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        cpu_status="WARNING"
        cpu_message="Alto uso de CPU: ${cpu_usage}% (umbral: ${CPU_THRESHOLD}%)"
        log_warning "$cpu_message"
    else
        log_success "$cpu_message"
    fi
    
    resources_status+=("{\"resource\":\"cpu\",\"value\":$cpu_usage,\"threshold\":$CPU_THRESHOLD,\"status\":\"$cpu_status\",\"message\":\"$cpu_message\"}")
    
    # Memory Usage
    local memory_info=$(free | grep Mem)
    local memory_total=$(echo $memory_info | awk '{print $2}')
    local memory_used=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$(echo "scale=1; $memory_used * 100 / $memory_total" | bc)
    local memory_status="OK"
    local memory_message="Uso de memoria: ${memory_usage}%"
    
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        memory_status="WARNING"
        memory_message="Alto uso de memoria: ${memory_usage}% (umbral: ${MEMORY_THRESHOLD}%)"
        log_warning "$memory_message"
    else
        log_success "$memory_message"
    fi
    
    resources_status+=("{\"resource\":\"memory\",\"value\":$memory_usage,\"threshold\":$MEMORY_THRESHOLD,\"status\":\"$memory_status\",\"message\":\"$memory_message\"}")
    
    # Disk Usage
    local disk_usage=$(df / | awk 'NR==2{gsub(/%/,"",$5); print $5}')
    local disk_status="OK"
    local disk_message="Uso de disco: ${disk_usage}%"
    
    if (( disk_usage > DISK_THRESHOLD )); then
        disk_status="WARNING"
        disk_message="Alto uso de disco: ${disk_usage}% (umbral: ${DISK_THRESHOLD}%)"
        log_warning "$disk_message"
    else
        log_success "$disk_message"
    fi
    
    resources_status+=("{\"resource\":\"disk\",\"value\":$disk_usage,\"threshold\":$DISK_THRESHOLD,\"status\":\"$disk_status\",\"message\":\"$disk_message\"}")
    
    # Load Average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
    local load_status="OK"
    local load_message="Carga promedio: $load_avg"
    
    if (( $(echo "$load_avg > $LOAD_THRESHOLD" | bc -l) )); then
        load_status="WARNING"
        load_message="Alta carga del sistema: $load_avg (umbral: $LOAD_THRESHOLD)"
        log_warning "$load_message"
    else
        log_success "$load_message"
    fi
    
    resources_status+=("{\"resource\":\"load\",\"value\":$load_avg,\"threshold\":$LOAD_THRESHOLD,\"status\":\"$load_status\",\"message\":\"$load_message\"}")
    
    # Combinar resultados
    local resources_json=$(IFS=,; echo "[${resources_status[*]}]")
    echo "$resources_json"
}

# Función para verificar endpoints de salud
check_health_endpoints() {
    local endpoints_status=()
    
    # Lista de endpoints críticos
    local endpoints=(
        "http://localhost/health:Frontend"
        "http://localhost:3000/health:Backend"
        "http://localhost:3000/api:API"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_info" | cut -d: -f1)
        local name=$(echo "$endpoint_info" | cut -d: -f2)
        local status="OK"
        local message=""
        local response_time=""
        
        # Verificar endpoint con timeout
        if response_time=$(curl -w "%{time_total}" -s -f -m 10 "$endpoint" -o /dev/null 2>/dev/null); then
            status="OK"
            message="Responde en ${response_time}s"
            log_success "Endpoint $name ($endpoint): $message"
        else
            status="ERROR"
            message="No responde o error"
            log_error "Endpoint $name ($endpoint): $message"
        fi
        
        endpoints_status+=("{\"endpoint\":\"$name\",\"url\":\"$endpoint\",\"status\":\"$status\",\"response_time\":\"$response_time\",\"message\":\"$message\"}")
    done
    
    # Verificar conectividad de base de datos
    cd "$APP_DIR"
    local db_status="OK"
    local db_message=""
    
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U mwpanel >/dev/null 2>&1; then
        db_status="OK"
        db_message="Base de datos disponible"
        log_success "Base de datos: $db_message"
    else
        db_status="ERROR"
        db_message="Base de datos no disponible"
        log_error "Base de datos: $db_message"
    fi
    
    endpoints_status+=("{\"endpoint\":\"database\",\"url\":\"postgres://localhost:5432\",\"status\":\"$db_status\",\"message\":\"$db_message\"}")
    
    # Verificar Redis
    local redis_status="OK"
    local redis_message=""
    
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
        redis_status="OK"
        redis_message="Redis disponible"
        log_success "Redis: $redis_message"
    else
        redis_status="ERROR"
        redis_message="Redis no disponible"
        log_error "Redis: $redis_message"
    fi
    
    endpoints_status+=("{\"endpoint\":\"redis\",\"url\":\"redis://localhost:6379\",\"status\":\"$redis_status\",\"message\":\"$redis_message\"}")
    
    # Combinar resultados
    local endpoints_json=$(IFS=,; echo "[${endpoints_status[*]}]")
    echo "$endpoints_json"
}

# Función para verificar logs de errores recientes
check_recent_errors() {
    local error_count=0
    local errors=()
    
    cd "$APP_DIR"
    
    # Verificar logs de Docker Compose de las últimas 24 horas
    local services=($(docker-compose -f docker-compose.prod.yml config --services))
    
    for service in "${services[@]}"; do
        # Obtener logs de errores de las últimas 24 horas
        local recent_errors=$(docker-compose -f docker-compose.prod.yml logs --since="24h" "$service" 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l)
        
        if [[ $recent_errors -gt 0 ]]; then
            error_count=$((error_count + recent_errors))
            errors+=("{\"service\":\"$service\",\"error_count\":$recent_errors}")
            log_warning "Servicio $service: $recent_errors errores en las últimas 24h"
        fi
    done
    
    # Verificar logs del sistema
    local system_errors=$(journalctl --since="24 hours ago" --priority=err | wc -l)
    if [[ $system_errors -gt 0 ]]; then
        error_count=$((error_count + system_errors))
        errors+=("{\"service\":\"system\",\"error_count\":$system_errors}")
        log_warning "Sistema: $system_errors errores en las últimas 24h"
    fi
    
    if [[ $error_count -eq 0 ]]; then
        log_success "No se encontraron errores recientes"
    else
        log_warning "Total de errores recientes: $error_count"
    fi
    
    local errors_json=$(IFS=,; echo "[${errors[*]}]")
    echo "{\"total_errors\":$error_count,\"errors\":$errors_json}"
}

# Función para enviar alertas
send_alert() {
    local level="$1"
    local message="$2"
    local details="$3"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local hostname=$(hostname)
    
    # Email alert
    if [[ -n "$ALERT_EMAIL" ]]; then
        local subject="MW Panel Alert [$level] - $hostname"
        local body="
MW Panel 2.0 - Alerta del Sistema
================================

Nivel: $level
Tiempo: $timestamp
Servidor: $hostname
Mensaje: $message

Detalles:
$details

Sistema: $(uname -a)
Uptime: $(uptime)
"
        
        if command -v sendmail >/dev/null 2>&1; then
            echo -e "To: $ALERT_EMAIL\nSubject: $subject\n\n$body" | sendmail "$ALERT_EMAIL"
            log_info "Alerta enviada por email a $ALERT_EMAIL"
        fi
    fi
    
    # Webhook alert
    if [[ -n "$WEBHOOK_URL" ]]; then
        local webhook_payload=$(cat << EOF
{
    "timestamp": "$timestamp",
    "hostname": "$hostname",
    "level": "$level",
    "message": "$message",
    "details": "$details"
}
EOF
)
        
        if curl -s -X POST -H "Content-Type: application/json" -d "$webhook_payload" "$WEBHOOK_URL" >/dev/null; then
            log_info "Alerta enviada via webhook"
        fi
    fi
    
    # Slack alert
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local slack_color=""
        case "$level" in
            CRITICAL) slack_color="danger" ;;
            WARNING) slack_color="warning" ;;
            *) slack_color="good" ;;
        esac
        
        local slack_payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "$slack_color",
            "title": "MW Panel Alert [$level]",
            "text": "$message",
            "fields": [
                {
                    "title": "Servidor",
                    "value": "$hostname",
                    "short": true
                },
                {
                    "title": "Tiempo",
                    "value": "$timestamp",
                    "short": true
                }
            ],
            "footer": "MW Panel Monitoring"
        }
    ]
}
EOF
)
        
        if curl -s -X POST -H "Content-Type: application/json" -d "$slack_payload" "$SLACK_WEBHOOK" >/dev/null; then
            log_info "Alerta enviada a Slack"
        fi
    fi
}

# Función para analizar el estado general y enviar alertas
analyze_and_alert() {
    local status_json="$1"
    
    # Extraer problemas críticos
    local critical_issues=()
    local warning_issues=()
    
    # Verificar servicios
    local failed_services=$(echo "$status_json" | jq -r '.services[] | select(.status == "ERROR") | .service')
    if [[ -n "$failed_services" ]]; then
        critical_issues+=("Servicios fallidos: $failed_services")
    fi
    
    local warning_services=$(echo "$status_json" | jq -r '.services[] | select(.status == "WARNING") | .service')
    if [[ -n "$warning_services" ]]; then
        warning_issues+=("Servicios con advertencias: $warning_services")
    fi
    
    # Verificar recursos
    local high_cpu=$(echo "$status_json" | jq -r '.resources[] | select(.resource == "cpu" and .status == "WARNING") | .value')
    if [[ -n "$high_cpu" && "$high_cpu" != "null" ]]; then
        warning_issues+=("Alto uso de CPU: ${high_cpu}%")
    fi
    
    local high_memory=$(echo "$status_json" | jq -r '.resources[] | select(.resource == "memory" and .status == "WARNING") | .value')
    if [[ -n "$high_memory" && "$high_memory" != "null" ]]; then
        warning_issues+=("Alto uso de memoria: ${high_memory}%")
    fi
    
    # Verificar endpoints
    local failed_endpoints=$(echo "$status_json" | jq -r '.endpoints[] | select(.status == "ERROR") | .endpoint')
    if [[ -n "$failed_endpoints" ]]; then
        critical_issues+=("Endpoints fallidos: $failed_endpoints")
    fi
    
    # Enviar alertas si es necesario
    if [[ ${#critical_issues[@]} -gt 0 ]]; then
        local critical_message="Problemas críticos detectados en MW Panel"
        local critical_details=$(IFS=$'\n'; echo "${critical_issues[*]}")
        send_alert "CRITICAL" "$critical_message" "$critical_details"
    fi
    
    if [[ ${#warning_issues[@]} -gt 0 ]]; then
        local warning_message="Advertencias detectadas en MW Panel"
        local warning_details=$(IFS=$'\n'; echo "${warning_issues[*]}")
        send_alert "WARNING" "$warning_message" "$warning_details"
    fi
}

# Función para generar reporte completo
generate_report() {
    local format="$1"
    local quiet="$2"
    local alerts_only="$3"
    
    log_info "Generando reporte de estado del sistema..."
    
    # Recopilar información
    local docker_status=$(check_docker_status)
    local services_status=$(check_application_services)
    local resources_status=$(check_system_resources)
    local endpoints_status=$(check_health_endpoints)
    local errors_status=$(check_recent_errors)
    
    # Generar timestamp
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')
    local hostname=$(hostname)
    
    # Construir JSON completo
    local full_status=$(cat << EOF
{
    "timestamp": "$timestamp",
    "hostname": "$hostname",
    "docker": $docker_status,
    "services": $services_status,
    "resources": $resources_status,
    "endpoints": $endpoints_status,
    "errors": $errors_status
}
EOF
)
    
    # Guardar estado en archivo
    echo "$full_status" > "$STATUS_FILE"
    
    # Analizar y enviar alertas
    analyze_and_alert "$full_status"
    
    # Mostrar resultados según formato
    if [[ "$format" == "json" ]]; then
        echo "$full_status"
    elif [[ "$alerts_only" == "true" ]]; then
        # Solo mostrar problemas
        local has_issues=false
        
        if echo "$full_status" | jq -e '.services[] | select(.status != "OK")' >/dev/null 2>&1; then
            echo -e "${RED}🚨 Servicios con problemas:${NC}"
            echo "$full_status" | jq -r '.services[] | select(.status != "OK") | "  " + .service + ": " + .message'
            has_issues=true
        fi
        
        if echo "$full_status" | jq -e '.resources[] | select(.status != "OK")' >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Recursos con advertencias:${NC}"
            echo "$full_status" | jq -r '.resources[] | select(.status != "OK") | "  " + .resource + ": " + .message'
            has_issues=true
        fi
        
        if echo "$full_status" | jq -e '.endpoints[] | select(.status != "OK")' >/dev/null 2>&1; then
            echo -e "${RED}❌ Endpoints con problemas:${NC}"
            echo "$full_status" | jq -r '.endpoints[] | select(.status != "OK") | "  " + .endpoint + ": " + .message'
            has_issues=true
        fi
        
        if [[ "$has_issues" == "false" ]]; then
            echo -e "${GREEN}✅ No se detectaron problemas${NC}"
        fi
    else
        # Mostrar reporte completo
        echo
        echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${PURPLE}║                    MW PANEL 2.0 - ESTADO DEL SISTEMA            ║${NC}"
        echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
        echo
        echo -e "${CYAN}📊 Resumen General:${NC}"
        echo -e "   Servidor: $hostname"
        echo -e "   Timestamp: $timestamp"
        echo
        
        if [[ "$quiet" != "true" ]]; then
            echo -e "${BLUE}🐳 Estado de Docker:${NC}"
            echo "$full_status" | jq -r '.docker | "   " + .service + ": " + .status + " - " + .message'
            echo
            
            echo -e "${BLUE}🔧 Servicios de la Aplicación:${NC}"
            echo "$full_status" | jq -r '.services[] | "   " + .service + ": " + .status + " - " + .message'
            echo
            
            echo -e "${BLUE}💻 Recursos del Sistema:${NC}"
            echo "$full_status" | jq -r '.resources[] | "   " + .resource + ": " + (.value|tostring) + "% - " + .message'
            echo
            
            echo -e "${BLUE}🌐 Endpoints de Salud:${NC}"
            echo "$full_status" | jq -r '.endpoints[] | "   " + .endpoint + ": " + .status + " - " + .message'
            echo
            
            local total_errors=$(echo "$full_status" | jq -r '.errors.total_errors')
            echo -e "${BLUE}📋 Errores Recientes (24h):${NC}"
            echo -e "   Total: $total_errors errores"
        fi
    fi
}

# Función para monitoreo continuo
continuous_monitoring() {
    local interval="$1"
    local format="$2"
    local quiet="$3"
    local alerts_only="$4"
    
    log_info "Iniciando monitoreo continuo cada $interval segundos..."
    log_info "Presiona Ctrl+C para detener"
    
    while true; do
        clear
        echo -e "${CYAN}$(date '+%Y-%m-%d %H:%M:%S') - Actualizando estado...${NC}"
        generate_report "$format" "$quiet" "$alerts_only"
        
        sleep "$interval"
    done
}

# Función principal
main() {
    local continuous=false
    local interval=60
    local format="text"
    local quiet=false
    local alerts_only=false
    local services_only=false
    local resources_only=false
    local health_only=false
    
    # Procesar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--continuous)
                continuous=true
                shift
                ;;
            -i|--interval)
                interval="$2"
                shift 2
                ;;
            -j|--json)
                format="json"
                shift
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            --alerts-only)
                alerts_only=true
                shift
                ;;
            --services-only)
                services_only=true
                shift
                ;;
            --resources-only)
                resources_only=true
                shift
                ;;
            --health-only)
                health_only=true
                shift
                ;;
            *)
                log_error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Crear log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    # Verificar dependencias
    if ! command -v jq >/dev/null 2>&1; then
        log_error "jq no está instalado (requerido para procesamiento JSON)"
        exit 1
    fi
    
    if ! command -v bc >/dev/null 2>&1; then
        log_error "bc no está instalado (requerido para cálculos)"
        exit 1
    fi
    
    # Ejecutar según modo
    if [[ "$continuous" == "true" ]]; then
        continuous_monitoring "$interval" "$format" "$quiet" "$alerts_only"
    else
        generate_report "$format" "$quiet" "$alerts_only"
    fi
}

# Función para cleanup
cleanup() {
    log_info "Deteniendo monitoreo..."
    exit 0
}

# Capturar Ctrl+C
trap cleanup INT TERM

# Ejecutar función principal
main "$@"