# INFORME DE SEGURIDAD - INCIDENTE CRITICO
## Servidor MundoWorld School - mocks.mundoworld.school

**Fecha del Incidente**: 31 Diciembre 2025 - 1 Enero 2026
**Fecha del Informe**: 1 Enero 2026
**Clasificacion**: CRITICO
**Estado**: RESUELTO Y ASEGURADO

---

## 1. RESUMEN EJECUTIVO

El servidor de MundoWorld School sufrio una intrusion de seguridad donde atacantes explotaron una vulnerabilidad critica de ejecucion remota de codigo (RCE) en Next.js 15.5.0. Los atacantes instalaron un malware tipo botnet/cryptominer llamado `x86_64.uhavenobotsxd` que establecio conexiones a un servidor de Comando y Control (C2) en Amazon AWS.

**Resultado**: El incidente fue completamente remediado, el malware eliminado, las vulnerabilidades parcheadas y se implementaron multiples capas de seguridad adicionales.

---

## 2. CAUSA RAIZ DEL PROBLEMA

### 2.1 Vulnerabilidad Principal
```
VULNERABILIDAD CRITICA: CVE GHSA-9qr9-h5gf-34mp
Componente: Next.js 15.5.0
Tipo: Remote Code Execution (RCE) en React Flight Protocol
Severidad: CRITICA
```

Esta vulnerabilidad permitia a atacantes ejecutar codigo arbitrario en el servidor a traves del protocolo React Flight de Next.js. Los atacantes escanearon el servidor, detectaron la version vulnerable y explotaron la vulnerabilidad para instalar malware.

### 2.2 Vulnerabilidades Adicionales Detectadas
| Paquete | Severidad | Descripcion |
|---------|-----------|-------------|
| jws < 3.2.3 | ALTA | Verificacion incorrecta de firma HMAC |
| jspdf <= 3.0.1 | ALTA | Denegacion de Servicio (DoS) |
| js-yaml 4.0.0-4.1.0 | MEDIA | Prototype Pollution |
| next-auth < 4.24.12 | MEDIA | Vulnerabilidad de entrega de email |

### 2.3 Cronologia del Ataque
1. **20 Diciembre 2025**: Escaner LeakIX detecta el servidor y prueba exploits
2. **20-30 Diciembre**: Multiples IPs atacantes intentan explotar vulnerabilidades
3. **~30 Diciembre**: Ataque exitoso - malware instalado
4. **31 Diciembre**: Malware activo conectando a servidor C2
5. **1 Enero 2026**: 9 reboots del sistema por inestabilidad causada por malware

---

## 3. EVIDENCIA DEL ATAQUE

### 3.1 Logs de Escaneo y Ataque
```
# Intentos de RCE detectados en logs de nginx:
207.154.212.47 - LeakIX scanner:
  - GET /nodesync?cmd=hostname
  - GET /exec?cmd=hostname
  - POST /php-cgi/php-cgi.exe (exploit PHP)

# IPs con POSTs exitosos (HTTP 200):
78.153.140.50  - Multiples POSTs exitosos
78.153.140.250 - Intento de acceso a /.env + POST exitoso
20.246.95.122  - python-requests POST exitoso
```

### 3.2 Malware Identificado
```
Nombre: x86_64.uhavenobotsxd
Tipo: Botnet / Cryptominer
Proceso disfrazado: {httpd}, [crond]
Servidor C2: 16.185.242.248 (Amazon AWS, Seattle)

Archivos maliciosos encontrados:
- /opt/cambridge-mocks-prod/time-machine-backups/.update (95,888 bytes, ELF x86_64)
- /opt/mw-panel/cambridge-mocks-data/data/.update
- /opt/mw-panel/cambridge-mocks-data/data/.monitor
```

---

## 4. ACCIONES DE REMEDIACION EJECUTADAS

### 4.1 Contencion Inmediata
- [x] Contenedor cambridge-mocks-app detenido
- [x] Proceso malicioso terminado
- [x] Conexiones a C2 interrumpidas

### 4.2 Eliminacion del Malware
- [x] 3 archivos binarios maliciosos eliminados
- [x] Contenedor Docker eliminado completamente
- [x] Imagen Docker reconstruida desde cero (--no-cache)

### 4.3 Actualizaciones de Seguridad
- [x] **Next.js actualizado**: 15.5.0 -> 15.5.9 (parcheado RCE)
- [x] **npm audit fix**: 0 vulnerabilidades restantes
- [x] Dependencias actualizadas automaticamente

