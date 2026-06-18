# Fase 0 — Descubrimiento e integración con MW Panel

> Documento de la Fase 0 del proyecto **Secretaría** (`secretaria.mundoworld.school`).
> Estado: **borrador para aprobación**. Fecha: 2026-06-12.

## 0. Hallazgo crítico: el stack NO es Supabase

El prompt maestro asume "mismo proyecto Supabase + Supabase Auth + RLS". **La realidad de MW Panel en producción es otra** y la estrategia se adapta en consecuencia:

| Asunción del prompt | Realidad verificada en el servidor | Decisión |
|---|---|---|
| Supabase/PostgreSQL | **PostgreSQL 15 self-hosted en Docker** (`mw-panel-db-prod`, base `mwpanel`, schema `public`). El usuario `mwpanel` es **superuser**. | Usar la **misma instancia PostgreSQL**, con un **schema nuevo `secretaria`**. Sin Supabase. |
| Migraciones Supabase | **TypeORM** (NestJS) + SQL manual (synchronize:false). | Migraciones SQL versionadas en `secretaria/migrations` aplicadas con el mismo patrón que MW Panel. |
| Supabase Auth | **JWT + Passport** sobre la tabla `users` (enum de roles: `family, student, admin, teacher`). | **Reutilizar el login/JWT de MW Panel** (mismo pool de usuarios). Roles de Secretaría en tabla propia (ver §4). |
| RLS de Postgres en todas las tablas | MW Panel **no usa RLS**; el control de acceso es por **guards de NestJS** (`JwtAuthGuard` + `RolesGuard`). | Control de acceso **a nivel de aplicación** (coherente con MW Panel). RLS opcional como endurecimiento extra, no como mecanismo principal. |
| Supabase Storage | MW Panel usa **carpeta local `uploads/`** + integración **Google Drive** (módulo educational-resources). | Documentos de Secretaría: carpeta local privada `secretaria-docs/` servida por el backend con descarga autenticada (reutilizable Google Drive si se desea). |

**Ventaja real que se mantiene:** al estar en la misma base PostgreSQL, la "integración bidireccional" se hace con **vistas SQL cross-schema y FKs lógicas reales**, sin APIs intermedias ni colas de sincronización.

---

## 1. Tabla de alumnos de MW Panel

- Tabla: `public.students`. PK `id uuid` (estable).
- Datos personales (nombre, email) **NO** están en `students`: están en `public.users` → `public.user_profiles` (vía `students.userId`). `students` tiene `enrollmentNumber`, `birthDate`, `photoUrl`, `educationalLevelId`, `courseId`.
- Niveles educativos: **Educación Infantil, Educación Primaria, Educación Secundaria** → **estos alumnos SON la "Escuela Alternativa"** (no hay una etapa separada con ese nombre; todo MW Panel es el colegio de mañanas).
- **Familias YA existen en MW Panel**: `public.families` (`primaryContactId`, `secondaryContactId` → `users`) y `public.family_students` (`familyId`, `studentId`, `relationship`). Es decir, tutores y relación familia-alumno ya están modelados.

### Puente A (lectura) — propuesta
```sql
CREATE VIEW secretaria.v_alumnos_escuela AS
SELECT s.id AS mwpanel_student_id, s."enrollmentNumber", s."birthDate", s."photoUrl",
       p."firstName", p."lastName", el.name AS etapa, c.name AS curso, u.email
FROM public.students s
JOIN public.users u ON u.id = s."userId"
JOIN public.user_profiles p ON p."userId" = u.id
LEFT JOIN public.educational_levels el ON el.id = s."educationalLevelId"
LEFT JOIN public.courses c ON c.id = s."courseId"
WHERE u."isActive" = true;
```
`secretaria.students` referenciará `mwpanel_student_id` (FK lógica). Si `mwpanel_student_id` NO es null → datos personales se LEEN de la vista, nunca se duplican. Los alumnos solo-academia viven 100% en `secretaria.students` con `mwpanel_student_id = NULL`.

