# 📦 Política de Retención de Backups - MW Panel

**Última actualización**: 2026-01-22
**Estado**: ✅ IMPLEMENTADO Y ACTIVO

## 🎯 Política de Retención

El sistema MW Panel implementa una estrategia de backups tipo "Time Machine" con cuatro niveles de retención:

| Tipo | Frecuencia | Retención | Backups Almacenados |
|------|-----------|-----------|---------------------|
| **Hourly** | Cada hora | Últimos 6 backups | ~28 GB |
| **Daily** | Diario (3:00 AM) | Últimos 7 días | ~3-4 GB por día |
| **Weekly** | Semanal | Últimas 4 semanas | ~7 GB por semana |
| **Monthly** | Mensual | Últimos 3 meses | ~10 GB por mes |

### 📊 Espacio Total Estimado

- **Mínimo**: 40-50 GB (con política actual)
- **Máximo**: 70-80 GB (cuando todos los slots estén llenos)
- **Recomendado**: 100 GB de disco disponible para backups

## 🔧 Implementación Técnica

### Scripts de Limpieza

#### 1. Script Principal de Time Machine
**Ubicación**: `/opt/mw-panel/scripts/cleanup-time-machine-backups.sh`

```bash
# Ejecutar manualmente
/opt/mw-panel/scripts/cleanup-time-machine-backups.sh

# Ver logs
tail -f /var/log/mw-panel-time-machine-cleanup.log
```

**Funcionalidad**:
- Limpia backups horarios, diarios, semanales y mensuales
- Mantiene solo el número configurado de backups más recientes
- Elimina automáticamente los backups más antiguos cuando se excede el límite
- Registra todas las operaciones en log dedicado

#### 2. Script de Auto-Cleanup General
**Ubicación**: `/opt/mw-panel/scripts/auto-cleanup-backups.sh`

```bash
# Ejecutar manualmente
/opt/mw-panel/scripts/auto-cleanup-backups.sh

# Ver logs
tail -f /var/log/mw-panel-cleanup.log
```

**Funcionalidad**:
- Llama al script de Time Machine Backups
- Limpia backups del directorio `/opt/mw-panel/backups` (> 2 días)
- Limpia Docker build cache y imágenes antiguas
- Limpia logs del sistema (journalctl)
- Trunca logs grandes de MW Panel

### Cron Jobs Configurados

```bash
# Ver cron jobs activos
crontab -l

# Limpieza automática diaria a las 3:00 AM
0 3 * * * /opt/mw-panel/scripts/auto-cleanup-backups.sh >> /var/log/mw-panel-cleanup.log 2>&1
```

## 📁 Estructura de Directorios

```
/opt/mw-panel/time-machine-backups/
├── hourly/
│   ├── 20260122_150000/
│   ├── 20260122_140000/
│   ├── 20260122_130000/
│   ├── 20260122_120000/
│   ├── 20260122_110000/
│   └── 20260122_100000/        # Últimos 6 backups
├── daily/
│   ├── 20260122_030000/
│   ├── 20260121_030000/
│   ├── ... (7 backups)
│   └── 20260116_030000/
├── weekly/
│   ├── 20260118_030000/
│   ├── 20260111_030000/
│   ├── 20260104_030000/
│   └── 20251228_030000/        # Últimas 4 semanas
└── monthly/
    ├── 20260101_030000/
    ├── 20251201_030000/
    └── 20251101_030000/        # Últimos 3 meses
```

## 🔍 Monitoreo y Verificación

### Verificar Estado de Backups

```bash
# Ver resumen de backups
/opt/mw-panel/scripts/cleanup-time-machine-backups.sh

# Contar backups por tipo
ls -1 /opt/mw-panel/time-machine-backups/hourly/ | wc -l   # Debe ser ≤ 6
ls -1 /opt/mw-panel/time-machine-backups/daily/ | wc -l    # Debe ser ≤ 7
ls -1 /opt/mw-panel/time-machine-backups/weekly/ | wc -l   # Debe ser ≤ 4
ls -1 /opt/mw-panel/time-machine-backups/monthly/ | wc -l  # Debe ser ≤ 3

# Ver espacio usado por backups
du -sh /opt/mw-panel/time-machine-backups/*
```

