#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - INSTALADOR AUTOMÁTICO PARA VPS
# =============================================================================
# Script maestro que instala y configura MW Panel 2.0 en un VPS de forma
# completamente automática con SSL, seguridad y optimizaciones de producción
# =============================================================================

set -euo pipefail  # Salir en errores, variables no definidas y pipes que fallan

# Colores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Variables globales
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/var/log/mw-panel-install.log"
readonly BACKUP_DIR="/var/backups/mw-panel"

# Variables de configuración
DOMAIN=""
EMAIL=""
DB_PASSWORD=""
JWT_SECRET=""
JWT_REFRESH_SECRET=""
ADMIN_PASSWORD=""
APP_DIR="/opt/mw-panel"
BRANCH="main"
GIT_REPO="https://github.com/tu-usuario/mw-panel.git"  # Cambiar por tu repositorio real
DOCKER_COMPOSE_CMD=""

# =============================================================================
# FUNCIONES DE UTILIDAD
# =============================================================================

# Función para logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $*${NC}"
    log "INFO" "$*"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}"
    log "SUCCESS" "$*"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}"
    log "WARNING" "$*"
}

log_error() {
    echo -e "${RED}❌ $*${NC}"
    log "ERROR" "$*"
}

log_step() {
    echo -e "${CYAN}🚀 $*${NC}"
    log "STEP" "$*"
}

# Banner del instalador
show_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                          MW PANEL 2.0                           ║
║                    INSTALADOR AUTOMÁTICO VPS                    ║
║                                                                  ║
║  🚀 Deploy automático con SSL, seguridad y optimizaciones       ║
║  🔒 Configuración segura por defecto                            ║
║  📊 Sistema educativo completo listo para producción           ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
MW Panel 2.0 - Instalador Automático para VPS

USO:
    $0 [OPCIONES] DOMINIO [EMAIL]

ARGUMENTOS:
    DOMINIO     Dominio donde se instalará MW Panel (ej: panel.miescuela.com)
    EMAIL       Email para certificados SSL (opcional, se pedirá si no se proporciona)

OPCIONES:
    -h, --help              Mostrar esta ayuda
    -b, --branch RAMA       Rama de Git a instalar (por defecto: main)
    -d, --dir DIR           Directorio de instalación (por defecto: /opt/mw-panel)
    --git-repo URL          URL del repositorio Git (por defecto: auto-detectar)
    --no-ssl                Instalar sin SSL (solo para testing)
    --dev                   Modo desarrollo (no recomendado para producción)

EJEMPLOS:
    $0 panel.miescuela.com admin@miescuela.com
    $0 --branch develop panel-test.miescuela.com
    $0 --no-ssl localhost
    $0 --git-repo https://github.com/tu-usuario/mw-panel.git panel.miescuela.com

REQUISITOS:
    - Ubuntu 20.04+ o Debian 11+
    - Mínimo: 2 vCPU, 4GB RAM, 40GB SSD
    - Puertos 80 y 443 abiertos
    - Dominio apuntando a la IP del servidor

Para más información: https://github.com/tu-repo/mw-panel/blob/main/DEPLOY.md
EOF
}

