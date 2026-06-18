# Group Custom Pricing + Level Test Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir configurar tarifas propias (mensualidad y matrícula) por grupo directamente desde la página de Grupos, y añadir campo de hora en las pruebas de nivel.

**Architecture:** El modelo de datos ya soporta tarifas por grupo (`fee_schedules.group_id`). Se extiende el endpoint GET `/catalog/groups` para devolver los importes resueltos, y POST/PATCH para persistir fees de grupo. La sección de Grupos gana columnas de tarifa y un bloque en el modal. El campo `test_time` se añade a `level_tests` con una migración.

**Tech Stack:** NestJS + TypeORM (DataSource raw queries), PostgreSQL schema `secretaria`, React + Ant Design, `Input type="time"` nativo para selector de hora.

---

## Mapa de ficheros

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `migrations/012_level_test_time.sql` | Crear | Añadir columna `test_time varchar(5)` a `level_tests` |
| `backend/src/modules/catalog/catalog.controller.ts` | Modificar | GET groups enriquecido; POST groups con fees; nuevo PATCH groups/:id |
| `backend/src/modules/level-tests/level-tests.controller.ts` | Modificar | DTO + queries para `testTime` |
| `frontend/src/App.tsx` | Modificar | Tabla y modal Grupos con tarifas; tabla y modal PruebasNivel con hora |

---

## Task 1: Migración — añadir test_time a level_tests

**Files:**
- Create: `migrations/012_level_test_time.sql`

- [ ] **Crear el fichero de migración**

```sql
-- migrations/012_level_test_time.sql
-- Añade hora de la prueba de nivel (HH:MM varchar, nullable)
SET search_path TO secretaria, public;

ALTER TABLE secretaria.level_tests
  ADD COLUMN IF NOT EXISTS test_time varchar(5) NULL;

COMMENT ON COLUMN secretaria.level_tests.test_time IS 'Hora de la prueba en formato HH:MM';
```

- [ ] **Aplicar la migración en producción**

```bash
docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel \
  < /opt/mw-secretaria/migrations/012_level_test_time.sql
```

Resultado esperado: `ALTER TABLE`

- [ ] **Verificar columna creada**

```bash
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel \
  -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='secretaria' AND table_name='level_tests' AND column_name='test_time';"
```

