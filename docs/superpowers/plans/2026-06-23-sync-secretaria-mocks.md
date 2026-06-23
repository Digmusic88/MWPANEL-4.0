# Plan A — Sincronización Secretaría → Mocks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Secretaría (fuente de verdad) sincronice automáticamente sus grupos Cambridge y sus alumnos a Mocks (crear año/grupos, altas, bajas, cambios de grupo, renombrados) sin intervención manual, mediante un reconciliador idempotente declarativo.

**Architecture:** Mocks expone un único endpoint `POST /api/sync/reconcile` (auth por API key) que recibe el "estado deseado" del curso activo y aplica el diff en una transacción Prisma. Secretaría calcula ese estado desde su BD y llama al endpoint desde tres disparadores que comparten el mismo `reconcile()`: un `pg LISTEN` con debounce (~5s), un cron diario (03:00) y un botón de admin. El dedupe es determinista por `externalId` en `Group`/`User` de Mocks.

**Tech Stack:** Mocks = Next.js 15 App Router + Prisma 6 + SQLite + Vitest. Secretaría = NestJS 10 + TypeORM 0.3 (raw `ds.query`) + Postgres schema `secretaria` + `node:test`. HTTP con `fetch` nativo (Node 20). Sin dependencias nuevas.

## Global Constraints

- **Mocks es solo-lectura para Secretaría salvo este endpoint.** Mocks sigue siendo el único escritor de su SQLite. Secretaría NO escribe el fichero.
- **Regla de baja (servidor Mocks):** quitar de grupo borra SOLO la fila `GroupUser`. NUNCA borrar `User` ni `StudentResult`. Verbatim del spec, secciones 5-6.
- **Mocks solo gestiona grupos/membresías con `Group.externalId != NULL`.** Los grupos creados a mano en Mocks no se tocan.
- **No borrar grupos en Mocks** aunque desaparezcan de Secretaría (pueden tener convocatorias/resultados): se registran como incidencia, no se eliminan.
- **Niveles Cambridge sincronizables:** `mock_exam_type ∈ {A2_KEY, B1_PET, B2_FIRST, C1_CAE, C2_CPE}`. `NULL` = no sincroniza. Detección por campo estructurado, NO por nombre.
- **Migraciones Secretaría:** ficheros `/opt/mw-secretaria/migrations/NNN_*.sql` idempotentes (`IF NOT EXISTS`/`CREATE OR REPLACE`), aplicados a mano: `cat fichero | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel`. Backup antes.
- **Esquema Mocks:** se aplica con `npm run db:push` (NO migrate). Backup obligatorio antes.
- **Commit + push** al repo propio de Secretaría en cada cambio: `git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria <cmd>`, remoto `origin` (URL usa alias SSH `github-secretaria`). El código de Mocks vive en `/opt/cambridge-mocks-prod` (no es ese repo; commitea allí con su propio git si está versionado).
- **API key:** header `x-sync-key` comparado con `process.env.SYNC_API_KEY` en Mocks; el mismo valor en `MOCKS_SYNC_KEY` en Secretaría. `MOCKS_SYNC_URL` = `http://cambridge-mocks-app:3001` (ambos contenedores en la red `mw-panel_mw-network`).

---

## PARTE 1 — MOCKS (endpoint + esquema)

### Task 1: Columnas `externalId` en el esquema de Mocks

**Files:**
- Modify: `/opt/cambridge-mocks-prod/prisma/schema.prisma` (model `User` ~línea 34, model `Group` ~línea 62)

**Interfaces:**
- Produces: `User.externalId: String? @unique`, `Group.externalId: String? @unique` — usados por la lógica de reconcile (Task 4).

- [ ] **Step 1: Backup de la BD de Mocks**

Run:
```bash
docker exec cambridge-mocks-app sh -c 'cp /app/data/database.db /app/backups/pre-externalid-$(date +%Y%m%d_%H%M%S).db' \
  || cp /opt/mw-panel/cambridge-mocks-data/data/database.db /opt/mw-panel/cambridge-mocks-data/backups/pre-externalid-manual.db
ls -la /opt/mw-panel/cambridge-mocks-data/backups/ | tail -3
```
Expected: aparece un fichero `pre-externalid-*.db`.

- [ ] **Step 2: Añadir `externalId` a `model User`**

En `prisma/schema.prisma`, dentro de `model User { ... }`, justo tras `fullName String`, añadir:
```prisma
  externalId  String?  @unique   // UUID del alumno en Secretaría (dedupe sync)
```

- [ ] **Step 3: Añadir `externalId` a `model Group`**

Dentro de `model Group { ... }`, justo tras `name String`, añadir:
```prisma
  externalId  String?  @unique   // UUID del grupo en Secretaría (dedupe + rename)
```

- [ ] **Step 4: Aplicar el esquema y regenerar el cliente**

Run (en el host, en `/opt/cambridge-mocks-prod`):
```bash
cd /opt/cambridge-mocks-prod && npm run db:push && npm run db:generate
```
Expected: `db push` termina con "Your database is now in sync with your Prisma schema." sin pérdida de datos (columnas nullable nuevas).

- [ ] **Step 5: Verificar columnas en SQLite**

Run:
```bash
docker exec cambridge-mocks-app sh -c 'sqlite3 /app/data/database.db ".schema User" | grep -i externalId; sqlite3 /app/data/database.db ".schema Group" | grep -i externalId' \
  || node -e "const{PrismaClient}=require('/opt/cambridge-mocks-prod/node_modules/@prisma/client');new PrismaClient().\$queryRawUnsafe('PRAGMA table_info(\"User\")').then(r=>console.log(r.map(c=>c.name)))"
```
Expected: aparece `externalId` en ambas tablas.

- [ ] **Step 6: Commit (si Mocks está versionado)**

```bash
cd /opt/cambridge-mocks-prod && git add prisma/schema.prisma && git commit -m "feat(sync): externalId en User y Group para dedupe de sincronización" || echo "repo no versionado, omitir"
```

---

### Task 2: Helpers puros de sync en Mocks (`normalizeName`, `diffMembership`)

**Files:**
- Create: `/opt/cambridge-mocks-prod/src/lib/sync/helpers.ts`
- Test: `/opt/cambridge-mocks-prod/src/lib/sync/helpers.test.ts`

**Interfaces:**
- Produces:
  - `normalizeName(s: string): string` — minúsculas, sin acentos, espacios colapsados, trim.
  - `diffMembership(desired: number[], current: number[]): { toAdd: number[]; toRemove: number[] }`.
  - Ambos los consume el route handler (Task 4).

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/sync/helpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { normalizeName, diffMembership } from './helpers'

