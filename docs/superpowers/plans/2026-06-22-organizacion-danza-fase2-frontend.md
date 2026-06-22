# Organización de Danza — Fase 2 (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección "Danza" en el menú para asignar alumnos a **días concretos** de los grupos (con su tarifa por tramos resuelta y el maillot visibles), más el switch "Cobra maillot" por grupo y un editor de **tramos** de tarifa. La columna Maillot en Pagos ya sale del backend (Fase 1).

**Architecture:** Componente `DanzaBoard` en `frontend/src/App.tsx` que consume los endpoints `/danza/*` de la Fase 1 (ya desplegados). Sección propia en el menú (clave `danza`), como `apoyo`. Switch maillot en el modal de Grupos. Editor de tramos (modal) que usa `/danza/tiers`.

**Tech Stack:** React 18 + AntD (Card, Table, Modal, Switch, Select, Button, message, Tag), drag-drop HTML5 (patrón de `ApoyoBoard`/`Organizacion`).

## Global Constraints
- **El backend de la Fase 1 ya está desplegado y verificado.** Endpoints: `GET /danza/board?academicYearId`, `POST /danza/assign {enrollmentId, groupId, weekday, startTime, room?}`, `DELETE /danza/assignment/:id`, `GET /danza/tiers?groupId?`, `POST /danza/tiers {groupId?, days, amount}`, `DELETE /danza/tiers/:id`. `PATCH /catalog/groups/:id` acepta `billsMaillot`.
- **board response**: `{ groups:[{id,name,room,color,billsMaillot,schedule:[{weekday,startTime,room}]}], students:[{enrollmentId,studentName,assignments:[{id,groupId,weekday,startTime,room}],totalDays,monthly,maillot}], pool:[{enrollmentId,studentName}] }`.
- **Solo curso activo** (el board usa el año activo). Grupos Danza consolidados: "Grupo Negro A", "Morado".
- **Patrón de sección**: añadir `danza` al mapa de vistas, al menú (`GROUPS`) y al routing `{safeView === 'danza' && <DanzaBoard />}`. NO en `TEACHER_VIEWS` (solo gestión).
- **Git**: `export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria` antes de git; NO push (controlador). **Deploy frontend** (controlador): `cd frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`.
- **Verificación**: build limpio + (controlador) despliegue y comprobación visual con dos pantallas.

---

## Estructura de ficheros
- `frontend/src/App.tsx` — nuevo `DanzaBoard`, nuevo `DanzaTiersModal`, sección `danza` en menú+routing, switch maillot en el modal de Grupos.

Días de la semana (helper a usar): `const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];` (weekday 1..7). Si ya existe `DAYS` a nivel módulo, reutilizarlo.

---

## Task 0: Endurecer `assign` con validación de servicio Danza (backend)

> Recomendado por la revisión final de la Fase 1: el board UI escribirá asignaciones, así que el endpoint debe rechazar matrículas/grupos que no sean de Danza (evita filas cross-servicio por un bug del frontend). Staff-only, inerte para facturación, pero conviene cerrarlo.

**Files:** Modify `backend/src/modules/danza/danza.controller.ts` (método `assign`)

**Interfaces:**
- Produces: `POST /danza/assign` devuelve `{ ok:false, error }` si la matrícula no es de servicio DANZA o el grupo no pertenece a un programa DANZA; si no, inserta como antes.

- [ ] **Step 1: Añadir la validación al inicio de `assign`** (antes del INSERT):
```typescript
    const chk = await this.ds.query(`
      SELECT 1 FROM secretaria.enrollments e JOIN secretaria.services se ON se.id=e.service_id
      JOIN secretaria.groups g ON g.id=$2 JOIN secretaria.programs p ON p.id=g.program_id JOIN secretaria.services sg ON sg.id=p.service_id
      WHERE e.id=$1 AND se.code='DANZA' AND sg.code='DANZA'`, [b.enrollmentId, b.groupId]);
    if (chk.length === 0) return { ok: false, error: 'La matrícula o el grupo no son de Danza' };
```

