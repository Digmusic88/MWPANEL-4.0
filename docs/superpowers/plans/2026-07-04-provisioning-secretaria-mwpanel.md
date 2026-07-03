# Feature 1c — Aprovisionamiento Secretaría → MW Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde la ficha del alumno en Secretaría, crear manualmente las cuentas de acceso en MW Panel (alumno + padres) reutilizando `POST /api/enrollment` de MW Panel, sin enviar emails.

**Architecture:** Módulo nuevo `provisioning/` en el backend de Secretaría, espejo de `inscription/`. Una función pura de mapeo (alumno+tutores → DTO de enrollment + bloqueos) y un cliente HTTP que firma un JWT admin de MW Panel (secreto compartido) y hace `POST` al endpoint de enrollment. El servicio orquesta lectura + idempotencia + reintento por colisión de email + guardado del enlace `mwpanel_student_id`. Botón manual en la ficha del frontend.

**Tech Stack:** NestJS + TypeORM (`DataSource.query`), `fetch` nativo (Node 20), `jsonwebtoken`, Jest (specs puros), React + antd (App.tsx / `FichaAlumno`).

## Global Constraints

- **Reutilizar MW Panel, no SQL directo**: crear cuentas llamando a `POST http://mw-panel-backend-prod:3000/api/enrollment` (nombre de contenedor, NO IP). Secretaría no escribe `public.*` por SQL; solo escribe `secretaria.students.mwpanel_student_id`.
- **Auth**: firmar JWT `{ sub: <id admin MW Panel> }` con `process.env.JWT_SECRET` (compartido), `expiresIn: '5m'`. El id admin se lee de `public.users` (rol admin activo) — lectura, no escritura.
- **Sin emails**: 1c no envía correos ni toca ningún flujo de email.
- **Idempotencia**: si el alumno ya tiene `mwpanel_student_id` → no re-crear. Familia deduplicada por MW Panel (email del padre). Email sintético del alumno con reintento por sufijo ante 409.
- **Roles**: endpoints `@Roles('secretaria_admin','direccion')` bajo `@UseGuards(SecretariaAuthGuard)`.
- **Niveles educativos** (UUIDs fijos): Infantil `11111111-1111-1111-1111-111111111111`, Primaria `22222222-2222-2222-2222-222222222222`, Secundaria `33333333-3333-3333-3333-333333333333`.
- **Email sintético del alumno**: `slug(firstName).slug(lastName)[suffix]@mw.com`, `slug` = NFD sin diacríticos, minúsculas, solo `[a-z0-9]`.
- **Repo propio**: commits con `git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria`, rama `main`. Base = `713e1de`.
- **Test command** (specs puros): `cd /opt/mw-secretaria/backend && npx jest <ruta-spec>`. Build: `npm run build` (exit 0).

## Contrato MW Panel `POST /api/enrollment` (verificado)

Body `{ student, family }`:
- `student`: `firstName`(req), `lastName`(req), `email`(req, formato email), `password`(req ≥6), `birthDate?`(YYYY-MM-DD), `enrollmentNumber`(req), `educationalLevelId`(req). (`courseId`/`classGroupIds` se omiten.)
- `family.primaryContact`: `firstName`(req), `lastName?`, `email`(req, formato email), `password`(req ≥6), `phone`(req).
- `family.secondaryContact?`: mismos campos, todos opcionales.
Respuesta **201**: `{ student: { id, enrollmentNumber, user: { id, email } }, family: { id, ... } }`. **409** si el email del alumno ya existe. Deduplica familia por email del padre.

---

### Task 1: Mapeo puro (`enrollment-map.ts`)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/provisioning/enrollment-map.ts`
- Test: `/opt/mw-secretaria/backend/src/modules/provisioning/enrollment-map.spec.ts`

