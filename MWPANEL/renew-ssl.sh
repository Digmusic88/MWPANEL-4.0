#!/bin/bash

echo "🔄 Renovando certificados SSL de TypeQuest..."
echo "================================================"

# Detener nginx
echo "⏸️ Deteniendo nginx..."
docker stop mw-panel-nginx

# Renovar certificado
echo "🔄 Renovando certificado Let's Encrypt..."
sudo certbot renew --standalone

# Copiar certificados actualizados al volumen Docker
echo "📂 Copiando certificados al volumen Docker..."
sudo cp -r /etc/letsencrypt/live /var/lib/docker/volumes/mw-panel_certbot-etc/_data/
sudo cp -r /etc/letsencrypt/archive /var/lib/docker/volumes/mw-panel_certbot-etc/_data/

# Reiniciar nginx
echo "🚀 Reiniciando nginx..."
docker start mw-panel-nginx

# Verificar certificado
echo "✅ Verificando certificado renovado..."
sleep 5
if curl -s https://typequest.mundoworld.school | grep -q "TypeQuest"; then
    echo "✅ Certificado SSL renovado exitosamente!"
    echo "📋 Información del certificado:"
    echo | openssl s_client -connect typequest.mundoworld.school:443 -servername typequest.mundoworld.school 2>/dev/null | openssl x509 -noout -subject -issuer -dates
else
    echo "❌ Error al renovar certificado"
    exit 1
fi

echo "🎉 Renovación completa!"