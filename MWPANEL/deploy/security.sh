#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT DE CONFIGURACIÓN DE SEGURIDAD
# =============================================================================
# Hardening del servidor y configuración de firewall
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
readonly LOG_FILE="/var/log/mw-panel-security.log"

# Puertos permitidos
SSH_PORT=${SSH_PORT:-22}
HTTP_PORT=${HTTP_PORT:-80}
HTTPS_PORT=${HTTPS_PORT:-443}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
REDIS_PORT=${REDIS_PORT:-6379}

# Configuración de seguridad
FAIL2BAN_ENABLED=${FAIL2BAN_ENABLED:-true}
AUTO_UPDATES=${AUTO_UPDATES:-true}
DISABLE_ROOT_SSH=${DISABLE_ROOT_SSH:-true}
CHANGE_SSH_PORT=${CHANGE_SSH_PORT:-false}
NEW_SSH_PORT=${NEW_SSH_PORT:-2222}

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
    echo -e "${PURPLE}🔐 $*${NC}"
    log "[SECURITY] $*"
}

# Banner del script
show_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                    MW PANEL 2.0 SECURITY                        ║
║              CONFIGURACIÓN DE SEGURIDAD DEL SERVIDOR            ║
╚══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
MW Panel 2.0 - Configuración de Seguridad

USO:
    $0 [OPCIONES]

OPCIONES:
    -h, --help              Mostrar esta ayuda
    -p, --ssh-port PUERTO   Cambiar puerto SSH (por defecto: 2222)
    --no-fail2ban           No instalar Fail2Ban
    --no-auto-updates       No habilitar actualizaciones automáticas
    --allow-root-ssh        Permitir SSH como root
    --change-ssh-port       Cambiar puerto SSH por defecto
    --dry-run               Simular cambios sin ejecutar

EJEMPLOS:
    $0                      # Configuración de seguridad estándar
    $0 --change-ssh-port -p 2222  # Cambiar SSH al puerto 2222
    $0 --no-fail2ban        # Sin Fail2Ban
    $0 --dry-run           # Simular cambios

VARIABLES DE ENTORNO:
    SSH_PORT                Puerto SSH actual
    NEW_SSH_PORT            Nuevo puerto SSH
    FAIL2BAN_ENABLED        Instalar Fail2Ban (true/false)
    AUTO_UPDATES            Habilitar updates automáticas (true/false)
    DISABLE_ROOT_SSH        Deshabilitar SSH root (true/false)
EOF
}

# Función para verificar requisitos
check_requirements() {
    log_step "Verificando requisitos del sistema..."

    # Verificar que somos root
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script debe ejecutarse como root"
        exit 1
    fi

    # Verificar distribución
    if [[ ! -f /etc/os-release ]]; then
        log_error "No se puede determinar la distribución del sistema"
        exit 1
    fi

    local distro=$(grep ^ID= /etc/os-release | cut -d= -f2 | tr -d '"')
    log_info "Distribución detectada: $distro"

    # Verificar conectividad
    if ! ping -c 1 google.com >/dev/null 2>&1; then
        log_warning "Sin conectividad a internet - algunas funciones pueden fallar"
    fi

    log_success "Requisitos verificados"
}

# Función para actualizar el sistema
update_system() {
    log_step "Actualizando el sistema..."

    if command -v apt-get >/dev/null 2>&1; then
        # Ubuntu/Debian
        apt-get update
        DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
        apt-get autoremove -y
        apt-get autoclean
    elif command -v yum >/dev/null 2>&1; then
        # CentOS/RHEL
        yum update -y
        yum clean all
    elif command -v dnf >/dev/null 2>&1; then
        # Fedora
        dnf update -y
        dnf clean all
    else
        log_warning "Gestor de paquetes no soportado"
        return 1
    fi

    log_success "Sistema actualizado"
}

