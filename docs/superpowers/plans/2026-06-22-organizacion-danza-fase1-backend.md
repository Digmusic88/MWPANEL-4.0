# Organización de Danza — Fase 1 (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Facturar Danza por **total de días/semana** (tabla de tramos por defecto + override por grupo), con asignación de alumnos a **días concretos** (estilo Apoyo) y **maillot** cobrable por grupo una vez/año — todo correcto vía API, sin UI nueva todavía.

**Architecture:** Tablas nuevas `danza_assignments` (días por matrícula) y `danza_fee_tiers` (tramos), flag `groups.bills_maillot`. Funciones SQL `fn_resolve_danza_monthly`/`fn_resolve_danza_maillot` y `fn_resolve_monthly_fee` hecha Danza-aware, de modo que la matriz/recibos existentes usan la tarifa por tramos sin más cambios. Endpoints nuevos para tramos y asignaciones. Consolidación one-off de los grupos "1 día/2 días" del curso activo.

**Tech Stack:** PostgreSQL (schema `secretaria`, funciones plpgsql), NestJS 10 + TypeORM (raw `ds.query`), migraciones SQL aplicadas a mano a `mw-panel-db-prod`.

## Global Constraints
- **Producción**: BD compartida `mw-panel-db-prod` schema `secretaria`. Migraciones SQL a mano. **Backup antes de consolidar.** Pasos que tocan prod (migraciones/consolidación/deploy/verificación) los ejecuta el CONTROLADOR, no los subagentes.
- **Unidad** = días/semana. **Total días** = `count(danza_assignments)` de la matrícula. **Grupos** = distinct group_id.
- **Tarifa**: si `count(distinct grupos)=1` y existe tier override `(group_id, days=total)` → su amount; si no → tier default `(group_id NULL, days=total)`; NULL si no existe ese tramo.
- **Maillot**: 10€ (de `fee_schedules` concept `maillot` servicio DANZA) UNA vez/año si EXISTS algún assignment con grupo `bills_maillot=true`.
- **enrollments.group_id** de Danza = un grupo representativo de sus assignments (NULL si ninguno) — para que `fn_resolve_month_amount` resuelva el factor de mes.
- **Solo curso activo en adelante**; NO tocar 2025-2026.
- **Git**: `export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria` antes de cualquier git; NO push (controlador hace push por fase).
- **Deploy API**: `docker build -t mw-secretaria-api:latest backend && docker rm -f mw-secretaria-api && docker run -d --name mw-secretaria-api --network mw-panel_mw-network -p 127.0.0.1:3010:3010 --env-file backend/.env -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db:ro --restart unless-stopped mw-secretaria-api:latest`.

---

## Estructura de ficheros
- `migrations/031_danza_model.sql` — tablas + bills_maillot + seed tiers (CREATE, idempotente).
- `migrations/032_danza_fee_functions.sql` — `fn_resolve_danza_monthly`, `fn_resolve_danza_maillot`, y `CREATE OR REPLACE fn_resolve_monthly_fee` Danza-aware.
- `backend/src/modules/danza/danza.module.ts`, `danza.controller.ts` — endpoints tiers + board + assignments.
- `backend/src/modules/danza/danza.controller.ts` registra en `app.module.ts`.
- `backend/src/modules/catalog/entities.ts` — Group: `billsMaillot`.
- `backend/src/modules/catalog/catalog.controller.ts` — `updateGroup`/`createGroup` aceptan `billsMaillot`.
- `backend/src/modules/payments/payments.controller.ts` — generate-course-charges (maillot Danza) + matrix (columna Maillot).
- `scripts/danza-consolidate.sql` — one-off de consolidación (controlador).

---

## Task 1: Migración del modelo de datos (tablas + flag + seed tiers)

**Files:** Create `migrations/031_danza_model.sql`

**Interfaces:**
- Produces: tablas `secretaria.danza_assignments`, `secretaria.danza_fee_tiers`; columna `secretaria.groups.bills_maillot`; tiers default `1→30,2→50` y override Negro A `1→35,2→55` (si existe el grupo consolidado; si no, se siembran en Task 2).

