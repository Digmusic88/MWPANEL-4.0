# Contrato de integración Secretaría ↔ MW Panel

> **Qué es esto:** la lista exacta de tablas/columnas de MW Panel (`public.*`) de
> las que depende Secretaría, y cómo verificarlo. Si cambias alguna de estas
> columnas en MW Panel, la integración de Secretaría se rompe. Antes de
> renombrar/borrar cualquiera, corre `scripts/contract-check.sh` y actualiza
> este documento.

## Dirección del acoplamiento

- **Unidireccional, vía base de datos compartida** (mismo Postgres `mw-panel-db-prod`).
  Secretaría (schema `secretaria`) **consume** datos de MW Panel (schema `public`).
- **MW Panel NO depende de Secretaría** (0 referencias en su backend). Toda la
  integración de lectura es SQL cross-schema. Desde Feature 1c (2026-07-04),
  Secretaría sí hace UNA llamada REST saliente hacia MW Panel
  (`POST /api/enrollment`, aprovisionamiento de cuentas); ver detalle al final
  de este documento.
- Desde Feature 2 (2026-07-04), MW Panel hace una llamada REST **saliente hacia
  Secretaría** (`GET /api/secretaria/ficha/by-mwpanel/:mwStudentId`), de solo
  lectura, para mostrar la ficha del alumno en su gestión (admin). El
  acoplamiento **REST** pasa a ser bidireccional (1c: Secretaría→MW Panel
  escritura; 2: MW Panel→Secretaría lectura), pero el acoplamiento **por schema**
  sigue siendo unidireccional: Secretaría lee `public.*`; MW Panel **NO** lee
  `secretaria.*` (recibe la ficha ya montada por JSON).

## Superficie del contrato (lo que Secretaría lee de `public.*`)

### Vía la vista puente `secretaria.v_alumnos_escuela`
Fallback de nombre de alumno (`COALESCE(nombre local, va.first_name||' '||va.last_name)`)
cuando un alumno de Secretaría está enlazado por `mwpanel_student_id`.
Lee de MW Panel:

| Tabla `public.*` | Columnas |
|---|---|
| `students` | id, enrollmentNumber, birthDate, photoUrl, userId, educationalLevelId, courseId |
| `educational_levels` | id, name |
| `courses` | id, name |
| `users` | id, email, isActive |
| `user_profiles` | userId, firstName, lastName |

Columnas de salida de la vista: `mwpanel_student_id, enrollment_number, birth_date,
photo_url, first_name, last_name, etapa, curso, email`.

### Vía la vista puente `secretaria.v_docentes_mwpanel`
Pantalla "importar profesor de MW Panel". Lee de MW Panel:

| Tabla `public.*` | Columnas |
|---|---|
| `teachers` | id, userId, employeeNumber, specialties |
| `users` | id, email |
| `user_profiles` | userId, firstName, lastName |

Columnas de salida de la vista: `mwpanel_teacher_id, user_id, email, full_name,
employee_number, specialties`.

### Lecturas y ESCRITURAS directas a la identidad compartida
Además de las vistas, Secretaría trata `public.users` / `public.user_profiles`
como store de identidad común:

- **Lee** `public.users` (+ `user_profiles`) para autenticación (`auth.controller.ts`)
  y chat (`chat.controller.ts`).
- **Escribe** `public.users` / `public.user_profiles` para provisión de cuentas
  (`access.controller.ts`): crear cuenta de plataforma (INSERT), cambiar email,
  resetear contraseña (UPDATE `passwordHash`), insertar perfil.

Columnas del contrato en identidad:

| Tabla `public.*` | Columnas | Uso |
|---|---|---|
| `users` | id, email, passwordHash, role, isActive | lectura auth/chat + escritura provisión |
| `user_profiles` | id, userId, firstName, lastName | lectura + escritura provisión |

### Lectura directa de asistencia del colegio (asistencia en la ficha, 2026-07-04)
La ficha del alumno de Secretaría (`students.controller.ts` `GET /students/:id/ficha`)
lee `public.attendance_records` cross-schema para mostrar la asistencia del COLEGIO
(MW Panel) del curso actual, junto a la de la academia. Solo para alumnos enlazados
(`secretaria.students.mwpanel_student_id = public.students.id`), filtrando por el
curso académico activo (`public.academic_years.isCurrent = true`). Solo lectura.

| Tabla `public.*` | Columnas | Uso |
|---|---|---|
| `attendance_records` | studentId, date, status, academicYearId | lectura: resumen + historial diario de asistencia del colegio |
| `academic_years` | id, name, isCurrent | lectura: resolver el curso activo y su etiqueta |

El `status` es el enum inglés de MW Panel (`present`, `absent`, `late`,
`justified_late`, `early_departure`, `justified_absence`). Política de cómputo
(igual que el boletín): retrasos y salidas anticipadas cuentan como asistencia;
solo restan faltas justificadas e injustificadas.

