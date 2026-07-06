# Diseño — Scoping RGPD del acceso de profesores a datos de alumnos

> **Fecha**: 2026-06-17
> **Estado**: Diseño aprobado, pendiente de plan de implementación
> **Ámbito**: MW Panel (`/opt/mw-panel`) — módulo `students` (backend) + panel de profesor (frontend)
> **Sistema en producción**: requiere backup de BD previo y despliegue controlado

## 1. Problema

Un profesor autenticado puede acceder hoy a los datos personales de **todos** los alumnos del centro, no solo de los suyos. Esto incumple el RGPD (minimización de datos) frente a menores.

Causas concretas (auditadas en código):

- `GET /api/students` (`StudentsController.findAll`) **no tiene decorador `@Roles`** → cualquier usuario autenticado (profesor, alumno, familia) obtiene la lista completa de alumnos.
- `GET /api/students/:id` (`StudentsController.findOne`) **no tiene `@Roles`** → cualquier autenticado lee la ficha completa de cualquier alumno por ID.
- El endpoint scoped existente `GET /api/students/my-students` solo trae alumnos vía *subject_assignments* (asignaturas); **no** incluye los grupos donde el profesor es **tutor**.
- En el frontend, varias pantallas del profesor consumen el listado global `/students` en lugar de uno filtrado.

## 2. Alcance

**Definición de "alumnos accesibles por un profesor"** (acordado):
unión de
1. alumnos de grupos donde el profesor es **tutor** (`classGroup.tutor.user.id = userId`), y
2. alumnos de grupos donde el profesor **imparte una asignatura** (vía `subject_assignments`).

No se introduce el concepto de "coordinador" (no existe en el modelo de datos y no se requiere). **No hay cambios de esquema ni migraciones.**

**Esta fase implementa** el cierre de la fuga en el módulo de alumnos (listado + ficha) y el reapuntado del panel de profesor a endpoints filtrados.

**Fuera de alcance (Fase 2, ver §7)**: auditoría de otros módulos que un profesor toca (asistencia, evaluaciones, calificaciones, comunicaciones, recursos), que pueden tener endpoints igualmente amplios.

## 3. Arquitectura

El backend es la única autoridad de acceso. Una fuente de verdad para el conjunto accesible:

- `StudentsService.findAccessibleStudentsByUserId(userId)`: devuelve la unión (tutorías ∪ asignaturas).
- `StudentsService.canTeacherAccessStudent(userId, studentId)`: `EXISTS` sobre ese mismo conjunto; autoriza el acceso a una ficha concreta.

El frontend solo consume endpoints ya filtrados; no decide el alcance por sí mismo.

Notas técnicas:
- El payload JWT enriquecido expone `req.user.id` === `req.user.userId` === `User.id` (verificado en `auth/strategies/jwt.strategy.ts`).
- La relación `Teacher.user` es `OneToOne`; `ClassGroup.tutor` es `ManyToOne` a `Teacher`; `ClassGroup.students` es `ManyToMany`.

## 4. Cambios en backend (`modules/students`)

### 4.1 `students.controller.ts`
- `GET /students` (`findAll`): añadir `@Roles(UserRole.ADMIN)`.
- `GET /students/:id` (`findOne`): añadir `@Roles(UserRole.ADMIN, UserRole.TEACHER)`; recibir `@Request() req`; si el rol es `TEACHER` y `canTeacherAccessStudent(req.user.id, id)` es falso → `ForbiddenException`. Admin pasa siempre.
- `GET /students/my-students` (`getMyStudents`): cambiar la llamada de `findStudentsByTeacher` a `findAccessibleStudentsByUserId`.

### 4.2 `students.service.ts`
- Nuevo `findAccessibleStudentsByUserId(userId)`: query actual de asignaturas + `OR` para grupos donde `tutor.user.id = userId`, manteniendo `distinctOn(['student.id'])`, filtro `user.isActive = true` y el mismo orden.
- Nuevo `canTeacherAccessStudent(userId, studentId): Promise<boolean>`: comprobación de existencia del alumno dentro del conjunto accesible.
- `findStudentsByTeacher` se conserva (compatibilidad) o se deja de usar; no se elimina en esta fase para no afectar a otros consumidores.

