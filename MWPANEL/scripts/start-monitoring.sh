#!/bin/bash

# Script para iniciar el sistema de monitoreo Prometheus/Grafana
# Uso: ./start-monitoring.sh

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🎯 MW Panel - Sistema de Monitoreo con Prometheus/Grafana${NC}"
echo "========================================================="

# Función para verificar servicios principales
check_main_services() {
    echo -e "\n${YELLOW}Verificando servicios principales...${NC}"
    
    # Verificar que MW Panel esté ejecutándose
    if docker ps | grep -q "mw-panel-backend"; then
        echo -e "${GREEN}✅ MW Panel Backend está funcionando${NC}"
    else
        echo -e "${RED}❌ MW Panel Backend no está ejecutándose${NC}"
        echo "Por favor, inicia el sistema principal primero: ./start-all-optimized.sh"
        exit 1
    fi
    
    # Verificar red Docker
    if docker network ls | grep -q "mw-panel-network"; then
        echo -e "${GREEN}✅ Red Docker configurada${NC}"
    else
        echo -e "${YELLOW}Creando red Docker...${NC}"
        docker network create mw-panel-network
    fi
}

# Función para preparar configuración
prepare_config() {
    echo -e "\n${YELLOW}Preparando configuración...${NC}"
    
    # Crear directorios si no existen
    mkdir -p "$PROJECT_ROOT/monitoring/prometheus"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/provisioning/datasources"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/provisioning/dashboards"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/dashboards"
    
    # Verificar archivos de configuración
    if [ -f "$PROJECT_ROOT/monitoring/prometheus/prometheus.yml" ]; then
        echo -e "${GREEN}✅ Configuración de Prometheus encontrada${NC}"
    else
        echo -e "${RED}❌ Falta configuración de Prometheus${NC}"
        exit 1
    fi
    
    if [ -f "$PROJECT_ROOT/monitoring/grafana/provisioning/datasources/prometheus.yml" ]; then
        echo -e "${GREEN}✅ Configuración de datasources encontrada${NC}"
    else
        echo -e "${RED}❌ Falta configuración de datasources${NC}"
        exit 1
    fi
}

# Función para iniciar servicios de monitoreo
start_monitoring() {
    echo -e "\n${YELLOW}Iniciando servicios de monitoreo...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Iniciar servicios con docker-compose
    docker-compose -f docker-compose.monitoring.yml up -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Servicios de monitoreo iniciados${NC}"
    else
        echo -e "${RED}❌ Error al iniciar servicios de monitoreo${NC}"
        exit 1
    fi
}

# Función para verificar servicios de monitoreo
verify_monitoring() {
    echo -e "\n${YELLOW}Verificando servicios de monitoreo...${NC}"
    
    # Esperar un momento para que los servicios inicien
    sleep 10
    
    # Verificar Prometheus
    if curl -s http://localhost:9090/-/healthy > /dev/null; then
        echo -e "${GREEN}✅ Prometheus está funcionando${NC}"
    else
        echo -e "${RED}❌ Prometheus no responde${NC}"
    fi
    
    # Verificar Grafana
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}✅ Grafana está funcionando${NC}"
    else
        echo -e "${YELLOW}⚠️  Grafana está iniciando...${NC}"
    fi
    
    # Verificar exporters
    if curl -s http://localhost:9100/metrics > /dev/null; then
        echo -e "${GREEN}✅ Node Exporter está funcionando${NC}"
    else
        echo -e "${YELLOW}⚠️  Node Exporter no responde${NC}"
    fi
    
    if curl -s http://localhost:9187/metrics > /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL Exporter está funcionando${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL Exporter no responde${NC}"
    fi
    
    if curl -s http://localhost:9121/metrics > /dev/null; then
        echo -e "${GREEN}✅ Redis Exporter está funcionando${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis Exporter no responde${NC}"
    fi
}

# Función para mostrar información de acceso
show_access_info() {
    echo -e "\n${BLUE}📊 URLs de Acceso al Sistema de Monitoreo${NC}"
    echo "=========================================="
    echo -e "🎯 ${GREEN}Prometheus${NC}: http://localhost:9090"
    echo -e "📊 ${GREEN}Grafana${NC}: http://localhost:3001"
    echo -e "   Usuario: admin"
    echo -e "   Contraseña: admin123"
    echo ""
    echo -e "📈 ${GREEN}Métricas MW Panel${NC}: http://localhost:3000/api/metrics"
    echo -e "📈 ${GREEN}Node Exporter${NC}: http://localhost:9100/metrics"
    echo -e "📈 ${GREEN}PostgreSQL Exporter${NC}: http://localhost:9187/metrics"
    echo -e "📈 ${GREEN}Redis Exporter${NC}: http://localhost:9121/metrics"
    echo ""
    echo -e "${YELLOW}Dashboards disponibles en Grafana:${NC}"
    echo "- MW Panel Overview"
    echo "- MW Panel Business Metrics"
    echo ""
    echo -e "${BLUE}Para detener el monitoreo:${NC} ./scripts/stop-monitoring.sh"
}

# Main
echo -e "${BLUE}Iniciando sistema de monitoreo...${NC}"

# Verificar servicios principales
check_main_services

# Preparar configuración
prepare_config

# Iniciar servicios
start_monitoring

# Verificar que todo esté funcionando
verify_monitoring

# Mostrar información de acceso
show_access_info

echo -e "\n${GREEN}✅ Sistema de monitoreo iniciado correctamente${NC}"