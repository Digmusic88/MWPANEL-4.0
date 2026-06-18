# Inscripción Completa + Pendientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un Drawer de inscripción completa (alumno + familia + servicios + pago matrícula) con seguimiento automático de pendientes en la sección Alumnos.

**Architecture:** Tres endpoints nuevos en `students.controller.ts` (`full-enroll`, `GET /:id/full`, `PATCH /:id/full`) y extensión del `GET /` con `pendingItems[]`. El Drawer de React se extrae a `InscripcionDrawer.tsx` (App.tsx ya tiene 2122 líneas); la instancia `api` de axios se mueve a `src/api.ts` para compartirla entre ficheros. Sin migración de BD.

**Tech Stack:** NestJS raw queries (DataSource), PostgreSQL schema `secretaria`, React + Ant Design (Drawer, Form.List, Switch), TypeScript.

---

## Mapa de ficheros

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `backend/src/modules/students/students.controller.ts` | Modificar | Añadir full-enroll, GET /:id/full, PATCH /:id/full; extender list con pendingItems |
| `frontend/src/api.ts` | Crear | Instancia axios compartida (extraída de App.tsx) |
| `frontend/src/components/InscripcionDrawer.tsx` | Crear | Drawer completo con las 4 secciones |
| `frontend/src/App.tsx` | Modificar | Importar api desde api.ts; actualizar Alumnos con botón + columna pendientes + filtro |

---

## Task 1: Backend — POST /students/full-enroll

**Files:**
- Modify: `backend/src/modules/students/students.controller.ts`

- [ ] **Leer el fichero actual** para conocer el punto de inserción (tras `addEnrollment`)

- [ ] **Añadir el método `fullEnroll`** dentro de la clase `StudentsController`, después del método `addEnrollment`:

```typescript
@Post('full-enroll') @Roles('secretaria_admin','secretaria_staff')
async fullEnroll(@Body() b: any) {
  const yearId = b.academicYearId || (await this.activeYearId());

  return this.ds.transaction(async (m) => {
    // 1. Familia
    const displayName = [b.student?.firstName, b.student?.lastName]
      .filter(Boolean).join(' ') || 'Familia sin nombre';
    const family = await m.save(m.create(Family, { displayName }));

    // 2. Tutor principal
    if (b.guardian1?.fullName) {
      await m.query(
        `INSERT INTO secretaria.guardians
           (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [family.id, b.guardian1.fullName,
         b.guardian1.relationship || 'tutor',
         b.guardian1.phone || null,
         b.guardian1.phoneAlt || null,
         b.guardian1.email || null,
         b.guardian1.nif || null],
      );
    }

    // 3. Tutor secundario (opcional)
    if (b.guardian2?.fullName) {
      await m.query(
        `INSERT INTO secretaria.guardians
           (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
        [family.id, b.guardian2.fullName,
         b.guardian2.relationship || 'tutor',
         b.guardian2.phone || null,
         b.guardian2.phoneAlt || null,
         b.guardian2.email || null,
         b.guardian2.nif || null],
      );
    }

    // 4. Alumno
    const student = await m.save(m.create(Student, {
      familyId: family.id,
      firstName: b.student?.firstName || null,
      lastName:  b.student?.lastName  || null,
      birthDate: b.student?.birthDate || null,
      gradeLabel: b.student?.gradeLabel || null,
      schoolOrigin: b.student?.schoolOrigin || null,
      notes: b.student?.notes || null,
    }));

    // 5. Matrículas + cargos
    const enrollments = [];
    const matriculaChargeIds: string[] = [];
    let totalMatricula = 0;

    for (const enrData of (b.enrollments || [])) {
      const enr = await m.save(m.create(Enrollment, {
        studentId: student.id,
        academicYearId: yearId,
        serviceId: enrData.serviceId,
        groupId: enrData.groupId || null,
        status: enrData.status || 'preinscrito',
        customFee: enrData.customFee ?? null,
      }));
      enrollments.push(enr);

      // Resolver importe matrícula para este enrollment
      const resolved = await m.query(
        `SELECT secretaria.fn_resolve_concept_fee($1,'matricula') AS amount`,
        [enr.id],
      );
      const matriculaAmount = Number(resolved[0]?.amount) || 0;
      if (matriculaAmount > 0) {
        totalMatricula += matriculaAmount;
        const chargeStatus = b.matriculaPaid ? 'pagado' : 'pendiente';
        const paidAt = b.matriculaPaid ? (b.matriculaPaid.date || new Date().toISOString().slice(0, 10)) : null;
        const chargeRes = await m.query(
          `INSERT INTO secretaria.charges(enrollment_id, concept, amount_due, status, paid_at)
           VALUES ($1,'matricula',$2,$3,$4) RETURNING id`,
          [enr.id, matriculaAmount, chargeStatus, paidAt],
        );
        if (b.matriculaPaid) matriculaChargeIds.push(chargeRes[0].id);
      }
    }

    // 6. Pago agrupado si se cobra matrícula ahora
    if (b.matriculaPaid && matriculaChargeIds.length > 0) {
      const paidAmount = b.matriculaPaid.amount ?? totalMatricula;
      const paidDate  = b.matriculaPaid.date || new Date().toISOString().slice(0, 10);
      const payRes = await m.query(
        `INSERT INTO secretaria.payments(family_id, amount, paid_at, method)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [family.id, paidAmount, paidDate, b.matriculaPaid.method],
      );
      const paymentId = payRes[0].id;
      const perCharge = Number((paidAmount / matriculaChargeIds.length).toFixed(2));
      for (const chargeId of matriculaChargeIds) {
        await m.query(
          `INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount)
           VALUES ($1,$2,$3)`,
          [paymentId, chargeId, perCharge],
        );
      }
    }

    return { family, student, enrollments };
  });
}
```

- [ ] **Asegurarse de que `Family` está importado** al inicio del fichero. Añadir si falta:

```typescript
import { Family } from '../families/entities';
```

(Ya importa `Student`, `Enrollment` desde `./entities` y `Family` desde `../families/entities` — si ya está, no duplicar.)

- [ ] **Verificar compilación**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```

