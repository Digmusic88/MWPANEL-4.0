# 🗄️ Volumen Persistente PostgreSQL - MW Panel 2.0

## 📋 **Información del Volumen**

El volumen persistente `mw-panel-pgdata` ha sido configurado para mantener todos los datos de PostgreSQL de forma permanente.

### ✅ **Configuración Actual**
- **Nombre del volumen**: `mw-panel-pgdata`
- **Tipo**: External volume (externo)
- **Driver**: Local
- **Ubicación**: `/var/lib/docker/volumes/mw-panel-pgdata/_data`

### 🔒 **Datos Protegidos**
El volumen contiene permanentemente:
- ✅ **47 Usuarios** completos (admin, teachers, families, students)
- ✅ **15 Estudiantes** con perfiles detallados
- ✅ **10 Familias** con contactos primarios y secundarios
- ✅ **9 Profesores** con especialidades y asignaciones
- ✅ **13 Grupos de Clase** completos (Infantil, Primaria, Secundaria)
- ✅ **10 Materias** del curriculum académico
- ✅ **330 Registros de Asistencia** (últimos 30 días)
- ✅ **15 Mensajes** entre profesores y familias
- ✅ **20 Relaciones** familia-estudiante
- ✅ **13 Cursos** ordenados por nivel (Infantil 3-5 años, Primaria 1º-6º, Secundaria 1º-4º ESO)
- ✅ Estructura académica completa (años, niveles, ciclos, cursos)
- ✅ Configuraciones del sistema

## 🛠️ **Comandos de Gestión**

### **Verificar Estado del Volumen**
```bash
docker volume inspect mw-panel-pgdata
```

### **Verificar Datos del Usuario Admin**
```bash
docker-compose exec postgres psql -U mwpanel -d mwpanel -c "
SELECT u.email, u.role, p.firstName, p.lastName 
FROM users u 
LEFT JOIN user_profiles p ON u.id = p.\"userId\" 
WHERE u.email = 'admin@mwpanel.com';
"
```

### **Verificar Registro de Profesor**
```bash
docker-compose exec postgres psql -U mwpanel -d mwpanel -c "
SELECT t.id, t.employeeNumber, t.specialties, u.email, u.role, p.firstName, p.lastName
FROM teachers t
JOIN users u ON t.userId = u.id
LEFT JOIN user_profiles p ON u.id = p.userId
WHERE u.email = 'profesor@mwpanel.com';
"
```

### **Backup Manual del Volumen**
```bash
# Crear backup
docker run --rm -v mw-panel-pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata-backup-$(date +%Y%m%d-%H%M%S).tar.gz /data

# Restaurar backup (CUIDADO: Sobrescribe datos)
docker run --rm -v mw-panel-pgdata:/data -v $(pwd):/backup alpine tar xzf /backup/pgdata-backup-YYYYMMDD-HHMMSS.tar.gz -C /
```

### **Listar Todos los Usuarios**
```bash
docker-compose exec postgres psql -U mwpanel -d mwpanel -c "
SELECT u.email, u.role, u.\"isActive\", p.\"firstName\", p.\"lastName\" 
FROM users u 
LEFT JOIN user_profiles p ON u.id = p.\"userId\" 
ORDER BY u.role, u.email;
"
```

### **Verificar Estructura Académica**
```bash
# Verificar años académicos
docker-compose exec postgres psql -U mwpanel -d mwpanel -c "
SELECT id, name, \"startDate\", \"endDate\", \"isCurrent\" 
FROM academic_years ORDER BY \"startDate\" DESC;
"

# Verificar estructura educativa completa
docker-compose exec postgres psql -U mwpanel -d mwpanel -c "
SELECT 
  el.name as educational_level,
  c.name as cycle,
  co.name as course,
  co.\"order\" as course_order
FROM educational_levels el
JOIN cycles c ON el.id = c.\"educationalLevelId\"
JOIN courses co ON c.id = co.\"cycleId\"
ORDER BY el.name, c.\"order\", co.\"order\";
"
```

## ⚠️ **IMPORTANTE - Reglas de Seguridad**

### 🚫 **NUNCA HACER**
```bash
# ❌ NUNCA ejecutar estos comandos (borran datos permanentemente)
docker-compose down -v
docker volume rm mw-panel-pgdata
docker volume prune
```

### ✅ **Comandos Seguros**
```bash
# ✅ Reiniciar servicios sin afectar datos
docker-compose restart postgres
docker-compose restart backend

# ✅ Reconstruir contenedores manteniendo datos
docker-compose stop postgres
docker-compose build --no-cache backend
docker-compose up -d postgres backend
```

## 🔄 **Proceso de Actualización**

Para actualizar el sistema manteniendo todos los datos:

1. **Parar servicios** (NO usar -v):
```bash
docker-compose stop
```

2. **Reconstruir si necesario**:
```bash
docker-compose build --no-cache
```

3. **Iniciar servicios**:
```bash
docker-compose up -d
```

4. **Verificar datos**:
```bash
docker-compose exec postgres psql -U mwpanel -d mwpanel -c "SELECT COUNT(*) as total_users FROM users;"
```

## 📊 **Credenciales de Acceso**

**Usuario Administrador:**
- Email: `admin@mwpanel.com`
- Password: `Admin123`
- Rol: Admin

**Usuarios Profesor:** (9 profesores disponibles)
- Email: `profesor@mwpanel.com`, `matematicas@mwpanel.com`, `lengua@mwpanel.com`, etc.
- Password: `Profesor123` (para todos)
- Rol: Teacher
- Especialidades: Matemáticas, Lengua, Inglés, Ed. Física, Música, etc.

**Usuarios Familia:** (10 familias disponibles)
- Email: `padres.garcia@gmail.com`, `familia.martin@gmail.com`, etc.
- Password: `Familia123` (para todos)
- Rol: Family
- Incluye: García López, Martín Ruiz, Fernández Silva, etc.

**Usuarios Estudiante:** (15 estudiantes disponibles)
- Email: `estudiante1@mwpanel.com` a `estudiante15@mwpanel.com`
- Password: `Estudiante123` (para todos)
- Rol: Student
- Nombres: Ana García, Carlos Martín, Elena Fernández, etc.

**URLs del Sistema:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- PostgreSQL: localhost:5432

## 🎯 **Verificación de Funcionalidad**

Después de cualquier reinicio, verificar:

1. ✅ Login funcional con admin@mwpanel.com
2. ✅ Sistema de asistencia accesible
3. ✅ Datos de usuarios persistentes
4. ✅ Configuraciones mantenidas

---

**⚡ El volumen `mw-panel-pgdata` garantiza que todos los datos del MW Panel 2.0 se mantengan permanentemente, incluso tras reinicios, actualizaciones o reconstrucciones del sistema.**