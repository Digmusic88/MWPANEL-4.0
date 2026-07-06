# 🚀 MW Panel - Sistema de Auto-Arranque

Este documento describe el sistema completo de auto-arranque, monitoreo y mantenimiento automático de MW Panel.

## 📋 Componentes del Sistema

### 1. Servicios Systemd

| Servicio | Descripción | Estado |
|----------|-------------|---------|
| `mw-panel.service` | Servicio principal que inicia toda la aplicación | Habilitado |
| `mw-panel-healthcheck.timer` | Monitoreo cada 10 minutos | Habilitado |
| `mw-panel-backup.timer` | Backup diario automático | Habilitado |

### 2. Scripts de Mantenimiento

| Script | Función | Ubicación |
|--------|---------|-----------|
| `auto-start.sh` | Inicia todos los contenedores | `/opt/mw-panel/auto-start.sh` |
| `health-check.sh` | Verifica salud del sistema | `/opt/mw-panel/health-check.sh` |
| `backup.sh` | Crea backups de la BD | `/opt/mw-panel/backup.sh` |
| `status.sh` | Muestra estado completo | `/opt/mw-panel/status.sh` |

## 🎯 Funcionalidades

### ✅ Auto-Arranque al Reiniciar
- El sistema se inicia automáticamente cuando se reinicia el servidor
- Todos los contenedores se levantan en el orden correcto
- Verifica dependencias antes de iniciar cada servicio

### 🔍 Monitoreo Automático
- Verificación cada 10 minutos de todos los servicios
- Auto-reparación si detecta problemas
- Logs detallados en `/var/log/mw-panel-health.log`

### 💾 Backups Automáticos
- Backup diario de la base de datos a las 00:00
- Retención de 30 días
- Compresión automática para ahorrar espacio
- Logs en `/var/log/mw-panel-backup.log`

## 🛠️ Comandos de Administración

### Verificar Estado
```bash
# Estado completo del sistema
/opt/mw-panel/status.sh

# Estado de servicios systemd
systemctl status mw-panel.service
systemctl status mw-panel-healthcheck.timer
systemctl status mw-panel-backup.timer
```

### Iniciar/Parar Sistema
```bash
# Iniciar sistema completo
systemctl start mw-panel.service

# Parar sistema completo
systemctl stop mw-panel.service

# Reiniciar sistema
systemctl restart mw-panel.service
```

### Mantenimiento Manual
```bash
# Verificar salud y auto-reparar
/opt/mw-panel/health-check.sh

# Crear backup manual
/opt/mw-panel/backup.sh

# Ver logs del sistema
tail -f /var/log/mw-panel-autostart.log
tail -f /var/log/mw-panel-health.log
tail -f /var/log/mw-panel-backup.log
```

## 📊 Monitoreo

### Verificaciones Automáticas
- ✅ Estado de contenedores Docker
- ✅ Respuesta del backend API
- ✅ Accesibilidad del frontend
- ✅ Conectividad de PostgreSQL
- ✅ Respuesta de Redis

## 🔧 Resolución de Problemas

### Si el sistema no arranca
```bash
# Ver logs de systemd
journalctl -u mw-panel.service -f

# Iniciar manualmente
/opt/mw-panel/auto-start.sh

# Verificar estado
/opt/mw-panel/status.sh
```

## 📈 Estadísticas del Sistema

### URLs de Acceso
- **Frontend**: https://plataforma.mundoworld.school
- **API**: https://plataforma.mundoworld.school/api

### Credenciales de Acceso
- **Admin**: `admin@test.local` / `admin123`

---

**🎉 ¡El sistema MW Panel está completamente automatizado!**

Para cualquier problema, revisar los logs o ejecutar `/opt/mw-panel/status.sh`