Resultado esperado: una fila con `test_time | character varying`

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add migrations/012_level_test_time.sql
git commit -m "feat(db): add test_time column to level_tests"
```

---

## Task 2: Backend — level-tests con testTime

**Files:**
- Modify: `backend/src/modules/level-tests/level-tests.controller.ts`

- [ ] **Añadir `testTime` al DTO y a las queries**

Localizar el fichero y reemplazar `class TestDto` y los métodos `list`, `create`, `update`:

```typescript
// En TestDto, añadir debajo de testDate:
@IsOptional() @IsString() testTime?: string;  // 'HH:MM'
```

En el método `list`, añadir `lt.test_time AS "testTime"` al SELECT:
```typescript
@Get()
list(@Query('academicYearId') yearId?: string) {
  return this.ds.query(`
    SELECT lt.id, lt.candidate_name AS "candidateName", lt.candidate_contact AS "candidateContact",
           lt.student_id AS "studentId", lt.test_date AS "testDate",
           lt.test_time AS "testTime",
           lt.evaluator,
           lt.result_level AS "resultLevel", lt.recommended_program_id AS "recommendedProgramId",
           lt.notes, pr.name AS "recommendedProgramName",
           COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), lt.candidate_name) AS "displayName"
    FROM secretaria.level_tests lt
    LEFT JOIN secretaria.students st ON st.id=lt.student_id
    LEFT JOIN secretaria.programs pr ON pr.id=lt.recommended_program_id
    WHERE ($1::uuid IS NULL OR lt.academic_year_id=$1)
    ORDER BY lt.test_date DESC NULLS LAST
  `, [yearId || null]);
}
```

En el método `create` (POST), añadir `test_time` al INSERT:
```typescript
@Post() @Roles('secretaria_admin','secretaria_staff')
async create(@Body() b: TestDto, @Request() req: any) {
  const yearId = b.academicYearId || await this.activeYearId();
  const r = await this.ds.query(`
    INSERT INTO secretaria.level_tests
      (student_id, candidate_name, candidate_contact, academic_year_id,
       test_date, test_time, evaluator, result_level, recommended_program_id, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id
  `, [b.studentId||null, b.candidateName||null, b.candidateContact||null,
      yearId||null, b.testDate||null, b.testTime||null,
      b.evaluator||null, b.resultLevel||null, b.recommendedProgramId||null, b.notes||null]);
  return { id: r[0].id };
}
```

En el método `update` (PATCH), añadir `test_time` al UPDATE:
```typescript
@Patch(':id') @Roles('secretaria_admin','secretaria_staff')
async update(@Param('id') id: string, @Body() b: TestDto) {
  await this.ds.query(`
    UPDATE secretaria.level_tests SET
      candidate_name      = COALESCE($2, candidate_name),
      candidate_contact   = COALESCE($3, candidate_contact),
      test_date           = COALESCE($4, test_date),
      test_time           = COALESCE($5, test_time),
      evaluator           = COALESCE($6, evaluator),
      result_level        = COALESCE($7, result_level),
      recommended_program_id = COALESCE($8::uuid, recommended_program_id),
      notes               = COALESCE($9, notes)
    WHERE id = $1
  `, [id, b.candidateName||null, b.candidateContact||null,
      b.testDate||null, b.testTime||null,
      b.evaluator||null, b.resultLevel||null,
      b.recommendedProgramId||null, b.notes||null]);
  return { ok: true };
}
```

- [ ] **Verificar que el backend compila**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```

