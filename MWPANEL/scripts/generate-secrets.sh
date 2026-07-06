#!/bin/bash
# Script para generar secretos seguros para MW Panel
# Este script genera contraseñas y tokens seguros para usar en producción

set -euo pipefail

echo "🔐 Generando secretos seguros para MW Panel..."
echo ""
echo "# ============================================"
echo "# SECRETOS GENERADOS - COPIAR A .env"
echo "# Generado el: $(date)"
echo "# ============================================"
echo ""

# Función para generar strings aleatorios seguros
generate_secret() {
    openssl rand -base64 48 | tr -d "=+/" | cut -c1-${1:-64}
}

# Generar secretos
DB_PASSWORD=$(generate_secret 32)
JWT_SECRET=$(generate_secret 64)
JWT_REFRESH_SECRET=$(generate_secret 64)
REDIS_PASSWORD=$(generate_secret 32)
TYPEQUEST_SECRET=$(generate_secret 32)
ADMIN_PASSWORD=$(generate_secret 16)

echo "# Database"
echo "DATABASE_PASSWORD=$DB_PASSWORD"
echo ""
echo "# JWT Authentication"
echo "JWT_SECRET=$JWT_SECRET"
echo "REFRESH_TOKEN_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "# Redis"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""
echo "# TypeQuest Integration"
echo "TYPEQUEST_SECRET_KEY=$TYPEQUEST_SECRET"
echo ""
echo "# Admin Account (cambiar email según necesidad)"
echo "ADMIN_EMAIL=admin@mundoworld.school"
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD"
echo ""
echo "# ============================================"
echo "# IMPORTANTE:"
echo "# 1. Copiar estos valores a tu archivo .env"
echo "# 2. NUNCA compartir estos secretos"
echo "# 3. Guardar en un lugar seguro (password manager)"
echo "# 4. Cambiar regularmente (cada 90 días)"
echo "# ============================================"