describe('normalizeName', () => {
  it('quita acentos, baja a minúsculas y colapsa espacios', () => {
    expect(normalizeName('  José   MARÍA  Ñoño ')).toBe('jose maria ñoño')
  })
  it('es estable para el mismo nombre con distinta capitalización/espacios', () => {
    expect(normalizeName('Ana López')).toBe(normalizeName('ana  lopez'.replace('lopez', 'lópez')))
  })
})

describe('diffMembership', () => {
  it('calcula altas y bajas', () => {
    expect(diffMembership([1, 2, 3], [2, 3, 4])).toEqual({ toAdd: [1], toRemove: [4] })
  })
  it('sin cambios → vacíos', () => {
    expect(diffMembership([5, 6], [6, 5])).toEqual({ toAdd: [], toRemove: [] })
  })
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd /opt/cambridge-mocks-prod && npx vitest run src/lib/sync/helpers.test.ts`
Expected: FAIL — `Cannot find module './helpers'`.

- [ ] **Step 3: Implementar los helpers**

Crear `src/lib/sync/helpers.ts`:
```ts
/** Normaliza un nombre para matching: minúsculas, sin acentos, espacios colapsados. */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Diff de pertenencia: qué ids añadir y cuáles quitar para pasar de `current` a `desired`. */
export function diffMembership(
  desired: number[],
  current: number[],
): { toAdd: number[]; toRemove: number[] } {
  const desiredSet = new Set(desired)
  const currentSet = new Set(current)
  return {
    toAdd: desired.filter((id) => !currentSet.has(id)),
    toRemove: current.filter((id) => !desiredSet.has(id)),
  }
}
```
Nota: la regex `̀-ͯ` no afecta a `ñ` (que en NFD es `n` + tilde combinante… cuidado). Para preservar `ñ` como en el test, NO normalizamos la eñe: `ñ` en NFD se descompone en `n`+U+0303. Para mantener el test correcto, ajustar: tras `normalize('NFD')`, recomponer ñ. Implementación definitiva que pasa el test:
```ts
export function normalizeName(s: string): string {
  return s
    .normalize('NFC')           // mantiene ñ compuesta
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u')
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd /opt/cambridge-mocks-prod && npx vitest run src/lib/sync/helpers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /opt/cambridge-mocks-prod && git add src/lib/sync/helpers.ts src/lib/sync/helpers.test.ts && git commit -m "feat(sync): helpers normalizeName y diffMembership con tests" || echo "omitir si no versionado"
```

---

### Task 3: Util `ensureUniqueUsername` (colisiones de username al crear alumnos)

**Files:**
- Modify: `/opt/cambridge-mocks-prod/src/lib/sync/helpers.ts`
- Test: `/opt/cambridge-mocks-prod/src/lib/sync/helpers.test.ts`

**Interfaces:**
- Produces: `baseUsername(fullName: string): string` (lowercase + sin acentos + puntos, máx 20, igual que el `generateUsername` existente) — la unicidad real se resuelve en el route con un bucle contra la BD usando este base.

- [ ] **Step 1: Añadir test**

Añadir a `helpers.test.ts`:
```ts
import { baseUsername } from './helpers'

describe('baseUsername', () => {
  it('genera username estilo Mocks (sin acentos, puntos, máx 20)', () => {
    expect(baseUsername('José María Ñoño García')).toBe('jose.maria.nono.garc')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `cd /opt/cambridge-mocks-prod && npx vitest run src/lib/sync/helpers.test.ts`
Expected: FAIL — `baseUsername` no existe.

- [ ] **Step 3: Implementar (replica del `generateUsername` de bulk-upload)**

Añadir a `helpers.ts`:
```ts
/** Username base estilo Mocks (replica generateUsername de bulk-upload/route.ts). */
export function baseUsername(fullName: string): string {
  return fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
    .substring(0, 20)
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/cambridge-mocks-prod && npx vitest run src/lib/sync/helpers.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /opt/cambridge-mocks-prod && git add -A && git commit -m "feat(sync): baseUsername para creación de alumnos en reconcile" || echo "omitir"
```

---

### Task 4: Endpoint `POST /api/sync/reconcile` en Mocks

**Files:**
- Create: `/opt/cambridge-mocks-prod/src/app/api/sync/reconcile/route.ts`

**Interfaces:**
- Consumes: `normalizeName`, `diffMembership`, `baseUsername` (Task 2-3); columnas `externalId` (Task 1); `generatePassword` (replicado inline).
- Produces: contrato HTTP que consume `MocksApiClient` (Task 8):
  - Request body: `{ academicYear: string, groups: Array<{ externalId: string, name: string, examType: string, students: Array<{ externalId: string, fullName: string }> }> }`
  - Header: `x-sync-key`
  - Response 200: `{ academicYearId: number, groups: Array<{ externalId: string, mockGroupId: number }>, students: Array<{ externalId: string, mockUserId: number }>, created: number, renamed: number, enrolled: number, unenrolled: number, adopted: number, incidencias: string[] }`
  - Errores: 401 `{ error }` (api key), 400 `{ error }` (body), 500 `{ error }`.

- [ ] **Step 1: Crear el route handler**

Crear `src/app/api/sync/reconcile/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { normalizeName, diffMembership, baseUsername } from '@/lib/sync/helpers'

const prisma = new PrismaClient()

function generatePassword(length = 8): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let r = ''
  for (let i = 0; i < length; i++) r += charset.charAt(Math.floor(Math.random() * charset.length))
  return r
}

type IncomingStudent = { externalId: string; fullName: string }
type IncomingGroup = { externalId: string; name: string; examType: string; students: IncomingStudent[] }
type Body = { academicYear: string; groups: IncomingGroup[] }

export async function POST(request: NextRequest) {
  // 1. Auth por API key
  const key = request.headers.get('x-sync-key')
  if (!process.env.SYNC_API_KEY || key !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parseo + validación mínima
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body?.academicYear || !Array.isArray(body.groups)) {
    return NextResponse.json({ error: 'academicYear y groups son obligatorios' }, { status: 400 })
  }

  const incidencias: string[] = []
  let created = 0, renamed = 0, enrolled = 0, unenrolled = 0, adopted = 0

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Asegurar AcademicYear por name
      let year = await tx.academicYear.findUnique({ where: { name: body.academicYear } })
      if (!year) {
        year = await tx.academicYear.create({ data: { name: body.academicYear, isActive: false } })
      }
      const yearId = year.id

      // 3b. Resolver todos los alumnos (dedupe por externalId entre grupos)
      const allStudents = new Map<string, IncomingStudent>()
      for (const g of body.groups) for (const s of g.students || []) allStudents.set(s.externalId, s)

      const studentIdMap = new Map<string, number>() // externalId -> mockUserId
      const studentReport: Array<{ externalId: string; mockUserId: number }> = []

      for (const s of allStudents.values()) {
        // match por externalId
        let user = await tx.user.findUnique({ where: { externalId: s.externalId } })
        if (!user) {
          // adopción por nombre normalizado entre STUDENT sin externalId
          const candidates = await tx.user.findMany({
            where: { role: 'STUDENT', externalId: null },
            select: { id: true, fullName: true },
          })
          const match = candidates.find((c) => normalizeName(c.fullName) === normalizeName(s.fullName))
          if (match) {
            user = await tx.user.update({
              where: { id: match.id },
              data: { externalId: s.externalId, academicYearId: yearId },
            })
            adopted++
          }
        }
        if (!user) {
          // crear nuevo alumno
          let username = baseUsername(s.fullName)
          let suffix = 0
          while (await tx.user.findUnique({ where: { username } })) {
            suffix++
            username = `${baseUsername(s.fullName).substring(0, 17)}.${suffix}`
          }
          const plain = generatePassword()
          user = await tx.user.create({
            data: {
              fullName: s.fullName,
              username,
              password: await bcrypt.hash(plain, 10),
              pdfPassword: plain,
              role: 'STUDENT',
              academicYearId: yearId,
              externalId: s.externalId,
            },
          })
          created++
        } else if (user.academicYearId !== yearId) {
          // mantener al alumno en el curso activo (necesario para poder matricularlo)
          user = await tx.user.update({ where: { id: user.id }, data: { academicYearId: yearId } })
        }
        studentIdMap.set(s.externalId, user.id)
        studentReport.push({ externalId: s.externalId, mockUserId: user.id })
      }

      // 3c. Grupos: crear/renombrar + ajustar membresía
      const groupReport: Array<{ externalId: string; mockGroupId: number }> = []
      const incomingGroupExtIds = new Set(body.groups.map((g) => g.externalId))

      for (const g of body.groups) {
        let group = await tx.group.findUnique({ where: { externalId: g.externalId } })
        if (!group) {
          group = await tx.group.create({
            data: { name: g.name, academicYearId: yearId, externalId: g.externalId },
          })
        } else if (group.name !== g.name) {
          group = await tx.group.update({ where: { id: group.id }, data: { name: g.name } })
          renamed++
        }
        groupReport.push({ externalId: g.externalId, mockGroupId: group.id })

        // membresía deseada vs actual
        const desired = (g.students || []).map((s) => studentIdMap.get(s.externalId)!).filter(Boolean)
        const currentRows = await tx.groupUser.findMany({ where: { groupId: group.id }, select: { userId: true } })
        const current = currentRows.map((r) => r.userId)
        const { toAdd, toRemove } = diffMembership(desired, current)
        if (toAdd.length) {
          await tx.groupUser.createMany({ data: toAdd.map((userId) => ({ groupId: group!.id, userId })) })
          enrolled += toAdd.length
        }
        if (toRemove.length) {
          // REGLA DE BAJA: solo GroupUser, nunca User ni StudentResult
          await tx.groupUser.deleteMany({ where: { groupId: group.id, userId: { in: toRemove } } })
          unenrolled += toRemove.length
        }
      }

      // 3d. Detectar (NO borrar) grupos huérfanos del año: externalId nuestro pero ya no en Secretaría
      const orphans = await tx.group.findMany({
        where: { academicYearId: yearId, externalId: { not: null } },
        select: { id: true, name: true, externalId: true },
      })
      for (const o of orphans) {
        if (o.externalId && !incomingGroupExtIds.has(o.externalId)) {
          incidencias.push(`Grupo huérfano en Mocks (id=${o.id}, "${o.name}") ya no existe en Secretaría; NO se borra.`)
        }
      }

      return { academicYearId: yearId, groups: groupReport, students: studentReport }
    }, { timeout: 30000 })

    return NextResponse.json({
      ...result, created, renamed, enrolled, unenrolled, adopted, incidencias,
    })
  } catch (e) {
    console.error('[sync/reconcile] error', e)
    return NextResponse.json({ error: 'Internal server error', detail: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Compilar (type-check) el proyecto**

Run: `cd /opt/cambridge-mocks-prod && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i 'sync/reconcile' || echo "sin errores de tipo en el route"`
Expected: sin errores referidos al nuevo fichero. (Si `tsc --noEmit` saca ruido preexistente del repo, basta con que no haya errores en `route.ts`.)

- [ ] **Step 3: Smoke test local del endpoint (rechazo sin api key)**

> Requiere el contenedor desplegado (Task 5). Si aún no, ejecutar tras Task 5.
Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/sync/reconcile \
  -H 'content-type: application/json' -d '{}'
```
Expected: `401`.

- [ ] **Step 4: Commit**

```bash
cd /opt/cambridge-mocks-prod && git add src/app/api/sync/reconcile/route.ts && git commit -m "feat(sync): endpoint POST /api/sync/reconcile (idempotente, api-key)" || echo "omitir"
```

---

### Task 5: Desplegar Mocks (esquema + endpoint) con parada del monitor

**Files:** ninguno (operativo).

**Interfaces:**
- Consumes: Tasks 1-4. Produces: contenedor `cambridge-mocks-app` sirviendo el endpoint con `SYNC_API_KEY`.

- [ ] **Step 1: Generar `SYNC_API_KEY` y registrarlo**

Run:
```bash
openssl rand -hex 24
```
Guardar el valor (lo usaremos también en Secretaría como `MOCKS_SYNC_KEY`). Añadirlo al `docker run` de Mocks como `-e SYNC_API_KEY=<valor>` y documentarlo en el `.env`/CLAUDE.md de Mocks.

- [ ] **Step 2: Parar el monitor 502 para evitar recreación con imagen vieja**

Run:
```bash
sudo systemctl stop cambridge-mocks-monitor 2>/dev/null; \
pkill -f 'monitor-502.sh' 2>/dev/null; \
systemctl is-active cambridge-mocks-monitor 2>/dev/null || echo "monitor parado"
```
Expected: el monitor no está activo.

- [ ] **Step 3: Build + recreación del contenedor**

Run:
```bash
cd /opt/cambridge-mocks-prod && npm run build
docker stop cambridge-mocks-app && docker rm cambridge-mocks-app
docker-compose build
docker run -d --name cambridge-mocks-app --restart unless-stopped \
  --shm-size=1g --memory=1g --read-only \
  --tmpfs /tmp:size=100M,mode=1777 \
  --tmpfs /app/.next/cache:size=500M,mode=1777 \
  --tmpfs /home/nextjs/.npm:size=50M,mode=1777 \
  --security-opt no-new-privileges:true \
  -e NODE_ENV=production \
  -e NEXTAUTH_URL=https://mocks.mundoworld.school \
  -e NEXTAUTH_SECRET=your-nextauth-secret-here \
  -e DATABASE_URL=file:/app/data/database.db \
  -e SYNC_API_KEY=<valor-del-step-1> \
  -v /opt/mw-panel/cambridge-mocks-data/data:/app/data \
  -v /opt/mw-panel/cambridge-mocks-data/backups:/app/backups \
  -v /opt/cambridge-mocks-prod/backup-system:/opt/cambridge-mocks-prod/backup-system \
  -v /opt/cambridge-mocks-prod/time-machine-backups:/app/time-machine-backups \
  --network mw-panel_mw-network -p 3001:3001 \
  cambridge-mocks-prod_cambridge-mocks
```
> ⚠️ Usa los valores REALES de `NEXTAUTH_SECRET` del despliegue actual (cópialos de `docker inspect cambridge-mocks-app` ANTES de borrarlo, o del `.env`/CLAUDE.md). No despliegues con el placeholder.

- [ ] **Step 4: Verificar salud y rechazo de api key**

Run:
```bash
sleep 4
curl -s -o /dev/null -w "home=%{http_code}\n" http://localhost:3001/
curl -s -o /dev/null -w "noauth=%{http_code}\n" -X POST http://localhost:3001/api/sync/reconcile -H 'content-type: application/json' -d '{}'
curl -s -o /dev/null -w "badkey=%{http_code}\n" -X POST http://localhost:3001/api/sync/reconcile -H 'content-type: application/json' -H 'x-sync-key: wrong' -d '{}'
```
Expected: `home=200`, `noauth=401`, `badkey=401`.

- [ ] **Step 5: Reactivar el monitor 502**

Run:
```bash
sudo systemctl start cambridge-mocks-monitor 2>/dev/null || echo "reactivar monitor según su mecanismo (revisar MONITOR-502.md)"
systemctl is-active cambridge-mocks-monitor 2>/dev/null
```

---

## PARTE 2 — SECRETARÍA (migración + módulo de sync)

### Task 6: Migración `035` (mock_exam_type, mock_group_id, mock_sync_log)

**Files:**
- Create: `/opt/mw-secretaria/migrations/035_mock_sync.sql`

**Interfaces:**
- Produces: columnas `secretaria.programs.mock_exam_type`, `secretaria.groups.mock_group_id`, tabla `secretaria.mock_sync_log` — consumidas por Tasks 9-11.

- [ ] **Step 1: Backup de la BD**

Run:
```bash
docker exec mw-panel-db-prod pg_dump -U mwpanel -n secretaria mwpanel | gzip > /opt/mw-secretaria/pre-035-$(date +%Y%m%d_%H%M%S).sql.gz
ls -la /opt/mw-secretaria/pre-035-*.sql.gz | tail -1
```
Expected: fichero de backup creado.

- [ ] **Step 2: Escribir la migración**

Crear `/opt/mw-secretaria/migrations/035_mock_sync.sql`:
```sql
-- 035_mock_sync.sql — Sincronización Secretaría → Mocks
-- Idempotente.

-- Nivel Cambridge estructurado en el programa (NULL = no sincroniza)
ALTER TABLE secretaria.programs ADD COLUMN IF NOT EXISTS mock_exam_type varchar;
ALTER TABLE secretaria.programs DROP CONSTRAINT IF EXISTS chk_mock_exam_type;
ALTER TABLE secretaria.programs ADD CONSTRAINT chk_mock_exam_type
  CHECK (mock_exam_type IS NULL OR mock_exam_type IN ('A2_KEY','B1_PET','B2_FIRST','C1_CAE','C2_CPE'));

-- Autorrelleno inicial por nombre (orden importa: específicos primero)
UPDATE secretaria.programs SET mock_exam_type = CASE
  WHEN name ILIKE '%CAE%' OR name ILIKE '%advanced%'              THEN 'C1_CAE'
  WHEN name ILIKE '%FCE%' OR name ILIKE '%first%'                 THEN 'B2_FIRST'
  WHEN name ILIKE '%PET%' OR name ILIKE '%prelim%'                THEN 'B1_PET'
  WHEN name ILIKE '%proficien%' OR name ILIKE '%CPE%'             THEN 'C2_CPE'
  WHEN name ILIKE '%KEY%' OR name ILIKE 'KET%' OR name ILIKE '% KET%' OR name ILIKE '%A2%' THEN 'A2_KEY'
  ELSE NULL END
WHERE mock_exam_type IS NULL;

-- Link del grupo de Secretaría con el grupo equivalente en Mocks
ALTER TABLE secretaria.groups ADD COLUMN IF NOT EXISTS mock_group_id integer;

-- Auditoría de cada reconciliación
CREATE TABLE IF NOT EXISTS secretaria.mock_sync_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at      timestamptz NOT NULL DEFAULT now(),
  trigger     varchar NOT NULL,                 -- 'change-feed' | 'cron' | 'manual'
  ok          boolean NOT NULL DEFAULT true,
  created     int NOT NULL DEFAULT 0,
  renamed     int NOT NULL DEFAULT 0,
  enrolled    int NOT NULL DEFAULT 0,
  unenrolled  int NOT NULL DEFAULT 0,
  adopted     int NOT NULL DEFAULT 0,
  incidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  error       text,
  duration_ms int
);
CREATE INDEX IF NOT EXISTS idx_mock_sync_log_ran_at ON secretaria.mock_sync_log (ran_at DESC);
```

- [ ] **Step 3: Aplicar la migración**

Run:
```bash
cat /opt/mw-secretaria/migrations/035_mock_sync.sql | docker exec -i mw-panel-db-prod psql -U mwpanel -d mwpanel
```
Expected: `ALTER TABLE`, `UPDATE n`, `CREATE TABLE`, `CREATE INDEX` sin errores.

- [ ] **Step 4: Verificar el autorrelleno**

Run:
```bash
docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c \
"SELECT name, mock_exam_type FROM secretaria.programs WHERE service_id=(SELECT id FROM secretaria.services WHERE code='INGLES') ORDER BY level_order;"
```
Expected: `KEY (A2)→A2_KEY`, `PET (B1)→B1_PET`, `FCE (B2)→B2_FIRST`, `CAE (C1)→C1_CAE`; `Starters/Movers/Flyers → vacío`. **Revisar a mano** y corregir cualquier programa real mal clasificado con un `UPDATE` puntual.

- [ ] **Step 5: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add migrations/035_mock_sync.sql
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(sync): migración 035 (mock_exam_type, mock_group_id, mock_sync_log)"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 7: Builder puro del estado deseado + unit test

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/mocks-sync/desired-state.ts`
- Test: `/opt/mw-secretaria/backend/src/modules/mocks-sync/desired-state.test.ts`

**Interfaces:**
- Produces:
  - `type DesiredGroup = { externalId: string; name: string; examType: string; students: { externalId: string; fullName: string }[] }`
  - `buildDesiredState(rows: GroupStudentRow[]): DesiredGroup[]` — agrupa filas planas (group × student) en el payload del reconcile. Lo consume `SyncService` (Task 9).
  - `type GroupStudentRow = { groupExternalId: string; groupName: string; examType: string; studentExternalId: string | null; firstName: string | null; lastName: string | null }`

- [ ] **Step 1: Escribir el test que falla**

Crear `desired-state.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDesiredState, GroupStudentRow } from './desired-state';

test('agrupa filas planas en grupos con sus alumnos', () => {
  const rows: GroupStudentRow[] = [
    { groupExternalId: 'g1', groupName: 'FCE (B2) A', examType: 'B2_FIRST', studentExternalId: 's1', firstName: 'Ana', lastName: 'López' },
    { groupExternalId: 'g1', groupName: 'FCE (B2) A', examType: 'B2_FIRST', studentExternalId: 's2', firstName: 'Beto', lastName: 'Ruiz' },
    { groupExternalId: 'g2', groupName: 'PET (B1) B', examType: 'B1_PET', studentExternalId: null, firstName: null, lastName: null },
  ];
  const out = buildDesiredState(rows);
  assert.equal(out.length, 2);
  const g1 = out.find((g) => g.externalId === 'g1')!;
  assert.equal(g1.name, 'FCE (B2) A');
  assert.equal(g1.examType, 'B2_FIRST');
  assert.deepEqual(g1.students.map((s) => s.fullName), ['Ana López', 'Beto Ruiz']);
  const g2 = out.find((g) => g.externalId === 'g2')!;
  assert.equal(g2.students.length, 0, 'grupo vacío sin alumnos');
});

test('no duplica alumnos repetidos en el mismo grupo', () => {
  const rows: GroupStudentRow[] = [
    { groupExternalId: 'g1', groupName: 'X', examType: 'A2_KEY', studentExternalId: 's1', firstName: 'A', lastName: 'B' },
    { groupExternalId: 'g1', groupName: 'X', examType: 'A2_KEY', studentExternalId: 's1', firstName: 'A', lastName: 'B' },
  ];
  assert.equal(buildDesiredState(rows)[0].students.length, 1);
});
```

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `cd /opt/mw-secretaria/backend && npm test 2>&1 | grep -A2 desired-state || true`
Expected: FAIL — no compila / módulo no existe.

- [ ] **Step 3: Implementar el builder**

Crear `desired-state.ts`:
```ts
export type GroupStudentRow = {
  groupExternalId: string;
  groupName: string;
  examType: string;
  studentExternalId: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type DesiredStudent = { externalId: string; fullName: string };
export type DesiredGroup = {
  externalId: string;
  name: string;
  examType: string;
  students: DesiredStudent[];
};

/** Agrupa filas planas (grupo × alumno) en el payload del reconcile. */
export function buildDesiredState(rows: GroupStudentRow[]): DesiredGroup[] {
  const groups = new Map<string, DesiredGroup>();
  const seen = new Map<string, Set<string>>(); // groupExtId -> studentExtIds
  for (const r of rows) {
    let g = groups.get(r.groupExternalId);
    if (!g) {
      g = { externalId: r.groupExternalId, name: r.groupName, examType: r.examType, students: [] };
      groups.set(r.groupExternalId, g);
      seen.set(r.groupExternalId, new Set());
    }
    if (r.studentExternalId) {
      const s = seen.get(r.groupExternalId)!;
      if (!s.has(r.studentExternalId)) {
        s.add(r.studentExternalId);
        const fullName = `${r.firstName ?? ''} ${r.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
        g.students.push({ externalId: r.studentExternalId, fullName });
      }
    }
  }
  return [...groups.values()];
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `cd /opt/mw-secretaria/backend && npm test 2>&1 | tail -15`
Expected: PASS (incluye los 2 tests nuevos).

- [ ] **Step 5: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/mocks-sync/desired-state.ts backend/src/modules/mocks-sync/desired-state.test.ts
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(sync): buildDesiredState con tests"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 8: `MocksApiClient` (cliente HTTP a `/api/sync/reconcile`)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/mocks-sync/mocks-api.client.ts`

**Interfaces:**
- Consumes: contrato HTTP de Task 4; env `MOCKS_SYNC_URL`, `MOCKS_SYNC_KEY`.
- Produces:
  - `type ReconcileReport = { academicYearId: number; groups: { externalId: string; mockGroupId: number }[]; students: { externalId: string; mockUserId: number }[]; created: number; renamed: number; enrolled: number; unenrolled: number; adopted: number; incidencias: string[] }`
  - `class MocksApiClient { reconcile(payload: { academicYear: string; groups: DesiredGroup[] }): Promise<ReconcileReport> }` — consumido por `SyncService` (Task 9).

- [ ] **Step 1: Implementar el cliente (fetch nativo)**

Crear `mocks-api.client.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { DesiredGroup } from './desired-state';

export type ReconcileReport = {
  academicYearId: number;
  groups: { externalId: string; mockGroupId: number }[];
  students: { externalId: string; mockUserId: number }[];
  created: number;
  renamed: number;
  enrolled: number;
  unenrolled: number;
  adopted: number;
  incidencias: string[];
};

@Injectable()
export class MocksApiClient {
  private readonly url = process.env.MOCKS_SYNC_URL || 'http://cambridge-mocks-app:3001';
  private readonly key = process.env.MOCKS_SYNC_KEY || '';

  async reconcile(payload: { academicYear: string; groups: DesiredGroup[] }): Promise<ReconcileReport> {
    const res = await fetch(`${this.url}/api/sync/reconcile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sync-key': this.key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Mocks reconcile HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return JSON.parse(text) as ReconcileReport;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit 2>&1 | grep mocks-api || echo "ok"`
Expected: sin errores en `mocks-api.client.ts`.

- [ ] **Step 3: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/mocks-sync/mocks-api.client.ts
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(sync): MocksApiClient (fetch nativo a /api/sync/reconcile)"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 9: `SyncService.reconcile()` (estado deseado → Mocks → persistir ids → log)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/mocks-sync/sync.service.ts`

**Interfaces:**
- Consumes: `buildDesiredState`/`GroupStudentRow` (Task 7), `MocksApiClient` (Task 8), DataSource.
- Produces: `class SyncService { reconcile(trigger: 'change-feed' | 'cron' | 'manual'): Promise<ReconcileReport & { ok: boolean }> }` — consumido por triggers (Task 10) y endpoints (Task 11).

- [ ] **Step 1: Implementar el servicio**

Crear `sync.service.ts`:
```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { buildDesiredState, GroupStudentRow } from './desired-state';
import { MocksApiClient, ReconcileReport } from './mocks-api.client';

@Injectable()
export class SyncService {
  private readonly log = new Logger('MocksSync');
  private running = false;

  constructor(
    @InjectDataSource() private ds: DataSource,
    private readonly mocks: MocksApiClient,
  ) {}

  async reconcile(trigger: 'change-feed' | 'cron' | 'manual') {
    if (this.running) {
      this.log.warn(`reconcile(${trigger}) omitido: ya hay uno en curso`);
      return { ok: false, skipped: true } as any;
    }
    this.running = true;
    const t0 = Date.now();
    try {
      // Año activo
      const yearRows = await this.ds.query(
        `SELECT label FROM secretaria.academic_years WHERE is_active = true LIMIT 1`,
      );
      if (!yearRows.length) throw new Error('No hay academic_year activo');
      const academicYear: string = yearRows[0].label;

      // Filas planas grupo × alumno (solo programas con mock_exam_type, año activo)
      const rows: GroupStudentRow[] = await this.ds.query(
        `SELECT g.id::text   AS "groupExternalId",
                g.name        AS "groupName",
                p.mock_exam_type AS "examType",
                s.id::text    AS "studentExternalId",
                s.first_name  AS "firstName",
                s.last_name   AS "lastName"
         FROM secretaria.groups g
         JOIN secretaria.programs p ON p.id = g.program_id
         JOIN secretaria.academic_years ay ON ay.id = g.academic_year_id AND ay.is_active = true
         LEFT JOIN secretaria.enrollments e
                ON e.group_id = g.id AND e.status <> 'baja'
         LEFT JOIN secretaria.students s
                ON s.id = e.student_id AND s.is_active = true
         WHERE p.mock_exam_type IS NOT NULL
         ORDER BY g.id, s.last_name, s.first_name`,
      );

      const groups = buildDesiredState(rows);
      const report: ReconcileReport = await this.mocks.reconcile({ academicYear, groups });

      // Persistir ids devueltos
      for (const g of report.groups) {
        await this.ds.query(
          `UPDATE secretaria.groups SET mock_group_id = $1 WHERE id = $2::uuid AND (mock_group_id IS DISTINCT FROM $1)`,
          [g.mockGroupId, g.externalId],
        );
      }
      for (const s of report.students) {
        await this.ds.query(
          `UPDATE secretaria.students SET mock_user_id = $1 WHERE id = $2::uuid AND (mock_user_id IS DISTINCT FROM $1)`,
          [s.mockUserId, s.externalId],
        );
      }

      await this.writeLog(trigger, true, report, null, Date.now() - t0);
      this.log.log(
        `reconcile(${trigger}) ok: +${report.created} alumnos, ${report.enrolled} altas, ${report.unenrolled} bajas, ${report.renamed} renombrados, ${report.incidencias.length} incidencias`,
      );
      return { ...report, ok: true };
    } catch (e: any) {
      await this.writeLog(trigger, false, null, String(e?.message || e), Date.now() - t0);
      this.log.error(`reconcile(${trigger}) FALLÓ: ${e?.message || e}`);
      throw e;
    } finally {
      this.running = false;
    }
  }

  private async writeLog(
    trigger: string, ok: boolean, report: ReconcileReport | null, error: string | null, durationMs: number,
  ) {
    await this.ds.query(
      `INSERT INTO secretaria.mock_sync_log
         (trigger, ok, created, renamed, enrolled, unenrolled, adopted, incidencias, error, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
      [
        trigger, ok,
        report?.created ?? 0, report?.renamed ?? 0, report?.enrolled ?? 0,
        report?.unenrolled ?? 0, report?.adopted ?? 0,
        JSON.stringify(report?.incidencias ?? []), error, durationMs,
      ],
    );
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit 2>&1 | grep sync.service || echo "ok"`
Expected: sin errores en `sync.service.ts`.

- [ ] **Step 3: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/mocks-sync/sync.service.ts
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(sync): SyncService.reconcile (estado deseado, persistencia de ids, log)"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 10: Disparadores — `pg LISTEN` con debounce + `@Cron` diario + módulo

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/mocks-sync/sync-triggers.service.ts`
- Create: `/opt/mw-secretaria/backend/src/modules/mocks-sync/mocks-sync.module.ts`
- Modify: `/opt/mw-secretaria/backend/src/app.module.ts` (import + array de `imports`)

**Interfaces:**
- Consumes: `SyncService` (Task 9). Produces: módulo `MocksSyncModule` registrado.

- [ ] **Step 1: Implementar los disparadores**

Crear `sync-triggers.service.ts` (mirroring `change-feed.service.ts`):
```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Client } from 'pg';
import { SyncService } from './sync.service';

const SYNC_TABLES = new Set(['students', 'enrollments', 'groups']);

@Injectable()
export class SyncTriggersService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('MocksSyncTriggers');
  private client?: Client;
  private debounce?: NodeJS.Timeout;
  private stopped = false;

  constructor(private readonly sync: SyncService) {}

  async onModuleInit() {
    await this.connect();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.debounce) clearTimeout(this.debounce);
    this.client?.end().catch(() => {});
  }

  private async connect() {
    if (this.stopped) return;
    this.client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    this.client.on('notification', (msg) => {
      try {
        const { t } = JSON.parse(msg.payload || '{}');
        if (SYNC_TABLES.has(t)) this.schedule();
      } catch { /* ignore */ }
    });
    this.client.on('error', (e) => {
      this.log.warn(`pg listen error: ${e.message}; reconectando en 3s`);
      setTimeout(() => this.connect(), 3000);
    });
    try {
      await this.client.connect();
      await this.client.query('LISTEN secretaria_changes');
      this.log.log('escuchando secretaria_changes para sync con Mocks');
    } catch (e: any) {
      this.log.warn(`no se pudo conectar pg listen: ${e.message}; reintento en 3s`);
      setTimeout(() => this.connect(), 3000);
    }
  }

  /** Debounce ~5s: agrupa ráfagas de cambios en una sola reconciliación. */
  private schedule() {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.sync.reconcile('change-feed').catch((e) => this.log.error(`sync change-feed: ${e.message}`));
    }, 5000);
  }

  /** Reconciliación completa diaria (red de seguridad). */
  @Cron('0 3 * * *')
  async daily() {
    this.log.log('reconciliación diaria 03:00');
    await this.sync.reconcile('cron').catch((e) => this.log.error(`sync cron: ${e.message}`));
  }
}
```

- [ ] **Step 2: Crear el módulo**

Crear `mocks-sync.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRole } from '../../common/staff-role.entity';
import { SyncService } from './sync.service';
import { MocksApiClient } from './mocks-api.client';
import { SyncTriggersService } from './sync-triggers.service';
import { MocksSyncController } from './mocks-sync.controller';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([StaffRole])],
  controllers: [MocksSyncController],
  providers: [SyncService, MocksApiClient, SyncTriggersService],
})
export class MocksSyncModule {}
```
> Nota: `MocksSyncController` se crea en Task 11; este módulo no compila hasta entonces. Si ejecutas Task 10 aislada, comenta temporalmente la línea del controller y descoméntala en Task 11.

- [ ] **Step 3: Registrar en `app.module.ts`**

Añadir el import junto a los demás (zona de líneas ~8): `import { MocksSyncModule } from './modules/mocks-sync/mocks-sync.module';`
Y añadir `MocksSyncModule,` al array de `imports` (línea ~51), junto a los demás feature modules.

- [ ] **Step 4: Type-check (tras Task 11) / commit**

Run (tras completar Task 11): `cd /opt/mw-secretaria/backend && npx tsc -p tsconfig.json --noEmit 2>&1 | grep mocks-sync || echo "ok"`
Expected: sin errores.
```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/mocks-sync/sync-triggers.service.ts backend/src/modules/mocks-sync/mocks-sync.module.ts backend/src/app.module.ts
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(sync): disparadores pg LISTEN (debounce 5s) + cron diario 03:00"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 11: Endpoints admin de sync (manual + estado)

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/mocks-sync/mocks-sync.controller.ts`

**Interfaces:**
- Consumes: `SyncService` (Task 9), `SecretariaAuthGuard`/`Roles`.
- Produces:
  - `POST /api/secretaria/mocks-sync/reconcile` (rol `secretaria_admin`) → `ReconcileReport & { ok }`.
  - `GET /api/secretaria/mocks-sync/status` → `{ rows: MockSyncLogRow[] }` (últimas 20 filas de `mock_sync_log`).

- [ ] **Step 1: Implementar el controller**

Crear `mocks-sync.controller.ts`:
```ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { SyncService } from './sync.service';

@Controller('secretaria/mocks-sync')
@UseGuards(SecretariaAuthGuard)
export class MocksSyncController {
  constructor(
    @InjectDataSource() private ds: DataSource,
    private readonly sync: SyncService,
  ) {}

  @Post('reconcile')
  @Roles('secretaria_admin')
  async reconcileNow() {
    return this.sync.reconcile('manual');
  }

  @Get('status')
  @Roles('secretaria_admin', 'direccion')
  async status() {
    const rows = await this.ds.query(
      `SELECT id, ran_at, trigger, ok, created, renamed, enrolled, unenrolled, adopted,
              incidencias, error, duration_ms
       FROM secretaria.mock_sync_log ORDER BY ran_at DESC LIMIT 20`,
    );
    return { rows };
  }
}
```

- [ ] **Step 2: Build completo del backend**

Run: `cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -10`
Expected: build sin errores (compila todo el módulo `mocks-sync`).

- [ ] **Step 3: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/mocks-sync/mocks-sync.controller.ts
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(sync): endpoints admin reconcile manual + status"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 12: UI admin — campo `mock_exam_type` en programa + panel de sync

**Files:**
- Modify: `/opt/mw-secretaria/frontend/src/App.tsx` (formulario de edición de Program en la zona de Catálogo; nueva sección/menú "Sync Mocks")
- Modify: `/opt/mw-secretaria/backend/src/modules/catalog/catalog.controller.ts` (aceptar `mockExamType` en `updateProgram`/`createProgram`)

**Interfaces:**
- Consumes: `GET/POST /api/secretaria/mocks-sync/*` (Task 11); endpoints de catálogo de programas.
- Produces: UI para fijar el nivel y disparar/ver la sync.

- [ ] **Step 1: Backend — aceptar `mock_exam_type` en programas**

En `catalog.controller.ts`, localizar `updateProgram` y `createProgram` y añadir el campo a la lista de columnas actualizables. Ejemplo para `updateProgram` (seguir el patrón `push('col', valor)` ya usado en el fichero):
```ts
// dentro de updateProgram, junto a los otros push(...)
if (b.mockExamType !== undefined) push('mock_exam_type', b.mockExamType || null);
```
Y en `createProgram`, incluir `mock_exam_type` en el INSERT si viene en el body (valor por defecto `null`).

- [ ] **Step 2: Frontend — selector en el formulario de programa**

En el formulario de edición de Program (Catálogo) en `App.tsx`, añadir un `Form.Item` con un `Select`:
```tsx
<Form.Item name="mockExamType" label="Nivel Cambridge (sincroniza con Mocks)">
  <Select allowClear placeholder="No sincroniza"
    options={[
      { value: 'A2_KEY', label: 'A2 Key' },
      { value: 'B1_PET', label: 'B1 Preliminary (PET)' },
      { value: 'B2_FIRST', label: 'B2 First (FCE)' },
      { value: 'C1_CAE', label: 'C1 Advanced (CAE)' },
      { value: 'C2_CPE', label: 'C2 Proficiency (CPE)' },
    ]} />
</Form.Item>
```
Asegurar que el `GET` de programas devuelve `mockExamType` (alias en el SELECT del backend: `p.mock_exam_type AS "mockExamType"`) y que el form lo precarga.

- [ ] **Step 3: Frontend — panel "Sync Mocks"**

Añadir un ítem de menú/sección admin "Sync Mocks" con:
- Botón **"Resincronizar ahora"** → `api.post('/mocks-sync/reconcile')`, con `message.loading`/`message.success`/`message.error` y refresco de la tabla.
- Tabla del estado → `api.get('/mocks-sync/status')`, columnas: Fecha (`ran_at`, `fmtDate`), Disparador (`trigger`), OK (tag verde/rojo), Altas (`enrolled`), Bajas (`unenrolled`), Renombrados (`renamed`), Nuevos (`created`), Incidencias (cuenta + tooltip con el array), Error (`error`).
```tsx
const [syncRows, setSyncRows] = useState<any[]>([]);
const loadSync = async () => setSyncRows((await api.get('/mocks-sync/status')).data.rows);
const runSync = async () => {
  const h = message.loading('Sincronizando con Mocks…', 0);
  try { const r = (await api.post('/mocks-sync/reconcile')).data; h();
    message.success(`Sync ok: +${r.created} alumnos, ${r.enrolled} altas, ${r.unenrolled} bajas, ${r.incidencias?.length||0} incidencias`);
  } catch (e:any) { h(); message.error('Falló la sincronización'); }
  finally { loadSync(); }
};
```

- [ ] **Step 4: Build del frontend**

Run: `cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -8`
Expected: build sin errores de TypeScript.

- [ ] **Step 5: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/catalog/catalog.controller.ts frontend/src/App.tsx
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(sync): UI campo nivel Cambridge en programa + panel Sync Mocks"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 13: Despliegue de Secretaría + validación end-to-end

**Files:** ninguno (operativo). Sigue [[project-secretaria-deploy]].

**Interfaces:** Consumes: Tasks 6-12. Produces: sistema en producción verificado.

- [ ] **Step 1: Añadir env de sync al backend**

Añadir a `/opt/mw-secretaria/backend/.env` (y documentar en `.env.example`):
```
MOCKS_SYNC_URL=http://cambridge-mocks-app:3001
MOCKS_SYNC_KEY=<mismo-valor-que-SYNC_API_KEY-de-Mocks>
```

- [ ] **Step 2: Rebuild + recrear backend (con el volumen de Mocks)**

Run (comando COMPLETO de [[project-secretaria-deploy]] — NO omitir el `-v .../database.db:/mocks/database.db`):
```bash
cd /opt/mw-secretaria/backend && docker build -t mw-secretaria-api:latest .
docker stop mw-secretaria-api && docker rm mw-secretaria-api
docker run -d --name mw-secretaria-api --network mw-panel_mw-network \
  -p 127.0.0.1:3010:3010 --env-file /opt/mw-secretaria/backend/.env \
  -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db \
  --restart unless-stopped mw-secretaria-api:latest
sleep 4 && docker logs mw-secretaria-api --tail 20
```
Expected: en logs aparece "escuchando secretaria_changes para sync con Mocks".

- [ ] **Step 3: Deploy frontend**

Run:
```bash
cd /opt/mw-secretaria/frontend && npm run build && sudo cp -r dist/* /opt/mw-secretaria/frontend-dist/
```

- [ ] **Step 4: Reconcile manual + verificación (curl con JWT admin)**

Run (firmar JWT admin dentro del contenedor; usar un `user_id` de `secretaria.staff_roles` con rol `secretaria_admin`):
```bash
UID=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT user_id FROM secretaria.staff_roles WHERE role='secretaria_admin' LIMIT 1")
TOKEN=$(docker exec mw-secretaria-api node -e "console.log(require('jsonwebtoken').sign({sub:'$UID',email:'x'},process.env.JWT_SECRET,{expiresIn:'5m'}))")
curl -s -X POST http://127.0.0.1:3010/api/secretaria/mocks-sync/reconcile -H "Authorization: Bearer $TOKEN" | head -c 600; echo
```
Expected: JSON con `created/enrolled/...` y `ok:true`.

- [ ] **Step 5: Verificar los 10 puntos del spec (sección 15)**

Run las comprobaciones:
```bash
# (5) sin duplicados de grupos/alumnos (externalId único garantiza unicidad)
docker exec cambridge-mocks-app sh -c 'sqlite3 /app/data/database.db "SELECT externalId, COUNT(*) c FROM \"Group\" WHERE externalId IS NOT NULL GROUP BY externalId HAVING c>1; SELECT externalId, COUNT(*) c FROM \"User\" WHERE externalId IS NOT NULL GROUP BY externalId HAVING c>1;"'
# (6) año 2026-2027 creado en Mocks
docker exec cambridge-mocks-app sh -c 'sqlite3 /app/data/database.db "SELECT name FROM AcademicYear;"'
# log de sync sin error
docker exec mw-panel-db-prod psql -U mwpanel -d mwpanel -c "SELECT ran_at,trigger,ok,created,enrolled,unenrolled,jsonb_array_length(incidencias) inc FROM secretaria.mock_sync_log ORDER BY ran_at DESC LIMIT 5;"
```
Verificación funcional manual (en un grupo de prueba):
1. Crear grupo Cambridge en Secretaría → aparece en Mocks (esperar ~5s tras el cambio o pulsar "Resincronizar"). 
2. Añadir alumno → aparece matriculado en Mocks.
3. Quitar alumno del grupo → desaparece la membresía en Mocks; el `User` y sus `StudentResult` siguen.
4. Mover alumno a otro grupo Cambridge → sale del anterior, entra en el nuevo; histórico intacto.
5. Renombrar grupo en Secretaría → nombre actualizado en Mocks (mismo `externalId`, sin duplicado).

- [ ] **Step 6: Commit final del estado de `.env.example`**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/.env.example
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "docs(sync): variables MOCKS_SYNC_URL/KEY en .env.example"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

## Self-review (cobertura del spec, parte sync)

- §1 curso 2026-2027 (crear si falta) → Task 4 step 3a + Task 13 step 5.
- §2 niveles sincronizables por nivel, no por nombre → Task 6 (`mock_exam_type`) + Task 9 (filtro `mock_exam_type IS NOT NULL`).
- §3 crear/renombrar grupos, sin duplicados → Task 4 (match por `externalId`, rename) + verif. Task 13.
- §4 altas + reutilizar existentes → Task 4 (match externalId → adopción por nombre → crear).
- §5 bajas solo membresía → Task 4 (`deleteMany` GroupUser, nunca User/StudentResult).
- §6 cambio de grupo → emergente del diff declarativo (Task 4 + verif. Task 13).
- §7 resync manual + diaria + logs → Task 10 (cron+listen), Task 11 (manual+status), `mock_sync_log` (Task 6/9).
- §15 validación → Task 13 step 5.