Resultado esperado: sin errores TypeScript.

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/level-tests/level-tests.controller.ts
git commit -m "feat(level-tests): add testTime field to DTO and queries"
```

---

## Task 3: Backend — GET /catalog/groups enriquecido con tarifas

**Files:**
- Modify: `backend/src/modules/catalog/catalog.controller.ts`

- [ ] **Reemplazar el método `listGroups` por versión enriquecida**

Sustituir:
```typescript
@Get('groups') listGroups(@Query('academicYearId') yearId?: string) {
  return this.groups.find({ where: yearId ? { academicYearId: yearId } as any : {}, order: { name: 'ASC' } });
}
```

Por:
```typescript
@Get('groups')
async listGroups(@Query('academicYearId') yearId?: string) {
  const groups = await this.groups.find({
    where: yearId ? { academicYearId: yearId } as any : {},
    order: { name: 'ASC' },
  });
  if (groups.length === 0) return [];

  const groupIds = groups.map(g => g.id);

  // Tarifas propias de cada grupo (mensualidad y matricula)
  const customFees: { group_id: string; concept: string; amount: string }[] =
    await this.ds.query(
      `SELECT group_id, concept, amount::numeric FROM secretaria.fee_schedules
       WHERE group_id = ANY($1::uuid[]) AND is_active = true
         AND concept IN ('mensualidad','matricula')`,
      [groupIds],
    );

  // Tarifas heredadas: nivel programa y nivel servicio, para los programas de estos grupos
  const programIds = [...new Set(groups.map(g => g.programId).filter(Boolean))];
  const inheritedFees: { program_id: string | null; service_id: string; concept: string; amount: string }[] =
    programIds.length > 0
      ? await this.ds.query(
          `SELECT f.program_id, f.service_id, f.concept, f.amount::numeric
           FROM secretaria.fee_schedules f
           WHERE f.group_id IS NULL AND f.is_active = true
             AND f.concept IN ('mensualidad','matricula')
             AND (
               f.program_id = ANY($1::uuid[])
               OR (f.program_id IS NULL AND f.service_id IN (
                 SELECT service_id FROM secretaria.programs WHERE id = ANY($1::uuid[])
               ))
             )
           ORDER BY f.program_id NULLS LAST`,
          [programIds],
        )
      : [];

  // Mapas auxiliares
  const customByGroup: Record<string, Record<string, number>> = {};
  for (const f of customFees) {
    if (!customByGroup[f.group_id]) customByGroup[f.group_id] = {};
    customByGroup[f.group_id][f.concept] = Number(f.amount);
  }

  // Para heredado: programa gana sobre servicio
  const inheritedByProgram: Record<string, Record<string, number>> = {};
  const inheritedByService: Record<string, Record<string, number>> = {};
  for (const f of inheritedFees) {
    const amt = Number(f.amount);
    if (f.program_id) {
      if (!inheritedByProgram[f.program_id]) inheritedByProgram[f.program_id] = {};
      inheritedByProgram[f.program_id][f.concept] = amt;
    } else {
      if (!inheritedByService[f.service_id]) inheritedByService[f.service_id] = {};
      inheritedByService[f.service_id][f.concept] = amt;
    }
  }

  // Mapa programId → serviceId (para resolver herencia servicio)
  const programServiceMap: Record<string, string> = {};
  if (programIds.length > 0) {
    const ps: { id: string; service_id: string }[] = await this.ds.query(
      `SELECT id, service_id FROM secretaria.programs WHERE id = ANY($1::uuid[])`,
      [programIds],
    );
    for (const p of ps) programServiceMap[p.id] = p.service_id;
  }

  const resolveFee = (group: (typeof groups)[0], concept: string): { amount: number | null; isCustom: boolean } => {
    const custom = customByGroup[group.id]?.[concept];
    if (custom !== undefined) return { amount: custom, isCustom: true };
    const progFee = group.programId ? inheritedByProgram[group.programId]?.[concept] : undefined;
    if (progFee !== undefined) return { amount: progFee, isCustom: false };
    const svcId = group.programId ? programServiceMap[group.programId] : undefined;
    const svcFee = svcId ? inheritedByService[svcId]?.[concept] : undefined;
    return { amount: svcFee ?? null, isCustom: false };
  };

  return groups.map(g => ({
    ...g,
    feeMonthly: resolveFee(g, 'mensualidad'),
    feeMatricula: resolveFee(g, 'matricula'),
  }));
}
```

- [ ] **Compilar para verificar tipos**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```

Resultado esperado: sin errores.

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/catalog/catalog.controller.ts
git commit -m "feat(catalog): enrich GET groups with resolved fee amounts"
```

---

## Task 4: Backend — POST groups y nuevo PATCH groups/:id con gestión de fees

**Files:**
- Modify: `backend/src/modules/catalog/catalog.controller.ts`

- [ ] **Reemplazar `createGroup` y añadir `updateGroup`**

Sustituir:
```typescript
@Post('groups') @Roles('secretaria_admin','secretaria_staff')
createGroup(@Body() b: Partial<Group>) { return this.groups.save(this.groups.create(b)); }
```

Por:
```typescript
@Post('groups') @Roles('secretaria_admin','secretaria_staff')
async createGroup(@Body() b: Partial<Group> & { customFeeMonthly?: number | null; customFeeMatricula?: number | null }) {
  const { customFeeMonthly, customFeeMatricula, ...groupData } = b;
  const group = await this.groups.save(this.groups.create(groupData));
  await this.upsertGroupFees(group.id, group.academicYearId, customFeeMonthly, customFeeMatricula);
  return group;
}

@Patch('groups/:id') @Roles('secretaria_admin','secretaria_staff')
async updateGroup(@Param('id') id: string, @Body() b: Partial<Group> & { customFeeMonthly?: number | null; customFeeMatricula?: number | null }) {
  const { customFeeMonthly, customFeeMatricula, ...groupData } = b;
  if (Object.keys(groupData).length > 0) await this.groups.update(id, groupData);
  const group = await this.groups.findOne({ where: { id } });
  if (customFeeMonthly !== undefined || customFeeMatricula !== undefined) {
    await this.upsertGroupFees(id, group.academicYearId, customFeeMonthly, customFeeMatricula);
  }
  return group;
}

