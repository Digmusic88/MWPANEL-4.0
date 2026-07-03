# Feature 1b — Backfill MW Panel → Secretaría (reconciliación de fichas)

> **Estado**: diseño aprobado (brainstorming). Siguiente paso: writing-plans.
> **Fecha**: 2026-07-04
> **Contexto**: 2ª de 3 piezas de la iniciativa de inscripciones. Feature 1a (importador PDF en Secretaría) ya desplegada. Sigue Feature 2 (visualización en MW Panel).

## Objetivo

Traer a Secretaría los alumnos y familias que **ya existen en MW Panel** pero aún no están en Secretaría (o están sin vincular), rellenando **solo los datos ausentes**. Los datos de Secretaría **siempre prevalecen** (son más actuales). Los registros que queden incompletos se marcan como "pendiente de completar" con la lista de qué falta. Se puebla el enlace `mwpanel_student_id`.

## Principios rectores

1. **Secretaría prevalece**: nunca se sobrescribe un valor existente de Secretaría. Solo se rellena un campo si está `NULL`/vacío y MW Panel tiene dato.
2. **Solo lectura de MW Panel**: el backfill **lee** de `public.*` y **escribe** solo a `secretaria.*`. No modifica ninguna tabla de MW Panel → respeta el contrato SP-7 (consume la superficie, no la altera).
3. **Nada se escribe sin revisión**: flujo dry-run (`preview`) → revisión admin → aplicación (`apply`), igual que Feature 1a.
4. **Excluir inactivos**: los alumnos cuyo usuario MW Panel esté inactivo (`public.users.isActive = false`) **no se procesan** (14 de 73 hoy).
5. **Idempotente**: un alumno de Secretaría ya vinculado (`mwpanel_student_id IS NOT NULL`) se excluye del análisis. Re-ejecutar es seguro.

## Arquitectura

Módulo nuevo en Secretaría, espejo de `inscription/`:

```
backend/src/modules/backfill/
├── backfill.module.ts          # imports StaffRole + JwtModule (como inscription)
├── backfill.controller.ts      # POST /preview (dry-run), POST /apply
├── backfill.service.ts         # orquestación: read MW Panel → clasificar → (apply) escribir
├── mwpanel-source.ts           # SQL de lectura de public.* → tipos MwStudent, MwGuardian
├── backfill-match.ts           # función PURA: clasificar (fiable/dudosa/nueva) + normalización
└── backfill-plan.ts            # función PURA: dado (mw, secretaría match), calcular qué escribir + campos pendientes
```

Frontend: componente `BackfillMwPanel` en `App.tsx`, pestaña admin dentro de `Configuración` (mismo gating `isAdmin` que "Importar inscripción PDF" / "Importar Excel").

### Origen de cada dato (lectura de MW Panel)

**Alumno** (`mwpanel-source.ts`, un SELECT con JOINs; filtra `u.isActive = true`):
- `public.students`: `id` (→ mwpanel_student_id), `birthDate`, `enrollmentNumber`, `photoUrl`.
- `public.user_profiles` (por `userId`): `firstName`, `lastName`, `address`, `dni`.
- `public.users` (por `userId`): `email`.
- *Nota de realidad de datos*: `address` casi siempre vacío (1/73), `user_profiles.medicalInfo`/`guardianName`/`guardianPhone` **vacíos** (0/73) → no son fuente. `birthDate`/`firstName`/`lastName`/`email` completos.

**Tutores** (los `guardian*` del perfil están vacíos; la fuente real es el módulo de familias):
- `public.family_students` (por `studentId`) → `familyId`, `relationship`.
- `public.families` → `primaryContactId`, `secondaryContactId` (ambos son `users` de rol familia).
- Cada contacto → `user_profiles`(`firstName`, `lastName`, `phone`) + `users`(`email`).
- `primaryContact` → `isPrimary = true`; `secondaryContact` → `isPrimary = false`.
- Relación: se deriva de `family_students.relationship` (fallback `'tutor'`).
- *Realidad*: 83 contactos, **todos** con nombre + teléfono + email.

## Motor de emparejamiento (`backfill-match.ts`, puro y testeable)

