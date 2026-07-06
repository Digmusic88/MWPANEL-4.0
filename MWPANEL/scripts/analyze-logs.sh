#!/bin/bash

# Script para analizar logs del sistema MW Panel
# Uso: ./analyze-logs.sh [opciones]

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Directorio de logs
LOG_DIR="/opt/mw-panel/backend/logs"

# Función de ayuda
show_help() {
    echo "Análisis de Logs - MW Panel"
    echo "=========================="
    echo ""
    echo "Uso: $0 [comando] [opciones]"
    echo ""
    echo "Comandos:"
    echo "  errors        - Mostrar últimos errores"
    echo "  security      - Mostrar eventos de seguridad"
    echo "  performance   - Analizar métricas de rendimiento"
    echo "  audit         - Ver logs de auditoría"
    echo "  summary       - Resumen general de logs"
    echo "  tail          - Seguir logs en tiempo real"
    echo "  search TERM   - Buscar término en todos los logs"
    echo ""
    echo "Opciones:"
    echo "  -n NUM        - Número de líneas a mostrar (default: 20)"
    echo "  -d DATE       - Filtrar por fecha (formato: YYYY-MM-DD)"
    echo "  -h            - Mostrar esta ayuda"
}

# Verificar que exista el directorio de logs
check_logs_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        echo -e "${RED}❌ Directorio de logs no encontrado: $LOG_DIR${NC}"
        echo -e "${YELLOW}Creando directorio de logs...${NC}"
        mkdir -p "$LOG_DIR"
    fi
}

# Mostrar errores recientes
show_errors() {
    local lines=${1:-20}
    echo -e "${RED}🚨 Últimos $lines errores:${NC}"
    echo "================================"
    
    if [ -f "$LOG_DIR/error-$(date +%Y-%m-%d).log" ]; then
        tail -n "$lines" "$LOG_DIR/error-$(date +%Y-%m-%d).log" | while read line; do
            echo -e "${RED}$line${NC}"
        done
    else
        echo -e "${YELLOW}No hay logs de errores para hoy${NC}"
    fi
}

# Mostrar eventos de seguridad
show_security() {
    local lines=${1:-20}
    echo -e "${PURPLE}🔒 Eventos de seguridad recientes:${NC}"
    echo "===================================="
    
    grep -h "security" "$LOG_DIR"/application-*.log 2>/dev/null | \
        tail -n "$lines" | \
        jq -r '. | "\(.timestamp) [\(.level)] \(.message) - \(.event // "N/A")"' 2>/dev/null || \
        echo -e "${YELLOW}No se encontraron eventos de seguridad${NC}"
}

# Analizar rendimiento
analyze_performance() {
    echo -e "${BLUE}⚡ Análisis de rendimiento:${NC}"
    echo "============================"
    
    # Buscar logs de performance
    local perf_logs=$(grep -h "performance" "$LOG_DIR"/application-*.log 2>/dev/null | tail -100)
    
    if [ -z "$perf_logs" ]; then
        echo -e "${YELLOW}No hay datos de rendimiento disponibles${NC}"
        return
    fi
    
    # Analizar operaciones lentas
    echo -e "\n${YELLOW}Operaciones más lentas:${NC}"
    echo "$perf_logs" | \
        jq -r 'select(.performance == true) | "\(.operation): \(.duration)ms"' 2>/dev/null | \
        sort -t: -k2 -nr | \
        head -10
    
    # Promedio por operación
    echo -e "\n${YELLOW}Promedio por operación:${NC}"
    echo "$perf_logs" | \
        jq -r 'select(.performance == true) | "\(.operation) \(.duration)"' 2>/dev/null | \
        awk '{sum[$1]+=$2; count[$1]++} END {for (op in sum) printf "%-40s %.2fms\n", op, sum[op]/count[op]}' | \
        sort -k2 -nr
}

