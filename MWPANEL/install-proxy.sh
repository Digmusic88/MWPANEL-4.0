#!/bin/bash
# Script para instalar configuración de proxy en nginx del sistema

echo "🔧 MW Panel - Instalación de Proxy Nginx"
echo "========================================"

# Verificar si tenemos permisos
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script necesita ejecutarse como root"
    echo "💡 Ejecute: sudo ./install-proxy.sh"
    exit 1
fi

# Crear configuración de proxy
echo "📝 Creando configuración de proxy..."
cat > /etc/nginx/sites-available/mw-panel << 'EOF'
# MW Panel Proxy Configuration
server {
    listen 80;
    server_name plataforma.mundoworld.school;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}

server {
    listen 443 ssl http2;
    server_name plataforma.mundoworld.school;
    
    ssl_certificate /opt/mw-panel/ssl/cloudflare/cert.pem;
    ssl_certificate_key /opt/mw-panel/ssl/cloudflare/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass https://127.0.0.1:8443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_ssl_verify off;
        proxy_ssl_session_reuse off;
        proxy_buffering off;
    }
}
EOF

# Habilitar el sitio
echo "🔗 Habilitando configuración..."
ln -sf /etc/nginx/sites-available/mw-panel /etc/nginx/sites-enabled/

# Deshabilitar configuración por defecto si existe
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "🚫 Deshabilitando configuración por defecto..."
    rm -f /etc/nginx/sites-enabled/default
fi

# Verificar configuración
echo "🔍 Verificando configuración nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuración válida"
    echo "🔄 Recargando nginx..."
    systemctl reload nginx
    
    echo "🎉 Proxy instalado correctamente"
    echo "📊 URLs de acceso:"
    echo "   Frontend: https://plataforma.mundoworld.school"
    echo "   API: https://plataforma.mundoworld.school/api"
else
    echo "❌ Error en configuración nginx"
    exit 1
fi
EOF

chmod +x /opt/mw-panel/install-proxy.sh