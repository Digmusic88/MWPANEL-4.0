# 🏆 MW PANEL 2.0 - GUÍA DE SELECCIÓN DE VPS

**Versión**: 1.0  
**Fecha**: 2025-06-30  
**Especificaciones objetivo**: 4GB RAM, 2 vCPU, 40GB SSD

---

## 📊 ANÁLISIS COMPARATIVO DE PROVEEDORES

### 🥇 **RECOMENDACIÓN #1: DigitalOcean**

**Modelo**: Regular Intel Droplet 4GB  
**Precio**: $24/mes (~€22/mes)  
**Ubicación**: Amsterdam/Frankfurt  

#### Especificaciones Técnicas
- **RAM**: 4GB DDR4
- **vCPUs**: 2 Intel vCPUs
- **Almacenamiento**: 80GB SSD NVMe
- **Transferencia**: 4TB/mes
- **Red**: 1Gbps
- **IPv4**: 1 IP incluida

#### Servicios Adicionales
- **Backups automáticos**: +$4.80/mes (snapshots diarios)
- **Monitoring**: Gratis (CPU, RAM, disco, red)
- **Load Balancer**: $12/mes (opcional)
- **Firewall**: Gratis (cloud firewall)

#### Ventajas para MW Panel 2.0
✅ **Panel intuitivo** - Ideal para administradores sin experiencia técnica profunda  
✅ **Documentación excelente** - Tutoriales específicos para Docker y aplicaciones web  
✅ **Snapshots automáticos** - Backup de todo el servidor con un clic  
✅ **Resize sin downtime** - Escalabilidad vertical inmediata  
✅ **API completa** - Automatización de tareas administrativas  
✅ **Soporte 24/7** - Respuesta rápida via tickets  
✅ **99.99% SLA** - Garantía de uptime  
✅ **Latencia España**: ~30-45ms desde Madrid  

#### Desventajas
❌ Precio medio-alto comparado con competencia  
❌ Límite de transferencia (aunque 4TB es más que suficiente)  

#### **Coste Total Mensual: €26.80**
- Base: €22.00
- Backups: €4.30
- Monitoring: €0.00

---

### 🥈 **RECOMENDACIÓN #2: Hetzner Cloud**

**Modelo**: CPX21  
**Precio**: €9.17/mes  
**Ubicación**: Nuremberg/Helsinki  

#### Especificaciones Técnicas
- **RAM**: 4GB DDR4
- **vCPUs**: 3 AMD EPYC vCPUs
- **Almacenamiento**: 80GB SSD
- **Transferencia**: 20TB/mes
- **Red**: 20Gbps
- **IPv4**: 1 IP incluida

#### Servicios Adicionales
- **Snapshots**: €0.005/GB (incluido efectivamente)
- **Backups automáticos**: Snapshots manuales gratis
- **Load Balancer**: €5.25/mes
- **Floating IP**: €1.19/mes

#### Ventajas para MW Panel 2.0
✅ **Precio imbatible** - Mejor relación precio/rendimiento del mercado  
✅ **Hardware potente** - CPUs AMD EPYC de última generación  
✅ **Transferencia generosa** - 20TB vs 4TB de DigitalOcean  
✅ **Empresa europea** - Cumplimiento GDPR nativo  
✅ **Red ultrarrápida** - 20Gbps vs 1Gbps típico  
✅ **Panel moderno** - Interfaz web limpia y funcional  
✅ **API avanzada** - Terraform provider oficial  

#### Desventajas
❌ Menos tutoriales específicos que DigitalOcean  
❌ Soporte solo en inglés/alemán  
❌ Menor presencia en España (latencia ~60ms)  

#### **Coste Total Mensual: €9.17**
- Base: €9.17
- Snapshots: Incluido
- Monitoring: Incluido

---

### 🥉 **RECOMENDACIÓN #3: Vultr**

**Modelo**: Regular Performance 4GB  
**Precio**: $24/mes (~€22/mes)  
**Ubicación**: Amsterdam/París  

#### Especificaciones Técnicas
- **RAM**: 4GB DDR4
- **vCPUs**: 2 Intel vCPUs
- **Almacenamiento**: 80GB SSD
- **Transferencia**: 3TB/mes
- **Red**: 1Gbps
- **IPv4**: 1 IP incluida

#### Servicios Adicionales
- **Snapshots**: $1/mes por snapshot
- **Backups automáticos**: $2.40/mes
- **Load Balancer**: $10/mes
- **DDoS Protection**: Incluido

#### Ventajas para MW Panel 2.0
✅ **Red global** - 25+ ubicaciones mundiales  
✅ **DDoS protection** - Incluido en todos los planes  
✅ **Deploy rápido** - Servidores listos en 60 segundos  
✅ **Panel sencillo** - Interfaz web clara  
✅ **Precios transparentes** - Sin costes ocultos  

