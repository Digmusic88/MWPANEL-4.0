#!/bin/bash

# =============================================================================
# VERIFICADOR DE CREDENCIALES GOOGLE DRIVE
# =============================================================================
# Verifica que las credenciales de Google Drive estén siempre disponibles
# para evitar la generación de archivos mock
# =============================================================================

echo "🔍 Verificando configuración Google Drive..."

# Verificar que el archivo de credenciales existe
CREDENTIALS_FILE="/opt/mw-panel/backend/google-credentials.json"

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "❌ ERROR: Archivo de credenciales no encontrado: $CREDENTIALS_FILE"
    echo "📋 El sistema FALLARÁ al intentar subir archivos a Google Drive"
    echo "🚨 SOLUCIÓN: Colocar google-credentials.json en /opt/mw-panel/backend/"
    exit 1
fi

echo "✅ Archivo de credenciales encontrado: $CREDENTIALS_FILE"

# Verificar que el volumen está montado en docker-compose.yml
COMPOSE_FILE="/opt/mw-panel/docker-compose.yml"

if ! grep -q "google-credentials.json:/app/google-credentials.json" "$COMPOSE_FILE"; then
    echo "❌ ERROR: Volumen de credenciales NO está montado en docker-compose.yml"
    echo "📋 El contenedor NO podrá acceder a las credenciales"
    echo "🚨 SOLUCIÓN: Agregar volumen en backend service:"
    echo "   - ./backend/google-credentials.json:/app/google-credentials.json"
    exit 1
fi

echo "✅ Volumen de credenciales configurado en docker-compose.yml"

# Verificar que el contenedor tiene acceso al archivo
if docker-compose ps backend | grep -q "Up"; then
    if docker-compose exec -T backend ls /app/google-credentials.json >/dev/null 2>&1; then
        echo "✅ Contenedor backend tiene acceso a las credenciales"
    else
        echo "❌ ERROR: Contenedor backend NO puede acceder a las credenciales"
        echo "📋 Verificar que el volumen esté montado correctamente"
        echo "🚨 SOLUCIÓN: Reiniciar backend con docker-compose restart backend"
        exit 1
    fi
else
    echo "⚠️  Contenedor backend no está ejecutándose - no se puede verificar acceso"
fi

# Verificar estructura del archivo JSON
if ! jq -e . "$CREDENTIALS_FILE" >/dev/null 2>&1; then
    echo "❌ ERROR: Archivo de credenciales no es JSON válido"
    echo "📋 El archivo está corrupto o malformado"
    exit 1
fi

echo "✅ Archivo de credenciales es JSON válido"

# Verificar campos obligatorios
REQUIRED_FIELDS=("type" "project_id" "private_key" "client_email")

for field in "${REQUIRED_FIELDS[@]}"; do
    if ! jq -e ".$field" "$CREDENTIALS_FILE" >/dev/null 2>&1; then
        echo "❌ ERROR: Campo obligatorio '$field' no encontrado en credenciales"
        exit 1
    fi
done

echo "✅ Todos los campos obligatorios están presentes"

echo ""
echo "🎉 VERIFICACIÓN COMPLETADA CON ÉXITO"
echo "📤 El sistema puede subir archivos REALES a Google Drive"
echo "🚫 NO se generarán archivos mock"
echo ""
echo "📁 Shared Drive: 12. Plataforma (Recursos dicácticos compartidos)"
echo "🔑 Service Account: $(jq -r .client_email "$CREDENTIALS_FILE")"