#!/bin/bash
# =============================================================================
# MW PANEL - REBUILD RÁPIDO Y ROBUSTO
# =============================================================================
# Script optimizado para rebuild sin errores de docker-compose
# Evita: ContainerConfig KeyError, contenedores huérfanos, variables perdidas
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Función de ayuda
show_help() {
    echo -e "${BLUE}MW PANEL - Quick Rebuild${NC}"
    echo ""
    echo "Uso: $0 [componente] [opciones]"
    echo ""
    echo "Componentes:"
    echo "  backend     Rebuild solo backend (más rápido, ~30s)"
    echo "  frontend    Rebuild solo frontend (~45s)"
    echo "  all         Rebuild completo (~90s)"
    echo "  restart     Solo reiniciar sin rebuild (~10s)"
    echo ""
    echo "Opciones:"
    echo "  --no-cache  Forzar rebuild sin caché de Docker"
    echo "  --sync      Sincronizar .env antes de rebuild"
    echo "  --help      Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 backend           # Rebuild rápido del backend"
    echo "  $0 backend --sync    # Sincronizar env + rebuild backend"
    echo "  $0 all --no-cache    # Rebuild completo sin caché"
    echo "  $0 restart           # Solo reiniciar contenedores"
}

# Timer
START_TIME=$(date +%s)

# Parsear argumentos
COMPONENT="${1:-backend}"
NO_CACHE=""
SYNC_ENV=""

for arg in "$@"; do
    case $arg in
        --no-cache) NO_CACHE="--no-cache" ;;
        --sync) SYNC_ENV="yes" ;;
        --help|-h) show_help; exit 0 ;;
    esac
done

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          MW PANEL - QUICK REBUILD                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Paso 1: Sincronizar .env si se solicitó
if [ "$SYNC_ENV" = "yes" ]; then
    echo -e "${YELLOW}📋 Sincronizando configuración...${NC}"
    if [ -f "sync-env.sh" ]; then
        bash sync-env.sh
    else
        echo -e "${RED}   ⚠ sync-env.sh no encontrado, continuando...${NC}"
    fi
    echo ""
fi

# Paso 2: Limpiar contenedores problemáticos (silencioso)
echo -e "${YELLOW}🧹 Limpiando contenedores problemáticos...${NC}"
docker rm -f mw-panel-watchtower 2>/dev/null || true
docker rm -f mw-panel-certbot 2>/dev/null || true
docker rm -f mw-panel-certbot-prod 2>/dev/null || true

# Paso 3: Verificar que postgres y redis están corriendo
echo -e "${YELLOW}🔍 Verificando servicios base...${NC}"
if ! docker ps | grep -q "mw-panel-db"; then
    echo -e "${CYAN}   Iniciando PostgreSQL...${NC}"
    docker-compose up -d postgres 2>/dev/null || docker start mw-panel-db-prod 2>/dev/null || true
    sleep 5
fi

if ! docker ps | grep -q "mw-panel-redis"; then
    echo -e "${CYAN}   Iniciando Redis...${NC}"
    docker-compose up -d redis 2>/dev/null || docker start mw-panel-redis-prod 2>/dev/null || true
    sleep 3
fi

# Función para rebuild backend
rebuild_backend() {
    echo -e "${YELLOW}🔧 Rebuilding Backend...${NC}"

    # Parar backend actual
    echo -e "${CYAN}   Parando backend actual...${NC}"
    docker stop mw-panel-backend-prod 2>/dev/null || docker stop mw-panel-backend 2>/dev/null || true
    docker rm mw-panel-backend-prod 2>/dev/null || docker rm mw-panel-backend 2>/dev/null || true

    # Build con docker-compose (usa .env automáticamente)
    echo -e "${CYAN}   Building imagen...${NC}"
    docker-compose build $NO_CACHE backend 2>&1 | grep -E "(Step|Successfully|ERROR)" || true

    # Iniciar backend
    echo -e "${CYAN}   Iniciando backend...${NC}"
    docker-compose up -d backend 2>&1 | grep -v "orphan" || true

    # Esperar a que esté healthy
    echo -e "${CYAN}   Esperando health check...${NC}"
    for i in {1..30}; do
        if docker exec mw-panel-backend curl -sf http://localhost:3000/api/health/status >/dev/null 2>&1; then
            echo -e "${GREEN}   ✓ Backend healthy${NC}"
            return 0
        fi
        sleep 2
        echo -n "."
    done
    echo ""
    echo -e "${YELLOW}   ⚠ Health check timeout, verificando logs...${NC}"
    docker logs mw-panel-backend --tail 10 2>&1 || docker logs mw-panel-backend-prod --tail 10 2>&1 || true
}

