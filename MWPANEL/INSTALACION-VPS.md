# 🚀 MW PANEL 2.0 - GUÍA DE INSTALACIÓN EN VPS

**Versión**: 2.0  
**Fecha**: 2025-06-30  
**Sistema**: Completo y funcional con 17 módulos

---

## 📋 REQUISITOS DEL SERVIDOR VPS

### 🖥️ Especificaciones Mínimas
- **Sistema Operativo**: Ubuntu 20.04 LTS o superior (recomendado Ubuntu 22.04 LTS)
- **RAM**: 2 GB mínimo (**4 GB recomendado** para producción)
- **CPU**: 1 vCPU mínimo (**2 vCPU recomendado**)
- **Almacenamiento**: 20 GB SSD mínimo (**40 GB recomendado**)
- **Ancho de banda**: 1 TB/mes
- **Conexión**: IPv4 pública estática

### 🖥️ Especificaciones Recomendadas para Producción
- **RAM**: 8 GB
- **CPU**: 4 vCPU
- **Almacenamiento**: 100 GB SSD NVMe
- **Ancho de banda**: Ilimitado
- **Backup**: Snapshot automático del proveedor

### 🌐 Requisitos de Red y Dominio
- **Dominio**: Registrado y configurado (ej: `mipanel.educacion.es`)
- **DNS**: Registros A configurados:
  ```
  A     @        [IP_DEL_SERVIDOR]
  A     www      [IP_DEL_SERVIDOR]
  ```
- **Puertos**: 80, 443, 22 (SSH) abiertos

### 📧 Requisitos Adicionales
- **Email**: Cuenta SMTP para notificaciones (Gmail, SendGrid, etc.)
- **Backup**: Cuenta S3 o similar (opcional pero recomendado)

---

## 🔧 PREPARACIÓN INICIAL DEL SERVIDOR

### 1. Acceso al Servidor
```bash
# Conectar vía SSH (cambiar IP por la de tu servidor)
ssh root@TU_IP_SERVIDOR

# Si tienes usuario con sudo:
ssh usuario@TU_IP_SERVIDOR
```

### 2. Actualización del Sistema
```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas
sudo apt install -y curl wget git unzip software-properties-common ufw
```

### 3. Configuración de Seguridad Básica
```bash
# Configurar firewall UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Verificar estado
sudo ufw status
```

---

## ⚡ INSTALACIÓN AUTOMÁTICA (RECOMENDADA)

### Opción A: Instalación con Script Automático

```bash
# Crear directorio de trabajo
sudo mkdir -p /opt/mw-panel
cd /opt/mw-panel

# Clonar el repositorio
sudo git clone https://github.com/tu-usuario/mw-panel.git .

# Dar permisos de ejecución
sudo chmod +x deploy/install-vps.sh

# Ejecutar instalación automática
sudo ./deploy/install-vps.sh tu-dominio.com admin@tu-dominio.com
```

**¿Qué hace el script automático?**
- ✅ Instala Docker y Docker Compose
- ✅ Configura variables de entorno seguras
- ✅ Genera certificados SSL con Let's Encrypt
- ✅ Configura firewall y seguridad
- ✅ Despliega todos los contenedores
- ✅ Ejecuta migraciones y datos iniciales
- ✅ Configura backups automáticos

**Tiempo estimado**: 10-15 minutos

### Verificación de la Instalación Automática
```bash
# Verificar que todos los servicios estén corriendo
docker-compose -f docker-compose.prod.yml ps

# Verificar acceso web
curl -I https://tu-dominio.com
curl -I https://tu-dominio.com/api/health
```

---

## 🔨 INSTALACIÓN MANUAL PASO A PASO

Si prefieres control total sobre el proceso:

### Paso 1: Instalar Docker
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version

# Reiniciar sesión para aplicar cambios
newgrp docker
```

### Paso 2: Clonar y Configurar el Proyecto
```bash
# Crear directorio y clonar
sudo mkdir -p /opt/mw-panel
cd /opt/mw-panel
sudo git clone https://github.com/tu-usuario/mw-panel.git .

# Ajustar permisos
sudo chown -R $USER:$USER /opt/mw-panel
```

### Paso 3: Configurar Variables de Entorno
```bash
# Crear archivo .env basado en el ejemplo
cp .env.example .env

# Editar configuración (usar nano o vim)
nano .env
```

**Configuración mínima del archivo .env:**
```env
# Dominio y SSL
DOMAIN=tu-dominio.com
SSL_EMAIL=admin@tu-dominio.com
NODE_ENV=production

