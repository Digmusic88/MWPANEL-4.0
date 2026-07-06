#!/bin/bash

# ====================================================================
# MW Panel 2.0 - Script de Estado del Sistema
# ====================================================================
# Este script verifica el estado actual del sistema MW Panel 2.0
# Autor: Sistema MW Panel 2.0
# Fecha: $(date +%Y-%m-%d)
# ====================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "███████╗████████╗ █████╗ ████████╗██╗   ██╗███████╗    ███╗   ███╗██╗    ██╗    ██████╗  █████╗ ███╗   ██╗███████╗██╗     "
echo "██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║   ██║██╔════╝    ████╗ ████║██║    ██║    ██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     "
echo "███████╗   ██║   ███████║   ██║   ██║   ██║███████╗    ██╔████╔██║██║ █╗ ██║    ██████╔╝███████║██╔██╗ ██║█████╗  ██║     "
echo "╚════██║   ██║   ██╔══██║   ██║   ██║   ██║╚════██║    ██║╚██╔╝██║██║███╗██║    ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     "
echo "███████║   ██║   ██║  ██║   ██║   ╚██████╔╝███████║    ██║ ╚═╝ ██║╚███╔███╔╝    ██║     ██║  ██║██║ ╚████║███████╗███████╗"
echo "╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝    ╚═╝     ╚═╝ ╚══╝╚══╝     ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
echo -e "${WHITE}                                Estado del Sistema${NC}"
echo ""

# Función para verificar estado de servicios
check_service_status() {
    local service_name=$1
    local url=$2
    local expected_code=$3
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response_code" = "$expected_code" ]; then
        echo -e "${GREEN}✅ $service_name - OPERATIVO${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name - NO DISPONIBLE${NC}"
        return 1
    fi
}

echo -e "${WHITE}📊 ESTADO DE CONTENEDORES DOCKER:${NC}"
echo ""
docker-compose ps 2>/dev/null || echo -e "${RED}❌ Docker Compose no disponible o proyecto no iniciado${NC}"

echo ""
echo -e "${WHITE}🌐 VERIFICACIÓN DE SERVICIOS WEB:${NC}"
echo ""

# Verificar servicios
check_service_status "Frontend React" "http://localhost:5173" "200"
check_service_status "Backend API" "http://localhost:3000/api/health" "200"
check_service_status "Swagger Docs" "http://localhost:3000/api/docs" "200"

echo ""
echo -e "${WHITE}🗄️  VERIFICACIÓN DE BASE DE DATOS:${NC}"
echo ""

# Verificar PostgreSQL
if docker-compose exec -T database pg_isready -U postgres &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL - OPERATIVO${NC}"
else
    echo -e "${RED}❌ PostgreSQL - NO DISPONIBLE${NC}"
fi

# Verificar Redis
if docker-compose exec -T redis redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✅ Redis Cache - OPERATIVO${NC}"
else
    echo -e "${RED}❌ Redis Cache - NO DISPONIBLE${NC}"
fi

echo ""
echo -e "${WHITE}💾 INFORMACIÓN DE VOLÚMENES:${NC}"
echo ""
docker volume ls | grep mw-panel 2>/dev/null || echo -e "${YELLOW}⚠️  No se encontraron volúmenes de MW Panel${NC}"

echo ""
echo -e "${WHITE}📋 PUERTOS EN USO:${NC}"
echo ""
echo -e "${CYAN}   🌐 Frontend:     ${WHITE}http://localhost:5173${NC}"
echo -e "${CYAN}   🔧 Backend API:  ${WHITE}http://localhost:3000/api${NC}"
echo -e "${CYAN}   📊 Swagger:      ${WHITE}http://localhost:3000/api/docs${NC}"
echo -e "${CYAN}   🗄️  PostgreSQL:   ${WHITE}localhost:5432${NC}"
echo -e "${CYAN}   🔴 Redis:        ${WHITE}localhost:6379${NC}"

echo ""
echo -e "${WHITE}🛠️  COMANDOS ÚTILES:${NC}"
echo -e "${CYAN}   Iniciar:        ${WHITE}./start-mwpanel.sh${NC}"
echo -e "${CYAN}   Detener:        ${WHITE}./stop-mwpanel.sh${NC}"
echo -e "${CYAN}   Ver logs:       ${WHITE}docker-compose logs -f [servicio]${NC}"
echo -e "${CYAN}   Reiniciar:      ${WHITE}docker-compose restart${NC}"
echo ""