#### Desventajas
❌ Soporte menos especializado que DigitalOcean  
❌ Documentación menos extensa  
❌ Menor transferencia que Hetzner  

#### **Coste Total Mensual: €27.20**
- Base: €22.00
- Backups: €2.20
- Monitoring: €3.00

---

### 🇪🇸 **OPCIÓN ESPAÑOLA: Arsys**

**Modelo**: Cloud Server Medium  
**Precio**: €42/mes  
**Ubicación**: Madrid  

#### Especificaciones Técnicas
- **RAM**: 4GB DDR4
- **vCPUs**: 2 Intel vCPUs
- **Almacenamiento**: 80GB SSD
- **Transferencia**: Ilimitada
- **Red**: 1Gbps
- **IPv4**: 1 IP incluida

#### Servicios Adicionales
- **Backups**: €8.40/mes (snapshots diarios)
- **Monitoring**: €5/mes
- **Soporte técnico**: Incluido
- **Panel cPanel**: €15/mes (opcional)

#### Ventajas para MW Panel 2.0
✅ **Empresa española** - Oficinas en Madrid, soporte local  
✅ **Cumplimiento LOPD** - Garantía legal para centros educativos  
✅ **Soporte en español** - Teléfono y email en castellano  
✅ **Latencia mínima** - Servidores en Madrid (~5-15ms)  
✅ **Facturación española** - IVA incluido, facturas conformes  
✅ **Transferencia ilimitada** - Sin límites de ancho de banda  

#### Desventajas
❌ Precio significativamente superior  
❌ Panel web menos moderno  
❌ Menor flexibilidad en configuraciones  

#### **Coste Total Mensual: €55.40**
- Base: €42.00
- Backups: €8.40
- Monitoring: €5.00

---

### 🇫🇷 **OPCIÓN EUROPEA: OVHcloud**

**Modelo**: VPS SSD 3  
**Precio**: €19.99/mes  
**Ubicación**: Gravelines (Francia)  

#### Especificaciones Técnicas
- **RAM**: 4GB DDR4
- **vCPUs**: 2 Intel vCPUs
- **Almacenamiento**: 80GB SSD
- **Transferencia**: Ilimitada
- **Red**: 500Mbps garantizado
- **IPv4**: 1 IP incluida

#### Servicios Adicionales
- **Snapshots**: €4/mes por snapshot
- **Backups automáticos**: €3.99/mes
- **Additional Storage**: €0.04/GB/mes
- **Anti-DDoS**: Incluido

#### Ventajas para MW Panel 2.0
✅ **Precio competitivo** - Equilibrio entre prestaciones y coste  
✅ **Transferencia ilimitada** - Sin restricciones de ancho de banda  
✅ **Empresa establecida** - 20+ años de experiencia  
✅ **Ubicación europea** - Cumplimiento GDPR  
✅ **Anti-DDoS incluido** - Protección básica incluida  

#### Desventajas
❌ Panel web complejo para principiantes  
❌ Documentación principalmente en francés/inglés  
❌ Soporte técnico variable en calidad  

#### **Coste Total Mensual: €27.98**
- Base: €19.99
- Backups: €3.99
- Monitoring: €4.00

---

## 🎯 RECOMENDACIONES POR PERFIL

### 💰 **PERFIL: PRESUPUESTO AJUSTADO**
**Recomendación**: **Hetzner Cloud CPX21**
- **Coste**: €9.17/mes
- **Perfecto para**: Centros pequeños, colegios rurales, instalaciones de prueba
- **Consideraciones**: Requiere conocimientos técnicos básicos

### 👨‍🏫 **PERFIL: ADMINISTRADOR PRINCIPIANTE**
**Recomendación**: **DigitalOcean Regular Intel**
- **Coste**: €26.80/mes
- **Perfecto para**: Administradores IT sin experiencia en VPS
- **Consideraciones**: Documentación excelente, soporte de calidad

### 🏢 **PERFIL: CENTRO EDUCATIVO OFICIAL**
**Recomendación**: **Arsys Cloud Server**
- **Coste**: €55.40/mes
- **Perfecto para**: Colegios públicos, institutos oficiales
- **Consideraciones**: Cumplimiento legal garantizado, soporte en español

### ⚖️ **PERFIL: EQUILIBRIO PRECIO-PRESTACIONES**
**Recomendación**: **OVHcloud VPS SSD 3**
- **Coste**: €27.98/mes
- **Perfecto para**: Centros medianos con presupuesto moderado
- **Consideraciones**: Buena relación calidad-precio

### 🚀 **PERFIL: MÁXIMO RENDIMIENTO**
**Recomendación**: **Hetzner Cloud CPX21** (3 vCPUs AMD)
- **Coste**: €9.17/mes
- **Perfecto para**: Instalaciones que priorizan rendimiento
- **Consideraciones**: Hardware más potente por menos dinero

