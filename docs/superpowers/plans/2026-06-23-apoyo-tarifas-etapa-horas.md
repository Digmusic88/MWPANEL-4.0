# Apoyo: tarifa por etapa + horas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que en el servicio **Apoyo** la tarifa (mensualidad/matrícula/material) de cada alumno se calcule por su **etapa** (primaria/secundaria/bachillerato) + **nº de horas** (suma de franjas, ajustable por franja), con tramos configurables desde la interfaz; sin afectar a ningún otro servicio.

**Architecture:** Se replica el patrón de Danza: tabla de tramos propia (`apoyo_fee_tiers`) + una función auxiliar (`fn_resolve_apoyo_fee`) + una rama `IF servicio = APOYO` dentro de `fn_resolve_monthly_fee` y `fn_resolve_concept_fee`. La etapa vive en `enrollments.apoyo_level` (solo Apoyo) y las horas en `apoyo_assignments.hours`. `custom_fee` mantiene prioridad máxima. El frontend añade selector de etapa + edición de horas + visualización de cuota en el tablero de Apoyo, y un editor de tramos dentro de la página de Tarifas.

**Tech Stack:** PostgreSQL 15 (esquema `secretaria`), NestJS + TypeORM (`DataSource.query` con SQL crudo), React 18 + Ant Design (un único `App.tsx` grande + `InscripcionDrawer.tsx`). Migraciones SQL aplicadas **a mano** vía `psql` (no hay runner).

## Global Constraints

- Cambios **solo** para `services.code = 'APOYO'`. Ningún otro servicio puede cambiar de importe (verificar no-regresión).
- `custom_fee` de la matrícula mantiene **prioridad máxima** sobre cualquier tramo.
- Etapas exactas: `primaria`, `secundaria`, `bachillerato` (enum `secretaria.apoyo_level`).
- Conceptos afectados: `mensualidad`, `matricula`, `material` (enum `secretaria.fee_concept` existente).
- Selección de tramo de mensualidad: el tramo con el **mayor `hours` que no supere** el total del alumno; si no hay tramo aplicable → `NULL` (cuota "revisar", no se inventa importe).
- Matrícula/material: tramo con `hours IS NULL` (fijo por etapa).
- Siembra: `mensualidad`, **hours = 2**, año académico activo → primaria 68,00 / secundaria 75,00 / bachillerato 95,00.
- Etapa **no** se auto-deduce de `grade_label`; se asigna a mano.
- **Aplicar la migración ANTES de reconstruir el backend** (lección incidente migración 035).
- Migración manual: `cat migrations/036_apoyo_fees.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel`.
- Cada cambio de Secretaría se commitea+pushea al repo `Digmusic88/MWPANEL-4.0`:
  `git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria <cmd>` (remoto `origin`).

---

## File Structure

- **Create** `migrations/036_apoyo_fees.sql` — enum `apoyo_level`, columnas `enrollments.apoyo_level` y `apoyo_assignments.hours`, tabla `apoyo_fee_tiers` (+ índice único parcial), función `fn_resolve_apoyo_fee`, redefinición de `fn_resolve_monthly_fee` y `fn_resolve_concept_fee`, y siembra.
- **Modify** `backend/src/modules/enrollments/enrollments.controller.ts` — `apoyoLevel` en `UpdateEnrollmentDto` + `PATCH :id`.
- **Modify** `backend/src/modules/apoyo/apoyo.controller.ts` — `hours` en `assign`/board; endpoint `PATCH assignment/:id/hours`; board expone `apoyoLevel`, `totalHours`, `monthlyFee`, y `hours` por asignación; CRUD `fee-tiers`.
- **Modify** `backend/src/modules/students/students.controller.ts` — `oneFull` devuelve `apoyoLevel` y `serviceCode` por enrollment (para el selector de etapa en el drawer).
- **Modify** `frontend/src/App.tsx` — `ApoyoBoard` (etapa + horas + cuota) y `Tarifas` (nueva tarjeta "Tarifas de Apoyo").
- **Modify** `frontend/src/components/InscripcionDrawer.tsx` — selector de etapa en la matrícula de Apoyo.

---

## Task 1: Migración SQL — modelo de datos + funciones de precio

**Files:**
- Create: `migrations/036_apoyo_fees.sql`
- Test (efímero): `/tmp/claude-0/-opt/0164e092-73a3-45cd-b078-609192c75f83/scratchpad/test_apoyo_fees.sql`

**Interfaces:**
- Produces (SQL):
  - `secretaria.apoyo_level` enum (`'primaria'|'secundaria'|'bachillerato'`)
  - `secretaria.enrollments.apoyo_level apoyo_level NULL`
  - `secretaria.apoyo_assignments.hours numeric(4,2) NOT NULL DEFAULT 1`
  - `secretaria.apoyo_fee_tiers(id, academic_year_id, etapa, concept, hours, amount, is_active)`
  - `secretaria.fn_resolve_apoyo_fee(p_enrollment_id uuid, p_concept text) RETURNS numeric`
  - `fn_resolve_monthly_fee` / `fn_resolve_concept_fee` con rama APOYO

- [ ] **Step 1: Escribir la migración**

Create `migrations/036_apoyo_fees.sql`:

