# Cuenta compartida entre hermanos + override por hijo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el número de cuenta (IBAN) de domiciliación aparezca en la ficha de todos los hermanos de una familia (compartido), con una cuenta propia opcional por hijo (override informativo) editable desde la ficha del alumno.

**Architecture:** `bank_accounts` gana una columna `student_id` nullable: `NULL` = cuenta de la familia (compartida + usada por la remesa SEPA), con valor = override informativo de ese alumno (la remesa lo ignora). Tres endpoints REST en `students.controller.ts` leen/guardan/borran esas cuentas reutilizando el cifrado pgcrypto existente, y `FichaAlumno` (frontend) gana una sección "Domiciliación".

**Tech Stack:** NestJS 10 + TypeORM (`ds.query` SQL crudo), PostgreSQL (schema `secretaria`, pgcrypto), React 18 + AntD v5, axios (`baseURL=/api/secretaria`).

## Global Constraints

- **Producción**: sistema en producción; solo el alcance de este plan. Datos reales no se alteran sin permiso — toda verificación usa datos de prueba que se limpian al final.
- **Cifrado**: el IBAN se guarda SIEMPRE cifrado con `pgp_sym_encrypt($iban, SECRETARIA_CRYPTO_KEY)`; al exterior solo se exponen `iban_last4` y `holder_name`. Clave en `process.env.SECRETARIA_CRYPTO_KEY`.
- **Validación IBAN**: `normalizeIban` (quita espacios, mayúsculas) + `isValidIban` antes de guardar; IBAN inválido → `BadRequestException`.
- **Semántica student_id**: `student_id IS NULL` = cuenta de familia (la remesa SEPA SOLO usa estas); `student_id` con valor = override informativo (la remesa lo ignora).
- **Roles**: endpoints de escritura `secretaria_admin`, `secretaria_staff`; el GET además `direccion`. Guard: `SecretariaAuthGuard` + `@Roles(...)`.
- **Rutas**: el controlador es `@Controller('secretaria/students')`; el frontend (`baseURL=/api/secretaria`) los llama como `/students/:id/bank`.
- **Repo/commits**: git con `GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria`. Commit + push a `github-secretaria` (Digmusic88/MWPANEL-4.0) en cada cambio. Mensajes de commit terminan en `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **DB de verificación**: contenedor `mw-panel-db-prod`, `psql -U mwpanel -d mwpanel`, schema `secretaria`.

### Helper de verificación: firmar un JWT de admin (usado en Tasks 2 y 3)

El guard verifica `jwt.verify(token, { secret: process.env.JWT_SECRET })` y exige que `payload.sub` sea un `user_id` con fila en `secretaria.staff_roles`. Para obtener un token de prueba:

```bash
# Devuelve un Bearer token de un admin real de Secretaría. Ejecuta dentro del contenedor backend (tiene JWT_SECRET en /app/.env y jsonwebtoken instalado).
ADMIN_UID=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c \
  "SELECT user_id FROM secretaria.staff_roles WHERE role='secretaria_admin' LIMIT 1")