- [ ] **Step 1: Escribir la migración**
```sql
-- migrations/031_danza_model.sql
CREATE TABLE IF NOT EXISTS secretaria.danza_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES secretaria.enrollments(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES secretaria.groups(id) ON DELETE CASCADE,
  weekday int NOT NULL,
  start_time time NOT NULL,
  room varchar,
  UNIQUE (enrollment_id, group_id, weekday, start_time)
);
CREATE INDEX IF NOT EXISTS idx_danza_assign_enr ON secretaria.danza_assignments(enrollment_id);

CREATE TABLE IF NOT EXISTS secretaria.danza_fee_tiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES secretaria.groups(id) ON DELETE CASCADE,  -- NULL = por defecto
  days int NOT NULL,
  amount numeric(8,2) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS danza_tier_default ON secretaria.danza_fee_tiers(days) WHERE group_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS danza_tier_group   ON secretaria.danza_fee_tiers(group_id, days) WHERE group_id IS NOT NULL;

ALTER TABLE secretaria.groups ADD COLUMN IF NOT EXISTS bills_maillot boolean NOT NULL DEFAULT false;

-- Tiers por defecto de Danza (1 día=30, 2 días=50). Overrides por grupo se siembran tras consolidar (Task 2).
INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount)
SELECT NULL, v.days, v.amount FROM (VALUES (1, 30.00), (2, 50.00)) AS v(days, amount)
WHERE NOT EXISTS (SELECT 1 FROM secretaria.danza_fee_tiers WHERE group_id IS NULL AND days=v.days);
```

- [ ] **Step 2 (CONTROLADOR): aplicar y verificar**
Run:
```bash
cat /opt/mw-secretaria/migrations/031_danza_model.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT days, amount FROM secretaria.danza_fee_tiers WHERE group_id IS NULL ORDER BY days;"
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "\d secretaria.danza_assignments" | grep -c enrollment_id
```
Expected: `CREATE TABLE`/`ALTER TABLE`; tiers default `1|30.00` y `2|50.00`; tabla creada.

- [ ] **Step 3: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add migrations/031_danza_model.sql
git commit -m "feat(secretaria): modelo Danza (danza_assignments, danza_fee_tiers, groups.bills_maillot, seed tiers)"
```

---

## Task 2: Consolidación de grupos/programas Danza (one-off, CONTROLADOR)

**Files:** Create `scripts/danza-consolidate.sql`

**Interfaces:**
- Consumes: tablas de Task 1.
- Produces: grupos únicos del curso activo ("Grupo Negro A", "Resto grupos"/"Morado") con sus matrículas re-apuntadas; programas redundantes "1 día/2 días" eliminados o fusionados; override de tiers para Negro A `1→35,2→55`.

- [ ] **Step 1: Backup (CONTROLADOR)**
Run: `cd /opt/mw-secretaria && ./scripts/backup-secretaria.sh manual`
Expected: `OK [manual]`.

- [ ] **Step 2: Escribir el script de consolidación**
Estrategia (curso activo `is_active=true` únicamente): para cada par "X 1 día"/"X 2 días", conservar UNO como grupo canónico (renombrarlo a "X" sin el sufijo de días), re-apuntar `enrollments.group_id` del redundante al canónico, borrar el redundante. Igual con sus programas (conservar uno, renombrar a sin sufijo, re-apuntar groups.program_id, borrar el redundante). Sembrar override de tiers de Negro A.
```sql
-- scripts/danza-consolidate.sql  (idempotente por nombres; SOLO curso activo)
DO $$
DECLARE
  v_year uuid; v_neg_canon uuid; v_neg_dup uuid; v_resto_canon uuid; v_resto_dup uuid;
  v_prog_neg uuid; v_prog_resto uuid;
