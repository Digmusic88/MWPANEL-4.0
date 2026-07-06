#!/bin/bash

echo "🔍 Verificación SSL de TypeQuest - typequest.mundoworld.school"
echo "=============================================================="

# Verificar certificado SSL
echo "📋 Información del Certificado SSL:"
CERT_INFO=$(echo | openssl s_client -connect typequest.mundoworld.school:443 -servername typequest.mundoworld.school 2>/dev/null | openssl x509 -noout -subject -issuer -dates)
echo "$CERT_INFO"

if echo "$CERT_INFO" | grep -q "Let's Encrypt"; then
    echo "✅ Certificado Let's Encrypt válido"
else
    echo "⚠️  Certificado no es de Let's Encrypt"
fi

echo ""
echo "🌐 Verificación de Conectividad HTTPS:"
if curl -k -s -I https://typequest.mundoworld.school | grep -q "HTTP/2 200"; then
    echo "✅ HTTPS funciona correctamente (HTTP/2 200)"
else
    echo "❌ Error en conectividad HTTPS"
fi

echo ""
echo "🔒 Headers de Seguridad:"
# Crear un archivo temporal para capturar headers
TEMP_FILE=$(mktemp)
curl -k -s -D "$TEMP_FILE" https://typequest.mundoworld.school -o /dev/null

if grep -qi "strict-transport-security" "$TEMP_FILE"; then
    echo "✅ HSTS (Strict-Transport-Security) configurado"
else
    echo "❌ HSTS no encontrado"
fi

if grep -qi "x-content-type-options" "$TEMP_FILE"; then
    echo "✅ X-Content-Type-Options configurado"
else
    echo "❌ X-Content-Type-Options no encontrado"
fi

if grep -qi "x-frame-options" "$TEMP_FILE"; then
    echo "✅ X-Frame-Options configurado"
else
    echo "❌ X-Frame-Options no encontrado"
fi

if grep -qi "content-security-policy" "$TEMP_FILE"; then
    echo "✅ Content-Security-Policy configurado"
else
    echo "❌ Content-Security-Policy no encontrado"
fi

echo ""
echo "📊 Headers de Response:"
grep -E "(server|content-type|cache-control)" "$TEMP_FILE"

echo ""
echo "🎯 Verificación de Assets:"
if curl -k -s -I https://typequest.mundoworld.school/typequest-logo.svg | grep -q "HTTP/2 200"; then
    echo "✅ Logo SVG accesible"
else
    echo "❌ Error accediendo al logo SVG"
fi

if curl -k -s -I https://typequest.mundoworld.school/assets/ 2>/dev/null | grep -q "HTTP/2"; then
    echo "✅ Assets directory accesible"
else
    echo "⚠️  Assets directory - verificar manualmente"
fi

# Limpiar archivo temporal
rm -f "$TEMP_FILE"

echo ""
echo "🚀 TypeQuest SSL Status: VERIFICACIÓN COMPLETA"
echo "=============================================================="