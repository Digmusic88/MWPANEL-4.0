# Apoyo con grupos flexibles (estilo Danza) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar Apoyo para que funcione como Danza (kanban de grupos con nombre; el alumno se apunta a franjas día/hora de un grupo, con sus horas), conservando la tarifa por nivel+horas que ya existe.

**Architecture:** Se añade `group_id` a `secretaria.apoyo_assignments`; el controlador `apoyo.controller.ts` se reescribe espejando `danza.controller.ts` (board `{groups, students}`, assign con upsert de horas, borrado con grupo representativo) manteniendo tarifas/horas/nivel; el frontend `ApoyoBoard` pasa de rejilla a kanban (espejo de `DanzaBoard`) con un nuevo `ApoyoSlotsModal` (franjas del grupo + horas); la ficha gana un detalle de Apoyo.

**Tech Stack:** NestJS 10 (raw `ds.query`), TypeORM DataSource, Postgres schema `secretaria`, React 18 + Ant Design en `frontend/src/App.tsx` (fichero único). Sin tests unitarios (los controladores raw-SQL no los tienen): verificación por build + curl/SQL.

## Global Constraints

- Migraciones: `/opt/mw-secretaria/migrations/NNN_*.sql` idempotentes (`IF NOT EXISTS`/`CREATE OR REPLACE`), aplicadas a mano: `cat fichero | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel`. Backup `pg_dump -n secretaria` antes. Próximo nº libre: **037**.
- Git (split git-dir): `git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria <cmd>`, remoto `origin`. Commit+push en cada cambio.
- Despliegue Secretaría (ver memoria deploy): migración a mano → rebuild backend (`docker build -t mw-secretaria-api:latest .` + el `docker run` COMPLETO con `-v .../database.db:/mocks/database.db`) → frontend `npm run build` + `sudo cp -r dist/* /opt/mw-secretaria/frontend-dist/`.
- La tarifa de Apoyo NO se toca: `fn_resolve_apoyo_fee` ya suma `apoyo_assignments.hours` por nivel; añadir `group_id` no la afecta.
- Las franjas de los grupos viven en `secretaria.schedule_slots` (módulo `schedule`, prefijo `secretaria/schedule`), reutilizadas tal cual. El CRUD de grupos es `catalog.controller` (reutilizado tal cual).
- `apoyo_slots` (franjas globales) queda sin uso (no se borra).

---

### Task 1: Migración 037 — `group_id` en `apoyo_assignments`

**Files:**
- Create: `/opt/mw-secretaria/migrations/037_apoyo_groups.sql`

**Interfaces:**
- Produces: columna `secretaria.apoyo_assignments.group_id uuid` (FK groups) + índice único `(enrollment_id, group_id, weekday, slot_time)` — consumido por el controlador (Task 2).

- [ ] **Step 1: Backup**

```bash
docker exec mw-panel-db-prod pg_dump -U mwpanel -n secretaria mwpanel | gzip > /opt/mw-secretaria/pre-037-$(date +%Y%m%d_%H%M%S).sql.gz
ls -la /opt/mw-secretaria/pre-037-*.sql.gz | tail -1
```
Expected: fichero creado.

- [ ] **Step 2: Escribir la migración**

Crear `/opt/mw-secretaria/migrations/037_apoyo_groups.sql`:
```sql
-- 037_apoyo_groups.sql — Apoyo con grupos flexibles (estilo Danza). Idempotente.
ALTER TABLE secretaria.apoyo_assignments
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES secretaria.groups(id) ON DELETE CASCADE;

-- Unicidad para el upsert ON CONFLICT del assign (enrollment + grupo + día + hora)
CREATE UNIQUE INDEX IF NOT EXISTS apoyo_assign_uniq
  ON secretaria.apoyo_assignments (enrollment_id, group_id, weekday, slot_time);
CREATE INDEX IF NOT EXISTS idx_apoyo_assign_group
  ON secretaria.apoyo_assignments (group_id);
-- Nota: hay 0 filas en apoyo_assignments → nada que migrar.
```

- [ ] **Step 3: Aplicar**

```bash
cat /opt/mw-secretaria/migrations/037_apoyo_groups.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
```
Expected: `ALTER TABLE`, `CREATE INDEX` (x2) sin error.

- [ ] **Step 4: Verificar**

```bash
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT column_name FROM information_schema.columns WHERE table_schema='secretaria' AND table_name='apoyo_assignments' AND column_name='group_id';"
```
Expected: `group_id`.

- [ ] **Step 5: Commit + push**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add migrations/037_apoyo_groups.sql
$G commit -m "feat(apoyo): migración 037 group_id en apoyo_assignments"
$G push origin HEAD
```

---

### Task 2: Backend — reescribir `apoyo.controller.ts` a modelo grupo

**Files:**
- Modify (rewrite endpoints): `/opt/mw-secretaria/backend/src/modules/apoyo/apoyo.controller.ts`

**Interfaces:**
- Consumes: `secretaria.apoyo_assignments.group_id` (Task 1); `fn_resolve_monthly_fee` (existente); `secretaria.schedule_slots`.
- Produces (consumido por frontend Tasks 3-5):
  - `GET /apoyo/board?academicYearId` → `{ groups: {id,name,room,color,schedule:[{weekday,startTime,room}]}[], students: {enrollmentId,status,comment,apoyoLevel,studentName,monthly,assignments:[{id,groupId,weekday,startTime,hours}],totalHours}[] }`
  - `GET /apoyo/student/:enrollmentId` → `{ apoyoLevel, monthly, totalHours, assignments:[{id,groupId,groupName,weekday,slotTime,hours}] }`
  - `POST /apoyo/assign { enrollmentId, groupId, weekday, slotTime, hours?, room? }` (upsert horas)
  - `DELETE /apoyo/assignment/:id`, `DELETE /apoyo/assignments?enrollmentId&groupId`, `PATCH /apoyo/assignment/:id/hours { hours }`
  - `GET/POST/PATCH/DELETE /apoyo/fee-tiers` (se mantienen igual)

- [ ] **Step 1: Reemplazar el contenido del controlador**

Sustituir el fichero completo por (mantiene fee-tiers y hours; reemplaza board/assign/borrado por el modelo grupo; elimina slots/move/setRoom):
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsUUID, IsOptional, IsNumber, IsIn, IsBoolean, Min } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

class FeeTierDto {
  @IsUUID() academicYearId: string;
  @IsIn(['primaria','secundaria','bachillerato']) etapa: string;
  @IsIn(['mensualidad','matricula','material']) concept: string;
  @IsOptional() @IsNumber() hours?: number | null;
  @IsNumber() @Min(0) amount: number;
}
class UpdateFeeTierDto {
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsNumber() hours?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('secretaria/apoyo')
@UseGuards(SecretariaAuthGuard)
export class ApoyoController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async ctx(yearId?: string) {
    const yid = yearId || (await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`).then(r => r[0]?.id));
    const sid = await this.ds.query(`SELECT id FROM secretaria.services WHERE code='APOYO' LIMIT 1`).then(r => r[0]?.id);
    return { yid, sid };
  }

  // Tablero kanban de Apoyo: grupos con nombre + alumnos (estilo Danza; con horas y nivel)
  @Get('board') @Roles('secretaria_admin','secretaria_staff','direccion')
  async board(@Query('academicYearId') yearId?: string) {
    const { yid, sid } = await this.ctx(yearId);
    const groups = await this.ds.query(`
      SELECT g.id, g.name, g.room, g.color,
        COALESCE((SELECT json_agg(json_build_object('weekday', ss.weekday, 'startTime', to_char(ss.start_time,'HH24:MI'), 'room', ss.room) ORDER BY ss.weekday, ss.start_time)
                  FROM secretaria.schedule_slots ss WHERE ss.group_id=g.id), '[]'::json) AS schedule
      FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id
      WHERE g.academic_year_id=$1 AND p.service_id=$2 ORDER BY g.sort_order, g.name`, [yid, sid]);
    const studentsRaw = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.status, e.notes AS comment, e.apoyo_level AS "apoyoLevel",
        COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
        secretaria.fn_resolve_monthly_fee(e.id) AS monthly,
        COALESCE((SELECT json_agg(json_build_object('id', a.id, 'groupId', a.group_id, 'weekday', a.weekday, 'startTime', a.slot_time, 'hours', a.hours) ORDER BY a.weekday, a.slot_time)
                  FROM secretaria.apoyo_assignments a WHERE a.enrollment_id=e.id), '[]'::json) AS assignments
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status IN ('matriculado','preinscrito','lista_espera','pendiente')
      ORDER BY "studentName"`, [yid, sid]);
    const students = studentsRaw.map((s: any) => ({ ...s, totalHours: (s.assignments || []).reduce((sum: number, a: any) => sum + Number(a.hours || 0), 0) }));
    return { groups, students };
  }

  // Detalle de Apoyo de un alumno (para la ficha)
  @Get('student/:enrollmentId') @Roles('secretaria_admin','secretaria_staff','direccion')
  async studentDetail(@Param('enrollmentId') enrollmentId: string) {
    const assignments = await this.ds.query(`
      SELECT a.id, a.group_id AS "groupId", g.name AS "groupName", a.weekday, a.slot_time AS "slotTime", a.hours
      FROM secretaria.apoyo_assignments a JOIN secretaria.groups g ON g.id=a.group_id
      WHERE a.enrollment_id=$1 ORDER BY a.weekday, a.slot_time`, [enrollmentId]);
    const meta = await this.ds.query(`SELECT apoyo_level AS "apoyoLevel", secretaria.fn_resolve_monthly_fee(id) AS monthly FROM secretaria.enrollments WHERE id=$1`, [enrollmentId]);
    const totalHours = assignments.reduce((sum: number, a: any) => sum + Number(a.hours || 0), 0);
    return { apoyoLevel: meta[0]?.apoyoLevel || null, monthly: meta[0]?.monthly ?? null, totalHours, assignments };
  }

  // Asignar (o actualizar horas de) un alumno a una franja de un grupo
  @Post('assign') @Roles('secretaria_admin','secretaria_staff')
  async assign(@Body() b: { enrollmentId: string; groupId: string; weekday: number; slotTime: string; hours?: number; room?: string }) {
    const chk = await this.ds.query(`
      SELECT 1 FROM secretaria.enrollments e JOIN secretaria.services se ON se.id=e.service_id
      JOIN secretaria.groups g ON g.id=$2 JOIN secretaria.programs p ON p.id=g.program_id JOIN secretaria.services sg ON sg.id=p.service_id
      WHERE e.id=$1 AND se.code='APOYO' AND sg.code='APOYO'`, [b.enrollmentId, b.groupId]);
    if (chk.length === 0) return { ok: false, error: 'La matrícula o el grupo no son de Apoyo' };
    await this.ds.query(
      `INSERT INTO secretaria.apoyo_assignments(enrollment_id, group_id, weekday, slot_time, room, hours)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,1))
       ON CONFLICT (enrollment_id, group_id, weekday, slot_time) DO UPDATE SET hours=EXCLUDED.hours, room=EXCLUDED.room`,
      [b.enrollmentId, b.groupId, b.weekday, b.slotTime, b.room || null, b.hours ?? null]);
    await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1 AND group_id IS NULL`, [b.enrollmentId, b.groupId]);
    return { ok: true };
  }

  @Patch('assignment/:id/hours') @Roles('secretaria_admin','secretaria_staff')
  async setHours(@Param('id') id: string, @Body() b: { hours?: number }) {
    const h = Number(b.hours);
    if (!Number.isFinite(h) || h <= 0) return { ok: false, error: 'Horas inválidas' };
    await this.ds.query(`UPDATE secretaria.apoyo_assignments SET hours=$2 WHERE id=$1`, [id, h]);
    return { ok: true };
  }

  @Delete('assignment/:id') @Roles('secretaria_admin','secretaria_staff')
  async remove(@Param('id') id: string) {
    const rows = await this.ds.query(`DELETE FROM secretaria.apoyo_assignments WHERE id=$1 RETURNING enrollment_id`, [id]);
    const enr = rows[0]?.enrollment_id;
    if (enr) {
      const rest = await this.ds.query(`SELECT group_id FROM secretaria.apoyo_assignments WHERE enrollment_id=$1 LIMIT 1`, [enr]);
      await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1`, [enr, rest[0]?.group_id || null]);
    }
    return { ok: true };
  }

  @Delete('assignments') @Roles('secretaria_admin','secretaria_staff')
  async delGroupAssignments(@Query('enrollmentId') enrollmentId: string, @Query('groupId') groupId: string) {
    await this.ds.query(`DELETE FROM secretaria.apoyo_assignments WHERE enrollment_id=$1 AND group_id=$2`, [enrollmentId, groupId]);
    const rest = await this.ds.query(`SELECT group_id FROM secretaria.apoyo_assignments WHERE enrollment_id=$1 LIMIT 1`, [enrollmentId]);
    await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1`, [enrollmentId, rest[0]?.group_id || null]);
    return { ok: true };
  }

  // --- Tarifas por etapa + horas (se mantienen) ---
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
  async updateTier(@Param('id') id: string, @Body() b: UpdateFeeTierDto) {
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
}
```

- [ ] **Step 2: Build del backend**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```
Expected: build sin errores.

- [ ] **Step 3: Commit + push**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/apoyo/apoyo.controller.ts
$G commit -m "feat(apoyo): controlador a modelo grupo (board groups+students, assign con horas, detalle alumno)"
$G push origin HEAD
```

---

### Task 3: Frontend — `ApoyoSlotsModal` (franjas del grupo + horas)

**Files:**
- Modify: `/opt/mw-secretaria/frontend/src/App.tsx` (añadir el componente justo antes de `function ApoyoBoard()`, ~línea 4541)

**Interfaces:**
- Consumes: `POST /apoyo/assign`, `DELETE /apoyo/assignment/:id`, `DELETE /apoyo/assignments` (Task 2); `api`, `message`, `Modal`, `Checkbox`, `InputNumber`, `Text`, `useState`, `useEffect`.
- Produces: `<ApoyoSlotsModal group student originGroupId open onClose onDone />` — consumido por `ApoyoBoard` (Task 4).

- [ ] **Step 1: Verificar que `InputNumber` está importado**

```bash
grep -n "InputNumber" /opt/mw-secretaria/frontend/src/App.tsx | head -1
```
Si no aparece, añadir `InputNumber` al import de `antd` al inicio de App.tsx (junto a `Modal`, `Checkbox`, etc.).

- [ ] **Step 2: Insertar el componente**

Justo antes de `function ApoyoBoard() {` (busca esa línea), insertar:
```tsx
function ApoyoSlotsModal({ group, student, originGroupId, open, onClose, onDone }:
  { group: any; student: any; originGroupId: string | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const key = (s: any) => `${s.weekday}|${s.startTime}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hours, setHours] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open || !group || !student) return;
    const cur = (student.assignments || []).filter((a: any) => a.groupId === group.id);
    setChecked(new Set(cur.map((a: any) => key(a))));
    const h: Record<string, number> = {};
    for (const a of cur) h[key(a)] = Number(a.hours) || 1;
    setHours(h);
  }, [open, group?.id, student?.enrollmentId]);
  const toggle = (k: string) => setChecked(c => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const confirm = async () => {
    setSaving(true);
    const cur = (student.assignments || []).filter((a: any) => a.groupId === group.id);
    try {
      for (const slot of (group.schedule || [])) {
        const k = key(slot);
        if (checked.has(k)) {
          const r = await api.post('/apoyo/assign', { enrollmentId: student.enrollmentId, groupId: group.id, weekday: slot.weekday, slotTime: slot.startTime, hours: hours[k] || 1, room: slot.room || group.room });
          if (r.data?.ok === false) message.warning(r.data.error);
        }
      }
      for (const a of cur) if (!checked.has(key(a))) await api.delete(`/apoyo/assignment/${a.id}`);
      if (originGroupId && originGroupId !== group.id) {
        await api.delete('/apoyo/assignments', { params: { enrollmentId: student.enrollmentId, groupId: originGroupId } });
      }
      message.success('Franjas actualizadas'); onDone();
    } catch { message.error('Error al actualizar las franjas'); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={`Franjas de ${student?.studentName || ''} en ${group?.name || ''}`} open={open} onCancel={onClose}
      onOk={confirm} okText="Guardar" cancelText="Cancelar" confirmLoading={saving}>
      {(group?.schedule || []).length === 0 && <Text type="secondary">Este grupo no tiene franjas. Defínelas en Horarios.</Text>}
      {(group?.schedule || []).map((slot: any) => {
        const k = key(slot);
        return (
          <div key={k} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox checked={checked.has(k)} onChange={() => toggle(k)}>
              {DOW[slot.weekday]} {slot.startTime}{slot.room ? ` · ${slot.room}` : ''}
            </Checkbox>
            {checked.has(k) && (
              <InputNumber size="small" min={0.5} step={0.5} style={{ width: 90 }} value={hours[k] ?? 1}
                onChange={(v) => setHours(h => ({ ...h, [k]: Number(v) || 1 }))} addonAfter="h" />
            )}
          </div>
        );
      })}
      {originGroupId && originGroupId !== group?.id && <Text type="secondary" style={{ fontSize: 12 }}>Se moverá: se quitarán sus franjas del grupo de origen.</Text>}
    </Modal>
  );
}
```

- [ ] **Step 3: Build frontend (debe compilar; el modal aún no se usa hasta Task 4)**

```bash
cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -5
```
Expected: build sin errores de TypeScript (puede avisar de `ApoyoSlotsModal` sin usar — aceptable hasta Task 4; si el lint falla por unused, continuar a Task 4 antes de declarar el build final).

- [ ] **Step 4: Commit + push**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add frontend/src/App.tsx
$G commit -m "feat(apoyo): ApoyoSlotsModal (franjas del grupo + horas)"
$G push origin HEAD
```

---

### Task 4: Frontend — `ApoyoBoard` a kanban (espejo de DanzaBoard)

**Files:**
- Modify (reemplazar la función completa): `/opt/mw-secretaria/frontend/src/App.tsx`, `function ApoyoBoard()` (~líneas 4541-4715) y eliminar las constantes `APOYO_DEFAULT_TIMES`/`APOYO_DAYS` (~4539-4540) si quedan sin uso.

**Interfaces:**
- Consumes: `GET /apoyo/board`, `PATCH /enrollments/:id`, `DELETE /apoyo/assignments` (Task 2); `ApoyoSlotsModal` (Task 3); helpers `orgStat` (App.tsx:4329), `useLiveQuery`, `SearchableTable`, `Ayuda`, antd (`Card,Row,Col,Space,Button,Select,Tag,Tooltip,Dropdown,Text,Title`).
- Produces: la vista `apoyo` (kanban). El render `{safeView === 'apoyo' && <ApoyoBoard/>}` (App.tsx:5416) no cambia.

- [ ] **Step 1: Reemplazar `function ApoyoBoard()`**

Sustituir toda la función `ApoyoBoard()` por:
```tsx
function ApoyoBoard() {
  const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const LEVELS = [{ value: 'primaria', label: 'Primaria' }, { value: 'secundaria', label: 'Secundaria' }, { value: 'bachillerato', label: 'Bachillerato' }];
  const [years, setYears] = useState<any[]>([]);
  const [data, setData] = useState<any>({ groups: [], students: [] });
  const [drag, setDrag] = useState<{ enrollmentId: string; fromGroupId: string | null } | null>(null);
  const [slotsModal, setSlotsModal] = useState<{ group: any; student: any; originGroupId: string | null } | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const activeYear = () => years.find(y => y.isActive);
  const load = async () => {
    const y = activeYear(); if (!y) return;
    try { const { data } = await api.get('/apoyo/board', { params: { academicYearId: y.id } }); setData(data); } catch {}
  };
  useEffect(() => { api.get('/catalog/years').then(r => setYears(r.data)); }, []);
  useEffect(() => { if (years.length) load(); }, [years]);
  useLiveQuery(['enrollments', 'groups', 'apoyo'], load);

  const setStatus = async (enrollmentId: string, status: string) => { try { await api.patch(`/enrollments/${enrollmentId}`, { status }); load(); } catch { message.error('Error'); } };
  const setComment = async (s: any) => { const c = window.prompt('Comentario sobre ' + s.studentName + ':', s.comment || ''); if (c === null) return; try { await api.patch(`/enrollments/${s.enrollmentId}`, { notes: c }); load(); } catch { message.error('Error'); } };
  const setLevel = async (enrollmentId: string, apoyoLevel: string) => { try { await api.patch(`/enrollments/${enrollmentId}`, { apoyoLevel }); load(); } catch { message.error('Error'); } };
  const quitarGrupo = async (enrollmentId: string, groupId: string) => { try { await api.delete('/apoyo/assignments', { params: { enrollmentId, groupId } }); load(); } catch { message.error('Error'); } };
  const openSlots = (group: any, student: any, originGroupId: string | null) => setSlotsModal({ group, student, originGroupId });

  const bolsa = (data.students || []).filter((s: any) => (s.assignments || []).length === 0);
  const inGroup = (g: any) => (data.students || []).filter((s: any) => (s.assignments || []).some((a: any) => a.groupId === g.id));
  const slotsOf = (s: any, g: any) => (s.assignments || []).filter((a: any) => a.groupId === g.id).map((a: any) => `${DOW[a.weekday]} ${a.startTime} (${Number(a.hours)}h)`).join(', ');

  const card = (s: any, g: any | null) => {
    const st = orgStat(s.status);
    const menu = {
      items: [
        { key: 'comment', label: s.comment ? 'Editar comentario' : 'Añadir comentario' },
        ...(g ? [{ key: 'slots', label: 'Editar franjas' }, { key: 'quit', label: 'Quitar del grupo' }] : []),
        { type: 'divider' as const },
        { key: 'st_matriculado', label: '✓ Matricular' },
        { key: 'st_preinscrito', label: 'Marcar preinscrito' },
        { key: 'st_lista_espera', label: 'A lista de espera' },
      ],
      onClick: ({ key }: any) => {
        if (key === 'comment') setComment(s);
        else if (key === 'slots' && g) openSlots(g, s, null);
        else if (key === 'quit' && g) quitarGrupo(s.enrollmentId, g.id);
        else if (key.startsWith('st_')) setStatus(s.enrollmentId, key.slice(3));
      },
    };
    return (
      <div key={s.enrollmentId + (g ? ':' + g.id : ':pool')} draggable
        onDragStart={() => setDrag({ enrollmentId: s.enrollmentId, fromGroupId: g ? g.id : null })}
        onDragEnd={() => setDrag(null)}
        style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 6, padding: '4px 8px', marginBottom: 4, cursor: 'grab' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13 }}>{st.tick && '✓ '}{s.studentName}{s.comment && <Tooltip title={s.comment}><span style={{ marginLeft: 4 }}>💬</span></Tooltip>}</span>
          <Dropdown menu={menu} trigger={['click']}><Button type="text" size="small">⋯</Button></Dropdown>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Select size="small" style={{ width: 110 }} placeholder="Nivel" value={s.apoyoLevel || undefined} options={LEVELS} onChange={(v) => setLevel(s.enrollmentId, v)} />
          <span style={{ fontSize: 11, color: '#6B6B7B' }}>{Number(s.totalHours)}h · {s.monthly == null ? 'revisar' : Number(s.monthly).toFixed(2) + '€'}</span>
        </div>
        {g && <Text type="secondary" style={{ fontSize: 11 }}>{slotsOf(s, g) || '(sin franjas)'}</Text>}
      </div>
    );
  };

  const colStyle = { maxHeight: '70vh', overflowY: 'auto' as const };
  return (
    <div>
      <Title level={3}>Apoyo</Title>
      <Ayuda title="Organización de Apoyo por grupos (kanban)">
        Arrastra alumnos de <b>Sin asignar</b> a un grupo: te preguntará a qué <b>franjas</b> viene y cuántas <b>horas</b> en cada una. Arrastrar de un grupo a otro lo <b>mueve</b>. El menú <b>⋯</b> cambia el estado, añade comentario o lo quita del grupo. La <b>tarifa</b> sale del <b>nivel</b> (Primaria/Secundaria/Bachillerato) y el <b>total de horas</b>. Las franjas de cada grupo se definen en Horarios y los tramos en Tarifas.
      </Ayuda>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap><Button onClick={load}>Actualizar</Button></Space>
        <Row gutter={12}>
          <Col xs={24} md={6}>
            <Card size="small" title={`Sin asignar (${bolsa.length})`} style={{ background: '#FAFAF8' }} styles={{ body: colStyle }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { setOverCol(null); if (drag && drag.fromGroupId) { quitarGrupo(drag.enrollmentId, drag.fromGroupId); } setDrag(null); }}>
              {bolsa.map((s: any) => card(s, null))}
              {!bolsa.length && <Text type="secondary">Todos asignados</Text>}
            </Card>
          </Col>
          <Col xs={24} md={18}>
            <Row gutter={[12, 12]}>
              {data.groups.map((g: any) => (
                <Col xs={24} lg={12} key={g.id}>
                  <Card size="small" style={{ outline: overCol === g.id ? '2px solid #579172' : 'none' }}
                    title={<span>{g.name} <Text type="secondary" style={{ fontSize: 11 }}>{(g.schedule || []).map((sl: any) => `${DOW[sl.weekday]} ${sl.startTime}`).join(' · ')}</Text></span>}
                    styles={{ body: colStyle }}
                    onDragOver={(e) => { e.preventDefault(); setOverCol(g.id); }}
                    onDragLeave={() => setOverCol(null)}
                    onDrop={() => { setOverCol(null); if (drag) { const s = data.students.find((x: any) => x.enrollmentId === drag.enrollmentId); if (s) openSlots(g, s, drag.fromGroupId); } setDrag(null); }}>
                    {(g.schedule || []).length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>Sin franjas — defínelas en Horarios</Text>}
                    {inGroup(g).map((s: any) => card(s, g))}
                    {!inGroup(g).length && (g.schedule || []).length > 0 && <Text type="secondary" style={{ fontSize: 11 }}>(arrastra alumnos aquí)</Text>}
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
        <Card size="small" title="Resumen: horas y tarifa" style={{ marginTop: 12 }}>
          <SearchableTable rowKey="enrollmentId" dataSource={data.students} size="small" pagination={{ pageSize: 15 }}
            columns={[
              { title: 'Alumno', dataIndex: 'studentName' },
              { title: 'Estado', dataIndex: 'status', render: (s: any) => <Tag color={s === 'matriculado' ? 'green' : s === 'lista_espera' ? 'orange' : s === 'preinscrito' ? 'gold' : 'blue'}>{orgStat(s).label}</Tag> },
              { title: 'Nivel', dataIndex: 'apoyoLevel', render: (l: any) => l ? <Tag>{l}</Tag> : <Tag color="red">sin nivel</Tag> },
              { title: 'Horas', dataIndex: 'totalHours', align: 'center', render: (h: any) => `${Number(h)}h` },
              { title: 'Tarifa/mes', dataIndex: 'monthly', align: 'right', render: (m: any) => m != null ? `${Number(m).toFixed(2)} €` : <Tag color="red">revisar</Tag> },
            ]} />
        </Card>
      </Card>
      <ApoyoSlotsModal open={!!slotsModal} group={slotsModal?.group} student={slotsModal?.student} originGroupId={slotsModal?.originGroupId ?? null}
        onClose={() => setSlotsModal(null)} onDone={() => { setSlotsModal(null); load(); }} />
    </div>
  );
}
```

- [ ] **Step 2: Limpiar constantes sin uso**

Si `APOYO_DEFAULT_TIMES` / `APOYO_DAYS` (~líneas 4539-4540) ya no se usan en ningún sitio (`grep -n "APOYO_DEFAULT_TIMES\|APOYO_DAYS" frontend/src/App.tsx`), eliminarlas para evitar warnings de unused.

- [ ] **Step 3: Cambiar la etiqueta del menú**

En App.tsx ~línea 5322 cambiar `label: 'Apoyo (franjas)'` por `label: 'Apoyo'`:
```tsx
    apoyo: { icon: <AppstoreOutlined />, label: 'Apoyo' },
```

- [ ] **Step 4: Build frontend**

```bash
cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -6
```
Expected: build sin errores de TypeScript.

- [ ] **Step 5: Commit + push**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add frontend/src/App.tsx
$G commit -m "feat(apoyo): ApoyoBoard kanban de grupos (estilo Danza) con horas y nivel"
$G push origin HEAD
```

---

### Task 5: Frontend — detalle de Apoyo en la ficha del alumno

**Files:**
- Modify: `/opt/mw-secretaria/frontend/src/App.tsx` — añadir `ApoyoFichaDetail` y montarlo en `FichaAlumno` (la tarjeta "Matrículas", ~App.tsx:828).

**Interfaces:**
- Consumes: `GET /apoyo/student/:enrollmentId` (Task 2). `api`, `useState`, `useEffect`, antd (`Card`, `Tag`, `Text`).
- Produces: bloque visual del detalle de Apoyo en la ficha.

- [ ] **Step 1: Insertar el componente `ApoyoFichaDetail`**

Antes de `function FichaAlumno` (busca esa línea, ~App.tsx:746), insertar:
```tsx
function ApoyoFichaDetail({ enrollmentId }: { enrollmentId: string }) {
  const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    api.get(`/apoyo/student/${enrollmentId}`).then(r => { if (alive) setD(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, [enrollmentId]);
  if (!d) return null;
  const byGroup: Record<string, any[]> = {};
  for (const a of (d.assignments || [])) { (byGroup[a.groupName] = byGroup[a.groupName] || []).push(a); }
  return (
    <div style={{ marginTop: 8, padding: '6px 10px', background: '#FAFAF8', border: '1px solid #EDE9E4', borderRadius: 8, fontSize: 12 }}>
      <div style={{ marginBottom: 4 }}>
        <b>Apoyo</b> · Nivel: {d.apoyoLevel ? <Tag>{d.apoyoLevel}</Tag> : <Tag color="red">sin nivel</Tag>}
        · <b>{Number(d.totalHours)}h</b> · {d.monthly == null ? <Tag color="red">revisar</Tag> : <Tag color="green">{Number(d.monthly).toFixed(2)} €/mes</Tag>}
      </div>
      {Object.keys(byGroup).length === 0 && <Text type="secondary">Sin grupo asignado todavía.</Text>}
      {Object.entries(byGroup).map(([gname, arr]) => (
        <div key={gname}><b>{gname}:</b> {arr.map(a => `${DOW[a.weekday]} ${a.slotTime} (${Number(a.hours)}h)`).join(', ')}</div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Montar el detalle en la tarjeta "Matrículas" de la ficha**

En `FichaAlumno`, en la tabla/lista de matrículas ("Matrículas", ~App.tsx:828), para cada matrícula cuyo servicio sea Apoyo, renderizar `<ApoyoFichaDetail enrollmentId={m.id} />` bajo la fila. Localiza cómo se itera `student.enrollments` (cada `m` tiene `id`, `serviceName`/`serviceCode`). Ejemplo de inserción tras la fila de la matrícula:
```tsx
{(m.serviceCode === 'APOYO' || /apoyo/i.test(m.serviceName || '')) && <ApoyoFichaDetail enrollmentId={m.id} />}
```
> Si la matrícula no expone `serviceCode`, usar el match por nombre (`/apoyo/i.test(m.serviceName)`). Verifica el nombre real del campo del servicio en el objeto de matrícula que usa la ficha (`GET /students/:id/ficha`).

- [ ] **Step 3: Build frontend**

```bash
cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -6
```
Expected: build sin errores.

- [ ] **Step 4: Commit + push**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add frontend/src/App.tsx
$G commit -m "feat(apoyo): detalle de Apoyo (grupos/franjas/horas/nivel/tarifa) en la ficha"
$G push origin HEAD
```

---

### Task 6: Despliegue + validación

**Files:** ninguno (operativo). Sigue [[project-secretaria-deploy]].

**Interfaces:** Consumes Tasks 1-5. Produces: Apoyo kanban en producción verificado.

- [ ] **Step 1: Rebuild + recrear backend (con el volumen de Mocks)**

```bash
cd /opt/mw-secretaria/backend && docker build -t mw-secretaria-api:latest .
docker stop mw-secretaria-api && docker rm mw-secretaria-api
docker run -d --name mw-secretaria-api --network mw-panel_mw-network -p 127.0.0.1:3010:3010 \
  --env-file /opt/mw-secretaria/backend/.env \
  -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db \
  --restart unless-stopped mw-secretaria-api:latest
sleep 4 && docker logs mw-secretaria-api --tail 5
```

- [ ] **Step 2: Deploy frontend**

```bash
cd /opt/mw-secretaria/frontend && npm run build && sudo cp -r dist/* /opt/mw-secretaria/frontend-dist/
```

- [ ] **Step 3: Verificar el board (JWT admin)**

```bash
AID=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT user_id FROM secretaria.staff_roles WHERE role='secretaria_admin' LIMIT 1")
TOKEN=$(docker exec mw-secretaria-api node -e "console.log(require('jsonwebtoken').sign({sub:'$AID',email:'x'},process.env.JWT_SECRET,{expiresIn:'5m'}))")
YID=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1")
curl -s "http://127.0.0.1:3010/api/secretaria/apoyo/board?academicYearId=$YID" -H "Authorization: Bearer $TOKEN" | head -c 400; echo
```
Expected: JSON con `groups` (los 6 grupos de Apoyo con `schedule`) y `students` (con `assignments` vacíos, `totalHours`, `apoyoLevel`, `monthly`).

- [ ] **Step 4: Probar asignar (crea, no destruye) + verificar**

```bash
# un enrollment APOYO matriculado y un grupo de Apoyo con franjas
ENR=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT e.id FROM secretaria.enrollments e JOIN secretaria.services s ON s.id=e.service_id AND s.code='APOYO' WHERE e.status='matriculado' LIMIT 1")
GRP=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT g.id FROM secretaria.groups g JOIN secretaria.schedule_slots ss ON ss.group_id=g.id JOIN secretaria.programs p ON p.id=g.program_id JOIN secretaria.services s ON s.id=p.service_id AND s.code='APOYO' LIMIT 1")
SLOT=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT weekday||'|'||to_char(start_time,'HH24:MI') FROM secretaria.schedule_slots WHERE group_id='$GRP' LIMIT 1")
WD=${SLOT%|*}; TM=${SLOT#*|}
curl -s -X POST http://127.0.0.1:3010/api/secretaria/apoyo/assign -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"enrollmentId\":\"$ENR\",\"groupId\":\"$GRP\",\"weekday\":$WD,\"slotTime\":\"$TM\",\"hours\":1.5}"; echo
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "SELECT group_id, weekday, slot_time, hours FROM secretaria.apoyo_assignments WHERE enrollment_id='$ENR';"
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT secretaria.fn_resolve_monthly_fee('$ENR');"
# limpieza de la prueba
curl -s -X DELETE "http://127.0.0.1:3010/api/secretaria/apoyo/assignments?enrollmentId=$ENR&groupId=$GRP" -H "Authorization: Bearer $TOKEN" >/dev/null
```
Expected: la asignación aparece con hours=1.50; `fn_resolve_monthly_fee` devuelve la tarifa (o NULL si el alumno no tiene nivel). La limpieza la borra.

- [ ] **Step 5: Validación visual (spec §10)**

Abrir `https://secretaria.mundoworld.school` → Resumen → **Apoyo**:
1. Se ve el kanban: "Sin asignar" + columnas por grupo de Apoyo con sus franjas.
2. Arrastrar un alumno a un grupo abre el modal de franjas con campo de horas; al guardar aparece en la columna con sus horas.
3. El nivel se elige en la tarjeta; la tarifa/mes refleja nivel + horas (o "revisar" sin nivel).
4. Mover un alumno entre grupos (lo quita del origen); "Quitar del grupo" lo devuelve a "Sin asignar".
5. La ficha del alumno muestra el detalle de Apoyo (grupos, franjas, horas, nivel, tarifa).

---

## Self-review (cobertura del spec)

- §4 datos (group_id, representativo, schedule_slots, apoyo_slots sin uso) → Task 1 + Task 2.
- §5 backend (board groups+students, assign, borrado con representativo, fee-tiers/hours/level) → Task 2.
- §6 organización (kanban, modal franjas+horas, tarjeta nivel/horas, resumen) → Tasks 3-4.
- §7 ficha (detalle Apoyo vía `GET /apoyo/student/:enrollmentId`) → Task 5 + endpoint en Task 2.
- §8 tarifa sin cambios → verificado en Task 6 step 4.
- §9 migración/despliegue → Task 1 + Task 6.
- §10 validación → Task 6 step 5.
