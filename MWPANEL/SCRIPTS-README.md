# 🚀 Scripts de MW Panel 2.0

Este directorio contiene scripts automatizados para gestionar el sistema MW Panel 2.0 de forma sencilla y eficiente.

## 📋 Scripts Disponibles

### 🟢 `start-mwpanel.sh` - Iniciar Sistema Completo
**Función**: Levanta todo el sistema MW Panel 2.0 con todas las dependencias.

**Características**:
- ✅ Verificación automática de prerrequisitos (Docker, Docker Compose)
- 🧹 Limpieza de contenedores anteriores 
- 🏗️ Construcción de imágenes Docker
- 🚀 Inicio de todos los servicios
- 🔍 Verificación de estado de servicios
- 📊 Monitoreo de logs en tiempo real
- 🎨 Interfaz colorida con información detallada

**Comando**:
```bash
./start-mwpanel.sh
```

### 🔴 `stop-mwpanel.sh` - Detener Sistema
**Función**: Detiene todos los servicios de MW Panel 2.0 de forma segura.

**Características**:
- 🛑 Parada segura de todos los contenedores
- 💾 Conservación de datos en volúmenes
- 📋 Información del estado final

**Comando**:
```bash
./stop-mwpanel.sh
```

### 📊 `status-mwpanel.sh` - Verificar Estado
**Función**: Muestra el estado actual de todos los servicios del sistema.

**Características**:
- 🔍 Verificación de contenedores Docker
- 🌐 Test de servicios web (Frontend, Backend, API)
- 🗄️ Estado de base de datos y Redis
- 💾 Información de volúmenes
- 📋 Resumen de puertos y URLs

**Comando**:
```bash
./status-mwpanel.sh
```

## 🎯 Flujo de Uso Recomendado

### Primer Uso
```bash
# 1. Dar permisos de ejecución (solo la primera vez)
chmod +x *.sh

# 2. Iniciar el sistema completo
./start-mwpanel.sh
```

### Uso Diario
```bash
# Verificar estado
./status-mwpanel.sh

# Si el sistema está parado, iniciarlo
./start-mwpanel.sh

# Para detener el sistema al final del día
./stop-mwpanel.sh
```

## 🌐 URLs de Acceso

Una vez iniciado el sistema, podrás acceder a:

- **🌐 Frontend (Aplicación Principal)**: http://localhost:5173
- **🔧 Backend API**: http://localhost:3000/api
- **📊 Documentación API (Swagger)**: http://localhost:3000/api/docs

## 🔑 Credenciales de Acceso

### Usuarios del Sistema
- **👨‍💼 Administrador**: `admin@mwpanel.com` / `Admin123!`
- **👨‍🏫 Profesor**: `profesor@mwpanel.com` / `Profesor123!`
- **👨‍🎓 Estudiante**: `estudiante@mwpanel.com` / `Estudiante123!`
- **👨‍👩‍👧‍👦 Familia**: `familia@mwpanel.com` / `Familia123!`

### Base de Datos
- **🗄️ PostgreSQL**: `localhost:5432` - Usuario: `postgres` / Contraseña: `postgres`
- **🔴 Redis**: `localhost:6379`

## 🛠️ Comandos Docker Útiles

Si necesitas usar Docker directamente:

```bash
# Ver logs de un servicio específico
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f database

# Reiniciar un servicio específico
docker-compose restart frontend
docker-compose restart backend

# Ver contenedores activos
docker-compose ps

# Acceder a un contenedor
docker-compose exec backend bash
docker-compose exec database psql -U postgres

# Reconstruir un solo servicio
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

## 🚨 Solución de Problemas

### Script no ejecutable
```bash
chmod +x start-mwpanel.sh stop-mwpanel.sh status-mwpanel.sh
```

### Docker no disponible
- Asegurate de tener Docker Desktop instalado y corriendo
- Verifica con: `docker --version` y `docker-compose --version`

### Puertos en uso
- Los puertos 3000, 5173, 5432, 6379 deben estar libres
- Para verificar: `lsof -i :3000` (cambia el puerto según necesites)

### Servicios no inician
```bash
# Ver logs detallados
docker-compose logs

# Reiniciar todo el sistema
./stop-mwpanel.sh
./start-mwpanel.sh
```

## 📝 Notas Importantes

- **💾 Persistencia de Datos**: Los datos se conservan en volúmenes de Docker incluso después de detener el sistema
- **🔄 Actualizaciones**: Después de cambios en el código, usa `./start-mwpanel.sh` para reconstruir
- **🖥️ Recursos**: El sistema requiere Docker Desktop con al menos 4GB de RAM asignados
- **🌐 Red**: Todos los servicios usan la red por defecto de Docker Compose

## 🎉 ¡Listo!

Con estos scripts, gestionar MW Panel 2.0 es tan simple como ejecutar un comando. El sistema se encarga de todo lo demás automáticamente.

Para cualquier problema, revisa los logs con los comandos proporcionados o ejecuta `./status-mwpanel.sh` para obtener un diagnóstico completo del sistema.