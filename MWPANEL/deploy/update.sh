#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT DE ACTUALIZACIÓN SIN DOWNTIME
# =============================================================================
# Actualización de la aplicación con backup automático y rollback
# =============================================================================

set -euo pipefail

# Colores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'

# Variables de configuración
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="/var/log/mw-panel-update.log"
readonly BACKUP_DIR="/var/backups/mw-panel"

# Variables configurables
BRANCH=${BRANCH:-main}
AUTO_BACKUP=${AUTO_BACKUP:-true}
SKIP_TESTS=${SKIP_TESTS:-false}
FORCE_UPDATE=${FORCE_UPDATE:-false}
ROLLBACK_ON_FAILURE=${ROLLBACK_ON_FAILURE:-true}

# Funciones de logging
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} $*" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}"
    log "[INFO] $*"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}"
    log "[SUCCESS] $*"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}"
    log "[WARNING] $*"
}

log_error() {
    echo -e "${RED}❌ $*${NC}"
    log "[ERROR] $*"
}

log_step() {
    echo -e "${PURPLE}🚀 $*${NC}"
    log "[STEP] $*"
}

# Banner del script
show_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                     MW PANEL 2.0 UPDATE                         ║
║                 ACTUALIZACIÓN SIN DOWNTIME                      ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
MW Panel 2.0 - Script de Actualización

USO:
    $0 [OPCIONES]

OPCIONES:
    -h, --help              Mostrar esta ayuda
    -b, --branch RAMA       Rama a actualizar (por defecto: main)
    -n, --no-backup         No crear backup antes de actualizar
    -t, --skip-tests        Omitir pruebas de verificación
    -f, --force             Forzar actualización sin confirmación
    -r, --no-rollback       No hacer rollback automático en caso de error
    --dry-run               Simular actualización sin ejecutar cambios

EJEMPLOS:
    $0                      # Actualización normal desde rama main
    $0 -b develop           # Actualizar desde rama develop
    $0 -f -n               # Actualización forzada sin backup
    $0 --dry-run           # Simular actualización

VARIABLES DE ENTORNO:
    BRANCH                  Rama de Git a actualizar
    AUTO_BACKUP             Crear backup automático (true/false)
    SKIP_TESTS              Omitir pruebas (true/false)
    FORCE_UPDATE            Forzar actualización (true/false)
    ROLLBACK_ON_FAILURE     Rollback automático en caso de error (true/false)
EOF
}

# Función para verificar requisitos
check_requirements() {
    log_step "Verificando requisitos..."

    # Verificar que estamos en el directorio correcto
    if [[ ! -f "$APP_DIR/docker-compose.prod.yml" ]]; then
        log_error "No se encontró docker-compose.prod.yml en $APP_DIR"
        exit 1
    fi

    # Verificar Git
    if ! command -v git >/dev/null 2>&1; then
        log_error "Git no está instalado"
        exit 1
    fi

    # Verificar Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker no está instalado"
        exit 1
    fi

    # Verificar Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "Docker Compose no está instalado"
        exit 1
    fi

    # Verificar que somos root
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root"
        exit 1
    fi

    # Verificar conectividad
    if ! ping -c 1 github.com >/dev/null 2>&1; then
        log_error "No hay conectividad a GitHub"
        exit 1
    fi

    log_success "Requisitos verificados"
}

# Función para verificar estado actual
check_current_status() {
    log_step "Verificando estado actual..."

    cd "$APP_DIR"

    # Obtener información actual
    local current_commit=$(git rev-parse HEAD)
    local current_branch=$(git branch --show-current)
    local services_status=$(docker-compose -f docker-compose.prod.yml ps --services --filter "status=running" | wc -l)
    local total_services=$(docker-compose -f docker-compose.prod.yml config --services | wc -l)

    log_info "Commit actual: $current_commit"
    log_info "Rama actual: $current_branch"
    log_info "Servicios corriendo: $services_status/$total_services"

    # Verificar que los servicios estén corriendo
    if [[ $services_status -ne $total_services ]]; then
        log_warning "No todos los servicios están corriendo"
        if [[ "$FORCE_UPDATE" != "true" ]]; then
            read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    # Verificar si hay cambios pendientes
    if ! git diff-index --quiet HEAD --; then
        log_warning "Hay cambios locales sin confirmar"
        if [[ "$FORCE_UPDATE" != "true" ]]; then
            read -p "¿Continuar y perder los cambios? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    echo "$current_commit" > /tmp/mw-panel-current-commit
}

# Función para verificar actualizaciones disponibles
check_updates() {
    log_step "Verificando actualizaciones disponibles..."

    cd "$APP_DIR"

    # Fetch latest changes
    git fetch origin "$BRANCH"

    local current_commit=$(git rev-parse HEAD)
    local latest_commit=$(git rev-parse "origin/$BRANCH")

    if [[ "$current_commit" == "$latest_commit" ]]; then
        log_info "No hay actualizaciones disponibles"
        if [[ "$FORCE_UPDATE" != "true" ]]; then
            exit 0
        fi
    fi

    # Mostrar cambios
    log_info "Cambios disponibles:"
    git log --oneline "$current_commit..$latest_commit" | head -10

    local commits_behind=$(git rev-list --count "$current_commit..$latest_commit")
    log_info "Commits por detrás: $commits_behind"

    if [[ "$FORCE_UPDATE" != "true" ]]; then
        read -p "¿Proceder con la actualización? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
}

