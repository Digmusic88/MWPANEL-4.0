#!/bin/bash

# =============================================================================
# MW PANEL 2.0 - CACHE BUSTING SCRIPT
# =============================================================================
# Añade query strings con timestamp para invalidar cache del navegador
# Mantiene el rendimiento con cache de 1 año pero permite actualizaciones
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 MW Panel - Cache Busting Script${NC}"
echo -e "${BLUE}====================================${NC}"

# Generar timestamp único
TIMESTAMP=$(date +%Y%m%d%H%M%S)
echo -e "${YELLOW}📅 Timestamp: ${TIMESTAMP}${NC}"

# Ruta del build frontend
FRONTEND_BUILD="/opt/mw-panel/dist-frontend"
NGINX_HTML="/usr/share/nginx/html"

if [ ! -d "$FRONTEND_BUILD" ]; then
    echo -e "${RED}❌ Error: Directorio $FRONTEND_BUILD no encontrado${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 Aplicando cache busting a archivos...${NC}"

# Función para aplicar cache busting al index.html
apply_cache_busting() {
    local file="$1"
    local temp_file="${file}.tmp"
    
    echo -e "${BLUE}🔧 Procesando: $(basename "$file")${NC}"
    
    # Aplicar cache busting a archivos JS y CSS
    sed -E \
        -e 's#(src="/assets/[^"]+\.js)("#\1?v='${TIMESTAMP}'\2#g' \
        -e 's#(href="/assets/[^"]+\.css)("#\1?v='${TIMESTAMP}'\2#g' \
        -e 's#(href="/assets/[^"]+\.js)("#\1?v='${TIMESTAMP}'\2#g' \
        "$file" > "$temp_file"
    
    mv "$temp_file" "$file"
    echo -e "${GREEN}✅ Cache busting aplicado a $(basename "$file")${NC}"
}

# Aplicar cache busting al index.html del build
if [ -f "$FRONTEND_BUILD/index.html" ]; then
    apply_cache_busting "$FRONTEND_BUILD/index.html"
else
    echo -e "${RED}❌ Error: $FRONTEND_BUILD/index.html no encontrado${NC}"
    exit 1
fi

# Copiar archivos actualizados al contenedor nginx
echo -e "${YELLOW}📦 Copiando archivos al contenedor nginx...${NC}"

# Verificar que el contenedor nginx existe
if ! docker ps | grep -q "mw-panel-nginx"; then
    echo -e "${RED}❌ Error: Contenedor mw-panel-nginx no encontrado${NC}"
    exit 1
fi

# Copiar al contenedor
docker cp "$FRONTEND_BUILD/." mw-panel-nginx:/usr/share/nginx/html/

# Verificar la copia
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archivos copiados exitosamente${NC}"
else
    echo -e "${RED}❌ Error al copiar archivos${NC}"
    exit 1
fi

# Mostrar ejemplo de URLs con cache busting
echo -e "${BLUE}🔗 Ejemplos de URLs con cache busting:${NC}"
echo -e "${GREEN}https://plataforma.mundoworld.school/assets/index-CGCl5wBe.js?v=${TIMESTAMP}${NC}"
echo -e "${GREEN}https://plataforma.mundoworld.school/assets/index-DTHhq24h.css?v=${TIMESTAMP}${NC}"

# Reiniciar nginx para aplicar cambios
echo -e "${YELLOW}🔄 Reiniciando nginx...${NC}"
docker restart mw-panel-nginx

# Esperar a que nginx esté listo
echo -e "${YELLOW}⏳ Esperando a que nginx esté listo...${NC}"
sleep 5

# Verificar que nginx está funcionando
if docker ps | grep -q "mw-panel-nginx.*Up"; then
    echo -e "${GREEN}✅ Nginx reiniciado correctamente${NC}"
else
    echo -e "${RED}❌ Error: Nginx no está funcionando correctamente${NC}"
    exit 1
fi

# Test de verificación
echo -e "${BLUE}🧪 Verificando cache busting...${NC}"

# Verificar que el index.html tiene los query strings
if docker exec mw-panel-nginx grep -q "?v=${TIMESTAMP}" /usr/share/nginx/html/index.html; then
    echo -e "${GREEN}✅ Cache busting aplicado correctamente${NC}"
else
    echo -e "${RED}❌ Cache busting no aplicado correctamente${NC}"
fi

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}🎉 Cache busting completado exitosamente!${NC}"
echo -e "${GREEN}🌐 Accede a: https://plataforma.mundoworld.school${NC}"
echo -e "${YELLOW}💡 Los navegadores descargarán las versiones más recientes${NC}"
echo -e "${BLUE}===========================================${NC}"