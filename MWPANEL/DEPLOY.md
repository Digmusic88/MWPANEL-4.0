# 🚀 MW PANEL 2.0 - GUÍA COMPLETA DE DESPLIEGUE

Esta guía proporciona instrucciones detalladas paso a paso para desplegar MW Panel 2.0 en un servidor VPS de producción.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#-requisitos-previos)
2. [Preparación del Servidor](#-preparación-del-servidor)
3. [Instalación Automática](#-instalación-automática)
4. [Instalación Manual](#-instalación-manual)
5. [Configuración Post-Instalación](#-configuración-post-instalación)
6. [Monitoreo y Mantenimiento](#-monitoreo-y-mantenimiento)
7. [Solución de Problemas](#-solución-de-problemas)
8. [Scripts de Administración](#-scripts-de-administración)

---

## 🔧 Requisitos Previos

### Servidor VPS Mínimo
- **OS**: Ubuntu 20.04+ LTS / Debian 11+ / CentOS 8+
- **RAM**: 2 GB (recomendado 4 GB)
- **CPU**: 1 vCPU (recomendado 2 vCPU)
- **Disco**: 20 GB SSD (recomendado 40 GB)
- **Ancho de banda**: 1 TB/mes

### Dominio y DNS
- Dominio registrado (ej. `mipanel.com`)
- Registros DNS configurados:
  ```
  A     @        IP_DEL_SERVIDOR
  A     www      IP_DEL_SERVIDOR
  ```

### Acceso al Servidor
- Acceso SSH con permisos de root
- Usuario sudo configurado (recomendado)

---

## 🛠️ Preparación del Servidor

### 1. Acceso Inicial al Servidor

```bash
# Conectar al servidor
ssh root@IP_DEL_SERVIDOR

# O con usuario sudo
ssh usuario@IP_DEL_SERVIDOR
```

### 2. Actualización del Sistema

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
# o
sudo dnf update -y
```

### 3. Instalación de Dependencias Básicas

```bash
# Ubuntu/Debian
sudo apt install -y git curl wget unzip software-properties-common

# CentOS/RHEL
sudo yum install -y git curl wget unzip
# o
sudo dnf install -y git curl wget unzip
```

---

## ⚡ Instalación Automática

La forma más rápida de desplegar MW Panel 2.0 es usar el script de instalación automática.

### Opción 1: Instalación Directa (Recomendada)

```bash
# Descargar y ejecutar el instalador
curl -sSL https://raw.githubusercontent.com/tu-repo/mw-panel/main/deploy/install-vps.sh | bash -s -- tu-dominio.com admin@tu-dominio.com
```

### Opción 2: Descarga y Revisión Previa

```bash
# Descargar el script
wget https://raw.githubusercontent.com/tu-repo/mw-panel/main/deploy/install-vps.sh

# Revisar el contenido (opcional pero recomendado)
less install-vps.sh

# Ejecutar
chmod +x install-vps.sh
sudo ./install-vps.sh tu-dominio.com admin@tu-dominio.com
```

### ¿Qué hace la instalación automática?

El script `install-vps.sh` realiza automáticamente:

1. ✅ **Verificación de requisitos** del sistema
2. ✅ **Instalación de Docker** y Docker Compose
3. ✅ **Clonación** del repositorio MW Panel 2.0
4. ✅ **Generación automática** de variables de entorno seguras
5. ✅ **Configuración SSL** con Let's Encrypt
6. ✅ **Configuración de firewall** UFW
7. ✅ **Hardening de seguridad** del servidor
8. ✅ **Despliegue de contenedores** de producción
9. ✅ **Configuración de backup** automático
10. ✅ **Configuración de monitoreo** del sistema

**Tiempo estimado**: 10-15 minutos

---

## 🔨 Instalación Manual

Si prefieres tener control total sobre el proceso, puedes seguir la instalación manual paso a paso.

### Paso 1: Clonar el Repositorio

```bash
# Crear directorio de aplicación
sudo mkdir -p /opt/mw-panel
cd /opt/mw-panel

# Clonar repositorio
sudo git clone https://github.com/tu-repo/mw-panel.git .

# Ajustar permisos
sudo chown -R $(whoami):$(whoami) /opt/mw-panel
```

### Paso 2: Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $(whoami)

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sesión para aplicar cambios de grupo
newgrp docker
```

### Paso 3: Generar Variables de Entorno

```bash
# Generar archivo .env
cd /opt/mw-panel
./deploy/generate-env.sh -d tu-dominio.com -e admin@tu-dominio.com --production
```

### Paso 4: Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot

# Generar certificados SSL
sudo certbot certonly --standalone -d tu-dominio.com -d www.tu-dominio.com \
    --email admin@tu-dominio.com --agree-tos --non-interactive

# Verificar certificados
sudo ls -la /etc/letsencrypt/live/tu-dominio.com/
```

### Paso 5: Configurar Firewall

```bash
# Ejecutar script de seguridad
sudo ./deploy/security.sh --change-ssh-port -p 2222
```

### Paso 6: Desplegar la Aplicación

```bash
# Construir y desplegar contenedores
docker-compose -f docker-compose.prod.yml up -d

# Verificar estado
docker-compose -f docker-compose.prod.yml ps
```

### Paso 7: Verificar Instalación

```bash
# Verificar servicios
./deploy/monitor.sh --alerts-only

# Verificar endpoints
curl -f https://tu-dominio.com/health
curl -f https://tu-dominio.com/api/health
```

---

## ⚙️ Configuración Post-Instalación

### 1. Acceso a la Aplicación

Una vez completada la instalación:

- **Frontend**: `https://tu-dominio.com`
- **API**: `https://tu-dominio.com/api`
- **Documentación API**: `https://tu-dominio.com/api/docs`

### 2. Configuración Inicial del Sistema

1. **Acceder al panel de administración**:
   ```
   URL: https://tu-dominio.com/admin
   Usuario: admin@tu-dominio.com
   Contraseña: (generada automáticamente, revisar logs)
   ```

2. **Configurar SMTP para emails**:
   ```bash
   # Editar variables de entorno
   nano .env
   
   # Configurar SMTP
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email@gmail.com
   SMTP_PASS=tu-app-password
   
   # Reiniciar backend
   docker-compose -f docker-compose.prod.yml restart backend
   ```

3. **Configurar módulos del sistema**:
   - Activar/desactivar módulos según necesidades
   - Configurar parámetros específicos del centro educativo
   - Importar datos iniciales si es necesario

### 3. Configuración de Backup (Opcional)

```bash
# Configurar backup en S3 (opcional)
nano .env

# Añadir configuración S3
S3_BUCKET=mi-bucket-backup
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_REGION=eu-west-1

# Probar backup
./deploy/backup.sh --remote
```

### 4. Configuración de Monitoreo (Opcional)

```bash
# Configurar alertas por email
export ALERT_EMAIL="admin@tu-dominio.com"
export WEBHOOK_URL="https://hooks.slack.com/tu-webhook"

# Añadir al crontab para monitoreo automático
echo "*/15 * * * * /opt/mw-panel/deploy/monitor.sh --alerts-only" | sudo crontab -
```

---

## 📊 Monitoreo y Mantenimiento

### Scripts de Administración Disponibles

MW Panel 2.0 incluye varios scripts para facilitar la administración:

#### 1. Monitor del Sistema
```bash
# Verificación única
./deploy/monitor.sh

# Monitoreo continuo
./deploy/monitor.sh --continuous

# Solo mostrar problemas
./deploy/monitor.sh --alerts-only

# Salida en formato JSON
./deploy/monitor.sh --json
```

#### 2. Backup Automático
```bash
# Backup completo
./deploy/backup.sh

# Solo base de datos
./deploy/backup.sh --db-only

# Con encriptación
./deploy/backup.sh --encrypt

# Con envío a remoto
./deploy/backup.sh --remote
```

#### 3. Actualización Sin Downtime
```bash
# Actualización desde main
./deploy/update.sh

# Actualización desde rama específica
./deploy/update.sh --branch develop

# Actualización forzada
./deploy/update.sh --force

# Simular actualización
./deploy/update.sh --dry-run
```

#### 4. Configuración de Seguridad
```bash
# Hardening completo
./deploy/security.sh

# Cambiar puerto SSH
./deploy/security.sh --change-ssh-port -p 2222

# Sin Fail2Ban
./deploy/security.sh --no-fail2ban
```

### Comandos Docker Útiles

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f backend

# Reiniciar un servicio
docker-compose -f docker-compose.prod.yml restart backend

# Escalar servicios
docker-compose -f docker-compose.prod.yml up -d --scale backend=2

# Ver uso de recursos
docker stats

# Limpiar imágenes no utilizadas
docker system prune -f
```

### Ubicaciones Importantes

```bash
# Aplicación
/opt/mw-panel/

# Logs de la aplicación
/opt/mw-panel/logs/

# Logs del sistema
/var/log/mw-panel-*.log

# Backups
/var/backups/mw-panel/

# Certificados SSL
/etc/letsencrypt/live/tu-dominio.com/

# Configuración Nginx
/opt/mw-panel/nginx/

# Datos de la aplicación
/opt/mw-panel/backend/uploads/
```

---

## 🆘 Solución de Problemas

### Problemas Comunes y Soluciones

#### 1. Error 502 Bad Gateway

**Síntomas**: La página muestra "502 Bad Gateway"

**Diagnóstico**:
```bash
# Verificar estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Ver logs del backend
docker-compose -f docker-compose.prod.yml logs backend

# Verificar conectividad
curl http://localhost:3000/health
```

**Soluciones**:
```bash
# Reiniciar backend
docker-compose -f docker-compose.prod.yml restart backend

# Si persiste, reconstruir
docker-compose -f docker-compose.prod.yml up -d --build backend
```

#### 2. Error de Base de Datos

**Síntomas**: Errores de conexión a PostgreSQL

**Diagnóstico**:
```bash
# Verificar PostgreSQL
docker-compose -f docker-compose.prod.yml logs postgres

# Probar conexión
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U mwpanel
```

**Soluciones**:
```bash
# Reiniciar PostgreSQL
docker-compose -f docker-compose.prod.yml restart postgres

# Si fallan las migraciones
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run
```

#### 3. Certificados SSL Expirados

**Síntomas**: Advertencias de certificado en el navegador

**Diagnóstico**:
```bash
# Verificar expiración
sudo certbot certificates
```

**Soluciones**:
```bash
# Renovar certificados
sudo certbot renew --dry-run
sudo certbot renew

# Reiniciar Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 4. Espacio en Disco Lleno

**Síntomas**: Errores de escritura, aplicación lenta

**Diagnóstico**:
```bash
# Verificar espacio
df -h
du -sh /opt/mw-panel/*
docker system df
```

**Soluciones**:
```bash
# Limpiar Docker
docker system prune -a -f

# Limpiar logs antiguos
sudo journalctl --vacuum-time=7d

# Ejecutar backup y limpiar
./deploy/backup.sh
find /var/backups/mw-panel/ -mtime +30 -delete
```

#### 5. Alto Uso de CPU/Memoria

**Diagnóstico**:
```bash
# Verificar recursos
./deploy/monitor.sh --resources-only
docker stats
htop
```

**Soluciones**:
```bash
# Optimizar contenedores
docker-compose -f docker-compose.prod.yml restart

# Verificar configuración de recursos en docker-compose.prod.yml
# Considerar escalar horizontalmente si es necesario
```

### Logs de Depuración

Ubicaciones importantes de logs:

```bash
# Logs de aplicación
tail -f /opt/mw-panel/logs/app.log

# Logs de sistema
tail -f /var/log/syslog

# Logs de Docker
journalctl -u docker.service -f

# Logs de contenedores específicos
docker-compose -f docker-compose.prod.yml logs -f [servicio]

# Logs de Nginx
docker-compose -f docker-compose.prod.yml logs -f nginx

# Logs de SSL/Certbot
tail -f /var/log/letsencrypt/letsencrypt.log
```

### Contacto de Soporte

Si los problemas persisten:

1. **Recopilar información**:
   ```bash
   # Generar reporte completo
   ./deploy/monitor.sh --json > system-report.json
   
   # Logs recientes
   journalctl --since "1 hour ago" > system-logs.txt
   
   # Estado de Docker
   docker-compose -f docker-compose.prod.yml ps > docker-status.txt
   ```

2. **Crear issue en GitHub** con la información recopilada
3. **Incluir**:
   - Descripción del problema
   - Pasos para reproducir
   - Logs relevantes
   - Configuración del sistema

---

## 📚 Scripts de Administración

### Resumen de Scripts Disponibles

| Script | Propósito | Uso Principal |
|--------|-----------|---------------|
| `install-vps.sh` | Instalación automática completa | Despliegue inicial |
| `generate-env.sh` | Generador de variables de entorno | Configuración inicial |
| `security.sh` | Hardening y configuración de seguridad | Seguridad del servidor |
| `backup.sh` | Backup completo de la aplicación | Copias de seguridad |
| `update.sh` | Actualización sin downtime | Actualizaciones |
| `monitor.sh` | Monitoreo del sistema | Supervisión |

### Automatización con Cron

```bash
# Editar crontab
sudo crontab -e

# Agregar tareas automatizadas
# Backup diario a las 2:00 AM
0 2 * * * /opt/mw-panel/deploy/backup.sh --quiet

# Monitoreo cada 15 minutos
*/15 * * * * /opt/mw-panel/deploy/monitor.sh --alerts-only --quiet

# Actualización automática semanal (opcional, no recomendado para producción)
# 0 3 * * 0 /opt/mw-panel/deploy/update.sh --force --no-backup

# Limpiar logs cada semana
0 4 * * 0 find /opt/mw-panel/logs/ -name "*.log" -mtime +7 -delete
```

---

## 🎯 Mejores Prácticas

### Seguridad

1. **Cambiar puertos por defecto**:
   - SSH del puerto 22 a uno personalizado
   - Usar firewall UFW correctamente configurado

2. **Actualizaciones regulares**:
   - Sistema operativo mensual
   - Aplicación según versionado
   - Certificados SSL automáticos

3. **Backups frecuentes**:
   - Backup diario automático
   - Verificar integridad regularmente
   - Almacenamiento offsite (S3, etc.)

4. **Monitoreo continuo**:
   - Alertas automáticas configuradas
   - Revisión de logs periódica
   - Métricas de rendimiento

### Rendimiento

1. **Recursos del servidor**:
   - Monitorear uso de CPU/RAM
   - Ajustar límites de Docker según necesidad
   - SSD para almacenamiento

2. **Optimización de base de datos**:
   - Índices optimizados
   - Backups regulares
   - Configuración de PostgreSQL para producción

3. **Cache y CDN**:
   - Redis para cache de sesiones
   - Nginx para archivos estáticos
   - Considerar CDN para assets

### Mantenimiento

1. **Documentación**:
   - Mantener documentación actualizada
   - Registrar cambios importantes
   - Procedimientos de recuperación

2. **Testing**:
   - Probar actualizaciones en staging
   - Verificar backups periódicamente
   - Plan de rollback preparado

3. **Escalabilidad**:
   - Planificar crecimiento
   - Considerar alta disponibilidad
   - Load balancing si es necesario

---

## 📞 Soporte y Comunidad

### Recursos de Ayuda

- **Documentación**: [docs.mwpanel.com](https://docs.mwpanel.com)
- **GitHub Issues**: [github.com/tu-repo/mw-panel/issues](https://github.com/tu-repo/mw-panel/issues)
- **Comunidad**: [community.mwpanel.com](https://community.mwpanel.com)
- **Email**: support@mwpanel.com

### Contribuir

MW Panel 2.0 es un proyecto open source. Las contribuciones son bienvenidas:

1. Fork del repositorio
2. Crear rama feature
3. Commit de cambios
4. Push a la rama
5. Crear Pull Request

---

**¡Felicidades! 🎉 Has completado exitosamente el despliegue de MW Panel 2.0.**

Esta guía te ha llevado desde la configuración inicial del servidor hasta tener una instalación completa y segura funcionando en producción. El sistema está ahora listo para ser utilizado por tu institución educativa.

Para cualquier duda o problema, no dudes en consultar la sección de solución de problemas o contactar con el soporte técnico.

---

*Última actualización: $(date '+%Y-%m-%d')*
*Versión de la guía: 2.0*