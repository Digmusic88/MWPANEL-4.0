# Número de cuenta compartido entre hermanos + override informativo por hijo (Secretaría)

> **Fecha**: 2026-06-22 · **Estado**: Diseño aprobado · **Ámbito**: `/opt/mw-secretaria`

## Objetivo
Que el **número de cuenta (IBAN)** de domiciliación aparezca en la ficha de **todos los hermanos** de una familia aunque se haya introducido en una sola, y permitir una **cuenta propia por hijo** (override) que se guarde solo en ese alumno, para un pago/transferencia especial. El override es **informativo**: la remesa SEPA sigue cobrando a la cuenta de la familia.

## Contexto (estado actual)
- `secretaria.bank_accounts` guarda la cuenta **a nivel de FAMILIA** (`family_id`, sin `student_id`). Campos: `iban_encrypted` (pgcrypto), `iban_last4`, `holder_name`, `sepa_mandate_ref`, `sepa_mandate_date`, `is_active`, `created_at`.
- El IBAN ya se **comparte entre los hijos de la MISMA familia** (la ficha de familia tiene una sola domiciliación). El problema real es que el importador creó **una familia por alumno** y muchos hermanos quedaron en familias separadas (p. ej. Camila y Paula Villanueva). Vincularlos en una familia ya es posible con el botón **"Vincular"** (`POST /families/:id/attach-student`) — sin código nuevo.
- La **remesa SEPA factura por familia**: `sepa.controller.ts` agrupa `GROUP BY st.family_id` y selecciona la cuenta con `bk.family_id=st.family_id AND bk.is_active AND bk.sepa_mandate_ref IS NOT NULL`. Genera **un adeudo por familia** a una sola cuenta.
- La ficha del alumno (`FichaAlumno`, frontend `App.tsx`) se nutre de `GET /students/:id` y `GET /students/:id/full` (devuelven `student`, `guardians`, `enrollments`, etc. y `student.familyId`). Hoy **no** muestra domiciliación.
- Cifrado: `addBankAccount` usa `pgp_sym_encrypt($iban, SECRETARIA_CRYPTO_KEY)`; la clave está en `CRYPTO_KEY` del módulo. Validación con `normalizeIban` / `isValidIban`.

## Decisiones (aprobadas)
1. **Hermanos en una sola familia** (vía "Vincular" existente) → el IBAN familiar se comparte automáticamente. Sin código nuevo para el compartir.
2. **Override por hijo = solo informativo** (no parte la remesa SEPA). La remesa sigue cobrando a la cuenta de la familia.
3. **Edición/visualización en la ficha del alumno** (`FichaAlumno`).

## 1. Modelo de datos
Migración `034_bank_account_student_override.sql`:

- Añadir columna `student_id uuid NULL REFERENCES secretaria.students(id) ON DELETE CASCADE` a `secretaria.bank_accounts`.
- Semántica:
  - `student_id IS NULL` → **cuenta de la familia** (comportamiento actual; la usa la remesa SEPA).
  - `student_id = X` → **override informativo** de ese alumno (la remesa la ignora).
- Índices parciales (sobre filas activas):
  - `CREATE UNIQUE INDEX uq_bank_family_active ON secretaria.bank_accounts(family_id) WHERE student_id IS NULL AND is_active;` — como mucho una cuenta de familia activa.
  - `CREATE UNIQUE INDEX uq_bank_student_active ON secretaria.bank_accounts(student_id) WHERE student_id IS NOT NULL AND is_active;` — como mucho una override activa por alumno.
- **Blindaje SEPA**: en `sepa.controller.ts`, la subconsulta de selección de cuenta (línea ~141-142) añade `AND bk.student_id IS NULL`, para que un override nunca se domicilie.

> Nota: las cuentas existentes tienen `student_id` NULL → siguen siendo cuentas de familia. El índice `uq_bank_family_active` asume que hoy no hay >1 cuenta de familia activa por familia; si la migración fallara por duplicados preexistentes, se desactivan los duplicados más antiguos (`is_active=false`) conservando el más reciente antes de crear el índice. La migración incluye ese saneo previo.

## 2. Backend
Nuevos endpoints (en `students.controller.ts`, roles `secretaria_admin`, `secretaria_staff`; el GET también `direccion`). Reutilizan `CRYPTO_KEY`, `normalizeIban`, `isValidIban` (importar/compartir desde el módulo sepa o duplicar el helper local si no es exportable).

### `GET /students/:id/bank`
Devuelve:
```json
{
  "familyAccount": { "id": "...", "ibanLast4": "1234", "holderName": "...", "mandateRef": "..." } ,
  "override":      { "id": "...", "ibanLast4": "5678", "holderName": "..." }
}
```
- `familyAccount`: cuenta activa de la familia del alumno (`family_id = student.family_id AND student_id IS NULL AND is_active`), o `null`.
- `override`: cuenta activa del alumno (`student_id = :id AND is_active`), o `null`.

