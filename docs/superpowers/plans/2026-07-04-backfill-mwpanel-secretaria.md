# Feature 1b — Backfill MW Panel → Secretaría — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconciliar en Secretaría los alumnos/familias activos de MW Panel: vincular los que ya existen y crear los que falten, rellenando solo datos ausentes y marcando lo pendiente.

**Architecture:** Módulo nuevo `backfill/` en el backend de Secretaría, espejo de `inscription/`. Dos funciones puras (matching + plan de escritura) llevan toda la lógica testeable; un servicio compone lectura de `public.*` (MW Panel, solo lectura) + clasificación + escritura transaccional a `secretaria.*`. Controller con `POST /preview` (dry-run) y `POST /apply`. Pantalla admin en Configuración del frontend.

**Tech Stack:** NestJS + TypeORM (`DataSource.query` SQL crudo), PostgreSQL (schema `secretaria` + lectura de `public`), Jest (specs puros), React + antd (App.tsx monolítico).

## Global Constraints

- **Secretaría prevalece**: nunca sobrescribir un valor existente de Secretaría; rellenar un campo solo si está `NULL`/vacío y MW Panel tiene dato.
- **Solo lectura de MW Panel**: leer `public.*`, escribir únicamente `secretaria.*`. No modificar ninguna tabla `public.*` (contrato SP-7).
- **Excluir inactivos**: procesar solo alumnos con `public.users.isActive = true`.
- **Idempotente**: excluir del matching los alumnos de Secretaría con `mwpanel_student_id IS NOT NULL`.
- **Nada se escribe sin revisión**: `preview` es dry-run puro; solo `apply` escribe.
- **Normalización de nombre en JS** (no usar la extensión `unaccent`, no instalada): `s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim().replace(/\s+/g,' ')`.
- **Roles**: ambos endpoints `@Roles('secretaria_admin','direccion')` bajo `@UseGuards(SecretariaAuthGuard)`.
- **Repo propio**: commits al repo de Secretaría con `git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria`, rama `main`. Base = `4ca7770`.
- **Test command** (specs puros): `cd /opt/mw-secretaria/backend && npx jest <ruta-del-spec>`. Build: `npm run build` (exit 0).
- **Enum relación**: `secretaria.guardians.relationship` es `guardian_relationship` (`madre|padre|tutor|otro`). `public.family_students.relationship` es siempre `'parent'` → derivar con `genderToRelationship(guessGender(fullName)) ?? 'tutor'` (helper existente en `src/modules/import/gender.ts`).

## Columnas relevantes (verificadas contra prod)

- `secretaria.students`: `id, mwpanel_student_id, family_id, first_name, last_name, birth_date, address, city, medical_notes_encrypted, photo_consent(NN def false), exit_consent(NN def false), notes, is_active(NN def true)`. **Se añaden** `import_pending(NN def false)` + `import_pending_fields(text null)`. `family_id`, `first_name`, `last_name`, `birth_date`, `address` son nullables.
- `secretaria.families`: `id, display_name(NN), mwpanel_family_id, notes`.
- `secretaria.guardians`: `id, family_id(NN), full_name(NN), relationship(NN def 'tutor'), nif, phone, phone_alt, email, is_primary_contact(NN def false)`.
- MW Panel (lectura): `public.students(id, "birthDate", "enrollmentNumber", "userId")`, `public.user_profiles("userId","firstName","lastName",address,phone)`, `public.users(id,email,"isActive")`, `public.families(id,"primaryContactId","secondaryContactId")`, `public.family_students("familyId","studentId",relationship)`. **Ojo**: columnas camelCase → citar con comillas dobles en SQL.

---

### Task 1: Motor de emparejamiento (`backfill-match.ts`, puro)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/backfill/backfill-match.ts`
- Test: `/opt/mw-secretaria/backend/src/modules/backfill/backfill-match.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `normalizeName(first: string, last: string): string`
  - `interface MatchCandidate { secretariaId: string; birthDateMismatch: boolean }`
  - `interface MwLite { mwStudentId: string; firstName: string; lastName: string; birthDate: string | null }`
  - `interface SecLite { id: string; firstName: string; lastName: string; birthDate: string | null }`
  - `interface MatchResult { mwStudentId: string; category: 'reliable'|'dubious'|'new'; target?: MatchCandidate; candidates?: MatchCandidate[] }`
  - `classifyStudents(mw: MwLite[], sec: SecLite[]): MatchResult[]`

- [ ] **Step 1: Escribir el test que falla**

```ts
// backfill-match.spec.ts
import { normalizeName, classifyStudents, MwLite, SecLite } from './backfill-match';

describe('normalizeName', () => {
  it('quita tildes, mayúsculas y colapsa espacios', () => {
    expect(normalizeName('  José  ', 'Ñíguez  Díaz')).toBe('jose niguez diaz');
    expect(normalizeName('ANA', 'Gómez')).toBe('ana gomez');
  });
});