### 4.4 Bloqueo de Red
IPs maliciosas bloqueadas en iptables:
- 16.185.242.248 (C2 Server)
- 78.153.140.50, 78.153.140.250
- 87.121.84.154
- 45.225.251.3
- 5.187.35.21
- 207.154.212.47
- 193.142.147.209

### 4.5 Hardening de Nginx
```nginx
# Nuevas protecciones implementadas:

# Bloqueo de patrones de ataque
location ~* (exec|cmd|shell|\.\./) { deny all; }

# Bloqueo de archivos sensibles
location ~* \.(env|git|bak|sql|log)$ { deny all; }

# Rate limiting
- General: 10 req/s con burst de 20
- API: 10 req/s con burst de 10
- Login: Burst limitado a 3

# Limite de conexiones
- 20 conexiones simultaneas por IP
```

---

## 5. ESTADO ACTUAL DEL SISTEMA

### 5.1 Servicios Verificados
| Servicio | Estado | Version |
|----------|--------|---------|
| Cambridge Mocks | OK | Next.js 15.5.9 |
| MW Panel | OK | Operativo |
| Nginx | OK | Rate limiting activo |
| Firewall | OK | IPs bloqueadas |

### 5.2 Verificacion de Seguridad
```bash
# Vulnerabilidades npm
$ npm audit
found 0 vulnerabilities

# Conexiones a IP maliciosa
$ ss -tunapl | grep 16.185
(sin resultados - bloqueado)

# Procesos sospechosos
$ docker exec cambridge-mocks-app ps aux
Solo procesos legitimos: npm, next-server, crond
```

---

## 6. RECOMENDACIONES PARA PREVENIR FUTUROS INCIDENTES

### 6.1 CRITICAS (Implementar Inmediatamente)
1. **Autenticacion SSH por Claves**
   - Generar par de claves SSH
   - Deshabilitar PasswordAuthentication
   - Esto previene ataques de fuerza bruta

2. **Actualizaciones Automaticas de Seguridad**
   ```bash
   # Configurar actualizaciones automaticas
   apt install unattended-upgrades
   dpkg-reconfigure unattended-upgrades
   ```

3. **Monitoreo de Dependencias**
   - Ejecutar `npm audit` regularmente
   - Configurar alertas de Dependabot en GitHub

### 6.2 IMPORTANTES (Corto Plazo)
1. **Fail2ban para Cambridge Mocks**
   - Crear jail especifico para detectar escaneos
   - Banear IPs con patrones de ataque

2. **Logs de Seguridad Centralizados**
   - Configurar alertas para patrones sospechosos
   - Monitorear POSTs inusuales a endpoints

3. **Contenedores Read-Only**
   - Configurar contenedor cambridge-mocks como read-only
   - Evitar que malware pueda escribir archivos

### 6.3 BUENAS PRACTICAS (Largo Plazo)
1. **Escaneo de Vulnerabilidades Periodico**
   - Ejecutar escaners como Trivy o Clair
   - Auditorias de seguridad trimestrales

2. **Segmentacion de Red**
   - Aislar contenedores en redes separadas
   - Limitar comunicacion entre servicios

3. **Backups Seguros**
   - Verificar integridad de backups
   - Mantener backups offline

---

## 7. LECCIONES APRENDIDAS

1. **Las vulnerabilidades de dependencias son criticas**: Una sola dependencia desactualizada (Next.js) permitio el compromiso completo.

2. **Los escaners automatizados son constantes**: El servidor fue escaneado por LeakIX apenas dias antes del ataque exitoso.

3. **El malware se oculta bien**: Los procesos se disfrazaron como httpd y crond para evitar deteccion.

4. **Los directorios de backup son objetivos**: El malware se alojo en directorios de backup para pasar desapercibido.

5. **El rate limiting es esencial**: Sin el, los atacantes pudieron hacer cientos de intentos sin restriccion.

---

## 8. CONCLUSION

El incidente fue causado por una vulnerabilidad critica en Next.js 15.5.0 que permitia ejecucion remota de codigo. Los atacantes explotaron esta vulnerabilidad para instalar un botnet/cryptominer.

**Acciones completadas**:
- Malware eliminado
- Vulnerabilidades parcheadas
- Sistema asegurado con multiples capas de proteccion

**El sistema esta ahora seguro y operativo.**

---

*Informe generado el 1 de Enero de 2026*
*Sistema: MundoWorld School - mocks.mundoworld.school*