# Función para configurar firewall UFW
configure_firewall() {
    log_step "Configurando firewall UFW..."

    # Instalar UFW si no está instalado
    if ! command -v ufw >/dev/null 2>&1; then
        if command -v apt-get >/dev/null 2>&1; then
            apt-get install -y ufw
        elif command -v yum >/dev/null 2>&1; then
            yum install -y ufw
        elif command -v dnf >/dev/null 2>&1; then
            dnf install -y ufw
        else
            log_error "No se pudo instalar UFW"
            return 1
        fi
    fi

    # Configurar reglas por defecto
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing

    # Permitir SSH (importante hacerlo antes de habilitar)
    local ssh_port_to_allow=$SSH_PORT
    if [[ "$CHANGE_SSH_PORT" == "true" ]]; then
        ssh_port_to_allow=$NEW_SSH_PORT
    fi
    
    ufw allow $ssh_port_to_allow/tcp comment 'SSH'
    log_info "SSH permitido en puerto $ssh_port_to_allow"

    # Permitir HTTP y HTTPS
    ufw allow $HTTP_PORT/tcp comment 'HTTP'
    ufw allow $HTTPS_PORT/tcp comment 'HTTPS'
    log_info "HTTP/HTTPS permitidos en puertos $HTTP_PORT/$HTTPS_PORT"

    # Permitir puertos de aplicación (solo desde localhost para seguridad)
    ufw allow from 127.0.0.1 to any port $POSTGRES_PORT comment 'PostgreSQL localhost'
    ufw allow from 127.0.0.1 to any port $REDIS_PORT comment 'Redis localhost'
    log_info "Puertos de aplicación configurados para localhost"

    # Reglas adicionales de seguridad
    ufw limit ssh comment 'Limit SSH connections'
    ufw deny from 169.254.0.0/16 comment 'Block link-local'
    ufw deny from 224.0.0.0/4 comment 'Block multicast'

    # Habilitar UFW
    ufw --force enable
    ufw status verbose

    log_success "Firewall UFW configurado"
}

# Función para instalar y configurar Fail2Ban
configure_fail2ban() {
    if [[ "$FAIL2BAN_ENABLED" != "true" ]]; then
        log_info "Fail2Ban deshabilitado por configuración"
        return 0
    fi

    log_step "Instalando y configurando Fail2Ban..."

    # Instalar Fail2Ban
    if ! command -v fail2ban-server >/dev/null 2>&1; then
        if command -v apt-get >/dev/null 2>&1; then
            apt-get install -y fail2ban
        elif command -v yum >/dev/null 2>&1; then
            yum install -y fail2ban
        elif command -v dnf >/dev/null 2>&1; then
            dnf install -y fail2ban
        else
            log_error "No se pudo instalar Fail2Ban"
            return 1
        fi
    fi

    # Crear configuración personalizada
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
# Configuración general
bantime = 1h
findtime = 10m
maxretry = 3
backend = systemd
ignoreip = 127.0.0.1/8 ::1

# Configuración de notificaciones
destemail = root@localhost
sendername = Fail2Ban
mta = sendmail

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 1h

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 24h

[docker-compose]
enabled = true
filter = docker-compose
logpath = /var/log/messages
maxretry = 3
EOF

    # Crear filtro personalizado para docker-compose
    cat > /etc/fail2ban/filter.d/docker-compose.conf << EOF
[Definition]
failregex = ^.*\[.*\] .*docker.*: authentication failure.*rhost=<HOST>.*$
            ^.*\[.*\] .*docker.*: invalid user.*from <HOST>.*$
ignoreregex =
EOF

    # Reiniciar y habilitar Fail2Ban
    systemctl enable fail2ban
    systemctl restart fail2ban

    # Verificar estado
    systemctl status fail2ban --no-pager
    fail2ban-client status

    log_success "Fail2Ban configurado"
}

# Función para configurar SSH de forma segura
configure_ssh() {
    log_step "Configurando SSH de forma segura..."

    # Backup de configuración original
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)

    # Configuración segura de SSH
    cat > /etc/ssh/sshd_config << EOF
# MW Panel 2.0 - Configuración SSH Segura

# Configuración del puerto
Port $SSH_PORT

# Configuración de protocolo
Protocol 2
AddressFamily inet

# Configuración de autenticación
LoginGraceTime 60
MaxAuthTries 3
MaxSessions 10
MaxStartups 10:30:60

# Configuración de root
PermitRootLogin $([ "$DISABLE_ROOT_SSH" == "true" ] && echo "no" || echo "yes")
StrictModes yes

# Configuración de autenticación por clave
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Configuración de contraseñas
PasswordAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Configuración de forwarding
AllowTcpForwarding no
X11Forwarding no
AllowStreamLocalForwarding no
GatewayPorts no

# Configuración de usuarios
AllowUsers $(whoami)
DenyUsers root

# Configuración de logging
SyslogFacility AUTH
LogLevel INFO

# Configuración de tiempo
ClientAliveInterval 300
ClientAliveCountMax 2

# Configuración de banner
Banner /etc/ssh/banner

