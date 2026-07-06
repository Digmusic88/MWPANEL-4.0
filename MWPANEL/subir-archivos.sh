#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT PARA SUBIR ARCHIVOS AL SERVIDOR
# =============================================================================
# Transfiere todos los archivos del proyecto al servidor Hetzner
# IP: 91.99.205.204
# =============================================================================

set -euo pipefail

# Colores para output
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

SERVER_IP="91.99.205.204"
PROJECT_DIR="/Users/digmusic/Documents/MWPANEL 2.0/mw-panel"
REMOTE_DIR="/opt/mw-panel"

echo -e "${BLUE}📁 MW PANEL 2.0 - TRANSFERENCIA DE ARCHIVOS${NC}"
echo -e "${BLUE}📍 Servidor: $SERVER_IP${NC}"
echo

# Verificar que estamos en el directorio correcto
if [[ ! -d "backend" ]] || [[ ! -d "frontend" ]] || [[ ! -d "deploy" ]]; then
    echo -e "${RED}❌ Error: No estás en el directorio del proyecto MW Panel${NC}"
    echo -e "${YELLOW}Ejecuta desde: $PROJECT_DIR${NC}"
    echo -e "${YELLOW}Directorios requeridos: backend/, frontend/, deploy/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Directorio del proyecto verificado${NC}"

# Verificar conexión SSH
echo -e "${BLUE}🔐 Verificando conexión SSH...${NC}"
if ! ssh -i ~/.ssh/mw_panel_hetzner -o ConnectTimeout=10 -o BatchMode=yes root@$SERVER_IP "echo 'SSH OK'" >/dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar por SSH${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión SSH exitosa${NC}"

# Crear directorio remoto
echo -e "${BLUE}📂 Preparando directorio remoto...${NC}"
ssh -i ~/.ssh/mw_panel_hetzner root@$SERVER_IP "mkdir -p $REMOTE_DIR"

# Crear archivo .rsyncignore para excluir archivos innecesarios
cat > .rsyncignore << 'EOF'
node_modules/
.git/
dist/
build/
.env
.env.local
.env.production
.DS_Store
*.log
backend/uploads/
frontend/dist/
backend/dist/
.vscode/
.idea/
*.tmp
*.temp
coverage/
.nyc_output/
EOF

echo -e "${BLUE}🚀 Transfiriendo archivos...${NC}"
echo -e "${YELLOW}⏱️  Esto puede tomar varios minutos dependiendo del tamaño${NC}"

# Usar rsync para transferencia eficiente
rsync -avz --progress \
    --exclude-from=.rsyncignore \
    -e "ssh -i ~/.ssh/mw_panel_hetzner" \
    ./ root@$SERVER_IP:$REMOTE_DIR/

# Verificar transferencia
echo -e "${BLUE}🔍 Verificando transferencia...${NC}"
REMOTE_FILES=$(ssh -i ~/.ssh/mw_panel_hetzner root@$SERVER_IP "find $REMOTE_DIR -type f | wc -l")
LOCAL_FILES=$(find . -type f ! -path "./node_modules/*" ! -path "./.git/*" ! -path "./*/dist/*" | wc -l)

echo -e "${GREEN}✅ Transferencia completada${NC}"
echo -e "   📁 Archivos locales: $LOCAL_FILES"
echo -e "   📁 Archivos remotos: $REMOTE_FILES"

# Configurar permisos
echo -e "${BLUE}🔐 Configurando permisos...${NC}"
ssh -i ~/.ssh/mw_panel_hetzner root@$SERVER_IP "
    cd $REMOTE_DIR
    chmod +x deploy/*.sh
    chmod +x *.sh
    chmod 600 .env 2>/dev/null || true
    chown -R root:root .
"

echo -e "${GREEN}✅ Permisos configurados${NC}"

# Limpiar archivo temporal
rm -f .rsyncignore

echo
echo -e "${GREEN}🎉 ¡ARCHIVOS TRANSFERIDOS EXITOSAMENTE!${NC}"
echo
echo -e "${YELLOW}📋 PRÓXIMOS PASOS:${NC}"
echo -e "   1. Conectar al servidor: ${BLUE}ssh mw-panel-server${NC}"
echo -e "   2. Ir al directorio: ${BLUE}cd $REMOTE_DIR${NC}"
echo -e "   3. Ejecutar instalación: ${BLUE}./deploy/install-vps.sh TU-DOMINIO.com tu-email@dominio.com${NC}"
echo
echo -e "${YELLOW}🔧 COMANDOS ÚTILES:${NC}"
echo -e "   Ver archivos remotos: ${BLUE}ssh mw-panel-server 'ls -la $REMOTE_DIR'${NC}"
echo -e "   Actualizar archivos: ${BLUE}./subir-archivos.sh${NC} (ejecutar de nuevo)"
echo