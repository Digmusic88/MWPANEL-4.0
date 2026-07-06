# CRITICAL PATHS - MW PANEL 2.0

## 🚨 RUTAS CRÍTICAS DEL SISTEMA

Este documento identifica los archivos y rutas críticas que **NO DEBEN MODIFICARSE** sin un análisis exhaustivo, ya que afectan la funcionalidad core del sistema educativo.

---

## 🔐 BACKEND CRÍTICO

### 📊 Base de Datos y Entidades
```
backend/src/modules/users/entities/user.entity.ts
backend/src/modules/students/entities/student.entity.ts
backend/src/modules/teachers/entities/teacher.entity.ts
backend/src/modules/families/entities/family.entity.ts
backend/src/modules/typequest/entities/typequest-profile.entity.ts
```
**⚠️ IMPACTO**: Cambios afectan toda la autenticación y relaciones del sistema

### 🔑 Autenticación y Seguridad
```
backend/src/modules/auth/auth.service.ts
backend/src/modules/auth/auth.controller.ts
backend/src/modules/auth/guards/jwt-auth.guard.ts
backend/src/modules/auth/guards/roles.guard.ts
```
**⚠️ IMPACTO**: Modificaciones pueden bloquear acceso de usuarios

### 📚 Sistema Educativo Core
```
backend/src/modules/subjects/subjects.service.ts
backend/src/modules/evaluations/evaluations.service.ts
backend/src/modules/grades/grades.service.ts
backend/src/modules/competencies/competencies.service.ts
```
**⚠️ IMPACTO**: Alteraciones afectan evaluaciones y notas de estudiantes

---

## 🎮 TYPEQUEST CRÍTICO

### 🎯 Lecciones y Curriculum
```
typequest/frontend/src/data/curriculum.ts
typequest/frontend/src/data/lessonsContent.ts
typequest/frontend/src/data/level[2-6]Lessons.ts
```
**⚠️ IMPACTO**: Cambios pueden romper progreso de 180 lecciones

### ⏱️ Sistema de Tiempo
```
typequest/frontend/src/components/ui/DatabaseTimeDisplay.tsx
mw-panel/backend/src/modules/typequest/services/typequest-time.service.ts
```
**⚠️ IMPACTO**: Alteraciones afectan límite diario de 20 minutos

### 🔄 Sincronización MW Panel
```
mw-panel/backend/src/modules/typequest/controllers/sync.controller.ts
mw-panel/backend/src/modules/typequest/services/typequest-sync.service.ts
```
**⚠️ IMPACTO**: Modifica integración bidireccional entre sistemas

---

## 🌐 FRONTEND CRÍTICO

### 🔐 Autenticación Frontend
```
frontend/src/services/apiClient.ts
frontend/src/services/authService.ts
frontend/src/store/authStore.ts
```
**⚠️ IMPACTO**: Cambios pueden romper login/logout y refresh tokens

### 📱 Layout Principal
```
frontend/src/components/layout/DashboardLayout.tsx
typequest/frontend/src/components/layout/TypeQuestLayout.tsx
```
**⚠️ IMPACTO**: Modificaciones afectan navegación en toda la aplicación

### 📊 Dashboards Principales
```
frontend/src/pages/admin/AdminDashboard.tsx
frontend/src/pages/teacher/TeacherDashboard.tsx
frontend/src/pages/student/StudentDashboard.tsx
```
**⚠️ IMPACTO**: Cambios afectan workflow diario de usuarios

---

## 🚀 INFRAESTRUCTURA CRÍTICA

### 🐳 Docker y Deployment
```
docker-compose.yml
nginx/default.conf
start-all.sh
status.sh
backup.sh
```
**⚠️ IMPACTO**: Alteraciones pueden afectar el deployment en producción

### 🗄️ Migraciones Base de Datos
```
backend/src/database/migrations/*.ts
```
**⚠️ IMPACTO**: Cambios pueden corromper datos en producción

### 🔧 Configuración Producción
```
backend/Dockerfile.prod
frontend/Dockerfile.prod
nginx/ssl/
```
**⚠️ IMPACTO**: Modificaciones pueden romper SSL y seguridad

---

## 📋 PROTOCOLO PARA MODIFICAR RUTAS CRÍTICAS

### ✅ ANTES DE MODIFICAR:
1. **Backup Completo**: Ejecutar `./backup.sh`
2. **Documentar Cambios**: Crear issue detallado
3. **Testing Extensivo**: Probar en ambiente de desarrollo
4. **Review Obligatorio**: Revisión por otro desarrollador
5. **Rollback Plan**: Tener plan de reversión listo

### 🧪 PROCESO DE TESTING:
1. **Unit Tests**: Verificar tests existentes pasan
2. **Integration Tests**: Probar flujos completos
3. **User Acceptance**: Testing manual con usuarios reales
4. **Performance**: Verificar no hay regresión de rendimiento
5. **Security**: Validar no se introducen vulnerabilidades

### 🚨 SIGNOS DE ALERTA:
- ❌ Login/logout deja de funcionar
- ❌ Estudiantes no pueden acceder a lecciones
- ❌ Profesores no pueden crear evaluaciones
- ❌ Families no ven datos de hijos
- ❌ Admin no puede gestionar usuarios
- ❌ TypeQuest no sincroniza con MW Panel
- ❌ SSL certificates fallan
- ❌ Base de datos no acepta conexiones

---

## 🔄 FLUJOS CRÍTICOS QUE PROTEGER

### 1. 🔐 Flujo de Autenticación
```
Login → JWT Tokens → Role Verification → Dashboard Access
```

### 2. 📚 Flujo Educativo
```
Student Login → Class Assignment → Subject Access → Evaluations → Grades
```

### 3. 🎮 Flujo TypeQuest
```
Login → Time Check → Lesson Access → Progress Tracking → MW Panel Sync
```

### 4. 👨‍🏫 Flujo Profesor
```
Login → Class Management → Student Evaluation → Grade Assignment → Reports
```

### 5. 👨‍👩‍👧‍👦 Flujo Familia
```
Login → Children Access → Academic Progress → Communications → Reports
```

---

## 📞 CONTACTO EN EMERGENCIAS

Si alguna ruta crítica falla en producción:

1. **Verificar Status**: `./status.sh`
2. **Consultar Logs**: `docker-compose logs -f [service]`
3. **Rollback**: Usar backup más reciente
4. **Comunicar**: Notificar a usuarios sobre incidente
5. **Post-Mortem**: Documentar causa y prevención

---

**📅 Última Actualización**: Julio 2025
**👤 Documentado por**: Sistema Claude Code
**🔄 Revisión Requerida**: Cada release mayor