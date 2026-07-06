#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT DE BACKUP AUTOMATIZADO
# =============================================================================
# Backup completo de base de datos, archivos y configuración
# =============================================================================

set -euo pipefail

# Colores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Variables de configuración
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="$(dirname "$SCRIPT_DIR")"
readonly BACKUP_DIR="/var/backups/mw-panel"
readonly DATE=$(date +%Y%m%d_%H%M%S)
readonly LOG_FILE="/var/log/mw-panel-backup.log"

# Variables configurables
RETENTION_DAYS=${RETENTION_DAYS:-7}
COMPRESS=${COMPRESS:-true}
ENCRYPT=${ENCRYPT:-false}
REMOTE_BACKUP=${REMOTE_BACKUP:-false}
NOTIFICATION_EMAIL=${NOTIFICATION_EMAIL:-}

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

# Función para mostrar ayuda
show_help() {
    cat << EOF
MW Panel 2.0 - Script de Backup

USO:
    $0 [OPCIONES]

OPCIONES:
    -h, --help              Mostrar esta ayuda
    -d, --retention DÍAS    Días de retención (por defecto: 7)
    -n, --no-compress       No comprimir backups
    -e, --encrypt           Encriptar backups con GPG
    -r, --remote            Enviar a almacenamiento remoto
    -m, --email EMAIL       Email para notificaciones
    --db-only               Solo backup de base de datos
    --files-only            Solo backup de archivos
    --config-only           Solo backup de configuración

EJEMPLOS:
    $0                      # Backup completo con configuración por defecto
    $0 -d 30 -e             # Backup encriptado con 30 días de retención
    $0 --db-only            # Solo backup de la base de datos
    $0 -r -m admin@example.com  # Backup remoto con notificación

VARIABLES DE ENTORNO:
    BACKUP_DIR              Directorio de backups (por defecto: /var/backups/mw-panel)
    RETENTION_DAYS          Días de retención de backups
    ENCRYPT_KEY             Clave GPG para encriptación
    S3_BUCKET               Bucket S3 para backup remoto
    SMTP_SERVER             Servidor SMTP para notificaciones
EOF
}

# Función para verificar requisitos
check_requirements() {
    log_info "Verificando requisitos del sistema..."

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

    # Verificar que la aplicación esté corriendo
    if ! docker-compose -f "$APP_DIR/docker-compose.prod.yml" ps | grep -q "Up"; then
        log_warning "Algunos servicios no están corriendo"
    fi

    # Crear directorio de backup
    mkdir -p "$BACKUP_DIR"
    
    # Verificar espacio en disco
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2{print $4}')
    local required_space=1048576  # 1GB en KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_warning "Poco espacio disponible: $(($available_space/1024))MB"
    fi

    log_success "Requisitos verificados"
}

# Función para backup de base de datos
backup_database() {
    log_info "Iniciando backup de base de datos..."

    local db_backup_file="$BACKUP_DIR/db_backup_$DATE.sql"
    
    # Verificar que PostgreSQL esté corriendo
    if ! docker-compose -f "$APP_DIR/docker-compose.prod.yml" exec -T postgres pg_isready -U mwpanel >/dev/null 2>&1; then
        log_error "PostgreSQL no está disponible"
        return 1
    fi

    # Crear backup de la base de datos
    if docker-compose -f "$APP_DIR/docker-compose.prod.yml" exec -T postgres pg_dump -U mwpanel -h localhost mwpanel > "$db_backup_file"; then
        log_success "Backup de base de datos creado: $(basename "$db_backup_file")"
        
        # Verificar que el backup no esté vacío
        if [[ ! -s "$db_backup_file" ]]; then
            log_error "El backup de base de datos está vacío"
            return 1
        fi
        
        # Comprimir si está habilitado
        if [[ "$COMPRESS" == "true" ]]; then
            gzip "$db_backup_file"
            db_backup_file="${db_backup_file}.gz"
            log_info "Base de datos comprimida"
        fi
        
        # Encriptar si está habilitado
        if [[ "$ENCRYPT" == "true" && -n "${ENCRYPT_KEY:-}" ]]; then
            gpg --trust-model always --encrypt -r "$ENCRYPT_KEY" "$db_backup_file"
            rm "$db_backup_file"
            log_info "Base de datos encriptada"
        fi
        
        echo "$db_backup_file"
    else
        log_error "Error creando backup de base de datos"
        return 1
    fi
}

