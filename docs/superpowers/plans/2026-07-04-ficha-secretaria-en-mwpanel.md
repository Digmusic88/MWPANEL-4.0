# Feature 2 — Ficha de Secretaría en MW Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un admin de MW Panel vea la ficha completa (con médico descifrado) que gestiona Secretaría, desde el Drawer de detalle del alumno, sin duplicar ni descifrar datos en MW Panel.

**Architecture:** MW Panel expone un endpoint proxy admin-only que firma un JWT de servicio (secreto compartido) y llama por red interna a un endpoint de lectura nuevo en Secretaría, que monta la ficha y descifra el médico. El frontend pinta un panel solo-lectura. Simétrico a 1c en sentido inverso.

**Tech Stack:** NestJS + TypeORM (raw SQL cross-schema en Secretaría), `@nestjs/jwt`, `fetch` nativo (Node 20), React + antd. Jest (specs puros). Dos repos: Secretaría (`git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria`, remoto `origin`) y MW Panel (working tree = producción, `/opt/mw-panel`).

## Global Constraints

- **Producción:** solo lo pedido; no romper nada existente. **Solo lectura**: cero escrituras en `secretaria.*` y `public.*` en toda la feature.
- **RGPD/PII:** en verificación/E2E nunca volcar datos reales de menores; calcular booleanos/recuentos y redactar.
- **Secreto:** `JWT_SECRET` ya es común a ambos backends (sha `67fd02f9`, 71 chars en ambos `.env`). NO introducir secreto nuevo. En MW Panel, **firmar SIEMPRE con `ConfigService.get('app.jwt.secret')`** (el valor cargado del `.env` por ConfigModule), NUNCA con `process.env.JWT_SECRET` directo (en el contenedor esa var vale otra cosa; verificado: el token firmado con `app.jwt.secret` es aceptado, HTTP 200). `SECRETARIA_CRYPTO_KEY` nunca sale del entorno de Secretaría.
- **Aislamiento:** MW Panel depende de un contrato REST de Secretaría, NO de su schema. Cero SQL nuevo de MW Panel hacia `secretaria.*`.
- **Auth Secretaría:** el endpoint de ficha usa `SecretariaAuthGuard` + `@Roles('secretaria_admin','direccion')`. Auth MW Panel: `@Roles(UserRole.ADMIN)` (la clase `StudentsController` ya tiene `@UseGuards(JwtAuthGuard, RolesGuard)`).
- **Reachability interna:** Secretaría desde MW Panel = `http://mw-secretaria-api:3010/api` (misma red `mw-panel_mw-network`, sin nginx).
- **Contrato SP-7:** documentar la nueva llamada saliente MW Panel→Secretaría en `/opt/mw-secretaria/docs/CONTRATO_MWPANEL.md`.
- **Commits:** cada cambio de Secretaría se commitea+pushea a su repo (`origin`). Cambios de MW Panel se commitean en el repo de MW Panel con `git add` por fichero (NUNCA `git add -A`, NUNCA `git checkout -- .`).

**Contrato JSON de la ficha (compartido por todas las tareas):**
```jsonc
{
  "student": { "firstName","lastName","birthDate", "schoolOrigin","gradeLabel",
               "address","postalCode","city", "photoConsent":bool,"exitConsent":bool,
               "notes","isActive":bool,"importPending":bool,"importPendingFields" },
  "medical": string|null,
  "family": { "displayName", "notes" },
  "guardians": [ { "fullName","relationship","nif","phone","phoneAlt","email","isPrimaryContact":bool } ],
  "enrollments": { "active":[EnrollmentRow], "history":[EnrollmentRow] }
}
// EnrollmentRow = { academicYear, service, group, status, apoyoLevel, customFee:number|null, enrolledAt }
```

---

### Task 1: Endpoint de ficha en Secretaría (módulo `ficha/`)

