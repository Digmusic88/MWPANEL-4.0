#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT DE INICIO OPTIMIZADO
# =============================================================================
# Version: 2.0
# Optimizaciones:
# - Health checks más inteligentes
# - Paralelización de verificaciones
# - Mejor manejo de errores
# - Reinicio rápido sin rebuild
# - Validación de dependencias críticas
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Variables de configuración
POSTGRES_MAX_WAIT=60
REDIS_MAX_WAIT=30
BACKEND_MAX_WAIT=120
HEALTH_CHECK_INTERVAL=5

# Función para mostrar banner optimizado
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                    MW PANEL 2.0                          ║"
    echo "║               INICIO OPTIMIZADO v2.0                     ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Funciones de logging mejoradas
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}🚀 $1${NC}"; }

# Función mejorada para verificar Docker
check_docker() {
    log_step "Verificando Docker..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker no está corriendo. Iniciando Docker..."
        # Intentar iniciar Docker en sistemas que lo permitan
        systemctl start docker 2>/dev/null || true
        sleep 5
        
        if ! docker info > /dev/null 2>&1; then
            log_error "No se pudo iniciar Docker. Por favor inicia Docker Desktop manualmente."
            exit 1
        fi
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose no está instalado"
        exit 1
    fi
    
    log_success "Docker está corriendo y listo"
}