TOKEN=$(docker exec mw-panel-backend-prod node -e "
  require('dotenv').config({path:'/app/.env'});
  const jwt=require('jsonwebtoken');
  console.log(jwt.sign({sub:'$ADMIN_UID',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));
")
echo "$TOKEN" | head -c 20   # sanity: imprime el inicio del JWT
```

> Nota: el contenedor del backend de Secretaría es `mw-panel-backend-prod`? NO — Secretaría corre en `mw-secretaria-api` (puerto 127.0.0.1:3010). Usa ese contenedor para firmar y para curl. Confirma el nombre real con `docker ps --format '{{.Names}}' | grep -i secret` antes de empezar; el plan asume `mw-secretaria-api`.

---

## Task 1: Migración 034 — columna `student_id` + saneo + índices parciales

**Files:**
- Create: `migrations/034_bank_account_student_override.sql`

**Interfaces:**
- Produces: columna `secretaria.bank_accounts.student_id uuid NULL` (FK a `students`, `ON DELETE CASCADE`); índices parciales `uq_bank_family_active` y `uq_bank_student_active`. Consumido por Tasks 2 y 3.

- [ ] **Step 1: Escribir la migración**

Crear `migrations/034_bank_account_student_override.sql`:

```sql
-- migrations/034_bank_account_student_override.sql
-- Añade override de cuenta por alumno: bank_accounts.student_id
--   NULL      -> cuenta de la familia (la usa la remesa SEPA)
--   con valor -> override informativo de ese alumno (la remesa lo ignora)
BEGIN;

ALTER TABLE secretaria.bank_accounts
  ADD COLUMN IF NOT EXISTS student_id uuid NULL
  REFERENCES secretaria.students(id) ON DELETE CASCADE;

-- Saneo previo: si alguna familia ya tuviera >1 cuenta activa (student_id NULL),
-- conservar la más reciente y desactivar las demás, para poder crear el índice único.
UPDATE secretaria.bank_accounts ba
SET is_active = false
WHERE ba.student_id IS NULL
  AND ba.is_active
  AND ba.id <> (
    SELECT b2.id FROM secretaria.bank_accounts b2
    WHERE b2.family_id = ba.family_id AND b2.student_id IS NULL AND b2.is_active
    ORDER BY b2.created_at DESC, b2.id DESC
    LIMIT 1
  );

-- Como mucho una cuenta de familia activa por familia.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_family_active
  ON secretaria.bank_accounts(family_id)
  WHERE student_id IS NULL AND is_active;

-- Como mucho una override activa por alumno.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_student_active
  ON secretaria.bank_accounts(student_id)
  WHERE student_id IS NOT NULL AND is_active;

COMMIT;
```

- [ ] **Step 2: Aplicar la migración**

Run:
```bash
cat migrations/034_bank_account_student_override.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
```
Expected: termina con `COMMIT` y sin errores (líneas `ALTER TABLE`, `UPDATE n`, `CREATE INDEX`).

- [ ] **Step 3: Verificar columna e índices**

Run:
```bash
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='secretaria' AND table_name='bank_accounts' AND column_name='student_id';
  SELECT indexname FROM pg_indexes
  WHERE schemaname='secretaria' AND tablename='bank_accounts'
    AND indexname IN ('uq_bank_family_active','uq_bank_student_active');"
```
Expected: una fila `student_id`; dos filas `uq_bank_family_active` y `uq_bank_student_active`.

- [ ] **Step 4: Verificar que el índice de familia bloquea duplicados**

Run (debe FALLAR con violación de unicidad — prueba el invariante; usa una familia real solo para el test y revierte):
```bash
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "
DO \$\$
DECLARE fid uuid; n int;
BEGIN
  SELECT family_id INTO fid FROM secretaria.bank_accounts WHERE student_id IS NULL AND is_active LIMIT 1;
  IF fid IS NULL THEN RAISE NOTICE 'no hay cuenta de familia para probar'; RETURN; END IF;
  BEGIN
    INSERT INTO secretaria.bank_accounts(family_id, iban_last4, is_active) VALUES (fid, '0000', true);
    RAISE EXCEPTION 'FALLO: el indice no bloqueo el duplicado';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK: indice bloquea segunda cuenta de familia activa';
  END;
END \$\$;"
```
Expected: `NOTICE: OK: indice bloquea segunda cuenta de familia activa` (sin INSERT persistido, va dentro del bloque que lanza y captura).

- [ ] **Step 5: Commit + push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add migrations/034_bank_account_student_override.sql
git commit -m "feat(secretaria): bank_accounts.student_id para override de cuenta por hijo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push github-secretaria HEAD:main
```

---

## Task 2: Backend — blindaje SEPA + endpoints de cuenta por alumno

**Files:**
- Modify: `backend/src/modules/sepa/sepa.controller.ts` (subconsulta de selección de cuenta, ~línea 141-142)
- Modify: `backend/src/modules/students/students.controller.ts` (DTO nuevo + 3 endpoints + helpers IBAN/cripto locales)

**Interfaces:**
- Consumes: columna `bank_accounts.student_id` (Task 1).
- Produces:
  - `GET /secretaria/students/:id/bank` → `{ familyAccount: {id,ibanLast4,holderName,mandateRef}|null, override: {id,ibanLast4,holderName}|null }`
  - `POST /secretaria/students/:id/bank` body `{ iban: string, holderName?: string, scope: 'familia'|'alumno' }` → `{ ok:true, ibanLast4, scope }`
  - `DELETE /secretaria/students/:id/bank-override` → `{ ok:true }`

- [ ] **Step 1: Blindaje SEPA — excluir overrides de la remesa**

En `backend/src/modules/sepa/sepa.controller.ts`, localizar la subconsulta que elige la cuenta de la familia (busca `bk.family_id=st.family_id AND bk.is_active AND bk.sepa_mandate_ref IS NOT NULL`) y añadir el filtro `AND bk.student_id IS NULL`:

```ts
        SELECT bk.id FROM secretaria.bank_accounts bk
        WHERE bk.family_id=st.family_id AND bk.is_active AND bk.student_id IS NULL AND bk.sepa_mandate_ref IS NOT NULL
```

- [ ] **Step 2: Añadir DTO y helpers en students.controller.ts**

En `backend/src/modules/students/students.controller.ts`, tras los DTOs existentes (después de `class EnrollFeeDto { ... }`), añadir el DTO y los helpers locales (los de sepa.controller son file-local y no exportados; se replican aquí, son triviales):

```ts
const SECRETARIA_CRYPTO_KEY = process.env.SECRETARIA_CRYPTO_KEY || '';
function normalizeIban(raw: string): string { return (raw || '').replace(/\s+/g, '').toUpperCase(); }
function isValidIban(raw: string): boolean {
  const s = normalizeIban(raw);
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s);
}
class StudentBankDto {
  @IsString() iban: string;
  @IsOptional() @IsString() holderName?: string;
  @IsString() scope: 'familia' | 'alumno';
}
```

> El helper `isValidIban` replica el patrón del módulo sepa (regex de longitud/formato IBAN). Si `isValidIban` en sepa.controller usa una validación distinta, copia su cuerpo verbatim para coherencia: revisa `backend/src/modules/sepa/sepa.controller.ts:11-15` y usa el mismo cuerpo.

- [ ] **Step 3: Añadir los tres endpoints**

Dentro de la clase `StudentsController` (antes del cierre `}` de la clase), añadir:

```ts
  @Get(':id/bank') @Roles('secretaria_admin','secretaria_staff','direccion')
  async getBank(@Param('id') id: string) {
    const [st] = await this.ds.query(`SELECT family_id AS "familyId" FROM secretaria.students WHERE id=$1`, [id]);
    if (!st) throw new NotFoundException('Alumno no encontrado');
    const [familyAccount] = await this.ds.query(`
      SELECT id, iban_last4 AS "ibanLast4", holder_name AS "holderName", sepa_mandate_ref AS "mandateRef"
      FROM secretaria.bank_accounts
      WHERE family_id=$1 AND student_id IS NULL AND is_active
      ORDER BY created_at DESC LIMIT 1`, [st.familyId]);
    const [override] = await this.ds.query(`
      SELECT id, iban_last4 AS "ibanLast4", holder_name AS "holderName"
      FROM secretaria.bank_accounts
      WHERE student_id=$1 AND is_active
      ORDER BY created_at DESC LIMIT 1`, [id]);
    return { familyAccount: familyAccount || null, override: override || null };
  }

  @Post(':id/bank') @Roles('secretaria_admin','secretaria_staff')
  async setBank(@Param('id') id: string, @Body() b: StudentBankDto) {
    if (!SECRETARIA_CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');
    if (b.scope !== 'familia' && b.scope !== 'alumno') throw new BadRequestException('scope inválido');
    const iban = normalizeIban(b.iban);
    if (!isValidIban(iban)) throw new BadRequestException('IBAN no válido');
    const last4 = iban.slice(-4);
    const [st] = await this.ds.query(`SELECT family_id AS "familyId" FROM secretaria.students WHERE id=$1`, [id]);
    if (!st) throw new NotFoundException('Alumno no encontrado');

    if (b.scope === 'familia') {
      await this.ds.query(
        `UPDATE secretaria.bank_accounts SET is_active=false WHERE family_id=$1 AND student_id IS NULL AND is_active`,
        [st.familyId]);
      await this.ds.query(`
        INSERT INTO secretaria.bank_accounts(family_id, student_id, iban_encrypted, iban_last4, holder_name, sepa_mandate_ref, sepa_mandate_date, is_active)
        VALUES ($1::uuid, NULL, pgp_sym_encrypt($2,$3), $4, $5,
                'MAND-'||substr(replace($1::text,'-',''),1,8)||'-'||to_char(now(),'YYYYMMDD'),
                now()::date, true)`,
        [st.familyId, iban, SECRETARIA_CRYPTO_KEY, last4, b.holderName || null]);
    } else {
      await this.ds.query(
        `UPDATE secretaria.bank_accounts SET is_active=false WHERE student_id=$1 AND is_active`, [id]);
      await this.ds.query(`
        INSERT INTO secretaria.bank_accounts(family_id, student_id, iban_encrypted, iban_last4, holder_name, sepa_mandate_ref, sepa_mandate_date, is_active)
        VALUES ($1::uuid, $2::uuid, pgp_sym_encrypt($3,$4), $5, $6, NULL, NULL, true)`,
        [st.familyId, id, iban, SECRETARIA_CRYPTO_KEY, last4, b.holderName || null]);
    }
    return { ok: true, ibanLast4: last4, scope: b.scope };
  }

  @Delete(':id/bank-override') @Roles('secretaria_admin','secretaria_staff')
  async deleteBankOverride(@Param('id') id: string) {
    await this.ds.query(`UPDATE secretaria.bank_accounts SET is_active=false WHERE student_id=$1 AND is_active`, [id]);
    return { ok: true };
  }
```

Añadir `NotFoundException` y `BadRequestException` al import de `@nestjs/common` en la primera línea del fichero:
```ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, NotFoundException, BadRequestException } from '@nestjs/common';
```

- [ ] **Step 4: Compilar y reconstruir el backend**

Run:
```bash
cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit
```
Expected: sin errores de TypeScript.

Luego reconstruir y recrear el contenedor de Secretaría (ver memoria `project_secretaria_deploy`):
```bash
cd /opt/mw-secretaria
docker build -t mw-secretaria-api -f backend/Dockerfile backend
docker rm -f mw-secretaria-api
docker run -d --name mw-secretaria-api --restart unless-stopped \
  --network mw-panel_mw-network --env-file backend/.env -p 127.0.0.1:3010:3000 mw-secretaria-api
sleep 5 && docker logs mw-secretaria-api --tail 5
```
Expected: el contenedor arranca (log con Nest listo, sin stack traces). Confirma el nombre/red exactos con `docker ps --format '{{.Names}}'` si difiere.

- [ ] **Step 5: Verificación de los endpoints (red → green)**

Preparar token y dos alumnos hermanos de prueba; mintar token con el helper de Global Constraints. Elegir dos alumnos de la MISMA familia (o crearlos): 
```bash
# token (ver helper Global Constraints) -> $TOKEN
# Dos alumnos de una misma familia con >1 hijo:
read SID1 SID2 < <(docker exec mw-panel-db-prod psql -tA -F' ' -U mwpanel -d mwpanel -c "
  SELECT (array_agg(id ORDER BY id))[1], (array_agg(id ORDER BY id))[2]
  FROM secretaria.students GROUP BY family_id HAVING count(*)>1 LIMIT 1")
echo "SID1=$SID1 SID2=$SID2"
B=http://127.0.0.1:3010/api/secretaria
```

GET inicial (estado de partida):
```bash
curl -s -H "Authorization: Bearer $TOKEN" $B/students/$SID1/bank
```
Expected: JSON `{"familyAccount":...,"override":null}` (familyAccount puede ser null si la familia no tenía cuenta).

POST cuenta de FAMILIA en el alumno 1 → debe verse en el alumno 2 (mismo family):
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"iban":"ES9121000418450200051332","holderName":"TEST FAMILIA","scope":"familia"}' $B/students/$SID1/bank
curl -s -H "Authorization: Bearer $TOKEN" $B/students/$SID2/bank
```
Expected: el POST devuelve `{"ok":true,"ibanLast4":"1332","scope":"familia"}`; el GET del alumno 2 muestra `familyAccount.ibanLast4 == "1332"` (compartido).

POST override en el alumno 1 → solo en él:
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"iban":"ES7921000813610123456789","holderName":"TEST HIJO","scope":"alumno"}' $B/students/$SID1/bank
curl -s -H "Authorization: Bearer $TOKEN" $B/students/$SID1/bank   # override.ibanLast4 == 6789
curl -s -H "Authorization: Bearer $TOKEN" $B/students/$SID2/bank   # override == null
```
Expected: alumno 1 → `override.ibanLast4=="6789"` y `familyAccount.ibanLast4=="1332"`; alumno 2 → `override==null`, `familyAccount.ibanLast4=="1332"`.

IBAN inválido → 400:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"iban":"NOPE","scope":"alumno"}' $B/students/$SID1/bank
```
Expected: `400`.

DELETE override:
```bash
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" $B/students/$SID1/bank-override
curl -s -H "Authorization: Bearer $TOKEN" $B/students/$SID1/bank   # override == null de nuevo
```
Expected: `{"ok":true}` y luego `override==null`.

Blindaje SEPA (el override no se domicilia): comprobar que la subconsulta solo ve cuentas de familia:
```bash
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "
  SELECT count(*) FROM secretaria.bank_accounts WHERE student_id IS NOT NULL AND is_active AND sepa_mandate_ref IS NOT NULL"