# Función para crear backup pre-actualización
create_backup() {
    if [[ "$AUTO_BACKUP" != "true" ]]; then
        log_info "Backup automático deshabilitado"
        return 0
    fi

    log_step "Creando backup pre-actualización..."

    # Usar script de backup existente
    if [[ -f "$SCRIPT_DIR/backup.sh" ]]; then
        if "$SCRIPT_DIR/backup.sh" --retention 30; then
            log_success "Backup pre-actualización creado"
        else
            log_error "Error creando backup pre-actualización"
            exit 1
        fi
    else
        log_warning "Script de backup no encontrado, omitiendo..."
    fi
}

# Función para actualizar código
update_code() {
    log_step "Actualizando código fuente..."

    cd "$APP_DIR"

    # Guardar cambios locales si los hay
    if ! git diff-index --quiet HEAD --; then
        git stash push -m "Auto-stash before update $(date)"
        log_info "Cambios locales guardados en stash"
    fi

    # Cambiar a la rama correcta
    git checkout "$BRANCH"

    # Pull latest changes
    git pull origin "$BRANCH"

    # Verificar que el pull fue exitoso
    local new_commit=$(git rev-parse HEAD)
    log_success "Código actualizado a commit: $new_commit"
}

# Función para verificar migraciones de base de datos
check_migrations() {
    log_step "Verificando migraciones de base de datos..."

    cd "$APP_DIR"

    # Verificar si hay nuevas migraciones
    local migration_files=$(find backend/src/database/migrations -name "*.ts" -newer /tmp/mw-panel-current-commit 2>/dev/null || echo "")
    
    if [[ -n "$migration_files" ]]; then
        log_info "Se encontraron nuevas migraciones:"
        echo "$migration_files"
        
        # Crear backup específico de la base de datos antes de migraciones
        log_info "Creando backup de base de datos antes de migraciones..."
        local db_backup_file="$BACKUP_DIR/pre_migration_db_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p "$BACKUP_DIR"
        
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U mwpanel mwpanel > "$db_backup_file"; then
            log_success "Backup de BD creado: $(basename "$db_backup_file")"
            echo "$db_backup_file" > /tmp/mw-panel-db-backup
        else
            log_error "Error creando backup de base de datos"
            exit 1
        fi
    else
        log_info "No hay nuevas migraciones"
    fi
}

# Función para construir nuevas imágenes
build_images() {
    log_step "Construyendo nuevas imágenes..."

    cd "$APP_DIR"

    # Construir imágenes de producción
    if docker-compose -f docker-compose.prod.yml build --no-cache; then
        log_success "Imágenes construidas exitosamente"
    else
        log_error "Error construyendo imágenes"
        exit 1
    fi
}

# Función para actualizar servicios (rolling update)
update_services() {
    log_step "Actualizando servicios..."

    cd "$APP_DIR"

    # Lista de servicios a actualizar en orden
    local services=("backend" "frontend")

    for service in "${services[@]}"; do
        log_info "Actualizando servicio: $service"
        
        # Escalar el servicio (crear instancia adicional)
        docker-compose -f docker-compose.prod.yml up -d --scale "$service=2" "$service"
        
        # Esperar que la nueva instancia esté saludable
        sleep 10
        
        # Verificar health check
        local retries=30
        while [[ $retries -gt 0 ]]; do
            if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "healthy\|Up"; then
                break
            fi
            sleep 5
            ((retries--))
        done
        
        if [[ $retries -eq 0 ]]; then
            log_error "Servicio $service no está saludable después de la actualización"
            return 1
        fi
        
        # Escalar de vuelta a 1 instancia (elimina la instancia antigua)
        docker-compose -f docker-compose.prod.yml up -d --scale "$service=1" "$service"
        
        log_success "Servicio $service actualizado"
    done

    # Actualizar Nginx al final
    log_info "Reiniciando Nginx..."
    docker-compose -f docker-compose.prod.yml restart nginx
}

# Función para ejecutar migraciones
run_migrations() {
    log_step "Ejecutando migraciones de base de datos..."

    cd "$APP_DIR"

    # Ejecutar migraciones
    if docker-compose -f docker-compose.prod.yml exec -T backend npm run migration:run; then
        log_success "Migraciones ejecutadas exitosamente"
    else
        log_error "Error ejecutando migraciones"
        return 1
    fi
}