# Verificación mejorada de archivos críticos
check_files() {
    log_step "Verificando archivos críticos..."
    
    local missing_files=()
    
    # Archivos críticos que deben existir
    local critical_files=(
        "docker-compose.yml"
        "backend/Dockerfile.prod"
        "frontend/Dockerfile.prod"
        "backend/package.json"
        "frontend/package.json"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        log_error "Archivos críticos faltantes:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    # Verificaciones opcionales
    if [ ! -f ".env" ]; then
        log_warning "Archivo .env no encontrado, usando valores por defecto"
    fi
    
    if [ ! -f "backend/google-credentials.json" ]; then
        log_warning "Google credentials no encontradas, funcionalidad limitada"
    fi
    
    log_success "Todos los archivos críticos están presentes"
}

# Limpieza inteligente
cleanup_if_needed() {
    if [ "$1" = "--clean" ]; then
        log_step "Limpieza completa del sistema..."
        
        # Parar servicios gracefully
        docker-compose down --timeout 30 2>/dev/null || true
        
        # Limpiar volúmenes y networks huérfanos
        docker-compose down -v --remove-orphans 2>/dev/null || true
        
        # Limpiar imágenes huérfanas específicas del proyecto
        docker image prune -f --filter="label=project=mw-panel" 2>/dev/null || true
        
        log_success "Limpieza completada"
    elif [ "$1" = "--restart" ]; then
        log_step "Reinicio rápido sin rebuild..."
        docker-compose restart
        log_success "Servicios reiniciados"
    fi
}

# Health check mejorado para PostgreSQL
wait_for_postgres() {
    log_step "Verificando PostgreSQL..."
    
    local attempts=0
    local max_attempts=$((POSTGRES_MAX_WAIT / HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U ${DB_USER:-mwpanel} > /dev/null 2>&1; then
            # Verificar que la base de datos específica existe y es accesible
            if docker-compose exec -T postgres psql -U ${DB_USER:-mwpanel} -d ${DB_NAME:-mwpanel} -c "SELECT 1;" > /dev/null 2>&1; then
                log_success "PostgreSQL listo y base de datos accesible"
                return 0
            fi
        fi
        
        echo -ne "${YELLOW}Esperando PostgreSQL... $((attempts * HEALTH_CHECK_INTERVAL))s/${POSTGRES_MAX_WAIT}s${NC}\r"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    log_error "PostgreSQL no respondió en ${POSTGRES_MAX_WAIT}s"
    return 1
}

# Health check mejorado para Redis
wait_for_redis() {
    log_step "Verificando Redis..."
    
    local attempts=0
    local max_attempts=$((REDIS_MAX_WAIT / HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
            log_success "Redis listo y respondiendo"
            return 0
        fi
        
        echo -ne "${YELLOW}Esperando Redis... $((attempts * HEALTH_CHECK_INTERVAL))s/${REDIS_MAX_WAIT}s${NC}\r"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    log_error "Redis no respondió en ${REDIS_MAX_WAIT}s"
    return 1
}

# Health check inteligente para Backend
wait_for_backend() {
    log_step "Verificando Backend API..."
    
    local attempts=0
    local max_attempts=$((BACKEND_MAX_WAIT / HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        # Verificar que el contenedor está corriendo
        if ! docker-compose ps backend | grep -q "Up"; then
            echo -ne "${RED}Backend container no está corriendo... $((attempts * HEALTH_CHECK_INTERVAL))s${NC}\r"
            sleep $HEALTH_CHECK_INTERVAL
            ((attempts++))
            continue
        fi
        
        # Verificar health endpoint
        if docker-compose exec -T backend curl -f http://localhost:3000/api/health/status > /dev/null 2>&1; then
            log_success "Backend API listo y respondiendo"
            return 0
        fi
        
        echo -ne "${YELLOW}Esperando Backend API... $((attempts * HEALTH_CHECK_INTERVAL))s/${BACKEND_MAX_WAIT}s${NC}\r"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    log_error "Backend API no respondió en ${BACKEND_MAX_WAIT}s"
    
    # Mostrar logs del backend para debugging
    log_warning "Últimos logs del backend:"
    docker-compose logs --tail=10 backend
    
    return 1
}

# Verificación paralela de servicios críticos
wait_for_critical_services() {
    log_step "Verificando servicios críticos en paralelo..."
    
    # Crear funciones background para verificación paralela
    wait_for_postgres &
    local postgres_pid=$!
    
    wait_for_redis &
    local redis_pid=$!
    
    # Esperar a que ambos terminen
    local postgres_success=1
    local redis_success=1
    
    if wait $postgres_pid; then
        postgres_success=0
    fi
    
    if wait $redis_pid; then
        redis_success=0
    fi
    
    if [ $postgres_success -ne 0 ] || [ $redis_success -ne 0 ]; then
        log_error "Algunos servicios críticos fallaron al iniciar"
        return 1
    fi
    
    log_success "Todos los servicios críticos están listos"
    return 0
}

# Inicialización de configuraciones del sistema
initialize_system_settings() {
    log_step "Verificando configuraciones del sistema..."
    
    # Verificar si las configuraciones básicas existen
    local response=$(docker-compose exec -T backend curl -s http://localhost:3000/api/settings 2>/dev/null || echo "")
    
    if [ -z "$response" ] || ! echo "$response" | grep -q "system_systemName"; then
        log_step "Inicializando configuraciones por defecto..."
        if docker-compose exec -T backend curl -s -X POST http://localhost:3000/api/settings/initialize > /dev/null 2>&1; then
            log_success "Configuraciones del sistema inicializadas"
        else
            log_warning "No se pudieron inicializar las configuraciones automáticamente"
        fi
    else
        log_success "Configuraciones del sistema ya están presentes"
    fi
}

# Ejecución de semillas mejorada
run_seeds() {
    log_step "Verificando datos de prueba..."
    
    # Verificar si ya existen usuarios de prueba
    local user_count=$(docker-compose exec -T postgres psql -U ${DB_USER:-mwpanel} -d ${DB_NAME:-mwpanel} -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$user_count" -gt 5 ]; then
        log_success "Datos de prueba ya existen ($user_count usuarios)"
        return 0
    fi
    
    log_step "Ejecutando semillas de la base de datos..."
    
    if docker-compose exec -T backend npm run seed; then
        log_success "Semillas ejecutadas exitosamente"
        
        echo ""
        log_info "Usuarios de prueba disponibles:"
        echo -e "  ${GREEN}👨‍💼 Admin:${NC} admin@mwpanel.com / admin123"
        echo -e "  ${GREEN}👨‍🏫 Profesor:${NC} profesor@mwpanel.com / profesor123"
        echo -e "  ${GREEN}👨‍🎓 Estudiante:${NC} estudiante@mwpanel.com / estudiante123"
        echo -e "  ${GREEN}👨‍👩‍👧‍👦 Familia:${NC} familia@mwpanel.com / familia123"
        echo ""
    else
        log_warning "Las semillas fallaron, pero el sistema puede funcionar"
        return 0  # No fallar el startup por esto
    fi
}

# Estado detallado del sistema
show_system_status() {
    echo ""
    log_step "Estado detallado del sistema:"
    echo ""
    
    # Mostrar estado de containers con health
    docker-compose ps
    echo ""
    
    # Verificar conectividad de servicios
    log_info "Verificando conectividad de servicios:"
    
    # Test PostgreSQL
    if docker-compose exec -T postgres pg_isready -U ${DB_USER:-mwpanel} > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ PostgreSQL:${NC} Conectado y respondiendo"
    else
        echo -e "  ${RED}❌ PostgreSQL:${NC} No responde"
    fi
    
    # Test Redis
    if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
        echo -e "  ${GREEN}✅ Redis:${NC} Conectado y respondiendo"
    else
        echo -e "  ${RED}❌ Redis:${NC} No responde"
    fi
    
    # Test Backend
    if docker-compose exec -T backend curl -f http://localhost:3000/api/health/status > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Backend API:${NC} Respondiendo correctamente"
    else
        echo -e "  ${RED}❌ Backend API:${NC} No responde"
    fi
    
    # Test Frontend
    if docker-compose exec -T frontend test -f /usr/share/nginx/html/index.html; then
        echo -e "  ${GREEN}✅ Frontend:${NC} Archivos servidos correctamente"
    else
        echo -e "  ${RED}❌ Frontend:${NC} Archivos no encontrados"
    fi
    
    echo ""
    log_info "URLs de acceso:"
    echo -e "  ${CYAN}🌐 Producción:${NC} https://plataforma.mundoworld.school"
    echo -e "  ${CYAN}🎮 TypeQuest:${NC} https://typequest.mundoworld.school"
    echo -e "  ${CYAN}📊 API Docs:${NC} https://plataforma.mundoworld.school/api"
    echo ""
    
    # Mostrar información del sistema
    log_info "Información del sistema:"
    echo -e "  ${CYAN}📁 Directorio:${NC} $(pwd)"
    echo -e "  ${CYAN}🕐 Iniciado:${NC} $(date)"
    echo -e "  ${CYAN}👤 Usuario:${NC} $(whoami)"
    echo -e "  ${CYAN}💾 Espacio:${NC} $(df -h . | tail -1 | awk '{print $4}') disponible"
}

# Función principal optimizada
main() {
    local start_time=$(date +%s)
    
    show_banner
    
    # Verificaciones previas en paralelo
    check_docker &
    local docker_pid=$!
    
    check_files &
    local files_pid=$!
    
    # Esperar verificaciones previas
    wait $docker_pid $files_pid
    
    # Limpiar si se solicita
    cleanup_if_needed $1

    # Detectar cambios en el código del backend y reconstruir si es necesario
    log_step "Verificando cambios en el código del backend..."
    local src_date=$(stat -c %Y backend/src/modules/communications/communications.controller.ts 2>/dev/null || echo 0)
    local need_rebuild=false

    if docker ps --format '{{.Names}}' | grep -q "mw-panel-backend"; then
        local container_date=$(docker exec mw-panel-backend stat -c %Y /app/dist/modules/communications/communications.controller.js 2>/dev/null || echo 0)
        if [ "$src_date" -gt "$container_date" ]; then
            log_warning "Se detectaron cambios en el código fuente del backend"
            need_rebuild=true
        fi
    else
        # Si no hay contenedor, siempre construir
        need_rebuild=true
    fi

    if [ "$need_rebuild" = true ]; then
        log_step "Reconstruyendo imagen del backend..."
        if docker-compose build --no-cache backend; then
            log_success "Imagen del backend reconstruida"
        else
            log_warning "No se pudo reconstruir el backend, continuando con imagen existente..."
        fi
    else
        log_success "No hay cambios en el código del backend"
    fi

    # Iniciar servicios
    log_step "Iniciando servicios con Docker Compose..."
    if docker-compose up -d; then
        log_success "Servicios iniciados"
    else
        log_error "Error iniciando servicios"
        exit 1
    fi

    # Actualizar IP de nginx del sistema
    if [ -x "/opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh" ]; then
        log_step "Actualizando configuración de nginx..."
        /opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh 2>/dev/null || true
    fi
    
    # Verificar servicios críticos en paralelo
    if ! wait_for_critical_services; then
        log_error "Los servicios críticos no están disponibles"
        exit 1
    fi
    
    # Verificar backend
    if ! wait_for_backend; then
        log_error "El Backend API no está disponible"
        exit 1
    fi
    
    # Inicializar configuraciones
    initialize_system_settings
    
    # Ejecutar semillas
    run_seeds
    
    # Mostrar estado final
    show_system_status
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_success "🎉 ¡Sistema MW Panel 2.0 iniciado en ${duration}s!"
    log_info "El sistema está completamente operativo y listo para usar."
    echo ""
}

# Función de ayuda mejorada
show_help() {
    echo "MW Panel 2.0 - Script de Inicio Optimizado v2.1"
    echo ""
    echo "Uso:"
    echo "  ./start-all-optimized.sh            # Inicio con auto-detección de cambios"
    echo "  ./start-all-optimized.sh --clean    # Limpieza completa + inicio"
    echo "  ./start-all-optimized.sh --restart  # Reinicio rápido sin rebuild"
    echo "  ./start-all-optimized.sh --help     # Muestra esta ayuda"
    echo ""
    echo "Mejoras en v2.1:"
    echo "  ✅ Auto-detección de cambios en código del backend"
    echo "  ✅ Reconstrucción automática de imagen si hay cambios"
    echo "  ✅ Actualización automática de IP en nginx del sistema"
    echo "  ✅ Nginx y Certbot de Docker deshabilitados (usa nginx del sistema)"
    echo "  ✅ Health checks inteligentes con timeouts configurables"
    echo "  ✅ Verificación paralela de servicios críticos"
    echo "  ✅ Inicialización automática de configuraciones del sistema"
    echo "  ✅ Diagnóstico detallado de conectividad"
    echo ""
    echo "NOTA: Este sistema usa nginx del host (no Docker) para servir el tráfico."
    echo "      El script auto-fix-nginx-backend-ip.sh mantiene la IP sincronizada."
    echo ""
}

# Manejo de argumentos
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    *)
        main $1
        ;;
esac