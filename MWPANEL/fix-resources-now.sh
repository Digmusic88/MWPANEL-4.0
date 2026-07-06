#!/bin/bash

echo "🔧 SOLUCIONANDO PROBLEMA DE RECURSOS EDUCATIVOS"
echo "==============================================="

# Detener cualquier container backend problemático
echo "🛑 Deteniendo containers problemáticos..."
docker stop mw-panel-backend 2>/dev/null || true
docker rm mw-panel-backend 2>/dev/null || true

# Verificar que base de datos está corriendo
if ! docker ps | grep -q "mw-panel-db"; then
    echo "🚀 Iniciando base de datos..."
    docker-compose up -d postgres
    sleep 10
fi

# Obtener la IP de la red de Docker
NETWORK_IP=$(docker inspect mw-panel-db | jq -r '.[0].NetworkSettings.Networks["mw-panel_default"].IPAddress')
if [ "$NETWORK_IP" = "null" ] || [ -z "$NETWORK_IP" ]; then
    echo "⚠️ No se pudo obtener IP, usando nombre del container"
    DB_HOST="mw-panel-db"
else
    echo "✅ IP de base de datos: $NETWORK_IP"
    DB_HOST="$NETWORK_IP"
fi

# Ejecutar backend con configuración directa
echo "🚀 Iniciando backend con configuración corregida..."
docker run --name mw-panel-backend -d \
    --network mw-panel_default \
    -p 3000:3000 \
    -e NODE_ENV=production \
    -e DATABASE_HOST=mw-panel-db \
    -e DATABASE_PORT=5432 \
    -e DATABASE_USERNAME=mwpanel \
    -e DATABASE_PASSWORD=mwpanel123 \
    -e DATABASE_NAME=mwpanel \
    -e REDIS_HOST=mw-panel-redis \
    -e JWT_SECRET=your-jwt-secret-key \
    -e JWT_REFRESH_SECRET=your-refresh-secret-key \
    -e GOOGLE_CREDENTIALS_PATH=/app/google-credentials.json \
    -v /opt/mw-panel/backend/uploads:/app/uploads \
    -v /opt/mw-panel/backend/google-credentials.json:/app/google-credentials.json:ro \
    mw-panel_backend:latest

echo "⏳ Esperando que el backend se inicie..."
sleep 20

# Verificar estado
echo "🔍 Verificando estado del backend..."
docker logs mw-panel-backend | tail -10

echo "🔍 Probando endpoint de recursos..."
sleep 5

# Probar el endpoint
TOKEN_RESPONSE=$(curl -s -X POST "https://plataforma.mundoworld.school/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mwpanel.com","password":"admin123"}')

if echo "$TOKEN_RESPONSE" | grep -q "accessToken"; then
    echo "✅ Autenticación exitosa"
    TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.accessToken')
    
    echo "🔍 Probando lista de recursos..."
    RESOURCES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "https://plataforma.mundoworld.school/api/recursos/list?page=1&limit=5")
    
    echo "📊 Respuesta de recursos:"
    echo "$RESOURCES_RESPONSE" | jq '.'
    
    TOTAL=$(echo "$RESOURCES_RESPONSE" | jq -r '.total')
    if [ "$TOTAL" != "null" ] && [ "$TOTAL" -gt 0 ]; then
        echo "🎉 ¡ÉXITO! Se encontraron $TOTAL recursos"
    else
        echo "⚠️ No se encontraron recursos en la respuesta"
    fi
else
    echo "❌ Error en autenticación"
fi

echo "✅ Script completado!"