#!/bin/bash

# ====================================================================
# MW Panel 2.0 - SCRIPT DE PRODUCCIÓN CON BUILD COMPLETO
# ====================================================================
# IMPORTANTE: Este script es para PRODUCCIÓN con rebuilds completos
# Para desarrollo rápido, usa: ./start-all-optimized.sh
# 
# Este script:
# - Usa docker-compose.prod.yml (configuración de producción)
# - Hace rebuild completo de imágenes (--no-cache)
# - Optimizado para deployments en producción
# - Incluye health checks exhaustivos
# ====================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Función para mostrar el logo
show_logo() {
    echo -e "${CYAN}"
    echo "██████╗ ███╗   ██╗██╗    ██╗    ██████╗  █████╗ ███╗   ██╗███████╗██╗     "
    echo "██╔══██╗████╗  ██║██║    ██║    ██╔══██╗██╔══██╗████╗  ██║██╔════╝██║     "
    echo "██████╔╝██╔██╗ ██║██║ █╗ ██║    ██████╔╝███████║██╔██╗ ██║█████╗  ██║     "
    echo "██╔═══╝ ██║╚██╗██║██║███╗██║    ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║     "
    echo "██║     ██║ ╚████║╚███╔███╔╝    ██║     ██║  ██║██║ ╚████║███████╗███████╗"
    echo "╚═╝     ╚═╝  ╚═══╝ ╚══╝╚══╝     ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
    echo -e "${WHITE}                    Mundo World School - Plataforma de Gestión Educativa${NC}"
    echo -e "${PURPLE}                                      Versión 2.0${NC}"
    echo ""
}

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

# Función para verificar prerrequisitos
check_prerequisites() {
    log_message "STEP" "Verificando prerrequisitos del sistema..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_message "ERROR" "Docker no está instalado. Por favor instala Docker Desktop."
        exit 1
    fi
    
    # Verificar Docker Compose (versión moderna)
    if ! docker compose version &> /dev/null; then
        log_message "ERROR" "Docker Compose (comando 'docker compose') no está disponible."
        exit 1
    fi
    
    # Verificar que Docker esté corriendo
    if ! docker info &> /dev/null; then
        log_message "ERROR" "Docker no está corriendo. Por favor inicia Docker Desktop."
        exit 1
    fi
    
    log_message "INFO" "✅ Todos los prerrequisitos están satisfechos"
}

# Función para verificar directorio
check_directory() {
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_message "ERROR" "No se encontró docker-compose.prod.yml. Asegúrate de estar en el directorio correcto."
        exit 1
    fi
    
    if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
        log_message "ERROR" "No se encontraron los directorios frontend o backend."
        exit 1
    fi
    
    log_message "INFO" "✅ Directorio del proyecto verificado"
}

# Función para limpiar contenedores anteriores
cleanup_containers() {
    log_message "STEP" "Limpiando contenedores anteriores..."
    
    # Detener todos los contenedores del proyecto
    docker compose -f docker-compose.prod.yml down --remove-orphans &> /dev/null
    
    # Limpiar imágenes dangling
    docker image prune -f &> /dev/null
    
    log_message "INFO" "✅ Limpieza completada"
}

# Función para construir las imágenes
build_images() {
    log_message "STEP" "Construyendo imágenes Docker..."
    
    # Construir todas las imágenes sin caché
    if docker compose -f docker-compose.prod.yml build --no-cache; then
        log_message "INFO" "✅ Imágenes construidas exitosamente"
    else
        log_message "ERROR" "❌ Error al construir las imágenes"
        exit 1
    fi
}

# Función para iniciar los servicios
start_services() {
    log_message "STEP" "Iniciando servicios..."
    
    # Iniciar todos los servicios
    if docker compose -f docker-compose.prod.yml up -d; then
        log_message "INFO" "✅ Servicios iniciados exitosamente"
    else
        log_message "ERROR" "❌ Error al iniciar los servicios"
        exit 1
    fi
}