describe('classifyStudents', () => {
  const sec: SecLite[] = [
    { id: 'S1', firstName: 'Asier', lastName: 'Perez', birthDate: '2018-03-05' },
    { id: 'S2', firstName: 'Luis', lastName: 'Gomez', birthDate: '2017-01-01' },
    { id: 'S3', firstName: 'Luis', lastName: 'Gomez', birthDate: '2019-01-01' },
  ];

  it('1 match de nombre → reliable con target', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M1', firstName: 'Asier', lastName: 'Pérez', birthDate: '2018-03-05' }];
    const r = classifyStudents(mw, sec);
    expect(r[0].category).toBe('reliable');
    expect(r[0].target!.secretariaId).toBe('S1');
    expect(r[0].target!.birthDateMismatch).toBe(false);
  });

  it('reliable con fecha distinta marca birthDateMismatch', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M1', firstName: 'Asier', lastName: 'Perez', birthDate: '2010-01-01' }];
    expect(classifyStudents(mw, sec)[0].target!.birthDateMismatch).toBe(true);
  });

  it('≥2 matches de nombre → dubious con candidatos', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M2', firstName: 'Luis', lastName: 'Gomez', birthDate: '2017-01-01' }];
    const r = classifyStudents(mw, sec);
    expect(r[0].category).toBe('dubious');
    expect(r[0].candidates!.map(c => c.secretariaId).sort()).toEqual(['S2', 'S3']);
  });

  it('0 matches → new', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M3', firstName: 'Nadie', lastName: 'Existe', birthDate: null }];
    expect(classifyStudents(mw, sec)[0].category).toBe('new');
  });

  it('homónimos dentro de MW Panel → ambos dubious aunque haya 1 match', () => {
    const mw: MwLite[] = [
      { mwStudentId: 'M4', firstName: 'Asier', lastName: 'Perez', birthDate: '2018-03-05' },
      { mwStudentId: 'M5', firstName: 'Asier', lastName: 'Pérez', birthDate: '2015-01-01' },
    ];
    const r = classifyStudents(mw, sec);
    expect(r.find(x => x.mwStudentId === 'M4')!.category).toBe('dubious');
    expect(r.find(x => x.mwStudentId === 'M5')!.category).toBe('dubious');
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/backfill/backfill-match.spec.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementación mínima**

```ts
// backfill-match.ts
export function normalizeName(first: string, last: string): string {
  return `${first || ''} ${last || ''}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export interface MatchCandidate { secretariaId: string; birthDateMismatch: boolean }
export interface MwLite { mwStudentId: string; firstName: string; lastName: string; birthDate: string | null }
export interface SecLite { id: string; firstName: string; lastName: string; birthDate: string | null }
export interface MatchResult {
  mwStudentId: string;
  category: 'reliable' | 'dubious' | 'new';
  target?: MatchCandidate;
  candidates?: MatchCandidate[];
}

function mismatch(a: string | null, b: string | null): boolean {
  return !!a && !!b && a !== b;
}

export function classifyStudents(mw: MwLite[], sec: SecLite[]): MatchResult[] {
  // índice Secretaría: nombre normalizado → lista de SecLite
  const secByName = new Map<string, SecLite[]>();
  for (const s of sec) {
    const k = normalizeName(s.firstName, s.lastName);
    (secByName.get(k) || secByName.set(k, []).get(k)!).push(s);
  }
  // homónimos dentro de MW Panel
  const mwNameCount = new Map<string, number>();
  for (const m of mw) {
    const k = normalizeName(m.firstName, m.lastName);
    mwNameCount.set(k, (mwNameCount.get(k) || 0) + 1);
  }

  return mw.map((m) => {
    const k = normalizeName(m.firstName, m.lastName);
    const secMatches = secByName.get(k) || [];
    const toCand = (s: SecLite): MatchCandidate => ({ secretariaId: s.id, birthDateMismatch: mismatch(m.birthDate, s.birthDate) });

    if ((mwNameCount.get(k) || 0) > 1) {
      return { mwStudentId: m.mwStudentId, category: 'dubious', candidates: secMatches.map(toCand) };
    }
    if (secMatches.length === 0) return { mwStudentId: m.mwStudentId, category: 'new' };
    if (secMatches.length === 1) return { mwStudentId: m.mwStudentId, category: 'reliable', target: toCand(secMatches[0]) };
    return { mwStudentId: m.mwStudentId, category: 'dubious', candidates: secMatches.map(toCand) };
  });
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/backfill/backfill-match.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/backfill/backfill-match.ts backend/src/modules/backfill/backfill-match.spec.ts
$G commit -m "feat(backfill): motor de emparejamiento puro (normalización + clasificación)"
$G push origin main
```

---

### Task 2: Plan de escritura (`backfill-plan.ts`, puro)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/backfill/backfill-plan.ts`
- Test: `/opt/mw-secretaria/backend/src/modules/backfill/backfill-plan.spec.ts`

**Interfaces:**
- Consumes: `genderToRelationship`, `guessGender` de `../import/gender`.
- Produces:
  - `interface MwGuardianSrc { fullName: string; phone: string | null; email: string | null; isPrimary: boolean }`
  - `interface SecStudentState { birthDate: string | null; address: string | null; notes: string | null }`
  - `interface SecGuardianState { id: string; fullName: string; phone: string | null; email: string | null }`
  - `interface StudentFill { birth_date?: string; address?: string; notes?: string }`
  - `interface StudentFillPlan { fill: StudentFill; wouldFill: string[]; wouldRespect: string[] }`
  - `buildStudentFillPlan(mw: { birthDate: string|null; address: string|null; enrollmentNumber: string|null }, sec: SecStudentState | null): StudentFillPlan`
  - `interface GuardianInsert { fullName: string; relationship: 'madre'|'padre'|'tutor'|'otro'; phone: string|null; email: string|null; isPrimary: boolean }`
  - `interface GuardianPlan { toInsert: GuardianInsert[]; toFillPhone: {id:string; phone:string}[]; toFillEmail: {id:string; email:string}[]; addedUnmatched: boolean }`
  - `planGuardians(mwGuardians: MwGuardianSrc[], secGuardians: SecGuardianState[] | null): GuardianPlan`
  - `computePendingFields(finalBirthDate: string|null, finalAddress: string|null, guardianCount: number, anyGuardianHasPhone: boolean, addedUnmatched: boolean): string[]`

- [ ] **Step 1: Escribir el test que falla**

```ts
// backfill-plan.spec.ts
import { buildStudentFillPlan, planGuardians, computePendingFields } from './backfill-plan';

describe('buildStudentFillPlan', () => {
  it('rellena solo lo vacío en Secretaría (Secretaría prevalece)', () => {
    const mw = { birthDate: '2018-03-05', address: 'Calle 1', enrollmentNumber: 'A-100' };
    const sec = { birthDate: '2018-03-05', address: null, notes: null }; // fecha ya existe → respeta
    const p = buildStudentFillPlan(mw, sec);
    expect(p.fill.birth_date).toBeUndefined();       // no sobrescribe
    expect(p.fill.address).toBe('Calle 1');          // rellena hueco
    expect(p.fill.notes).toContain('A-100');         // enrollment → notas
    expect(p.wouldRespect).toContain('fecha de nacimiento');
  });

  it('alumno nuevo (sec=null) rellena todo lo que trae MW Panel', () => {
    const p = buildStudentFillPlan({ birthDate: '2018-03-05', address: null, enrollmentNumber: null }, null);
    expect(p.fill.birth_date).toBe('2018-03-05');
    expect(p.fill.address).toBeUndefined();
  });
});

describe('planGuardians', () => {
  const mw = [
    { fullName: 'Maria Gomez', phone: '600111222', email: 'm@x.com', isPrimary: true },
    { fullName: 'Juan Perez', phone: '600333444', email: 'j@x.com', isPrimary: false },
  ];
  it('familia nueva (sec=null) inserta todos con relación por género', () => {
    const p = planGuardians(mw, null);
    expect(p.toInsert.map(g => g.relationship)).toEqual(['madre', 'padre']);
    expect(p.addedUnmatched).toBe(false);
  });
  it('familia existente: casa por nombre y rellena solo huecos', () => {
    const sec = [{ id: 'G1', fullName: 'María Gómez', phone: null, email: 'm@x.com' }];
    const p = planGuardians(mw, sec);
    expect(p.toFillPhone).toEqual([{ id: 'G1', phone: '600111222' }]); // hueco de teléfono
    expect(p.toFillEmail).toEqual([]);                                  // email ya estaba
    expect(p.toInsert.map(g => g.fullName)).toEqual(['Juan Perez']);    // el no casado se añade
    expect(p.addedUnmatched).toBe(true);
  });
});

describe('computePendingFields', () => {
  it('lista lo que falta', () => {
    expect(computePendingFields(null, null, 1, false, false))
      .toEqual(['sin fecha de nacimiento', 'sin dirección', 'tutor sin teléfono']);
  });
  it('sin tutores', () => {
    expect(computePendingFields('2018-03-05', 'Calle 1', 0, false, false)).toEqual(['sin tutores']);
  });
  it('tutor añadido a verificar', () => {
    expect(computePendingFields('2018-03-05', 'Calle 1', 2, true, true)).toEqual(['tutor añadido, verificar']);
  });
  it('completo → vacío', () => {
    expect(computePendingFields('2018-03-05', 'Calle 1', 1, true, false)).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/backfill/backfill-plan.spec.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementación mínima**

```ts
// backfill-plan.ts
import { guessGender, genderToRelationship } from '../import/gender';
import { normalizeName } from './backfill-match';

export interface MwGuardianSrc { fullName: string; phone: string | null; email: string | null; isPrimary: boolean }
export interface SecStudentState { birthDate: string | null; address: string | null; notes: string | null }
export interface SecGuardianState { id: string; fullName: string; phone: string | null; email: string | null }
export interface StudentFill { birth_date?: string; address?: string; notes?: string }
export interface StudentFillPlan { fill: StudentFill; wouldFill: string[]; wouldRespect: string[] }

const empty = (v: string | null | undefined) => v === null || v === undefined || String(v).trim() === '';

export function buildStudentFillPlan(
  mw: { birthDate: string | null; address: string | null; enrollmentNumber: string | null },
  sec: SecStudentState | null,
): StudentFillPlan {
  const fill: StudentFill = {};
  const wouldFill: string[] = [];
  const wouldRespect: string[] = [];
  const consider = (label: string, mwVal: string | null, secVal: string | null | undefined, key: keyof StudentFill) => {
    if (empty(mwVal)) return;
    if (sec && !empty(secVal)) { wouldRespect.push(label); return; }
    (fill as any)[key] = mwVal;
    wouldFill.push(label);
  };
  consider('fecha de nacimiento', mw.birthDate, sec?.birthDate, 'birth_date');
  consider('dirección', mw.address, sec?.address, 'address');
  // enrollment → se anexa a notas solo si aporta y no está ya
  if (!empty(mw.enrollmentNumber)) {
    const tag = `Matrícula MW Panel: ${mw.enrollmentNumber}`;
    const existing = sec?.notes || '';
    if (!existing.includes(mw.enrollmentNumber!)) {
      fill.notes = empty(existing) ? tag : `${existing}\n${tag}`;
      wouldFill.push('nº matrícula (notas)');
    }
  }
  return { fill, wouldFill, wouldRespect };
}

export interface GuardianInsert { fullName: string; relationship: 'madre'|'padre'|'tutor'|'otro'; phone: string|null; email: string|null; isPrimary: boolean }
export interface GuardianPlan { toInsert: GuardianInsert[]; toFillPhone: {id:string; phone:string}[]; toFillEmail: {id:string; email:string}[]; addedUnmatched: boolean }

const rel = (fullName: string): 'madre'|'padre'|'tutor'|'otro' => genderToRelationship(guessGender(fullName)) ?? 'tutor';

export function planGuardians(mwGuardians: MwGuardianSrc[], secGuardians: SecGuardianState[] | null): GuardianPlan {
  const plan: GuardianPlan = { toInsert: [], toFillPhone: [], toFillEmail: [], addedUnmatched: false };
  if (secGuardians === null) {
    plan.toInsert = mwGuardians.map(g => ({ fullName: g.fullName, relationship: rel(g.fullName), phone: g.phone, email: g.email, isPrimary: g.isPrimary }));
    return plan;
  }
  const secByName = new Map<string, SecGuardianState>();
  for (const s of secGuardians) secByName.set(normalizeName(s.fullName, ''), s);
  for (const g of mwGuardians) {
    const match = secByName.get(normalizeName(g.fullName, ''));
    if (!match) {
      plan.toInsert.push({ fullName: g.fullName, relationship: rel(g.fullName), phone: g.phone, email: g.email, isPrimary: false });
      plan.addedUnmatched = true;
      continue;
    }
    if (empty(match.phone) && !empty(g.phone)) plan.toFillPhone.push({ id: match.id, phone: g.phone! });
    if (empty(match.email) && !empty(g.email)) plan.toFillEmail.push({ id: match.id, email: g.email! });
  }
  return plan;
}

export function computePendingFields(
  finalBirthDate: string | null, finalAddress: string | null,
  guardianCount: number, anyGuardianHasPhone: boolean, addedUnmatched: boolean,
): string[] {
  const out: string[] = [];
  if (empty(finalBirthDate)) out.push('sin fecha de nacimiento');
  if (empty(finalAddress)) out.push('sin dirección');
  if (guardianCount === 0) out.push('sin tutores');
  else if (!anyGuardianHasPhone) out.push('tutor sin teléfono');
  if (addedUnmatched) out.push('tutor añadido, verificar');
  return out;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npx jest src/modules/backfill/backfill-plan.spec.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/backfill/backfill-plan.ts backend/src/modules/backfill/backfill-plan.spec.ts
$G commit -m "feat(backfill): plan de escritura puro (solo-si-vacío, tutores, pendientes)"
$G push origin main
```

---

### Task 3: Lectura de MW Panel (`mwpanel-source.ts`)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/backfill/mwpanel-source.ts`

**Interfaces:**
- Consumes: `DataSource` de `typeorm`; `MwGuardianSrc` de `./backfill-plan`.
- Produces:
  - `interface MwStudentSrc { mwStudentId: string; firstName: string; lastName: string; birthDate: string|null; address: string|null; enrollmentNumber: string|null; guardians: MwGuardianSrc[] }`
  - `interface SecStudentRow { id: string; firstName: string; lastName: string; birthDate: string|null }`
  - `readActiveMwStudents(ds: DataSource): Promise<MwStudentSrc[]>`
  - `readUnlinkedSecretariaStudents(ds: DataSource): Promise<SecStudentRow[]>`

**Notas:** SQL crudo. Columnas MW Panel en camelCase → comillas dobles. `birth_date`/`birthDate` se devuelven como string `YYYY-MM-DD` (Postgres `date` → castear con `to_char(..., 'YYYY-MM-DD')` para evitar objetos Date/UTC). Los tutores se leen en una segunda consulta agregada por alumno.

- [ ] **Step 1: Implementar `mwpanel-source.ts`**

```ts
// mwpanel-source.ts
import { DataSource } from 'typeorm';
import { MwGuardianSrc } from './backfill-plan';

export interface MwStudentSrc {
  mwStudentId: string; firstName: string; lastName: string;
  birthDate: string | null; address: string | null; enrollmentNumber: string | null;
  guardians: MwGuardianSrc[];
}
export interface SecStudentRow { id: string; firstName: string; lastName: string; birthDate: string | null }

export async function readActiveMwStudents(ds: DataSource): Promise<MwStudentSrc[]> {
  const rows = await ds.query(`
    SELECT s.id AS "mwStudentId",
           COALESCE(p."firstName",'') AS "firstName",
           COALESCE(p."lastName",'')  AS "lastName",
           to_char(s."birthDate", 'YYYY-MM-DD') AS "birthDate",
           NULLIF(p.address,'') AS address,
           NULLIF(s."enrollmentNumber",'') AS "enrollmentNumber"
    FROM public.students s
    JOIN public.users u ON u.id = s."userId" AND u."isActive" = true
    LEFT JOIN public.user_profiles p ON p."userId" = s."userId"
    ORDER BY s.id
  `);
  // tutores por alumno: primary + secondary contact de la familia
  const guardians: any[] = await ds.query(`
    SELECT fs."studentId" AS "mwStudentId",
           trim(COALESCE(cp."firstName",'') || ' ' || COALESCE(cp."lastName",'')) AS "fullName",
           NULLIF(cp.phone,'') AS phone,
           cu.email AS email,
           (f."primaryContactId" = cu.id) AS "isPrimary"
    FROM public.family_students fs
    JOIN public.families f ON f.id = fs."familyId"
    JOIN LATERAL (VALUES (f."primaryContactId"), (f."secondaryContactId")) AS c(uid) ON c.uid IS NOT NULL
    JOIN public.users cu ON cu.id = c.uid
    LEFT JOIN public.user_profiles cp ON cp."userId" = cu.id
  `);
  const byStudent = new Map<string, MwGuardianSrc[]>();
  for (const g of guardians) {
    const list = byStudent.get(g.mwStudentId) || byStudent.set(g.mwStudentId, []).get(g.mwStudentId)!;
    list.push({ fullName: g.fullName, phone: g.phone, email: g.email, isPrimary: !!g.isPrimary });
  }
  return rows.map((r: any) => ({ ...r, guardians: byStudent.get(r.mwStudentId) || [] }));
}

export async function readUnlinkedSecretariaStudents(ds: DataSource): Promise<SecStudentRow[]> {
  return ds.query(`
    SELECT id, COALESCE(first_name,'') AS "firstName", COALESCE(last_name,'') AS "lastName",
           to_char(birth_date, 'YYYY-MM-DD') AS "birthDate"
    FROM secretaria.students
    WHERE mwpanel_student_id IS NULL
  `);
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -8`
Expected: build exit 0.

- [ ] **Step 3: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/backfill/mwpanel-source.ts
$G commit -m "feat(backfill): lectura de alumnos activos y tutores de MW Panel (solo lectura)"
$G push origin main
```

---

### Task 4: Servicio `preview` + endpoint + módulo (dry-run alcanzable)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/backfill/backfill.service.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/backfill/backfill.controller.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/backfill/backfill.module.ts`
- Modify: `/opt/mw-secretaria/backend/src/app.module.ts` (registrar `BackfillModule`)

**Interfaces:**
- Consumes: `readActiveMwStudents`, `readUnlinkedSecretariaStudents` (T3); `classifyStudents` (T1); `buildStudentFillPlan`, `planGuardians`, `computePendingFields` (T2).
- Produces:
  - `interface PreviewRow { mwStudentId: string; firstName: string; lastName: string; birthDate: string|null; category: 'reliable'|'dubious'|'new'; targetSecretariaId?: string; birthDateMismatch?: boolean; candidates?: {secretariaId:string; birthDateMismatch:boolean}[]; wouldFill: string[]; wouldRespect: string[]; pendingAfter: string[] }`
  - `BackfillService.preview(): Promise<{ reliable: PreviewRow[]; dubious: PreviewRow[]; new: PreviewRow[]; counts: {reliable:number; dubious:number; new:number} }>`
  - endpoint `POST /api/secretaria/backfill/preview`

- [ ] **Step 1: Implementar `backfill.service.ts` (solo `preview`)**

```ts
// backfill.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { readActiveMwStudents, readUnlinkedSecretariaStudents, MwStudentSrc } from './mwpanel-source';
import { classifyStudents, MatchResult } from './backfill-match';
import { buildStudentFillPlan, planGuardians, computePendingFields, SecStudentState, SecGuardianState } from './backfill-plan';

export interface PreviewRow {
  mwStudentId: string; firstName: string; lastName: string; birthDate: string | null;
  category: 'reliable' | 'dubious' | 'new';
  targetSecretariaId?: string; birthDateMismatch?: boolean;
  candidates?: { secretariaId: string; birthDateMismatch: boolean }[];
  wouldFill: string[]; wouldRespect: string[]; pendingAfter: string[];
}

@Injectable()
export class BackfillService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async secStateFor(studentId: string): Promise<{ student: SecStudentState; guardians: SecGuardianState[] }> {
    const s = (await this.ds.query(
      `SELECT to_char(birth_date,'YYYY-MM-DD') AS "birthDate", NULLIF(address,'') AS address, notes, family_id
       FROM secretaria.students WHERE id=$1`, [studentId]))[0];
    const guardians = s?.family_id ? await this.ds.query(
      `SELECT id, full_name AS "fullName", NULLIF(phone,'') AS phone, email FROM secretaria.guardians WHERE family_id=$1`, [s.family_id]) : [];
    return { student: { birthDate: s?.birthDate ?? null, address: s?.address ?? null, notes: s?.notes ?? null }, guardians };
  }

  private async buildRow(mw: MwStudentSrc, mr: MatchResult): Promise<PreviewRow> {
    const base: PreviewRow = {
      mwStudentId: mw.mwStudentId, firstName: mw.firstName, lastName: mw.lastName, birthDate: mw.birthDate,
      category: mr.category, wouldFill: [], wouldRespect: [], pendingAfter: [],
    };
    if (mr.category === 'dubious') { base.candidates = mr.candidates; return base; }

    const linkedId = mr.category === 'reliable' ? mr.target!.secretariaId : null;
    base.targetSecretariaId = linkedId ?? undefined;
    base.birthDateMismatch = mr.category === 'reliable' ? mr.target!.birthDateMismatch : undefined;

    const secState = linkedId ? await this.secStateFor(linkedId) : null;
    const sp = buildStudentFillPlan(mw, secState ? secState.student : null);
    const gp = planGuardians(mw.guardians, secState ? secState.guardians : null);
    base.wouldFill = [...sp.wouldFill, ...(gp.toInsert.length ? [`${gp.toInsert.length} tutor(es)`] : []), ...(gp.toFillPhone.length ? ['teléfono de tutor'] : [])];
    base.wouldRespect = sp.wouldRespect;

    const finalBirth = secState && secState.student.birthDate ? secState.student.birthDate : (sp.fill.birth_date ?? null);
    const finalAddr = secState && secState.student.address ? secState.student.address : (sp.fill.address ?? null);
    const guardiansPhoneAfter = [...(secState?.guardians || []).map(g => g.phone), ...gp.toInsert.map(g => g.phone), ...gp.toFillPhone.map(() => 'x')];
    const guardianCount = (secState?.guardians.length || 0) + gp.toInsert.length;
    base.pendingAfter = computePendingFields(finalBirth, finalAddr, guardianCount, guardiansPhoneAfter.some(p => !!p && String(p).trim() !== ''), gp.addedUnmatched);
    return base;
  }

  async preview() {
    const [mwStudents, secStudents] = await Promise.all([readActiveMwStudents(this.ds), readUnlinkedSecretariaStudents(this.ds)]);
    const results = classifyStudents(
      mwStudents.map(m => ({ mwStudentId: m.mwStudentId, firstName: m.firstName, lastName: m.lastName, birthDate: m.birthDate })),
      secStudents.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate })),
    );
    const byId = new Map(mwStudents.map(m => [m.mwStudentId, m]));
    const rows = await Promise.all(results.map(mr => this.buildRow(byId.get(mr.mwStudentId)!, mr)));
    const reliable = rows.filter(r => r.category === 'reliable');
    const dubious = rows.filter(r => r.category === 'dubious');
    const neu = rows.filter(r => r.category === 'new');
    return { reliable, dubious, new: neu, counts: { reliable: reliable.length, dubious: dubious.length, new: neu.length } };
  }
}
```

- [ ] **Step 2: Implementar `backfill.controller.ts` (solo `preview`)**

```ts
// backfill.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { BackfillService } from './backfill.service';

@Controller('secretaria/backfill')
@UseGuards(SecretariaAuthGuard)
export class BackfillController {
  constructor(private readonly svc: BackfillService) {}

  @Post('preview')
  @Roles('secretaria_admin', 'direccion')
  async preview() {
    return this.svc.preview();
  }
}
```

- [ ] **Step 3: Crear `backfill.module.ts` y registrar en `app.module.ts`**

```ts
// backfill.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { StaffRole } from '../../common/staff-role.entity';
import { BackfillController } from './backfill.controller';
import { BackfillService } from './backfill.service';

@Module({
  imports: [TypeOrmModule.forFeature([StaffRole]), JwtModule.register({})],
  controllers: [BackfillController],
  providers: [BackfillService],
})
export class BackfillModule {}
```

En `app.module.ts`: añadir el import `import { BackfillModule } from './modules/backfill/backfill.module';` junto a la línea de `InscriptionModule`, y añadir `BackfillModule` al array `imports` (junto a `InscriptionModule`).

- [ ] **Step 4: Compilar**

Run: `cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -8`
Expected: build exit 0.

⚠️ **Nota de ejecución**: `preview` escribe cero filas, pero **lee** las columnas `import_pending`/`import_pending_fields`? No — `preview` no las lee. La DDL solo hace falta para `apply` (Task 5) y se aplica en el despliegue. `preview` funciona sin la DDL.

- [ ] **Step 5: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/backfill/backfill.service.ts backend/src/modules/backfill/backfill.controller.ts backend/src/modules/backfill/backfill.module.ts backend/src/app.module.ts
$G commit -m "feat(backfill): endpoint POST /backfill/preview (dry-run) + módulo registrado"
$G push origin main
```

---

### Task 5: Servicio `apply` + endpoint (escritura transaccional)

**Files:**
- Modify: `/opt/mw-secretaria/backend/src/modules/backfill/backfill.service.ts` (añadir `apply`)
- Modify: `/opt/mw-secretaria/backend/src/modules/backfill/backfill.controller.ts` (añadir `POST /apply`)

**Interfaces:**
- Consumes: los planes de T2, la lectura de T3, `secStateFor` (T4, extraer a método reutilizable ya existe).
- Produces:
  - `interface Decision { mwStudentId: string; action: 'link'|'create'|'skip'; targetSecretariaId?: string }`
  - `BackfillService.apply(decisions: Decision[]): Promise<{ linked: number; created: number; pending: number; errors: {mwStudentId:string; message:string}[] }>`
  - endpoint `POST /api/secretaria/backfill/apply`

**Diseño de seguridad:** `apply` **re-lee** el alumno MW Panel por `mwStudentId` desde la fuente (no confía en payload del cliente para los datos; el cliente solo envía la decisión). Cada decisión corre en su propia transacción; un fallo revierte esa fila y se acumula en `errors`.

- [ ] **Step 1: Añadir `apply` a `backfill.service.ts`**

Añadir al principio el import de `BadRequestException`:
```ts
import { Injectable, BadRequestException } from '@nestjs/common';
```
Añadir dentro de la clase:
```ts
export interface Decision { mwStudentId: string; action: 'link' | 'create' | 'skip'; targetSecretariaId?: string }

// ... dentro de la clase BackfillService:
async apply(decisions: Decision[]): Promise<{ linked: number; created: number; pending: number; errors: {mwStudentId:string; message:string}[] }> {
  if (!Array.isArray(decisions)) throw new BadRequestException('decisions debe ser un array');
  const mwStudents = await readActiveMwStudents(this.ds);
  const byId = new Map(mwStudents.map(m => [m.mwStudentId, m]));
  let linked = 0, created = 0, pending = 0;
  const errors: {mwStudentId:string; message:string}[] = [];

  for (const d of decisions) {
    if (d.action === 'skip') continue;
    const mw = byId.get(d.mwStudentId);
    if (!mw) { errors.push({ mwStudentId: d.mwStudentId, message: 'Alumno MW Panel no encontrado o inactivo' }); continue; }
    try {
      const res = await this.ds.transaction(async (m) => {
        if (d.action === 'link') {
          if (!d.targetSecretariaId) throw new Error('Falta targetSecretariaId para vincular');
          return this.applyLink(m, mw, d.targetSecretariaId);
        }
        return this.applyCreate(m, mw);
      });
      if (res.created) created++; else linked++;
      if (res.pending) pending++;
    } catch (e: any) {
      errors.push({ mwStudentId: d.mwStudentId, message: e?.message || 'Error al aplicar' });
    }
  }
  return { linked, created, pending, errors };
}

private async applyLink(m: any, mw: MwStudentSrc, targetId: string): Promise<{ created: boolean; pending: boolean }> {
  const secState = await this.secStateForTx(m, targetId);
  const sp = buildStudentFillPlan(mw, secState.student);
  // 1) rellenar campos de alumno solo-si-vacío + fijar enlace
  await m.query(
    `UPDATE secretaria.students SET
       birth_date = COALESCE(birth_date, $2::date),
       address    = COALESCE(NULLIF(address,''), $3),
       notes      = COALESCE($4, notes),
       mwpanel_student_id = $5
     WHERE id = $1`,
    [targetId, sp.fill.birth_date ?? null, sp.fill.address ?? null, sp.fill.notes ?? null, mw.mwStudentId],
  );
  // 2) tutores: rellenar huecos + insertar no casados
  const familyId = (await m.query(`SELECT family_id FROM secretaria.students WHERE id=$1`, [targetId]))[0]?.family_id;
  const gp = planGuardians(mw.guardians, secState.guardians);
  if (familyId) {
    for (const f of gp.toFillPhone) await m.query(`UPDATE secretaria.guardians SET phone=$2 WHERE id=$1 AND NULLIF(phone,'') IS NULL`, [f.id, f.phone]);
    for (const f of gp.toFillEmail) await m.query(`UPDATE secretaria.guardians SET email=$2 WHERE id=$1 AND NULLIF(email,'') IS NULL`, [f.id, f.email]);
    for (const g of gp.toInsert) await m.query(
      `INSERT INTO secretaria.guardians(family_id, full_name, relationship, phone, email, is_primary_contact)
       VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6)`,
      [familyId, g.fullName, g.relationship, g.phone, g.email, g.isPrimary]);
  }
  // 3) recomputar estado final para pendientes
  const pend = await this.markPending(m, targetId, familyId, gp.addedUnmatched);
  return { created: false, pending: pend };
}

private async applyCreate(m: any, mw: MwStudentSrc): Promise<{ created: boolean; pending: boolean }> {
  // familia
  const familyId = (await m.query(
    `INSERT INTO secretaria.families(display_name, mwpanel_family_id) VALUES ($1, NULL) RETURNING id`,
    [mw.lastName || 'Familia'],
  ))[0].id;
  const gp = planGuardians(mw.guardians, null);
  for (const g of gp.toInsert) await m.query(
    `INSERT INTO secretaria.guardians(family_id, full_name, relationship, phone, email, is_primary_contact)
     VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6)`,
    [familyId, g.fullName, g.relationship, g.phone, g.email, g.isPrimary]);
  const sp = buildStudentFillPlan(mw, null);
  const studentId = (await m.query(
    `INSERT INTO secretaria.students(family_id, first_name, last_name, birth_date, address, notes, is_active, mwpanel_student_id)
     VALUES ($1,$2,$3,$4::date,$5,$6,true,$7) RETURNING id`,
    [familyId, mw.firstName, mw.lastName, sp.fill.birth_date ?? null, sp.fill.address ?? null, sp.fill.notes ?? null, mw.mwStudentId],
  ))[0].id;
  const pend = await this.markPending(m, studentId, familyId, false);
  return { created: true, pending: pend };
}

private async secStateForTx(m: any, studentId: string): Promise<{ student: SecStudentState; guardians: SecGuardianState[] }> {
  const s = (await m.query(
    `SELECT to_char(birth_date,'YYYY-MM-DD') AS "birthDate", NULLIF(address,'') AS address, notes, family_id
     FROM secretaria.students WHERE id=$1`, [studentId]))[0];
  const guardians = s?.family_id ? await m.query(
    `SELECT id, full_name AS "fullName", NULLIF(phone,'') AS phone, email FROM secretaria.guardians WHERE family_id=$1`, [s.family_id]) : [];
  return { student: { birthDate: s?.birthDate ?? null, address: s?.address ?? null, notes: s?.notes ?? null }, guardians };
}

private async markPending(m: any, studentId: string, familyId: string | null, addedUnmatched: boolean): Promise<boolean> {
  const s = (await m.query(`SELECT to_char(birth_date,'YYYY-MM-DD') AS b, NULLIF(address,'') AS a FROM secretaria.students WHERE id=$1`, [studentId]))[0];
  const g = familyId ? await m.query(`SELECT count(*)::int AS n, count(NULLIF(phone,''))::int AS withphone FROM secretaria.guardians WHERE family_id=$1`, [familyId]) : [{ n: 0, withphone: 0 }];
  const fields = computePendingFields(s?.b ?? null, s?.a ?? null, g[0].n, g[0].withphone > 0, addedUnmatched);
  await m.query(`UPDATE secretaria.students SET import_pending=$2, import_pending_fields=$3 WHERE id=$1`,
    [studentId, fields.length > 0, fields.length ? fields.join('; ') : null]);
  return fields.length > 0;
}
```

- [ ] **Step 2: Añadir `POST /apply` al controller**

Añadir `Body` y `BadRequestException` al import de `@nestjs/common`, e importar `Decision`:
```ts
import { Controller, Post, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { BackfillService, Decision } from './backfill.service';
```
Añadir el método:
```ts
@Post('apply')
@Roles('secretaria_admin', 'direccion')
async apply(@Body() body: { decisions: Decision[] }) {
  if (!body?.decisions) throw new BadRequestException('Falta decisions');
  return this.svc.apply(body.decisions);
}
```

- [ ] **Step 3: Compilar**

Run: `cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -8`
Expected: build exit 0.

- [ ] **Step 4: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add backend/src/modules/backfill/backfill.service.ts backend/src/modules/backfill/backfill.controller.ts
$G commit -m "feat(backfill): endpoint POST /backfill/apply (link/create transaccional por fila)"
$G push origin main
```

---

### Task 6: Frontend — pantalla de reconciliación

**Files:**
- Modify: `/opt/mw-secretaria/frontend/src/App.tsx` (componente `BackfillMwPanel` + pestaña admin en `Configuracion`)

**Interfaces:**
- Consumes: `POST /backfill/preview`, `POST /backfill/apply` vía `api` (`./api`).
- Produces: pestaña `backfill-mwpanel` en `Configuracion`.

**Patrón de referencia:** `InscripcionPdf` (~App.tsx:4450) y su registro como pestaña admin dentro de `Configuracion` (buscar `key: 'inscripcion-pdf'` en el array de tabs bajo `if (isAdmin)`).

- [ ] **Step 1: Añadir el componente `BackfillMwPanel` (junto a `InscripcionPdf`)**

```tsx
function BackfillMwPanel() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});   // reliable+new: aplicar sí/no
  const [dubChoice, setDubChoice] = React.useState<Record<string, string>>({}); // mwStudentId → targetId | 'create' | 'skip'

  const analyze = async () => {
    setLoading(true);
    try {
      const r = await api.post('/backfill/preview', {});
      setData(r.data);
      const c: Record<string, boolean> = {};
      [...r.data.reliable, ...r.data.new].forEach((row: any) => { c[row.mwStudentId] = true; });
      setChecked(c);
    } catch (e: any) { message.error(e?.response?.data?.message || 'No se pudo analizar'); }
    finally { setLoading(false); }
  };

  const apply = async () => {
    if (!data) return;
    const decisions: any[] = [];
    data.reliable.forEach((r: any) => { if (checked[r.mwStudentId]) decisions.push({ mwStudentId: r.mwStudentId, action: 'link', targetSecretariaId: r.targetSecretariaId }); });
    data.new.forEach((r: any) => { if (checked[r.mwStudentId]) decisions.push({ mwStudentId: r.mwStudentId, action: 'create' }); });
    data.dubious.forEach((r: any) => {
      const ch = dubChoice[r.mwStudentId];
      if (!ch || ch === 'skip') return;
      if (ch === 'create') decisions.push({ mwStudentId: r.mwStudentId, action: 'create' });
      else decisions.push({ mwStudentId: r.mwStudentId, action: 'link', targetSecretariaId: ch });
    });
    if (!decisions.length) { message.warning('No hay nada marcado para aplicar'); return; }
    setLoading(true);
    try {
      const r = await api.post('/backfill/apply', { decisions });
      message.success(`${r.data.linked} vinculados, ${r.data.created} creados, ${r.data.pending} pendientes`);
      if (r.data.errors?.length) message.warning(`${r.data.errors.length} con error`);
      await analyze();
    } catch (e: any) { message.error(e?.response?.data?.message || 'No se pudo aplicar'); }
    finally { setLoading(false); }
  };

  const rowLabel = (r: any) => `${r.firstName} ${r.lastName}`;

  return (
    <div>
      <Alert type="info" showIcon style={{ marginBottom: 12 }}
        message="Reconciliación con MW Panel: vincula alumnos ya existentes y crea los que falten, rellenando solo datos ausentes (Secretaría prevalece). Solo alumnos activos." />
      <Button type="primary" loading={loading} onClick={analyze}>Analizar MW Panel</Button>
      {data && (
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 12 }}>
            <Tag color="green">Fiables: {data.counts.reliable}</Tag>
            <Tag color="orange">Dudosas: {data.counts.dubious}</Tag>
            <Tag color="blue">Nuevas: {data.counts.new}</Tag>
          </Space>
          <Divider orientation="left">🟢 Fiables (vincular + rellenar huecos)</Divider>
          {data.reliable.map((r: any) => (
            <div key={r.mwStudentId} style={{ marginBottom: 6 }}>
              <Checkbox checked={!!checked[r.mwStudentId]} onChange={e => setChecked(s => ({ ...s, [r.mwStudentId]: e.target.checked }))}>
                {rowLabel(r)} {r.birthDateMismatch && <Tag color="red">⚠ fecha difiere</Tag>}
                {r.wouldFill.length > 0 && <span style={{ color: '#888' }}> · rellena: {r.wouldFill.join(', ')}</span>}
                {r.pendingAfter.length > 0 && <Tag color="gold">pendiente: {r.pendingAfter.join('; ')}</Tag>}
              </Checkbox>
            </div>
          ))}
          <Divider orientation="left">🟡 Dudosas (decide)</Divider>
          {data.dubious.map((r: any) => (
            <div key={r.mwStudentId} style={{ marginBottom: 6 }}>
              <span>{rowLabel(r)}: </span>
              <Radio.Group value={dubChoice[r.mwStudentId]} onChange={e => setDubChoice(s => ({ ...s, [r.mwStudentId]: e.target.value }))}>
                {(r.candidates || []).map((c: any) => <Radio key={c.secretariaId} value={c.secretariaId}>vincular a …{String(c.secretariaId).slice(0, 8)}{c.birthDateMismatch && ' ⚠'}</Radio>)}
                <Radio value="create">crear nuevo</Radio>
                <Radio value="skip">saltar</Radio>
              </Radio.Group>
            </div>
          ))}
          <Divider orientation="left">🔵 Nuevas (crear ficha + familia + tutores)</Divider>
          {data.new.map((r: any) => (
            <div key={r.mwStudentId} style={{ marginBottom: 6 }}>
              <Checkbox checked={!!checked[r.mwStudentId]} onChange={e => setChecked(s => ({ ...s, [r.mwStudentId]: e.target.checked }))}>
                {rowLabel(r)}
                {r.pendingAfter.length > 0 && <Tag color="gold">pendiente: {r.pendingAfter.join('; ')}</Tag>}
              </Checkbox>
            </div>
          ))}
          <Popconfirm title="¿Aplicar los cambios marcados?" onConfirm={apply}>
            <Button type="primary" loading={loading} style={{ marginTop: 12 }}>Aplicar seleccionados</Button>
          </Popconfirm>
        </div>
      )}
    </div>
  );
}
```
(Componentes antd: `Alert, Button, Space, Tag, Divider, Checkbox, Radio, Popconfirm, message`. Verificar el import de `'antd'` al principio de App.tsx; si `Tag`, `Checkbox` o `Radio` no estuvieran, añadirlos.)

- [ ] **Step 2: Registrar la pestaña en `Configuracion`**

Localizar el array de tabs admin (donde está `{ key: 'inscripcion-pdf', label: 'Importar inscripción PDF', children: <InscripcionPdf /> }` dentro de `if (isAdmin)`). Añadir justo después:
```tsx
tabs.push({ key: 'backfill-mwpanel', label: 'Reconciliar MW Panel', children: <BackfillMwPanel /> });
```
(usar la misma forma que ya use el fichero para añadir el tab de `inscripcion-pdf` — si usa `tabs.push({...})`, replicar; si usa un literal de array, añadir el objeto).

- [ ] **Step 3: Build del frontend**

Run: `cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -8`
Expected: build exit 0 (solo warning de chunk size).

- [ ] **Step 4: Commit**

```bash
G="git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria"
$G add frontend/src/App.tsx
$G commit -m "feat(backfill): pantalla admin de reconciliación MW Panel → Secretaría"
$G push origin main
```

---

## Despliegue + E2E con datos reales (GATED — lo hace el controlador tras la revisión final)

1. **DDL idempotente (antes de reconstruir el backend):**
```bash
docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel -c "
ALTER TABLE secretaria.students ADD COLUMN IF NOT EXISTS import_pending boolean NOT NULL DEFAULT false;
ALTER TABLE secretaria.students ADD COLUMN IF NOT EXISTS import_pending_fields text;"
```
2. **Backup:** `docker exec mw-panel-db-prod pg_dump -U mwpanel -n secretaria mwpanel | gzip > /opt/mw-secretaria/backups/pre-backfill1b-$(date +%Y%m%d_%H%M%S).sql.gz`.
3. **Deploy frontend:** `cd /opt/mw-secretaria/frontend && npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/`.
4. **Rebuild + recrear API** (replicar config viva: red `mw-panel_mw-network`, `127.0.0.1:3010`, `--env-file /opt/mw-secretaria/backend/.env`, mount `/opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db`, `--restart unless-stopped`).
5. **Verificar:** `secretaria` 200, `mocks` 200 (INTACTO); rutas `backfill/preview` y `backfill/apply` mapeadas en logs; `preview` sin auth = 401.
6. **E2E (datos reales — NO volcar PII a logs/artefactos):** token admin firmado dentro del contenedor con `JWT_SECRET` (userId con `staff_role` `secretaria_admin`). `POST /backfill/preview` → validar SOLO contadores y estructura redactada (esperado: mayoría **reliable/link** porque las fichas de Escuela Alternativa ya existen; algunas dudosas por homónimos; pocas nuevas). Si los contadores tienen sentido → `apply` sobre un **subconjunto pequeño** de fiables primero, verificar en BD (redactado) el enlace `mwpanel_student_id`, el solo-si-vacío (que NO se pisó nada existente) y `import_pending_fields`. Confirmar con Diego antes del `apply` masivo.

## Notas de ejecución

- **Riesgo concentrado en Task 5** (escritura transaccional + solo-si-vacío por SQL): el build + el E2E lo validan. El `COALESCE(...)` en los `UPDATE` garantiza "Secretaría prevalece" a nivel SQL además del plan.
- **Idempotencia comprobable**: re-ejecutar `preview` tras un `apply` parcial debe mostrar menos fiables (los ya vinculados salen del pool por `mwpanel_student_id IS NOT NULL`).
- **Contrato SP-7**: el módulo solo hace `SELECT` sobre `public.*`. No hay `INSERT/UPDATE/DELETE` a `public.*` en ningún punto — verificable con un grep del módulo.
