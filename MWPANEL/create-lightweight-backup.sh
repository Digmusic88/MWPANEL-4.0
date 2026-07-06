#!/bin/bash

# MW Panel 2.0 + TypeQuest - Lightweight Backup Script
# Creates a portable backup excluding node_modules and other downloadable dependencies

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mw-panel-portable-backup-${TIMESTAMP}"
BACKUP_DIR="/opt/backups"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

echo "🚀 Creando copia de seguridad portable de MW Panel 2.0 + TypeQuest..."
echo "📅 Fecha: $(date)"
echo "📝 Nombre: ${BACKUP_NAME}"

# Crear directorio de backup si no existe
mkdir -p "$BACKUP_DIR"

# Exportar base de datos
echo "📊 Exportando base de datos PostgreSQL..."
docker-compose exec -T postgres pg_dump -U mwpanel -d mwpanel --clean --if-exists > "/tmp/mwpanel_database_${TIMESTAMP}.sql"

# Crear archivo temporal de exclusiones
cat > /tmp/backup_exclude.txt << 'EOF'
*/node_modules/*
*/.git/*
*/dist/*
*/build/*
*/coverage/*
*/.next/*
*/.nuxt/*
*/logs/*
*/tmp/*
*/.cache/*
*/.vscode/*
*/.idea/*
*.log
*.pid
*.seed
*.pid.lock
*.tsbuildinfo
.DS_Store
Thumbs.db
EOF

echo "📦 Creando archivo de backup portable..."

# Crear backup excluyendo dependencias descargables
tar -czf "$BACKUP_FILE" \
  --exclude-from=/tmp/backup_exclude.txt \
  -C /opt \
  --transform 's,^mw-panel/,mw-panel/,' \
  --transform 's,^typequest/,typequest/,' \
  mw-panel/ \
  typequest/ \
  -C /tmp \
  "mwpanel_database_${TIMESTAMP}.sql"

# Limpiar archivos temporales
rm -f "/tmp/mwpanel_database_${TIMESTAMP}.sql"
rm -f /tmp/backup_exclude.txt

# Obtener tamaño del backup
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup portable creado exitosamente!"
echo "📍 Ubicación: $BACKUP_FILE"
echo "📏 Tamaño: $BACKUP_SIZE"
echo ""
echo "🔧 Para restaurar en otro servidor:"
echo "1. Extraer: tar -xzf ${BACKUP_NAME}.tar.gz"
echo "2. Instalar dependencias: cd mw-panel && npm install (backend y frontend)"
echo "3. Instalar dependencias: cd typequest/frontend && npm install"
echo "4. Restaurar DB: psql -U usuario -d basedatos < mwpanel_database_${TIMESTAMP}.sql"
echo "5. Configurar .env files según el nuevo entorno"