- [ ] **Step 2: Compilar**
Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit`
Expected: limpio.

- [ ] **Step 3 (CONTROLADOR): deploy API + verificar** que asignar una matrícula Danza a un grupo Danza sigue funcionando (200/ok), y que una matrícula no-Danza es rechazada.

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add backend/src/modules/danza/danza.controller.ts
git commit -m "fix(secretaria): validar servicio Danza en /danza/assign"
```

---

## Task 1: Componente `DanzaBoard` + sección en el menú

**Files:** Modify `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `/danza/board`, `/danza/assign`, `/danza/assignment/:id`; `api`, `useLiveQuery` (topics que existan; usar `['enrollments','groups']` para refresco), `fmtDate` no aplica.
- Produces: componente `DanzaBoard` y la vista `danza` en el menú.

- [ ] **Step 1: Escribir el componente `DanzaBoard`**
Insertarlo cerca de `ApoyoBoard` (antes o después). Estructura:
```tsx
function DanzaBoard() {
  const [years, setYears] = useState<any[]>([]);
  const [data, setData] = useState<any>({ groups: [], students: [], pool: [] });
  const [loading, setLoading] = useState(false);
  const [dragEnr, setDragEnr] = useState<string | null>(null);
  const [tiersOpen, setTiersOpen] = useState(false);
  const activeYear = () => years.find(y => y.isActive);
  const load = async () => {
    const y = activeYear(); if (!y) return;
    setLoading(true);
    try { const { data } = await api.get('/danza/board', { params: { academicYearId: y.id } }); setData(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { api.get('/catalog/years').then(r => setYears(r.data)); }, []);
  useEffect(() => { if (years.length) load(); }, [years]);
  useLiveQuery(['enrollments', 'groups'], load);

  // asignar (arrastrar alumno del pool a una franja de grupo) o quitar
  const assign = async (enrollmentId: string, g: any, slot: any) => {
    try { await api.post('/danza/assign', { enrollmentId, groupId: g.id, weekday: slot.weekday, startTime: slot.startTime, room: slot.room || g.room }); load(); }
    catch { message.error('No se pudo asignar'); }
  };
  const removeAssign = async (assignmentId: string) => {
    try { await api.delete(`/danza/assignment/${assignmentId}`); load(); }
    catch { message.error('Error'); }
  };

  // alumnos asignados a una franja concreta de un grupo
  const studentsInSlot = (g: any, slot: any) => data.students.filter((s: any) =>
    (s.assignments || []).some((a: any) => a.groupId === g.id && a.weekday === slot.weekday && a.startTime === slot.startTime));
  const assignmentId = (s: any, g: any, slot: any) => (s.assignments || []).find((a: any) =>
    a.groupId === g.id && a.weekday === slot.weekday && a.startTime === slot.startTime)?.id;

  const DOW = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return (
    <div>
      <Title level={3}>Danza</Title>
      <Ayuda title="Organización de Danza por días">
        Cada grupo ofrece franjas (día + hora, definidas en <b>Horarios</b>). Arrastra un alumno de <b>Sin asignar</b> a la franja a la que viene.
        La <b>mensualidad se calcula por el total de días</b> que suma el alumno (tabla de tramos, editable en <b>Tramos de tarifa</b>); el <b>maillot</b> se cobra si el grupo lo tiene activado.
      </Ayuda>
      <Card>
        <Space style={{ marginBottom: 12 }} wrap>
          <Button onClick={load}>Actualizar</Button>
          <Button onClick={() => setTiersOpen(true)}>Tramos de tarifa</Button>
        </Space>
        <Row gutter={12}>
          {/* Pool: sin asignar */}
          <Col xs={24} md={6}>
            <Card size="small" title={`Sin asignar (${data.pool.length})`}
              style={{ background: '#FAFAF8' }}>
              {data.pool.map((p: any) => (
                <div key={p.enrollmentId} draggable onDragStart={() => setDragEnr(p.enrollmentId)} onDragEnd={() => setDragEnr(null)}
                  style={{ padding: '4px 8px', marginBottom: 4, border: '1px solid #E2DDD8', borderRadius: 4, cursor: 'grab', background: '#fff' }}>
                  {p.studentName}
                </div>
              ))}
              {!data.pool.length && <Text type="secondary">Todos asignados</Text>}
            </Card>
          </Col>
          {/* Grupos con sus franjas */}
          <Col xs={24} md={18}>
            <Row gutter={[12, 12]}>
              {data.groups.map((g: any) => (
                <Col xs={24} lg={12} key={g.id}>
                  <Card size="small" title={<span>{g.name} {g.billsMaillot && <Tag color="purple">maillot</Tag>}</span>}>
                    {(g.schedule || []).length === 0 && <Text type="secondary">Sin franjas — defínelas en Horarios</Text>}
                    {(g.schedule || []).map((slot: any, i: number) => (
                      <div key={i} onDragOver={e => e.preventDefault()} onDrop={() => dragEnr && assign(dragEnr, g, slot)}
                        style={{ border: '1px dashed #E2DDD8', borderRadius: 4, padding: 6, marginBottom: 6 }}>
                        <Text strong style={{ fontSize: 12 }}>{DOW[slot.weekday]} {slot.startTime}{slot.room ? ` · ${slot.room}` : ''}</Text>
                        <div style={{ marginTop: 4 }}>
                          {studentsInSlot(g, slot).map((s: any) => (
                            <Tag key={s.enrollmentId} closable onClose={(e) => { e.preventDefault(); const id = assignmentId(s, g, slot); if (id) removeAssign(id); }}
                              style={{ marginBottom: 2 }}>{s.studentName}</Tag>
                          ))}
                          {!studentsInSlot(g, slot).length && <Text type="secondary" style={{ fontSize: 11 }}>(arrastra alumnos aquí)</Text>}
                        </div>
                      </div>
                    ))}
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
        {/* Resumen: alumnos con días + tarifa resuelta */}
        <Card size="small" title="Alumnos asignados (días y mensualidad)" style={{ marginTop: 12 }}>
          <SearchableTable rowKey="enrollmentId" dataSource={data.students} size="small" pagination={{ pageSize: 15 }}
            columns={[
              { title: 'Alumno', dataIndex: 'studentName' },
              { title: 'Días', dataIndex: 'totalDays', align: 'center' },
              { title: 'Detalle', render: (_: any, s: any) => (s.assignments || []).map((a: any) => `${DOW[a.weekday]} ${a.startTime}`).join(', ') },
              { title: 'Mensualidad', dataIndex: 'monthly', align: 'right', render: (m: any) => m != null ? `${Number(m).toFixed(2)} €` : <Tag color="red">sin tramo</Tag> },
              { title: 'Maillot', dataIndex: 'maillot', align: 'right', render: (m: any) => m != null ? `${Number(m).toFixed(2)} €` : '—' },
            ]} />
        </Card>
      </Card>
      <DanzaTiersModal open={tiersOpen} onClose={() => setTiersOpen(false)} groups={data.groups} />
    </div>
  );
}
```
(NOTA: `Col`, `Row`, `Space`, `Tag`, `SearchableTable`, `Ayuda`, `Title`, `Text` ya están importados/definidos a nivel módulo. Reutilizar.)

- [ ] **Step 2: Registrar la sección `danza` en el menú y el routing**
Buscar el mapa de vistas (donde están `organizacion:` y `apoyo:`, ~línea 4837/4855) y añadir, junto a `apoyo`:
```tsx
    danza: { icon: <AppstoreOutlined />, label: 'Danza' },
```
Añadir `'danza'` al grupo de menú correspondiente (donde esté `'apoyo'` en `GROUPS`/`ALL_KEYS`; buscar la lista que contiene `'apoyo'` y añadir `'danza'` al lado). En el routing del `Content` (donde está `{safeView === 'apoyo' && <ApoyoBoard />}`, ~línea 4941) añadir:
```tsx
          {safeView === 'danza' && <DanzaBoard />}
```
(`DanzaTiersModal` se implementa en Task 3; para que compile este Task, crear primero un stub mínimo `function DanzaTiersModal(_: any){ return null; }` y reemplazarlo en Task 3 — o implementar Task 3 antes. El implementador puede hacer Task 1+3 juntos.)

- [ ] **Step 3: Build**
Run: `cd /opt/mw-secretaria/frontend && npm run build`
Expected: build OK (si falla por `DanzaTiersModal` no definido, añadir el stub de arriba o hacer Task 3 primero).

- [ ] **Step 4: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): seccion Danza (tablero de asignacion por dias + tarifa resuelta)"
```

---

## Task 2: Switch "Cobra maillot" en el editor de Grupos

**Files:** Modify `frontend/src/App.tsx` (componente `Grupos`, su Modal de crear/editar)

**Interfaces:**
- Consumes: `PATCH/POST /catalog/groups` con `billsMaillot` (ya soportado).
- Produces: el formulario de grupo incluye un `Switch` "Cobra maillot" que persiste `billsMaillot`.

- [ ] **Step 1: Añadir el campo al formulario de Grupos**
En el `<Form>` del Modal de Grupos (cerca de los campos aula/aforo), añadir:
```tsx
          <Form.Item name="billsMaillot" label="Cobra maillot" valuePropName="checked" tooltip="Si se activa, los alumnos con días en este grupo pagan el maillot (una vez al año).">
            <Switch />
          </Form.Item>
```
Asegurar que al abrir "Editar" se precarga: en `openEdit(r)` el `form.setFieldsValue` debe incluir `billsMaillot: r.billsMaillot` (la fila del listado ya trae `billsMaillot` desde `/catalog/groups`; si no, añadirlo). En `save`, el valor ya va en el body del PATCH/POST (el form lo incluye); confirmar que `save` envía todos los valores del form.
(NOTA: `Switch` ya está importado.)

- [ ] **Step 2: Build**
Run: `cd /opt/mw-secretaria/frontend && npm run build`
Expected: OK.

- [ ] **Step 3: Commit**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): switch 'Cobra maillot' en el editor de grupos"
```

---

## Task 3: `DanzaTiersModal` — editor de tramos (default + por grupo)

**Files:** Modify `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `GET /danza/tiers?groupId?`, `POST /danza/tiers`, `DELETE /danza/tiers/:id`.
- Produces: `DanzaTiersModal({ open, onClose, groups })` usado por `DanzaBoard`.

- [ ] **Step 1: Implementar `DanzaTiersModal`**
```tsx
function DanzaTiersModal({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: any[] }) {
  const [scope, setScope] = useState<string>('default'); // 'default' o un groupId
  const [tiers, setTiers] = useState<any[]>([]);
  const [days, setDays] = useState<number | undefined>();
  const [amount, setAmount] = useState<number | undefined>();
  const load = async () => {
    const params = scope === 'default' ? {} : { groupId: scope };
    const { data } = await api.get('/danza/tiers', { params });
    setTiers(data);
  };
  useEffect(() => { if (open) load(); }, [open, scope]);
  const add = async () => {
    if (!days || days < 1 || amount == null || amount <= 0) { message.warning('Indica días (≥1) e importe (>0)'); return; }
    const body: any = { days, amount }; if (scope !== 'default') body.groupId = scope;
    const { data } = await api.post('/danza/tiers', body);
    if (data?.ok === false) message.warning(data.error); else { setDays(undefined); setAmount(undefined); load(); }
  };
  const del = async (id: string) => { await api.delete(`/danza/tiers/${id}`); load(); };
  return (
    <Modal title="Tramos de tarifa de Danza" open={open} onCancel={onClose} footer={<Button onClick={onClose}>Cerrar</Button>} width={560}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        Precio mensual según el nº de días que suma el alumno. La tabla "Por defecto" se usa salvo que TODOS los días sean de un grupo con su propio tramo.
      </Text>
      <Space style={{ marginBottom: 12 }} wrap>
        <Text>Tabla:</Text>
        <Select style={{ width: 240 }} value={scope} onChange={setScope}
          options={[{ value: 'default', label: 'Por defecto (Danza)' }, ...groups.map((g: any) => ({ value: g.id, label: `Override: ${g.name}` }))]} />
      </Space>
      <Table rowKey="id" size="small" pagination={false} dataSource={tiers}
        columns={[
          { title: 'Días', dataIndex: 'days', align: 'center' },
          { title: 'Mensualidad', dataIndex: 'amount', align: 'right', render: (a: any) => `${Number(a).toFixed(2)} €` },
          { title: '', align: 'right', render: (_: any, r: any) => <Popconfirm title="¿Quitar tramo?" onConfirm={() => del(r.id)}><Button size="small" danger>Quitar</Button></Popconfirm> },
        ]} />
      <Space style={{ marginTop: 12 }} wrap>
        <InputNumber min={1} placeholder="Días" value={days} onChange={(v) => setDays(v as number)} style={{ width: 90 }} />
        <InputNumber min={0} step={0.5} placeholder="€/mes" value={amount} onChange={(v) => setAmount(v as number)} style={{ width: 120 }} addonAfter="€" />
        <Button type="primary" onClick={add}>Añadir / actualizar tramo</Button>
      </Space>
    </Modal>
  );
}
```
(NOTA: `InputNumber`, `Select`, `Table`, `Popconfirm`, `Modal`, `Button`, `Space`, `Text` ya importados.) Reemplaza el stub si se creó en Task 1.

- [ ] **Step 2: Build**
Run: `cd /opt/mw-secretaria/frontend && npm run build`
Expected: OK.

- [ ] **Step 3 (CONTROLADOR): deploy + verificación visual (dos sesiones)**
Desplegar frontend; en la sección Danza: arrastrar un alumno del pool a una franja → aparece en la franja y en el resumen con sus días y mensualidad; quitar (✕ en el tag) → vuelve al pool; abrir "Tramos de tarifa" → ver default 1=30/2=50 y override Negro A 1=35/2=55, añadir un tramo 3=70 y quitarlo; en Grupos, activar "Cobra maillot" en un grupo y comprobar el tag morado en el tablero. Verificar refresco en vivo entre dos navegadores.

- [ ] **Step 4: Commit y push de la Fase 2**
```bash
export GIT_DIR=/root/secretaria-repo.git GIT_WORK_TREE=/opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(secretaria): editor de tramos de tarifa de Danza (default + por grupo)"
git push
```

---

## Self-review (cobertura del spec, sección E + maillot UI + tramos)
- Sección "Danza" con tablero de asignación por días + tarifa resuelta + pool → Task 1. ✓
- Switch maillot por grupo → Task 2. ✓
- Editor de tramos (default + por grupo) → Task 3. ✓
- Columna Maillot en Pagos → ya en Fase 1 (no requiere Task aquí). ✓
- Horario por aulas de Danza: el tablero muestra las franjas por grupo; la rejilla por aulas completa ya existe en la sección **Horarios** (los grupos Danza aparecen ahí). Se considera cubierto sin duplicar `HorarioAulas`. (Si se quisiera una rejilla Danza dedicada, sería una mejora futura.)

## Nota de dependencia entre tasks
Task 1 referencia `DanzaTiersModal` (Task 3). Implementar Task 3 junto con Task 1 (o el stub temporal) para que compile. El implementador puede entregar Task 1+3 en un mismo cambio; Task 2 es independiente.
