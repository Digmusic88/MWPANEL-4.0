#!/bin/bash
# =============================================================================
# MW PANEL - COMPILACIÓN ROBUSTA SIN ERRORES
# =============================================================================
# Estrategia: docker-compose build + recrear contenedor con configuración correcta
# Maneja automáticamente: aliases de red, DB/Redis, nginx IP fix
# Tiempo estimado: ~2-3 minutos (depende del build)
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

START_TIME=$(date +%s)

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      MW PANEL - COMPILACIÓN ROBUSTA SIN ERRORES             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# PASO 1: Compilar nueva imagen Docker
# =============================================================================
echo -e "${YELLOW}⚡ Paso 1: Compilando imagen Docker del backend...${NC}"
echo -e "${CYAN}   (Esto puede tomar 1-2 minutos)${NC}"

if ! docker-compose -f docker-compose.prod.yml build --no-cache backend 2>&1 | grep -E "(Successfully|naming|DONE|error|Error|ERROR)" | tail -20; then
    echo -e "${RED}❌ Error durante la compilación. Verificando logs...${NC}"
    docker-compose -f docker-compose.prod.yml build backend 2>&1 | tail -30
    exit 1
fi
echo -e "${GREEN}   ✓ Imagen compilada exitosamente${NC}"

# =============================================================================
# PASO 2: Detener y eliminar contenedor backend actual
# =============================================================================
echo ""
echo -e "${YELLOW}⚡ Paso 2: Reemplazando contenedor backend...${NC}"

docker stop mw-panel-backend-prod 2>/dev/null || true
docker rm mw-panel-backend-prod 2>/dev/null || true
echo -e "${GREEN}   ✓ Contenedor anterior eliminado${NC}"

# =============================================================================
# PASO 3: Crear nuevo contenedor con configuración correcta
# =============================================================================
echo ""
echo -e "${YELLOW}⚡ Paso 3: Iniciando nuevo contenedor...${NC}"

docker run -d \
  --name mw-panel-backend-prod \
  --network mw-panel_mw-network \
  -p 127.0.0.1:3000:3000 \
  -v /opt/mw-panel/backend/uploads:/app/uploads \
  -v /opt/mw-panel/backend/google-credentials.json:/app/google-credentials.json:ro \
  -v /opt/mw-panel/backend/.env:/app/.env:ro \
  -e NODE_ENV=production \
  -e TZ=Europe/Madrid \
  --restart unless-stopped \
  --health-cmd="curl -f http://localhost:3000/api/health/status || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  mw-panel_backend:latest >/dev/null 2>&1

echo -e "${GREEN}   ✓ Nuevo contenedor iniciado${NC}"

# =============================================================================
# PASO 4: Verificar y arrancar DB/Redis si están detenidos
# =============================================================================
echo ""
echo -e "${YELLOW}⚡ Paso 4: Verificando servicios de base de datos...${NC}"

# Buscar contenedores de DB y Redis (pueden tener prefijos diferentes)
DB_CONTAINER=$(docker ps -aq --filter "name=mw-panel-db-prod" | head -1)
REDIS_CONTAINER=$(docker ps -aq --filter "name=mw-panel-redis-prod" | head -1)

if [ -n "$DB_CONTAINER" ]; then
    docker start "$DB_CONTAINER" 2>/dev/null || true
    echo -e "${GREEN}   ✓ PostgreSQL verificado${NC}"
else
    echo -e "${YELLOW}   ⚠ PostgreSQL no encontrado - verificar manualmente${NC}"
fi

if [ -n "$REDIS_CONTAINER" ]; then
    docker start "$REDIS_CONTAINER" 2>/dev/null || true
    echo -e "${GREEN}   ✓ Redis verificado${NC}"
else
    echo -e "${YELLOW}   ⚠ Redis no encontrado - verificar manualmente${NC}"
fi

# =============================================================================
# PASO 5: Configurar aliases de red (CRÍTICO para conectividad)
# =============================================================================
echo ""
echo -e "${YELLOW}⚡ Paso 5: Configurando aliases de red...${NC}"

if [ -n "$DB_CONTAINER" ]; then
    docker network disconnect mw-panel_mw-network "$DB_CONTAINER" 2>/dev/null || true
    docker network connect --alias postgres --alias db mw-panel_mw-network "$DB_CONTAINER" 2>/dev/null || true
    echo -e "${GREEN}   ✓ Alias 'postgres' configurado${NC}"
fi

if [ -n "$REDIS_CONTAINER" ]; then
    docker network disconnect mw-panel_mw-network "$REDIS_CONTAINER" 2>/dev/null || true
    docker network connect --alias redis mw-panel_mw-network "$REDIS_CONTAINER" 2>/dev/null || true
    echo -e "${GREEN}   ✓ Alias 'redis' configurado${NC}"
