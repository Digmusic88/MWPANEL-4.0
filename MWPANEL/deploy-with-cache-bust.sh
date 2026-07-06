#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - DEPLOY WITH CACHE BUSTING
# =============================================================================
# Deploy frontend con cache busting automático usando query strings
# Mantiene performance con cache de 1 año + invalidación controlada
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 MW Panel - Deploy with Cache Busting${NC}"
echo -e "${BLUE}=======================================${NC}"

# Generar timestamp único para cache busting
TIMESTAMP=$(date +%Y%m%d%H%M%S)
echo -e "${YELLOW}📅 Cache Bust Timestamp: ${TIMESTAMP}${NC}"

# Paths
FRONTEND_DIR="/opt/mw-panel/frontend"
BUILD_DIR="/opt/mw-panel/dist-frontend"

# Verificar que estamos en el directorio correcto
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Error: Directorio frontend no encontrado${NC}"
    exit 1
fi

# Paso 1: Build del frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
cd "$FRONTEND_DIR"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en el build del frontend${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build completado${NC}"

# Paso 2: Aplicar cache busting al index.html
echo -e "${YELLOW}🔧 Aplicando cache busting...${NC}"
cd /opt/mw-panel

# Backup del index.html original
cp "$BUILD_DIR/index.html" "$BUILD_DIR/index.html.backup"

# Aplicar cache busting usando perl - FIXED for FORCED naming convention
# Buscar archivos .js y .css (con o sin /assets/)
perl -i -pe "s#(/[^\"]*FORCED[^\"]*\.(js|css))\"#\$1?v=${TIMESTAMP}\"#g" "$BUILD_DIR/index.html"
# También buscar archivos en /assets/ por si acaso
perl -i -pe "s#(/assets/[^\"]+\.(js|css))\"#\$1?v=${TIMESTAMP}\"#g" "$BUILD_DIR/index.html"

echo -e "${GREEN}✅ Cache busting aplicado${NC}"

# Paso 3: Copiar al contenedor nginx
echo -e "${YELLOW}📦 Copiando archivos al contenedor nginx...${NC}"

# Verificar que nginx está corriendo
if ! docker ps | grep -q "mw-panel-nginx"; then
    echo -e "${RED}❌ Error: Contenedor nginx no está corriendo${NC}"
    exit 1
fi

# Copiar todos los archivos
docker cp "$BUILD_DIR/." mw-panel-nginx:/usr/share/nginx/html/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archivos copiados exitosamente${NC}"
else
    echo -e "${RED}❌ Error al copiar archivos${NC}"
    exit 1
fi

# Paso 4: Verificación
echo -e "${YELLOW}🧪 Verificando deploy...${NC}"

# Verificar que el cache busting está aplicado
if docker exec mw-panel-nginx grep -q "?v=${TIMESTAMP}" /usr/share/nginx/html/index.html; then
    echo -e "${GREEN}✅ Cache busting verificado${NC}"
else
    echo -e "${RED}❌ Cache busting no aplicado correctamente${NC}"
    exit 1
fi

# Mostrar URLs de ejemplo
echo -e "${BLUE}🔗 URLs con cache busting aplicado:${NC}"
MAIN_JS=$(grep -o '/[^"]*FORCED[^"]*\.js[^"]*' "$BUILD_DIR/index.html" | head -1)
MAIN_CSS=$(grep -o '/[^"]*FORCED[^"]*\.css[^"]*' "$BUILD_DIR/index.html" | head -1)

echo -e "${GREEN}📄 JS:  https://plataforma.mundoworld.school${MAIN_JS}${NC}"
echo -e "${GREEN}🎨 CSS: https://plataforma.mundoworld.school${MAIN_CSS}${NC}"

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}🎉 Deploy completado exitosamente!${NC}"
echo -e "${GREEN}🌐 Aplicación: https://plataforma.mundoworld.school${NC}"
echo -e "${YELLOW}💡 Cache busting activo - Los navegadores descargarán la versión más reciente${NC}"
echo -e "${BLUE}⚡ Performance: Cache de 1 año para archivos sin cambios${NC}"
echo -e "${BLUE}=======================================${NC}"