#!/bin/bash

# ====================================================================
# MW Panel 2.0 - Script de Parada Completa
# ====================================================================
# Este script detiene todo el sistema MW Panel 2.0 de forma segura
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

# Función para mostrar mensajes con timestamp
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
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
        "STEP")
            echo -e "${BLUE}[STEP]${NC} ${timestamp} - $message"
            ;;
    esac
}

echo -e "${CYAN}"
echo "███████╗████████╗ ██████╗ ██████╗     ███╗   ███╗██╗    ██╗    ██████╗  █████╗ ███╗   ██╗███████╗██╗     "
echo "██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗    ████╗ ████║██║    ██║    ██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     "
echo "███████╗   ██║   ██║   ██║██████╔╝    ██╔████╔██║██║ █╗ ██║    ██████╔╝███████║██╔██╗ ██║█████╗  ██║     "
echo "╚════██║   ██║   ██║   ██║██╔═══╝     ██║╚██╔╝██║██║███╗██║    ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     "
echo "███████║   ██║   ╚██████╔╝██║         ██║ ╚═╝ ██║╚███╔███╔╝    ██║     ██║  ██║██║ ╚████║███████╗███████╗"
echo "╚══════╝   ╚═╝    ╚═════╝ ╚═╝         ╚═╝     ╚═╝ ╚══╝╚══╝     ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
echo -e "${WHITE}                           Deteniendo Mundo World School...${NC}"
echo ""

log_message "STEP" "Iniciando proceso de parada del sistema MW Panel 2.0..."

# Verificar si docker-compose.prod.yml existe
if [ ! -f "docker-compose.prod.yml" ]; then
    log_message "ERROR" "No se encontró docker-compose.prod.yml. Asegúrate de estar en el directorio correcto."
    exit 1
fi

# Mostrar contenedores activos
log_message "INFO" "Contenedores activos:"
docker compose -f docker-compose.prod.yml ps

# Detener servicios
log_message "STEP" "Deteniendo servicios de MW Panel 2.0..."
if docker compose -f docker-compose.prod.yml down; then
    log_message "INFO" "✅ Servicios detenidos exitosamente"
else
    log_message "ERROR" "❌ Error al detener algunos servicios"
fi

# Opción para limpiar volúmenes (comentado por seguridad)
# read -p "¿Deseas eliminar también los volúmenes de datos? (y/N): " -n 1 -r
# echo
# if [[ $REPLY =~ ^[Yy]$ ]]; then
#     log_message "WARN" "Eliminando volúmenes de datos..."
#     docker-compose down -v
#     log_message "INFO" "✅ Volúmenes eliminados"
# fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               🛑 MW PANEL 2.0 DETENIDO EXITOSAMENTE 🛑               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${WHITE}📋 ESTADO ACTUAL:${NC}"
echo -e "${CYAN}   🔴 Todos los servicios han sido detenidos${NC}"
echo -e "${CYAN}   💾 Los datos se han conservado en los volúmenes${NC}"
echo ""
echo -e "${WHITE}🚀 PARA REINICIAR:${NC}"
echo -e "${CYAN}   Ejecuta: ${WHITE}./start-mwpanel.sh${NC}"
echo ""

log_message "INFO" "Sistema MW Panel 2.0 detenido correctamente."