```sql
-- migrations/036_apoyo_fees.sql
-- Tarifa de Apoyo por etapa + nº de horas (tramos configurables). Solo afecta a APOYO.
SET search_path TO secretaria, public;

-- 1) Enum de etapa (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE t.typname='apoyo_level' AND n.nspname='secretaria') THEN
    CREATE TYPE secretaria.apoyo_level AS ENUM ('primaria','secundaria','bachillerato');
  END IF;
END $$;

-- 2) Etapa en la matrícula (solo se usa en Apoyo) y horas por franja
ALTER TABLE secretaria.enrollments       ADD COLUMN IF NOT EXISTS apoyo_level secretaria.apoyo_level NULL;
ALTER TABLE secretaria.apoyo_assignments ADD COLUMN IF NOT EXISTS hours numeric(4,2) NOT NULL DEFAULT 1;

-- 3) Tabla de tramos configurable
CREATE TABLE IF NOT EXISTS secretaria.apoyo_fee_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES secretaria.academic_years(id) ON DELETE CASCADE,
  etapa   secretaria.apoyo_level NOT NULL,
  concept secretaria.fee_concept NOT NULL,
  hours   numeric(4,2) NULL,            -- NULL = importe fijo por etapa (matricula/material)
  amount  numeric(8,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
-- Una sola fila por (año, etapa, concepto, horas) cuando horas NO es NULL
CREATE UNIQUE INDEX IF NOT EXISTS apoyo_fee_tiers_hours_uniq
  ON secretaria.apoyo_fee_tiers (academic_year_id, etapa, concept, hours)
  WHERE hours IS NOT NULL;
-- Una sola fila "fija" por (año, etapa, concepto) cuando horas IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS apoyo_fee_tiers_flat_uniq
  ON secretaria.apoyo_fee_tiers (academic_year_id, etapa, concept)
  WHERE hours IS NULL;

-- 4) Resolución de importe Apoyo por concepto
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_apoyo_fee(p_enrollment_id uuid, p_concept text)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v_year uuid; v_level secretaria.apoyo_level; v_hours numeric; v_amount numeric;
BEGIN
  SELECT e.academic_year_id, e.apoyo_level INTO v_year, v_level
  FROM secretaria.enrollments e WHERE e.id = p_enrollment_id;
  IF v_level IS NULL THEN RETURN NULL; END IF;  -- sin etapa → "revisar"

  IF p_concept = 'mensualidad' THEN
    SELECT COALESCE(SUM(hours),0) INTO v_hours
    FROM secretaria.apoyo_assignments WHERE enrollment_id = p_enrollment_id;
    SELECT amount INTO v_amount FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level AND concept='mensualidad'
      AND is_active AND hours IS NOT NULL AND hours <= v_hours
    ORDER BY hours DESC LIMIT 1;
    RETURN v_amount;   -- NULL si no hay tramo aplicable
  ELSE
    SELECT amount INTO v_amount FROM secretaria.apoyo_fee_tiers
    WHERE academic_year_id=v_year AND etapa=v_level
      AND concept=p_concept::secretaria.fee_concept AND is_active AND hours IS NULL
    LIMIT 1;
    RETURN v_amount;
  END IF;
END; $$;

-- 5) Rama APOYO en la mensualidad (custom_fee y Danza intactos)
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_monthly_fee(p_enrollment_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_amount numeric;
  v_year uuid; v_service uuid; v_group uuid; v_program uuid; v_custom numeric; v_service_code varchar;
BEGIN
  SELECT e.academic_year_id, e.service_id, e.group_id, e.custom_fee, g.program_id, s.code
    INTO v_year, v_service, v_group, v_custom, v_program, v_service_code
  FROM secretaria.enrollments e
  LEFT JOIN secretaria.groups g ON g.id = e.group_id
  JOIN secretaria.services s ON s.id = e.service_id
  WHERE e.id = p_enrollment_id;

  IF v_custom IS NOT NULL THEN RETURN v_custom; END IF;
  IF v_service_code = 'DANZA' THEN RETURN secretaria.fn_resolve_danza_monthly(p_enrollment_id); END IF;
  IF v_service_code = 'APOYO' THEN RETURN secretaria.fn_resolve_apoyo_fee(p_enrollment_id,'mensualidad'); END IF;

  IF v_group IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active AND group_id=v_group
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  IF v_program IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active AND program_id=v_program AND group_id IS NULL
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  SELECT amount INTO v_amount FROM secretaria.fee_schedules
  WHERE academic_year_id=v_year AND concept='mensualidad' AND is_active AND service_id=v_service AND program_id IS NULL AND group_id IS NULL
  ORDER BY amount DESC LIMIT 1;
  RETURN v_amount;
END; $$;

-- 6) Rama APOYO en matrícula/material
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_concept_fee(p_enrollment_id uuid, p_concept text)
RETURNS numeric AS $$
DECLARE v_amount numeric; v_year uuid; v_service uuid; v_group uuid; v_program uuid; v_service_code varchar;
BEGIN
  SELECT e.academic_year_id, e.service_id, e.group_id, g.program_id, s.code
    INTO v_year, v_service, v_group, v_program, v_service_code
  FROM secretaria.enrollments e
  LEFT JOIN secretaria.groups g ON g.id=e.group_id
  JOIN secretaria.services s ON s.id=e.service_id
  WHERE e.id=p_enrollment_id;

  IF v_service_code = 'APOYO' THEN
    RETURN secretaria.fn_resolve_apoyo_fee(p_enrollment_id, p_concept);
  END IF;

  IF v_group IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept=p_concept::secretaria.fee_concept AND is_active AND group_id=v_group
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  IF v_program IS NOT NULL THEN
    SELECT amount INTO v_amount FROM secretaria.fee_schedules
    WHERE academic_year_id=v_year AND concept=p_concept::secretaria.fee_concept AND is_active AND program_id=v_program AND group_id IS NULL
    ORDER BY amount DESC LIMIT 1;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  SELECT amount INTO v_amount FROM secretaria.fee_schedules
  WHERE academic_year_id=v_year AND concept=p_concept::secretaria.fee_concept AND is_active AND service_id=v_service AND program_id IS NULL AND group_id IS NULL
  ORDER BY amount DESC LIMIT 1;
  RETURN v_amount;
END; $$ LANGUAGE plpgsql STABLE;

-- 7) Siembra: precios actuales en el tramo de 2 horas, año activo
INSERT INTO secretaria.apoyo_fee_tiers (academic_year_id, etapa, concept, hours, amount)
SELECT ay.id, v.etapa::secretaria.apoyo_level, 'mensualidad'::secretaria.fee_concept, 2, v.amount
FROM secretaria.academic_years ay
CROSS JOIN (VALUES ('primaria',68.00),('secundaria',75.00),('bachillerato',95.00)) AS v(etapa, amount)
WHERE ay.is_active
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Escribir el test SQL (debe fallar antes de aplicar)**

Create `/tmp/claude-0/-opt/0164e092-73a3-45cd-b078-609192c75f83/scratchpad/test_apoyo_fees.sql`:

```sql
-- Test de fn_resolve_apoyo_fee con fixtures efímeras (todo dentro de una transacción que se revierte)
BEGIN;
SET search_path TO secretaria, public;
DO $$
DECLARE
  v_year uuid; v_apoyo uuid; v_student uuid; v_fam uuid; v_enr uuid; v_fee numeric;
