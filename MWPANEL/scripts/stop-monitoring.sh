#!/bin/bash

# Script para detener el sistema de monitoreo
# Uso: ./stop-monitoring.sh

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🛑 MW Panel - Deteniendo Sistema de Monitoreo${NC}"
echo "============================================="

# Función para detener servicios
stop_monitoring() {
    echo -e "\n${YELLOW}Deteniendo servicios de monitoreo...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Detener servicios con docker-compose
    docker-compose -f docker-compose.monitoring.yml down
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Servicios de monitoreo detenidos${NC}"
    else
        echo -e "${RED}❌ Error al detener servicios${NC}"
        exit 1
    fi
}

# Función para limpiar volúmenes (opcional)
clean_volumes() {
    echo -e "\n${YELLOW}¿Deseas eliminar los datos de monitoreo? (y/N)${NC}"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${YELLOW}Eliminando volúmenes de datos...${NC}"
        
        docker volume rm mw-panel_prometheus-data 2>/dev/null
        docker volume rm mw-panel_grafana-data 2>/dev/null
        
        echo -e "${GREEN}✅ Volúmenes eliminados${NC}"
    else
        echo -e "${BLUE}Datos conservados${NC}"
    fi
}

# Main
stop_monitoring

# Preguntar sobre limpieza de volúmenes
clean_volumes

echo -e "\n${GREEN}✅ Sistema de monitoreo detenido${NC}"