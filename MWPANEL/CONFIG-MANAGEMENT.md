# MW Panel - Sistema de Gestión de Configuración

> **Versión**: 1.0 - Diciembre 2025
> **Problema resuelto**: Errores recurrentes de configuración, variables perdidas, rebuilds lentos

## Resumen del Sistema

El sistema de gestión de configuración de MW Panel utiliza un **archivo maestro único** (`.env.master`) que se sincroniza automáticamente con todos los archivos de configuración necesarios.

## Archivos Clave

| Archivo | Propósito | Editar? |
|---------|-----------|---------|
| `.env.master` | **Configuración maestra única** | ✅ SÍ - Único archivo a editar |
| `.env` | Copia para docker-compose | ❌ NO - Se genera automáticamente |
| `backend/.env` | Copia para desarrollo local | ❌ NO - Se genera automáticamente |
| `docker-compose.yml` | Orquestación de servicios | ⚠️ Raramente |

## Scripts de Gestión

### 1. `sync-env.sh` - Sincronizar Configuración

Copia `.env.master` a todos los archivos que lo necesitan.

```bash
./sync-env.sh
```

**Usar cuando**: Modificaste `.env.master` y quieres aplicar cambios.

### 2. `quick-rebuild.sh` - Rebuild Rápido

Reconstruye servicios sin errores de docker-compose.

```bash
# Solo reiniciar (más rápido, ~10s)
./quick-rebuild.sh restart

# Rebuild backend (~30s)
./quick-rebuild.sh backend

# Rebuild frontend (~45s)
./quick-rebuild.sh frontend

# Rebuild completo (~90s)
./quick-rebuild.sh all

# Rebuild con sincronización de .env
./quick-rebuild.sh backend --sync

# Rebuild sin caché de Docker
./quick-rebuild.sh all --no-cache
```

### 3. `start-all-optimized.sh` - Inicio del Sistema

Para iniciar el sistema completo desde cero.

```bash
./start-all-optimized.sh           # Inicio normal
./start-all-optimized.sh --clean   # Limpieza + inicio
./start-all-optimized.sh --restart # Reinicio rápido
```

## Flujo de Trabajo Recomendado

### Cambiar configuración (ej: Google Drive, JWT, Email)

```bash
# 1. Editar el archivo maestro
nano .env.master

# 2. Sincronizar
./sync-env.sh

# 3. Aplicar cambios
./quick-rebuild.sh backend
```

### Actualizar código del backend

```bash
# 1. Hacer cambios en backend/src/

# 2. Rebuild rápido
./quick-rebuild.sh backend
```

### Actualizar código del frontend

```bash
# 1. Hacer cambios en frontend/src/

# 2. Rebuild
./quick-rebuild.sh frontend

# 3. O usar el script de deploy
./deploy-with-cache-bust.sh
```

### Problemas con contenedores

```bash
# Reinicio rápido
./quick-rebuild.sh restart

# Si persiste, rebuild completo
./quick-rebuild.sh all --sync
```

## Variables Críticas

Las siguientes variables **NUNCA** deben estar vacías:

```env
# Google Drive (para recursos educativos)
GOOGLE_SHARED_DRIVE_NAME=11. Plataforma (Recursos dicácticos compartidos)
GOOGLE_SHARED_DRIVE_ID=0AECljEUrD7hRUk9PVA

# JWT (autenticación)
JWT_SECRET=<clave-secreta-larga>
JWT_REFRESH_SECRET=<otra-clave-secreta-larga>

# Email
RESEND_API_KEY=re_xxxxx
```

## Errores Comunes Resueltos

### Error: "ContainerConfig KeyError"

**Causa**: Contenedores con nombres inconsistentes o huérfanos.

**Solución**:
```bash
./quick-rebuild.sh restart
# O si persiste:
docker-compose down --remove-orphans
./start-all-optimized.sh
```

### Error: "Google Drive no está configurado"

**Causa**: Variables `GOOGLE_SHARED_DRIVE_*` vacías en el contenedor.

**Solución**:
```bash
# Verificar en .env.master que existen las variables
grep GOOGLE .env.master

# Sincronizar y reiniciar
./sync-env.sh
./quick-rebuild.sh backend
```

### Error: "Variables JWT diferentes"

**Causa**: `.env` y `backend/.env` tenían valores diferentes.

**Solución**: Ya resuelto con el sistema de `.env.master`. Ejecutar:
```bash
./sync-env.sh
./quick-rebuild.sh backend
```

## Contenedores y Redes

### Nombres de Contenedores (con sufijo -prod)

- `mw-panel-backend-prod`
- `mw-panel-frontend-prod`
- `mw-panel-db-prod`
- `mw-panel-redis-prod`

### Red Docker

- Red: `mw-panel_mw-network`
- Subnet: `172.19.0.0/16`
- Compartida con `cambridge-mocks-app`

### Nginx del Sistema

El sistema usa nginx del host (no Docker):
- Configuración: `/etc/nginx/sites-enabled/mw-panel.conf`
- Usa IPs dinámicas del contenedor backend
- Script auto-fix: `/opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh`

## Verificación del Sistema

```bash
# Estado de contenedores
docker ps --format "table {{.Names}}\t{{.Status}}" | grep mw-panel

# Variables en el contenedor
docker exec mw-panel-backend-prod printenv | grep GOOGLE

# Health check
curl -s https://plataforma.mundoworld.school/api/health/status

# Logs del backend
docker logs mw-panel-backend-prod --tail 50
```

## Backup de Configuración

El archivo `.env.master` contiene toda la configuración. Hacer backup regular:

```bash
cp .env.master .env.master.backup-$(date +%Y%m%d)
```

## Notas Importantes

1. **NUNCA editar `.env` directamente** - Será sobrescrito por `sync-env.sh`
2. **NUNCA editar `backend/.env` directamente** - Será sobrescrito
3. **Siempre usar `.env.master`** para cambios de configuración
4. **Cambridge Mocks comparte red** - No eliminar la red `mw-panel_mw-network`
5. **Los contenedores usan sufijo `-prod`** - Importante para nginx y scripts