### Lectura directa del expediente académico del colegio (SP-3, 2026-07-04)
La ficha del alumno de Secretaría (`students.controller.ts` `GET /students/:id/ficha`)
lee el expediente académico del COLEGIO (MW Panel) del curso activo para mostrar la
tabla de calificaciones (asignatura × trimestres/final + conversión LOMLOE + nota
media). Solo para alumnos enlazados (`mwpanel_student_id`), curso activo
(`academic_years.isCurrent = true`). Solo lectura. Primer consumidor de
`academic_records` fuera de MW Panel.

| Tabla `public.*` | Columnas | Uso |
|---|---|---|
| `academic_records` | id, studentId, academicYear, finalGPA, isActive | expediente del curso + nota media |
| `academic_record_entries` | academicRecordId, subjectAssignmentId, numericValue, period, isPassing, isActive, type | filas de asignatura por periodo |
| `subject_assignments` | id, subjectId | resolver la asignatura de la entrada |
| `subjects` | id, name | nombre de la asignatura |

La conversión LOMLOE de la nota (0-100 → Insuficiente/Suficiente/Bien/Notable/
Sobresaliente, con variantes Infantil/Bachiller) se calcula en el backend de
Secretaría (espejo de `report-generator` de MW Panel).

## Acoplamientos de seguridad

- **`JWT_SECRET` compartido** entre MW Panel y Secretaría (Secretaría valida los
  tokens emitidos por MW Panel).
- **`public.users` como identidad común**: un mismo usuario/contraseña sirve en
  ambos sistemas.

## Fuera del contrato (no lo verifica el check)

- `secretaria.students.mwpanel_student_id` — enlace de alumnos, hoy **dormido**
  (NULL en todos; ningún código lo escribe). Si se activa en el futuro, la vista
  `v_alumnos_escuela` empezará a entregar datos y este contrato gana valor.
- `secretaria.academic_years.mwpanel_academic_year_id` — sembrado una vez, nadie
  lo lee/escribe.

## Cómo verificar el contrato

```bash
/opt/mw-secretaria/scripts/contract-check.sh
# exit 0 = OK · exit 1 = roto (ver detalle) · exit 2 = BD no disponible
```

El deploy de MW Panel (`/opt/mw-panel/ultra-fast-rebuild.sh`) corre esta
verificación automáticamente al final y muestra un aviso ⚠️ **no bloqueante**
si el contrato se rompió (el deploy se completa igual).

## Regla operativa

1. ¿Vas a renombrar/borrar una columna `public.*` de la tabla de arriba en MW Panel?
   Corre `contract-check.sh` antes y después; si se rompe, arregla la vista o el
   consumidor y actualiza este documento.
2. ¿Añades en Secretaría un consumidor nuevo de datos de MW Panel? Amplía la
   superficie aquí y en `scripts/contract-check.sql`.

## Llamada saliente Secretaría → MW Panel (Feature 1c, 2026-07-04)

Secretaría **llama a la API REST de MW Panel** para crear cuentas de acceso
(aprovisionamiento): `POST http://mw-panel-backend-prod:3000/api/enrollment`
autenticado con un JWT de rol admin firmado con el **JWT_SECRET compartido**.
No escribe `public.*` por SQL para esto: delega en `processEnrollment` de MW
Panel (crea alumno+familia+cuentas, dedup por email). Acoplamientos:
- Depende del contrato de `POST /api/enrollment` (campos de `CreateEnrollmentDto`)
  y de que exista al menos un `public.users` con rol admin activo.
- Depende de que el `JWT_SECRET` siga siendo el mismo en ambos servicios.
- Tras crear, Secretaría guarda el `student.id` devuelto en
  `secretaria.students.mwpanel_student_id`.

## Llamada entrante MW Panel → Secretaría (Feature 2, ficha del alumno)

- **Endpoint:** `GET /api/secretaria/ficha/by-mwpanel/:mwStudentId` (módulo `ficha/`).
- **Auth:** `SecretariaAuthGuard` + `@Roles('secretaria_admin','direccion')`. MW
  Panel firma un JWT de servicio con el `JWT_SECRET` compartido y `sub =
  SECRETARIA_SERVICE_USER_ID` (un usuario con staff_role `secretaria_admin`).
- **Qué expone:** ficha completa del alumno localizado por `mwpanel_student_id`
  (datos, dirección, tutores, consentimientos, matrícula activa/historial) y las
  **notas médicas descifradas** con `SECRETARIA_CRYPTO_KEY` (la clave nunca sale
  de Secretaría). Solo lectura; 404 si no hay ficha.
- **Consumidor:** backend de MW Panel `GET /api/students/:id/secretaria-ficha`
  (admin) → panel solo-lectura en el detalle del alumno.
