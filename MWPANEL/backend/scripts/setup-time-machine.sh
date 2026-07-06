#!/bin/bash

# =============================================================================
# Time Machine Setup Script - MW Panel
# =============================================================================
# IMPORTANTE: Los backups son manejados por el BackupSchedulerService de NestJS
# Este script SOLO crea los directorios necesarios.
# NO se usa cron bash - el scheduler de NestJS (@nestjs/schedule) maneja todo.
# =============================================================================

echo "Configurando Time Machine backups automáticos para MW Panel..."
echo "NOTA: Los backups son manejados por NestJS BackupSchedulerService"

# Create directories for Time Machine backups
echo "Creando directorios de backups..."
mkdir -p /app/time-machine-backups/{hourly,daily,weekly,monthly,logs}

# Set permissions
chmod -R 755 /app/time-machine-backups 2>/dev/null || true

echo ""
echo "=============================================="
echo "Time Machine Setup Completado"
echo "=============================================="
echo ""
echo "Estrategia de backups (manejada por NestJS):"
echo "  - Hourly (24 últimos):  Solo DB (~10MB)"
echo "  - Daily (7 últimos):    DB + Uploads"
echo "  - Weekly (4 últimos):   DB + Uploads + Config"
echo "  - Monthly (3 últimos):  TODO completo"
echo ""
echo "Los backups se ejecutan automáticamente via @nestjs/schedule:"
echo "  - Hourly:  Cada hora a minuto 0"
echo "  - Daily:   Diario a las 2:00 AM"
echo "  - Weekly:  Domingos a las 3:00 AM"
echo "  - Monthly: Día 1 del mes a las 4:00 AM"
echo ""
echo "Servicio: BackupSchedulerService + TimeMachineBackupService"
echo "=============================================="
