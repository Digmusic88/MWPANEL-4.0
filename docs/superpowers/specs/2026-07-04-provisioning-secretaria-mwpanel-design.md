# Feature 1c — Aprovisionamiento Secretaría → MW Panel (cuentas de acceso)

> **Estado**: diseño aprobado (brainstorming). Siguiente: writing-plans.
> **Fecha**: 2026-07-04
> **Contexto**: 3ª pieza de la iniciativa de inscripciones. 1a (importador PDF) y 1b (backfill MW Panel→Secretaría) desplegadas. 1c es la dirección INVERSA de 1b.

## Objetivo

Desde la ficha de un alumno en Secretaría, crear **manualmente** las cuentas de acceso en MW Panel (login del alumno + cuentas de los padres) reutilizando el onboarding existente de MW Panel. **Sin enviar emails**: las cuentas se crean (típicamente en verano) y las credenciales se comunican después, a mano, con el flujo de reenvío que MW Panel ya tiene, cerca del inicio de curso.

## Principios rectores

1. **Reutilizar MW Panel, no replicar**: llamar al endpoint `POST /api/enrollment` de MW Panel (que crea alumno+familia+cuentas y deduplica familia por email del padre), en vez de escribir `public.*` por SQL. MW Panel valida y es dueño de sus escrituras → respeta el contrato SP-7.
2. **Manual, por alumno**: se dispara con un botón en la ficha; nunca automático.
3. **Sin emails**: 1c no envía ningún correo. Los emails de credenciales los dispara el admin después, con `resend-credentials` de MW Panel.
4. **Idempotente**: un alumno que ya tiene `mwpanel_student_id` no se re-aprovisiona; la familia se deduplica por email del padre en MW Panel; el email sintético del alumno se reintenta con sufijo si colisiona.
5. **Solo lectura de MW Panel salvo el propio endpoint**: Secretaría no toca `public.*` por SQL; solo lee su propio `secretaria.*` y escribe el enlace de vuelta (`mwpanel_student_id`).

## Hallazgos de exploración (verificados contra prod)

- **Auth entre servicios trivial**: Secretaría y MW Panel comparten el mismo `JWT_SECRET` (sha `67fd02f9`). Secretaría firma un JWT admin de MW Panel y llama a su API.
- **Reachability confirmada**: desde el contenedor `mw-secretaria-api`, `http://mw-panel-backend-prod:3000/api/health/status` responde `{"status":"OK"}`. La API de MW Panel tiene prefijo global `api`. Se usa el **nombre de contenedor** (no IP, que es dinámica): `http://mw-panel-backend-prod:3000/api/enrollment`.
- **`POST /api/enrollment`** (`@Roles(ADMIN)`, `processEnrollment`): crea student-user (role STUDENT)+user_profile+student record, familia y contactos de padres; **deduplica familia por email del padre** (`findExistingFamilyByParentEmail` → engancha hermano); da **409** si el email del alumno ya existe. **No envía emails**. Devuelve `{ student: {id, enrollmentNumber, user:{id,email}}, family: {id, primaryContact, secondaryContact} }`.
- **`CreateEnrollmentDto`** (campos que importan):
  - `student`: `firstName`(req), `lastName`(req), `email`(req, `@IsEmail`), `password`(req, min6), `birthDate?`, `enrollmentNumber`(req), **`educationalLevelId`(req)**, `courseId?`, `classGroupIds?`.
  - `family.primaryContact` (`FamilyContactDto`): `firstName`(req), `lastName?`, `email`(req, `@IsEmail`), `password`(req, min6), `phone`(req), `documentNumber?`, `address?`.
  - `family.secondaryContact?` (`SecondaryFamilyContactDto`): todo opcional.
- **Niveles educativos** (UUIDs fijos): Infantil `11111111-1111-1111-1111-111111111111`, Primaria `22222222-2222-2222-2222-222222222222`, Secundaria `33333333-3333-3333-3333-333333333333`.
- **Emails de alumno son sintéticos**: en MW Panel el dominio dominante es `@mw.com` (login handle, no buzón real). 1c genera un login sintético.

## Arquitectura

Módulo nuevo en Secretaría: `backend/src/modules/provisioning/`.