```
Expected: `0` (los overrides nunca llevan mandato, así que jamás entran en la remesa).

- [ ] **Step 6: Limpiar datos de prueba**

```bash
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "
  DELETE FROM secretaria.bank_accounts WHERE holder_name IN ('TEST FAMILIA','TEST HIJO')"
```
Expected: `DELETE 2` (o las filas creadas en el test). Verifica que no quedan cuentas TEST.

- [ ] **Step 7: Commit + push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/sepa/sepa.controller.ts backend/src/modules/students/students.controller.ts
git commit -m "feat(secretaria): endpoints de cuenta por alumno (familia/override) + blindaje SEPA

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push github-secretaria HEAD:main
```

---

## Task 3: Frontend — sección "Domiciliación" en `FichaAlumno`

**Files:**
- Modify: `frontend/src/App.tsx` (componente `FichaAlumno`, a partir de `function FichaAlumno`)

**Interfaces:**
- Consumes: `GET/POST /students/:id/bank`, `DELETE /students/:id/bank-override` (Task 2). `api` (axios) ya importado en App.tsx con `baseURL=/api/secretaria`.

- [ ] **Step 1: Estado y carga de la cuenta en FichaAlumno**

En `frontend/src/App.tsx`, dentro de `function FichaAlumno({ studentId, open, onClose })`, añadir estado y carga (junto a los demás `useState`/efectos del componente). Usar el `Form` de AntD ya importado:

```tsx
  const [bank, setBank] = useState<any>(null);
  const [bankForm] = Form.useForm();
  const loadBank = async () => {
    if (!studentId) return;
    const { data } = await api.get(`/students/${studentId}/bank`);
    setBank(data);
    bankForm.resetFields();
  };
```

Y disparar `loadBank()` cuando se abre la ficha (en el mismo efecto que ya carga el alumno, o uno nuevo):
```tsx
  useEffect(() => { if (open && studentId) loadBank(); }, [open, studentId]);
```

- [ ] **Step 2: Handlers de guardar y quitar override**

Dentro del mismo componente:

```tsx
  const saveBank = async (v: any) => {
    try {
      const r = await api.post(`/students/${studentId}/bank`, {
        iban: v.iban, holderName: v.holderName,
        scope: v.onlyThisStudent ? 'alumno' : 'familia',
      });
      message.success(r.data.scope === 'alumno' ? 'Cuenta propia del alumno guardada' : 'Cuenta de la familia guardada (compartida con los hermanos)');
      loadBank();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo guardar el IBAN');
    }
  };
  const removeOverride = async () => {
    await api.delete(`/students/${studentId}/bank-override`);
    message.success('Override eliminado; vuelve a usarse la cuenta de la familia');
    loadBank();
  };
```