Resultado esperado: sin errores nuevos.

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/students/students.controller.ts
git commit -m "feat(students): add full-enroll endpoint"
```

---

## Task 2: Backend — GET /students/:id/full

**Files:**
- Modify: `backend/src/modules/students/students.controller.ts`

- [ ] **Añadir el método `oneFull`** después del método `one` (GET `:id`):

```typescript
@Get(':id/full')
async oneFull(@Param('id') id: string) {
  const yearId = await this.activeYearId();

  const [student] = await this.ds.query(
    `SELECT s.id, s.first_name AS "firstName", s.last_name AS "lastName",
            s.birth_date AS "birthDate", s.grade_label AS "gradeLabel",
            s.school_origin AS "schoolOrigin", s.notes,
            s.mwpanel_student_id AS "mwpanelStudentId",
            s.family_id AS "familyId"
     FROM secretaria.students s WHERE s.id = $1`, [id]);
  if (!student) return null;

  const guardians = await this.ds.query(
    `SELECT id, full_name AS "fullName", relationship, phone,
            phone_alt AS "phoneAlt", email, nif,
            is_primary_contact AS "isPrimary"
     FROM secretaria.guardians WHERE family_id = $1
     ORDER BY is_primary_contact DESC`, [student.familyId]);

  const enrollments = await this.ds.query(
    `SELECT e.id, e.service_id AS "serviceId", sv.name AS "serviceName",
            e.group_id AS "groupId", g.name AS "groupName",
            e.status, e.custom_fee AS "customFee",
            secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee"
     FROM secretaria.enrollments e
     JOIN secretaria.services sv ON sv.id = e.service_id
     LEFT JOIN secretaria.groups g ON g.id = e.group_id
     WHERE e.student_id = $1 AND e.academic_year_id = $2
     ORDER BY sv.name`, [id, yearId]);

  // Pendientes
  const pendingItems: string[] = [];
  if (!student.lastName) pendingItems.push('Apellidos');
  if (!student.birthDate) pendingItems.push('Fecha nacimiento');
  const primaryGuardian = guardians.find((g: any) => g.isPrimary);
  if (!primaryGuardian?.email) pendingItems.push('Email tutor');
  for (const enr of enrollments) {
    if (enr.status === 'matriculado' && !enr.groupId)
      pendingItems.push(`Grupo sin asignar — ${enr.serviceName}`);
  }
  const pendingMatriculas = await this.ds.query(
    `SELECT sv.name FROM secretaria.charges ch
     JOIN secretaria.enrollments e ON e.id = ch.enrollment_id
     JOIN secretaria.services sv ON sv.id = e.service_id
     WHERE e.student_id = $1 AND ch.concept = 'matricula' AND ch.status = 'pendiente'
       AND e.academic_year_id = $2`, [id, yearId]);
  for (const pm of pendingMatriculas) pendingItems.push(`Matrícula pendiente — ${pm.name}`);

  return { ...student, guardians, enrollments, pendingItems };
}
```

- [ ] **Verificar compilación**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/students/students.controller.ts
git commit -m "feat(students): add GET /:id/full with pendingItems"
```

---

## Task 3: Backend — PATCH /students/:id/full

**Files:**
- Modify: `backend/src/modules/students/students.controller.ts`

- [ ] **Añadir el método `updateFull`** después de `oneFull`:

```typescript
@Patch(':id/full') @Roles('secretaria_admin','secretaria_staff')
async updateFull(@Param('id') id: string, @Body() b: any) {
  return this.ds.transaction(async (m) => {
    // Actualizar datos del alumno
    if (b.student) {
      const sets: string[] = [];
      const params: any[] = [];
      const push = (col: string, val: any) => { params.push(val); sets.push(`${col}=$${params.length}`); };
      if (b.student.firstName  !== undefined) push('first_name',    b.student.firstName  ?? null);
      if (b.student.lastName   !== undefined) push('last_name',     b.student.lastName   ?? null);
      if (b.student.birthDate  !== undefined) push('birth_date',    b.student.birthDate  ?? null);
      if (b.student.gradeLabel !== undefined) push('grade_label',   b.student.gradeLabel ?? null);
      if (b.student.schoolOrigin !== undefined) push('school_origin', b.student.schoolOrigin ?? null);
      if (b.student.notes      !== undefined) push('notes',         b.student.notes      ?? null);
      if (sets.length > 0) {
        params.push(id);
        await m.query(`UPDATE secretaria.students SET ${sets.join(',')} WHERE id=$${params.length}`, params);
      }
    }

    // Upsert tutor principal (is_primary_contact = true)
    if (b.guardian1?.fullName) {
      const existing = await m.query(
        `SELECT id FROM secretaria.guardians g
         JOIN secretaria.students s ON s.family_id = g.family_id
         WHERE s.id = $1 AND g.is_primary_contact = true LIMIT 1`, [id]);
      if (existing.length > 0) {
        await m.query(
          `UPDATE secretaria.guardians SET
             full_name=$1, relationship=$2, phone=$3, phone_alt=$4, email=$5, nif=$6
           WHERE id=$7`,
          [b.guardian1.fullName, b.guardian1.relationship || 'tutor',
           b.guardian1.phone || null, b.guardian1.phoneAlt || null,
           b.guardian1.email || null, b.guardian1.nif || null,
           existing[0].id]);
      } else {
        const [student] = await m.query(`SELECT family_id FROM secretaria.students WHERE id=$1`, [id]);
        await m.query(
          `INSERT INTO secretaria.guardians
             (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
          [student.family_id, b.guardian1.fullName, b.guardian1.relationship || 'tutor',
           b.guardian1.phone || null, b.guardian1.phoneAlt || null,
           b.guardian1.email || null, b.guardian1.nif || null]);
      }
    }

    // Upsert tutor secundario (is_primary_contact = false)
    if (b.guardian2?.fullName) {
      const [student] = await m.query(`SELECT family_id FROM secretaria.students WHERE id=$1`, [id]);
      const existing2 = await m.query(
        `SELECT id FROM secretaria.guardians WHERE family_id=$1 AND is_primary_contact=false LIMIT 1`,
        [student.family_id]);
      if (existing2.length > 0) {
        await m.query(
          `UPDATE secretaria.guardians SET
             full_name=$1, relationship=$2, phone=$3, phone_alt=$4, email=$5, nif=$6
           WHERE id=$7`,
          [b.guardian2.fullName, b.guardian2.relationship || 'tutor',
           b.guardian2.phone || null, b.guardian2.phoneAlt || null,
           b.guardian2.email || null, b.guardian2.nif || null,
           existing2[0].id]);
      } else {
        await m.query(
          `INSERT INTO secretaria.guardians
             (family_id, full_name, relationship, phone, phone_alt, email, nif, is_primary_contact)
           VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
          [student.family_id, b.guardian2.fullName, b.guardian2.relationship || 'tutor',
           b.guardian2.phone || null, b.guardian2.phoneAlt || null,
           b.guardian2.email || null, b.guardian2.nif || null]);
      }
    }

    return { ok: true };
  });
}
```

- [ ] **Verificar compilación**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/students/students.controller.ts
git commit -m "feat(students): add PATCH /:id/full for student+guardians update"
```

---

## Task 4: Backend — Extender GET /students con pendingItems

**Files:**
- Modify: `backend/src/modules/students/students.controller.ts`

- [ ] **Reemplazar el método `list`** (que actualmente tiene la query larga) por una versión que añade `pendingItems` y `pendingCount`:

```typescript
@Get() list(@Query('q') q?: string, @Query('pending') onlyPending?: string) {
  return this.ds.query(`
    SELECT s.id, s.first_name AS "firstName", s.last_name AS "lastName",
           s.is_active AS "isActive",
           s.mwpanel_student_id AS "mwpanelStudentId", s.family_id AS "familyId",
           COALESCE(json_agg(
             json_build_object('enrollmentId', e.id, 'serviceId', sv.id,
                               'serviceName', sv.name, 'status', e.status)
             ORDER BY sv.name) FILTER (WHERE ay.id IS NOT NULL), '[]') AS "enrollments",
           -- Pendientes calculados dinámicamente
           ARRAY_REMOVE(
             ARRAY[
               CASE WHEN s.last_name IS NULL OR s.last_name = '' THEN 'Apellidos' END,
               CASE WHEN s.birth_date IS NULL THEN 'Fecha nacimiento' END,
               CASE WHEN NOT EXISTS (
                 SELECT 1 FROM secretaria.guardians g
                 WHERE g.family_id = s.family_id
                   AND g.is_primary_contact = true
                   AND g.email IS NOT NULL AND g.email <> ''
               ) THEN 'Email tutor' END
             ]
             || ARRAY(
               SELECT 'Grupo sin asignar — ' || sv2.name
               FROM secretaria.enrollments e2
               JOIN secretaria.services sv2 ON sv2.id = e2.service_id
               JOIN secretaria.academic_years ay2 ON ay2.id = e2.academic_year_id AND ay2.is_active
               WHERE e2.student_id = s.id AND e2.status = 'matriculado' AND e2.group_id IS NULL
             )
             || ARRAY(
               SELECT 'Matrícula pendiente — ' || sv3.name
               FROM secretaria.charges ch
               JOIN secretaria.enrollments e3 ON e3.id = ch.enrollment_id
               JOIN secretaria.services sv3 ON sv3.id = e3.service_id
               JOIN secretaria.academic_years ay3 ON ay3.id = e3.academic_year_id AND ay3.is_active
               WHERE e3.student_id = s.id AND ch.concept = 'matricula' AND ch.status = 'pendiente'
             )
           , NULL) AS "pendingItems"
    FROM secretaria.students s
    LEFT JOIN secretaria.enrollments e ON e.student_id = s.id
    LEFT JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id AND ay.is_active
    LEFT JOIN secretaria.services sv ON sv.id = e.service_id
    WHERE s.is_active = true
      AND ($1::text IS NULL OR
           (COALESCE(s.first_name,'')||' '||COALESCE(s.last_name,'')) ILIKE '%'||$1||'%')
    GROUP BY s.id
    HAVING ($2::boolean IS NOT TRUE OR
            array_length(
              ARRAY_REMOVE(
                ARRAY[
                  CASE WHEN s.last_name IS NULL OR s.last_name = '' THEN 'x' END,
                  CASE WHEN s.birth_date IS NULL THEN 'x' END,
                  CASE WHEN NOT EXISTS (
                    SELECT 1 FROM secretaria.guardians g
                    WHERE g.family_id = s.family_id
                      AND g.is_primary_contact = true
                      AND g.email IS NOT NULL AND g.email <> ''
                  ) THEN 'x' END
                ], NULL), 1) > 0
               OR EXISTS (
                 SELECT 1 FROM secretaria.enrollments e4
                 WHERE e4.student_id = s.id AND e4.status = 'matriculado' AND e4.group_id IS NULL
               )
               OR EXISTS (
                 SELECT 1 FROM secretaria.charges ch2
                 JOIN secretaria.enrollments e5 ON e5.id = ch2.enrollment_id
                 WHERE e5.student_id = s.id AND ch2.concept = 'matricula' AND ch2.status = 'pendiente'
               )
            )
    ORDER BY s.last_name NULLS LAST, s.first_name
    LIMIT 300`,
    [q || null, onlyPending === 'true' ? true : null]);
}
```

> **Nota sobre el HAVING:** Cuando `onlyPending=true` filtra alumnos que tienen al menos un pendiente. Cuando no se pasa, el `$2::boolean IS NOT TRUE` hace que la condición siempre sea verdadera y no filtra.

- [ ] **Verificar compilación**

```bash
cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -5
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/students/students.controller.ts
git commit -m "feat(students): add pendingItems to GET /students list"
```

---

## Task 5: Backend — Deploy

- [ ] **Build Docker + redeploy**

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

- [ ] **Verificar salud + nuevos endpoints**

```bash
sleep 5 && curl -s https://secretaria.mundoworld.school/api/health/status | jq .

TOKEN=$(curl -s -X POST https://secretaria.mundoworld.school/api/secretaria/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@mundoworld.school","password":"Pamplon@2020"}' | jq -r .access_token)

# GET students ahora devuelve pendingItems
curl -s "https://secretaria.mundoworld.school/api/secretaria/students" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0] | {firstName, pendingItems}'

# Probar full-enroll
curl -s -X POST "https://secretaria.mundoworld.school/api/secretaria/students/full-enroll" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student": {"firstName": "Test", "lastName": "Prueba"},
    "guardian1": {"fullName": "Tutor Test", "phone": "600000000"},
    "enrollments": []
  }' | jq '{studentId: .student.id}'
```

Resultado esperado: `pendingItems` array en el primer alumno; `studentId` con un UUID válido del full-enroll de prueba.

---

## Task 6: Frontend — Extraer api.ts y crear InscripcionDrawer.tsx

**Files:**
- Create: `frontend/src/api.ts`
- Create: `frontend/src/components/InscripcionDrawer.tsx`
- Modify: `frontend/src/App.tsx` (solo la línea del import de api)

### Paso 6a — Crear src/api.ts

- [ ] **Localizar en App.tsx** las líneas de definición de `api` (axios.create + interceptors). Será algo así (buscar `axios.create`):

```typescript
const api = axios.create({ baseURL: '/api/secretaria', ... });
api.interceptors.request.use(...);
api.interceptors.response.use(...);
```

- [ ] **Crear `/opt/mw-secretaria/frontend/src/api.ts`** con esas líneas extraídas, añadiendo el export:

```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/secretaria',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('secretaria_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('secretaria_token');
      window.location.reload();
    }
    return Promise.reject(err);
  },
);
```

> **Importante:** Copiar la lógica EXACTA de App.tsx — puede diferir del ejemplo de arriba. Leer App.tsx primero.

- [ ] **En App.tsx**, reemplazar la definición de `api` (las líneas de axios.create + interceptors) por:

```typescript
import { api } from './api';
```

(Mover el import de `axios` a `api.ts` si ya no se usa en App.tsx.)

### Paso 6b — Crear InscripcionDrawer.tsx

- [ ] **Crear `/opt/mw-secretaria/frontend/src/components/InscripcionDrawer.tsx`**:

```tsx
import React, { useState, useEffect } from 'react';
import {
  Drawer, Form, Input, InputNumber, Select, Switch, Button,
  Row, Col, Divider, Alert, Tag, Space, message, Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../api';

const { Text } = Typography;

const RELATIONSHIPS = [
  { value: 'madre', label: 'Madre' },
  { value: 'padre', label: 'Padre' },
  { value: 'tutor', label: 'Tutor/a' },
  { value: 'otro', label: 'Otro' },
];
const STATUSES = [
  { value: 'preinscrito', label: 'Preinscrito' },
  { value: 'matriculado', label: 'Matriculado' },
];
const METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tpv', label: 'TPV' },
];
const DAYS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface Props {
  open: boolean;
  editingStudentId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function InscripcionDrawer({ open, editingStudentId, onClose, onSaved }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [showG2, setShowG2] = useState(false);
  const [matriculaPaid, setMatriculaPaid] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, any[]>>({});
  const [pendingItems, setPendingItems] = useState<string[]>([]);
  const [isMwPanel, setIsMwPanel] = useState(false);

  // Catálogo
  useEffect(() => {
    api.get('/catalog/services').then(r => setServices(r.data));
    api.get('/catalog/programs').then(r => setPrograms(r.data));
    api.get('/catalog/groups').then(r => setGroups(r.data));
  }, []);

  // Cargar alumno en modo edición
  useEffect(() => {
    if (!open) return;
    if (editingStudentId) {
      api.get(`/students/${editingStudentId}/full`).then(r => {
        const d = r.data;
        setIsMwPanel(!!d.mwpanelStudentId);
        setPendingItems(d.pendingItems || []);
        const g1 = d.guardians?.find((g: any) => g.isPrimary);
        const g2 = d.guardians?.find((g: any) => !g.isPrimary);
        if (g2) setShowG2(true);
        form.setFieldsValue({
          firstName: d.firstName,
          lastName: d.lastName,
          birthDate: d.birthDate ? String(d.birthDate).slice(0, 10) : undefined,
          gradeLabel: d.gradeLabel,
          schoolOrigin: d.schoolOrigin,
          notes: d.notes,
          g1FullName: g1?.fullName,
          g1Relationship: g1?.relationship,
          g1Phone: g1?.phone,
          g1PhoneAlt: g1?.phoneAlt,
          g1Email: g1?.email,
          g1Nif: g1?.nif,
          g2FullName: g2?.fullName,
          g2Relationship: g2?.relationship,
          g2Phone: g2?.phone,
          g2PhoneAlt: g2?.phoneAlt,
          g2Email: g2?.email,
          g2Nif: g2?.nif,
        });
      });
    } else {
      form.resetFields();
      setShowG2(false);
      setMatriculaPaid(false);
      setPendingItems([]);
      setIsMwPanel(false);
    }
  }, [open, editingStudentId]);

  // Cargar horario de un grupo cuando se selecciona
  const loadSchedule = async (groupId: string) => {
    if (!groupId || scheduleMap[groupId] !== undefined) return;
    try {
      const r = await api.get('/schedule', { params: { groupId } });
      setScheduleMap(prev => ({ ...prev, [groupId]: r.data }));
    } catch { /* sin horario */ }
  };

  const formatSchedule = (slots: any[]) => {
    if (!slots?.length) return 'Sin horario configurado';
    return slots.map(s => `${DAYS[s.weekday]} ${s.startTime}–${s.endTime}`).join(' · ');
  };

  // Grupos del servicio seleccionado
  const groupsForService = (serviceId: string) => {
    const progIds = programs.filter(p => p.serviceId === serviceId).map(p => p.id);
    return groups.filter(g => progIds.includes(g.programId));
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      if (editingStudentId) {
        // Modo edición: actualizar alumno + tutores
        await api.patch(`/students/${editingStudentId}/full`, {
          student: {
            firstName: values.firstName,
            lastName: values.lastName,
            birthDate: values.birthDate || null,
            gradeLabel: values.gradeLabel || null,
            schoolOrigin: values.schoolOrigin || null,
            notes: values.notes || null,
          },
          guardian1: values.g1FullName ? {
            fullName: values.g1FullName, relationship: values.g1Relationship,
            phone: values.g1Phone, phoneAlt: values.g1PhoneAlt,
            email: values.g1Email, nif: values.g1Nif,
          } : undefined,
          guardian2: showG2 && values.g2FullName ? {
            fullName: values.g2FullName, relationship: values.g2Relationship,
            phone: values.g2Phone, phoneAlt: values.g2PhoneAlt,
            email: values.g2Email, nif: values.g2Nif,
          } : undefined,
        });
        message.success('Alumno actualizado');
      } else {
        // Modo creación: inscripción completa
        const enrollments = (values.enrollments || []).map((e: any) => ({
          serviceId: e.serviceId,
          groupId: e.groupId || null,
          status: e.status || 'preinscrito',
          customFee: e.customFee ?? null,
        }));
        await api.post('/students/full-enroll', {
          student: {
            firstName: values.firstName,
            lastName: values.lastName || null,
            birthDate: values.birthDate || null,
            gradeLabel: values.gradeLabel || null,
            schoolOrigin: values.schoolOrigin || null,
            notes: values.notes || null,
          },
          guardian1: values.g1FullName ? {
            fullName: values.g1FullName, relationship: values.g1Relationship || 'tutor',
            phone: values.g1Phone || null, phoneAlt: values.g1PhoneAlt || null,
            email: values.g1Email || null, nif: values.g1Nif || null,
          } : undefined,
          guardian2: showG2 && values.g2FullName ? {
            fullName: values.g2FullName, relationship: values.g2Relationship || 'tutor',
            phone: values.g2Phone || null, phoneAlt: values.g2PhoneAlt || null,
            email: values.g2Email || null, nif: values.g2Nif || null,
          } : undefined,
          enrollments,
          matriculaPaid: matriculaPaid ? {
            method: values.matriculaMethod,
            amount: values.matriculaAmount,
            date: values.matriculaDate || new Date().toISOString().slice(0, 10),
          } : undefined,
        });
        message.success('Inscripción completada');
      }
      onClose();
      onSaved();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = !!editingStudentId;
  const title = isEditMode ? 'Editar alumno' : 'Nueva inscripción';

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      width={700}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>Cancelar</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Guardar
          </Button>
        </div>
      }
    >
      {/* Alert de pendientes en modo edición */}
      {isEditMode && pendingItems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Pendientes: ${pendingItems.join(', ')}`}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSave}>

        {/* ① ALUMNO */}
        <Divider orientation="left">① Alumno</Divider>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="firstName" label="Nombre" rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
              <Input disabled={isMwPanel} placeholder="Nombre" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lastName" label="Apellidos">
              <Input disabled={isMwPanel} placeholder="Apellidos" />
            </Form.Item>
          </Col>
        </Row>
        {isMwPanel && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message="Nombre y apellidos provienen de MW Panel y no son editables aquí." />
        )}
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="birthDate" label="Fecha de nacimiento">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="gradeLabel" label="Curso / nivel">
              <Input placeholder="Ej.: 3º Primaria" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="schoolOrigin" label="Centro escolar">
              <Input placeholder="Colegio de origen" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notas internas">
          <Input.TextArea rows={2} />
        </Form.Item>

        {/* ② FAMILIA Y TUTORES */}
        <Divider orientation="left">② Familia y tutores</Divider>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Tutor/a principal
        </Text>
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name="g1FullName" label="Nombre completo" rules={[{ required: !isEditMode, message: 'Nombre del tutor obligatorio' }]}>
              <Input placeholder="Nombre y apellidos" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="g1Relationship" label="Relación">
              <Select options={RELATIONSHIPS} placeholder="Relación" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="g1Phone" label="Teléfono" rules={[{ required: !isEditMode, message: 'Teléfono obligatorio' }]}>
              <Input placeholder="6XX XXX XXX" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="g1PhoneAlt" label="Teléfono alternativo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="g1Email" label="Email">
              <Input type="email" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="g1Nif" label="NIF / DNI (opcional)">
          <Input style={{ width: 180 }} />
        </Form.Item>

        {!showG2 ? (
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setShowG2(true)} style={{ marginBottom: 12 }}>
            Añadir segundo tutor/a
          </Button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tutor/a secundario/a</Text>
              <Button size="small" icon={<DeleteOutlined />} onClick={() => setShowG2(false)} danger>Quitar</Button>
            </div>
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item name="g2FullName" label="Nombre completo">
                  <Input placeholder="Nombre y apellidos" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="g2Relationship" label="Relación">
                  <Select options={RELATIONSHIPS} placeholder="Relación" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="g2Phone" label="Teléfono"><Input /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="g2PhoneAlt" label="Teléfono alternativo"><Input /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="g2Email" label="Email"><Input type="email" /></Form.Item>
              </Col>
            </Row>
            <Form.Item name="g2Nif" label="NIF / DNI (opcional)">
              <Input style={{ width: 180 }} />
            </Form.Item>
          </>
        )}

        {/* ③ INSCRIPCIÓN — solo en modo creación */}
        {!isEditMode && (
          <>
            <Divider orientation="left">③ Inscripción</Divider>
            <Form.List name="enrollments">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => {
                    const serviceId = form.getFieldValue(['enrollments', field.name, 'serviceId']);
                    const groupId   = form.getFieldValue(['enrollments', field.name, 'groupId']);
                    const slots     = groupId ? (scheduleMap[groupId] ?? null) : null;
                    const svcGroups = serviceId ? groupsForService(serviceId) : [];
                    return (
                      <div key={field.key} style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                        <Row gutter={12} align="middle">
                          <Col span={20}>
                            <Form.Item
                              {...field}
                              name={[field.name, 'serviceId']}
                              label="Servicio"
                              rules={[{ required: true, message: 'Elige un servicio' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Select
                                placeholder="Servicio"
                                options={services.map(s => ({ value: s.id, label: s.name }))}
                                onChange={() => form.setFieldValue(['enrollments', field.name, 'groupId'], undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={4} style={{ textAlign: 'right', paddingTop: 28 }}>
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                          </Col>
                        </Row>
                        <Row gutter={12}>
                          <Col span={14}>
                            <Form.Item
                              name={[field.name, 'groupId']}
                              label="Grupo"
                              style={{ marginBottom: 4 }}
                            >
                              <Select
                                allowClear
                                placeholder="Sin asignar"
                                options={svcGroups.map(g => ({ value: g.id, label: g.name }))}
                                onChange={(val) => val && loadSchedule(val)}
                                disabled={!serviceId}
                              />
                            </Form.Item>
                            {slots !== null && (
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {formatSchedule(slots)}
                              </Text>
                            )}
                          </Col>
                          <Col span={5}>
                            <Form.Item name={[field.name, 'status']} label="Estado" style={{ marginBottom: 4 }}>
                              <Select options={STATUSES} defaultValue="preinscrito" />
                            </Form.Item>
                          </Col>
                          <Col span={5}>
                            <Form.Item name={[field.name, 'customFee']} label="Tarifa override" style={{ marginBottom: 4 }}>
                              <InputNumber min={0} style={{ width: '100%' }} placeholder="Auto" addonAfter="€" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    );
                  })}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ status: 'preinscrito' })} block>
                    Añadir servicio
                  </Button>
                </>
              )}
            </Form.List>
          </>
        )}

        {/* Servicios en modo edición — solo informativo */}
        {isEditMode && (
          <>
            <Divider orientation="left">③ Servicios inscritos</Divider>
            <Alert type="info" showIcon style={{ marginBottom: 8 }}
              message="Para cambiar estado/grupo o añadir servicios, usa la sección Matrículas." />
          </>
        )}

        {/* ④ PAGO MATRÍCULA — solo en modo creación */}
        {!isEditMode && (
          <>
            <Divider orientation="left">④ Pago de matrícula</Divider>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Switch checked={matriculaPaid} onChange={setMatriculaPaid} />
              <Text>Cobrar matrícula ahora</Text>
            </div>
            {matriculaPaid && (
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="matriculaMethod" label="Método" rules={[{ required: true }]}>
                    <Select options={METHODS} placeholder="Método" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="matriculaAmount" label="Importe" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} addonAfter="€" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="matriculaDate" label="Fecha">
                    <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </>
        )}

      </Form>
    </Drawer>
  );
}
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add frontend/src/api.ts frontend/src/components/InscripcionDrawer.tsx frontend/src/App.tsx
git commit -m "feat(frontend): extract api.ts and create InscripcionDrawer component"
```

---

## Task 7: Frontend — Actualizar sección Alumnos en App.tsx

**Files:**
- Modify: `frontend/src/App.tsx` — función `Alumnos`

- [ ] **Añadir el import** de `InscripcionDrawer` al inicio de App.tsx (junto a otros imports):

```typescript
import { InscripcionDrawer } from './components/InscripcionDrawer';
```

- [ ] **Actualizar el estado y la lógica de la función `Alumnos`**

En `function Alumnos()`, añadir nuevos estados después de los existentes:

```typescript
const [drawerOpen, setDrawerOpen] = useState(false);
const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
const [onlyPending, setOnlyPending] = useState(false);
```

Modificar `load` para pasar el filtro de pendientes:

```typescript
const load = async () => {
  const params: any = {};
  if (onlyPending) params.pending = 'true';
  const { data } = await api.get('/students', { params });
  setRows(data);
};
```

Añadir `onlyPending` como dependencia del `useEffect`:

```typescript
useEffect(() => { load(); api.get('/catalog/services').then(r => setServices(r.data)); }, [onlyPending]);
```

- [ ] **Actualizar el header de Alumnos** (los botones de arriba):

Reemplazar:
```typescript
<Button type="primary" icon={<UserAddOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>Alta rápida</Button>
```

Por:
```typescript
<Space>
  <Button
    icon={<FilterOutlined />}
    type={onlyPending ? 'primary' : 'default'}
    onClick={() => setOnlyPending(p => !p)}
  >
    {onlyPending ? 'Todos' : 'Solo pendientes'}
  </Button>
  <Button icon={<UserAddOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>
    Alta rápida
  </Button>
  <Button
    type="primary"
    icon={<FormOutlined />}
    onClick={() => { setEditingStudentId(null); setDrawerOpen(true); }}
  >
    Inscripción completa
  </Button>
</Space>
```

> Asegurarse de que `FilterOutlined` y `FormOutlined` están importados desde `@ant-design/icons`.

- [ ] **Añadir columna "Pendientes" a la tabla**

En el array `columns` de la tabla de Alumnos, añadir antes de la columna vacía (botón "Otro servicio"):

```typescript
{
  title: 'Pendientes',
  render: (_: any, r: any) => {
    const items: string[] = r.pendingItems || [];
    if (items.length === 0) return <Tag color="green">✓ Completo</Tag>;
    return (
      <Tag
        color="orange"
        style={{ cursor: 'pointer' }}
        title={items.join(', ')}
        onClick={() => { setEditingStudentId(r.id); setDrawerOpen(true); }}
      >
        ⚠ {items.length} pendiente{items.length > 1 ? 's' : ''}
      </Tag>
    );
  },
},
```

- [ ] **Añadir columna "Editar"** (última columna, sustituyendo o junto al botón "Otro servicio"):

Añadir al final del array de columnas:

```typescript
{
  title: '',
  render: (_: any, r: any) => (
    <Space size={4}>
      <Button size="small" onClick={() => { setEditingStudentId(r.id); setDrawerOpen(true); }}>
        Editar
      </Button>
      <Button size="small" icon={<PlusOutlined />} onClick={() => { setAddTo(r); setAddService(undefined); }}>
        Servicio
      </Button>
    </Space>
  ),
},
```

(Eliminar la columna anterior que tenía solo el botón "Otro servicio".)

- [ ] **Añadir el componente `InscripcionDrawer`** al final del return de `Alumnos`, justo antes del cierre del `</div>` principal:

```tsx
<InscripcionDrawer
  open={drawerOpen}
  editingStudentId={editingStudentId}
  onClose={() => { setDrawerOpen(false); setEditingStudentId(null); }}
  onSaved={() => load()}
/>
```

- [ ] **Commit**

```bash
cd /opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(alumnos-ui): add inscripcion-completa drawer, pending column, filter"
```

---

## Task 8: Frontend — Build y despliegue

- [ ] **Build**

```bash
cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -15
```

Resultado esperado: `built in X.XXs` sin errores TypeScript. Si hay errores, leerlos y corregir en los ficheros correspondientes antes de continuar.

- [ ] **Desplegar**

```bash
cp -r /opt/mw-secretaria/frontend/dist/* /opt/mw-secretaria/frontend-dist/
```

- [ ] **Verificar sitio**

```bash
curl -s -o /dev/null -w "%{http_code}" https://secretaria.mundoworld.school/
```

Resultado esperado: `200`

- [ ] **Verificación manual**

1. https://secretaria.mundoworld.school → sección Alumnos
2. Botón "Inscripción completa" visible junto a "Alta rápida"
3. Columna "Pendientes" con tags naranjas/verdes
4. Botón "Solo pendientes" filtra la tabla
5. Click "Inscripción completa" → Drawer abre con 4 secciones y botón "Añadir servicio"
6. Click "Editar" en un alumno → Drawer abre en modo edición con sus datos y alert de pendientes si los hay
7. Click en tag naranja de pendientes → abre Drawer en modo edición para ese alumno

- [ ] **Commit de verificación si se aplicaron fixes durante el build**

```bash
cd /opt/mw-secretaria
git status
# Si hay cambios sin commitear tras corregir errores de build:
git add frontend/src/App.tsx frontend/src/components/InscripcionDrawer.tsx
git commit -m "fix(frontend): resolve build errors in inscripcion drawer"
```