BEGIN
  SELECT id INTO v_year FROM secretaria.academic_years WHERE is_active LIMIT 1;
  SELECT id INTO v_apoyo FROM secretaria.services WHERE code='APOYO';
  INSERT INTO secretaria.families(display_name) VALUES ('TEST fam') RETURNING id INTO v_fam;
  INSERT INTO secretaria.students(first_name,last_name,family_id) VALUES ('TEST','Apoyo',v_fam) RETURNING id INTO v_student;
  INSERT INTO secretaria.enrollments(student_id, academic_year_id, service_id, status, apoyo_level)
    VALUES (v_student, v_year, v_apoyo, 'matriculado', 'primaria') RETURNING id INTO v_enr;
  -- 2 franjas de 1h => total 2h => debe coger el tramo sembrado de 2h (68 primaria)
  INSERT INTO secretaria.apoyo_assignments(enrollment_id, weekday, slot_time, hours) VALUES (v_enr,1,'17:00',1),(v_enr,3,'17:00',1);

  v_fee := secretaria.fn_resolve_monthly_fee(v_enr);
  ASSERT v_fee = 68.00, 'esperaba 68 para primaria 2h, obtuvo '||COALESCE(v_fee::text,'NULL');

  -- Una franja a 0,5 (total 1,5h): no hay tramo de 1h ni 0,5 => NULL
  UPDATE secretaria.apoyo_assignments SET hours=0.5 WHERE enrollment_id=v_enr;  -- total 1,0... ajustamos:
  DELETE FROM secretaria.apoyo_assignments WHERE enrollment_id=v_enr AND weekday=3;
  -- ahora 1 franja de 0,5 => total 0,5 => sin tramo aplicable => NULL
  v_fee := secretaria.fn_resolve_monthly_fee(v_enr);
  ASSERT v_fee IS NULL, 'esperaba NULL para 0,5h sin tramo, obtuvo '||COALESCE(v_fee::text,'NULL');

  -- custom_fee gana siempre
  UPDATE secretaria.enrollments SET custom_fee=40 WHERE id=v_enr;
  v_fee := secretaria.fn_resolve_monthly_fee(v_enr);
  ASSERT v_fee = 40, 'custom_fee debe ganar, obtuvo '||COALESCE(v_fee::text,'NULL');

  RAISE NOTICE 'OK: todos los asserts de Apoyo pasaron';
END $$;
ROLLBACK;
```

- [ ] **Step 3: Ejecutar el test antes de aplicar (debe fallar)**

Run:
```bash
cat /tmp/claude-0/-opt/0164e092-73a3-45cd-b078-609192c75f83/scratchpad/test_apoyo_fees.sql \
  | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel -v ON_ERROR_STOP=1
```
Expected: FALLA (p. ej. `column "apoyo_level" of relation "enrollments" does not exist` o función inexistente).

- [ ] **Step 4: Aplicar la migración**

Run:
```bash
cat /opt/mw-secretaria/migrations/036_apoyo_fees.sql \
  | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel -v ON_ERROR_STOP=1
```
Expected: sin errores (CREATE/ALTER/INSERT). Re-ejecutarla una segunda vez también debe pasar (idempotente).

- [ ] **Step 5: Ejecutar el test después de aplicar (debe pasar)**

Run:
```bash
cat /tmp/claude-0/-opt/0164e092-73a3-45cd-b078-609192c75f83/scratchpad/test_apoyo_fees.sql \
  | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel -v ON_ERROR_STOP=1