**Familias:** para alumnos de colegio se podrá enlazar `secretaria.families` con la familia de MW Panel (campo `mwpanel_family_id`); para externos, familia propia de Secretaría.

## 2. Grupos / clases y horarios en MW Panel

- Sí existe modelo de horario: `public.schedule_sessions` (`dayOfWeek`, `startDate/endDate`, `subjectAssignmentId`, `classroomId`, `timeSlotId`, `academicYearId`, `isActive`). Granularidad: día + franja (`timeSlotId`) + aula (`classroomId`) + asignación (profesor+asignatura+grupo vía `subjectAssignmentId`).
- También: `public.class_groups` (con `academicYear`), `public.subject_assignments` (profesor+asignatura+grupo+año), `public.academic_years` (`name`, `startDate`, `endDate`, `isCurrent`).

### Puente C (horarios) — decisión pendiente de tu confirmación (Pregunta 1)
Dos opciones:
- **C1 (recomendada): tabla común `secretaria.schedule_slots`** para las actividades de academia (Inglés/Apoyo/Danza), que MW Panel renderiza vía vista. El horario del colegio sigue en `schedule_sessions`; el de la academia en `schedule_slots`. Una vista unificada `v_horario_global` une ambos para tablones.
- **C2: adaptador** que materializa las franjas de Secretaría dentro de `schedule_sessions` de MW Panel (más acoplado; requiere `timeSlotId`/`classroomId` compatibles).

## 3. Almacenamiento documental
MW Panel: `uploads/` local + Google Drive (educational-resources). Secretaría: bucket privado local `secretaria-docs/` (fuera de webroot), descarga con URL firmada/autenticada por el backend. Puente B: `secretaria.student_documents` + vista `public.v_documentacion_alumno` para que MW Panel muestre al tutor qué falta.

## 4. Identidad y roles
- Mismo login/JWT de MW Panel (tabla `users`). No se toca el enum de roles de MW Panel.
- Roles de Secretaría en tabla propia: `secretaria.staff_roles (user_id, role enum(secretaria_admin, secretaria_staff, direccion))`. Un guard propio (`SecretariaRolesGuard`) valida el JWT de MW Panel + el rol en esta tabla. Un profesor normal NO entra a Secretaría salvo que se le añada fila aquí.

## 5. ¿API o vistas?
MW Panel es NestJS con API REST interna. Para la integración, **Secretaría expone vistas SQL** en el schema `public` (de solo lectura) que MW Panel consulta directamente (mismo Postgres), y **Secretaría lee** las vistas `v_alumnos_escuela`. No hace falta API intermedia entre ambos. Para acceso de familias a sus pagos desde MW Panel (Pregunta 4), se hará vía vista `public.v_pagos_familia` con filtro por el usuario.

---

## Infraestructura de despliegue (verificada)
- Reverse proxy: **nginx del sistema** (`/etc/nginx/sites-enabled/`: mw-panel.conf, mocks, typequest, ict). Se añadirá `secretaria.conf` para `secretaria.mundoworld.school`.
- Contenedores nuevos: `mw-secretaria-api` (NestJS) y `mw-secretaria-web` (estáticos servidos por nginx). Solo exponen su puerto al proxy del host.
- Cloudflare: nuevo subdominio `secretaria.mundoworld.school`, SSL Full (Strict) reutilizando los certificados Cloudflare Origin existentes.
- Backups: incluir el schema `secretaria` en la rutina `mw-panel-backup.service` (ya hace `pg_dump` de toda la base `mwpanel`, así que el schema nuevo entra automáticamente).
- Cifrado IBAN/datos médicos: `CREATE EXTENSION pgcrypto` (mwpanel es superuser) — viable.

## Estado de la Fase 0
✅ Stack real verificado · ✅ Puentes A/B/C/D diseñados · ✅ Infra de despliegue identificada.
⏳ **Bloqueado para Fase 1** hasta tus respuestas a las 5 preguntas (ver README) — especialmente Pregunta 1 (C1 vs C2) y las tarifas (Pregunta 2) para el seed de `fee_schedules`.
