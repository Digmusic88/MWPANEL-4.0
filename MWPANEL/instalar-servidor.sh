#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT DE INSTALACIÓN REMOTA SIMPLIFICADA
# =============================================================================
# Este script automatiza completamente la instalación en tu servidor Hetzner
# IP: 91.99.205.204
# =============================================================================

set -euo pipefail

# Colores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MW PANEL 2.0 - INSTALACIÓN AUTOMÁTICA EN SERVIDOR HETZNER${NC}"
echo -e "${BLUE}📍 IP del servidor: 91.99.205.204${NC}"
echo

# Verificar que tenemos los parámetros necesarios
if [[ $# -lt 2 ]]; then
    echo -e "${RED}❌ Error: Faltan parámetros${NC}"
    echo -e "${YELLOW}Uso: $0 TU-DOMINIO.com tu-email@dominio.com${NC}"
    echo
    echo -e "${YELLOW}Ejemplos:${NC}"
    echo -e "  $0 panel.miescuela.com admin@miescuela.com"
    echo -e "  $0 mwpanel.duckdns.org profesor@gmail.com"
    exit 1
fi

DOMAIN="$1"
EMAIL="$2"
SERVER_IP="91.99.205.204"

echo -e "${YELLOW}📋 CONFIGURACIÓN:${NC}"
echo -e "   Dominio: ${GREEN}$DOMAIN${NC}"
echo -e "   Email: ${GREEN}$EMAIL${NC}"
echo -e "   Servidor: ${GREEN}$SERVER_IP${NC}"
echo

# Verificar conectividad
echo -e "${BLUE}🔍 Verificando conectividad al servidor...${NC}"
if ! ping -c 2 $SERVER_IP >/dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar al servidor${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Servidor accesible${NC}"

# Verificar clave SSH
if [[ ! -f ~/.ssh/mw_panel_hetzner ]]; then
    echo -e "${RED}❌ No se encuentra la clave SSH ~/.ssh/mw_panel_hetzner${NC}"
    echo -e "${YELLOW}Ejecuta primero: ssh-keygen -t ed25519 -f ~/.ssh/mw_panel_hetzner${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Clave SSH encontrada${NC}"

# Verificar conexión SSH
echo -e "${BLUE}🔐 Verificando conexión SSH...${NC}"
if ! ssh -i ~/.ssh/mw_panel_hetzner -o ConnectTimeout=10 -o BatchMode=yes root@$SERVER_IP "echo 'SSH OK'" >/dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar por SSH${NC}"
    echo -e "${YELLOW}Verifica que:${NC}"
    echo -e "  - La clave SSH esté configurada en Hetzner"
    echo -e "  - El servidor esté iniciado"
    echo -e "  - No haya firewall bloqueando el puerto 22"
    exit 1
fi

echo -e "${GREEN}✅ Conexión SSH exitosa${NC}"
echo

# Crear script de instalación temporal
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << 'EOF'
#!/bin/bash
set -euo pipefail

DOMAIN="$1"
EMAIL="$2"

echo "🔄 Actualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update >/dev/null 2>&1
apt-get install -y git curl wget >/dev/null 2>&1

echo "📦 Verificando archivos MW Panel 2.0..."
if [[ ! -d "/opt/mw-panel" ]] || [[ ! -f "/opt/mw-panel/deploy/install-vps.sh" ]]; then
    echo "❌ Error: Archivos del proyecto no encontrados en /opt/mw-panel"
    echo "📋 Primero ejecuta: ./subir-archivos.sh"
    exit 1
fi

echo "✅ Archivos del proyecto encontrados"

cd /opt/mw-panel

echo "🚀 Iniciando instalación de MW Panel 2.0..."
chmod +x deploy/install-vps.sh
./deploy/install-vps.sh "$DOMAIN" "$EMAIL"
EOF

echo -e "${BLUE}🚀 Iniciando instalación remota...${NC}"
echo -e "${YELLOW}⏱️  Este proceso puede tomar 10-15 minutos${NC}"
echo

# Ejecutar instalación en el servidor
ssh -i ~/.ssh/mw_panel_hetzner root@$SERVER_IP "bash -s $DOMAIN $EMAIL" < "$TEMP_SCRIPT"

# Limpiar archivo temporal
rm "$TEMP_SCRIPT"

echo
echo -e "${GREEN}🎉 ¡INSTALACIÓN COMPLETADA!${NC}"
echo
echo -e "${YELLOW}📋 INFORMACIÓN DE ACCESO:${NC}"
echo -e "   🌐 URL: ${GREEN}https://$DOMAIN${NC}"
echo -e "   📧 Email admin: ${GREEN}$EMAIL${NC}"
echo -e "   🔑 Contraseña: ${YELLOW}Revisa el log de instalación${NC}"
echo
echo -e "${YELLOW}🔧 COMANDOS ÚTILES:${NC}"
echo -e "   Conectar al servidor: ${BLUE}ssh mw-panel-server${NC}"
echo -e "   Ver logs: ${BLUE}ssh mw-panel-server 'cd /opt/mw-panel && docker compose -f docker-compose.prod.yml logs -f'${NC}"
echo -e "   Reiniciar: ${BLUE}ssh mw-panel-server 'cd /opt/mw-panel && docker compose -f docker-compose.prod.yml restart'${NC}"
echo
echo -e "${GREEN}✨ ¡Tu panel educativo está listo para usar!${NC}"