```
Expected: `NOTICE: OK: todos los asserts de Apoyo pasaron` y `ROLLBACK`.

- [ ] **Step 6: Verificar no-regresión de otros servicios y siembra**

Run:
```bash
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "
SELECT etapa, concept, hours, amount FROM secretaria.apoyo_fee_tiers ORDER BY etapa;
-- Un enrollment de Inglés y otro de Danza siguen resolviendo igual que antes (no NULL inesperado):
SELECT sv.code, secretaria.fn_resolve_monthly_fee(e.id) AS fee
FROM secretaria.enrollments e JOIN secretaria.services sv ON sv.id=e.service_id
WHERE sv.code IN ('INGLES','DANZA') AND e.status='matriculado' LIMIT 5;"
```
Expected: 3 filas sembradas (68/75/95 a 2h); importes de Inglés/Danza coherentes (no rotos).

- [ ] **Step 7: Commit**

```bash
GD="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$GD add migrations/036_apoyo_fees.sql
$GD commit -m "feat(secretaria): migracion 036 - tarifa Apoyo por etapa + horas

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Backend — etapa, horas y CRUD de tramos

**Files:**
- Modify: `backend/src/modules/enrollments/enrollments.controller.ts`
- Modify: `backend/src/modules/apoyo/apoyo.controller.ts`
- Modify: `backend/src/modules/students/students.controller.ts:236-245` (query de enrollments en `oneFull`)

**Interfaces:**
- Consumes: funciones SQL de Task 1.
- Produces (API REST):
  - `PATCH /secretaria/enrollments/:id` acepta `apoyoLevel: 'primaria'|'secundaria'|'bachillerato'|null`
  - `POST /secretaria/apoyo/assign` acepta `hours?: number` (default 1)
  - `PATCH /secretaria/apoyo/assignment/:id/hours` body `{ hours: number }`
  - `GET /secretaria/apoyo/board` → cada asignación incluye `hours`; `pool` y `assignments` incluyen `apoyoLevel`, `totalHours`, `monthlyFee`
  - `GET/POST/PATCH/DELETE /secretaria/apoyo/fee-tiers`
  - `GET /secretaria/students/:id/full` → cada enrollment incluye `apoyoLevel` y `serviceCode`

- [ ] **Step 1: `apoyoLevel` en el DTO y el PATCH de enrollments**

En `backend/src/modules/enrollments/enrollments.controller.ts`, añadir al import de `class-validator` `IsIn` (ya está). Añadir constante y campo al DTO. Tras la línea 7 (`const STATUSES = ...`) añadir:

```typescript
const APOYO_LEVELS = ['primaria','secundaria','bachillerato'];
```

En `UpdateEnrollmentDto` (después de `customFeeReason`, línea 20) añadir:

```typescript
  @IsOptional() @IsIn(APOYO_LEVELS) apoyoLevel?: string | null;
```

En `update()` (tras la línea 111 `if (b.customFeeReason !== undefined) ...`) añadir:

```typescript
    if (b.apoyoLevel !== undefined) push('apoyo_level', b.apoyoLevel || null);
```

- [ ] **Step 2: Compilar el backend para validar tipos**

Run:
```bash
cd /opt/mw-secretaria/backend && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```
Expected: sin errores nuevos relativos a estos ficheros.

- [ ] **Step 3: `hours` en assign + endpoint de horas + board enriquecido (apoyo.controller.ts)**

En `backend/src/modules/apoyo/apoyo.controller.ts`:

(a) En `AssignDto` (tras `room?`, línea 11) añadir:
```typescript
  @IsOptional() @IsNumber() hours?: number;
```
y añadir `IsNumber` al import de `class-validator` de la línea 2.

(b) En `assign()` (líneas 88-94) reemplazar el INSERT para guardar `hours`:
```typescript
  @Post('assign') @Roles('secretaria_admin','secretaria_staff')
  async assign(@Body() b: AssignDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.apoyo_assignments(enrollment_id, weekday, slot_time, room, hours)
       VALUES ($1,$2,$3,$4,COALESCE($5,1)) RETURNING id`,
      [b.enrollmentId, b.weekday, b.slotTime, b.room || null, b.hours ?? null]);
    return { ok: true, id: r[0].id };
  }
```

(c) Nuevo endpoint de horas, tras `setRoom()` (línea 107):
```typescript
  @Patch('assignment/:id/hours') @Roles('secretaria_admin','secretaria_staff')
  async setHours(@Param('id') id: string, @Body() b: { hours?: number }) {
    const h = Number(b.hours);
    if (!Number.isFinite(h) || h <= 0) return { ok: false, error: 'Horas inválidas' };
    await this.ds.query(`UPDATE secretaria.apoyo_assignments SET hours=$2 WHERE id=$1`, [id, h]);
    return { ok: true };
  }
```

(d) Enriquecer `board()`: en la query `assignments` (líneas 34-42) añadir `a.hours` y la etapa/cuota; y en `pool` (44-52) añadir etapa/cuota. Reemplazar ambas consultas:

```typescript
    const assignments = await this.ds.query(`
      SELECT a.id, a.enrollment_id AS "enrollmentId", a.weekday, a.slot_time AS "slotTime", a.room,
             a.hours, e.apoyo_level AS "apoyoLevel",
             (SELECT COALESCE(SUM(h.hours),0) FROM secretaria.apoyo_assignments h WHERE h.enrollment_id=e.id) AS "totalHours",
             secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.apoyo_assignments a
      JOIN secretaria.enrollments e ON e.id=a.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2
      ORDER BY a.weekday, a.slot_time, "studentName"`, [yid, sid]);
    const pool = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.apoyo_level AS "apoyoLevel",
             secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status='matriculado'
        AND NOT EXISTS (SELECT 1 FROM secretaria.apoyo_assignments a WHERE a.enrollment_id=e.id)
      ORDER BY "studentName"`, [yid, sid]);
```

- [ ] **Step 4: CRUD de tramos (apoyo.controller.ts)**

