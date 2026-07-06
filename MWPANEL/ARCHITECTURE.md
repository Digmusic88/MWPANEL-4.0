# MW-PANEL - MAPA DE ARQUITECTURA

## 📋 RESUMEN EJECUTIVO

MW Panel 2.0 es un sistema educativo integral con dos componentes principales:
- **MW Panel**: Gestión escolar completa con competencias españolas
- **TypeQuest**: Juego de mecanografía integrado para estudiantes 6-15 años

**Estado actual**: ✅ Sistema completo y funcional con todas las integraciones operativas

---

## 🏗️ MÓDULOS CRÍTICOS (NO MODIFICAR sin análisis)

### 🔐 Sistema de Autenticación
- **auth.service.ts**: Núcleo de seguridad con JWT + Refresh Tokens
- **user.entity.ts**: Base del sistema con 4 roles (admin/teacher/student/family)
- **auth.controller.ts**: API de login compartida MW Panel ↔ TypeQuest
- **jwt-auth.guard.ts**: Protección de TODAS las rutas del sistema

### 📚 Sistema de Tareas Estudiantiles
- **task.entity.ts**: Tareas con entregas, fechas límite, archivos adjuntos
- **task-submission.entity.ts**: Entregas de estudiantes
- **tasks.service.ts**: Lógica de negocio para asignaciones y evaluaciones

### 🎯 Sistema de Actividades Diarias
- **activity.entity.ts**: Evaluaciones inmediatas en clase (emoji/score/rubric)
- **activity-assessment.entity.ts**: Calificaciones por estudiante
- **activities.service.ts**: Evaluación competencial diaria

### 🎮 Sistema TypeQuest (Mecanografía)
- **typequest-profile.entity.ts**: Perfiles de juego integrados con MW Panel
- **typequest-session.entity.ts**: Sesiones de 20 minutos diarios
- **typequest.service.ts**: Integración completa con dashboard profesores/familias

### 📁 Sistema de Recursos Educativos
- **educational-resource.entity.ts**: Recursos con Google Drive automático
- **educational-resources.service.ts**: ✅ RECIÉN REPARADO (2025-07-12)
- **google-drive.service.ts**: Integración con shared drive automática

---

## 📊 NOMENCLATURA EN USO

### Términos Fijos del Sistema
- **"tasks"** = SIEMPRE tareas estudiantiles con entregas
- **"activities"** = SIEMPRE actividades evaluables diarias inmediatas
- **"assignments"** = SIEMPRE asignación profesor-materia-grupo
- **"resources"** = SIEMPRE recursos educativos subidos por profesores
- **"evaluations"** = SIEMPRE evaluaciones competenciales formales
- **"assessments"** = SIEMPRE valoraciones de actividades diarias

### Roles del Sistema (UserRole enum)
```typescript
ADMIN = 'admin'      // Administrador del sistema
TEACHER = 'teacher'  // Profesorado
STUDENT = 'student'  // Estudiantes
FAMILY = 'family'    // Familias/Padres
```

### Estados de TypeQuest
```typescript
AgeGroup: 'starter' | 'explorer' | 'master'  // 6-8, 9-11, 12-15 años
```

---

## 🛣️ RUTAS OCUPADAS

### Backend API (/api/*)
- `/api/auth/*` - Autenticación (login, refresh, profile)
- `/api/tasks/*` - Sistema de tareas estudiantiles
- `/api/activities/*` - Actividades diarias evaluables
- `/api/recursos/*` - Recursos educativos con Google Drive
- `/api/typequest/*` - Sistema de mecanografía gamificado
- `/api/users/*` - Gestión de usuarios multi-rol
- `/api/evaluations/*` - Evaluaciones competenciales
- `/api/subjects/*` - Asignaturas del curriculum
- `/api/communications/*` - Sistema de mensajería

### Frontend Routes
- `/dashboard` - Dashboard principal por rol
- `/tasks` - Sistema de tareas (teacher/student views)
- `/activities` - Actividades de evaluación diaria
- `/recursos` - Gestión de recursos educativos
- `/evaluations` - Sistema de evaluación competencial
- `/students` - Gestión de estudiantes (admin/teacher)
- `/calendar` - Calendario académico
- `/communications` - Centro de mensajes

### TypeQuest Routes (Subdomain)
- `https://typequest.mundoworld.school/*` - Aplicación de mecanografía
- Autenticación compartida con MW Panel

---

## 🗄️ TABLAS Y SU USO ACTUAL

### Autenticación y Usuarios
| Tabla | Propósito | Relaciones Críticas |
|-------|-----------|-------------------|
| `users` | Usuarios base (4 roles) | ↔ user_profiles (1:1) |
| `user_profiles` | Perfiles extendidos | ↔ users (1:1) |
| `refresh_tokens` | Tokens JWT rotatorios | ↔ users (N:1) |