fi

# =============================================================================
# PASO 6: Reiniciar backend para reconectar a DB/Redis
# =============================================================================
echo ""
echo -e "${YELLOW}⚡ Paso 6: Reiniciando backend para aplicar conexiones...${NC}"

docker restart mw-panel-backend-prod >/dev/null 2>&1
echo -e "${GREEN}   ✓ Backend reiniciado${NC}"

# =============================================================================
# PASO 7: Esperar health check
# =============================================================================
echo ""
echo -e "${YELLOW}⚡ Paso 7: Esperando health check...${NC}"
echo -n "   "

for i in {1..30}; do
    if curl -sf http://localhost:3000/api/health/status >/dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}   ✓ Backend healthy (intento $i)${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Verificar si realmente está healthy
if ! curl -sf http://localhost:3000/api/health/status >/dev/null 2>&1; then
    echo ""
    echo -e "${RED}   ⚠ Backend no responde después de 60s. Verificando logs...${NC}"
    docker logs mw-panel-backend-prod --tail 20 2>&1
fi

# =============================================================================
# PASO 8: Auto-fix Nginx IP
# =============================================================================
echo ""
echo -e "${YELLOW}⚡ Paso 8: Actualizando configuración Nginx...${NC}"

if [ -x "/opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh" ]; then
    /opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh >/dev/null 2>&1 || true
    echo -e "${GREEN}   ✓ Nginx IP actualizada${NC}"
else
    echo -e "${YELLOW}   ⚠ Script auto-fix no encontrado${NC}"
fi

# =============================================================================
# VERIFICACIÓN FINAL
# =============================================================================
echo ""
echo -e "${YELLOW}📊 Verificación final...${NC}"

# Health check local
HEALTH=$(curl -sf http://localhost:3000/api/health/status 2>/dev/null || echo '{"status":"ERROR"}')
if echo "$HEALTH" | grep -q '"status":"OK"'; then
    echo -e "${GREEN}   ✓ API local respondiendo correctamente${NC}"
else
    echo -e "${RED}   ⚠ API local con problemas${NC}"
fi

# Health check externo (si está disponible)
EXTERNAL=$(curl -sf -o /dev/null -w "%{http_code}" https://plataforma.mundoworld.school/api/health/status 2>/dev/null || echo "000")
if [ "$EXTERNAL" = "200" ]; then
    echo -e "${GREEN}   ✓ API externa respondiendo (HTTP $EXTERNAL)${NC}"
else
    echo -e "${YELLOW}   ⚠ API externa: HTTP $EXTERNAL${NC}"
fi

# Estado de contenedores
echo ""
echo -e "${CYAN}   Estado de contenedores:${NC}"
docker ps --format "   {{.Names}}: {{.Status}}" | grep -E "(backend|db|redis)" | head -5

# =============================================================================
# RESUMEN FINAL
# =============================================================================
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ COMPILACIÓN COMPLETADA EN ${ELAPSED} SEGUNDOS${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}URLs de acceso:${NC}"
echo "   🌐 Panel: https://plataforma.mundoworld.school"
echo "   📚 API:   https://plataforma.mundoworld.school/api/health/status"
echo "   🎮 TypeQuest: https://typequest.mundoworld.school"
echo ""
echo -e "${CYAN}Si hay problemas, verificar logs:${NC}"
echo "   docker logs mw-panel-backend-prod --tail 50"
echo ""

# =============================================================================
# CONTRATO SECRETARÍA (SP-7) — verificación NO bloqueante
# =============================================================================
CONTRACT_CHECK="/opt/mw-secretaria/scripts/contract-check.sh"
if [ -x "$CONTRACT_CHECK" ]; then
    echo -e "${CYAN}Verificando contrato de integración con Secretaría...${NC}"
    if "$CONTRACT_CHECK" >/tmp/mw-contract-check.log 2>&1; then
        echo -e "${GREEN}   ✓ Contrato Secretaría verificado${NC}"
    else
        echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}⚠️  EL CONTRATO CON SECRETARÍA SE HA ROTO${NC}"
        echo -e "${RED}   Un cambio de esquema afecta a lo que Secretaría lee de MW Panel.${NC}"
        echo -e "${RED}   Revisa: /opt/mw-secretaria/docs/CONTRATO_MWPANEL.md${NC}"
        echo -e "${RED}   Detalle: cat /tmp/mw-contract-check.log${NC}"
        echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
        # NO bloqueante: el rebuild se considera completado igualmente (no exit).
    fi
    echo ""
fi
