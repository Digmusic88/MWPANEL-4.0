#!/bin/bash
# =============================================================================
# MW PANEL - SINCRONIZACIÓN DE CONFIGURACIÓN
# =============================================================================
# Este script sincroniza .env.master con todos los archivos de configuración
# y opcionalmente reinicia los servicios
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MW PANEL - SINCRONIZACIÓN DE CONFIGURACIÓN              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que existe .env.master
if [ ! -f ".env.master" ]; then
    echo -e "${RED}❌ ERROR: No existe .env.master${NC}"
    echo "   Cree el archivo .env.master con la configuración maestra"
    exit 1
fi

echo -e "${YELLOW}📋 Sincronizando configuración desde .env.master...${NC}"

# 1. Copiar .env.master a .env (raíz)
echo -e "${GREEN}   ✓ Actualizando .env (raíz)${NC}"
cp .env.master .env

# 2. Copiar a backend/.env
echo -e "${GREEN}   ✓ Actualizando backend/.env${NC}"
cp .env.master backend/.env

# 3. Verificar variables críticas de Google Drive
DRIVE_NAME=$(grep "^GOOGLE_SHARED_DRIVE_NAME=" .env.master | cut -d'=' -f2-)
DRIVE_ID=$(grep "^GOOGLE_SHARED_DRIVE_ID=" .env.master | cut -d'=' -f2-)

if [ -z "$DRIVE_NAME" ] || [ -z "$DRIVE_ID" ]; then
    echo -e "${RED}❌ ERROR: Variables de Google Drive no configuradas en .env.master${NC}"
    echo "   GOOGLE_SHARED_DRIVE_NAME y GOOGLE_SHARED_DRIVE_ID son obligatorias"
    exit 1
fi

echo -e "${GREEN}   ✓ Google Drive configurado: ${DRIVE_NAME}${NC}"

# 4. Mostrar variables críticas sincronizadas
echo ""
echo -e "${BLUE}📊 Variables críticas sincronizadas:${NC}"
echo -e "   • JWT_SECRET: $(grep '^JWT_SECRET=' .env | cut -d'=' -f2 | head -c 20)..."
echo -e "   • RESEND_API_KEY: $(grep '^RESEND_API_KEY=' .env | cut -d'=' -f2 | head -c 15)..."
echo -e "   • GOOGLE_SHARED_DRIVE_ID: $DRIVE_ID"
echo -e "   • ADMIN_EMAIL: $(grep '^ADMIN_EMAIL=' .env | cut -d'=' -f2)"

echo ""
echo -e "${GREEN}✅ Configuración sincronizada exitosamente${NC}"
echo ""
echo -e "${YELLOW}ℹ️  Para aplicar cambios a contenedores en ejecución:${NC}"
echo "   ./quick-rebuild.sh backend    # Solo backend"
echo "   ./quick-rebuild.sh all        # Todo el sistema"