### Sistema Educativo
| Tabla | Propósito | NO usar para |
|-------|-----------|--------------|
| `tasks` | Tareas estudiantiles con entregas | Tareas administrativas |
| `task_submissions` | Entregas de estudiantes | Evaluaciones inmediatas |
| `activities` | Evaluaciones diarias inmediatas | Tareas con fechas límite |
| `activity_assessments` | Calificaciones por estudiante | Notas finales |
| `evaluations` | Evaluaciones competenciales | Actividades diarias |
| `competency_evaluations` | Marco competencial español | Evaluaciones informales |

### Recursos y Comunicaciones
| Tabla | Propósito | Integración |
|-------|-----------|-------------|
| `educational_resources` | Recursos con Google Drive | Shared drive automático |
| `resource_assignments` | Asignación a grupos | ↔ class_groups |
| `messages` | Sistema de mensajería | Multi-rol |
| `notifications` | Notificaciones push | Real-time WebSocket |

### TypeQuest (Mecanografía)
| Tabla | Propósito | Límites |
|-------|-----------|---------|
| `typequest_profiles` | Perfiles de estudiantes | Solo Primaria/Secundaria |
| `typequest_sessions` | Sesiones de juego | 20 minutos diarios |
| `typequest_daily_stats` | Estadísticas diarias | Integrado con dashboard |

---

## 🔗 INTEGRACIONES CRÍTICAS

### MW Panel ↔ TypeQuest
- **Autenticación compartida**: JWT tokens entre dominios
- **Perfiles sincronizados**: Creación automática al login
- **Dashboard integrado**: Progreso TypeQuest en MW Panel
- **Control de tiempo**: 20 minutos diarios desde BD
- **Filtrado educacional**: Solo estudiantes Primaria/Secundaria

### Google Drive Integration
- **Shared Drive**: "12. Plataforma (Recursos dicácticos compartidos)"
- **Estructura automática**: año/nivel/grado/asignatura
- **Estados**: ✅ FUNCIONAL 100% (reparado 2025-07-12)
- **Credenciales**: Service account con permisos específicos

### Base de Datos
- **PostgreSQL 15**: Gestión principal con TypeORM
- **Redis**: Cache de sesiones y leaderboards
- **Migraciones**: Sistema automatizado con seeds

---

## 🚨 MODIFICACIONES RECIENTES (2025-07-12)

### ✅ Recursos Educativos - REPARACIÓN COMPLETA
- **Problema**: JSON parsing errors, 404/400 errors en upload
- **Solución**: 
  - Fix tagsArray transformation en educational-resources.service.ts
  - Fix Google Drive stream conversion en google-drive.service.ts
  - Añadido endpoint GET /api/recursos/resource/:id
  - Reparación nginx proxy backend->mw-panel-backend
- **Estado**: ✅ 8 recursos en BD, Google Drive funcional

### Archivos Modificados
```
backend/src/modules/educational-resources/
├── educational-resources.service.ts ✅ REPARADO
├── educational-resources.controller.ts ✅ NUEVO ENDPOINT
└── services/google-drive.service.ts ✅ STREAM FIX

nginx/default.conf ✅ PROXY FIX
```

---

## 🔧 HERRAMIENTAS DE DESARROLLO

### Scripts de Gestión
```bash
./start-all.sh           # Sistema completo
./status.sh              # Health check
./backup.sh              # Backup automático
./stop-mwpanel.sh        # Shutdown graceful
```

### Comandos Críticos
```bash
# Backend (NestJS)
npm run start:dev        # Hot reload desarrollo
npm run migration:run    # Aplicar migraciones
npm run seed:run         # Datos de prueba

# Frontend (React + Vite)
npm run dev              # Servidor desarrollo
npm run build            # Build producción
```

---

## 📈 MÉTRICAS DE MONITOREO

### Sistema Principal
- **Usuarios activos**: 4 roles operativos
- **Recursos educativos**: 8 recursos en Google Drive
- **TypeQuest**: Integración 100% funcional
- **Uptime**: Monitoreado con health checks

### Puntos de Fallo Críticos
1. **JWT Token expiration**: 15min access + 7d refresh
2. **Google Drive quota**: Monitorear uso de shared drive
3. **TypeQuest time limits**: 20min diarios por estudiante
4. **Database connections**: Pool de conexiones PostgreSQL

---

## 🚀 DEPLOYMENT

### Producción Actual
- **Dominio principal**: https://plataforma.mundoworld.school
- **TypeQuest**: https://typequest.mundoworld.school
- **SSL**: Cloudflare Origin Certificates
- **Proxy**: Nginx con configuración específica
- **Containers**: Docker multi-stage builds

### URLs de Testing
- **MW Panel**: https://plataforma.mundoworld.school
- **API Docs**: https://plataforma.mundoworld.school/api/docs
- **TypeQuest Test**: https://typequest.mundoworld.school/test

---

**Última actualización**: 2025-07-12 00:30 UTC
**Estado del sistema**: ✅ FUNCIONAL 100%
**Backup más reciente**: mw-panel-recursos-educativos-fix-20250712-000852.tar.gz