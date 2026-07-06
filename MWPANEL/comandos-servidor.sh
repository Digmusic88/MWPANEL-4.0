#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - COMANDOS ÚTILES PARA GESTIÓN DEL SERVIDOR
# =============================================================================
# Colección de comandos para gestionar tu servidor de forma fácil
# =============================================================================

SERVER_IP="91.99.205.204"

# Colores
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

show_help() {
    echo -e "${BLUE}🛠️  MW PANEL 2.0 - COMANDOS DEL SERVIDOR${NC}"
    echo
    echo -e "${YELLOW}TRANSFERENCIA DE ARCHIVOS:${NC}"
    echo -e "  $0 subir           - Subir todos los archivos al servidor"
    echo -e "  $0 subir-rapido    - Subir solo archivos modificados"
    echo
    echo -e "${YELLOW}CONEXIÓN Y GESTIÓN:${NC}"
    echo -e "  $0 conectar        - Conectar al servidor por SSH"
    echo -e "  $0 estado          - Ver estado de los servicios"
    echo -e "  $0 logs            - Ver logs en tiempo real"
    echo -e "  $0 reiniciar       - Reiniciar todos los servicios"
    echo
    echo -e "${YELLOW}INSTALACIÓN:${NC}"
    echo -e "  $0 instalar DOMINIO EMAIL - Instalar MW Panel completo"
    echo
    echo -e "${YELLOW}EJEMPLOS:${NC}"
    echo -e "  $0 subir"
    echo -e "  $0 instalar panel.miescuela.com admin@miescuela.com"
    echo -e "  $0 logs"
}

case "${1:-help}" in
    "subir")
        echo -e "${BLUE}📁 Subiendo archivos al servidor...${NC}"
        ./subir-archivos.sh
        ;;
    
    "subir-rapido")
        echo -e "${BLUE}⚡ Subida rápida (solo cambios)...${NC}"
        rsync -avz --progress --delete \
            --exclude="node_modules/" --exclude=".git/" --exclude="dist/" \
            -e "ssh -i ~/.ssh/mw_panel_hetzner" \
            ./ root@$SERVER_IP:/opt/mw-panel/
        ;;
    
    "conectar")
        echo -e "${BLUE}🔐 Conectando al servidor...${NC}"
        ssh mw-panel-server
        ;;
    
    "estado")
        echo -e "${BLUE}📊 Verificando estado de servicios...${NC}"
        ssh mw-panel-server 'cd /opt/mw-panel && docker compose -f docker-compose.prod.yml ps'
        ;;
    
    "logs")
        echo -e "${BLUE}📋 Mostrando logs en tiempo real...${NC}"
        echo -e "${YELLOW}Presiona Ctrl+C para salir${NC}"
        ssh mw-panel-server 'cd /opt/mw-panel && docker compose -f docker-compose.prod.yml logs -f'
        ;;
    
    "reiniciar")
        echo -e "${BLUE}🔄 Reiniciando servicios...${NC}"
        ssh mw-panel-server 'cd /opt/mw-panel && docker compose -f docker-compose.prod.yml restart'
        echo -e "${GREEN}✅ Servicios reiniciados${NC}"
        ;;
    
    "instalar")
        if [[ $# -lt 3 ]]; then
            echo -e "${RED}❌ Error: Faltan parámetros${NC}"
            echo -e "${YELLOW}Uso: $0 instalar DOMINIO EMAIL${NC}"
            exit 1
        fi
        echo -e "${BLUE}🚀 Instalando MW Panel 2.0...${NC}"
        ./instalar-servidor.sh "$2" "$3"
        ;;
    
    "help"|*)
        show_help
        ;;
esac