**Interfaces:**
- Produces:
  - `slug(s: string): string`
  - `studentEmail(firstName: string, lastName: string, suffix?: number): string`
  - `interface MapStudent { firstName: string; lastName: string; birthDate: string | null }`
  - `interface MapGuardian { fullName: string; email: string | null; phone: string | null; isPrimary: boolean }`
  - `interface MapOpts { educationalLevelId: string; enrollmentNumber: string; studentPassword: string; primaryPassword: string; secondaryPassword: string; emailSuffix?: number }`
  - `interface EnrollmentDto { student: { firstName: string; lastName: string; email: string; password: string; birthDate?: string; enrollmentNumber: string; educationalLevelId: string }; family: { primaryContact: { firstName: string; lastName?: string; email: string; password: string; phone: string }; secondaryContact?: { firstName: string; lastName?: string; email: string; password: string; phone: string } } }`
  - `buildEnrollmentDto(student: MapStudent, guardians: MapGuardian[], opts: MapOpts): { dto: EnrollmentDto | null; blockers: string[] }`

- [ ] **Step 1: Escribir el test que falla**

```ts
// enrollment-map.spec.ts
import { slug, studentEmail, buildEnrollmentDto, MapGuardian } from './enrollment-map';

const OPTS = { educationalLevelId: 'LVL', enrollmentNumber: 'MW-2026-ABC', studentPassword: 'Pass1234', primaryPassword: 'Prim1234', secondaryPassword: 'Seco1234' };

describe('slug / studentEmail', () => {
  it('slug quita tildes y no alfanumérico', () => {
    expect(slug('José Ñú')).toBe('josenu');
    expect(slug('  Díaz-Pérez ')).toBe('diazperez');
  });
  it('studentEmail compone @mw.com y aplica sufijo', () => {
    expect(studentEmail('José', 'Pérez')).toBe('jose.perez@mw.com');
    expect(studentEmail('José', 'Pérez', 2)).toBe('jose.perez2@mw.com');
  });
});

describe('buildEnrollmentDto', () => {
  const guardians: MapGuardian[] = [
    { fullName: 'Maria Gomez', email: 'maria@x.com', phone: '600111222', isPrimary: true },
    { fullName: 'Juan Perez Ruiz', email: 'juan@x.com', phone: null, isPrimary: false },
  ];
  it('mapea alumno + primario + secundario', () => {
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, guardians, OPTS);
    expect(blockers).toEqual([]);
    expect(dto!.student).toEqual({ firstName: 'Ana', lastName: 'Gomez', email: 'ana.gomez@mw.com', password: 'Pass1234', birthDate: '2018-03-05', enrollmentNumber: 'MW-2026-ABC', educationalLevelId: 'LVL' });
    expect(dto!.family.primaryContact).toEqual({ firstName: 'Maria', lastName: 'Gomez', email: 'maria@x.com', password: 'Prim1234', phone: '600111222' });
    expect(dto!.family.secondaryContact).toEqual({ firstName: 'Juan', lastName: 'Perez Ruiz', email: 'juan@x.com', password: 'Seco1234', phone: '000000000' });
  });
  it('aplica emailSuffix al alumno', () => {
    const { dto } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, guardians, { ...OPTS, emailSuffix: 3 });
    expect(dto!.student.email).toBe('ana.gomez3@mw.com');
  });
  it('bloquea sin fecha de nacimiento', () => {
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: null }, guardians, OPTS);
    expect(dto).toBeNull();
    expect(blockers).toContain('Falta la fecha de nacimiento del alumno');
  });
  it('bloquea sin tutor con email', () => {
    const noEmail: MapGuardian[] = [{ fullName: 'Maria Gomez', email: null, phone: '600', isPrimary: true }];
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, noEmail, OPTS);
    expect(dto).toBeNull();
    expect(blockers).toContain('Ningún tutor tiene email; añádelo antes de crear la cuenta');
  });
  it('bloquea sin nivel educativo', () => {
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, guardians, { ...OPTS, educationalLevelId: '' });
    expect(dto).toBeNull();
    expect(blockers).toContain('Elige el nivel educativo');
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/provisioning/enrollment-map.spec.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementación mínima**

```ts
// enrollment-map.ts
export interface MapStudent { firstName: string; lastName: string; birthDate: string | null }
export interface MapGuardian { fullName: string; email: string | null; phone: string | null; isPrimary: boolean }
export interface MapOpts { educationalLevelId: string; enrollmentNumber: string; studentPassword: string; primaryPassword: string; secondaryPassword: string; emailSuffix?: number }
export interface EnrollmentContact { firstName: string; lastName?: string; email: string; password: string; phone: string }
export interface EnrollmentDto {
  student: { firstName: string; lastName: string; email: string; password: string; birthDate?: string; enrollmentNumber: string; educationalLevelId: string };
  family: { primaryContact: EnrollmentContact; secondaryContact?: EnrollmentContact };
}

