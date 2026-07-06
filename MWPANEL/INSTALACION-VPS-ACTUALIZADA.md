# MW PANEL 2.0 - INSTALACIÓN VPS ACTUALIZADA

## 📋 Resumen de Actualizaciones Realizadas

El script de instalación VPS (`deploy/install-vps.sh`) ha sido completamente actualizado para incorporar todas las mejoras recientes del sistema, incluyendo:

### 🔐 **Mejoras en Autenticación**
- ✅ Configuración actualizada para el nuevo sistema de autenticación
- ✅ Soporte para refresh tokens y logout mejorado
- ✅ Variables de entorno para JWT y sesiones optimizadas
- ✅ Eliminación de errores 401 post-logout

### 🐳 **Docker y Docker Compose Modernizado**
- ✅ Soporte para Docker Compose Plugin (v2) y standalone (v1)
- ✅ Detección automática del comando correcto (`docker compose` vs `docker-compose`)
- ✅ Instalación de Docker Buildx y plugins adicionales
- ✅ Comandos de gestión actualizados en toda la documentación

### 🔧 **Configuración de Entorno Mejorada**
- ✅ Variables de entorno adicionales para Redis, uploads, logging
- ✅ Configuración de SMTP más robusta
- ✅ Variables de seguridad y rate limiting actualizadas
- ✅ Soporte para configuración de base de datos con URL completa

### 🌐 **SSL y Nginx Optimizado**
- ✅ Verificación de DNS antes de obtener certificados SSL
- ✅ Soporte para dominios www y sin www
- ✅ Configuración de nginx temporal mejorada
- ✅ Mensajes de error más informativos para troubleshooting SSL

### 📦 **Gestión de Repositorio Mejorada**
- ✅ Configuración de URL de repositorio Git personalizable
- ✅ Mejor manejo de errores en clonado de repositorio
- ✅ Verificación de credenciales y acceso
- ✅ Opción `--git-repo` para especificar repositorio

### 🔄 **Instalación Post-Deploy Robusta**
- ✅ Timeouts extendidos para servicios lentos
- ✅ Verificación de salud de backend mejorada
- ✅ Ejecución de migraciones y seeds más robusta
- ✅ Logs detallados para troubleshooting

### 💾 **Backups Mejorados**
- ✅ Script de backup actualizado con mejor logging
- ✅ Backup de configuración (.env) incluido
- ✅ Uso correcto del comando Docker Compose detectado
- ✅ Mejor manejo de errores en operaciones de backup

### 📊 **Información Final Actualizada**
- ✅ Comandos útiles actualizados con sintaxis correcta
- ✅ Comandos adicionales (estado, iniciar/parar servicios)
- ✅ Información de instalación más completa
- ✅ Documentación de troubleshooting mejorada

## 🚀 **Uso del Script Actualizado**

### **Instalación Básica**
```bash
sudo ./deploy/install-vps.sh panel.miescuela.com admin@miescuela.com
```

### **Instalación con Repositorio Personalizado**
```bash
sudo ./deploy/install-vps.sh --git-repo https://github.com/tu-usuario/mw-panel.git panel.miescuela.com admin@miescuela.com
```

### **Opciones Disponibles**
- `--git-repo URL`: Especificar repositorio Git personalizado
- `--branch RAMA`: Instalar una rama específica (default: main)
- `--dir DIRECTORIO`: Directorio de instalación personalizado
- `--no-ssl`: Instalar sin SSL (solo para testing)
- `--dev`: Modo desarrollo

## ⚙️ **Comandos de Gestión Actualizados**

El script ahora detecta automáticamente si usar `docker compose` (v2) o `docker-compose` (v1) y actualiza todos los comandos en consecuencia:

```bash
# Ver logs
cd /opt/mw-panel && docker compose -f docker-compose.prod.yml logs -f

# Reiniciar servicios
cd /opt/mw-panel && docker compose -f docker-compose.prod.yml restart

# Ver estado
cd /opt/mw-panel && docker compose -f docker-compose.prod.yml ps

# Parar servicios
cd /opt/mw-panel && docker compose -f docker-compose.prod.yml down

# Iniciar servicios
cd /opt/mw-panel && docker compose -f docker-compose.prod.yml up -d
```

## 🔍 **Troubleshooting Mejorado**

### **Verificación de DNS**
El script ahora verifica automáticamente que el dominio apunte al servidor antes de intentar obtener certificados SSL.

### **Logs Detallados**
- Logs más informativos durante la instalación
- Mejor identificación de errores en cada paso
- Información de progreso para operaciones largas

### **Recuperación de Errores**
- Timeouts extendidos para servicios lentos
- Continuación de instalación en caso de errores no críticos
- Mejor documentación de pasos de recuperación manual

## 📁 **Archivos Generados**

Al finalizar la instalación se crean:
- `/opt/mw-panel/INSTALL_INFO.txt`: Información completa de instalación
- `/opt/mw-panel/.env`: Variables de entorno (protegido 600)
- `/usr/local/bin/mw-panel-backup.sh`: Script de backup actualizado
- `/var/log/mw-panel-install.log`: Log completo de instalación

## 🎯 **Características Destacadas**

### **Compatibilidad Mejorada**
- ✅ Ubuntu 20.04+ y Debian 11+
- ✅ Docker Compose v1 y v2
- ✅ Nginx con configuración de producción optimizada
- ✅ Let's Encrypt con renovación automática

### **Seguridad Reforzada**
- ✅ Firewall UFW configurado automáticamente
- ✅ Fail2Ban para protección contra ataques
- ✅ Rate limiting en nginx
- ✅ Headers de seguridad configurados

### **Monitoreo y Mantenimiento**
- ✅ Backups automáticos diarios a las 2:00 AM
- ✅ Renovación automática de certificados SSL
- ✅ Logs estructurados para debugging
- ✅ Health checks para todos los servicios

## 🏁 **Resultado Final**

Después de ejecutar el script actualizado tendrás:

1. **Sistema completamente funcional** con todas las mejoras recientes
2. **Autenticación robusta** sin errores 401 post-logout
3. **SSL configurado** con renovación automática
4. **Backups automáticos** con configuración incluida
5. **Comandos de gestión** actualizados y funcionales
6. **Documentación completa** de uso y mantenimiento

## 📞 **Soporte Post-Instalación**

Para cualquier problema después de la instalación:

1. **Verificar logs**: `tail -f /var/log/mw-panel-install.log`
2. **Estado de servicios**: `cd /opt/mw-panel && docker compose -f docker-compose.prod.yml ps`
3. **Ver logs de aplicación**: `cd /opt/mw-panel && docker compose -f docker-compose.prod.yml logs -f`
4. **Información de instalación**: `cat /opt/mw-panel/INSTALL_INFO.txt`

---

**✅ LISTO PARA PRODUCCIÓN** - El script está actualizado con todas las mejoras recientes y listo para deployment en servidores Hetzner u otros proveedores VPS.