- [ ] **Step 3: Render de la sección "Domiciliación"**

Añadir el bloque dentro del `Drawer`/contenido de `FichaAlumno`, donde encaje con las demás secciones (p. ej. tras tutores o matrículas). Usa los componentes AntD ya importados (`Title`/`Typography`, `Form`, `Input`, `Checkbox`, `Button`, `Alert`, `Tag`, `Space`). Si `Checkbox` o `Alert` no están importados aún, añádelos al import de `antd` en la cabecera de App.tsx.

```tsx
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={5}>Domiciliación (número de cuenta)</Typography.Title>
          <div style={{ marginBottom: 8 }}>
            {bank?.familyAccount
              ? <span>Cuenta de la familia: <b>····{bank.familyAccount.ibanLast4}</b> <Tag color="blue">compartida con los hermanos</Tag></span>
              : <span style={{ color: '#999' }}>Sin cuenta de familia registrada</span>}
          </div>
          {bank?.override && (
            <Alert style={{ marginBottom: 8 }} type="warning" showIcon
              message={<span>Cuenta propia de este alumno: <b>····{bank.override.ibanLast4}</b> (pago especial)</span>}
              action={<Button size="small" onClick={removeOverride}>Volver a usar la de la familia</Button>} />
          )}
          <Form form={bankForm} layout="vertical" onFinish={saveBank}>
            <Form.Item name="iban" label="IBAN" rules={[{ required: true, message: 'Introduce el IBAN' }]}>
              <Input autoComplete="off" placeholder="ES## #### #### #### #### ####" />
            </Form.Item>
            <Form.Item name="holderName" label="Titular (opcional)">
              <Input autoComplete="off" placeholder="Nombre del titular de la cuenta" />
            </Form.Item>
            <Form.Item name="onlyThisStudent" valuePropName="checked">
              <Checkbox>Solo para este alumno (pago especial)</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit">Guardar cuenta</Button>
          </Form>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            La remesa SEPA cobra a la cuenta de la familia. La cuenta propia es informativa, para un pago o transferencia especial de este alumno.
          </Typography.Text>
        </div>
```