# Función para backup de archivos
backup_files() {
    log_info "Iniciando backup de archivos..."

    local files_backup_file="$BACKUP_DIR/files_backup_$DATE.tar"
    
    # Crear lista de directorios a respaldar
    local backup_dirs=(
        "$APP_DIR/backend/uploads"
        "$APP_DIR/nginx/ssl"
    )
    
    # Verificar que los directorios existan
    local existing_dirs=()
    for dir in "${backup_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            existing_dirs+=("$dir")
        fi
    done
    
    if [[ ${#existing_dirs[@]} -eq 0 ]]; then
        log_warning "No hay directorios de archivos para respaldar"
        return 0
    fi
    
    # Crear backup de archivos
    if tar -cf "$files_backup_file" -C "/" "${existing_dirs[@]/#\//}"; then
        log_success "Backup de archivos creado: $(basename "$files_backup_file")"
        
        # Comprimir si está habilitado
        if [[ "$COMPRESS" == "true" ]]; then
            gzip "$files_backup_file"
            files_backup_file="${files_backup_file}.gz"
            log_info "Archivos comprimidos"
        fi
        
        # Encriptar si está habilitado
        if [[ "$ENCRYPT" == "true" && -n "${ENCRYPT_KEY:-}" ]]; then
            gpg --trust-model always --encrypt -r "$ENCRYPT_KEY" "$files_backup_file"
            rm "$files_backup_file"
            log_info "Archivos encriptados"
        fi
        
        echo "$files_backup_file"
    else
        log_error "Error creando backup de archivos"
        return 1
    fi
}

# Función para backup de configuración
backup_config() {
    log_info "Iniciando backup de configuración..."

    local config_backup_file="$BACKUP_DIR/config_backup_$DATE.tar"
    
    # Crear lista de archivos de configuración
    local config_files=(
        "$APP_DIR/.env"
        "$APP_DIR/docker-compose.prod.yml"
        "$APP_DIR/nginx/nginx.prod.conf"
        "$APP_DIR/nginx/ssl-params.conf"
        "$APP_DIR/nginx/security-headers.conf"
    )
    
    # Verificar que los archivos existan
    local existing_files=()
    for file in "${config_files[@]}"; do
        if [[ -f "$file" ]]; then
            existing_files+=("$file")
        fi
    done
    
    if [[ ${#existing_files[@]} -eq 0 ]]; then
        log_warning "No hay archivos de configuración para respaldar"
        return 0
    fi
    
    # Crear backup de configuración
    if tar -cf "$config_backup_file" -C "/" "${existing_files[@]/#\//}"; then
        log_success "Backup de configuración creado: $(basename "$config_backup_file")"
        
        # Comprimir si está habilitado
        if [[ "$COMPRESS" == "true" ]]; then
            gzip "$config_backup_file"
            config_backup_file="${config_backup_file}.gz"
            log_info "Configuración comprimida"
        fi
        
        # Encriptar si está habilitado
        if [[ "$ENCRYPT" == "true" && -n "${ENCRYPT_KEY:-}" ]]; then
            gpg --trust-model always --encrypt -r "$ENCRYPT_KEY" "$config_backup_file"
            rm "$config_backup_file"
            log_info "Configuración encriptada"
        fi
        
        echo "$config_backup_file"
    else
        log_error "Error creando backup de configuración"
        return 1
    fi
}

# Función para limpiar backups antiguos
cleanup_old_backups() {
    log_info "Limpiando backups antiguos (más de $RETENTION_DAYS días)..."

    local deleted_count=0
    
    # Buscar y eliminar archivos antiguos
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
        log_info "Eliminado: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "*backup*" -type f -mtime +$RETENTION_DAYS -print0)
    
    if [[ $deleted_count -gt 0 ]]; then
        log_success "Eliminados $deleted_count backups antiguos"
    else
        log_info "No hay backups antiguos para eliminar"
    fi
}

# Función para enviar backup a almacenamiento remoto
send_to_remote() {
    local backup_files=("$@")
    
    if [[ "$REMOTE_BACKUP" != "true" ]]; then
        return 0
    fi
    
    log_info "Enviando backups a almacenamiento remoto..."
    
    # Configuración S3 (ejemplo)
    if [[ -n "${S3_BUCKET:-}" ]]; then
        for file in "${backup_files[@]}"; do
            if command -v aws >/dev/null 2>&1; then
                if aws s3 cp "$file" "s3://$S3_BUCKET/mw-panel/$(basename "$file")"; then
                    log_success "Subido a S3: $(basename "$file")"
                else
                    log_error "Error subiendo a S3: $(basename "$file")"
                fi
            else
                log_warning "AWS CLI no está instalado"
            fi
        done
    fi
    
    # Agregar aquí otros proveedores de almacenamiento remoto
    # Google Cloud Storage, Azure Blob Storage, etc.
}

# Función para enviar notificación por email
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -z "$NOTIFICATION_EMAIL" ]]; then
        return 0
    fi
    
    local subject="MW Panel Backup - $status"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local email_body="
Backup de MW Panel 2.0
=======================

Estado: $status
Fecha: $timestamp
Servidor: $(hostname)
Mensaje: $message

Detalles del backup:
- Directorio: $BACKUP_DIR
- Retención: $RETENTION_DAYS días
- Compresión: $COMPRESS
- Encriptación: $ENCRYPT

Logs completos en: $LOG_FILE
"
    
    # Enviar email usando sendmail o mailx si está disponible
    if command -v sendmail >/dev/null 2>&1; then
        echo -e "To: $NOTIFICATION_EMAIL\nSubject: $subject\n\n$email_body" | sendmail "$NOTIFICATION_EMAIL"
        log_info "Notificación enviada a $NOTIFICATION_EMAIL"
    elif command -v mailx >/dev/null 2>&1; then
        echo "$email_body" | mailx -s "$subject" "$NOTIFICATION_EMAIL"
        log_info "Notificación enviada a $NOTIFICATION_EMAIL"
    else
        log_warning "No se pudo enviar notificación (sendmail/mailx no disponible)"
    fi
}

# Función para mostrar estadísticas del backup
show_backup_stats() {
    local backup_files=("$@")
    
    log_info "Estadísticas del backup:"
    
    local total_size=0
    for file in "${backup_files[@]}"; do
        if [[ -f "$file" ]]; then
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
            total_size=$((total_size + size))
            log_info "  $(basename "$file"): $(numfmt --to=iec-i --suffix=B $size)"
        fi
    done
    
    log_success "Tamaño total del backup: $(numfmt --to=iec-i --suffix=B $total_size)"
    log_info "Backups disponibles en $BACKUP_DIR:"
    ls -lh "$BACKUP_DIR"/*backup* 2>/dev/null | tail -10 || log_info "  (ninguno)"
}

# Función principal
main() {
    local db_only=false
    local files_only=false
    local config_only=false
    
    # Procesar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -n|--no-compress)
                COMPRESS=false
                shift
                ;;
            -e|--encrypt)
                ENCRYPT=true
                shift
                ;;
            -r|--remote)
                REMOTE_BACKUP=true
                shift
                ;;
            -m|--email)
                NOTIFICATION_EMAIL="$2"
                shift 2
                ;;
            --db-only)
                db_only=true
                shift
                ;;
            --files-only)
                files_only=true
                shift
                ;;
            --config-only)
                config_only=true
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
    
    log_info "Iniciando backup de MW Panel 2.0..."
    log_info "Configuración: Retención=$RETENTION_DAYS días, Compresión=$COMPRESS, Encriptación=$ENCRYPT"
    
    # Verificar requisitos
    check_requirements
    
    # Array para almacenar archivos de backup creados
    local backup_files=()
    
    # Ejecutar backups según las opciones
    if [[ "$files_only" != "true" && "$config_only" != "true" ]]; then
        if db_file=$(backup_database); then
            backup_files+=("$db_file")
        fi
    fi
    
    if [[ "$db_only" != "true" && "$config_only" != "true" ]]; then
        if files_file=$(backup_files); then
            backup_files+=("$files_file")
        fi
    fi
    
    if [[ "$db_only" != "true" && "$files_only" != "true" ]]; then
        if config_file=$(backup_config); then
            backup_files+=("$config_file")
        fi
    fi
    
    # Verificar que se crearon backups
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        log_error "No se crearon backups"
        send_notification "ERROR" "No se pudieron crear los backups"
        exit 1
    fi
    
    # Enviar a almacenamiento remoto
    send_to_remote "${backup_files[@]}"
    
    # Limpiar backups antiguos
    cleanup_old_backups
    
    # Mostrar estadísticas
    show_backup_stats "${backup_files[@]}"
    
    log_success "Backup completado exitosamente"
    send_notification "SUCCESS" "Backup completado con ${#backup_files[@]} archivos"
}

# Función para cleanup en caso de error
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "El backup falló con código de salida $exit_code"
        send_notification "ERROR" "El backup falló con código $exit_code"
    fi
}

# Capturar errores y ejecutar cleanup
trap cleanup EXIT

# Ejecutar función principal
main "$@"