# Configuración de algoritmos seguros
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512

# Configuración adicional
UseDNS no
TCPKeepAlive no
Compression no
EOF

    # Crear banner de SSH
    cat > /etc/ssh/banner << EOF
╔══════════════════════════════════════════════════════════════════╗
║                          ACCESO AUTORIZADO                      ║
║                                                                  ║
║   Este sistema es para uso autorizado únicamente.               ║
║   Todas las actividades son monitoreadas y registradas.         ║
║   El acceso no autorizado está prohibido.                       ║
║                                                                  ║
║                        MW Panel 2.0                             ║
╚══════════════════════════════════════════════════════════════════╝

EOF

    # Cambiar puerto SSH si está habilitado
    if [[ "$CHANGE_SSH_PORT" == "true" ]]; then
        sed -i "s/Port $SSH_PORT/Port $NEW_SSH_PORT/" /etc/ssh/sshd_config
        SSH_PORT=$NEW_SSH_PORT
        log_info "Puerto SSH cambiado a $NEW_SSH_PORT"
    fi

    # Verificar configuración
    if sshd -t; then
        log_success "Configuración SSH válida"
        systemctl restart sshd
        log_info "Servicio SSH reiniciado"
    else
        log_error "Error en configuración SSH"
        return 1
    fi
}

# Función para configurar actualizaciones automáticas
configure_auto_updates() {
    if [[ "$AUTO_UPDATES" != "true" ]]; then
        log_info "Actualizaciones automáticas deshabilitadas"
        return 0
    fi

    log_step "Configurando actualizaciones automáticas..."

    if command -v apt-get >/dev/null 2>&1; then
        # Ubuntu/Debian
        apt-get install -y unattended-upgrades apt-listchanges

        cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

Unattended-Upgrade::Mail "root";
Unattended-Upgrade::MailOnlyOnError "true";
EOF

        cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

        systemctl enable unattended-upgrades
        systemctl start unattended-upgrades

    elif command -v yum >/dev/null 2>&1; then
        # CentOS/RHEL
        yum install -y yum-cron
        systemctl enable yum-cron
        systemctl start yum-cron
    fi

    log_success "Actualizaciones automáticas configuradas"
}

# Función para hardening del sistema
system_hardening() {
    log_step "Aplicando hardening del sistema..."

    # Configurar límites del sistema
    cat >> /etc/security/limits.conf << EOF

# MW Panel Security Limits
* soft nproc 65536
* hard nproc 65536
* soft nofile 65536
* hard nofile 65536
root soft nproc unlimited
root hard nproc unlimited
EOF

    # Configurar parámetros del kernel
    cat > /etc/sysctl.d/99-mw-panel-security.conf << EOF
# MW Panel 2.0 - Configuración de seguridad del kernel

# Protección contra IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Protección contra SYN flood
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# Protección contra ICMP redirect
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Protección contra source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Logging de paquetes martian
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignorar ping broadcast
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignorar ICMP bogus error responses
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Protección IPv6
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# Configuración de memoria
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# Protección contra fork bombs
kernel.pid_max = 65536
EOF

    # Aplicar configuración del kernel
    sysctl -p /etc/sysctl.d/99-mw-panel-security.conf

    # Configurar logrotate para logs de seguridad
    cat > /etc/logrotate.d/mw-panel-security << EOF
/var/log/mw-panel-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 0644 root root
}
EOF

    # Configurar umask seguro
    echo "umask 027" >> /etc/profile
    echo "umask 027" >> /etc/bash.bashrc

    log_success "Hardening del sistema aplicado"
}

# Función para configurar monitoreo básico
configure_monitoring() {
    log_step "Configurando monitoreo básico..."

    # Crear script de monitoreo de seguridad
    cat > /usr/local/bin/security-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/security-monitor.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG_FILE"
}

# Verificar intentos de login fallidos
failed_logins=$(lastb -n 50 | wc -l)
if [[ $failed_logins -gt 10 ]]; then
    log "WARNING: $failed_logins intentos de login fallidos detectados"
fi

# Verificar procesos sospechosos
suspicious_procs=$(ps aux | grep -E "(nc|ncat|netcat|wget|curl)" | grep -v grep | wc -l)
if [[ $suspicious_procs -gt 0 ]]; then
    log "WARNING: Procesos potencialmente sospechosos detectados"
fi