---

## 📊 TABLA COMPARATIVA COMPLETA

| Proveedor | RAM | vCPU | SSD | Transferencia | Precio Base | Backups | Total/mes |
|-----------|-----|------|-----|---------------|-------------|---------|-----------|
| **Hetzner** | 4GB | 3 AMD | 80GB | 20TB | €9.17 | Incluido | **€9.17** |
| **OVHcloud** | 4GB | 2 Intel | 80GB | Ilimitada | €19.99 | €3.99 | **€27.98** |
| **DigitalOcean** | 4GB | 2 Intel | 80GB | 4TB | €22.00 | €4.30 | **€26.80** |
| **Vultr** | 4GB | 2 Intel | 80GB | 3TB | €22.00 | €2.20 | **€27.20** |
| **Arsys** | 4GB | 2 Intel | 80GB | Ilimitada | €42.00 | €8.40 | **€55.40** |

---

## 🔍 ANÁLISIS TÉCNICO DETALLADO

### Rendimiento de Red por Proveedor

#### **Latencia desde España (Madrid)**
- **Arsys** (Madrid): ~5-15ms ⭐⭐⭐⭐⭐
- **DigitalOcean** (Amsterdam): ~30-45ms ⭐⭐⭐⭐
- **OVHcloud** (Gravelines): ~40-60ms ⭐⭐⭐
- **Vultr** (Amsterdam): ~35-50ms ⭐⭐⭐⭐
- **Hetzner** (Nuremberg): ~50-70ms ⭐⭐⭐

#### **Ancho de Banda Garantizado**
- **Hetzner**: 20Gbps burst, sin límites prácticos ⭐⭐⭐⭐⭐
- **DigitalOcean**: 1Gbps constante ⭐⭐⭐⭐
- **Vultr**: 1Gbps constante ⭐⭐⭐⭐
- **OVHcloud**: 500Mbps garantizado ⭐⭐⭐
- **Arsys**: 1Gbps constante ⭐⭐⭐⭐

### Hardware y Rendimiento

#### **Potencia de CPU**
- **Hetzner**: AMD EPYC (3 cores) ⭐⭐⭐⭐⭐
- **DigitalOcean**: Intel (2 cores) ⭐⭐⭐⭐
- **Vultr**: Intel (2 cores) ⭐⭐⭐⭐
- **OVHcloud**: Intel (2 cores) ⭐⭐⭐
- **Arsys**: Intel (2 cores) ⭐⭐⭐

#### **Tipo de Almacenamiento**
- **DigitalOcean**: SSD NVMe ⭐⭐⭐⭐⭐
- **Hetzner**: SSD ⭐⭐⭐⭐
- **Vultr**: SSD ⭐⭐⭐⭐
- **OVHcloud**: SSD ⭐⭐⭐⭐
- **Arsys**: SSD ⭐⭐⭐

---

## 🏛️ CONSIDERACIONES PARA CENTROS EDUCATIVOS ESPAÑOLES

### Cumplimiento Legal y Normativo

#### **LOPD/GDPR**
- **Arsys**: ✅ Cumplimiento garantizado, contratos LOPD disponibles
- **Hetzner**: ✅ Empresa europea, GDPR nativo
- **OVHcloud**: ✅ Empresa europea, GDPR nativo
- **DigitalOcean**: ✅ GDPR compliant, datacenter EU
- **Vultr**: ✅ GDPR compliant, datacenter EU

#### **Facturación y Aspectos Administrativos**
- **Arsys**: Factura española con IVA, fácil para contabilidad
- **Hetzner**: Factura alemana con IVA EU
- **OVHcloud**: Factura francesa con IVA EU
- **DigitalOcean**: Factura US, gestión IVA manual
- **Vultr**: Factura US, gestión IVA manual

#### **Soporte en Horario Escolar**
- **Arsys**: 9:00-18:00 CET, teléfono español ⭐⭐⭐⭐⭐
- **DigitalOcean**: 24/7, solo inglés ⭐⭐⭐⭐
- **Hetzner**: 24/7, alemán/inglés ⭐⭐⭐
- **OVHcloud**: 24/7, francés/inglés ⭐⭐⭐
- **Vultr**: 24/7, solo inglés ⭐⭐⭐

### Requisitos Específicos del Sector Educativo

#### **Disponibilidad Durante Horario Lectivo**
- Todos los proveedores ofrecen 99.9%+ uptime
- **Crítico**: Configurar alertas para caídas del sistema
- **Recomendación**: Snapshots automáticos para recuperación rápida

#### **Escalabilidad para Crecimiento**
- **DigitalOcean**: Resize sin downtime ⭐⭐⭐⭐⭐
- **Hetzner**: Resize con reinicio ⭐⭐⭐⭐
- **Vultr**: Resize con reinicio ⭐⭐⭐⭐
- **OVHcloud**: Proceso manual ⭐⭐⭐
- **Arsys**: Proceso manual ⭐⭐⭐

