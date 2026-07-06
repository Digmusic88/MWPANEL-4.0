#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - SCRIPT PARA SUBIR Y DESCOMPRIMIR ZIP EN SERVIDOR
# =============================================================================
# Método alternativo: subir ZIP y descomprimir en el servidor
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

echo -e "${BLUE}📦 MW PANEL 2.0 - TRANSFERENCIA VÍA ZIP${NC}"
echo -e "${BLUE}📍 Servidor: $SERVER_IP${NC}"
echo

# Buscar el archivo ZIP más reciente
ZIP_FILE=$(ls -t mw-panel-*.zip 2>/dev/null | head -n1)

if [[ -z "$ZIP_FILE" ]]; then
    echo -e "${YELLOW}⚠️  No se encontró archivo ZIP, creando uno nuevo...${NC}"
    
    # Crear ZIP excluyendo archivos innecesarios
    zip -r "mw-panel-$(date +%Y%m%d_%H%M).zip" . \
        -x "node_modules/*" ".git/*" "backend/dist/*" "frontend/dist/*" \
           "*.log" ".DS_Store" "backend/uploads/*" "*.tmp" "*.temp" \
           ".env" ".env.local" ".env.production"
    
    ZIP_FILE=$(ls -t mw-panel-*.zip | head -n1)
fi

echo -e "${GREEN}✅ Usando archivo ZIP: $ZIP_FILE${NC}"

# Mostrar información del archivo
ZIP_SIZE=$(ls -lh "$ZIP_FILE" | awk '{print $5}')
echo -e "${BLUE}📁 Tamaño del archivo: $ZIP_SIZE${NC}"

# Verificar conexión SSH
echo -e "${BLUE}🔐 Verificando conexión SSH...${NC}"
if ! ssh -i ~/.ssh/mw_panel_hetzner -o ConnectTimeout=10 -o BatchMode=yes root@$SERVER_IP "echo 'SSH OK'" >/dev/null 2>&1; then
    echo -e "${RED}❌ No se puede conectar por SSH${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión SSH exitosa${NC}"

# Subir archivo ZIP
echo -e "${BLUE}🚀 Subiendo archivo ZIP al servidor...${NC}"
echo -e "${YELLOW}⏱️  Esto puede tomar varios minutos (archivo de $ZIP_SIZE)${NC}"

scp -i ~/.ssh/mw_panel_hetzner "$ZIP_FILE" root@$SERVER_IP:/tmp/

echo -e "${GREEN}✅ Archivo ZIP subido exitosamente${NC}"

# Instalar unzip en el servidor si no está instalado
echo -e "${BLUE}🔧 Preparando servidor...${NC}"
ssh -i ~/.ssh/mw_panel_hetzner root@$SERVER_IP "
    apt-get update >/dev/null 2>&1
    apt-get install -y unzip >/dev/null 2>&1
    mkdir -p $REMOTE_DIR
"

# Descomprimir en el servidor
echo -e "${BLUE}📦 Descomprimiendo archivos en el servidor...${NC}"
ssh -i ~/.ssh/mw_panel_hetzner root@$SERVER_IP "
    cd $REMOTE_DIR
    rm -rf * 2>/dev/null || true
    unzip -q /tmp/$ZIP_FILE -d .
    rm -f /tmp/$ZIP_FILE
    
    # Configurar permisos
    chmod +x deploy/*.sh 2>/dev/null || true
    chmod +x *.sh 2>/dev/null || true
    chmod 600 .env 2>/dev/null || true
    chown -R root:root .
    
    echo 'Archivos descomprimidos exitosamente'
"

echo -e "${GREEN}✅ Descompresión completada${NC}"

# Verificar archivos
echo -e "${BLUE}🔍 Verificando archivos en el servidor...${NC}"
REMOTE_FILES=$(ssh -i ~/.ssh/mw_panel_hetzner root@$SERVER_IP "find $REMOTE_DIR -type f | wc -l")
echo -e "${GREEN}✅ Archivos en el servidor: $REMOTE_FILES${NC}"

# Limpiar ZIP local (opcional)
read -p "¿Eliminar archivo ZIP local? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm "$ZIP_FILE"
    echo -e "${GREEN}✅ Archivo ZIP local eliminado${NC}"
fi

echo
echo -e "${GREEN}🎉 ¡TRANSFERENCIA VÍA ZIP COMPLETADA!${NC}"
echo
echo -e "${YELLOW}📋 PRÓXIMOS PASOS:${NC}"
echo -e "   1. Conectar al servidor: ${BLUE}ssh mw-panel-server${NC}"
echo -e "   2. Ir al directorio: ${BLUE}cd $REMOTE_DIR${NC}"
echo -e "   3. Ejecutar instalación: ${BLUE}./deploy/install-vps.sh TU-DOMINIO.com tu-email@dominio.com${NC}"
echo
echo -e "${YELLOW}🔧 COMANDO DIRECTO:${NC}"
echo -e "   ${BLUE}./comandos-servidor.sh instalar TU-DOMINIO.com tu-email@dominio.com${NC}"
echo