# Función para verificar la aplicación
verify_application() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_info "Pruebas de verificación omitidas"
        return 0
    fi

    log_step "Verificando aplicación actualizada..."

    cd "$APP_DIR"

    # Esperar que los servicios estén listos
    sleep 15

    # Verificar que todos los servicios estén corriendo
    local services_running=$(docker-compose -f docker-compose.prod.yml ps --services --filter "status=running" | wc -l)
    local total_services=$(docker-compose -f docker-compose.prod.yml config --services | wc -l)

    if [[ $services_running -ne $total_services ]]; then
        log_error "No todos los servicios están corriendo después de la actualización"
        return 1
    fi

    # Verificar endpoints críticos
    local endpoints=(
        "http://localhost:3000/health"
        "http://localhost/health"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" >/dev/null; then
            log_success "Endpoint verificado: $endpoint"
        else
            log_error "Endpoint no responde: $endpoint"
            return 1
        fi
    done

    # Verificar base de datos
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U mwpanel >/dev/null 2>&1; then
        log_success "Base de datos verificada"
    else
        log_error "Base de datos no responde"
        return 1
    fi

    log_success "Aplicación verificada exitosamente"
}

# Función para rollback en caso de error
rollback() {
    if [[ "$ROLLBACK_ON_FAILURE" != "true" ]]; then
        log_warning "Rollback automático deshabilitado"
        return 0
    fi

    log_step "Ejecutando rollback..."

    cd "$APP_DIR"

    # Obtener commit anterior
    local previous_commit=$(cat /tmp/mw-panel-current-commit 2>/dev/null || echo "")
    
    if [[ -n "$previous_commit" ]]; then
        log_info "Rollback a commit: $previous_commit"
        
        # Revertir código
        git checkout "$previous_commit"
        
        # Reconstruir imágenes
        docker-compose -f docker-compose.prod.yml build --no-cache
        
        # Reiniciar servicios
        docker-compose -f docker-compose.prod.yml up -d
        
        # Rollback de migraciones si hay backup de BD
        if [[ -f /tmp/mw-panel-db-backup ]]; then
            local db_backup_file=$(cat /tmp/mw-panel-db-backup)
            if [[ -f "$db_backup_file" ]]; then
                log_info "Restaurando base de datos desde backup..."
                docker-compose -f docker-compose.prod.yml exec -T postgres psql -U mwpanel -d mwpanel < "$db_backup_file"
                log_success "Base de datos restaurada"
            fi
        fi
        
        log_success "Rollback completado"
    else
        log_error "No se pudo determinar el commit anterior para rollback"
    fi
}

# Función para limpiar archivos temporales
cleanup() {
    log_step "Limpiando archivos temporales..."
    
    # Limpiar imágenes Docker no utilizadas
    docker image prune -f >/dev/null 2>&1 || true
    
    # Limpiar archivos temporales
    rm -f /tmp/mw-panel-* 2>/dev/null || true
    
    log_success "Limpieza completada"
}

# Función para mostrar resumen
show_summary() {
    log_step "Resumen de la actualización:"
    
    cd "$APP_DIR"
    
    local current_commit=$(git rev-parse HEAD)
    local current_branch=$(git branch --show-current)
    
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ACTUALIZACIÓN COMPLETADA                     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}📊 Estado actual:${NC}"
    echo -e "   Commit: $current_commit"
    echo -e "   Rama: $current_branch"
    echo -e "   Fecha: $(date)"
    echo
    echo -e "${BLUE}🔗 URLs de acceso:${NC}"
    echo -e "   Frontend: https://$(grep DOMAIN .env | cut -d= -f2)"
    echo -e "   API: https://$(grep DOMAIN .env | cut -d= -f2)/api"
    echo
    echo -e "${YELLOW}📋 Verificaciones recomendadas:${NC}"
    echo -e "   • Verificar funcionalidad del login"
    echo -e "   • Comprobar módulos principales"
    echo -e "   • Revisar logs de errores"
    echo
}

# Función principal
main() {
    local dry_run=false
    
    # Procesar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -n|--no-backup)
                AUTO_BACKUP=false
                shift
                ;;
            -t|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -f|--force)
                FORCE_UPDATE=true
                shift
                ;;
            -r|--no-rollback)
                ROLLBACK_ON_FAILURE=false
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            *)
                log_error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Crear log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    show_banner
    
    log_info "Iniciando actualización de MW Panel 2.0"
    log_info "Rama: $BRANCH"
    log_info "Backup automático: $AUTO_BACKUP"
    log_info "Rollback automático: $ROLLBACK_ON_FAILURE"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "MODO DRY-RUN - No se ejecutarán cambios reales"
    fi
    
    check_requirements
    check_current_status
    check_updates
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "Simulación completada - no se ejecutaron cambios"
        exit 0
    fi
    
    create_backup
    update_code
    check_migrations
    build_images
    
    if update_services && run_migrations && verify_application; then
        cleanup
        show_summary
        log_success "Actualización completada exitosamente"
    else
        log_error "La actualización falló"
        rollback
        exit 1
    fi
}

# Función para cleanup en caso de error
error_cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "La actualización falló con código de salida $exit_code"
        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback
        fi
    fi
}

# Capturar errores y ejecutar cleanup
trap error_cleanup EXIT

# Ejecutar función principal
main "$@"