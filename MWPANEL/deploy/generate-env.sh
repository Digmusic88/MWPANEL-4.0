#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - GENERADOR DE VARIABLES DE ENTORNO
# =============================================================================
# Genera archivo .env para producción con valores seguros
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
readonly ENV_FILE="$APP_DIR/.env"
readonly ENV_EXAMPLE="$APP_DIR/.env.example"

# Funciones de logging
log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}"
}

log_error() {
    echo -e "${RED}❌ $*${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $*${NC}"
}

# Banner del script
show_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                MW PANEL 2.0 ENVIRONMENT GENERATOR               ║
║              GENERADOR DE VARIABLES DE ENTORNO                  ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
MW Panel 2.0 - Generador de Variables de Entorno

USO:
    $0 [OPCIONES]

OPCIONES:
    -h, --help              Mostrar esta ayuda
    -d, --domain DOMINIO    Dominio principal (requerido)
    -e, --email EMAIL       Email del administrador (requerido)
    -o, --output ARCHIVO    Archivo de salida (por defecto: .env)
    --db-password PASS      Contraseña de PostgreSQL (generada si no se especifica)
    --jwt-secret SECRET     Secret JWT (generado si no se especifica)
    --redis-password PASS   Contraseña de Redis (generada si no se especifica)
    --force                 Sobrescribir archivo existente
    --development           Generar configuración para desarrollo
    --production            Generar configuración para producción (por defecto)

EJEMPLOS:
    $0 -d mipanel.com -e admin@mipanel.com
    $0 -d example.com -e admin@example.com --force
    $0 --development -d localhost

NOTA:
    Las contraseñas y secrets se generan automáticamente de forma segura
    si no se especifican. El archivo generado contendrá todas las variables
    necesarias para el funcionamiento de MW Panel 2.0.
EOF
}

# Función para generar contraseña segura
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Función para generar JWT secret
generate_jwt_secret() {
    openssl rand -hex 64
}