// Helper: upsert o borrar fee_schedule de un grupo para mensualidad/matricula
private async upsertGroupFees(
  groupId: string,
  academicYearId: string,
  monthly?: number | null,
  matricula?: number | null,
) {
  // Obtener service_id del grupo via program
  const rows = await this.ds.query(
    `SELECT p.service_id FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id WHERE g.id=$1`,
    [groupId],
  );
  const serviceId: string | undefined = rows[0]?.service_id;
  if (!serviceId) return; // grupo sin programa — no se puede vincular tarifa

  const handle = async (concept: string, amount: number | null | undefined) => {
    if (amount === undefined) return; // no tocar
    // Borrar la existente (si la hay)
    await this.ds.query(
      `DELETE FROM secretaria.fee_schedules WHERE group_id=$1 AND concept=$2::secretaria.fee_concept AND academic_year_id=$3`,
      [groupId, concept, academicYearId],
    );
    // Insertar la nueva (si amount no es null)
    if (amount !== null) {
      await this.ds.query(
        `INSERT INTO secretaria.fee_schedules(academic_year_id, service_id, group_id, concept, amount, is_active)
         VALUES ($1,$2,$3,$4::secretaria.fee_concept,$5,true)`,
        [academicYearId, serviceId, groupId, concept, amount],
      );
    }
  };

  await handle('mensualidad', monthly);
  await handle('matricula', matricula);
}
```

- [ ] **Compilar**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/catalog/catalog.controller.ts
git commit -m "feat(catalog): POST/PATCH groups with custom fee upsert"
```

---

## Task 5: Desplegar backend

- [ ] **Build y redeploy del contenedor**

```bash
cd /opt/mw-secretaria
docker build -t mw-secretaria-api:latest backend
docker rm -f mw-secretaria-api
docker run -d --name mw-secretaria-api \
  --network mw-panel_mw-network \
  -p 127.0.0.1:3010:3010 \
  --env-file backend/.env \
  -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db:ro \
  --restart unless-stopped \
  mw-secretaria-api:latest
```

- [ ] **Verificar API en producción**

```bash
# Health check
curl -s https://secretaria.mundoworld.school/api/health/status | jq .

# Login para obtener token
TOKEN=$(curl -s -X POST https://secretaria.mundoworld.school/api/secretaria/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@mundoworld.school","password":"admin123"}' | jq -r .access_token)

# GET groups — verificar que devuelve feeMonthly y feeMatricula
curl -s https://secretaria.mundoworld.school/api/secretaria/catalog/groups \
  -H "Authorization: Bearer $TOKEN" | jq '.[0] | {name, feeMonthly, feeMatricula}'
```

Resultado esperado: objeto con `feeMonthly: { amount: ..., isCustom: false }` y `feeMatricula: { amount: ..., isCustom: false }`.

---

## Task 6: Frontend — Tabla Grupos con columnas de tarifa

**Files:**
- Modify: `frontend/src/App.tsx` — función `Grupos`

- [ ] **Añadir columnas Tarifa/mes y Matrícula a la tabla**

Localizar el array `columns` de la tabla en `function Grupos()` (alrededor de línea 291) y añadir las dos columnas al final:

```typescript
columns={[
  { title: 'Grupo', dataIndex: 'name' },
  { title: 'Programa', dataIndex: 'programId', render: progName },
  { title: 'Profesor', dataIndex: 'teacherId', render: (t) => t ? teacherName(t) : '—' },
  { title: 'Aula', dataIndex: 'room', render: (r) => r || '—' },
  { title: 'Aforo', dataIndex: 'capacity', render: (c) => c || '—' },
  {
    title: 'Tarifa/mes',
    render: (_: any, r: any) => {
      const f = r.feeMonthly;
      if (!f || f.amount == null) return <Text type="secondary">Sin tarifa</Text>;
      return f.isCustom
        ? <><Text strong style={{ color: '#579172' }}>{f.amount}€</Text> <Tag color="green" style={{ fontSize: 11 }}>Personalizada</Tag></>
        : <Text type="secondary">{f.amount}€ (heredada)</Text>;
    },
  },
  {
    title: 'Matrícula',
    render: (_: any, r: any) => {
      const f = r.feeMatricula;
      if (!f || f.amount == null) return <Text type="secondary">—</Text>;
      return f.isCustom
        ? <><Text strong style={{ color: '#579172' }}>{f.amount}€</Text> <Tag color="green" style={{ fontSize: 11 }}>Personalizada</Tag></>
        : <Text type="secondary">{f.amount}€ (heredada)</Text>;
    },
  },
]}
```

Asegurarse de que `Text` está importado desde `antd` (ya lo está en el resto del fichero).

- [ ] **Commit parcial frontend**

```bash
cd /opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(grupos-ui): add fee columns to groups table"
```

---

## Task 7: Frontend — Modal de Grupos con bloque "Tarifas del grupo"

**Files:**
- Modify: `frontend/src/App.tsx` — función `Grupos`

- [ ] **Añadir estado y lógica de edición al componente Grupos**

Después de `const [open, setOpen] = useState(false);` añadir:
```typescript
const [editing, setEditing] = useState<any>(null);
```

Crear `openEdit`:
```typescript
const openEdit = (r: any) => {
  setEditing(r);
  form.setFieldsValue({
    ...r,
    customFeeMonthly: r.feeMonthly?.isCustom ? r.feeMonthly.amount : undefined,
    customFeeMatricula: r.feeMatricula?.isCustom ? r.feeMatricula.amount : undefined,
  });
  setOpen(true);
};
```

Modificar `openNew` para limpiar `editing`:
```typescript
const openNew = () => {
  setEditing(null);
  form.resetFields();
  form.setFieldsValue({ academicYearId: years.find(y => y.isActive)?.id });
  setOpen(true);
};
```

Modificar `save` para usar PATCH cuando hay `editing`:
```typescript
const save = async (v: any) => {
  try {
    if (editing) {
      await api.patch(`/catalog/groups/${editing.id}`, v);
      message.success('Grupo actualizado');
    } else {
      await api.post('/catalog/groups', v);
      message.success('Grupo creado');
    }
    setOpen(false);
    load();
  } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
};
```

- [ ] **Añadir botón "Editar" a la tabla y bloque de tarifas al modal**

En las columnas de la tabla, añadir columna de acciones al final:
```typescript
{
  title: '',
  render: (_: any, r: any) => (
    <Button size="small" onClick={() => openEdit(r)}>Editar</Button>
  ),
},
```

En el `<Modal>`, cambiar `title` y `okText`:
```typescript
<Modal
  title={editing ? 'Editar grupo' : 'Nuevo grupo'}
  open={open}
  onCancel={() => { setOpen(false); setEditing(null); }}
  onOk={() => form.submit()}
  okText={editing ? 'Guardar' : 'Crear'}
>
```

Dentro del `<Form>`, **después** del `Form.Item` de `capacity`, añadir el bloque de tarifas:
```tsx
<div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 4 }}>
  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
    Tarifas del grupo (opcional) — si se dejan vacías, hereda la tarifa del programa o servicio
  </Text>
  <Row gutter={12}>
    <Col span={12}>
      <Form.Item
        name="customFeeMonthly"
        label={
          <span>
            Mensualidad propia
            {editing?.feeMonthly?.amount != null && (
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                heredada: {editing.feeMonthly.amount}€
              </Text>
            )}
          </span>
        }
      >
        <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="€/mes" addonAfter="€" />
      </Form.Item>
    </Col>
    <Col span={12}>
      <Form.Item
        name="customFeeMatricula"
        label={
          <span>
            Matrícula propia
            {editing?.feeMatricula?.amount != null && (
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                heredada: {editing.feeMatricula.amount}€
              </Text>
            )}
          </span>
        }
      >
        <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="€ único" addonAfter="€" />
      </Form.Item>
    </Col>
  </Row>
</div>
```

