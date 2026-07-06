#!/bin/bash

# MW Panel COMPLETE Backup Script v3.0
# Crea backups COMPLETOS del sistema: base de datos + uploads + configuración
# Con retención automática de los últimos 7 backups

BACKUP_DIR="/opt/mw-panel/backups"
LOG_FILE="/var/log/mw-panel-backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_COUNT=7  # Mantener solo los últimos 7 backups

# Directorios a incluir en el backup
UPLOADS_DIR="/opt/mw-panel/backend/uploads"
ENV_FILE="/opt/mw-panel/backend/.env"
SSL_DIR="/opt/mw-panel/ssl"

# Directorio temporal para construir el backup
TEMP_DIR="/tmp/mw-panel-backup-$DATE"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

cleanup_temp() {
    rm -rf "$TEMP_DIR" 2>/dev/null
}

# Limpiar en caso de error
trap cleanup_temp EXIT

mkdir -p $BACKUP_DIR
mkdir -p $TEMP_DIR

log "${GREEN}========================================${NC}"
log "${GREEN}🚀 Iniciando backup COMPLETO de MW Panel...${NC}"
log "${GREEN}========================================${NC}"

# Verificar que el contenedor de PostgreSQL está corriendo
if ! docker ps | grep -q mw-panel-db-prod; then
    log "${RED}❌ Error: Contenedor mw-panel-db-prod no está corriendo${NC}"
    exit 1
fi

# ============================================
# 1. BACKUP DE BASE DE DATOS
# ============================================
log "${CYAN}📦 [1/4] Creando backup de PostgreSQL...${NC}"
DB_BACKUP_FILE="$TEMP_DIR/database.sql"

docker exec mw-panel-db-prod pg_dump -U mwpanel -d mwpanel > "$DB_BACKUP_FILE" 2>> $LOG_FILE

if [ $? -eq 0 ] && [ -s "$DB_BACKUP_FILE" ]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    log "${GREEN}   ✅ Base de datos: $DB_SIZE${NC}"
else
    log "${RED}❌ Error al crear backup de base de datos${NC}"
    exit 1
fi

# ============================================
# 2. BACKUP DE UPLOADS
# ============================================
log "${CYAN}📁 [2/4] Copiando archivos uploads...${NC}"

if [ -d "$UPLOADS_DIR" ]; then
    cp -r "$UPLOADS_DIR" "$TEMP_DIR/uploads" 2>> $LOG_FILE
    UPLOADS_SIZE=$(du -sh "$TEMP_DIR/uploads" 2>/dev/null | cut -f1)
    UPLOADS_COUNT=$(find "$TEMP_DIR/uploads" -type f 2>/dev/null | wc -l)
    log "${GREEN}   ✅ Uploads: $UPLOADS_SIZE ($UPLOADS_COUNT archivos)${NC}"
else
    log "${YELLOW}   ⚠️ Directorio uploads no encontrado${NC}"
    mkdir -p "$TEMP_DIR/uploads"
fi

# ============================================
# 3. BACKUP DE CONFIGURACIÓN
# ============================================
log "${CYAN}⚙️  [3/4] Copiando configuración...${NC}"

mkdir -p "$TEMP_DIR/config"

# Copiar .env
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$TEMP_DIR/config/.env" 2>> $LOG_FILE
    log "${GREEN}   ✅ Archivo .env copiado${NC}"
else
    log "${YELLOW}   ⚠️ Archivo .env no encontrado${NC}"
fi

# Copiar certificados SSL
if [ -d "$SSL_DIR" ]; then
    cp -r "$SSL_DIR" "$TEMP_DIR/config/ssl" 2>> $LOG_FILE
    log "${GREEN}   ✅ Certificados SSL copiados${NC}"
else
    log "${YELLOW}   ⚠️ Directorio SSL no encontrado${NC}"
fi

# ============================================
# 4. CREAR ARCHIVO TAR.GZ COMPRIMIDO
# ============================================
log "${CYAN}🗜️  [4/4] Comprimiendo backup completo...${NC}"

BACKUP_FILE="$BACKUP_DIR/mwpanel_complete_$DATE.tar.gz"

cd "$TEMP_DIR"
tar -czf "$BACKUP_FILE" . 2>> $LOG_FILE

if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    TOTAL_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "${GREEN}   ✅ Backup completo creado: $TOTAL_SIZE${NC}"
else
    log "${RED}❌ Error al crear archivo tar.gz${NC}"
    exit 1
fi

# Limpiar directorio temporal
cleanup_temp

# ============================================
# LIMPIEZA DE BACKUPS ANTIGUOS
# ============================================
log ""
log "${YELLOW}🧹 Limpiando backups antiguos (manteniendo últimos $RETENTION_COUNT)...${NC}"

# Contar backups completos existentes
BACKUP_COUNT=$(ls -1t $BACKUP_DIR/mwpanel_complete_*.tar.gz 2>/dev/null | wc -l)

if [ $BACKUP_COUNT -gt $RETENTION_COUNT ]; then
    # Obtener lista de backups a eliminar (los más antiguos)
    BACKUPS_TO_DELETE=$(ls -1t $BACKUP_DIR/mwpanel_complete_*.tar.gz | tail -n +$(($RETENTION_COUNT + 1)))
    DELETE_COUNT=$(echo "$BACKUPS_TO_DELETE" | wc -l)

    log "${YELLOW}   📊 Encontrados $BACKUP_COUNT backups, eliminando $DELETE_COUNT antiguos...${NC}"

    echo "$BACKUPS_TO_DELETE" | while read backup; do
        if [ -f "$backup" ]; then
            rm -f "$backup"
            log "   🗑️  Eliminado: $(basename $backup)"
        fi
    done

    log "${GREEN}   ✅ Limpieza completada${NC}"
else
    log "   📊 Total de backups: $BACKUP_COUNT (no se requiere limpieza)"
fi

# Limpiar backups antiguos del formato anterior (database_*.sql.gz)
OLD_BACKUP_COUNT=$(ls -1 $BACKUP_DIR/database_*.sql.gz 2>/dev/null | wc -l)
if [ $OLD_BACKUP_COUNT -gt 0 ]; then
    log "${YELLOW}   🧹 Limpiando $OLD_BACKUP_COUNT backups del formato antiguo...${NC}"
    rm -f $BACKUP_DIR/database_*.sql.gz 2>/dev/null
fi

# ============================================
# RESUMEN FINAL
# ============================================
log ""
log "${GREEN}========================================${NC}"
log "${GREEN}📊 RESUMEN DE BACKUPS COMPLETOS${NC}"
log "${GREEN}========================================${NC}"

log "Backups actuales:"
ls -lh $BACKUP_DIR/mwpanel_complete_*.tar.gz 2>/dev/null | while read line; do
    log "   $line"
done

# También mostrar backups manuales (pre-*)
MANUAL_COUNT=$(ls -1 $BACKUP_DIR/pre-*.sql.gz 2>/dev/null | wc -l)
if [ $MANUAL_COUNT -gt 0 ]; then
    log ""
    log "Backups manuales preservados:"
    ls -lh $BACKUP_DIR/pre-*.sql.gz 2>/dev/null | while read line; do
        log "   $line"
    done
fi

# Espacio usado
BACKUP_SIZE_TOTAL=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
log ""
log "💾 Espacio total usado: $BACKUP_SIZE_TOTAL"
log "📁 Directorio: $BACKUP_DIR"
log ""
log "${GREEN}✅ Backup COMPLETO exitoso: mwpanel_complete_$DATE.tar.gz${NC}"
log "${GREEN}   Incluye: Base de datos + Uploads + Configuración + SSL${NC}"