# Función para verificar el estado de los servicios
check_services_health() {
    log_message "STEP" "Verificando estado de los servicios..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -e "${CYAN}Intento $attempt/$max_attempts - Verificando servicios...${NC}"
        
        # Verificar base de datos
        if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U mwpanel &> /dev/null; then
            log_message "INFO" "✅ Base de datos PostgreSQL - OPERATIVA"
            db_ready=true
        else
            log_message "WARN" "⏳ Base de datos PostgreSQL - INICIANDO..."
            db_ready=false
        fi
        
        # Verificar Redis
        if docker compose -f docker-compose.prod.yml exec -T redis redis-cli ping &> /dev/null; then
            log_message "INFO" "✅ Redis Cache - OPERATIVO"
            redis_ready=true
        else
            log_message "WARN" "⏳ Redis Cache - INICIANDO..."
            redis_ready=false
        fi
        
        # Verificar Backend
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me | grep -q "401\|200"; then
            log_message "INFO" "✅ Backend API - OPERATIVO"
            backend_ready=true
        else
            log_message "WARN" "⏳ Backend API - INICIANDO..."
            backend_ready=false
        fi
        
        # Verificar Frontend/Nginx (intentar HTTPS y luego HTTP)
        if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/health 2>/dev/null | grep -q "200"; then
            log_message "INFO" "✅ Frontend/Nginx - OPERATIVO (HTTPS)"
            frontend_ready=true
        elif curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null | grep -q "200"; then
            log_message "INFO" "✅ Frontend/Nginx - OPERATIVO (HTTP)"
            frontend_ready=true
        else
            log_message "WARN" "⏳ Frontend/Nginx - INICIANDO..."
            frontend_ready=false
        fi
        
        # Si todos los servicios están listos, salir del bucle
        if [ "$db_ready" = true ] && [ "$redis_ready" = true ] && [ "$backend_ready" = true ] && [ "$frontend_ready" = true ]; then
            break
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_message "ERROR" "❌ Timeout: Algunos servicios no iniciaron correctamente"
        show_service_logs
        exit 1
    fi
}

# Función para mostrar logs de servicios
show_service_logs() {
    log_message "STEP" "Mostrando logs de servicios para diagnóstico..."
    
    echo -e "${YELLOW}=== LOGS BACKEND ===${NC}"
    docker compose -f docker-compose.prod.yml logs --tail=20 backend
    
    echo -e "${YELLOW}=== LOGS FRONTEND ===${NC}"
    docker compose -f docker-compose.prod.yml logs --tail=20 frontend
    
    echo -e "${YELLOW}=== LOGS DATABASE ===${NC}"
    docker compose -f docker-compose.prod.yml logs --tail=20 postgres
}

# Función para mostrar información final
show_final_info() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                     🎉 MW PANEL 2.0 INICIADO EXITOSAMENTE 🎉                 ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${WHITE}📋 INFORMACIÓN DE ACCESO:${NC}"
    echo -e "${CYAN}   🌐 Frontend (Producción): ${WHITE}https://plataforma.mundoworld.school${NC}"
    echo -e "${CYAN}   🔧 Backend API:           ${WHITE}https://plataforma.mundoworld.school/api${NC}"
    echo -e "${CYAN}   📊 API Docs (Swagger):    ${WHITE}https://plataforma.mundoworld.school/api${NC}"
    echo -e "${CYAN}   🗄️  Base de Datos:         ${WHITE}localhost:5432 (mwpanel)${NC}"
    echo -e "${CYAN}   🔴 Redis Cache:           ${WHITE}localhost:6379${NC}"
    echo ""
    echo -e "${WHITE}🔑 CREDENCIALES DE ACCESO:${NC}"
    echo -e "${YELLOW}   👨‍💼 Admin:      ${WHITE}admin@mwpanel.com     / Admin123!${NC}"
    echo -e "${YELLOW}   👨‍🏫 Profesor:   ${WHITE}profesor@mwpanel.com  / Profesor123!${NC}"
    echo -e "${YELLOW}   👨‍🎓 Estudiante: ${WHITE}estudiante@mwpanel.com / Estudiante123!${NC}"
    echo -e "${YELLOW}   👨‍👩‍👧‍👦 Familia:    ${WHITE}familia@mwpanel.com   / Familia123!${NC}"
    echo ""
    echo -e "${WHITE}🛠️  COMANDOS ÚTILES:${NC}"
    echo -e "${CYAN}   Ver logs:           ${WHITE}docker compose -f docker-compose.prod.yml logs -f [servicio]${NC}"
    echo -e "${CYAN}   Parar sistema:      ${WHITE}docker compose -f docker-compose.prod.yml down${NC}"
    echo -e "${CYAN}   Reiniciar sistema:  ${WHITE}docker compose -f docker-compose.prod.yml restart${NC}"
    echo -e "${CYAN}   Estado servicios:   ${WHITE}docker compose -f docker-compose.prod.yml ps${NC}"
    echo ""
    echo -e "${GREEN}✨ ¡El sistema está listo para usar! ✨${NC}"
    echo ""
}

# Función principal
main() {
    show_logo
    
    log_message "INFO" "Iniciando MW Panel 2.0..."
    
    # Verificar prerrequisitos
    check_prerequisites
    
    # Verificar directorio
    check_directory
    
    # Limpiar contenedores anteriores
    cleanup_containers
    
    # Construir imágenes
    build_images
    
    # Iniciar servicios
    start_services
    
    # Verificar estado de servicios
    check_services_health
    
    # Mostrar información final
    show_final_info
}

# Capturar Ctrl+C para limpieza
trap 'echo -e "\n${RED}Script interrumpido por usuario${NC}"; exit 1' INT

# Ejecutar función principal
main

# Mantener el script corriendo para mostrar logs en tiempo real
log_message "INFO" "Presiona Ctrl+C para detener el monitoreo de logs..."
docker compose -f docker-compose.prod.yml logs -f