# INFORME DE INCIDENTE DE SEGURIDAD

**Fecha del Incidente**: 31 Diciembre 2025 - 1 Enero 2026
**Fecha del Informe**: 1 Enero 2026
**Severidad**: CRITICA
**Estado**: RESUELTO

---

## RESUMEN EJECUTIVO

Se detectó una infección de malware tipo botnet/cryptominer en el contenedor `cambridge-mocks-app`. El malware, identificado como `x86_64.uhavenobotsxd`, establecía conexiones salientes a una IP de AWS (16.185.242.248) como servidor de Comando y Control (C2).

---

## CRONOLOGIA DEL INCIDENTE

### Deteccion (1 Enero 2026)
- Se reportaron conexiones sospechosas desde el servidor a IP 16.185.242.248
- Multiples reboots del sistema (9 en pocas horas) indicaban inestabilidad

### Investigacion
1. Analisis de conexiones de red - No se encontraron conexiones activas al momento
2. Revision de logs de seguridad (`/var/log/mw-panel-security.log`)
3. **HALLAZGO CRITICO**: Proceso `x86_64.uhavenobotsxd` detectado ejecutandose como `{httpd}`

### Evidencia del Malware
```
[2025-12-31 11:04:01] Proceso sospechoso encontrado:
  - Nombre: x86_64.uhavenobotsxd
  - Disfrazado como: {httpd}
  - Ubicacion: Contenedor cambridge-mocks-app
```

---

## ARCHIVOS MALICIOSOS IDENTIFICADOS

| Archivo | Ubicacion | Tamano | Tipo |
|---------|-----------|--------|------|
| .update | /opt/cambridge-mocks-prod/time-machine-backups/ | 95,888 bytes | ELF x86_64 |
| .update | /opt/mw-panel/cambridge-mocks-data/data/ | Similar | ELF x86_64 |
| .monitor | /opt/mw-panel/cambridge-mocks-data/data/ | Variable | ELF x86_64 |

---

## INDICADORES DE COMPROMISO (IOCs)

### IPs Maliciosas
- **16.185.242.248** - Servidor C2 (Amazon AWS)
  - WHOIS: Amazon.com Inc., Seattle, USA
  - Bloqueada en iptables y UFW

### Procesos Maliciosos
- `x86_64.uhavenobotsxd` - Nombre del malware
- `{httpd}` - Proceso disfrazado
- `[crond]` - Proceso falso de cron dentro del contenedor

### Hashes de Archivos (referencia)
- Binarios ELF maliciosos en directorios ocultos (.update, .monitor)

---

## ACCIONES DE REMEDIACION EJECUTADAS

### 1. Contencion Inmediata
- [x] Detenido contenedor cambridge-mocks-app infectado
- [x] Aislado de la red

### 2. Eliminacion del Malware
- [x] Eliminados archivos maliciosos:
  - `/opt/cambridge-mocks-prod/time-machine-backups/.update`
  - `/opt/mw-panel/cambridge-mocks-data/data/.update`
  - `/opt/mw-panel/cambridge-mocks-data/data/.monitor`

### 3. Bloqueo de Red
- [x] IP 16.185.242.248 bloqueada en:
  - UFW (firewall)
  - iptables (regla persistente)

### 4. Reconstruccion del Contenedor
- [x] Imagen Docker eliminada completamente
- [x] Contenedor reconstruido desde cero (--no-cache)
- [x] Dockerfile actualizado (dcron -> busybox crond)
- [x] Servicio verificado funcionando correctamente (HTTP 200)

### 5. Verificacion Post-Incidente
- [x] Escaneo de archivos ejecutables ocultos
- [x] Verificacion de directorios temporales
- [x] Revision de procesos en todos los contenedores
- [x] Confirmacion de bloqueo de IP maliciosa
- [x] Todos los servicios operativos

---

## IMPACTO

### Sistemas Afectados
- Contenedor: cambridge-mocks-app
- Servicio: mocks.mundoworld.school

### Sistemas NO Afectados (verificado)
- MW Panel Backend (mw-panel-backend-prod)
- MW Panel Frontend (mw-panel-frontend-prod)
- Base de datos PostgreSQL (mw-panel-db-prod)
- Redis (mw-panel-redis-prod)

### Datos Comprometidos
- Sin evidencia de exfiltracion de datos
- Base de datos SQLite de Cambridge Mocks intacta

---

## VECTOR DE ATAQUE PROBABLE

### Hipotesis Principal
El malware probablemente se introdujo a traves de:
1. Vulnerabilidad en el contenedor cambridge-mocks (Next.js)
2. Posible explotacion de dependencias npm desactualizadas
3. Puerto 3001 expuesto publicamente

### Indicadores
- El malware se alojo en directorios de backup (.update, .monitor)
- Se disfrazo como proceso httpd y crond
- Establecio persistencia mediante archivos ocultos

---

## RECOMENDACIONES DE SEGURIDAD

### Inmediatas (CRITICO)
1. **Cambiar PasswordAuthentication a "no"** en `/etc/ssh/sshd_config`
2. **Actualizar todas las dependencias npm** de cambridge-mocks
3. **Restringir puerto 3001** solo a localhost (usar nginx como proxy)

### Corto Plazo
1. Implementar escaneo automatico de malware (ClamAV o similar)
2. Configurar alertas para conexiones salientes inusuales
3. Revisar y actualizar politicas de fail2ban
4. Implementar monitoreo de integridad de archivos (AIDE/Tripwire)

### Largo Plazo
1. Segmentar redes Docker mas estrictamente
2. Implementar container scanning en CI/CD
3. Considerar usar contenedores read-only donde sea posible
4. Auditorias de seguridad periodicas

---

## ESTADO ACTUAL DEL SISTEMA

| Servicio | Estado | URL |
|----------|--------|-----|
| MW Panel | OK | https://plataforma.mundoworld.school |
| Cambridge Mocks | OK | https://mocks.mundoworld.school |
| API Health | OK | /api/health/status |

### Verificacion Final
```bash
# Servicios funcionando
curl -s https://plataforma.mundoworld.school/api/health/status  # HTTP 200
curl -s https://mocks.mundoworld.school/                         # HTTP 200

# IP maliciosa bloqueada
iptables -L OUTPUT -n | grep 16.185.242.248                      # DROP

# No hay conexiones sospechosas
ss -tunapl | grep 16.185                                         # Sin resultados
```

---

## LECCIONES APRENDIDAS

1. Los contenedores Docker no son inmunes a malware
2. Los directorios de backup pueden ser usados para ocultar malware
3. Procesos disfrazados (httpd, crond) son tacticas comunes
4. Monitoreo proactivo de conexiones salientes es critico
5. Las reglas de firewall deben incluir trafico saliente

---

## CONTACTO

Para preguntas sobre este incidente, contactar al administrador del sistema.

---

*Documento generado automaticamente durante la remediacion del incidente*
*Clasificacion: INTERNO - NO DISTRIBUIR*