# Verificar conexiones de red
established_conns=$(netstat -tn | grep ESTABLISHED | wc -l)
if [[ $established_conns -gt 100 ]]; then
    log "WARNING: Número alto de conexiones establecidas: $established_conns"
fi

# Verificar espacio en disco
disk_usage=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [[ $disk_usage -gt 90 ]]; then
    log "CRITICAL: Uso de disco crítico: ${disk_usage}%"
fi

log "Monitoreo completado - Conexiones: $established_conns, Fallos login: $failed_logins"
EOF

    chmod +x /usr/local/bin/security-monitor.sh

    # Configurar cron para ejecutar cada 15 minutos
    cat > /etc/cron.d/security-monitor << EOF
# MW Panel Security Monitor
*/15 * * * * root /usr/local/bin/security-monitor.sh
EOF

    log_success "Monitoreo básico configurado"
}

# Función para mostrar resumen de seguridad
show_security_summary() {
    log_step "Resumen de configuración de seguridad:"
    
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    CONFIGURACIÓN COMPLETADA                     ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BLUE}🔐 Configuración de seguridad aplicada:${NC}"
    echo -e "   • Firewall UFW configurado y habilitado"
    echo -e "   • SSH endurecido en puerto $SSH_PORT"
    echo -e "   • Fail2Ban instalado: $([[ "$FAIL2BAN_ENABLED" == "true" ]] && echo "✅" || echo "❌")"
    echo -e "   • Actualizaciones automáticas: $([[ "$AUTO_UPDATES" == "true" ]] && echo "✅" || echo "❌")"
    echo -e "   • Root SSH: $([[ "$DISABLE_ROOT_SSH" == "true" ]] && echo "❌ Deshabilitado" || echo "✅ Habilitado")"
    echo -e "   • Hardening del sistema aplicado"
    echo -e "   • Monitoreo básico configurado"
    echo
    echo -e "${YELLOW}⚠️  Recordatorios importantes:${NC}"
    echo -e "   • Reiniciar el servidor para aplicar todos los cambios"
    echo -e "   • Verificar conectividad SSH en puerto $SSH_PORT"
    echo -e "   • Configurar claves SSH para mayor seguridad"
    echo -e "   • Revisar logs en /var/log/mw-panel-security.log"
    echo
    echo -e "${BLUE}📋 Comandos útiles:${NC}"
    echo -e "   • ufw status verbose       # Estado del firewall"
    echo -e "   • fail2ban-client status   # Estado de Fail2Ban"
    echo -e "   • journalctl -u ssh        # Logs SSH"
    echo -e "   • tail -f /var/log/auth.log # Monitorear intentos de acceso"
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
            -p|--ssh-port)
                NEW_SSH_PORT="$2"
                shift 2
                ;;
            --no-fail2ban)
                FAIL2BAN_ENABLED=false
                shift
                ;;
            --no-auto-updates)
                AUTO_UPDATES=false
                shift
                ;;
            --allow-root-ssh)
                DISABLE_ROOT_SSH=false
                shift
                ;;
            --change-ssh-port)
                CHANGE_SSH_PORT=true
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
    
    log_info "Iniciando configuración de seguridad de MW Panel 2.0"
    log_info "SSH Puerto: $SSH_PORT → $([[ "$CHANGE_SSH_PORT" == "true" ]] && echo "$NEW_SSH_PORT" || echo "$SSH_PORT")"
    log_info "Fail2Ban: $FAIL2BAN_ENABLED"
    log_info "Auto-updates: $AUTO_UPDATES"
    log_info "Root SSH: $([[ "$DISABLE_ROOT_SSH" == "true" ]] && echo "Deshabilitado" || echo "Habilitado")"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "MODO DRY-RUN - No se ejecutarán cambios reales"
        exit 0
    fi
    
    check_requirements
    update_system
    configure_firewall
    configure_fail2ban
    configure_ssh
    configure_auto_updates
    system_hardening
    configure_monitoring
    
    show_security_summary
    log_success "Configuración de seguridad completada exitosamente"
    
    log_warning "IMPORTANTE: Se recomienda reiniciar el servidor para aplicar todos los cambios"
    log_warning "IMPORTANTE: Verificar conectividad SSH antes de cerrar la sesión actual"
}

# Función para cleanup en caso de error
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "La configuración de seguridad falló con código de salida $exit_code"
        log_error "Revisar logs en $LOG_FILE"
    fi
}

# Capturar errores y ejecutar cleanup
trap cleanup EXIT

# Ejecutar función principal
main "$@"