Añadir DTO tras `MoveDto` (línea 17):
```typescript
class FeeTierDto {
  @IsUUID() academicYearId: string;
  @IsIn(['primaria','secundaria','bachillerato']) etapa: string;
  @IsIn(['mensualidad','matricula','material']) concept: string;
  @IsOptional() @IsNumber() hours?: number | null;
  @IsNumber() amount: number;
}
```
Añadir `IsIn` al import de `class-validator`. Añadir los endpoints al final de la clase (antes del cierre `}` de la línea 114):

```typescript
  @Get('fee-tiers') @Roles('secretaria_admin','secretaria_staff','direccion')
  async listTiers(@Query('academicYearId') yearId?: string) {
    const { yid } = await this.ctx(yearId);
    return this.ds.query(
      `SELECT id, academic_year_id AS "academicYearId", etapa, concept, hours, amount, is_active AS "isActive"
       FROM secretaria.apoyo_fee_tiers WHERE academic_year_id=$1
       ORDER BY etapa, concept, hours NULLS FIRST`, [yid]);
  }

  @Post('fee-tiers') @Roles('secretaria_admin','secretaria_staff')
  async createTier(@Body() b: FeeTierDto) {
    const hours = b.concept === 'mensualidad' ? Number(b.hours) : null;
    if (b.concept === 'mensualidad' && (!Number.isFinite(hours) || (hours as number) <= 0))
      return { ok: false, error: 'La mensualidad necesita un nº de horas > 0' };
    try {
      const r = await this.ds.query(
        `INSERT INTO secretaria.apoyo_fee_tiers(academic_year_id, etapa, concept, hours, amount)
         VALUES ($1,$2::secretaria.apoyo_level,$3::secretaria.fee_concept,$4,$5) RETURNING id`,
        [b.academicYearId, b.etapa, b.concept, hours, b.amount]);
      return { ok: true, id: r[0].id };
    } catch (e: any) {
      if (String(e?.message || '').includes('uniq')) return { ok: false, error: 'Ya existe un tramo para esa etapa/concepto/horas' };
      throw e;
    }
  }

  @Patch('fee-tiers/:id') @Roles('secretaria_admin','secretaria_staff')
  async updateTier(@Param('id') id: string, @Body() b: { amount?: number; hours?: number | null; isActive?: boolean }) {
    const sets: string[] = []; const params: any[] = [];
    const push = (c: string, v: any) => { params.push(v); sets.push(`${c} = $${params.length}`); };
    if (b.amount !== undefined) push('amount', b.amount);
    if (b.hours !== undefined) push('hours', b.hours);
    if (b.isActive !== undefined) push('is_active', b.isActive);
    if (!sets.length) return { ok: true };
    params.push(id);
    await this.ds.query(`UPDATE secretaria.apoyo_fee_tiers SET ${sets.join(', ')} WHERE id=$${params.length}`, params);
    return { ok: true };
  }

  @Delete('fee-tiers/:id') @Roles('secretaria_admin','secretaria_staff')
  async deleteTier(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.apoyo_fee_tiers WHERE id=$1`, [id]);
    return { ok: true };
  }
```

- [ ] **Step 5: `oneFull` devuelve apoyoLevel + serviceCode (students.controller.ts)**

En `backend/src/modules/students/students.controller.ts`, la query de `enrollments` dentro de `oneFull` (líneas 236-245) añade dos columnas. Reemplazar el SELECT por:

```typescript
    const enrollments = await this.ds.query(
      `SELECT e.id, e.service_id AS "serviceId", sv.name AS "serviceName", sv.code AS "serviceCode",
              e.group_id AS "groupId", g.name AS "groupName",
              e.status, e.custom_fee AS "customFee", e.apoyo_level AS "apoyoLevel",
              secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee"
       FROM secretaria.enrollments e
       JOIN secretaria.services sv ON sv.id = e.service_id
       LEFT JOIN secretaria.groups g ON g.id = e.group_id
       WHERE e.student_id = $1 AND e.academic_year_id = $2
       ORDER BY sv.name`, [id, yearId]);
```

- [ ] **Step 6: Compilar backend**

Run:
```bash
cd /opt/mw-secretaria/backend && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20
```
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
GD="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$GD add backend/src/modules/enrollments/enrollments.controller.ts backend/src/modules/apoyo/apoyo.controller.ts backend/src/modules/students/students.controller.ts
$GD commit -m "feat(secretaria): API Apoyo - etapa, horas por franja y CRUD de tramos

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Frontend — etapa + horas + cuota en el tablero, editor de tramos, selector en el alta

**Files:**
- Modify: `frontend/src/App.tsx` (`ApoyoBoard` ~4486-4615; `Tarifas` ~1080-1178)
- Modify: `frontend/src/components/InscripcionDrawer.tsx` (bloque de enrollments en modo edición ~597-641)

**Interfaces:**
- Consumes: endpoints de Task 2.
- Produces: UI; sin nuevos contratos para otras tareas.

- [ ] **Step 1: ApoyoBoard — mostrar etapa/horas/cuota y permitir editarlas**

En `frontend/src/App.tsx`, dentro de `ApoyoBoard`:

(a) Helpers de etiqueta y acciones. Tras `const load = ...` (línea 4493) añadir:
```tsx
  const LEVELS = [
    { value: 'primaria', label: 'Primaria' },
    { value: 'secundaria', label: 'Secundaria' },
    { value: 'bachillerato', label: 'Bachillerato' },
  ];
  const eur = (n: any) => (n == null ? <Tag color="red">revisar</Tag> : <Tag color="green">{Number(n).toFixed(2)} €</Tag>);
  const setLevel = async (enrollmentId: string, apoyoLevel: string) => {
    try { await api.patch(`/enrollments/${enrollmentId}`, { apoyoLevel }); load(); } catch { message.error('Error'); }
  };
  const setAssignHours = async (assignmentId: string) => {
    const v = window.prompt('Horas de esta franja (p. ej. 1 o 0.5)');
    if (v === null) return;
    const hours = Number(v.replace(',', '.'));
    if (!Number.isFinite(hours) || hours <= 0) { message.warning('Número de horas inválido'); return; }
    try { await api.patch(`/apoyo/assignment/${assignmentId}/hours`, { hours }); load(); } catch { message.error('Error'); }
  };