# Base de datos
DB_NAME=mwpanel
DB_USER=mwpanel
DB_PASSWORD=TuPasswordSeguro123!

# JWT (generar claves seguras)
JWT_SECRET=tu-jwt-secret-muy-largo-y-seguro
JWT_REFRESH_SECRET=tu-refresh-secret-muy-largo-y-seguro

# SMTP (opcional para emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
```

### Paso 4: Configurar SSL con Let's Encrypt
```bash
# Instalar Certbot
sudo apt install -y certbot

# Obtener certificados SSL
sudo certbot certonly --standalone \
  -d tu-dominio.com \
  -d www.tu-dominio.com \
  --email admin@tu-dominio.com \
  --agree-tos \
  --non-interactive

# Verificar certificados
sudo ls -la /etc/letsencrypt/live/tu-dominio.com/
```

### Paso 5: Configurar Nginx
```bash
# Editar configuración de Nginx para producción
nano nginx/nginx.prod.conf

# Asegurarse de que apunte a tu dominio correcto
```

### Paso 6: Crear Volumen de Base de Datos
```bash
# Crear volumen persistente para PostgreSQL
docker volume create mw-panel-pgdata
```

### Paso 7: Desplegar la Aplicación
```bash
# Construir y levantar todos los servicios
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar que todos los contenedores estén corriendo
docker-compose -f docker-compose.prod.yml ps
```

### Paso 8: Configurar Base de Datos
```bash
# Esperar a que PostgreSQL esté listo
sleep 30

# Ejecutar migraciones
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

# Cargar datos iniciales
docker-compose -f docker-compose.prod.yml exec backend npm run seed:run
```

---

## ✅ VERIFICACIÓN DE LA INSTALACIÓN

### Verificar Servicios
```bash
# Estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Logs de servicios
docker-compose -f docker-compose.prod.yml logs -f

# Verificar salud de la aplicación
curl -f https://tu-dominio.com/api/health
```

### Verificar Acceso Web
1. **Frontend**: `https://tu-dominio.com`
2. **API Backend**: `https://tu-dominio.com/api`
3. **Documentación API**: `https://tu-dominio.com/api/docs`

### Usuarios de Prueba (creados automáticamente)
- **Administrador**: `admin@mwpanel.com` / `Admin123!`
- **Profesor**: `profesor@mwpanel.com` / `Profesor123!`
- **Estudiante**: `estudiante@mwpanel.com` / `Estudiante123!`
- **Familia**: `familia@mwpanel.com` / `Familia123!`

---

## 🔧 CONFIGURACIÓN POST-INSTALACIÓN

### 1. Configurar SMTP para Emails
```bash
# Editar .env con configuración SMTP real
nano .env

# Reiniciar backend para aplicar cambios
docker-compose -f docker-compose.prod.yml restart backend
```

### 2. Configurar Backup Automático
```bash
# Configurar backup diario a las 2:00 AM
sudo crontab -e

# Agregar línea:
0 2 * * * /opt/mw-panel/scripts/backup.sh > /var/log/mw-panel-backup.log 2>&1
```

### 3. Configurar Renovación SSL Automática
```bash
# Agregar renovación automática de certificados
sudo crontab -e

# Agregar líneas:
0 12 * * * /usr/bin/certbot renew --quiet
5 12 * * * /usr/bin/docker-compose -f /opt/mw-panel/docker-compose.prod.yml restart nginx
```

### 4. Configurar Monitoreo (Opcional)
```bash
# Crear script de monitoreo
chmod +x deploy/monitor.sh

# Monitoreo cada 15 minutos
sudo crontab -e

# Agregar línea:
*/15 * * * * /opt/mw-panel/deploy/monitor.sh --alerts-only
```

---

## 🛠️ COMANDOS DE ADMINISTRACIÓN

### Gestión de Contenedores
```bash
# Ver estado
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar servicio específico
docker-compose -f docker-compose.prod.yml restart backend

# Parar todos los servicios
docker-compose -f docker-compose.prod.yml down

# Iniciar todos los servicios
docker-compose -f docker-compose.prod.yml up -d
```

### Actualización del Sistema
```bash
# Ir al directorio del proyecto
cd /opt/mw-panel

# Hacer backup antes de actualizar
./scripts/backup.sh

# Actualizar código
git pull origin main

# Reconstruir y reiniciar
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup Manual
```bash
# Backup completo
./scripts/backup.sh

