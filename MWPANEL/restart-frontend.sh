#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - REINICIO RÁPIDO DEL FRONTEND
# =============================================================================
# Script optimizado para reiniciar solo el frontend sin afectar otros servicios
# =============================================================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

main() {
    echo -e "${BLUE}🔄 Reiniciando Frontend MW Panel...${NC}"
    echo ""
    
    # Verificar que el servicio existe
    if ! docker-compose ps frontend | grep -q "frontend"; then
        log_error "El servicio frontend no está definido o no existe"
        exit 1
    fi
    
    # Mostrar estado actual
    log_info "Estado actual del frontend:"
    docker-compose ps frontend
    echo ""
    
    # Reiniciar el frontend
    log_info "Reiniciando contenedor frontend..."
    if docker-compose restart frontend; then
        log_success "Frontend reiniciado exitosamente"
    else
        log_error "Error al reiniciar el frontend"
        exit 1
    fi
    
    # Esperar a que esté listo
    log_info "Esperando que el frontend esté listo..."
    local attempts=0
    local max_attempts=12  # 60 segundos
    
    while [ $attempts -lt $max_attempts ]; do
        if docker-compose exec -T frontend test -f /usr/share/nginx/html/index.html > /dev/null 2>&1; then
            log_success "Frontend está serviendo archivos correctamente"
            break
        fi
        
        echo -ne "${YELLOW}Verificando frontend... ${attempts}/${max_attempts}${NC}\r"
        sleep 5
        ((attempts++))
        
        if [ $attempts -eq $max_attempts ]; then
            log_warning "El frontend tardó más de lo esperado en estar listo"
        fi
    done
    
    echo ""
    
    # Mostrar estado final
    log_info "Estado final:"
    docker-compose ps frontend
    echo ""
    
    log_info "URLs de acceso:"
    echo -e "  ${GREEN}🌐 Frontend:${NC} https://plataforma.mundoworld.school"
    echo ""
    
    log_success "🎉 Reinicio del frontend completado!"
}

# Verificar argumentos
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "MW Panel 2.0 - Reinicio Rápido del Frontend"
    echo ""
    echo "Uso: ./restart-frontend.sh"
    echo ""
    echo "Este script:"
    echo "  ✅ Reinicia solo el contenedor frontend"
    echo "  ✅ Verifica que esté sirviendo archivos correctamente"
    echo "  ✅ No afecta a backend, base de datos o otros servicios"
    echo ""
    exit 0
fi

main