# Función para validar argumentos
validate_args() {
    if [[ $# -eq 0 ]]; then
        log_error "Se requiere al menos el dominio"
        show_help
        exit 1
    fi

    DOMAIN="$1"
    
    # Validar formato del dominio
    if ! [[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        log_error "Formato de dominio inválido: $DOMAIN"
        exit 1
    fi

    # Email opcional
    if [[ $# -ge 2 ]]; then
        EMAIL="$2"
    else
        read -p "📧 Ingresa tu email para certificados SSL: " EMAIL
    fi

    # Validar email
    if ! [[ "$EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        log_error "Formato de email inválido: $EMAIL"
        exit 1
    fi
}

# Función para detectar el sistema operativo
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        log_error "No se pudo detectar el sistema operativo"
        exit 1
    fi

    log_info "Sistema detectado: $OS $VER"

    # Verificar compatibilidad
    case $OS in
        ubuntu)
            if [[ "${VER%%.*}" -lt 20 ]]; then
                log_error "Se requiere Ubuntu 20.04 o superior"
                exit 1
            fi
            ;;
        debian)
            if [[ "${VER%%.*}" -lt 11 ]]; then
                log_error "Se requiere Debian 11 o superior"
                exit 1
            fi
            ;;
        *)
            log_warning "Sistema no probado oficialmente: $OS $VER"
            read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
            ;;
    esac
}

# Función para verificar requisitos del sistema
check_system_requirements() {
    log_step "Verificando requisitos del sistema..."

    # Verificar si es root
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root"
        log_info "Ejecuta: sudo $0 $*"
        exit 1
    fi

    # Verificar RAM
    local ram_gb=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $ram_gb -lt 3 ]]; then
        log_warning "RAM detectada: ${ram_gb}GB. Mínimo recomendado: 4GB"
    fi

    # Verificar espacio en disco
    local disk_gb=$(df / | awk 'NR==2{gsub(/G/,"",$4); print int($4)}')
    if [[ $disk_gb -lt 30 ]]; then
        log_warning "Espacio libre: ${disk_gb}GB. Mínimo recomendado: 40GB"
    fi

    # Verificar conexión a internet
    if ! ping -c 1 google.com >/dev/null 2>&1; then
        log_error "No hay conexión a internet"
        exit 1
    fi

    # Verificar puertos
    if ss -tuln | grep -q ":80 "; then
        log_error "Puerto 80 ya está en uso"
        exit 1
    fi

    if ss -tuln | grep -q ":443 "; then
        log_error "Puerto 443 ya está en uso"
        exit 1
    fi

    log_success "Requisitos del sistema verificados"
}

# Función para generar contraseñas seguras
generate_passwords() {
    log_step "Generando contraseñas seguras..."

    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)

    log_success "Contraseñas generadas"
}

# Función para actualizar el sistema
update_system() {
    log_step "Actualizando el sistema..."

    export DEBIAN_FRONTEND=noninteractive

    apt-get update >/dev/null 2>&1
    apt-get upgrade -y >/dev/null 2>&1
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        htop \
        nano \
        vim \
        jq \
        openssl >/dev/null 2>&1

    log_success "Sistema actualizado"
}

# Función para instalar Docker
install_docker() {
    log_step "Instalando Docker..."

    # Remover versiones anteriores
    apt-get remove -y docker docker-engine docker.io containerd runc >/dev/null 2>&1 || true

    # Agregar repositorio oficial de Docker
    curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list >/dev/null

    # Instalar Docker
    apt-get update >/dev/null 2>&1
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null 2>&1

    # Verificar si Docker Compose Plugin está instalado, sino instalar versión standalone
    if ! docker compose version >/dev/null 2>&1; then
        log_info "Instalando Docker Compose standalone..."
        local compose_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
        curl -L "https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        # Crear alias para compatibilidad
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose 2>/dev/null || true
    fi

    # Iniciar y habilitar Docker
    systemctl start docker
    systemctl enable docker

    # Verificar instalación
    if ! docker --version >/dev/null 2>&1; then
        log_error "Error instalando Docker"
        exit 1
    fi

    # Verificar Docker Compose (plugin o standalone)
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
        log_info "Docker Compose Plugin: $(docker compose version)"
    elif docker-compose --version >/dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker-compose"
        log_info "Docker Compose Standalone: $(docker-compose --version)"
    else
        log_error "Error: No se pudo instalar Docker Compose"
        exit 1
    fi

    log_success "Docker instalado correctamente"
    log_info "Docker version: $(docker --version)"
}

# Función para configurar el firewall
configure_firewall() {
    log_step "Configurando firewall..."

    # Configurar UFW
    ufw --force reset >/dev/null 2>&1
    ufw default deny incoming >/dev/null 2>&1
    ufw default allow outgoing >/dev/null 2>&1
    
    # Permitir SSH (importante!)
    ufw allow 22/tcp >/dev/null 2>&1
    
    # Permitir HTTP y HTTPS
    ufw allow 80/tcp >/dev/null 2>&1
    ufw allow 443/tcp >/dev/null 2>&1
    
    # Activar firewall
    ufw --force enable >/dev/null 2>&1

    # Configurar Fail2Ban
    systemctl start fail2ban
    systemctl enable fail2ban

    log_success "Firewall configurado"
}

# Función para clonar el repositorio
clone_repository() {
    log_step "Clonando repositorio MW Panel 2.0..."

    # Crear directorio de aplicación
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    # Clonar repositorio
    if [[ -d .git ]]; then
        log_info "Repositorio existente encontrado, actualizando..."
        git fetch origin
        git reset --hard origin/$BRANCH
        git clean -fd
    else
        log_info "Clonando repositorio desde $GIT_REPO..."
        if ! git clone -b $BRANCH $GIT_REPO .; then
            log_error "Error clonando repositorio. Verifica la URL y las credenciales."
            log_info "URL configurada: $GIT_REPO"
            log_info "Rama: $BRANCH"
            exit 1
        fi
    fi

    # Hacer ejecutables los scripts
    chmod +x deploy/*.sh
    chmod +x *.sh

    log_success "Repositorio clonado"
}

# Función para configurar variables de entorno
configure_environment() {
    log_step "Configurando variables de entorno..."

    cat > "$APP_DIR/.env" << EOF
# =============================================================================
# MW PANEL 2.0 - CONFIGURACIÓN DE PRODUCCIÓN
# Generado automáticamente el $(date)
# =============================================================================

# Aplicación
NODE_ENV=production
DOMAIN=$DOMAIN
SSL_EMAIL=$EMAIL

# Base de datos
DB_NAME=mwpanel
DB_USER=mwpanel
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://mwpanel:$DB_PASSWORD@postgres:5432/mwpanel

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
VITE_API_URL=https://$DOMAIN/api

# Admin por defecto
ADMIN_EMAIL=$EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Email (configurar según tu proveedor)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=$EMAIL
SMTP_PASS=configurar_manualmente
SMTP_SECURE=false
SMTP_TLS=true

# Uploads
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760

# Seguridad
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://$DOMAIN
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
SESSION_SECRET=$JWT_SECRET

# Logging
LOG_LEVEL=info
ENABLE_LOGS=true
EOF

    # Proteger archivo de configuración
    chmod 600 "$APP_DIR/.env"

    log_success "Variables de entorno configuradas"
}

# Función para configurar SSL con Let's Encrypt
configure_ssl() {
    log_step "Configurando SSL con Let's Encrypt..."

    # Instalar Certbot
    apt-get install -y certbot python3-certbot-nginx >/dev/null 2>&1

    # Crear directorio para certificados
    mkdir -p "$APP_DIR/nginx/ssl"
    mkdir -p /var/www/html

    # Configurar nginx temporal para verificación
    cat > /etc/nginx/sites-available/mw-panel-temp << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

    # Desactivar sitio por defecto
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/mw-panel-temp /etc/nginx/sites-enabled/
    
    # Instalar nginx si no está instalado
    if ! command -v nginx >/dev/null 2>&1; then
        apt-get install -y nginx >/dev/null 2>&1
        systemctl enable nginx
    fi
    
    nginx -t && systemctl reload nginx

    # Verificar que el dominio apunte a este servidor
    log_info "Verificando que $DOMAIN apunte a este servidor..."
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null)
    local domain_ip=$(dig +short $DOMAIN 2>/dev/null | tail -n1)
    
    if [[ "$server_ip" != "$domain_ip" ]]; then
        log_warning "El dominio $DOMAIN no parece apuntar a este servidor"
        log_warning "IP del servidor: $server_ip"
        log_warning "IP del dominio: $domain_ip"
        log_warning "Asegúrate de que el DNS esté configurado correctamente"
    fi

    # Obtener certificado SSL
    log_info "Obteniendo certificado SSL para $DOMAIN..."
    if certbot certonly --webroot -w /var/www/html -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive --expand; then
        log_success "Certificado SSL obtenido exitosamente"
    else
        log_warning "No se pudo obtener certificado SSL, continuando sin HTTPS"
        log_warning "Verifica que:"
        log_warning "  - El dominio $DOMAIN apunte a la IP de este servidor"
        log_warning "  - Los puertos 80 y 443 estén abiertos"
        log_warning "  - No haya un firewall bloqueando las conexiones"
    fi

    # Configurar renovación automática
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
    
    # Detener nginx temporal
    systemctl stop nginx
}

# Función para iniciar la aplicación
start_application() {
    log_step "Iniciando MW Panel 2.0..."

    cd "$APP_DIR"

    # Crear volúmenes de Docker
    log_info "Creando volúmenes Docker..."
    docker volume create mw-panel-pgdata >/dev/null 2>&1 || true

    # Crear directorios necesarios
    mkdir -p backend/uploads
    mkdir -p nginx/ssl
    chmod 755 backend/uploads

    # Preparar configuración de nginx
    envsubst '${DOMAIN}' < nginx/nginx.prod.conf > nginx/nginx.prod.conf.tmp
    mv nginx/nginx.prod.conf.tmp nginx/nginx.prod.conf

    # Construir e iniciar servicios con docker-compose de producción
    log_info "Construyendo imágenes Docker..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build --no-cache
    
    log_info "Iniciando servicios..."
    $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d

    # Esperar a que los servicios estén listos
    log_info "Esperando que los servicios estén listos..."
    local max_attempts=60
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps | grep -q "Up"; then
            break
        fi
        sleep 5
        ((attempt++))
    done

    # Verificar que los servicios estén corriendo
    if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_success "Servicios iniciados correctamente"
        log_info "Estado de servicios:"
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps
    else
        log_error "Error iniciando algunos servicios"
        log_error "Logs de servicios:"
        $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs
        exit 1
    fi
}

# Función para ejecutar configuración post-instalación
post_install_setup() {
    log_step "Ejecutando configuración post-instalación..."

    cd "$APP_DIR"

    # Esperar a que la base de datos esté lista
    log_info "Esperando conexión a la base de datos..."
    local attempts=0
    local max_attempts=60  # 10 minutos
    
    while ! $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec -T postgres pg_isready -U mwpanel >/dev/null 2>&1; do
        if [[ $attempts -ge $max_attempts ]]; then
            log_error "La base de datos no responde después de 10 minutos"
            log_error "Logs de PostgreSQL:"
            $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs postgres
            exit 1
        fi
        sleep 10
        ((attempts++))
        if [[ $((attempts % 6)) -eq 0 ]]; then
            log_info "Esperando base de datos... (intento $attempts/$max_attempts)"
        fi
    done

    log_success "Base de datos lista"

    # Esperar a que el backend esté listo
    log_info "Esperando que el backend esté listo..."
    attempts=0
    max_attempts=30  # 5 minutos
    
    while ! curl -sf http://localhost:3000/health >/dev/null 2>&1; do
        if [[ $attempts -ge $max_attempts ]]; then
            log_warning "El backend no responde en el endpoint de salud"
            break
        fi
        sleep 10
        ((attempts++))
    done

    # Ejecutar migraciones
    log_info "Ejecutando migraciones de base de datos..."
    if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec -T backend npm run migration:run; then
        log_success "Migraciones ejecutadas exitosamente"
    else
        log_warning "Error ejecutando migraciones, intentando continuar..."
    fi

    # Ejecutar seeds de datos
    log_info "Ejecutando seeds de datos iniciales..."
    if $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec -T backend npm run seed:run; then
        log_success "Seeds ejecutados exitosamente"
    else
        log_warning "Error ejecutando seeds, intentando continuar..."
    fi

    # Verificar que la aplicación responda
    log_info "Verificando que la aplicación responda..."
    attempts=0
    while ! curl -sf http://localhost:3000/api/health >/dev/null 2>&1; do
        if [[ $attempts -ge 10 ]]; then
            log_warning "La API no responde, pero continuando..."
            break
        fi
        sleep 5
        ((attempts++))
    done

    log_success "Configuración post-instalación completada"
}

# Función para configurar backups automáticos
configure_backups() {
    log_step "Configurando backups automáticos..."

    mkdir -p "$BACKUP_DIR"

    # Crear script de backup
    cat > /usr/local/bin/mw-panel-backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/mw-panel"
DATE=\\$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/mw-panel"
DOCKER_COMPOSE_CMD="$DOCKER_COMPOSE_CMD"

# Crear directorio de backup si no existe
mkdir -p \\$BACKUP_DIR

# Crear backup de la base de datos
echo "Creando backup de base de datos..."
if \\$DOCKER_COMPOSE_CMD -f \\$APP_DIR/docker-compose.prod.yml exec -T postgres pg_dump -U mwpanel mwpanel > \\$BACKUP_DIR/db_backup_\\$DATE.sql; then
    echo "Backup de base de datos creado: \\$BACKUP_DIR/db_backup_\\$DATE.sql"
else
    echo "Error creando backup de base de datos"
fi

# Crear backup de uploads
echo "Creando backup de archivos..."
if tar -czf \\$BACKUP_DIR/uploads_backup_\\$DATE.tar.gz -C \\$APP_DIR backend/uploads; then
    echo "Backup de archivos creado: \\$BACKUP_DIR/uploads_backup_\\$DATE.tar.gz"
else
    echo "Error creando backup de archivos"
fi

# Crear backup de configuración
echo "Creando backup de configuración..."
cp \\$APP_DIR/.env \\$BACKUP_DIR/env_backup_\\$DATE.txt

# Mantener solo los últimos 7 backups
find \\$BACKUP_DIR -name "*.sql" -mtime +7 -delete
find \\$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find \\$BACKUP_DIR -name "*.txt" -mtime +7 -delete

echo "Backup completado: \\$DATE"
EOF

    chmod +x /usr/local/bin/mw-panel-backup.sh

    # Programar backup diario
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/mw-panel-backup.sh") | crontab -

    log_success "Backups automáticos configurados"
}

# Función para mostrar información final
show_final_info() {
    log_success "🎉 ¡MW Panel 2.0 instalado exitosamente!"
    
    echo
    echo -e "${WHITE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${WHITE}║                     INFORMACIÓN DE ACCESO                       ║${NC}"
    echo -e "${WHITE}╠══════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${WHITE}║${NC} 🌐 URL de acceso: ${GREEN}https://$DOMAIN${NC}"
    echo -e "${WHITE}║${NC}"
    echo -e "${WHITE}║${NC} 👨‍💼 ${YELLOW}Administrador:${NC}"
    echo -e "${WHITE}║${NC}    Email: ${GREEN}$EMAIL${NC}"
    echo -e "${WHITE}║${NC}    Contraseña: ${GREEN}$ADMIN_PASSWORD${NC}"
    echo -e "${WHITE}║${NC}"
    echo -e "${WHITE}║${NC} 📊 Panel de API: ${GREEN}https://$DOMAIN/api${NC}"
    echo -e "${WHITE}║${NC}"
    echo -e "${WHITE}║${NC} 📂 Directorio de instalación: ${CYAN}$APP_DIR${NC}"
    echo -e "${WHITE}║${NC} 💾 Backups: ${CYAN}$BACKUP_DIR${NC}"
    echo -e "${WHITE}║${NC} 📋 Logs: ${CYAN}$LOG_FILE${NC}"
    echo -e "${WHITE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo

    echo -e "${YELLOW}📋 COMANDOS ÚTILES:${NC}"
    echo -e "   Ver logs:      ${CYAN}cd $APP_DIR && $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f${NC}"
    echo -e "   Reiniciar:     ${CYAN}cd $APP_DIR && $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml restart${NC}"
    echo -e "   Parar:         ${CYAN}cd $APP_DIR && $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down${NC}"
    echo -e "   Iniciar:       ${CYAN}cd $APP_DIR && $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d${NC}"
    echo -e "   Estado:        ${CYAN}cd $APP_DIR && $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps${NC}"
    echo -e "   Actualizar:    ${CYAN}$APP_DIR/deploy/update.sh${NC}"
    echo -e "   Backup manual: ${CYAN}/usr/local/bin/mw-panel-backup.sh${NC}"
    echo

    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo -e "   • ${RED}Guarda la contraseña del administrador en un lugar seguro${NC}"
    echo -e "   • ${YELLOW}Configura el SMTP en $APP_DIR/.env para envío de emails${NC}"
    echo -e "   • ${GREEN}Los backups se realizan automáticamente a las 2:00 AM${NC}"
    echo -e "   • ${BLUE}Los certificados SSL se renuevan automáticamente${NC}"
    echo

    # Guardar información de acceso
    cat > "$APP_DIR/INSTALL_INFO.txt" << EOF
MW Panel 2.0 - Información de Instalación
==========================================
Fecha de instalación: $(date)
Dominio: $DOMAIN
URL de acceso: https://$DOMAIN

Administrador:
  Email: $EMAIL
  Contraseña: $ADMIN_PASSWORD

Base de datos:
  Usuario: mwpanel
  Contraseña: $DB_PASSWORD
  
Directorio de instalación: $APP_DIR
Directorio de backups: $BACKUP_DIR
Archivo de logs: $LOG_FILE
EOF

    chmod 600 "$APP_DIR/INSTALL_INFO.txt"
}

# =============================================================================
# FUNCIÓN PRINCIPAL
# =============================================================================

main() {
    # Crear log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    show_banner
    
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
            -d|--dir)
                APP_DIR="$2"
                shift 2
                ;;
            --git-repo)
                GIT_REPO="$2"
                shift 2
                ;;
            --no-ssl)
                NO_SSL=true
                shift
                ;;
            --dev)
                DEV_MODE=true
                shift
                ;;
            -*)
                log_error "Opción desconocida: $1"
                show_help
                exit 1
                ;;
            *)
                break
                ;;
        esac
    done

    validate_args "$@"
    detect_os
    check_system_requirements
    generate_passwords
    
    log_info "Iniciando instalación de MW Panel 2.0 en $DOMAIN"
    log_info "Directorio de instalación: $APP_DIR"
    
    update_system
    install_docker
    configure_firewall
    clone_repository
    configure_environment
    
    if [[ -z "${NO_SSL:-}" ]]; then
        configure_ssl
    fi
    
    start_application
    post_install_setup
    configure_backups
    
    show_final_info
    
    log_success "Instalación completada exitosamente"
}

# Función para cleanup en caso de error
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "La instalación falló con código de salida $exit_code"
        log_info "Revisa los logs en $LOG_FILE para más detalles"
        
        if [[ -d "$APP_DIR" ]]; then
            log_info "Puedes intentar continuar manualmente desde $APP_DIR"
        fi
    fi
}

# Capturar errores y ejecutar cleanup
trap cleanup EXIT

# Ejecutar función principal
main "$@"