## 5. Cambios en frontend (panel de profesor)

Objetivo: ninguna pantalla de profesor pide el listado global.

- `services/studentsService.ts`: añadir `getMyStudents()` → `GET /students/my-students`.
- Reapuntar a `getMyStudents()` (solo-profesor):
  - `components/recursos/ResourceAssignmentModal.tsx`
  - `components/recursos/ResourceAssignmentModalFixed.tsx`
  - `components/planificacion/PlanificacionForm.tsx`
  - `hooks/useStudentCompetencies.ts`
- Pantallas compartidas multi-rol → lógica por rol (admin: `/students`; profesor: `/students/my-students`):
  - `pages/shared/CalendarPage.tsx`
  - `pages/communications/MessagesPage.tsx`
- `pages/teacher/TeacherStudentsPage.tsx`: ya filtra por tutoría vía `/class-groups?tutorId=`; revisar para que el conjunto mostrado sea coherente con el endpoint scoped (tutorías ∪ asignaturas).
- Sin cambios (rol admin permite `/students`): `admin/StudentsPage`, `admin/AdminDashboard`, `admin/TeacherAccessManagementPage`, `admin/ReportAccessManagerPage`, `components/admin/AdminAttendanceDashboard`.
- Ignorar `pages/teacher/SharedNotesPage.tsx.backup` (no es código activo).

## 6. Pruebas y despliegue

### Verificación funcional
- Profesor (`profesor@mwpanel.com`): `GET /students` → **403**; `GET /students/my-students` → solo sus alumnos; `GET /students/:id` ajeno → **403**, propio → **200**.
- Admin (`info@mundoworld.school`): `GET /students` → **200** (sin cambios).
- UI del profesor: recursos, planificación, calendario, mensajes y panel de alumnos muestran solo sus grupos.

### Despliegue
1. Backup de BD previo (protocolo obligatorio CLAUDE.md), aunque no haya migración.
2. Backend: `./ultra-fast-rebuild.sh`.
3. Frontend: `npm run build` + copia a `/opt/mw-panel/frontend-dist/` (o `./deploy-with-cache-bust.sh`).
4. Verificar `GET /api/health/status` y los 403/200 anteriores con curl.

Sin migraciones ni cambios de esquema.

## 7. Fase 2 (COMPLETADA 2026-06-17)

Helper reutilizable `common/teacher-access/TeacherAccessService` (`canTeacherAccessStudent` + `canTeacherAccessClassGroup`), importado vía `TeacherAccessModule` en cada módulo. Aplicado por fases (un despliegue por módulo, verificado con tokens):
- `academic-records` — expedientes, entradas, calificaciones, boletines, estadísticas, sync.
- `evaluations` — listado solo admin; student/teacher/radar/findOne/create/update validados. (Los controladores `FormativeEvaluation`/`LearningSituations` de `competencies` están deshabilitados/comentados → sus endpoints no existen.)
- `attendance` — records, requests y stats por alumno/grupo.
- `communications` — destinatarios de profesor acotados a sus alumnos+familias; validación de grupo en parents-by-class-groups y messages/group; validación de recipientIds en messages/bulk.
- `grades` — centralized (propiedad de subjectAssignment) + unified-grading mock (acceso a alumno).
- `educational-resources` — teacher/:teacherId propio; validación de destino en assign/simple-assign.

Residual menor (no crítico): `communications.getAvailableGroups` duplicado y solo-tutoría (restrictivo, no fuga); `educational-resources` assignments/:assignmentId/* y filtrado de lista en resource/:id + viewers (metadatos de asignación, baja sensibilidad).

Objetivo cumplido: ningún endpoint de estos módulos devuelve datos de alumnos fuera del conjunto accesible del profesor.