### `POST /students/:id/bank`  body `{ iban, holderName?, scope }`
- Valida `scope ∈ {'familia','alumno'}` y el IBAN (`isValidIban(normalizeIban(iban))`), si no → `BadRequestException`.
- Resuelve `familyId` del alumno; si el alumno no existe → `NotFoundException`.
- `scope === 'familia'`:
  - `UPDATE secretaria.bank_accounts SET is_active=false WHERE family_id=$familyId AND student_id IS NULL AND is_active;`
  - `INSERT ... (family_id, student_id=NULL, iban_encrypted, iban_last4, holder_name, sepa_mandate_ref, sepa_mandate_date, is_active=true)` con generación de mandato por defecto **idéntica** a `addBankAccount` (`COALESCE($mandateRef,'MAND-'||substr(...)||'-'||to_char(now(),'YYYYMMDD'))`, `sepa_mandate_date = now()::date`).
- `scope === 'alumno'`:
  - `UPDATE secretaria.bank_accounts SET is_active=false WHERE student_id=$id AND is_active;`
  - `INSERT ... (family_id=$familyId, student_id=$id, iban_encrypted, iban_last4, holder_name, sepa_mandate_ref=NULL, sepa_mandate_date=NULL, is_active=true)`.
- Devuelve `{ ok: true, ibanLast4, scope }`.

### `DELETE /students/:id/bank-override`
- `UPDATE secretaria.bank_accounts SET is_active=false WHERE student_id=$id AND is_active;`
- Devuelve `{ ok: true }`.

### Tiempo real
`bank_accounts` ya está en el feed (topic `sepa`, ver `realtime.topics.ts`). Los cambios disparan NOTIFY igual que hoy; la ficha puede refrescar con `useLiveQuery(['sepa', ...])` si procede, o recargar tras cada acción (como hace el resto de la ficha). No requiere cambios en el mapa de topics.

## 3. Frontend — sección "Domiciliación" en `FichaAlumno`
Nueva sección dentro de `FichaAlumno` (frontend `src/App.tsx`, componente que arranca en `function FichaAlumno`). Al abrir la ficha, `GET /students/:id/bank`.

Contenido:
- **Estado**:
  - "Cuenta de la familia: `····1234` — compartida con los hermanos" (si `familyAccount`), o "Sin cuenta de familia registrada".
  - Si `override`: bloque destacado "Cuenta propia de este alumno: `····5678` (pago especial)".
- **Formulario** (AntD Form): `Input` IBAN (`autoComplete="off"`, placeholder `ES## …`), `Input` titular (opcional), `Checkbox` **"Solo para este alumno (pago especial)"**.
  - Al enviar: `POST /students/:id/bank` con `scope = checkbox ? 'alumno' : 'familia'`.
  - Sin marcar → cuenta de la familia (se verá en las fichas de los hermanos de la misma familia).
  - Marcada → override del alumno.
  - Tras guardar: `message.success`, `resetFields`, recargar `GET /students/:id/bank`.
- **Botón "Volver a usar la cuenta de la familia"** visible solo si hay `override` → `DELETE /students/:id/bank-override` → recarga.
- **Nota** (Alert/`Text type="secondary"`): "La remesa SEPA cobra a la cuenta de la familia. La cuenta propia es informativa, para un pago o transferencia especial de este alumno."
- Reutilizar el helper de máscara `····{ibanLast4}` ya usado en la modal de Familias.

## Criterios de aceptación
- En la ficha de un alumno, introducir un IBAN **sin** marcar la casilla → se guarda como cuenta de la familia; al abrir la ficha de **otro hijo de la MISMA familia** aparece el mismo `····last4`.
- Introducir un IBAN **con** la casilla marcada → se guarda como override; aparece destacado en **esa** ficha y **no** cambia la cuenta del hermano.
- "Volver a usar la cuenta de la familia" elimina el override y la ficha vuelve a mostrar la cuenta familiar.
- Generar una remesa SEPA tras crear un override → el adeudo de la familia **no** cambia (sigue usando la cuenta de la familia; el override se ignora por `student_id IS NULL`).
- Hermanos en **familias separadas**: tras pulsar "Vincular" para unirlos en una familia, ambas fichas muestran la misma cuenta de familia (verificación con el caso Villanueva, **sin** alterar datos reales sin permiso — usar datos de prueba y limpiarlos).
- IBAN inválido → error de validación; el formulario no guarda.
- El IBAN se guarda **cifrado** (`pgp_sym_encrypt`); solo se exponen `iban_last4` y `holder_name`.

## Fases
1. **Migración + blindaje SEPA**: columna `student_id`, índices parciales, saneo previo de duplicados, `AND bk.student_id IS NULL` en la selección de remesa.
2. **Backend**: `GET /students/:id/bank`, `POST /students/:id/bank`, `DELETE /students/:id/bank-override` (cifrado y validación reutilizados).
3. **Frontend**: sección "Domiciliación" en `FichaAlumno` (estado + formulario + casilla + volver-a-familia + nota).

## Despliegue
Según memoria de Secretaría: frontend a `/opt/mw-secretaria/frontend-dist` + rebuild imagen `mw-secretaria-api` y recrear contenedor; **commit + push** al repo propio de Secretaría (`Digmusic88/MWPANEL-4.0`) en cada cambio. Migración: aplicar el `.sql` en la BD compartida (`mw-panel-db-prod`, schema `secretaria`).