BEGIN
  SELECT id INTO v_year FROM secretaria.academic_years WHERE is_active LIMIT 1;

  -- NEGRO A: canónico = "Grupo Negro A 1 día"
  SELECT id INTO v_neg_canon FROM secretaria.groups WHERE academic_year_id=v_year AND name='Grupo Negro A 1 día';
  SELECT id INTO v_neg_dup   FROM secretaria.groups WHERE academic_year_id=v_year AND name='Grupo Negro A 2 días';
  IF v_neg_canon IS NOT NULL THEN
    UPDATE secretaria.enrollments SET group_id=v_neg_canon WHERE group_id=v_neg_dup;
    UPDATE secretaria.schedule_slots SET group_id=v_neg_canon WHERE group_id=v_neg_dup;
    DELETE FROM secretaria.groups WHERE id=v_neg_dup;
    UPDATE secretaria.groups SET name='Grupo Negro A' WHERE id=v_neg_canon;
    -- override tiers Negro A
    INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount)
    SELECT v_neg_canon, v.days, v.amount FROM (VALUES (1,35.00),(2,55.00)) AS v(days,amount)
    WHERE NOT EXISTS (SELECT 1 FROM secretaria.danza_fee_tiers WHERE group_id=v_neg_canon AND days=v.days);
  END IF;

  -- MORADO / Resto: canónico = "Morado 1 día"
  SELECT id INTO v_resto_canon FROM secretaria.groups WHERE academic_year_id=v_year AND name='Morado 1 día';
  SELECT id INTO v_resto_dup   FROM secretaria.groups WHERE academic_year_id=v_year AND name='Morado 2 días';
  IF v_resto_canon IS NOT NULL THEN
    UPDATE secretaria.enrollments SET group_id=v_resto_canon WHERE group_id=v_resto_dup;
    UPDATE secretaria.schedule_slots SET group_id=v_resto_canon WHERE group_id=v_resto_dup;
    DELETE FROM secretaria.groups WHERE id=v_resto_dup;
    UPDATE secretaria.groups SET name='Morado' WHERE id=v_resto_canon;
  END IF;
END $$;
```
NOTA implementador: confirmar los nombres exactos con `SELECT name FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id JOIN secretaria.services s ON s.id=p.service_id WHERE s.code='DANZA' AND g.academic_year_id=(SELECT id FROM secretaria.academic_years WHERE is_active);` y ajustar el script si difieren. Los programas "1/2 días" pueden quedarse (no estorban: la tarifa ya no sale del programa); NO se borran para no romper FKs del año cerrado.

- [ ] **Step 3 (CONTROLADOR): aplicar y verificar**
Run:
```bash
cat /opt/mw-secretaria/scripts/danza-consolidate.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT g.name, g.bills_maillot FROM secretaria.groups g JOIN secretaria.academic_years ay ON ay.id=g.academic_year_id JOIN secretaria.programs p ON p.id=g.program_id JOIN secretaria.services s ON s.id=p.service_id WHERE ay.is_active AND s.code='DANZA' ORDER BY 1;"
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT g.name, t.days, t.amount FROM secretaria.danza_fee_tiers t JOIN secretaria.groups g ON g.id=t.group_id ORDER BY 1,2;"
```
Expected: grupos "Grupo Negro A", "Morado" (sin sufijo de días); override Negro A `1|35.00`,`2|55.00`.

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add scripts/danza-consolidate.sql
git commit -m "chore(secretaria): script de consolidacion de grupos Danza (curso activo)"
```

---

## Task 3: Funciones de resolución de tarifa Danza (SQL)

**Files:** Create `migrations/032_danza_fee_functions.sql`

**Interfaces:**
- Produces: `fn_resolve_danza_monthly(uuid) RETURNS numeric`, `fn_resolve_danza_maillot(uuid) RETURNS numeric`, y `fn_resolve_monthly_fee(uuid)` Danza-aware (delega en danza_monthly para servicio DANZA, resto igual que antes).

- [ ] **Step 1: Escribir las funciones**
```sql
-- migrations/032_danza_fee_functions.sql
CREATE OR REPLACE FUNCTION secretaria.fn_resolve_danza_monthly(p_enrollment_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v_days int; v_groups int; v_only_group uuid; v_amount numeric;
BEGIN
  SELECT count(*), count(DISTINCT group_id), min(group_id)
    INTO v_days, v_groups, v_only_group
  FROM secretaria.danza_assignments WHERE enrollment_id=p_enrollment_id;
  IF v_days = 0 THEN RETURN NULL; END IF;
  -- override de grupo solo si TODOS los días son de un único grupo
  IF v_groups = 1 THEN
    SELECT amount INTO v_amount FROM secretaria.danza_fee_tiers
    WHERE group_id=v_only_group AND days=v_days;
    IF v_amount IS NOT NULL THEN RETURN v_amount; END IF;
  END IF;
  -- por defecto
  SELECT amount INTO v_amount FROM secretaria.danza_fee_tiers
  WHERE group_id IS NULL AND days=v_days;
  RETURN v_amount; -- NULL si no hay tramo para ese nº de días
END; $$;

CREATE OR REPLACE FUNCTION secretaria.fn_resolve_danza_maillot(p_enrollment_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE v_year uuid; v_amount numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM secretaria.danza_assignments da JOIN secretaria.groups g ON g.id=da.group_id
    WHERE da.enrollment_id=p_enrollment_id AND g.bills_maillot=true
  ) THEN RETURN NULL; END IF;
  SELECT e.academic_year_id INTO v_year FROM secretaria.enrollments e WHERE e.id=p_enrollment_id;
  SELECT amount INTO v_amount FROM secretaria.fee_schedules fs
  JOIN secretaria.services s ON s.id=fs.service_id
  WHERE fs.academic_year_id=v_year AND fs.concept='maillot' AND fs.is_active AND s.code='DANZA'
  ORDER BY amount DESC LIMIT 1;
  RETURN v_amount;
END; $$;
```
Y reemplazar `fn_resolve_monthly_fee` para que delegue en Danza (mantener TODO el cuerpo actual y añadir el atajo al principio, tras leer datos de la matrícula):
```sql
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

  -- (resto: igual que antes) por grupo
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
```
NOTA: `v_custom` (override manual de matrícula) tiene prioridad incluso en Danza (se respeta antes del atajo).

- [ ] **Step 2 (CONTROLADOR): aplicar y verificar con datos reales**
Run (aplica y prueba: alumno con 1 día Negro A → 35; 2 días Negro A → 55; mezcla 2 días/2 grupos → 50):
```bash
cat /opt/mw-secretaria/migrations/032_danza_fee_functions.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
# (verificación con asignaciones de prueba se hace en Task 6 end-to-end)
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT proname FROM pg_proc WHERE proname IN ('fn_resolve_danza_monthly','fn_resolve_danza_maillot');"
```
Expected: `CREATE FUNCTION` ×3; las 2 funciones danza listadas. Comportamiento Inglés intacto (no DANZA → ruta antigua).

- [ ] **Step 3: Verificar que NO rompe Inglés (CONTROLADOR)**
Run: comprobar que una matrícula de Inglés sigue resolviendo su mensualidad como antes:
```bash
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT secretaria.fn_resolve_monthly_fee(e.id) FROM secretaria.enrollments e JOIN secretaria.services s ON s.id=e.service_id WHERE s.code='INGLES' AND e.status='matriculado' LIMIT 1;"
```
Expected: un importe no nulo (p.ej. 68/70), igual que antes.

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add migrations/032_danza_fee_functions.sql
git commit -m "feat(secretaria): fn_resolve Danza por tramos + maillot; fn_resolve_monthly_fee Danza-aware"
```

---

## Task 4: Group.billsMaillot en entidad + endpoints catalog

**Files:** Modify `backend/src/modules/catalog/entities.ts`, `backend/src/modules/catalog/catalog.controller.ts`

**Interfaces:**
- Consumes: columna `groups.bills_maillot` (Task 1).
- Produces: `PATCH /catalog/groups/:id` y `POST /catalog/groups` aceptan y persisten `billsMaillot`.

- [ ] **Step 1: Añadir el campo a la entidad Group**
En `entities.ts`, clase `Group`, añadir tras `notes`:
```typescript
  @Column({ name: 'bills_maillot', default: false }) billsMaillot: boolean;
```

- [ ] **Step 2: updateGroup/createGroup ya aceptan Partial<Group>**
`createGroup`/`updateGroup` reciben `Partial<Group> & {...}` y hacen `this.groups.create/update(groupData)` — `billsMaillot` (mapeado a `bills_maillot`) se persiste automáticamente al estar en la entidad. No requiere más cambios. Verificar que `groupData` no filtra el campo (no lo filtra; solo extrae customFeeMonthly/customFeeMatricula).

- [ ] **Step 3: Compilar**
Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: limpio.

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/catalog/entities.ts
git commit -m "feat(secretaria): Group.billsMaillot (toggle maillot por grupo)"
```

---

## Task 5: Módulo `danza` — tramos (tiers) CRUD

**Files:** Create `backend/src/modules/danza/danza.module.ts`, `backend/src/modules/danza/danza.controller.ts`; Modify `backend/src/app.module.ts`

**Interfaces:**
- Produces:
  - `GET /api/secretaria/danza/tiers?groupId?` → `[{ id, groupId, days, amount }]` (si groupId: sus overrides; si no: los default group_id NULL).
  - `POST /api/secretaria/danza/tiers {groupId?, days, amount}` → upsert (ON CONFLICT por índice parcial; ver nota) → `{ ok:true }`.
  - `DELETE /api/secretaria/danza/tiers/:id` → `{ ok:true }`.

- [ ] **Step 1: Crear el controlador**
```typescript
// backend/src/modules/danza/danza.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

@Controller('secretaria/danza')
@UseGuards(SecretariaAuthGuard)
export class DanzaController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  @Get('tiers')
  async tiers(@Query('groupId') groupId?: string) {
    if (groupId) {
      return this.ds.query(`SELECT id, group_id AS "groupId", days, amount FROM secretaria.danza_fee_tiers WHERE group_id=$1 ORDER BY days`, [groupId]);
    }
    return this.ds.query(`SELECT id, group_id AS "groupId", days, amount FROM secretaria.danza_fee_tiers WHERE group_id IS NULL ORDER BY days`);
  }

  @Post('tiers') @Roles('secretaria_admin','secretaria_staff','direccion')
  async setTier(@Body() b: { groupId?: string | null; days: number; amount: number }) {
    if (!b.days || b.days < 1) return { ok: false, error: 'Nº de días inválido' };
    // upsert manual (índices parciales no admiten ON CONFLICT con NULL fácilmente)
    if (b.groupId) {
      await this.ds.query(`DELETE FROM secretaria.danza_fee_tiers WHERE group_id=$1 AND days=$2`, [b.groupId, b.days]);
      await this.ds.query(`INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount) VALUES ($1,$2,$3)`, [b.groupId, b.days, b.amount]);
    } else {
      await this.ds.query(`DELETE FROM secretaria.danza_fee_tiers WHERE group_id IS NULL AND days=$1`, [b.days]);
      await this.ds.query(`INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount) VALUES (NULL,$1,$2)`, [b.days, b.amount]);
    }
    return { ok: true };
  }

  @Delete('tiers/:id') @Roles('secretaria_admin','secretaria_staff','direccion')
  async delTier(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.danza_fee_tiers WHERE id=$1`, [id]);
    return { ok: true };
  }
}
```

- [ ] **Step 2: Crear el módulo y registrarlo**
```typescript
// backend/src/modules/danza/danza.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRole } from '../../common/staff-role.entity';
import { DanzaController } from './danza.controller';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  controllers: [DanzaController],
})
export class DanzaModule {}
```
En `app.module.ts`: `import { DanzaModule } from './modules/danza/danza.module';` y añadir `DanzaModule` al array `imports`.
(NOTA: comprobar cómo registran otros módulos el guard — la mayoría sólo declara el controller y el guard se resuelve por DI global; seguir el patrón de `apoyo.module.ts`.)

- [ ] **Step 3: Compilar**
Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: limpio.

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/danza backend/src/app.module.ts
git commit -m "feat(secretaria): modulo danza con CRUD de tramos de tarifa"
```

---

## Task 6: Módulo `danza` — board + asignaciones por días

**Files:** Modify `backend/src/modules/danza/danza.controller.ts`

**Interfaces:**
- Consumes: `danza_assignments`, `fn_resolve_danza_monthly`, `fn_resolve_danza_maillot`.
- Produces:
  - `GET /danza/board?academicYearId` → `{ groups:[{id,name,room,color,schedule:[{weekday,startTime,room}]}], students:[{enrollmentId, studentName, assignments:[{id,groupId,weekday,startTime,room}], totalDays, monthly, maillot}], pool:[{enrollmentId, studentName}] }` (pool = matrículas Danza sin assignments).
  - `POST /danza/assign {enrollmentId, groupId, weekday, startTime, room?}` → crea assignment; **actualiza enrollments.group_id** = ese groupId si estaba NULL → `{ ok:true }`.
  - `DELETE /danza/assignment/:id` → borra; si la matrícula se queda sin assignments, pone `enrollments.group_id` = NULL; si no, = un group_id de los restantes → `{ ok:true }`.