**Normalización de nombre** (en **JS**, dentro de la función pura — no depende de la extensión `unaccent`, que no está instalada): `s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ')` sobre `first_name + ' ' + last_name`. El SELECT trae los nombres crudos; la normalización y comparación viven en `backfill-match.ts`. Se compara contra el mismo cálculo sobre los alumnos de Secretaría **no vinculados** (`mwpanel_student_id IS NULL`).

**Clasificación** de cada alumno MW Panel activo:

| Categoría | Condición | Acción propuesta |
|---|---|---|
| 🟢 Fiable | Exactamente **1** alumno de Secretaría (no vinculado) con ese nombre normalizado | `link`: fijar `mwpanel_student_id` + rellenar huecos. Si la fecha de nacimiento difiere del match → se propone igual con aviso `⚠ fecha difiere`. |
| 🟡 Dudosa | **≥2** alumnos de Secretaría con ese nombre (homónimos) | Sin acción automática. La UI lista los candidatos; el admin elige `link a #X` / `create` / `skip`. |
| 🔵 Nueva | **0** coincidencias de nombre | `create`: crear alumno + familia + tutores + marcar pendiente. |

**Salvaguarda**: exigir match único para auto-vincular evita casar homónimos por error (la contrapartida de "solo nombre = fiable"). La fecha no bloquea el match pero se muestra como señal.

## Reglas de escritura (`backfill-plan.ts` + `apply`)

Todo dentro de una transacción **por fila** (una fila que falla revierte solo lo suyo; el lote continúa y reporta OK/error por fila).

### Alumno
- **Solo-si-vacío en Secretaría**: `birth_date`, `address`. `enrollmentNumber` de MW Panel → se anexa a `notes` si aporta (no sobrescribe notes existentes; se concatena).
- **Siempre**: `mwpanel_student_id = <id MW Panel>` (es el enlace, no un dato de ficha).
- **No se tocan**: consentimientos (`photo_consent`/`exit_consent` se quedan como estén; en 🔵 nuevos quedan `false` por defecto, se fijan a mano como en 1a) ni `medical_notes_encrypted` (sin fuente en MW Panel).
- **Sin matrícula automática**: 1b reconcilia la **ficha**, no crea `enrollments` (la matrícula es competencia de 1a / gestión).
- 🔵 nuevo: `INSERT` con `first_name`, `last_name`, `birth_date`, `address` (si hay), `is_active = true`, `mwpanel_student_id`.

### Familia y tutores (alcance "alumno + tutor básico")
- 🔵 nuevo → crear `family` (`display_name` = apellidos del alumno) + insertar tutores desde primary/secondary contact (`full_name`, `phone`, `email`, `relationship`, `is_primary_contact`). Fijar `families.mwpanel_family_id = <familyId MW Panel>`.
- 🟢 vinculado → la familia ya existe en Secretaría. Para cada tutor de MW Panel:
  - Emparejar por **nombre normalizado** contra los tutores de esa familia.
  - Casa → rellenar solo huecos (`phone`, `email` vacíos).
  - No casa **y la familia ya tiene tutores** → **NO añadir** (un padre ya registrado con otra grafía *sí está* → no es dato ausente). *(Decisión de producto en el E2E 2026-07-04: las familias de Escuela Alternativa ya tienen tutores; añadirlos duplicaría padres.)*
  - Familia **sin ningún tutor** (o alumno 🔵 nuevo) → insertar el juego completo de tutores de MW Panel.

### Marcado pendiente
Dos columnas nuevas en `secretaria.students` (terreno propio, no afecta SP-7):
- `import_pending boolean NOT NULL DEFAULT false`
- `import_pending_fields text` (nullable) — lista legible separada por `; `.

**Qué cuenta como pendiente** (campos que una ficha completa necesita y quedan vacíos tras el backfill):
- `birth_date` ausente → `"sin fecha de nacimiento"`.
- `address` ausente → `"sin dirección"`.
- Ningún tutor de la familia con teléfono → `"tutor sin teléfono"`.
- Tutor añadido no emparejado → `"tutor añadido, verificar"`.

`medical` y consentimientos **no** marcan pendiente (opcionales / gestión aparte). Si `import_pending_fields` queda vacío → `import_pending = false`.