**Repo:** Secretaría. **Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/ficha/ficha-enrollments.ts` (split puro)
- Create: `/opt/mw-secretaria/backend/src/modules/ficha/ficha-enrollments.spec.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/ficha/ficha.service.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/ficha/ficha.controller.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/ficha/ficha.module.ts`
- Modify: `/opt/mw-secretaria/backend/src/app.module.ts` (registrar `FichaModule`)

**Interfaces:**
- Produces: `GET /api/secretaria/ficha/by-mwpanel/:mwStudentId` → 200 con el contrato JSON, o 404 `{message:'Sin ficha en Secretaría'}`. `splitEnrollments(rows) → {active, history}`.

- [ ] **Step 1: Split puro — test que falla**

Crea `ficha-enrollments.spec.ts`:
```ts
import { splitEnrollments, EnrollmentRow } from './ficha-enrollments';

const mk = (status: string): EnrollmentRow => ({
  academicYear: null, service: null, group: null, status,
  apoyoLevel: null, customFee: null, enrolledAt: null,
});

describe('splitEnrollments', () => {
  it('activa = matriculado/preinscrito; historial = pendiente/lista_espera/baja', () => {
    const rows = [mk('matriculado'), mk('preinscrito'), mk('baja'), mk('lista_espera'), mk('pendiente')];
    const { active, history } = splitEnrollments(rows);
    expect(active.map(r => r.status)).toEqual(['matriculado', 'preinscrito']);
    expect(history.map(r => r.status)).toEqual(['baja', 'lista_espera', 'pendiente']);
  });

  it('mantiene el orden de entrada dentro de cada grupo', () => {
    const rows = [mk('baja'), mk('matriculado'), mk('preinscrito')];
    const { active, history } = splitEnrollments(rows);
    expect(active.map(r => r.status)).toEqual(['matriculado', 'preinscrito']);
    expect(history.map(r => r.status)).toEqual(['baja']);
  });

  it('listas vacías si no hay matrículas', () => {
    expect(splitEnrollments([])).toEqual({ active: [], history: [] });
  });
});
```

- [ ] **Step 2: Ejecutar test → debe fallar**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/ficha/ficha-enrollments.spec.ts`
Expected: FAIL (`Cannot find module './ficha-enrollments'`).

- [ ] **Step 3: Implementar el split puro**

Crea `ficha-enrollments.ts`:
```ts
export interface EnrollmentRow {
  academicYear: string | null;
  service: string | null;
  group: string | null;
  status: string;
  apoyoLevel: string | null;
  customFee: number | null;
  enrolledAt: string | null;
}

const ACTIVE_STATUSES = new Set(['matriculado', 'preinscrito']);

export function splitEnrollments(rows: EnrollmentRow[]): { active: EnrollmentRow[]; history: EnrollmentRow[] } {
  const active: EnrollmentRow[] = [];
  const history: EnrollmentRow[] = [];
  for (const r of rows) (ACTIVE_STATUSES.has(r.status) ? active : history).push(r);
  return { active, history };
}
```

- [ ] **Step 4: Ejecutar test → debe pasar**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/ficha/ficha-enrollments.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implementar `ficha.service.ts`**