---

## 🛠️ CONFIGURACIÓN INICIAL RECOMENDADA

### Para DigitalOcean (Recomendación General)

#### Paso 1: Crear Cuenta y Droplet
```bash
# Configuración recomendada en panel web:
Distribución: Ubuntu 22.04 LTS
Plan: Regular Intel - 4GB/2 vCPU
Región: Amsterdam 3
Autenticación: SSH Keys (más seguro que password)
Backups: Habilitados
Monitoring: Habilitado
```

#### Paso 2: Configuración DNS
```bash
# En tu proveedor de dominio, configurar:
A     @        [IP_DROPLET]
A     www      [IP_DROPLET]
```

#### Paso 3: Configuración Inicial del Servidor
```bash
# Conectar al servidor
ssh root@IP_DROPLET

# Actualizar sistema
apt update && apt upgrade -y

# Crear usuario administrador
adduser mwpanel
usermod -aG sudo mwpanel

# Configurar firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

### Para Hetzner Cloud (Opción Económica)

#### Paso 1: Crear Proyecto y Servidor
```bash
# Configuración en panel Hetzner:
Tipo: CPX21
Ubicación: Nuremberg
Imagen: Ubuntu 22.04
Red: Crear red privada (opcional)
SSH Keys: Subir clave pública
```

#### Paso 2: Configuración de Red
```bash
# Hetzner incluye IPv6, configurar si es necesario:
# /etc/netplan/50-cloud-init.yaml
```

#### Paso 3: Optimización para AMD
```bash
# Verificar CPU
lscpu | grep AMD

# Instalar herramientas específicas AMD
apt install amd64-microcode
```

---

## 📋 CHECKLIST DE SELECCIÓN

### ✅ **Factores Técnicos**
- [ ] RAM suficiente (4GB mínimo)
- [ ] CPU adecuada (2+ vCPU)
- [ ] Almacenamiento SSD (40GB+ disponible)
- [ ] Transferencia suficiente (3TB+ o ilimitada)
- [ ] Latencia aceptable (<100ms desde España)

### ✅ **Factores Económicos**
- [ ] Precio base dentro del presupuesto
- [ ] Coste de backups considerado
- [ ] Sin costes ocultos verificado
- [ ] Método de pago disponible

### ✅ **Factores Legales**
- [ ] GDPR compliance verificado
- [ ] Ubicación del datacenter apropiada
- [ ] Términos de servicio revisados
- [ ] Política de privacidad conforme

### ✅ **Factores Operacionales**
- [ ] Panel de administración intuitivo
- [ ] Documentación disponible
- [ ] Soporte en idioma preferido
- [ ] API disponible para automatización

---

## 🚀 RECOMENDACIÓN FINAL

### **Para la mayoría de centros educativos españoles:**

**OPCIÓN RECOMENDADA: DigitalOcean Regular Intel 4GB**

#### ¿Por qué DigitalOcean?
1. **Balance perfecto** entre facilidad de uso y prestaciones
2. **Documentación excepcional** para instalación MW Panel 2.0
3. **Snapshots automáticos** - Backup completo del sistema
4. **Escalabilidad sin downtime** - Crecimiento sin interrupciones
5. **Soporte de calidad** - Resolución rápida de problemas
6. **Comunidad activa** - Tutoriales y soluciones disponibles

#### Configuración Específica:
```
Droplet: Regular Intel 4GB
Región: Amsterdam 3
Sistema: Ubuntu 22.04 LTS
Backups: Habilitados
Monitoring: Habilitado
Floating IP: No necesario inicialmente
Block Storage: No necesario inicialmente

Coste total: €26.80/mes
```

### **Para centros con presupuesto muy ajustado:**

**OPCIÓN ECONÓMICA: **
- €9.17/mes todo incluido
- Hardware superior (3 vCPU AMD vs 2 Intel)
- Requiere algo más de conocimiento técnico

### **Para centros oficiales con requisitos legales estrictos:**

**OPCIÓN ESPAÑOLA: Arsys Cloud Server Medium**
- €55.40/mes con todos los servicios
- Cumplimiento LOPD garantizado
- Soporte técnico en español

---

## 📞 SIGUIENTE PASO

Una vez hayas elegido tu proveedor, continúa con la **GUÍA DE INSTALACIÓN VPS** (`INSTALACION-VPS.md`) para desplegar MW Panel 2.0 en tu servidor.

**Tiempo estimado total desde cero**: 2-3 horas incluyendo configuración del VPS

---

*Documento creado: 2025-06-30*  
*Precios actualizados: 2025-06-30*  
*Próxima revisión: 2025-09-30*