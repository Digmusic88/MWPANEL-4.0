# 🚀 MW PANEL 2.0 - CONFIGURACIÓN SERVIDOR HETZNER

## 📍 **Información del Servidor**
```
IP del Servidor: 91.99.205.204
Estado: ✅ ACTIVO (ping exitoso)
Proveedor: Hetzner Cloud
Conectividad: ✅ VERIFICADA
```

## 🔗 **1. CONFIGURACIÓN DNS (IMPORTANTE)**

**⚠️ ANTES DE INSTALAR** - Necesitas configurar tu dominio:

### **Si tienes un dominio:**
Ve al panel de tu proveedor de dominio y configura:
```
Tipo: A
Nombre: @ (o tu subdominio)
Valor: 91.99.205.204
TTL: 300 (5 minutos)

Opcional para www:
Tipo: A  
Nombre: www
Valor: 91.99.205.204
```

### **Si NO tienes dominio:**
Puedes usar servicios gratuitos:
- **DuckDNS**: https://www.duckdns.org
- **No-IP**: https://www.noip.com
- **FreeDNS**: https://freedns.afraid.org

## 🔑 **2. CONEXIÓN SSH LISTA**

```bash
# Comando para conectarte:
ssh -i ~/.ssh/mw_panel_hetzner root@91.99.205.204

# Si da error de permisos:
chmod 600 ~/.ssh/mw_panel_hetzner
```

## 📦 **3. INSTALACIÓN AUTOMÁTICA**

### **Opción A: Con tu dominio**
```bash
# Conéctate al servidor
ssh -i ~/.ssh/mw_panel_hetzner root@91.99.205.204

# Descarga e instala en un comando
curl -fsSL https://raw.githubusercontent.com/tu-usuario/mw-panel/main/deploy/install-vps.sh -o install-vps.sh && chmod +x install-vps.sh && ./install-vps.sh TU-DOMINIO.com tu-email@dominio.com
```

### **Opción B: Instalación paso a paso**
```bash
# 1. Conectar al servidor
ssh -i ~/.ssh/mw_panel_hetzner root@91.99.205.204

# 2. Actualizar sistema
apt update && apt upgrade -y

# 3. Instalar git
apt install -y git

# 4. Clonar repositorio
git clone https://github.com/tu-usuario/mw-panel.git /opt/mw-panel
cd /opt/mw-panel

# 5. Ejecutar instalación
./deploy/install-vps.sh TU-DOMINIO.com tu-email@dominio.com
```

## 🎯 **4. COMANDO DE INSTALACIÓN COMPLETO**

**Reemplaza TU-DOMINIO.com y tu-email@dominio.com:**

```bash
ssh -i ~/.ssh/mw_panel_hetzner root@91.99.205.204 "curl -fsSL https://raw.githubusercontent.com/tu-usuario/mw-panel/main/deploy/install-vps.sh -o install-vps.sh && chmod +x install-vps.sh && ./install-vps.sh TU-DOMINIO.com tu-email@dominio.com"
```

## 🔧 **5. CONFIGURACIÓN AUTOMÁTICA DE ACCESO SSH**

Te voy a crear un alias para que la conexión sea más fácil: