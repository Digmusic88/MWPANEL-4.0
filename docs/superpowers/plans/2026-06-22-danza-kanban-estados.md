# Tablero de Danza kanban (estados + colocación) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el tablero de Danza en un kanban como la Organización del centro: tarjetas por alumno coloreadas por estado (preinscrito/matriculado/lista de espera), arrastrables para MOVER entre grupos, con selector de días al soltar; menú ⋯ (estado, comentario, quitar del grupo); columnas con scroll interno; y un tag de días en Pagos.

**Architecture:** El board de Danza pasa a devolver `students` unificado con `status`/`comment`. El frontend reescribe `DanzaBoard` a kanban (bolsa + columna por grupo) reusando `ORG_STATUS`/`orgStat` y el patrón de `cardMenu` del kanban del centro, con un `DanzaDaysModal` para elegir/sincronizar los días al colocar/mover. Estado y comentario reusan `PATCH /enrollments/:id`; colocar/quitar días reusan `/danza/assign` + un nuevo `DELETE /danza/assignments`. Pagos añade `danzaDays`.

**Tech Stack:** NestJS 10 (raw `ds.query`), React 18 + AntD (Card, Modal, Checkbox, Dropdown, Tag, message), drag-drop HTML5.

## Global Constraints
- **Producción**: backend ya desplegado (Fase 1+2 de Danza). Pasos de deploy/verificación los ejecuta el CONTROLADOR; subagentes solo escriben código.
- **Estado y comentario** = de la matrícula (`enrollments.status`/`notes`), iguales en todas las tarjetas del alumno. Reusan `PATCH /enrollments/:id { status }` / `{ notes }` (ya existen).
- **Días** = `danza_assignments` por grupo. Colocar = `POST /danza/assign`; quitar un día = `DELETE /danza/assignment/:id`; quitar todos los de un grupo = `DELETE /danza/assignments?enrollmentId&groupId` (nuevo).
- **Arrastre = MOVER**: arrastrar de grupo A a B → selector de días de B; al confirmar se quitan los días de A (origen). Desde la bolsa = añade sin quitar de otros grupos.
- **Bolsa y columnas con scroll interno**: `maxHeight: '70vh', overflowY: 'auto'`.
- Reusar a nivel módulo: `ORG_STATUS`, `orgStat`, `api`, `useLiveQuery`, `message`, `Modal`, `Checkbox`, `Dropdown`, `Tag`, `Card`, `Row`, `Col`, `Space`, `Button`, `Text`, `Title`, `Ayuda`, `SearchableTable`. (Si `Checkbox` no está importado, añadirlo al import de antd.)
- **Git**: `export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria` antes de git; NO push (controlador). **Deploy** (controlador): API `docker build/run`; frontend `npm run build && cp -r dist/* frontend-dist/`.

---

## Estructura de ficheros
- `backend/src/modules/danza/danza.controller.ts` — board (status/comment + students unificado) + `DELETE /danza/assignments`.
- `backend/src/modules/payments/payments.controller.ts` — matrix `danzaDays`.
- `frontend/src/App.tsx` — `DanzaBoard` reescrito + nuevo `DanzaDaysModal`; tag de días en Pagos.

---

## Task 1: Backend — board con estado/comentario + quitar-grupo

**Files:** Modify `backend/src/modules/danza/danza.controller.ts`

**Interfaces:**
- Produces:
  - `GET /danza/board?academicYearId` → `{ groups, students }` (sin `pool`). `students` = TODAS las matrículas Danza del año con status IN (matriculado,preinscrito,lista_espera,pendiente): `{ enrollmentId, studentName, status, comment, assignments:[{id,groupId,weekday,startTime,room}], totalDays, monthly, maillot }`.
  - `DELETE /danza/assignments?enrollmentId&groupId` → borra todos los `danza_assignments` de ese (enrollment, group); deja `enrollments.group_id` = un grupo de los assignments restantes (NULL si no quedan). `{ ok:true }`.

- [ ] **Step 1: Reescribir el método `board`**
Sustituir el cuerpo de `board(...)` por:
```typescript
  @Get('board')
  async board(@Query('academicYearId') yearId: string) {
    const danzaSvc = await this.ds.query(`SELECT id FROM secretaria.services WHERE code='DANZA' LIMIT 1`);
    const svcId = danzaSvc[0]?.id;
    const groups = await this.ds.query(`
      SELECT g.id, g.name, g.room, g.color, g.bills_maillot AS "billsMaillot",
        COALESCE((SELECT json_agg(json_build_object('weekday', ss.weekday, 'startTime', to_char(ss.start_time,'HH24:MI'), 'room', ss.room) ORDER BY ss.weekday, ss.start_time)
                  FROM secretaria.schedule_slots ss WHERE ss.group_id=g.id), '[]'::json) AS schedule
      FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id
      WHERE g.academic_year_id=$1 AND p.service_id=$2 ORDER BY g.sort_order, g.name`, [yearId, svcId]);
    const studentsRaw = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.status, e.notes AS comment,
        COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
        secretaria.fn_resolve_danza_monthly(e.id) AS monthly,
        secretaria.fn_resolve_danza_maillot(e.id) AS maillot,
        COALESCE((SELECT json_agg(json_build_object('id', da.id, 'groupId', da.group_id, 'weekday', da.weekday, 'startTime', to_char(da.start_time,'HH24:MI'), 'room', da.room) ORDER BY da.weekday, da.start_time)
                  FROM secretaria.danza_assignments da WHERE da.enrollment_id=e.id), '[]'::json) AS assignments
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status IN ('matriculado','preinscrito','lista_espera','pendiente')
      ORDER BY "studentName"`, [yearId, svcId]);
    const students = studentsRaw.map((s: any) => ({ ...s, totalDays: (s.assignments || []).length }));
    return { groups, students };
  }
```

- [ ] **Step 2: Añadir `DELETE /danza/assignments` (quitar del grupo)**
Añadir tras `delAssignment`:
```typescript
  @Delete('assignments') @Roles('secretaria_admin','secretaria_staff','direccion')
  async delGroupAssignments(@Query('enrollmentId') enrollmentId: string, @Query('groupId') groupId: string) {
    await this.ds.query(`DELETE FROM secretaria.danza_assignments WHERE enrollment_id=$1 AND group_id=$2`, [enrollmentId, groupId]);
    const rest = await this.ds.query(`SELECT group_id FROM secretaria.danza_assignments WHERE enrollment_id=$1 LIMIT 1`, [enrollmentId]);
    await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1`, [enrollmentId, rest[0]?.group_id || null]);
    return { ok: true };
  }
```
(NOTA: la ruta `assignments` (plural) debe declararse de forma que no choque con `assignment/:id`; al ser rutas distintas (`assignments` vs `assignment/:id`) Nest las distingue. Verificar el orden no importa porque los paths difieren.)

- [ ] **Step 3: Compilar**
Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: limpio.

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/danza/danza.controller.ts
git commit -m "feat(secretaria): board Danza con estado/comentario + DELETE /danza/assignments (quitar grupo)"
```

---

## Task 2: Backend — `danzaDays` en la matriz de Pagos

**Files:** Modify `backend/src/modules/payments/payments.controller.ts` (método `matrix`, query `students`)

**Interfaces:**
- Produces: cada fila de `matrix.rows` incluye `danzaDays` (nº de `danza_assignments` de la matrícula; 0 si no aplica).

- [ ] **Step 1: Añadir el cálculo a la query de students de la matriz**
En la query `const students = await this.ds.query(\`SELECT e.id AS "enrollmentId", st.family_id AS "familyId", ...`), añadir una columna tras `"monthlyFee"`:
```sql
             (SELECT count(*)::int FROM secretaria.danza_assignments da WHERE da.enrollment_id=e.id) AS "danzaDays",
```

- [ ] **Step 2: Compilar**
Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: limpio.

- [ ] **Step 3: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/payments/payments.controller.ts
git commit -m "feat(secretaria): danzaDays por fila en la matriz de Pagos"
```

---

## Task 3: Frontend — `DanzaBoard` kanban + `DanzaDaysModal`

**Files:** Modify `frontend/src/App.tsx` (reescribir `DanzaBoard`; añadir `DanzaDaysModal` antes de `DanzaBoard`)

**Interfaces:**
- Consumes: `/danza/board` (Task 1), `/danza/assign`, `/danza/assignment/:id`, `/danza/assignments` (Task 1), `PATCH /enrollments/:id`. `ORG_STATUS`/`orgStat` (módulo).
- Produces: `DanzaBoard` kanban + `DanzaDaysModal`.

- [ ] **Step 1: Implementar `DanzaDaysModal`** (antes de `DanzaBoard`)
```tsx
function DanzaDaysModal({ group, student, originGroupId, open, onClose, onDone }:
  { group: any; student: any; originGroupId: string | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const key = (s: any) => `${s.weekday}|${s.startTime}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open || !group || !student) return;
    setChecked(new Set((student.assignments || []).filter((a: any) => a.groupId === group.id).map((a: any) => key(a))));
  }, [open, group?.id, student?.enrollmentId]);
  const toggle = (k: string) => setChecked(c => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const confirm = async () => {
    const cur = (student.assignments || []).filter((a: any) => a.groupId === group.id);
    const curKeys = new Set(cur.map((a: any) => key(a)));
    try {
      for (const slot of (group.schedule || [])) {
        const k = key(slot);
        if (checked.has(k) && !curKeys.has(k)) {
          const r = await api.post('/danza/assign', { enrollmentId: student.enrollmentId, groupId: group.id, weekday: slot.weekday, startTime: slot.startTime, room: slot.room || group.room });
          if (r.data?.ok === false) message.warning(r.data.error);
        }
      }
      for (const a of cur) if (!checked.has(key(a))) await api.delete(`/danza/assignment/${a.id}`);
      if (originGroupId && originGroupId !== group.id) {
        await api.delete('/danza/assignments', { params: { enrollmentId: student.enrollmentId, groupId: originGroupId } });
      }
      message.success('Días actualizados'); onDone();
    } catch { message.error('Error al actualizar los días'); }
  };
  return (
    <Modal title={`Días de ${student?.studentName || ''} en ${group?.name || ''}`} open={open} onCancel={onClose}
      onOk={confirm} okText="Guardar" cancelText="Cancelar">
      {(group?.schedule || []).length === 0 && <Text type="secondary">Este grupo no tiene franjas. Defínelas en Horarios.</Text>}
      {(group?.schedule || []).map((slot: any) => (
        <div key={key(slot)} style={{ padding: '4px 0' }}>
          <Checkbox checked={checked.has(key(slot))} onChange={() => toggle(key(slot))}>
            {DOW[slot.weekday]} {slot.startTime}{slot.room ? ` · ${slot.room}` : ''}
          </Checkbox>
        </div>
      ))}
      {originGroupId && originGroupId !== group?.id && <Text type="secondary" style={{ fontSize: 12 }}>Se moverá: se quitarán sus días del grupo de origen.</Text>}
    </Modal>
  );
}
```

- [ ] **Step 2: Reescribir `DanzaBoard`** (sustituir el componente completo)
```tsx
function DanzaBoard() {
  const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const [years, setYears] = useState<any[]>([]);
  const [data, setData] = useState<any>({ groups: [], students: [] });
  const [tiersOpen, setTiersOpen] = useState(false);
  const [drag, setDrag] = useState<{ enrollmentId: string; fromGroupId: string | null } | null>(null);
  const [daysModal, setDaysModal] = useState<{ group: any; student: any; originGroupId: string | null } | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const activeYear = () => years.find(y => y.isActive);
  const load = async () => {
    const y = activeYear(); if (!y) return;
    try { const { data } = await api.get('/danza/board', { params: { academicYearId: y.id } }); setData(data); } catch {}
  };
  useEffect(() => { api.get('/catalog/years').then(r => setYears(r.data)); }, []);
  useEffect(() => { if (years.length) load(); }, [years]);
  useLiveQuery(['enrollments', 'groups', 'danza'], load);

  const setStatus = async (enrollmentId: string, status: string) => {
    try { await api.patch(`/enrollments/${enrollmentId}`, { status }); load(); } catch { message.error('Error'); }
  };
  const setComment = async (s: any) => {
    const c = window.prompt('Comentario sobre ' + s.studentName + ':', s.comment || '');
    if (c === null) return;
    try { await api.patch(`/enrollments/${s.enrollmentId}`, { notes: c }); load(); } catch { message.error('Error'); }
  };
  const quitarGrupo = async (enrollmentId: string, groupId: string) => {
    try { await api.delete('/danza/assignments', { params: { enrollmentId, groupId } }); load(); } catch { message.error('Error'); }
  };
  const openDays = (group: any, student: any, originGroupId: string | null) => setDaysModal({ group, student, originGroupId });

  const bolsa = (data.students || []).filter((s: any) => (s.totalDays || 0) === 0);
  const inGroup = (g: any) => (data.students || []).filter((s: any) => (s.assignments || []).some((a: any) => a.groupId === g.id));
  const daysOf = (s: any, g: any) => (s.assignments || []).filter((a: any) => a.groupId === g.id).map((a: any) => `${DOW[a.weekday]} ${a.startTime}`).join(', ');

  const card = (s: any, g: any | null) => {
    const st = orgStat(s.status);
    const menu = {
      items: [
        { key: 'comment', label: s.comment ? 'Editar comentario' : 'Añadir comentario' },
        ...(g ? [{ key: 'days', label: 'Editar días' }, { key: 'quit', label: 'Quitar del grupo' }] : []),
        { type: 'divider' as const },
        { key: 'st_matriculado', label: '✓ Matricular' },
        { key: 'st_preinscrito', label: 'Marcar preinscrito' },
        { key: 'st_lista_espera', label: 'A lista de espera' },
      ],
      onClick: ({ key }: any) => {
        if (key === 'comment') setComment(s);
        else if (key === 'days' && g) openDays(g, s, null);
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
          <span style={{ fontSize: 13 }}>
            {st.tick && '✓ '}{s.studentName}
            {s.comment && <Tooltip title={s.comment}><span style={{ marginLeft: 4 }}>💬</span></Tooltip>}
          </span>
          <Dropdown menu={menu} trigger={['click']}><Button type="text" size="small">⋯</Button></Dropdown>
        </div>
        {g && <Text type="secondary" style={{ fontSize: 11 }}>{daysOf(s, g) || '(sin días)'}</Text>}
      </div>
    );
  };

  const colStyle = { maxHeight: '70vh', overflowY: 'auto' as const };
  return (
    <div>
      <Title level={3}>Danza</Title>
      <Ayuda title="Organización de Danza por días (kanban)">
        Arrastra alumnos de <b>Sin asignar</b> a un grupo: te preguntará a qué <b>días</b> viene. Arrastrar de un grupo a otro lo <b>mueve</b> (lo quita del origen). El menú <b>⋯</b> cambia el estado (preinscrito/matriculado/lista de espera), añade comentario o lo quita del grupo. La <b>mensualidad</b> sale del total de días (tramos) y el <b>maillot</b> si el grupo lo cobra.
      </Ayuda>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Button onClick={load}>Actualizar</Button>
          <Button onClick={() => setTiersOpen(true)}>Tramos de tarifa</Button>
        </Space>
        <Row gutter={12}>
          <Col xs={24} md={6}>
            <Card size="small" title={`Sin asignar (${bolsa.length})`} style={{ background: '#FAFAF8' }}
              styles={{ body: colStyle }}
              onDragOver={(e) => e.preventDefault()}>
              {bolsa.map((s: any) => card(s, null))}
              {!bolsa.length && <Text type="secondary">Todos asignados</Text>}
            </Card>
          </Col>
          <Col xs={24} md={18}>
            <Row gutter={[12, 12]}>
              {data.groups.map((g: any) => (
                <Col xs={24} lg={12} key={g.id}>
                  <Card size="small" style={{ outline: overCol === g.id ? '2px solid #579172' : 'none' }}
                    title={<span>{g.name} {g.billsMaillot && <Tag color="purple">maillot</Tag>} <Text type="secondary" style={{ fontSize: 11 }}>{(g.schedule || []).map((sl: any) => `${DOW[sl.weekday]} ${sl.startTime}`).join(' · ')}</Text></span>}
                    styles={{ body: colStyle }}
                    onDragOver={(e) => { e.preventDefault(); setOverCol(g.id); }}
                    onDragLeave={() => setOverCol(null)}
                    onDrop={() => { setOverCol(null); if (drag) { const s = data.students.find((x: any) => x.enrollmentId === drag.enrollmentId); if (s) openDays(g, s, drag.fromGroupId); } setDrag(null); }}>
                    {(g.schedule || []).length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>Sin franjas — defínelas en Horarios</Text>}
                    {inGroup(g).map((s: any) => card(s, g))}
                    {!inGroup(g).length && (g.schedule || []).length > 0 && <Text type="secondary" style={{ fontSize: 11 }}>(arrastra alumnos aquí)</Text>}
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
        <Card size="small" title="Resumen: días y mensualidad" style={{ marginTop: 12 }}>
          <SearchableTable rowKey="enrollmentId" dataSource={data.students} size="small" pagination={{ pageSize: 15 }}
            columns={[
              { title: 'Alumno', dataIndex: 'studentName' },
              { title: 'Estado', dataIndex: 'status', render: (s: any) => <Tag color={s === 'matriculado' ? 'green' : s === 'lista_espera' ? 'orange' : s === 'preinscrito' ? 'gold' : 'blue'}>{orgStat(s).label}</Tag> },
              { title: 'Días', dataIndex: 'totalDays', align: 'center' },
              { title: 'Mensualidad', dataIndex: 'monthly', align: 'right', render: (m: any) => m != null ? `${Number(m).toFixed(2)} €` : <Tag color="red">sin tramo</Tag> },
              { title: 'Maillot', dataIndex: 'maillot', align: 'right', render: (m: any) => m != null ? `${Number(m).toFixed(2)} €` : '—' },
            ]} />
        </Card>
      </Card>
      <DanzaTiersModal open={tiersOpen} onClose={() => setTiersOpen(false)} groups={data.groups} />
      <DanzaDaysModal open={!!daysModal} group={daysModal?.group} student={daysModal?.student} originGroupId={daysModal?.originGroupId ?? null}
        onClose={() => setDaysModal(null)} onDone={() => { setDaysModal(null); load(); }} />
    </div>
  );
}
```
NOTA: usar `styles={{ body: colStyle }}` (AntD v5 Card `styles.body`). Si la versión de AntD no soporta `styles`, usar `bodyStyle={colStyle}`. El implementador comprueba cuál acepta el build.

- [ ] **Step 3: Asegurar imports** (`Checkbox`, `Tooltip`, `Dropdown` ya deberían estar; si falta `Checkbox`, añadirlo al import de `antd`).

- [ ] **Step 4: Build**
Run: `cd /opt/mw-secretaria/frontend && npm run build`
Expected: build OK.

- [ ] **Step 5: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): tablero Danza kanban (estados, mover arrastrando, selector de dias, scroll interno)"
```

---

## Task 4: Frontend — tag de días en la matriz de Pagos

**Files:** Modify `frontend/src/App.tsx` (componente `Pagos`, columna Alumno)

**Interfaces:**
- Consumes: `matrix.rows[].danzaDays` (Task 2).
- Produces: en las filas con `danzaDays > 0`, un tag "N días" junto al nombre del alumno.

- [ ] **Step 1: Mostrar el tag en la columna 'Alumno'**
En `cols` de `Pagos`, la primera columna es `{ title: 'Alumno', dataIndex: 'studentName', fixed: 'left', width: 170 }`. Cambiarla a renderizar el tag de días cuando aplique:
```tsx
    { title: 'Alumno', dataIndex: 'studentName', fixed: 'left', width: 190,
      render: (n: any, r: any) => <span>{n}{r.danzaDays > 0 && <Tag color="purple" style={{ marginLeft: 6 }}>{r.danzaDays} {r.danzaDays === 1 ? 'día' : 'días'}</Tag>}</span> },
```
(Las filas de descuento `_discount` no tienen `danzaDays` → no muestran tag. OK.)

- [ ] **Step 2: Build**
Run: `cd /opt/mw-secretaria/frontend && npm run build`
Expected: OK.

- [ ] **Step 3 (CONTROLADOR): deploy (API + frontend) + verificación end-to-end**
Verificar: arrastrar de bolsa a grupo → selector de días → aparece tarjeta con esos días y mensualidad por tramo; arrastrar de grupo A a B → queda solo en B; cambiar estado a Matriculado (⋯) → tarjeta verde y aparece en Pagos con su mensualidad + tag "N días"; comentario → 💬; quitar del grupo → vuelve a bolsa si no tiene más grupos; scroll interno en columnas con muchos alumnos. Limpiar cualquier dato de prueba (revertir estados/asignaciones de test).

- [ ] **Step 4: Commit y push**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): tag de dias de Danza en la matriz de Pagos"
git push
```

---

## Self-review (cobertura del spec)
- Board status/comment + students unificado → Task 1. ✓
- DELETE /danza/assignments (quitar grupo + mover) → Task 1. ✓
- matrix danzaDays → Task 2. ✓
- Kanban (bolsa + columnas), tarjetas por estado, arrastrables, selector de días, mover (quita origen), menú ⋯ (estado/comentario/quitar), scroll interno → Task 3. ✓
- Tag de días en Pagos → Task 4. ✓
- Refresco en vivo (topic `danza`) → ya en useLiveQuery (Task 3 lo conserva). ✓
- Reuso de ORG_STATUS/orgStat/PATCH enrollments → Task 3. ✓