# Solo base de datos
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U mwpanel mwpanel > backup_$(date +%Y%m%d).sql
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### Problema: Error 502 Bad Gateway
```bash
# Verificar estado del backend
docker-compose -f docker-compose.prod.yml logs backend

# Reiniciar backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Problema: Base de datos no conecta
```bash
# Verificar PostgreSQL
docker-compose -f docker-compose.prod.yml logs postgres

# Reiniciar PostgreSQL
docker-compose -f docker-compose.prod.yml restart postgres

# Verificar conexión
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U mwpanel
```

### Problema: SSL no funciona
```bash
# Verificar certificados
sudo certbot certificates

# Renovar si es necesario
sudo certbot renew

# Reiniciar Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Problema: Espacio en disco lleno
```bash
# Verificar espacio
df -h

# Limpiar imágenes Docker no usadas
docker system prune -a -f

# Limpiar logs antiguos
sudo journalctl --vacuum-time=7d
```

---

## 📊 MONITOREO Y MANTENIMIENTO

### Verificaciones Diarias
```bash
# Script de verificación diaria
#!/bin/bash
echo "=== Estado MW Panel $(date) ==="
docker-compose -f /opt/mw-panel/docker-compose.prod.yml ps
df -h
free -h
echo "=== Fin verificación ==="
```

### Logs Importantes
- **Aplicación**: `/opt/mw-panel/logs/`
- **Sistema**: `/var/log/syslog`
- **Nginx**: `docker-compose logs nginx`
- **Backend**: `docker-compose logs backend`

### Métricas de Rendimiento
```bash
# Uso de recursos
docker stats

# Espacio en disco
du -sh /opt/mw-panel/*

# Conexiones de red
netstat -tlnp
```

---

## 🔒 SEGURIDAD ADICIONAL

### Configuración de Firewall Avanzada
```bash
# Permitir solo puertos necesarios
sudo ufw reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
```

### Fail2Ban (Protección contra ataques)
```bash
# Instalar Fail2Ban
sudo apt install -y fail2ban

# Configurar para SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Cambiar Puerto SSH (Opcional)
```bash
# Editar configuración SSH
sudo nano /etc/ssh/sshd_config

# Cambiar línea: Port 22 por Port 2222
# Reiniciar SSH
sudo systemctl restart ssh

# Actualizar firewall
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp
```

---

## 📞 SOPORTE Y RECURSOS

### Contacto
- **Email Técnico**: soporte@mwpanel.com
- **GitHub Issues**: [Repositorio del proyecto]
- **Documentación**: Esta guía y archivos del proyecto

### Archivos de Configuración Importantes
- **Docker Compose**: `docker-compose.prod.yml`
- **Variables de entorno**: `.env`
- **Nginx**: `nginx/nginx.prod.conf`
- **Scripts**: `deploy/` y `scripts/`

### Comandos de Emergencia
```bash
# Parar todo en caso de emergencia
docker-compose -f docker-compose.prod.yml down

# Restaurar desde backup
./scripts/restore.sh backup_archivo.sql

# Reinicio completo
sudo reboot
```

---

## 🎯 RESUMEN DE INSTALACIÓN RÁPIDA

Para una instalación rápida y sin complicaciones:

1. **Servidor VPS**: Ubuntu 22.04, 4GB RAM, 40GB SSD
2. **Dominio**: Configurado con DNS apuntando al servidor
3. **Comando único**:
   ```bash
   curl -sSL https://raw.githubusercontent.com/tu-repo/mw-panel/main/deploy/install-vps.sh | sudo bash -s -- tu-dominio.com admin@tu-dominio.com
   ```
4. **Esperar 15 minutos**: El sistema estará listo
5. **Acceder**: `https://tu-dominio.com` con usuarios de prueba

---

## ✅ CHECKLIST DE INSTALACIÓN

- [ ] VPS con especificaciones mínimas
- [ ] Dominio configurado con DNS
- [ ] Acceso SSH al servidor
- [ ] Sistema operativo actualizado
- [ ] Docker y Docker Compose instalados
- [ ] Repositorio clonado
- [ ] Variables de entorno configuradas
- [ ] Certificados SSL obtenidos
- [ ] Contenedores desplegados
- [ ] Base de datos migrada y con datos iniciales
- [ ] Acceso web verificado
- [ ] SMTP configurado (opcional)
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado

---

**🎉 ¡Instalación Completada!**

Tu sistema MW Panel 2.0 está ahora funcionando en producción. El sistema incluye 17 módulos completos para la gestión educativa integral.

**Fecha de creación**: 2025-06-30  
**Versión del documento**: 1.0