- [ ] **Step 1: Añadir los endpoints al controlador**
```typescript
  @Get('board')
  async board(@Query('academicYearId') yearId: string) {
    const danzaSvc = await this.ds.query(`SELECT id FROM secretaria.services WHERE code='DANZA' LIMIT 1`);
    const svcId = danzaSvc[0]?.id;
    const groups = await this.ds.query(`
      SELECT g.id, g.name, g.room, g.color, g.bills_maillot AS "billsMaillot",
        COALESCE((SELECT json_agg(json_build_object('weekday', ss.weekday, 'startTime', to_char(ss.start_time,'HH24:MI'), 'room', ss.room) ORDER BY ss.weekday, ss.start_time)
                  FROM secretaria.schedule_slots ss WHERE ss.group_id=g.id), '[]') AS schedule
      FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id
      WHERE g.academic_year_id=$1 AND p.service_id=$2 ORDER BY g.sort_order, g.name`, [yearId, svcId]);
    const students = await this.ds.query(`
      SELECT e.id AS "enrollmentId",
        COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
        secretaria.fn_resolve_danza_monthly(e.id) AS monthly,
        secretaria.fn_resolve_danza_maillot(e.id) AS maillot,
        COALESCE((SELECT json_agg(json_build_object('id', da.id, 'groupId', da.group_id, 'weekday', da.weekday, 'startTime', to_char(da.start_time,'HH24:MI'), 'room', da.room) ORDER BY da.weekday, da.start_time)
                  FROM secretaria.danza_assignments da WHERE da.enrollment_id=e.id), '[]') AS assignments
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status IN ('matriculado','preinscrito','lista_espera','pendiente')
      ORDER BY "studentName"`, [yearId, svcId]);
    const withDays = students.map((s: any) => ({ ...s, totalDays: (s.assignments || []).length }));
    return {
      groups,
      students: withDays.filter((s: any) => s.totalDays > 0),
      pool: withDays.filter((s: any) => s.totalDays === 0).map((s: any) => ({ enrollmentId: s.enrollmentId, studentName: s.studentName })),
    };
  }

  @Post('assign') @Roles('secretaria_admin','secretaria_staff','direccion')
  async assign(@Body() b: { enrollmentId: string; groupId: string; weekday: number; startTime: string; room?: string }) {
    await this.ds.query(
      `INSERT INTO secretaria.danza_assignments(enrollment_id, group_id, weekday, start_time, room)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (enrollment_id, group_id, weekday, start_time) DO NOTHING`,
      [b.enrollmentId, b.groupId, b.weekday, b.startTime, b.room || null]);
    // mantener enrollments.group_id = grupo representativo (si está NULL)
    await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1 AND group_id IS NULL`, [b.enrollmentId, b.groupId]);
    return { ok: true };
  }

  @Delete('assignment/:id') @Roles('secretaria_admin','secretaria_staff','direccion')
  async delAssignment(@Param('id') id: string) {
    const rows = await this.ds.query(`DELETE FROM secretaria.danza_assignments WHERE id=$1 RETURNING enrollment_id`, [id]);
    const enr = rows[0]?.enrollment_id;
    if (enr) {
      const rest = await this.ds.query(`SELECT group_id FROM secretaria.danza_assignments WHERE enrollment_id=$1 LIMIT 1`, [enr]);
      await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1`, [enr, rest[0]?.group_id || null]);
    }
    return { ok: true };
  }
```

- [ ] **Step 2: Compilar**
Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: limpio.

- [ ] **Step 3 (CONTROLADOR): deploy API + verificación end-to-end de la tarifa por días**
Tras deploy, con un JWT admin y un par de matrículas Danza del curso activo: asignar 1 día Negro A → `monthly=35`; 2 días Negro A → `monthly=55`; 1 día Negro A + 1 día Morado → `monthly=50` (default 2 días); quitar todo → `monthly=NULL`. Limpiar las asignaciones de prueba. Comprobar maillot tras activar `bills_maillot` en Negro A: `maillot=10`.

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/danza/danza.controller.ts
git commit -m "feat(secretaria): board y asignaciones por dias de Danza"
```

---

## Task 7: Pagos — maillot Danza en generación + columna Maillot en la matriz

**Files:** Modify `backend/src/modules/payments/payments.controller.ts`

**Interfaces:**
- Consumes: `fn_resolve_danza_maillot`.
- Produces: `generate-course-charges` crea el recibo `maillot` (sin periodo) para matrículas Danza con `fn_resolve_danza_maillot>0` (una vez, NOT EXISTS). `GET /payments/matrix` incluye columna `{ key:'maillot', label:'Maillot', concept:'maillot' }` y los charges de concepto maillot.

- [ ] **Step 1: Añadir generación del maillot en generate-course-charges**
En `generate-course-charges`, junto al bloque de matrícula/material (concept sin periodo), añadir un bloque para maillot SOLO Danza:
```typescript
// Maillot (Danza): una vez, si la matrícula tiene algún grupo con bills_maillot
await this.ds.query(`
  INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
  SELECT e.id, NULL, 'maillot', secretaria.fn_resolve_danza_maillot(e.id), 'pendiente'
  FROM secretaria.enrollments e
  JOIN secretaria.services s ON s.id=e.service_id
  WHERE e.academic_year_id=$1 AND e.status='matriculado' AND s.code='DANZA'
    AND secretaria.fn_resolve_danza_maillot(e.id) IS NOT NULL
    AND secretaria.fn_resolve_danza_maillot(e.id) > 0
    AND NOT EXISTS (SELECT 1 FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.concept='maillot')`,
  [b.academicYearId]);
```
(Insertarlo dentro del mismo método, tras los bucles de matrícula/material existentes.)

- [ ] **Step 2: Añadir la columna Maillot a la matriz**
En `matrix`, en `const columns = [...]`, añadir tras 'material':
```typescript
      { key: 'maillot', label: 'Maillot', concept: 'maillot' },
```
El render ya agrupa charges por `concept` (no-mensualidad usan `c.concept` como key), así que los charges maillot caen en `byEnroll[enr]['maillot']` y se pintan con la columna nueva. No requiere más cambios en la query de charges (ya trae todos los concepts).

- [ ] **Step 3: Compilar**
Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: limpio.

- [ ] **Step 4 (CONTROLADOR): deploy + verificación**
Tras deploy: activar `bills_maillot` en un grupo Danza, asignar días a un alumno matriculado, `generate-course-charges` del curso, comprobar que se crea 1 recibo maillot 10€ y que `matrix` lo muestra en la columna Maillot. Verificar que ejecutar generate dos veces NO duplica el maillot. Limpiar datos de prueba.

- [ ] **Step 5: Commit y push de la Fase 1**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/payments/payments.controller.ts
git commit -m "feat(secretaria): maillot Danza en generacion de recibos + columna Maillot en matriz"
git push
```

---

## Self-review (cobertura del spec)
- Modelo de datos (danza_assignments, danza_fee_tiers, bills_maillot) → Task 1. ✓
- Consolidación grupos → Task 2. ✓
- Resolución por tramos + mezcla→default + maillot + Danza-aware + factor mes vía group_id representativo → Task 3 (+ group_id en Task 6). ✓
- Maillot toggle por grupo → Task 4 (entidad) + Task 6 (board lo expone) + UI en Fase 2.
- Endpoints tiers/board/assign → Tasks 5, 6. ✓
- Pagos: maillot generado + columna → Task 7. ✓
- enrollments.group_id representativo mantenido → Task 6. ✓
- Solo curso activo, 2025-2026 intacto → Task 2 (filtra is_active). ✓

## Fase 2 (plan aparte, tras Fase 1)
Sección UI "Danza" (tablero por días arrastrable + horario por aulas), switch maillot en editor de grupo, editor de tramos (default + por grupo), y la columna Maillot ya saldrá en Pagos. Se redactará su propio plan.