```
provisioning/
├── provisioning.module.ts        # imports StaffRole + JwtModule (patrón inscription/backfill)
├── provisioning.controller.ts    # POST /secretaria/provisioning/:studentId ; GET /levels
├── provisioning.service.ts       # orquesta: leer alumno+tutores → map → firmar JWT → POST enrollment → guardar enlace
├── enrollment-map.ts             # función PURA: (alumno, tutores, opts) → { dto, blockers[] }
└── mwpanel-client.ts             # firma JWT admin MW Panel + POST http://mw-panel-backend-prod:3000/api/enrollment
```

Frontend: botón **"Crear cuenta de acceso en MW Panel"** en la ficha del alumno (`InscripcionDrawer.tsx` / ficha), con un modal que pide el **nivel educativo** y confirma.

### Autenticación a MW Panel (`mwpanel-client.ts`)

Firmar un JWT corto (`expiresIn: '5m'`) con `process.env.JWT_SECRET` y payload `{ sub: <id de un admin de MW Panel> }`. El id de admin se obtiene una vez leyendo la BD compartida: `SELECT id FROM public.users WHERE role='admin' AND "isActive"=true LIMIT 1` (Secretaría ya comparte la BD; esto es lectura, no escritura). Se cachea en memoria. La llamada usa `Authorization: Bearer <token>`.

## Mapeo de datos (`enrollment-map.ts`, puro y testeable)

`buildEnrollmentDto(student, guardians, opts): { dto: CreateEnrollmentDto | null; blockers: string[] }`

Tipos de entrada:
- `student`: `{ firstName, lastName, birthDate: string|null }`
- `guardians`: `{ fullName, email: string|null, phone: string|null, isPrimary: boolean }[]`
- `opts`: `{ educationalLevelId: string; emailSuffix?: number }`

**Precondiciones (si alguna falla → `dto=null` y se listan en `blockers`, el botón las muestra y no crea nada):**
- `student.birthDate` presente (`"Falta la fecha de nacimiento del alumno"`).
- Al menos un tutor con email válido (`"Ningún tutor tiene email; añádelo antes de crear la cuenta"`).
- `opts.educationalLevelId` presente (`"Elige el nivel educativo"`).

**Construcción del DTO:**
- `student.firstName/lastName` ← del alumno; `student.birthDate` ← `birth_date` (`YYYY-MM-DD`).
- `student.email` ← **sintético**: `slug(firstName).slug(lastName)@mw.com`, donde `slug` = NFD sin diacríticos, minúsculas, solo `[a-z0-9]`. Si `opts.emailSuffix` viene (reintento por 409), se inserta antes de la `@`: `nombre.apellido2@mw.com`.
- `student.enrollmentNumber` ← generado por el service (ver abajo), pasado en `opts` — **no** en la función pura (para mantenerla determinista se recibe en `opts.enrollmentNumber`).
- `student.password` ← aleatorio, pasado en `opts.studentPassword`.
- `student.educationalLevelId` ← `opts.educationalLevelId`. `courseId`/`classGroupIds` se omiten.
- **Tutor primario** = el `isPrimary` (o el primero con email si ninguno marca primario) → `primaryContact`: `firstName/lastName` partiendo `fullName` (primer token = firstName, resto = lastName), `email`, `phone` (fallback `'000000000'` si vacío, porque MW Panel lo exige `req`), `password` aleatorio (`opts.primaryPassword`).
- **Tutor secundario** = otro tutor con email, si existe → `secondaryContact` (mismos campos, `opts.secondaryPassword`).

Los valores no deterministas (passwords aleatorias, enrollmentNumber) se **inyectan por `opts`** para que `enrollment-map.ts` sea puro y testeable; el service los genera.

## Servicio (`provisioning.service.ts`)

`provision(studentId: string, educationalLevelId: string): Promise<ProvisionResult>`

1. Leer el alumno de `secretaria.students` (`first_name, last_name, birth_date, mwpanel_student_id, family_id`) y sus tutores de `secretaria.guardians`.
2. **Idempotencia**: si `mwpanel_student_id` ya está → devolver `{ status: 'already', mwpanelStudentId }` sin llamar a MW Panel.
3. Generar: `enrollmentNumber` (`MW-${new Date().getFullYear()}-${base36 aleatorio}`), passwords aleatorias (≥8, alfanuméricas sin símbolos, según convención del proyecto).
4. `buildEnrollmentDto(...)`. Si `blockers.length` → devolver `{ status: 'blocked', blockers }` (400).
5. Firmar JWT admin y `POST /api/enrollment`. Manejo de respuesta:
   - **201** → capturar `student.id` y `family.id`; `UPDATE secretaria.students SET mwpanel_student_id=$student.id WHERE id=$studentId`; si la familia de Secretaría no tenía `mwpanel_family_id`, fijarlo. Devolver `{ status: 'created', mwpanelStudentId, mwpanelFamilyId, studentLoginEmail }`.
   - **409 con email de alumno duplicado** → reintentar con `emailSuffix` incremental (hasta 5 intentos). Si sigue → `{ status: 'error', message }`.
   - **409 de email de padre / otros** → MW Panel ya deduplica la familia; si aun así devuelve 409, propagar el mensaje como `{ status: 'error', message }` (el admin decide).
   - **otros errores/red** → `{ status: 'error', message }` (nada se guarda; MW Panel hace su propio rollback transaccional).

