#!/bin/bash

# Script para verificar el estado del sistema de monitoreo
# Uso: ./check-monitoring.sh

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 MW Panel - Estado del Sistema de Monitoreo${NC}"
echo "============================================"

# Función para verificar servicio
check_service() {
    local service_name=$1
    local container_name=$2
    local health_url=$3
    
    echo -e "\n${YELLOW}Verificando $service_name...${NC}"
    
    # Verificar contenedor
    if docker ps | grep -q "$container_name"; then
        echo -e "  ${GREEN}✅ Contenedor ejecutándose${NC}"
        
        # Verificar salud si se proporciona URL
        if [ ! -z "$health_url" ]; then
            if curl -s "$health_url" > /dev/null 2>&1; then
                echo -e "  ${GREEN}✅ Servicio respondiendo${NC}"
            else
                echo -e "  ${RED}❌ Servicio no responde${NC}"
            fi
        fi
        
        # Mostrar logs recientes
        echo -e "  ${BLUE}Últimos logs:${NC}"
        docker logs --tail 5 "$container_name" 2>&1 | sed 's/^/    /'
    else
        echo -e "  ${RED}❌ Contenedor no encontrado${NC}"
    fi
}

# Función para verificar métricas
check_metrics() {
    echo -e "\n${YELLOW}Verificando métricas disponibles...${NC}"
    
    # MW Panel metrics
    if curl -s http://localhost:3000/api/metrics > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Métricas MW Panel disponibles${NC}"
        echo -e "    Endpoint: http://localhost:3000/api/metrics"
    else
        echo -e "  ${RED}❌ Métricas MW Panel no disponibles${NC}"
    fi
    
    # Prometheus targets
    if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
        echo -e "\n  ${BLUE}Targets en Prometheus:${NC}"
        curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets[] | "    - \(.labels.job): \(.health)"' 2>/dev/null || echo "    No se pudo obtener información de targets"
    fi
}

# Función para mostrar estadísticas
show_stats() {
    echo -e "\n${YELLOW}Estadísticas del sistema:${NC}"
    
    # Uso de recursos de contenedores
    echo -e "\n  ${BLUE}Uso de recursos:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(prometheus|grafana|exporter)" | sed 's/^/    /'
    
    # Espacio en disco
    echo -e "\n  ${BLUE}Espacio en disco (volúmenes):${NC}"
    docker system df -v | grep -E "(prometheus|grafana)" | sed 's/^/    /'
}

# Main
echo -e "\n${BLUE}1. Estado de servicios${NC}"
echo "====================="

check_service "Prometheus" "mw-panel-prometheus" "http://localhost:9090/-/healthy"
check_service "Grafana" "mw-panel-grafana" "http://localhost:3001/api/health"
check_service "Node Exporter" "mw-panel-node-exporter" "http://localhost:9100/metrics"
check_service "PostgreSQL Exporter" "mw-panel-postgres-exporter" "http://localhost:9187/metrics"
check_service "Redis Exporter" "mw-panel-redis-exporter" "http://localhost:9121/metrics"

echo -e "\n${BLUE}2. Métricas y Targets${NC}"
echo "===================="
check_metrics

echo -e "\n${BLUE}3. Estadísticas del Sistema${NC}"
echo "========================="
show_stats

echo -e "\n${BLUE}4. URLs de Acceso${NC}"
echo "==============="
echo -e "  🎯 Prometheus: http://localhost:9090"
echo -e "  📊 Grafana: http://localhost:3001 (admin/admin123)"
echo -e "  📈 MW Panel Metrics: http://localhost:3000/api/metrics"

echo -e "\n${GREEN}✅ Verificación completada${NC}"