# Función para validar email
validate_email() {
    local email="$1"
    if [[ $email =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Función para validar dominio
validate_domain() {
    local domain="$1"
    if [[ $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        return 0
    else
        return 1
    fi
}

# Función para solicitar input con validación
prompt_input() {
    local prompt="$1"
    local validator="$2"
    local default="$3"
    local input

    while true; do
        if [[ -n "$default" ]]; then
            read -p "$prompt [$default]: " input
            input=${input:-$default}
        else
            read -p "$prompt: " input
        fi

        if [[ -z "$input" ]]; then
            log_error "Este campo es requerido"
            continue
        fi

        if [[ -n "$validator" ]]; then
            if $validator "$input"; then
                echo "$input"
                break
            else
                log_error "Formato inválido"
                continue
            fi
        else
            echo "$input"
            break
        fi
    done
}

# Función para generar configuración de desarrollo
generate_development_config() {
    cat << EOF
# =============================================================================
# MW PANEL 2.0 - CONFIGURACIÓN DE DESARROLLO
# =============================================================================
# Generado automáticamente el $(date '+%Y-%m-%d %H:%M:%S')
# =============================================================================

# Configuración del entorno
NODE_ENV=development
PORT=3000

# Configuración del dominio
DOMAIN=${DOMAIN}
FRONTEND_URL=http://${DOMAIN}:5173
BACKEND_URL=http://${DOMAIN}:3000

# Configuración de la base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=mwpanel
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=mwpanel
DATABASE_URL=postgresql://mwpanel:${DB_PASSWORD}@localhost:5432/mwpanel

# Configuración de Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379

# Configuración JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Configuración de archivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx

# Configuración de email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${ADMIN_EMAIL}
SMTP_PASS=
EMAIL_FROM=${ADMIN_EMAIL}

# Configuración de logs
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Configuración de desarrollo
DEBUG=true
ENABLE_CORS=true
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# API Keys (configurar según sea necesario)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Configuración de notificaciones
NOTIFICATION_EMAIL=${ADMIN_EMAIL}
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Configuración de seguridad (desarrollo)
BCRYPT_ROUNDS=10
SESSION_SECRET=${SESSION_SECRET}
CSRF_SECRET=${CSRF_SECRET}

# Configuración de rate limiting (permisivo para desarrollo)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Base de datos de desarrollo
DEV_DB_RESET=false
DEV_SEED_DATA=true
EOF
}

# Función para generar configuración de producción
generate_production_config() {
    cat << EOF
# =============================================================================
# MW PANEL 2.0 - CONFIGURACIÓN DE PRODUCCIÓN
# =============================================================================
# Generado automáticamente el $(date '+%Y-%m-%d %H:%M:%S')
# =============================================================================

# Configuración del entorno
NODE_ENV=production
PORT=3000

# Configuración del dominio
DOMAIN=${DOMAIN}
FRONTEND_URL=https://${DOMAIN}
BACKEND_URL=https://${DOMAIN}/api

# Configuración de la base de datos
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=mwpanel
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=mwpanel
DATABASE_URL=postgresql://mwpanel:${DB_PASSWORD}@postgres:5432/mwpanel

# Configuración de Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Configuración JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Configuración de archivos
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx

# Configuración de email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=${ADMIN_EMAIL}
SMTP_PASS=
EMAIL_FROM=${ADMIN_EMAIL}

# Configuración de logs
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# Configuración de producción
DEBUG=false
ENABLE_CORS=true
CORS_ORIGIN=https://${DOMAIN}

# API Keys (configurar según sea necesario)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Configuración de notificaciones
NOTIFICATION_EMAIL=${ADMIN_EMAIL}
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Configuración de seguridad (producción)
BCRYPT_ROUNDS=12
SESSION_SECRET=${SESSION_SECRET}
CSRF_SECRET=${CSRF_SECRET}

# Configuración de rate limiting (restrictivo para producción)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Configuración SSL/TLS
SSL_CERT_PATH=/etc/letsencrypt/live/${DOMAIN}/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/${DOMAIN}/privkey.pem

# Configuración de backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Configuración de monitoreo
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
METRICS_ENABLED=true
PROMETHEUS_PORT=9090

# Configuración de Docker
COMPOSE_PROJECT_NAME=mwpanel
WATCHTOWER_POLL_INTERVAL=86400

# Configuración de Nginx
NGINX_CLIENT_MAX_BODY_SIZE=100M
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
EOF
}

# Función para verificar archivo .env.example
check_env_example() {
    if [[ -f "$ENV_EXAMPLE" ]]; then
        log_info "Encontrado archivo .env.example, usando como referencia"
        return 0
    else
        log_warning "No se encontró .env.example"
        return 1
    fi
}

# Función para validar dependencias
check_dependencies() {
    local missing_deps=()

    if ! command -v openssl >/dev/null 2>&1; then
        missing_deps+=("openssl")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Dependencias faltantes: ${missing_deps[*]}"
        log_info "Instalar con: apt-get install ${missing_deps[*]}"
        exit 1
    fi
}

# Función para mostrar resumen
show_summary() {
    log_step "Resumen de configuración:"
    
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ARCHIVO .ENV GENERADO                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}📁 Archivo generado: ${ENV_FILE}${NC}"
    echo -e "${BLUE}🌐 Dominio: ${DOMAIN}${NC}"
    echo -e "${BLUE}📧 Email admin: ${ADMIN_EMAIL}${NC}"
    echo -e "${BLUE}🏗️  Entorno: ${ENVIRONMENT}${NC}"
    echo
    echo -e "${YELLOW}🔐 Secrets generados:${NC}"
    echo -e "   • Contraseña PostgreSQL: ✅ Generada"
    echo -e "   • Contraseña Redis: ✅ Generada"
    echo -e "   • JWT Secret: ✅ Generado"
    echo -e "   • Session Secret: ✅ Generado"
    echo -e "   • CSRF Secret: ✅ Generado"
    echo
    echo -e "${YELLOW}⚠️  Próximos pasos:${NC}"
    echo -e "   1. Revisar y personalizar las variables en ${ENV_FILE}"
    echo -e "   2. Configurar credenciales SMTP para envío de emails"
    echo -e "   3. Configurar API keys si van a usar integraciones externas"
    echo -e "   4. Para producción: configurar backups S3 (opcional)"
    echo
    echo -e "${BLUE}📋 Comandos útiles:${NC}"
    echo -e "   • cat ${ENV_FILE}           # Ver configuración"
    echo -e "   • vi ${ENV_FILE}            # Editar configuración"
    echo -e "   • source ${ENV_FILE}        # Cargar variables"
    echo
}

# Función principal
main() {
    local domain=""
    local admin_email=""
    local output_file=""
    local force=false
    local environment="production"
    local interactive=true
    
    # Variables para secrets
    local db_password=""
    local redis_password=""
    local jwt_secret=""
    
    # Procesar argumentos
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--domain)
                domain="$2"
                shift 2
                ;;
            -e|--email)
                admin_email="$2"
                shift 2
                ;;
            -o|--output)
                output_file="$2"
                shift 2
                ;;
            --db-password)
                db_password="$2"
                shift 2
                ;;
            --jwt-secret)
                jwt_secret="$2"
                shift 2
                ;;
            --redis-password)
                redis_password="$2"
                shift 2
                ;;
            --force)
                force=true
                shift
                ;;
            --development)
                environment="development"
                shift
                ;;
            --production)
                environment="production"
                shift
                ;;
            --non-interactive)
                interactive=false
                shift
                ;;
            *)
                log_error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    show_banner
    
    log_info "Generando configuración de entorno para MW Panel 2.0"
    log_info "Entorno objetivo: $environment"
    
    # Verificar dependencias
    check_dependencies
    
    # Verificar archivo .env.example
    check_env_example
    
    # Configurar archivo de salida
    if [[ -n "$output_file" ]]; then
        ENV_FILE="$output_file"
    fi
    
    # Verificar si el archivo existe
    if [[ -f "$ENV_FILE" && "$force" != "true" ]]; then
        log_error "El archivo $ENV_FILE ya existe"
        log_info "Use --force para sobrescribir"
        exit 1
    fi
    
    # Solicitar datos requeridos si no se proporcionaron
    if [[ "$interactive" == "true" ]]; then
        if [[ -z "$domain" ]]; then
            if [[ "$environment" == "development" ]]; then
                domain=$(prompt_input "Dominio (para desarrollo)" validate_domain "localhost")
            else
                domain=$(prompt_input "Dominio principal" validate_domain "")
            fi
        fi
        
        if [[ -z "$admin_email" ]]; then
            admin_email=$(prompt_input "Email del administrador" validate_email "")
        fi
    else
        # Modo no interactivo - validar que se proporcionaron valores requeridos
        if [[ -z "$domain" ]]; then
            log_error "Dominio requerido en modo no interactivo"
            exit 1
        fi
        
        if [[ -z "$admin_email" ]]; then
            log_error "Email requerido en modo no interactivo"
            exit 1
        fi
    fi
    
    # Validar inputs
    if ! validate_domain "$domain"; then
        log_error "Formato de dominio inválido: $domain"
        exit 1
    fi
    
    if ! validate_email "$admin_email"; then
        log_error "Formato de email inválido: $admin_email"
        exit 1
    fi
    
    log_step "Generando secrets seguros..."
    
    # Generar secrets si no se proporcionaron
    if [[ -z "$db_password" ]]; then
        db_password=$(generate_password 32)
    fi
    
    if [[ -z "$redis_password" ]]; then
        redis_password=$(generate_password 32)
    fi
    
    if [[ -z "$jwt_secret" ]]; then
        jwt_secret=$(generate_jwt_secret)
    fi
    
    # Generar secrets adicionales
    local session_secret=$(generate_password 64)
    local csrf_secret=$(generate_password 32)
    
    # Exportar variables para usar en las funciones de generación
    export DOMAIN="$domain"
    export ADMIN_EMAIL="$admin_email"
    export DB_PASSWORD="$db_password"
    export REDIS_PASSWORD="$redis_password"
    export JWT_SECRET="$jwt_secret"
    export SESSION_SECRET="$session_secret"
    export CSRF_SECRET="$csrf_secret"
    export ENVIRONMENT="$environment"
    
    log_step "Generando archivo de configuración..."
    
    # Generar configuración según el entorno
    if [[ "$environment" == "development" ]]; then
        generate_development_config > "$ENV_FILE"
    else
        generate_production_config > "$ENV_FILE"
    fi
    
    # Ajustar permisos del archivo .env
    chmod 600 "$ENV_FILE"
    
    log_success "Archivo .env generado exitosamente"
    
    # Mostrar resumen
    show_summary
}

# Ejecutar función principal
main "$@"