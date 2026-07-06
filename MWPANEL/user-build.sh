#!/bin/bash

# =============================================================================
# MW PANEL USER BUILD SCRIPT
# =============================================================================
# Script para que mwpanel-user pueda ejecutar builds con permisos de root
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 MW Panel User Build Script${NC}"
echo -e "${BLUE}================================${NC}"

# Verificar que el usuario es mwpanel-user
if [ "$(whoami)" != "mwpanel-user" ]; then
    echo -e "${RED}❌ Este script debe ser ejecutado como usuario 'mwpanel-user'${NC}"
    exit 1
fi

# Función para mostrar ayuda
show_help() {
    echo -e "${YELLOW}📋 Comandos disponibles:${NC}"
    echo ""
    echo -e "${GREEN}Frontend Build:${NC}"
    echo "  build       - Build del frontend con permisos de root"
    echo "  install     - Instalar dependencias npm"
    echo "  dev         - Iniciar servidor de desarrollo"
    echo "  lint        - Ejecutar linter"
    echo ""
    echo -e "${GREEN}Deployment:${NC}"
    echo "  deploy      - Deploy completo con cache busting"
    echo "  restart-be  - Reiniciar backend"
    echo "  restart-fe  - Reiniciar frontend"
    echo "  status      - Estado del sistema"
    echo ""
    echo -e "${GREEN}Docker:${NC}"
    echo "  docker-ps   - Ver contenedores"
    echo "  docker-logs - Ver logs de contenedor"
    echo ""
    echo -e "${YELLOW}Ejemplo de uso:${NC}"
    echo "  ./user-build.sh build"
    echo "  ./user-build.sh deploy"
}

# Procesar comandos
case "${1}" in
    "build")
        echo -e "${YELLOW}🔨 Ejecutando build como root...${NC}"
        cd /opt/mw-panel/frontend
        sudo npm run build
        ;;
    "install")
        echo -e "${YELLOW}📦 Instalando dependencias como root...${NC}"
        cd /opt/mw-panel/frontend
        sudo npm install --legacy-peer-deps
        ;;
    "dev")
        echo -e "${YELLOW}🚀 Iniciando servidor dev como root...${NC}"
        cd /opt/mw-panel/frontend
        sudo npm run dev
        ;;
    "lint")
        echo -e "${YELLOW}🔍 Ejecutando linter como root...${NC}"
        cd /opt/mw-panel/frontend
        sudo npm run lint
        ;;
    "deploy")
        echo -e "${YELLOW}🚀 Ejecutando deploy completo como root...${NC}"
        sudo /opt/mw-panel/deploy-with-cache-bust.sh
        ;;
    "restart-be")
        echo -e "${YELLOW}🔄 Reiniciando backend como root...${NC}"
        sudo /opt/mw-panel/restart-backend.sh
        ;;
    "restart-fe")
        echo -e "${YELLOW}🔄 Reiniciando frontend como root...${NC}"
        sudo /opt/mw-panel/restart-frontend.sh
        ;;
    "status")
        echo -e "${YELLOW}📊 Estado del sistema...${NC}"
        sudo /opt/mw-panel/status-complete.sh
        ;;
    "docker-ps")
        echo -e "${YELLOW}🐳 Contenedores Docker...${NC}"
        sudo docker ps
        ;;
    "docker-logs")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Especifica el nombre del contenedor${NC}"
            echo -e "${YELLOW}Ejemplo: ./user-build.sh docker-logs mw-panel-nginx${NC}"
            exit 1
        fi
        echo -e "${YELLOW}📋 Logs del contenedor $2...${NC}"
        sudo docker logs "$2"
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Comando no reconocido: $1${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Comando ejecutado exitosamente${NC}"