# Mostrar logs de auditoría
show_audit() {
    local lines=${1:-20}
    echo -e "${GREEN}📋 Logs de auditoría recientes:${NC}"
    echo "================================="
    
    if [ -f "$LOG_DIR/audit-$(date +%Y-%m-%d).log" ]; then
        tail -n "$lines" "$LOG_DIR/audit-$(date +%Y-%m-%d).log" | \
            jq -r '. | "\(.timestamp) [\(.userId)] \(.action) - \(.details | tostring)"' 2>/dev/null || \
            tail -n "$lines" "$LOG_DIR/audit-$(date +%Y-%m-%d).log"
    else
        echo -e "${YELLOW}No hay logs de auditoría para hoy${NC}"
    fi
}

# Resumen general
show_summary() {
    echo -e "${BLUE}📊 Resumen de logs del sistema:${NC}"
    echo "=================================="
    
    # Contar tipos de logs
    echo -e "\n${YELLOW}Logs de hoy:${NC}"
    for logfile in "$LOG_DIR"/*-$(date +%Y-%m-%d).log; do
        if [ -f "$logfile" ]; then
            local count=$(wc -l < "$logfile")
            local filename=$(basename "$logfile")
            printf "%-30s %6d líneas\n" "$filename:" "$count"
        fi
    done
    
    # Niveles de log
    echo -e "\n${YELLOW}Distribución por nivel (últimas 1000 líneas):${NC}"
    if [ -f "$LOG_DIR/application-$(date +%Y-%m-%d).log" ]; then
        tail -1000 "$LOG_DIR/application-$(date +%Y-%m-%d).log" 2>/dev/null | \
            jq -r '.level' 2>/dev/null | \
            sort | uniq -c | sort -nr || echo "No se pudo analizar"
    fi
    
    # Top errores
    echo -e "\n${YELLOW}Top 5 errores más comunes:${NC}"
    if [ -f "$LOG_DIR/error-$(date +%Y-%m-%d).log" ]; then
        jq -r '.message' "$LOG_DIR/error-$(date +%Y-%m-%d).log" 2>/dev/null | \
            sort | uniq -c | sort -nr | head -5 || echo "No se pudo analizar"
    fi
}

# Tail en tiempo real
tail_logs() {
    echo -e "${GREEN}📜 Siguiendo logs en tiempo real...${NC}"
    echo "Presiona Ctrl+C para salir"
    echo "=================================="
    
    # Usar multitail si está disponible
    if command -v multitail &> /dev/null; then
        multitail -i "$LOG_DIR/application-$(date +%Y-%m-%d).log" \
                  -i "$LOG_DIR/error-$(date +%Y-%m-%d).log"
    else
        tail -f "$LOG_DIR/application-$(date +%Y-%m-%d).log"
    fi
}

# Buscar en logs
search_logs() {
    local term="$1"
    local lines=${2:-20}
    
    echo -e "${BLUE}🔍 Buscando '$term' en logs:${NC}"
    echo "=================================="
    
    grep -h "$term" "$LOG_DIR"/*.log 2>/dev/null | \
        tail -n "$lines" | \
        while read line; do
            echo "$line" | jq . 2>/dev/null || echo "$line"
        done
}

# Main
check_logs_dir

# Parsear argumentos
LINES=20
while [[ $# -gt 0 ]]; do
    case $1 in
        -n)
            LINES="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        errors)
            show_errors "$LINES"
            exit 0
            ;;
        security)
            show_security "$LINES"
            exit 0
            ;;
        performance)
            analyze_performance
            exit 0
            ;;
        audit)
            show_audit "$LINES"
            exit 0
            ;;
        summary)
            show_summary
            exit 0
            ;;
        tail)
            tail_logs
            exit 0
            ;;
        search)
            search_logs "$2" "$LINES"
            exit 0
            ;;
        *)
            echo -e "${RED}Comando no reconocido: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# Si no hay argumentos, mostrar resumen
show_summary