> **Nota sobre borrar tarifa propia:** Si el usuario borra el valor del campo y guarda, `InputNumber` envía `undefined` (no `null`). Para que el backend reciba `null` y borre la tarifa, hay que transformar los valores en `save`:
```typescript
const save = async (v: any) => {
  const payload = {
    ...v,
    customFeeMonthly: v.customFeeMonthly ?? null,
    customFeeMatricula: v.customFeeMatricula ?? null,
  };
  // ... resto igual
};
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(grupos-ui): add edit modal with custom fee block"
```

---

## Task 8: Frontend — PruebasNivel con campo de hora

**Files:**
- Modify: `frontend/src/App.tsx` — función `PruebasNivel`

- [ ] **Añadir columna Hora a la tabla de pruebas de nivel**

Localizar el array `columns` de `PruebasNivel` (alrededor de línea 1186) y añadir después de la columna "Fecha":
```typescript
{ title: 'Hora', dataIndex: 'testTime', render: (t: string) => t || '—' },
```

- [ ] **Modificar `openEdit` para preservar testTime**

Sustituir:
```typescript
const openEdit = (r: any) => { setEditing(r); form.setFieldsValue({ ...r, testDate: r.testDate ? String(r.testDate).slice(0, 10) : undefined }); setOpen(true); };
```

Por:
```typescript
const openEdit = (r: any) => {
  setEditing(r);
  form.setFieldsValue({
    ...r,
    testDate: r.testDate ? String(r.testDate).slice(0, 10) : undefined,
    testTime: r.testTime || undefined,
  });
  setOpen(true);
};
```

- [ ] **Añadir campo `testTime` en el modal**

Localizar la fila con `testDate` y `evaluator` (alrededor de línea 1200) y añadir `testTime` en esa misma fila, convirtiendo en Row de 3 columnas:

```tsx
<Row gutter={12}>
  <Col span={8}>
    <Form.Item name="testDate" label="Fecha de la prueba">
      <Input type="date" />
    </Form.Item>
  </Col>
  <Col span={8}>
    <Form.Item name="testTime" label="Hora">
      <Input type="time" placeholder="HH:MM" />
    </Form.Item>
  </Col>
  <Col span={8}>
    <Form.Item name="evaluator" label="Evaluador">
      <Input />
    </Form.Item>
  </Col>
</Row>
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(pruebas-nivel): add testTime field to modal and table"
```

---

## Task 9: Build y despliegue frontend

- [ ] **Build del frontend**

```bash
cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -10
```

Resultado esperado: `built in X.XXs` sin errores TypeScript.

- [ ] **Desplegar a frontend-dist**

```bash
cp -r /opt/mw-secretaria/frontend/dist/* /opt/mw-secretaria/frontend-dist/
```

- [ ] **Verificación manual en el navegador**

1. Ir a https://secretaria.mundoworld.school → sección **Grupos**
2. La tabla debe mostrar las columnas "Tarifa/mes" y "Matrícula" con valores heredados en gris
3. Hacer clic en "Editar" en cualquier grupo → el modal abre con el bloque "Tarifas del grupo"
4. El label muestra "heredada: X€" como referencia
5. Introducir un importe en "Mensualidad propia" y guardar → la columna de la tabla pasa a verde con badge "Personalizada"
6. Editar el mismo grupo, borrar el importe y guardar → vuelve a heredada (gris)
7. Ir a **Pruebas de nivel** → la tabla tiene columna "Hora"
8. Crear o editar una prueba → el modal tiene el campo "Hora" entre Fecha y Evaluador

- [ ] **Commit final de verificación**

```bash
cd /opt/mw-secretaria
git add -p  # revisar si quedó algo sin commitear
git status
```