Crea `ficha.service.ts` (raw SQL cross-schema; descifra médico; solo lectura):
```ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { splitEnrollments, EnrollmentRow } from './ficha-enrollments';

@Injectable()
export class FichaService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async buildFicha(mwStudentId: string): Promise<any | null> {
    const CRYPTO_KEY = process.env.SECRETARIA_CRYPTO_KEY || '';

    const s = (await this.ds.query(
      `SELECT id, family_id AS "familyId", first_name AS "firstName", last_name AS "lastName",
              to_char(birth_date,'YYYY-MM-DD') AS "birthDate", school_origin AS "schoolOrigin",
              grade_label AS "gradeLabel", address, postal_code AS "postalCode", city,
              photo_consent AS "photoConsent", exit_consent AS "exitConsent", notes,
              is_active AS "isActive", import_pending AS "importPending",
              import_pending_fields AS "importPendingFields",
              CASE WHEN medical_notes_encrypted IS NOT NULL AND $2 <> ''
                   THEN pgp_sym_decrypt(medical_notes_encrypted, $2) ELSE NULL END AS medical
       FROM secretaria.students WHERE mwpanel_student_id = $1`,
      [mwStudentId, CRYPTO_KEY]))[0];
    if (!s) return null;

    const family = s.familyId
      ? (await this.ds.query(
          `SELECT display_name AS "displayName", notes FROM secretaria.families WHERE id = $1`,
          [s.familyId]))[0]
      : null;

    const guardians = s.familyId
      ? await this.ds.query(
          `SELECT full_name AS "fullName", relationship::text AS relationship, nif,
                  phone, phone_alt AS "phoneAlt", email, is_primary_contact AS "isPrimaryContact"
           FROM secretaria.guardians WHERE family_id = $1
           ORDER BY is_primary_contact DESC, created_at ASC`,
          [s.familyId])
      : [];

    const rawEnrollments = await this.ds.query(
      `SELECT ay.label AS "academicYear", srv.name AS service, g.name AS "group",
              e.status::text AS status, e.apoyo_level::text AS "apoyoLevel",
              e.custom_fee AS "customFee", to_char(e.enrolled_at,'YYYY-MM-DD') AS "enrolledAt"
       FROM secretaria.enrollments e
       LEFT JOIN secretaria.academic_years ay ON ay.id = e.academic_year_id
       LEFT JOIN secretaria.services       srv ON srv.id = e.service_id
       LEFT JOIN secretaria.groups         g  ON g.id  = e.group_id
       WHERE e.student_id = $1
       ORDER BY e.enrolled_at DESC NULLS LAST, e.created_at DESC`,
      [s.id]);

    const enrollmentRows: EnrollmentRow[] = rawEnrollments.map((r: any) => ({
      academicYear: r.academicYear, service: r.service, group: r.group,
      status: r.status, apoyoLevel: r.apoyoLevel,
      customFee: r.customFee == null ? null : Number(r.customFee),
      enrolledAt: r.enrolledAt,
    }));

    return {
      student: {
        firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate,
        schoolOrigin: s.schoolOrigin, gradeLabel: s.gradeLabel,
        address: s.address, postalCode: s.postalCode, city: s.city,
        photoConsent: s.photoConsent, exitConsent: s.exitConsent, notes: s.notes,
        isActive: s.isActive, importPending: s.importPending, importPendingFields: s.importPendingFields,
      },
      medical: s.medical ?? null,
      family: family ? { displayName: family.displayName, notes: family.notes } : { displayName: null, notes: null },
      guardians,
      enrollments: splitEnrollments(enrollmentRows),
    };
  }
}
```

- [ ] **Step 6: Implementar `ficha.controller.ts`**

Crea `ficha.controller.ts`:
```ts
import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { FichaService } from './ficha.service';

@Controller('secretaria/ficha')
@UseGuards(SecretariaAuthGuard)
export class FichaController {
  constructor(private readonly svc: FichaService) {}

  @Get('by-mwpanel/:mwStudentId')
  @Roles('secretaria_admin', 'direccion')
  async byMwpanel(@Param('mwStudentId') mwStudentId: string) {
    const ficha = await this.svc.buildFicha(mwStudentId);
    if (!ficha) throw new NotFoundException('Sin ficha en Secretaría');
    return ficha;
  }
}
```

- [ ] **Step 7: Implementar `ficha.module.ts`** (mismo patrón que `provisioning.module.ts`)
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StaffRole } from '../../common/staff-role.entity';
import { FichaController } from './ficha.controller';
import { FichaService } from './ficha.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffRole]), JwtModule.register({})],
  controllers: [FichaController],
  providers: [FichaService],
})
export class FichaModule {}
```

- [ ] **Step 8: Registrar `FichaModule` en `app.module.ts`**

Añade el import junto a los demás (cerca de `ProvisioningModule`, línea ~19):
```ts
import { FichaModule } from './modules/ficha/ficha.module';
```
Y añade `FichaModule` al array `imports` del `@Module` (junto a `ProvisioningModule`, línea ~55).

- [ ] **Step 9: Compilar**

Run: `cd /opt/mw-secretaria/backend && npm run build`
Expected: exit 0 (`nest build` limpio).

- [ ] **Step 10: Commit + push (repo Secretaría)**
```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/ficha/ficha-enrollments.ts backend/src/modules/ficha/ficha-enrollments.spec.ts \
       backend/src/modules/ficha/ficha.service.ts backend/src/modules/ficha/ficha.controller.ts \
       backend/src/modules/ficha/ficha.module.ts backend/src/app.module.ts