- [ ] **Step 4: Build del frontend**

Run:
```bash
cd /opt/mw-secretaria/frontend && npm run build
```
Expected: build sin errores de TypeScript; genera `dist/` con un nuevo bundle `index-*.js`.

- [ ] **Step 5: Desplegar el frontend**

Run (ver memoria `project_secretaria_deploy`):
```bash
sudo cp -r /opt/mw-secretaria/frontend/dist/* /opt/mw-secretaria/frontend-dist/
```
Expected: copia sin errores. (El frontend de Secretaría se sirve desde `/opt/mw-secretaria/frontend-dist`.)

- [ ] **Step 6: Verificación manual en navegador**

Abrir `https://secretaria.mundoworld.school`, entrar en la ficha de un alumno cuya familia tenga ≥2 hijos:
- Sección "Domiciliación" visible con el estado de la cuenta.
- Guardar un IBAN sin marcar la casilla → mensaje "Cuenta de la familia…"; abrir la ficha del hermano → aparece el mismo `····last4`.
- Guardar un IBAN con la casilla marcada → aparece el Alert "Cuenta propia de este alumno"; el hermano NO la ve.
- "Volver a usar la de la familia" → desaparece el override.

Expected: comportamiento descrito. (Hacer refresco forzado si el bundle viejo persiste.)

- [ ] **Step 7: Commit + push**

```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): seccion Domiciliacion en la ficha del alumno (cuenta familia/override)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push github-secretaria HEAD:main
```

---

## Notas de uso (post-implementación)
- Para que el IBAN se comparta entre dos hermanos que hoy están en **familias separadas**, hay que **vincularlos en una familia** con el botón "Vincular" de la modal de Familias (`POST /families/:id/attach-student`). Es una acción manual existente; este plan no la automatiza. Caso conocido: Camila y Paula Villanueva (familias separadas).

## Self-review (cobertura del spec)
- Modelo `student_id` + índices parciales + saneo → Task 1. ✔
- Blindaje SEPA `AND bk.student_id IS NULL` → Task 2 Step 1. ✔
- Endpoints GET/POST/DELETE con cifrado y validación → Task 2 Steps 2-3, verificación Step 5. ✔
- Sección Domiciliación en FichaAlumno (estado + form + casilla + volver-a-familia + nota) → Task 3 Steps 1-3. ✔
- Criterio "aparece en ambas fichas" → Task 2 Step 5 (POST familia en alumno1, visible en alumno2) + Task 3 Step 6. ✔
- Criterio "override no cambia al hermano" / "no entra en remesa" → Task 2 Step 5. ✔
- Cifrado pgcrypto, solo last4 expuesto → Global Constraints + endpoints. ✔
- Compartir entre familias separadas requiere "Vincular" → Notas de uso. ✔