`ProvisionResult` = `{ status: 'created'|'already'|'blocked'|'error'; mwpanelStudentId?: string; mwpanelFamilyId?: string; studentLoginEmail?: string; blockers?: string[]; message?: string }`.

## API (controller)

`@Controller('secretaria/provisioning')` `@UseGuards(SecretariaAuthGuard)`:
- `GET /levels` `@Roles('secretaria_admin','direccion')` → los 3 niveles (id+name, constantes) para el selector del modal.
- `POST /:studentId` `@Roles('secretaria_admin','direccion')` body `{ educationalLevelId: string }` → `provision(studentId, educationalLevelId)`.

## Frontend

En la ficha del alumno, botón **"Crear cuenta de acceso en MW Panel"**:
- Si el alumno ya tiene `mwpanel_student_id` → mostrar chip *"Cuenta MW Panel creada"* y deshabilitar el botón.
- Al pulsar → modal con `Select` de nivel educativo (de `GET /levels`) + aviso *"No se envían emails; las credenciales se mandan luego."* + `Popconfirm`.
- Confirmar → `POST /provisioning/:studentId`. Según `status`:
  - `created` → `message.success('Cuenta creada. Login del alumno: <email>. Sin email enviado.')` + refrescar ficha (chip).
  - `already` → `message.info('El alumno ya tenía cuenta en MW Panel')`.
  - `blocked` → `message.warning` listando `blockers` (falta fecha / falta email de tutor).
  - `error` → `message.error(message)`.

## Errores y casos límite

- Alumno sin fecha de nacimiento o sin tutor con email → `blocked` con lista; no se llama a MW Panel.
- Email sintético colisiona → reintento con sufijo (hasta 5).
- Hermano de una familia ya creada → MW Panel engancha a la familia existente (no duplica padres); Secretaría guarda el `mwpanel_student_id` del nuevo alumno.
- MW Panel caído / 5xx → `error`, nada se guarda en Secretaría.
- Tutor sin teléfono → se envía `'000000000'` (MW Panel exige `phone`); alternativamente se podría bloquear, pero se prefiere no bloquear por un teléfono.

## Contrato SP-7

1c **no escribe `public.*` por SQL**; usa la API de MW Panel. La única escritura directa de Secretaría es a su propio `secretaria.students.mwpanel_student_id`. Se añadirá a `CONTRATO_MWPANEL.md` una nota de la **nueva llamada saliente** Secretaría→MW Panel (`POST /api/enrollment` con JWT admin firmado con el secreto compartido), documentando el acoplamiento.

## Testing

- `enrollment-map.ts` (puro, Jest): generación de email sintético (slug con tildes/espacios), inyección de sufijo; blockers (sin fecha / sin email de tutor / sin nivel); partición de `fullName` en first/last; mapeo primario/secundario; fallback de teléfono.
- `mwpanel-client.ts`: firma de JWT (estructura del payload) — el POST se prueba en E2E, no en unit.
- E2E (GATED, tras revisión, datos reales redactados): aprovisionar un alumno de Secretaría de prueba (p.ej. el creado en 1a) → verificar en `public.*` (redactado) que existe user(role student)+student+family+contactos, que `secretaria.students.mwpanel_student_id` quedó fijado, y que **no se envió ningún email** (revisar que no se tocó el flujo de correo). Idempotencia: repetir → `already`. Confirmar con Diego antes del alta real.

## Fuera de alcance (explícito)

- No envía emails de bienvenida/credenciales (flujo manual posterior de MW Panel).
- No asigna curso/grupo/clase en MW Panel (solo nivel educativo, requerido); la asignación fina se hace en MW Panel.
- No sincroniza cambios posteriores (no es un sync continuo; es un alta puntual manual).
- No borra ni desactiva cuentas.