export function slug(s: string): string {
  return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function studentEmail(firstName: string, lastName: string, suffix?: number): string {
  return `${slug(firstName)}.${slug(lastName)}${suffix ? suffix : ''}@mw.com`;
}
function splitName(fullName: string): { firstName: string; lastName?: string } {
  const parts = (fullName || '').trim().split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');
  return { firstName, lastName: lastName || undefined };
}
const empty = (v: string | null | undefined) => v === null || v === undefined || String(v).trim() === '';

export function buildEnrollmentDto(student: MapStudent, guardians: MapGuardian[], opts: MapOpts): { dto: EnrollmentDto | null; blockers: string[] } {
  const blockers: string[] = [];
  if (empty(student.birthDate)) blockers.push('Falta la fecha de nacimiento del alumno');
  const withEmail = (guardians || []).filter(g => !empty(g.email));
  if (withEmail.length === 0) blockers.push('Ningún tutor tiene email; añádelo antes de crear la cuenta');
  if (empty(opts.educationalLevelId)) blockers.push('Elige el nivel educativo');
  if (blockers.length) return { dto: null, blockers };

  const primary = withEmail.find(g => g.isPrimary) || withEmail[0];
  const secondary = withEmail.find(g => g !== primary);
  const toContact = (g: MapGuardian, password: string): EnrollmentContact => {
    const n = splitName(g.fullName);
    return { firstName: n.firstName, lastName: n.lastName, email: g.email as string, password, phone: empty(g.phone) ? '000000000' : (g.phone as string) };
  };

  const dto: EnrollmentDto = {
    student: {
      firstName: student.firstName, lastName: student.lastName,
      email: studentEmail(student.firstName, student.lastName, opts.emailSuffix),
      password: opts.studentPassword,
      birthDate: student.birthDate as string,
      enrollmentNumber: opts.enrollmentNumber,
      educationalLevelId: opts.educationalLevelId,
    },
    family: { primaryContact: toContact(primary, opts.primaryPassword) },
  };
  if (secondary) dto.family.secondaryContact = toContact(secondary, opts.secondaryPassword);
  return { dto, blockers: [] };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/provisioning/enrollment-map.spec.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/provisioning/enrollment-map.ts backend/src/modules/provisioning/enrollment-map.spec.ts
$G commit -m "feat(provisioning): mapeo puro alumno+tutores → DTO enrollment + bloqueos"
$G push origin main
```

---

### Task 2: Cliente MW Panel (`mwpanel-client.ts`)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/provisioning/mwpanel-client.ts`
- Test: `/opt/mw-secretaria/backend/src/modules/provisioning/mwpanel-client.spec.ts`

**Interfaces:**
- Consumes: `jsonwebtoken` (ya disponible en node_modules); `fetch` nativo.
- Produces:
  - `signAdminToken(adminUserId: string): string`
  - `interface EnrollmentHttpResult { status: number; body: any }`
  - `postEnrollment(dto: any, token: string): Promise<EnrollmentHttpResult>`
  - const `MWPANEL_API` (base URL)

- [ ] **Step 1: Escribir el test que falla** (solo el firmado; el POST se prueba en E2E)

```ts
// mwpanel-client.spec.ts
import * as jwt from 'jsonwebtoken';
import { signAdminToken } from './mwpanel-client';

describe('signAdminToken', () => {
  const OLD = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = 'test-secret'; });
  afterAll(() => { process.env.JWT_SECRET = OLD; });
  it('firma un JWT con sub=adminUserId verificable con el secreto', () => {
    const token = signAdminToken('admin-123');
    const decoded: any = jwt.verify(token, 'test-secret');
    expect(decoded.sub).toBe('admin-123');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/provisioning/mwpanel-client.spec.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementación mínima**

```ts
// mwpanel-client.ts
import * as jwt from 'jsonwebtoken';

export const MWPANEL_API = process.env.MWPANEL_API_URL || 'http://mw-panel-backend-prod:3000/api';

export function signAdminToken(adminUserId: string): string {
  const secret = process.env.JWT_SECRET || '';
  return jwt.sign({ sub: adminUserId }, secret, { expiresIn: '5m' });
}

export interface EnrollmentHttpResult { status: number; body: any }

export async function postEnrollment(dto: any, token: string): Promise<EnrollmentHttpResult> {
  const res = await fetch(`${MWPANEL_API}/enrollment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto),
  });
  let body: any = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/provisioning/mwpanel-client.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/provisioning/mwpanel-client.ts backend/src/modules/provisioning/mwpanel-client.spec.ts
$G commit -m "feat(provisioning): cliente MW Panel (firma JWT admin + POST enrollment)"
$G push origin main
```

---

### Task 3: Servicio + controller + módulo + registro + contrato

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/provisioning/provisioning.service.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/provisioning/provisioning.controller.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/provisioning/provisioning.module.ts`
- Modify: `/opt/mw-secretaria/backend/src/app.module.ts` (registrar `ProvisioningModule`)
- Modify: `/opt/mw-secretaria/docs/CONTRATO_MWPANEL.md` (nota de la llamada saliente)

**Interfaces:**
- Consumes: `buildEnrollmentDto` (T1); `signAdminToken`, `postEnrollment` (T2).
- Produces:
  - `type ProvisionStatus = 'created'|'already'|'blocked'|'error'`
  - `interface ProvisionResult { status: ProvisionStatus; mwpanelStudentId?: string; mwpanelFamilyId?: string; studentLoginEmail?: string; blockers?: string[]; message?: string }`
  - `ProvisioningService.provision(studentId: string, educationalLevelId: string): Promise<ProvisionResult>`
  - endpoints `POST /api/secretaria/provisioning/:studentId`, `GET /api/secretaria/provisioning/levels`

- [ ] **Step 1: Implementar `provisioning.service.ts`**

```ts
// provisioning.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { buildEnrollmentDto, MapGuardian } from './enrollment-map';
import { signAdminToken, postEnrollment } from './mwpanel-client';

export const LEVELS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Educación Infantil' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Educación Primaria' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Educación Secundaria Obligatoria' },
];

export type ProvisionStatus = 'created' | 'already' | 'blocked' | 'error';
export interface ProvisionResult { status: ProvisionStatus; mwpanelStudentId?: string; mwpanelFamilyId?: string; studentLoginEmail?: string; blockers?: string[]; message?: string }

function randomPassword(): string {
  return 'Mw' + Math.random().toString(36).slice(2, 10) + '9';
}
function genEnrollmentNumber(): string {
  return `MW-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

@Injectable()
export class ProvisioningService {
  private adminId: string | null = null;
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async getAdminId(): Promise<string> {
    if (this.adminId) return this.adminId;
    const rows = await this.ds.query(`SELECT id FROM public.users WHERE role='admin' AND "isActive"=true LIMIT 1`);
    if (!rows.length) throw new BadRequestException('No hay un admin de MW Panel para autenticar la creación de cuentas');
    this.adminId = rows[0].id;
    return this.adminId;
  }

  async provision(studentId: string, educationalLevelId: string): Promise<ProvisionResult> {
    const s = (await this.ds.query(
      `SELECT first_name AS "firstName", last_name AS "lastName", to_char(birth_date,'YYYY-MM-DD') AS "birthDate", mwpanel_student_id AS "mwpanelStudentId", family_id AS "familyId"
       FROM secretaria.students WHERE id=$1`, [studentId]))[0];
    if (!s) throw new BadRequestException('Alumno no encontrado');
    if (s.mwpanelStudentId) return { status: 'already', mwpanelStudentId: s.mwpanelStudentId };

    const guardians: MapGuardian[] = s.familyId ? await this.ds.query(
      `SELECT full_name AS "fullName", email, phone, is_primary_contact AS "isPrimary" FROM secretaria.guardians WHERE family_id=$1`, [s.familyId]) : [];

    const enrollmentNumber = genEnrollmentNumber();
    const token = signAdminToken(await this.getAdminId());

    for (let suffix = 0; suffix <= 5; suffix++) {
      const { dto, blockers } = buildEnrollmentDto(
        { firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate },
        guardians,
        { educationalLevelId, enrollmentNumber, studentPassword: randomPassword(), primaryPassword: randomPassword(), secondaryPassword: randomPassword(), emailSuffix: suffix || undefined },
      );
      if (!dto) return { status: 'blocked', blockers };

      const res = await postEnrollment(dto, token);
      if (res.status === 201) {
        const mwStudentId = res.body?.student?.id;
        const mwFamilyId = res.body?.family?.id;
        if (mwStudentId) await this.ds.query(`UPDATE secretaria.students SET mwpanel_student_id=$2 WHERE id=$1`, [studentId, mwStudentId]);
        if (mwFamilyId && s.familyId) await this.ds.query(`UPDATE secretaria.families SET mwpanel_family_id=COALESCE(mwpanel_family_id,$2) WHERE id=$1`, [s.familyId, mwFamilyId]);
        return { status: 'created', mwpanelStudentId: mwStudentId, mwpanelFamilyId: mwFamilyId, studentLoginEmail: dto.student.email };
      }
      // 409 con email de alumno duplicado → reintentar con sufijo
      const msg = (res.body?.message || '').toString().toLowerCase();
      const isStudentEmailDup = res.status === 409 && msg.includes(dto.student.email.toLowerCase());
      if (!isStudentEmailDup) {
        return { status: 'error', message: res.body?.message || `MW Panel respondió ${res.status}` };
      }
      // si es dup del email del alumno, el bucle reintenta con suffix+1
    }
    return { status: 'error', message: 'No se pudo generar un email de acceso único para el alumno' };
  }
}
```

- [ ] **Step 2: Implementar `provisioning.controller.ts`**

```ts
// provisioning.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { ProvisioningService, LEVELS } from './provisioning.service';

@Controller('secretaria/provisioning')
@UseGuards(SecretariaAuthGuard)
export class ProvisioningController {
  constructor(private readonly svc: ProvisioningService) {}

  @Get('levels')
  @Roles('secretaria_admin', 'direccion')
  levels() {
    return LEVELS;
  }

  @Post(':studentId')
  @Roles('secretaria_admin', 'direccion')
  async provision(@Param('studentId') studentId: string, @Body() body: { educationalLevelId: string }) {
    if (!body?.educationalLevelId) throw new BadRequestException('Falta educationalLevelId');
    return this.svc.provision(studentId, body.educationalLevelId);
  }
}
```

- [ ] **Step 3: Crear `provisioning.module.ts` y registrar en `app.module.ts`**

```ts
// provisioning.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StaffRole } from '../../common/staff-role.entity';
import { ProvisioningController } from './provisioning.controller';
import { ProvisioningService } from './provisioning.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffRole]), JwtModule.register({})],
  controllers: [ProvisioningController],
  providers: [ProvisioningService],
})
export class ProvisioningModule {}
```

En `app.module.ts`: añadir `import { ProvisioningModule } from './modules/provisioning/provisioning.module';` junto a la línea de `BackfillModule`, y añadir `ProvisioningModule` al array `imports` (junto a `BackfillModule`).

- [ ] **Step 4: Nota en el contrato**

En `/opt/mw-secretaria/docs/CONTRATO_MWPANEL.md`, añadir una sección al final:

```markdown
## Llamada saliente Secretaría → MW Panel (Feature 1c, 2026-07-04)

Secretaría **llama a la API REST de MW Panel** para crear cuentas de acceso
(aprovisionamiento): `POST http://mw-panel-backend-prod:3000/api/enrollment`
autenticado con un JWT de rol admin firmado con el **JWT_SECRET compartido**.
No escribe `public.*` por SQL para esto: delega en `processEnrollment` de MW
Panel (crea alumno+familia+cuentas, dedup por email). Acoplamientos:
- Depende del contrato de `POST /api/enrollment` (campos de `CreateEnrollmentDto`)
  y de que exista al menos un `public.users` con rol admin activo.
- Depende de que el `JWT_SECRET` siga siendo el mismo en ambos servicios.
- Tras crear, Secretaría guarda el `student.id` devuelto en
  `secretaria.students.mwpanel_student_id`.
```

- [ ] **Step 5: Compilar**

Run: `cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -8`
Expected: build exit 0.

- [ ] **Step 6: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/provisioning/provisioning.service.ts backend/src/modules/provisioning/provisioning.controller.ts backend/src/modules/provisioning/provisioning.module.ts backend/src/app.module.ts docs/CONTRATO_MWPANEL.md
$G commit -m "feat(provisioning): servicio+endpoint de alta de cuentas MW Panel + nota de contrato"
$G push origin main
```

---

### Task 4: Frontend — botón en la ficha del alumno

**Files:**
- Modify: `/opt/mw-secretaria/frontend/src/App.tsx` (componente `FichaAlumno`, ~línea 859)

**Interfaces:**
- Consumes: `GET /provisioning/levels`, `POST /provisioning/:studentId` vía `api` (`./api`).
- Produces: botón "Crear cuenta de acceso en MW Panel" en la ficha.

**Contexto:** `FichaAlumno({ studentId, open, onClose })` carga `api.get('/students/:id/ficha')` en `data`; `data.student` (`s`) tiene `mwpanelStudentId`, `fullName`, `birthDate`. Ya hay un `useEffect` que recarga con `[open, studentId]`. Para refrescar tras crear la cuenta, se recarga la ficha llamando de nuevo a ese `api.get`.

- [ ] **Step 1: Añadir estado + acción de aprovisionamiento dentro de `FichaAlumno`**

Justo después de la función `removeOverride` (antes de `const s = data?.student;`), añadir:
```tsx
  const [provOpen, setProvOpen] = useState(false);
  const [levels, setLevels] = useState<any[]>([]);
  const [levelId, setLevelId] = useState<string | undefined>();
  const [provLoading, setProvLoading] = useState(false);
  const openProvision = async () => {
    setProvOpen(true);
    if (!levels.length) { try { const r = await api.get('/provisioning/levels'); setLevels(r.data); } catch {} }
  };
  const doProvision = async () => {
    if (!levelId) { message.warning('Elige el nivel educativo'); return; }
    setProvLoading(true);
    try {
      const r = await api.post(`/provisioning/${studentId}`, { educationalLevelId: levelId });
      const st = r.data?.status;
      if (st === 'created') { message.success(`Cuenta creada. Login del alumno: ${r.data.studentLoginEmail}. No se ha enviado ningún email.`); }
      else if (st === 'already') { message.info('El alumno ya tenía cuenta en MW Panel'); }
      else if (st === 'blocked') { message.warning((r.data.blockers || []).join(' · ')); }
      else { message.error(r.data?.message || 'No se pudo crear la cuenta'); }
      if (st === 'created' || st === 'already') {
        setProvOpen(false);
        const rr = await api.get(`/students/${studentId}/ficha`); setData(rr.data); // refrescar chip
      }
    } catch (e: any) { message.error(e?.response?.data?.message || 'No se pudo crear la cuenta'); }
    finally { setProvLoading(false); }
  };
```

- [ ] **Step 2: Añadir el botón + modal al render**

Dentro del `card('Datos personales', ...)` no; añadir un bloque propio justo **antes** del cierre `</>` del `return` de contenido cargado (después del último `card(...)`, antes de `</>)}`). Insertar:
```tsx
        {card('Acceso a la plataforma (MW Panel)', (
          s?.mwpanelStudentId
            ? <Tag color="purple">Cuenta MW Panel creada</Tag>
            : <>
                <Button type="primary" loading={provLoading} onClick={openProvision}>Crear cuenta de acceso en MW Panel</Button>
                <Modal title="Crear cuenta de acceso en MW Panel" open={provOpen} onCancel={() => setProvOpen(false)}
                  confirmLoading={provLoading} onOk={doProvision} okText="Crear cuenta">
                  <Alert type="info" showIcon style={{ marginBottom: 12 }}
                    message="Se crean las cuentas del alumno y de los padres en MW Panel. NO se envía ningún email; las credenciales se mandan luego, aparte." />
                  <Select style={{ width: '100%' }} placeholder="Nivel educativo" value={levelId} onChange={setLevelId}
                    options={levels.map((l: any) => ({ value: l.id, label: l.name }))} />
                </Modal>
              </>
        ))}
```
(Componentes antd: `Button, Modal, Select, Alert, Tag, message` — verificar que están importados al inicio de App.tsx; si `Modal` o `Select` faltaran, añadirlos.)

- [ ] **Step 3: Build del frontend**

Run: `cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -8`
Expected: build exit 0 (solo warning de chunk size).

- [ ] **Step 4: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add frontend/src/App.tsx
$G commit -m "feat(provisioning): botón 'Crear cuenta de acceso en MW Panel' en la ficha"
$G push origin main
```

---

## Despliegue + E2E con datos reales (GATED — lo hace el controlador tras la revisión final)

1. **Backup**: `docker exec mw-panel-db-prod pg_dump -U mwpanel mwpanel | gzip > /opt/mw-secretaria/backups/pre-prov1c-$(date +%Y%m%d_%H%M%S).sql.gz` (dump completo: 1c crea filas en `public.*` vía MW Panel).
2. **Deploy frontend**: `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`.
3. **Rebuild + recrear API** (config viva: red `mw-panel_mw-network`, `127.0.0.1:3010`, `--env-file /opt/mw-secretaria/backend/.env`, mount mocks db, `--restart unless-stopped`).
4. **Verificar**: `secretaria` 200, `mocks` 200 (INTACTO); rutas `provisioning/levels` y `provisioning/:studentId` mapeadas; `GET /levels` sin auth = 401; desde el contenedor, `wget http://mw-panel-backend-prod:3000/api/health/status` = OK (reachability).
5. **E2E (datos reales — NO exponer PII)**: con token admin de Secretaría, elegir un alumno de prueba de `secretaria.students` SIN `mwpanel_student_id` (p.ej. el creado en 1a) y con fecha + tutor con email. `POST /provisioning/:studentId {educationalLevelId: infantil}` → esperar `status:'created'`. Verificar en `public.*` (redactado): existe `users`(role student)+`user_profiles`+`students` con ese `enrollmentNumber`, la `families`+contactos padres, y que `secretaria.students.mwpanel_student_id` quedó fijado. **Idempotencia**: repetir el POST → `status:'already'` (sin crear nada nuevo). Confirmar que **no se envió email** (processEnrollment no tiene ruta de email; verificar que no aparecen envíos en logs). Confirmar con Diego el alumno de prueba antes del alta real.

## Notas de ejecución

- **Riesgo concentrado en Task 3** (llamada saliente + escritura del enlace + reintento 409): el build + el E2E lo validan. Nada se escribe en `secretaria.*` si MW Panel no devuelve 201.
- **`jsonwebtoken`** está en `node_modules` (dep transitiva de `@nestjs/jwt`, usada en pruebas). Si `npm run build` fallara por tipos, añadir `@types/jsonwebtoken` a devDependencies.
- **Reachability**: usar SIEMPRE el nombre de contenedor `mw-panel-backend-prod` (IP dinámica). Ambos contenedores comparten `mw-panel_mw-network`.
- **Idempotencia comprobable**: segundo POST sobre el mismo alumno → `already` (por `mwpanel_student_id`).