$G commit -m "feat(ficha): endpoint de lectura GET /secretaria/ficha/by-mwpanel/:mwStudentId

Monta la ficha completa del alumno (datos, dirección, tutores, consentimientos,
matrícula activa/historial) y descifra el médico con SECRETARIA_CRYPTO_KEY.
Solo lectura, guard secretaria_admin/direccion. Para consumo de MW Panel (Feature 2).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
$G push origin main
```

---

### Task 2: Proxy admin-only en el backend de MW Panel

**Repo:** MW Panel. **Files:**
- Create: `/opt/mw-panel/backend/src/modules/students/secretaria-ficha/secretaria-ficha.client.ts`
- Create: `/opt/mw-panel/backend/src/modules/students/secretaria-ficha/secretaria-ficha.service.ts`
- Create: `/opt/mw-panel/backend/src/modules/students/secretaria-ficha/secretaria-ficha.service.spec.ts`
- Modify: `/opt/mw-panel/backend/src/modules/students/students.controller.ts` (constructor + endpoint)
- Modify: `/opt/mw-panel/backend/src/modules/students/students.module.ts` (JwtModule + provider)
- Modify: `/opt/mw-panel/backend/.env` y `/opt/mw-panel/backend/.env.example`

**Interfaces:**
- Consumes: endpoint de Secretaría de Task 1.
- Produces: `GET /api/students/:id/secretaria-ficha` (admin) → 200 ficha | 204 sin ficha | 502 error. `mapFichaResponse(status, body): FichaResult`.

- [ ] **Step 1: Mapeo puro — test que falla**

Crea `secretaria-ficha.service.spec.ts`:
```ts
import { mapFichaResponse } from './secretaria-ficha.service';