### DDL (SQL idempotente, aplicar antes de reconstruir el backend — patrón CLAUDE.md)
```sql
ALTER TABLE secretaria.students ADD COLUMN IF NOT EXISTS import_pending boolean NOT NULL DEFAULT false;
ALTER TABLE secretaria.students ADD COLUMN IF NOT EXISTS import_pending_fields text;
```

## API

- `POST /api/secretaria/backfill/preview` — `@Roles('secretaria_admin','direccion')`. Sin body. Devuelve `{ reliable: PlanRow[], dubious: DubiousRow[], new: PlanRow[], counts }`. **No escribe.**
- `POST /api/secretaria/backfill/apply` — `@Roles('secretaria_admin','direccion')`. Body `{ decisions: Decision[] }` donde `Decision = { mwStudentId: string, action: 'link'|'create'|'skip', targetSecretariaId?: string }`. Aplica cada decisión en su transacción; devuelve `{ linked, created, pending, errors: {mwStudentId, message}[] }`.

**Tipos** (definidos en el plan):
- `PlanRow`: alumno MW Panel + acción propuesta + `wouldFill: string[]` + `wouldRespect: string[]` + `pendingAfter: string[]` + (para fiable) `targetSecretariaId` + `birthDateMismatch: boolean`.
- `DubiousRow`: alumno MW Panel + `candidates: {secretariaId, nameMatch, birthDateMatch}[]`.

## Pantalla de revisión (frontend)

Pestaña admin en Configuración. Flujo preview → revisar → aplicar:
- Botón "Analizar MW Panel" → `preview`. Agrupa en 🟢 Fiables / 🟡 Dudosas / 🔵 Nuevas con contadores.
- 🟢 y 🔵: acción masiva ("aplicar todas") + desmarcado individual. Fila con `⚠ fecha difiere` visible.
- 🟡: radios por fila (`vincular a #A` / `#B` / `crear nuevo` / `saltar`); sin decisión = no se toca.
- `[ver]` por fila: detalle campo a campo (qué se rellena / qué se respeta de Secretaría / qué queda pendiente). Es admin → se pueden mostrar valores.
- Aplicar → `apply` con las decisiones marcadas. Resumen final ("X vinculados, Y creados, Z pendientes"). Errores por fila se listan.

## Errores y casos límite

- Alumno MW Panel inactivo → excluido en el SELECT (no aparece).
- Alumno Secretaría ya vinculado → excluido del pool de matching (idempotencia).
- Alumno MW Panel sin familia (`family_students` vacío) → 🔵 nuevo se crea sin tutores + pendiente `"sin tutores"`.
- Fila que falla en `apply` → revierte su transacción, se reporta en `errors[]`, el resto continúa.
- Re-ejecutar `preview` tras un `apply` parcial → los ya vinculados desaparecen; solo quedan los no resueltos.
- Colisión de nombre dentro de la propia lista MW Panel (dos activos homónimos) → ambos caen a dudosa (no se auto-vinculan).

## Testing

- `backfill-match.ts` (puro): normalización con tildes/mayúsculas/espacios; 1 match → fiable; 2 → dudosa; 0 → nueva; exclusión de ya-vinculados; homónimos MW Panel → dudosa.
- `backfill-plan.ts` (puro): solo-si-vacío (respeta valor existente de Secretaría); cálculo de `import_pending_fields` para cada combinación (sin fecha / sin dirección / tutor sin teléfono / tutor añadido); pendiente vacío → `import_pending=false`.
- Emparejamiento de tutores por nombre normalizado dentro de la familia.
- E2E (GATED, tras revisión): deploy Secretaría + `preview` real (redactado, sin PII) validando los contadores (esperado ~59 activos repartidos en las 3 categorías) y luego `apply` sobre un subconjunto pequeño real, verificando en BD (redactado) el enlace + solo-si-vacío + pendiente. Confirmar con Diego antes del apply masivo.

## Fuera de alcance (explícito)

- No trae identidad compartida (email de alumno / `mock_user_id` / vinculación de cuenta) → eso entraría de lleno en el contrato SP-7 (Feature futura si se pide).
- No crea matrículas (`enrollments`).
- No sincroniza de forma continua: es una reconciliación bajo demanda (repetible, no automática).
- No modifica datos de MW Panel en ningún caso.