# Función para rebuild frontend
rebuild_frontend() {
    echo -e "${YELLOW}🎨 Rebuilding Frontend...${NC}"

    # Parar frontend actual
    echo -e "${CYAN}   Parando frontend actual...${NC}"
    docker stop mw-panel-frontend-prod 2>/dev/null || docker stop mw-panel-frontend 2>/dev/null || true
    docker rm mw-panel-frontend-prod 2>/dev/null || docker rm mw-panel-frontend 2>/dev/null || true

    # Build
    echo -e "${CYAN}   Building imagen...${NC}"
    docker-compose build $NO_CACHE frontend 2>&1 | grep -E "(Step|Successfully|ERROR)" || true

    # Iniciar frontend
    echo -e "${CYAN}   Iniciando frontend...${NC}"
    docker-compose up -d frontend 2>&1 | grep -v "orphan" || true

    echo -e "${GREEN}   ✓ Frontend iniciado${NC}"
}

# Función para solo restart
do_restart() {
    echo -e "${YELLOW}🔄 Reiniciando servicios...${NC}"
    docker-compose restart backend frontend 2>&1 | grep -v "orphan" || true

    # Esperar health
    echo -e "${CYAN}   Esperando health check...${NC}"
    sleep 10
    if curl -sf http://localhost:3000/api/health/status >/dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Servicios reiniciados${NC}"
    fi
}

# Ejecutar según componente
case $COMPONENT in
    backend)
        rebuild_backend
        ;;
    frontend)
        rebuild_frontend
        ;;
    all)
        rebuild_backend
        rebuild_frontend
        # Reload nginx
        echo -e "${YELLOW}🌐 Recargando nginx...${NC}"
        sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true
        ;;
    restart)
        do_restart
        ;;
    *)
        echo -e "${RED}❌ Componente desconocido: $COMPONENT${NC}"
        show_help
        exit 1
        ;;
esac

# Verificación final
echo ""
echo -e "${YELLOW}📊 Verificación final...${NC}"

# Verificar variables de Google Drive en el contenedor
BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "backend" | head -1)
if [ -n "$BACKEND_CONTAINER" ]; then
    GDRIVE_ID=$(docker exec $BACKEND_CONTAINER printenv GOOGLE_SHARED_DRIVE_ID 2>/dev/null || echo "")
    GDRIVE_NAME=$(docker exec $BACKEND_CONTAINER printenv GOOGLE_SHARED_DRIVE_NAME 2>/dev/null || echo "")

    if [ -n "$GDRIVE_ID" ] && [ -n "$GDRIVE_NAME" ]; then
        echo -e "${GREEN}   ✓ Google Drive configurado: $GDRIVE_NAME${NC}"
    else
        echo -e "${RED}   ⚠ Google Drive NO configurado en contenedor${NC}"
        echo -e "${YELLOW}     Ejecute: ./sync-env.sh && ./quick-rebuild.sh backend${NC}"
    fi
fi

# Mostrar estado de contenedores
echo ""
echo -e "${BLUE}📦 Estado de contenedores:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(backend|frontend|postgres|redis)" || true

# Tiempo total
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
echo ""
echo -e "${GREEN}✅ Completado en ${ELAPSED} segundos${NC}"
echo ""
echo -e "${BLUE}URLs de acceso:${NC}"
echo "   🌐 Panel: https://plataforma.mundoworld.school"
echo "   📚 API:   https://plataforma.mundoworld.school/api/health/status"