describe('mapFichaResponse', () => {
  it('200 → ok con la ficha', () => {
    const ficha = { student: { firstName: 'X' } };
    expect(mapFichaResponse(200, ficha)).toEqual({ kind: 'ok', ficha });
  });
  it('404 → none (se traducirá a 204)', () => {
    expect(mapFichaResponse(404, { message: 'Sin ficha en Secretaría' })).toEqual({ kind: 'none' });
  });
  it('500/otros → error', () => {
    expect(mapFichaResponse(500, null)).toEqual({ kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' });
    expect(mapFichaResponse(403, null)).toEqual({ kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' });
  });
});
```

- [ ] **Step 2: Ejecutar test → debe fallar**

Run: `cd /opt/mw-panel/backend && npx jest src/modules/students/secretaria-ficha/secretaria-ficha.service.spec.ts`
Expected: FAIL (`Cannot find module './secretaria-ficha.service'`).

- [ ] **Step 3: Implementar el cliente `secretaria-ficha.client.ts`**
```ts
const SECRETARIA_API = process.env.SECRETARIA_API_URL || 'http://mw-secretaria-api:3010/api';

export async function getFicha(mwStudentId: string, token: string): Promise<{ status: number; body: any }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${SECRETARIA_API}/secretaria/ficha/by-mwpanel/${mwStudentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    let body: any = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Implementar `secretaria-ficha.service.ts`** (mapeo puro + firma con `app.jwt.secret`)
```ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getFicha } from './secretaria-ficha.client';

export type FichaResult =
  | { kind: 'ok'; ficha: any }
  | { kind: 'none' }
  | { kind: 'error'; message: string };

export function mapFichaResponse(status: number, body: any): FichaResult {
  if (status === 200) return { kind: 'ok', ficha: body };
  if (status === 404) return { kind: 'none' };
  return { kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' };
}

@Injectable()
export class SecretariaFichaService {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  private signServiceToken(): string {
    const sub = this.config.get<string>('SECRETARIA_SERVICE_USER_ID') || process.env.SECRETARIA_SERVICE_USER_ID;
    if (!sub) throw new InternalServerErrorException('Falta SECRETARIA_SERVICE_USER_ID en el servidor');
    const secret = this.config.get<string>('app.jwt.secret');
    return this.jwt.sign({ sub }, { secret, expiresIn: '5m' });
  }

  async fetchFicha(mwStudentId: string): Promise<FichaResult> {
    const token = this.signServiceToken(); // 500 si falta el sub configurado
    let res: { status: number; body: any };
    try {
      res = await getFicha(mwStudentId, token);
    } catch {
      return { kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' };
    }
    return mapFichaResponse(res.status, res.body);
  }
}
```

- [ ] **Step 5: Ejecutar test → debe pasar**

Run: `cd /opt/mw-panel/backend && npx jest src/modules/students/secretaria-ficha/secretaria-ficha.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Registrar en `students.module.ts`**

Añade imports arriba:
```ts
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SecretariaFichaService } from './secretaria-ficha/secretaria-ficha.service';
```
Añade al array `imports` del `@Module` (tras `UsersModule`):
```ts
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({ secret: cs.get<string>('app.jwt.secret') }),
    }),
```
Añade `SecretariaFichaService` al array `providers` (tras `RecentActivityService`).
(No hace falta importar `ConfigModule`: es `isGlobal: true`.)

- [ ] **Step 7: Añadir el endpoint en `students.controller.ts`**

En el `constructor` (línea ~50), añade el parámetro:
```ts
    private readonly secretariaFichaService: SecretariaFichaService,
```
Añade el import arriba (junto a los otros de servicios):
```ts
import { SecretariaFichaService } from './secretaria-ficha/secretaria-ficha.service';
```
Añade el método al controlador (p. ej. tras el constructor):
```ts
  @Get(':id/secretaria-ficha')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ficha del alumno gestionada en Secretaría (solo lectura)' })
  async getSecretariaFicha(@Param('id') id: string, @Res() res: Response) {
    const result = await this.secretariaFichaService.fetchFicha(id);
    if (result.kind === 'none') return res.status(HttpStatus.NO_CONTENT).send();
    if (result.kind === 'error') return res.status(HttpStatus.BAD_GATEWAY).json({ message: result.message });
    return res.status(HttpStatus.OK).json(result.ficha);
  }
```
(`Get`, `Param`, `Res`, `HttpStatus`, `Response`, `Roles`, `UserRole`, `ApiOperation` ya están importados en el fichero.)

- [ ] **Step 8: Añadir variables de entorno**

En `/opt/mw-panel/backend/.env` (bind-mount) añade al final:
```
SECRETARIA_API_URL=http://mw-secretaria-api:3010/api
SECRETARIA_SERVICE_USER_ID=3fc62bf3-7c75-43de-8cf4-2a035fe04422
```
En `/opt/mw-panel/backend/.env.example` añade las mismas claves con valores de ejemplo:
```
SECRETARIA_API_URL=http://mw-secretaria-api:3010/api
SECRETARIA_SERVICE_USER_ID=<uuid de un usuario con staff_role secretaria_admin>
```
(`3fc62bf3-7c75-43de-8cf4-2a035fe04422` es el admin con `secretaria_admin` en prod.)

- [ ] **Step 9: Compilar**

Run: `cd /opt/mw-panel/backend && npm run build`
Expected: exit 0.

- [ ] **Step 10: Commit (repo MW Panel, `git add` por fichero)**
```bash
cd /opt/mw-panel
git add backend/src/modules/students/secretaria-ficha/secretaria-ficha.client.ts \
        backend/src/modules/students/secretaria-ficha/secretaria-ficha.service.ts \
        backend/src/modules/students/secretaria-ficha/secretaria-ficha.service.spec.ts \
        backend/src/modules/students/students.controller.ts \
        backend/src/modules/students/students.module.ts \
        backend/.env.example
git commit -m "feat(students): proxy admin GET /students/:id/secretaria-ficha

Firma un JWT de servicio (app.jwt.secret compartido) y lee la ficha del alumno
desde Secretaría por red interna. 200 ficha | 204 sin ficha | 502 error. Feature 2.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
(NO se commitea `.env` — es entorno de producción, no versionado.)

---

### Task 3: Panel de ficha en el frontend de MW Panel

**Repo:** MW Panel. **Files:**
- Create: `/opt/mw-panel/frontend/src/components/admin/SecretariaFichaPanel.tsx`
- Modify: `/opt/mw-panel/frontend/src/pages/admin/StudentManagementPage.tsx` (import + bloque en el Drawer)

**Interfaces:**
- Consumes: `GET /api/students/:id/secretaria-ficha` (Task 2) vía `apiClient`.

- [ ] **Step 1: Crear `SecretariaFichaPanel.tsx`**
```tsx
import React, { useEffect, useState } from 'react'
import { Row, Col, Tag, Spin, Alert, Button, Typography, Card } from 'antd'
import apiClient from '@services/apiClient'

const { Text } = Typography

interface EnrollmentRow {
  academicYear: string | null; service: string | null; group: string | null;
  status: string; apoyoLevel: string | null; customFee: number | null; enrolledAt: string | null;
}
interface Ficha {
  student: {
    firstName: string; lastName: string; birthDate: string | null;
    schoolOrigin: string | null; gradeLabel: string | null;
    address: string | null; postalCode: string | null; city: string | null;
    photoConsent: boolean; exitConsent: boolean; notes: string | null;
    isActive: boolean; importPending: boolean; importPendingFields: string | null;
  };
  medical: string | null;
  family: { displayName: string | null; notes: string | null };
  guardians: Array<{ fullName: string; relationship: string | null; nif: string | null; phone: string | null; phoneAlt: string | null; email: string | null; isPrimaryContact: boolean }>;
  enrollments: { active: EnrollmentRow[]; history: EnrollmentRow[] };
}

const dash = (v: string | null | undefined) => (v && String(v).trim() ? v : '—')
const yesNo = (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Sí' : 'No'}</Tag>

const EnrollmentBlock: React.FC<{ e: EnrollmentRow }> = ({ e }) => (
  <div className="mb-2 p-2 border rounded">
    <Text strong>{dash(e.academicYear)}</Text> · {dash(e.service)} · {dash(e.group)}{' '}
    <Tag color="blue">{e.status}</Tag>
    {e.apoyoLevel ? <Tag>{e.apoyoLevel}</Tag> : null}
    {e.customFee != null ? <Text type="secondary"> · cuota {e.customFee}€</Text> : null}
  </div>
)

const SecretariaFichaPanel: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const load = async () => {
    setLoading(true); setError(false); setFicha(null)
    try {
      const res = await apiClient.get(`/students/${studentId}/secretaria-ficha`)
      // 204 → sin ficha (axios: status 204, data vacío)
      setFicha(res.status === 204 || !res.data ? null : res.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [studentId])

  if (loading) return <Spin />
  if (error) return <Alert type="error" showIcon message="No se pudo cargar la ficha" action={<Button size="small" onClick={load}>Reintentar</Button>} />
  if (!ficha) return <Text type="secondary">Sin ficha en Secretaría</Text>

  const st = ficha.student
  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col span={12}><Text type="secondary">Dirección</Text><div className="font-medium">{dash(st.address)}</div></Col>
        <Col span={6}><Text type="secondary">CP</Text><div className="font-medium">{dash(st.postalCode)}</div></Col>
        <Col span={6}><Text type="secondary">Ciudad</Text><div className="font-medium">{dash(st.city)}</div></Col>
        <Col span={12}><Text type="secondary">Origen escolar</Text><div className="font-medium">{dash(st.schoolOrigin)}</div></Col>
        <Col span={12}><Text type="secondary">Curso</Text><div className="font-medium">{dash(st.gradeLabel)}</div></Col>
        <Col span={24}><Text type="secondary">Notas</Text><div className="font-medium">{dash(st.notes)}</div></Col>
        <Col span={12}><Text type="secondary">Consentimiento foto</Text><div>{yesNo(st.photoConsent)}</div></Col>
        <Col span={12}><Text type="secondary">Consentimiento salida</Text><div>{yesNo(st.exitConsent)}</div></Col>
      </Row>

      {st.importPending && (
        <Alert type="warning" showIcon message={`Ficha incompleta: ${dash(st.importPendingFields)}`} />
      )}

      <Card size="small" title="Información médica" styles={{ header: { background: '#fff7e6' } }}>
        {ficha.medical ? <Text>{ficha.medical}</Text> : <Text type="secondary">Sin notas médicas</Text>}
      </Card>

      <div>
        <Text strong>Tutores</Text>
        {ficha.guardians.length === 0 ? <div><Text type="secondary">Sin tutores</Text></div> : ficha.guardians.map((g, i) => (
          <div key={i} className="mt-2 p-2 border rounded">
            <Text strong>{dash(g.fullName)}</Text> {g.isPrimaryContact && <Tag color="gold">Contacto principal</Tag>}
            <div><Text type="secondary">{dash(g.relationship)} · NIF {dash(g.nif)}</Text></div>
            <div><Text type="secondary">Tel {dash(g.phone)}{g.phoneAlt ? ` / ${g.phoneAlt}` : ''} · {dash(g.email)}</Text></div>
          </div>
        ))}
      </div>

      <div>
        <Text strong>Matrícula</Text>
        {ficha.enrollments.active.length === 0 ? <div><Text type="secondary">Sin matrícula activa</Text></div>
          : ficha.enrollments.active.map((e, i) => <EnrollmentBlock key={i} e={e} />)}
        {ficha.enrollments.history.length > 0 && (
          <>
            <Button type="link" size="small" onClick={() => setShowHistory(v => !v)}>
              {showHistory ? 'Ocultar' : `Ver matrículas anteriores (${ficha.enrollments.history.length})`}
            </Button>
            {showHistory && ficha.enrollments.history.map((e, i) => <EnrollmentBlock key={`h${i}`} e={e} />)}
          </>
        )}
      </div>

      <div className="pt-2 border-t">
        <Text type="secondary">Estos datos se gestionan en Secretaría. </Text>
        <a href="https://secretaria.mundoworld.school" target="_blank" rel="noopener noreferrer">Abrir en Secretaría</a>
      </div>
    </div>
  )
}

export default SecretariaFichaPanel
```

- [ ] **Step 2: Integrar en el Drawer de detalle**

En `/opt/mw-panel/frontend/src/pages/admin/StudentManagementPage.tsx`, añade el import (junto a los demás componentes, ~línea 56):
```tsx
import SecretariaFichaPanel from '../../components/admin/SecretariaFichaPanel'
```
Dentro del Drawer de detalle (bloque `{viewingStudent && ( <div className="space-y-6"> … )}`, que empieza ~línea 1116), añade AL FINAL del `div.space-y-6`, después de la última sección existente:
```tsx
            {/* Ficha de Secretaría */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Ficha de Secretaría</h3>
              <SecretariaFichaPanel studentId={viewingStudent.id} />
            </div>
```

- [ ] **Step 3: Compilar el frontend**

Run: `cd /opt/mw-panel/frontend && npm run build`
Expected: exit 0 (build de Vite OK; el warning de chunk >500kB es normal).

- [ ] **Step 4: Commit (repo MW Panel, `git add` por fichero)**
```bash
cd /opt/mw-panel
git add frontend/src/components/admin/SecretariaFichaPanel.tsx \
        frontend/src/pages/admin/StudentManagementPage.tsx
git commit -m "feat(admin): panel de ficha de Secretaría en el detalle del alumno

Panel solo-lectura en el Drawer de detalle: datos, consentimientos, médico,
tutores y matrícula (activa + botón historial) + enlace a Secretaría. Feature 2.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Actualizar el contrato SP-7

**Repo:** Secretaría. **Files:**
- Modify: `/opt/mw-secretaria/docs/CONTRATO_MWPANEL.md`

- [ ] **Step 1: Actualizar "Dirección del acoplamiento"**

En la sección "## Dirección del acoplamiento", tras la frase sobre Feature 1c, añade:
```markdown
  Desde Feature 2 (2026-07-04), MW Panel hace una llamada REST **saliente hacia
  Secretaría** (`GET /api/secretaria/ficha/by-mwpanel/:mwStudentId`), de solo
  lectura, para mostrar la ficha del alumno en su gestión (admin). El
  acoplamiento **REST** pasa a ser bidireccional (1c: Secretaría→MW Panel
  escritura; 2: MW Panel→Secretaría lectura), pero el acoplamiento **por schema**
  sigue siendo unidireccional: Secretaría lee `public.*`; MW Panel **NO** lee
  `secretaria.*` (recibe la ficha ya montada por JSON).
```

- [ ] **Step 2: Documentar la llamada entrante (sección al final)**

Al final del documento añade:
```markdown
## Llamada entrante MW Panel → Secretaría (Feature 2, ficha del alumno)

- **Endpoint:** `GET /api/secretaria/ficha/by-mwpanel/:mwStudentId` (módulo `ficha/`).
- **Auth:** `SecretariaAuthGuard` + `@Roles('secretaria_admin','direccion')`. MW
  Panel firma un JWT de servicio con el `JWT_SECRET` compartido y `sub =
  SECRETARIA_SERVICE_USER_ID` (un usuario con staff_role `secretaria_admin`).
- **Qué expone:** ficha completa del alumno localizado por `mwpanel_student_id`
  (datos, dirección, tutores, consentimientos, matrícula activa/historial) y las
  **notas médicas descifradas** con `SECRETARIA_CRYPTO_KEY` (la clave nunca sale
  de Secretaría). Solo lectura; 404 si no hay ficha.
- **Consumidor:** backend de MW Panel `GET /api/students/:id/secretaria-ficha`
  (admin) → panel solo-lectura en el detalle del alumno.
```

- [ ] **Step 3: Commit + push (repo Secretaría)**
```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add docs/CONTRATO_MWPANEL.md
$G commit -m "docs(contrato): documentar llamada entrante MW Panel→Secretaría (ficha, Feature 2)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
$G push origin main
```

---

## Deploy y E2E (GATED — lo ejecuta el controlador, no un subagente)

Tras las 4 tareas revisadas:

1. **Secretaría** (solo backend cambia): backup schema `secretaria`; rebuild imagen `mw-secretaria-api` + recrear contenedor (config viva: red `mw-panel_mw-network`, `127.0.0.1:3010`, mount mocks RW, restart unless-stopped). Verificar ruta `ficha/by-mwpanel/:mwStudentId` mapeada; `secretaria=200`, `mocks=200` (INTACTO); endpoint sin auth = 401.
2. **MW Panel:** confirmar las 2 variables en `/opt/mw-panel/backend/.env`; deploy backend con `/opt/mw-panel/ultra-fast-rebuild.sh`; deploy frontend (`npm run build` + `sudo cp -r dist/* /opt/mw-panel/frontend-dist/`). Salud: `curl -s https://plataforma.mundoworld.school/api/health/status`.
3. **E2E redactado** (con go-ahead de Diego si expone algo real): con Asier (ya enlazado en 1c, mwId conocido) firmar JWT admin de MW Panel dentro del contenedor y `GET /api/students/:asierMwId/secretaria-ficha` → 200; verificar (booleanos/recuentos, sin PII): `medical` no nulo (descifrado OK), 2 guardians con principal marcado, `enrollments.active` presente. Un alumno MW Panel sin ficha → 204. Verificar en logs que no hubo escrituras.

## Self-Review (control)

- **Cobertura del spec:** Componente 1 → Task 1; Componente 2 → Task 2; Componente 3 → Task 3; contrato SP-7 → Task 4; deploy/E2E → sección final. ✅
- **Tipos consistentes:** `EnrollmentRow`/`splitEnrollments` (Task 1) ↔ contrato JSON ↔ interfaces del panel (Task 3); `FichaResult`/`mapFichaResponse` (Task 2) ↔ endpoint. ✅
- **Sin placeholders:** todo el código está completo; el único valor concreto (`SECRETARIA_SERVICE_USER_ID`) está resuelto (`3fc62bf3-…`). ✅
