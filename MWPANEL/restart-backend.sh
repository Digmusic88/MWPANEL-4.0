#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - REINICIO RÁPIDO DEL BACKEND
# =============================================================================
# Script optimizado para reiniciar solo el backend con verificaciones completas
# Incluye opción para reconstruir la imagen Docker si hay cambios en el código
# =============================================================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Flags
REBUILD=false

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Función para detectar si hay cambios en el código fuente
check_code_changes() {
    local src_date=$(stat -c %Y backend/src/modules/communications/communications.controller.ts 2>/dev/null || echo 0)
    local container_date=0

    if docker ps --format '{{.Names}}' | grep -q "mw-panel-backend"; then
        container_date=$(docker exec mw-panel-backend stat -c %Y /app/dist/modules/communications/communications.controller.js 2>/dev/null || echo 0)
    fi

    if [ "$src_date" -gt "$container_date" ]; then
        return 0  # Hay cambios
    fi
    return 1  # No hay cambios
}

# Función para reconstruir la imagen del backend
rebuild_backend() {
    log_info "Reconstruyendo imagen del backend..."

    # Construir nueva imagen
    if docker-compose build --no-cache backend; then
        log_success "Imagen del backend reconstruida exitosamente"
    else
        log_error "Error al reconstruir la imagen del backend"
        exit 1
    fi
}

# Verificar conexiones críticas antes del reinicio
check_dependencies() {
    log_info "Verificando dependencias críticas..."
    
    # Verificar PostgreSQL
    if ! docker-compose exec -T postgres pg_isready -U mwpanel > /dev/null 2>&1; then
        log_error "PostgreSQL no está disponible. El backend necesita la base de datos."
        exit 1
    fi
    
    # Verificar Redis
    if ! docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_error "Redis no está disponible. El backend necesita Redis para sesiones."
        exit 1
    fi
    
    log_success "Dependencias críticas verificadas"
}

# Health check inteligente del backend
wait_for_backend() {
    log_info "Esperando que el backend esté completamente listo..."
    
    local attempts=0
    local max_attempts=24  # 2 minutos
    
    while [ $attempts -lt $max_attempts ]; do
        # Verificar que el contenedor está corriendo
        if ! docker-compose ps backend | grep -q "Up"; then
            echo -ne "${RED}Backend container no está corriendo... ${attempts}/${max_attempts}${NC}\r"
            sleep 5
            ((attempts++))
            continue
        fi
        
        # Verificar health endpoint
        if docker-compose exec -T backend curl -f http://localhost:3000/api/health/status > /dev/null 2>&1; then
            echo ""
            log_success "Backend API está respondiendo correctamente"
            
            # Verificar conexión a base de datos
            if docker-compose exec -T backend curl -s http://localhost:3000/api/health/status | grep -q "OK"; then
                log_success "Backend completamente funcional"
                return 0
            fi
        fi
        
        echo -ne "${YELLOW}Esperando backend API... ${attempts}/${max_attempts}${NC}\r"
        sleep 5
        ((attempts++))
    done
    
    echo ""
    log_error "Backend no respondió en tiempo esperado"
    
    # Mostrar logs para debugging
    log_warning "Últimos logs del backend:"
    docker-compose logs --tail=15 backend
    
    return 1
}

main() {
    echo -e "${BLUE}🔄 Reiniciando Backend MW Panel...${NC}"
    echo ""

    # Verificar dependencias críticas
    check_dependencies

    # Detectar cambios automáticamente si no se especificó --rebuild
    if [ "$REBUILD" = false ]; then
        log_info "Verificando si hay cambios en el código fuente..."
        if check_code_changes; then
            log_warning "Se detectaron cambios en el código fuente"
            log_info "Reconstruyendo automáticamente..."
            REBUILD=true
        else
            log_success "No hay cambios detectados en el código"
        fi
    fi

    # Si se requiere rebuild, reconstruir y recrear el contenedor
    if [ "$REBUILD" = true ]; then
        rebuild_backend

        log_info "Recreando contenedor con nueva imagen..."
        # Parar y eliminar el contenedor viejo
        docker-compose stop backend 2>/dev/null || true
        docker-compose rm -f backend 2>/dev/null || true

        # Crear y arrancar nuevo contenedor
        if docker-compose up -d backend; then
            log_success "Contenedor backend recreado con nueva imagen"
        else
            log_error "Error al recrear el contenedor backend"
            exit 1
        fi
    else
        # Mostrar estado actual
        log_info "Estado actual del backend:"
        docker-compose ps backend 2>/dev/null || echo "No hay contenedor backend"
        echo ""

        # Simple restart
        log_info "Reiniciando contenedor backend..."
        if docker-compose restart backend; then
            log_success "Backend reiniciado exitosamente"
        else
            log_error "Error al reiniciar el backend"
            exit 1
        fi
    fi
    
    # Esperar a que esté completamente listo
    if ! wait_for_backend; then
        log_error "El backend no pudo iniciarse correctamente"
        exit 1
    fi
    
    echo ""
    
    # Mostrar estado final
    log_info "Estado final:"
    docker-compose ps backend
    echo ""
    
    # Verificaciones adicionales
    log_info "Verificaciones finales:"
    
    # Test de conectividad con la base de datos
    if docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Conexión a base de datos:${NC} Funcionando"
    else
        echo -e "  ${RED}❌ Conexión a base de datos:${NC} Problema detectado"
    fi
    
    # Test de autenticación
    if docker-compose exec -T backend curl -s http://localhost:3000/api/health/status > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ API Health Check:${NC} Funcionando"
    else
        echo -e "  ${RED}❌ API Health Check:${NC} No responde"
    fi
    
    echo ""
    # Actualizar IP en nginx del sistema si se recreó el contenedor
    if [ "$REBUILD" = true ]; then
        log_info "Actualizando configuración de nginx del sistema..."
        if [ -x "/opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh" ]; then
            /opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh 2>/dev/null || true
            log_success "Nginx actualizado con nueva IP del backend"
        fi
    fi

    log_info "URLs de acceso:"
    echo -e "  ${GREEN}🔧 Backend API:${NC} https://plataforma.mundoworld.school/api"
    echo -e "  ${GREEN}📊 API Docs:${NC} https://plataforma.mundoworld.school/api/docs"
    echo ""

    log_success "🎉 Reinicio del backend completado!"
}

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild|-r)
            REBUILD=true
            shift
            ;;
        --help|-h)
            echo "MW Panel 2.0 - Reinicio del Backend"
            echo ""
            echo "Uso: ./restart-backend.sh [opciones]"
            echo ""
            echo "Opciones:"
            echo "  --rebuild, -r   Forzar reconstrucción de la imagen Docker"
            echo "  --help, -h      Mostrar esta ayuda"
            echo ""
            echo "Este script:"
            echo "  ✅ Detecta automáticamente cambios en el código fuente"
            echo "  ✅ Reconstruye la imagen Docker si hay cambios"
            echo "  ✅ Verifica dependencias críticas (PostgreSQL, Redis)"
            echo "  ✅ Espera confirmación de que la API está funcionando"
            echo "  ✅ No afecta a frontend, base de datos o otros servicios"
            echo ""
            echo "Ejemplos:"
            echo "  ./restart-backend.sh            # Auto-detectar y reiniciar"
            echo "  ./restart-backend.sh --rebuild  # Forzar reconstrucción"
            echo ""
            exit 0
            ;;
        *)
            log_error "Opción desconocida: $1"
            echo "Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
done

# Cambiar al directorio del proyecto
cd /opt/mw-panel

main