```

(b) Selector de etapa + cuota en las tarjetas del pool. Reemplazar la línea 4567 (la del `pool.map`) por:
```tsx
            {pool.map((s: any) => (
              <div key={s.enrollmentId} style={{ background: '#F5F2ED', border: '1px solid #E2DDD8', borderRadius: 6, padding: '4px 6px', marginBottom: 4 }}>
                <div draggable onDragStart={() => setDrag({ enrollmentId: s.enrollmentId })} onDragEnd={() => { setDrag(null); setOverKey(null); }}
                  style={{ cursor: 'grab', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.studentName} {eur(s.monthlyFee)}</div>
                <Select size="small" style={{ width: '100%', marginTop: 2 }} placeholder="Etapa" value={s.apoyoLevel || undefined}
                  options={LEVELS} onChange={(v) => setLevel(s.enrollmentId, v)} />
              </div>
            ))}
```

(c) Etapa/horas/cuota en las celdas. Reemplazar el `cell(d, t).map(...)` (líneas 4599-4602) por:
```tsx
                          {cell(d, t).map((a: any) => (
                            <div key={a.id} style={{ background: '#F5F2ED', border: '1px solid #E2DDD8', borderRadius: 6, padding: '4px 6px', fontSize: 12, marginBottom: 4 }}>
                              <div draggable onDragStart={() => setDrag({ enrollmentId: a.enrollmentId, assignmentId: a.id })} onDragEnd={() => { setDrag(null); setOverKey(null); }}
                                style={{ cursor: 'grab', display: 'flex', justifyContent: 'space-between', gap: 4, alignItems: 'center' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.studentName}{a.room ? <Tag style={{ marginLeft: 4 }}>{a.room}</Tag> : null}</span>
                                <Dropdown trigger={['click']} menu={{ items: [
                                  { key: 'r', label: 'Cambiar sala' },
                                  { key: 'h', label: `Horas de la franja (${Number(a.hours)})` },
                                  { key: 'd', label: 'Quitar de la franja' },
                                ], onClick: ({ key }: any) => key === 'r' ? setRoom(a) : key === 'h' ? setAssignHours(a.id) : api.delete(`/apoyo/assignment/${a.id}`).then(load) }}>
                                  <a style={{ color: '#9B9BAB', flexShrink: 0 }} onClick={e => e.preventDefault()}>⋯</a>
                                </Dropdown>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                <Select size="small" style={{ width: 110 }} placeholder="Etapa" value={a.apoyoLevel || undefined}
                                  options={LEVELS} onChange={(v) => setLevel(a.enrollmentId, v)} />
                                <span style={{ fontSize: 11, color: '#6B6B7B' }}>{Number(a.totalHours)}h · {a.monthlyFee == null ? '—' : Number(a.monthlyFee).toFixed(2) + '€'}</span>
                              </div>
                            </div>
                          ))}
```
> Nota: `Dropdown`, `Select`, `Tag`, `message` ya están importados de antd en `App.tsx` (se usan en este mismo componente). No añadir imports nuevos.

- [ ] **Step 2: Verificar build del frontend**

Run:
```bash
cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -15
```
Expected: build OK (sin errores TypeScript). Corregir cualquier error de tipos antes de seguir.

- [ ] **Step 3: Tarifas — tarjeta "Tarifas de Apoyo"**

En `frontend/src/App.tsx`, dentro de `Tarifas`, añadir estado y carga de tramos. Tras `const [years, setYears] = useState<any[]>([]);` (línea 1085) añadir:
```tsx
  const [tiers, setTiers] = useState<any[]>([]);
  const [tierOpen, setTierOpen] = useState(false);
  const [tierForm] = Form.useForm();
  const loadTiers = async () => { try { const { data } = await api.get('/apoyo/fee-tiers'); setTiers(data); } catch { /* */ } };
  const openTier = () => { tierForm.resetFields(); const ay = years.find(y => y.isActive)?.id; tierForm.setFieldsValue({ academicYearId: ay, etapa: 'primaria', concept: 'mensualidad' }); setTierOpen(true); };
  const saveTier = async (v: any) => {
    try { const { data } = await api.post('/apoyo/fee-tiers', v);
      if (data?.ok === false) { message.warning(data.error); return; }
      message.success('Tramo guardado'); setTierOpen(false); loadTiers();
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
  };
  const delTier = async (id: string) => { await api.delete(`/apoyo/fee-tiers/${id}`); message.success('Tramo eliminado'); loadTiers(); };
```
Añadir `loadTiers()` al `useEffect` de carga inicial (dentro del `useEffect` de la línea 1090, junto a las demás llamadas `api.get`):
```tsx
    loadTiers();
```

Insertar la tarjeta nueva justo antes del `<Modal ...>` de tarifas (antes de la línea 1144). Renderiza la tabla de tramos + su modal:
```tsx
      <Card style={{ marginTop: 16 }} title="Tarifas de Apoyo (por etapa y horas)"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openTier}>Nuevo tramo</Button>}>
        <Ayuda title="Cómo funcionan los tramos de Apoyo">
          La <b>mensualidad</b> se define por <b>etapa</b> (Primaria/Secundaria/Bachillerato) y <b>nº de horas</b> semanales:
          se aplica el tramo cuyas horas no superen las del alumno (suma de sus franjas). La <b>matrícula</b> y el <b>material</b>
          son fijos por etapa (deja las horas vacías). Un precio especial puntual se sigue poniendo en la matrícula del alumno (override).
        </Ayuda>
        <SearchableTable rowKey="id" dataSource={tiers} pagination={{ pageSize: 12 }}
          columns={[
            { title: 'Etapa', dataIndex: 'etapa', render: (e: string) => <Tag>{e}</Tag> },
            { title: 'Concepto', dataIndex: 'concept', render: (c: string) => <Tag>{c}</Tag> },
            { title: 'Horas', dataIndex: 'hours', render: (h: any) => h == null ? <Text type="secondary">fijo</Text> : `${Number(h)} h` },
            { title: 'Importe', dataIndex: 'amount', render: (a: any) => <b>{Number(a).toFixed(2)} €</b> },
            { title: '', render: (_: any, r: any) => <Popconfirm title="¿Eliminar tramo?" onConfirm={() => delTier(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm> },
          ]} />
      </Card>
      <Modal title="Nuevo tramo de Apoyo" open={tierOpen} onCancel={() => setTierOpen(false)} onOk={() => tierForm.submit()} okText="Guardar">
        <Form form={tierForm} layout="vertical" onFinish={saveTier}>
          <Form.Item name="academicYearId" label="Curso" rules={[{ required: true }]}>
            <Select options={years.map(y => ({ value: y.id, label: y.label }))} />
          </Form.Item>
          <Form.Item name="etapa" label="Etapa" rules={[{ required: true }]}>
            <Select options={[{ value: 'primaria', label: 'Primaria' }, { value: 'secundaria', label: 'Secundaria' }, { value: 'bachillerato', label: 'Bachillerato' }]} />
          </Form.Item>
          <Form.Item name="concept" label="Concepto" rules={[{ required: true }]}>
            <Select options={[{ value: 'mensualidad', label: 'Mensualidad' }, { value: 'matricula', label: 'Matrícula' }, { value: 'material', label: 'Material' }]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {() => tierForm.getFieldValue('concept') === 'mensualidad' ? (
              <Form.Item name="hours" label="Nº de horas/semana" rules={[{ required: true, message: 'Indica las horas del tramo' }]}
                tooltip="El tramo se aplica si las horas del alumno son ≥ a este valor (se coge el mayor que no las supere)">
                <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} addonAfter="h" />
              </Form.Item>
            ) : <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Matrícula/material: importe fijo por etapa (sin horas)." />}
          </Form.Item>
          <Form.Item name="amount" label="Importe (€)" rules={[{ required: true }]}><InputNumber min={0} step={0.5} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
```
> `Card`, `Modal`, `Form`, `Select`, `InputNumber`, `Popconfirm`, `Tag`, `Text`, `Alert`, `Button`, `PlusOutlined`, `SearchableTable`, `Ayuda` ya se usan en este fichero; no añadir imports.

- [ ] **Step 4: InscripcionDrawer — selector de etapa en la matrícula de Apoyo**

En `frontend/src/components/InscripcionDrawer.tsx`, dentro del `enrollments.map((en: any) => ...)` del modo edición (bloque que empieza en la línea 597). Añadir, justo después de la fila de Grupo/Estado (tras el `</Row>` de la línea 638, antes de cerrar el `</div>` de la tarjeta en 639), un selector de etapa solo si el servicio es Apoyo:

```tsx
                  {en.serviceCode === 'APOYO' && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Etapa (tarifa de Apoyo)</Text>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Primaria / Secundaria / Bachillerato"
                        value={en.apoyoLevel || undefined}
                        onChange={async (v) => {
                          try { await api.patch(`/enrollments/${en.id}`, { apoyoLevel: v }); message.success('Etapa actualizada'); reloadEnrollments(); }
                          catch { message.error('Error al cambiar la etapa'); }
                        }}
                        options={[
                          { value: 'primaria', label: 'Primaria' },
                          { value: 'secundaria', label: 'Secundaria' },
                          { value: 'bachillerato', label: 'Bachillerato' },
                        ]}
                      />
                    </div>
                  )}
```
> `Select`, `Text`, `message`, `api` ya están importados en este componente.

- [ ] **Step 5: Verificar build del frontend**

Run:
```bash
cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -15
```
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
GD="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$GD add frontend/src/App.tsx frontend/src/components/InscripcionDrawer.tsx
$GD commit -m "feat(secretaria): UI Apoyo - etapa/horas/cuota en tablero, editor de tramos y etapa en el alta

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Despliegue y verificación end-to-end

**Files:** ninguno (build + deploy).

**Interfaces:** Consume todo lo anterior. La migración 036 ya debe estar aplicada (Task 1, Step 4).

- [ ] **Step 1: Confirmar que la migración está aplicada en prod**

Run:
```bash
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "\df secretaria.fn_resolve_apoyo_fee" -c "SELECT count(*) FROM secretaria.apoyo_fee_tiers;"
```
Expected: la función existe y hay ≥ 3 tramos sembrados. (Si no, aplicar la migración ANTES de continuar.)

- [ ] **Step 2: Reconstruir y recrear el backend**

Run:
```bash
cd /opt/mw-secretaria/backend && docker build -t mw-secretaria-api:latest .
docker stop mw-secretaria-api && docker rm mw-secretaria-api
docker run -d --name mw-secretaria-api \
  --network mw-panel_mw-network \
  -p 127.0.0.1:3010:3010 \
  --env-file /opt/mw-secretaria/backend/.env \
  -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db \
  --restart unless-stopped \
  mw-secretaria-api:latest
sleep 6 && docker logs mw-secretaria-api 2>&1 | tail -5
```
Expected: imagen construida, contenedor `Up`, log "Secretaría API en puerto 3010" sin errores.

- [ ] **Step 3: Desplegar el frontend**

Run:
```bash
cd /opt/mw-secretaria/frontend && npm run build
sudo cp -r dist/* /opt/mw-secretaria/frontend-dist/
```
Expected: copia sin errores.

- [ ] **Step 4: Verificar la API (board y tramos) con un JWT firmado**

Run:
```bash
SUID=$(docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -tA -c "SELECT user_id FROM secretaria.staff_roles WHERE role='secretaria_admin' LIMIT 1;")
TOKEN=$(docker exec mw-secretaria-api node -e "console.log(require('jsonwebtoken').sign({sub:'$SUID',email:'x'},process.env.JWT_SECRET,{expiresIn:'5m'}))")
echo "--- fee-tiers ---"; curl -s http://127.0.0.1:3010/api/secretaria/apoyo/fee-tiers -H "Authorization: Bearer $TOKEN"
echo; echo "--- board (apoyoLevel/totalHours/monthlyFee presentes) ---"
curl -s http://127.0.0.1:3010/api/secretaria/apoyo/board -H "Authorization: Bearer $TOKEN" | head -c 600
```
Expected: `fee-tiers` devuelve los 3 tramos; `board` incluye `apoyoLevel`, `totalHours`, `monthlyFee` en pool/assignments.

- [ ] **Step 5: Prueba funcional real (asignar etapa a un alumno de Apoyo y comprobar cuota)**

Run (elige un enrollment de Apoyo del pool del board, sustituye `<ENR>`):
```bash
# Pon etapa primaria al enrollment y consulta su mensualidad resuelta
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "
UPDATE secretaria.enrollments SET apoyo_level='primaria' WHERE id='<ENR>';
SELECT secretaria.fn_resolve_monthly_fee('<ENR>') AS fee;"
```
Expected: si el alumno tiene franjas que suman ≥ 2h → 68,00; si suma < 2h y no hay tramo menor → NULL ("revisar"). (Es una verificación; el estado real lo gestiona Secretaría desde la UI.)

- [ ] **Step 6: No-regresión visible — otros servicios intactos**

Run:
```bash
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "
SELECT sv.code, count(*) FILTER (WHERE secretaria.fn_resolve_monthly_fee(e.id) IS NOT NULL) AS con_tarifa, count(*) AS total
FROM secretaria.enrollments e JOIN secretaria.services sv ON sv.id=e.service_id
WHERE e.status='matriculado' GROUP BY sv.code ORDER BY sv.code;"
```
Expected: Inglés/Danza/Escuela/Táper mantienen su proporción de tarifas resueltas como antes del cambio (Apoyo puede tener más NULL hasta asignar etapas — esperado).

- [ ] **Step 7: Push final**

```bash
GD="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$GD push origin HEAD
```
Expected: push correcto a `Digmusic88/MWPANEL-4.0`.

---

## Self-Review (cobertura del spec)

- §1 Modelo de datos → Task 1 (enum, columnas, tabla, índices). ✓
- §2 Cálculo (fn_resolve_apoyo_fee + ramas en monthly/concept, custom_fee gana, tramo mayor ≤ total) → Task 1 Steps 1/5; verificado en test SQL (Step 2/5). ✓
- §2.4 Réplica TS de previews → cubierto por usar `fn_resolve_monthly_fee` directamente en board/oneFull (Task 2 Steps 3/5); no se reimplementa el tramo en TS. ✓
- §3.1 Tablero (etapa, horas por franja, cuota) → Task 2 Step 3 + Task 3 Step 1. ✓
- §3.2 "Tarifas de Apoyo" (CRUD) → Task 2 Step 4 + Task 3 Step 3. ✓
- §3.3 Etapa en el alta/edición → Task 2 Step 5 + Task 3 Step 4. ✓
- §4 Generación de recibos sin cambios estructurales → las ramas APOYO en las funciones SQL hacen que `enrollments.controller` (matrícula/material al matricular) y `payments.controller` cojan la tarifa automáticamente; no se tocan esos emisores. ✓
- §5 Migración de datos (etapa NULL = revisar; hours default 1; siembra 2h) → Task 1 Steps 1/6. ✓
- §6 Despliegue (migración antes del rebuild) → Task 1 Step 4 + Task 4 Steps 1-2. ✓
- §7 Verificación → Task 1 Steps 5-6 + Task 4 Steps 4-6. ✓

Sin placeholders. Nombres consistentes: `apoyoLevel`/`apoyo_level`, `hours`, `totalHours`, `monthlyFee`, `fn_resolve_apoyo_fee`, `/apoyo/fee-tiers`, `/apoyo/assignment/:id/hours` usados igual en backend y frontend.