### Ver Logs de Limpieza

```bash
# Log de Time Machine Cleanup
tail -f /var/log/mw-panel-time-machine-cleanup.log

# Log de Auto-Cleanup General
tail -f /var/log/mw-panel-cleanup.log

# Buscar ejecuciones recientes
grep "Iniciando limpieza" /var/log/mw-panel-time-machine-cleanup.log | tail -10
```

## ⚙️ Configuración Personalizada

### Modificar Política de Retención

Editar `/opt/mw-panel/scripts/cleanup-time-machine-backups.sh`:

```bash
# Política de retención (líneas 12-15)
HOURLY_KEEP=6      # Cambiar para mantener más/menos backups horarios
DAILY_KEEP=7       # Cambiar para mantener más/menos días
WEEKLY_KEEP=4      # Cambiar para mantener más/menos semanas
MONTHLY_KEEP=3     # Cambiar para mantener más/menos meses
```

### Cambiar Horario de Ejecución

```bash
# Editar crontab
crontab -e

# Cambiar hora (ejemplo: 4:00 AM en vez de 3:00 AM)
0 4 * * * /opt/mw-panel/scripts/auto-cleanup-backups.sh >> /var/log/mw-panel-cleanup.log 2>&1
```

## 🚨 Troubleshooting

### Problema: Backups no se están eliminando

```bash
# 1. Verificar que el script tiene permisos de ejecución
ls -la /opt/mw-panel/scripts/cleanup-time-machine-backups.sh

# 2. Si no es ejecutable:
chmod +x /opt/mw-panel/scripts/cleanup-time-machine-backups.sh

# 3. Ejecutar manualmente y revisar errores
/opt/mw-panel/scripts/cleanup-time-machine-backups.sh
```

### Problema: Disco lleno

```bash
# 1. Ver espacio en disco
df -h /opt

# 2. Ver tamaño de backups
du -sh /opt/mw-panel/time-machine-backups/*

# 3. Limpieza manual agresiva (CUIDADO - elimina backups)
# Mantener solo últimos 3 horarios
cd /opt/mw-panel/time-machine-backups/hourly
ls -1dt */ | tail -n +4 | xargs rm -rf

# Mantener solo últimos 3 diarios
cd /opt/mw-panel/time-machine-backups/daily
ls -1dt */ | tail -n +4 | xargs rm -rf
```

### Problema: Cron job no se ejecuta

```bash
# 1. Verificar cron job está configurado
crontab -l | grep cleanup

# 2. Verificar servicio cron está corriendo
systemctl status cron

# 3. Ver logs de cron
grep -i cron /var/log/syslog | tail -20

# 4. Ejecutar manualmente para verificar funcionamiento
/opt/mw-panel/scripts/auto-cleanup-backups.sh
```

## 📊 Métricas y Rendimiento

### Tiempo de Ejecución Esperado

- **Limpieza Time Machine**: 5-15 segundos
- **Limpieza Docker**: 10-30 segundos
- **Limpieza Journalctl**: 5-10 segundos
- **Total**: ~30-60 segundos

### Espacio Liberado Típico

- **Por ejecución diaria**: 5-10 GB
- **Por semana**: 30-50 GB
- **Por mes**: 100-200 GB

## ✅ Checklist de Mantenimiento

Revisión mensual recomendada:

- [ ] Verificar que hay suficiente espacio en disco (> 50 GB disponible)
- [ ] Confirmar que backups se están creando correctamente
- [ ] Revisar logs de limpieza sin errores
- [ ] Verificar cron job se ejecuta a las 3:00 AM
- [ ] Confirmar cantidad de backups cumple política (6/7/4/3)
- [ ] Revisar espacio usado por backups no excede 80 GB

## 📞 Soporte

Si tienes problemas con el sistema de backups:

1. Revisar logs: `/var/log/mw-panel-time-machine-cleanup.log`
2. Ejecutar script manualmente para debugging
3. Verificar permisos y cron jobs
4. Contactar al equipo de sistemas si persisten problemas

---

**Documentación actualizada**: 2026-01-22
**Versión del sistema**: MW Panel 2.0
