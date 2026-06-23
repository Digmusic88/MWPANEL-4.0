# Plan B — Rediseño de la visualización de resultados Mock en la ficha del alumno

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir la tabla numérica de resultados Mock de la ficha del alumno por una vista moderna: KPIs resumidos, barras por destreza, gráfica de evolución histórica (Recharts) y tratamiento correcto de "No presentado" (NP) — nunca 0, excluido de medias/tendencias/gráficas.

**Architecture:** El backend de Secretaría ya lee el SQLite de Mocks en solo-lectura (`mocks.controller.ts`). Se extrae la lógica de métricas a una función PURA y testeable (`mock-metrics.ts`) que clasifica cada parte (scored/pending/NP), calcula KPIs y series por destreza excluyendo NP/pending de las medias. El endpoint `GET /mocks/results/:id` devuelve esa estructura enriquecida + el nivel objetivo (de `programs.mock_exam_type`). El frontend renderiza con Ant Design + Recharts en un componente nuevo que reemplaza el bloque `App.tsx:869-879`.

**Tech Stack:** Backend NestJS (`node:test`), frontend React 18 + Ant Design 5 + **Recharts** (dependencia nueva). Colores por destreza ya existentes en `App.tsx:591`; tokens en `index.css:5-17`.

## Global Constraints

- **NP nunca como 0** (spec §12). Un valor No presentado se muestra como chip "NP"; un PRESENTED sin nota como "pendiente". Ninguno computa en medias, tendencias ni gráficas (spec §13). Las medias se calculan SOLO con notas reales.
- **Clasificación de partes** (campo `status` = `submissionStatus` de Mocks):
  - NP: `status ∈ {NOT_PRESENTED, ABSENT}`.
  - Pendiente: `status` no NP y `score == null`.
  - Con nota: `status` no NP y `score != null`.
- **v1 en porcentajes.** La escala Cambridge 140-190 queda fuera de v1 (requiere boundaries del template de Mocks).
- **Responsive** (spec §14): las tarjetas se apilan en móvil (el Drawer ya es full-width en móvil).
- **Commit + push** al repo de Secretaría en cada cambio: `git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria <cmd>`, remoto `origin`.
- Este plan es **independiente del Plan A**: el "Nivel Cambridge objetivo" usa `programs.mock_exam_type`, que crea la migración 035 del Plan A. Si se ejecuta B antes que A, el nivel objetivo saldrá `null` (degradación elegante, no rompe).

---

### Task 1: Función pura de métricas `computeMockMetrics` + tests

**Files:**
- Create: `/opt/mw-secretaria/backend/src/modules/mocks/mock-metrics.ts`
- Test: `/opt/mw-secretaria/backend/src/modules/mocks/mock-metrics.test.ts`

**Interfaces:**
- Produces:
  - `type RawPart = { part: string; score: number | null; status: string }`
  - `type RawCall = { examName: string; examDate: string | null; parts: RawPart[] }`
  - `type SkillPoint = { date: string | null; examName: string; value: number | null; np: boolean }`
  - `type MockMetrics = { kpis: { last: number|null; best: number|null; average: number|null; count: number; trend: 'up'|'down'|'flat'|null }; skills: { name: string; latest: number|null; latestNp: boolean }[]; evolution: { date: string|null; examName: string; overall: number|null }[]; skillSeries: Record<string, SkillPoint[]>; calls: EnrichedCall[] }`
  - `computeMockMetrics(calls: RawCall[]): MockMetrics` — consumido por el controller (Task 2).
  - `classifyPart(p: RawPart): 'scored'|'pending'|'np'` — helper exportado.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `mock-metrics.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMockMetrics, classifyPart, RawCall } from './mock-metrics';

test('classifyPart distingue scored/pending/np', () => {
  assert.equal(classifyPart({ part: 'Reading', score: 80, status: 'PRESENTED' }), 'scored');
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'PRESENTED' }), 'pending');
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'NOT_PRESENTED' }), 'np');
  assert.equal(classifyPart({ part: 'Reading', score: null, status: 'ABSENT' }), 'np');
});

test('overall por convocatoria = media solo de partes con nota; NP no cuenta', () => {
  const calls: RawCall[] = [{
    examName: 'Mock 1', examDate: '2026-01-10',
    parts: [
      { part: 'Reading', score: 80, status: 'PRESENTED' },
      { part: 'Writing', score: 60, status: 'PRESENTED' },
      { part: 'Listening', score: null, status: 'NOT_PRESENTED' }, // NP, no cuenta
    ],
  }];
  const m = computeMockMetrics(calls);
  assert.equal(m.evolution[0].overall, 70); // (80+60)/2, no (80+60+0)/3
});

test('KPIs: last, best, average, count y trend excluyen convocatorias sin nota', () => {
  const calls: RawCall[] = [
    { examName: 'M1', examDate: '2026-01-10', parts: [{ part: 'Reading', score: 50, status: 'PRESENTED' }] },
    { examName: 'M2', examDate: '2026-03-10', parts: [{ part: 'Reading', score: 70, status: 'PRESENTED' }] },
    { examName: 'M3', examDate: '2026-05-10', parts: [{ part: 'Reading', score: null, status: 'ABSENT' }] }, // NP entero
  ];
  const m = computeMockMetrics(calls);
  assert.equal(m.kpis.count, 2);          // M3 no realizado
  assert.equal(m.kpis.best, 70);
  assert.equal(m.kpis.average, 60);       // (50+70)/2, M3 excluido
  assert.equal(m.kpis.last, 70);          // último CON nota
  assert.equal(m.kpis.trend, 'up');       // 50 -> 70
});

test('un alumno sin ninguna nota da KPIs nulos, no ceros', () => {
  const calls: RawCall[] = [
    { examName: 'M1', examDate: '2026-01-10', parts: [{ part: 'Reading', score: null, status: 'NOT_PRESENTED' }] },
  ];
  const m = computeMockMetrics(calls);
  assert.equal(m.kpis.average, null);
  assert.equal(m.kpis.best, null);
  assert.equal(m.kpis.count, 0);
  assert.equal(m.skills.find(s => s.name === 'Reading')?.latestNp, true);
});
```

- [ ] **Step 2: Ejecutar y verificar fallo**

Run: `cd /opt/mw-secretaria/backend && npm test 2>&1 | grep -A2 mock-metrics || true`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar la función**

Crear `mock-metrics.ts`:
```ts
export type RawPart = { part: string; score: number | null; status: string };
export type RawCall = { examName: string; examDate: string | null; parts: RawPart[] };

export type SkillPoint = { date: string | null; examName: string; value: number | null; np: boolean };
export type EnrichedPart = RawPart & { kind: 'scored' | 'pending' | 'np' };
export type EnrichedCall = { examName: string; examDate: string | null; overall: number | null; parts: EnrichedPart[] };

export type MockMetrics = {
  kpis: { last: number | null; best: number | null; average: number | null; count: number; trend: 'up' | 'down' | 'flat' | null };
  skills: { name: string; latest: number | null; latestNp: boolean }[];
  evolution: { date: string | null; examName: string; overall: number | null }[];
  skillSeries: Record<string, SkillPoint[]>;
  calls: EnrichedCall[];
};

const NP_STATUS = new Set(['NOT_PRESENTED', 'ABSENT']);

export function classifyPart(p: RawPart): 'scored' | 'pending' | 'np' {
  if (NP_STATUS.has((p.status || '').toUpperCase())) return 'np';
  return p.score == null ? 'pending' : 'scored';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeMockMetrics(calls: RawCall[]): MockMetrics {
  // Orden cronológico ascendente (las fechas null al final, estable)
  const sorted = [...calls].sort((a, b) => (a.examDate || '').localeCompare(b.examDate || ''));

  const enriched: EnrichedCall[] = sorted.map((c) => {
    const parts: EnrichedPart[] = c.parts.map((p) => ({ ...p, kind: classifyPart(p) }));
    const scored = parts.filter((p) => p.kind === 'scored').map((p) => p.score as number);
    const overall = scored.length ? round1(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
    return { examName: c.examName, examDate: c.examDate, overall, parts };
  });

  const evolution = enriched.map((c) => ({ date: c.examDate, examName: c.examName, overall: c.overall }));

  // KPIs (solo convocatorias con overall != null)
  const withScore = enriched.filter((c) => c.overall != null);
  const overalls = withScore.map((c) => c.overall as number);
  const count = withScore.length;
  const best = count ? Math.max(...overalls) : null;
  const average = count ? round1(overalls.reduce((a, b) => a + b, 0) / count) : null;
  const last = count ? (withScore[withScore.length - 1].overall as number) : null;
  let trend: 'up' | 'down' | 'flat' | null = null;
  if (count >= 2) {
    const prev = withScore[withScore.length - 2].overall as number;
    trend = last! > prev ? 'up' : last! < prev ? 'down' : 'flat';
  }

  // Series por destreza + último valor por destreza
  const skillNames = Array.from(new Set(enriched.flatMap((c) => c.parts.map((p) => p.part))));
  const skillSeries: Record<string, SkillPoint[]> = {};
  const skills = skillNames.map((name) => {
    const series: SkillPoint[] = enriched.map((c) => {
      const p = c.parts.find((x) => x.part === name);
      return {
        date: c.examDate, examName: c.examName,
        value: p && p.kind === 'scored' ? (p.score as number) : null,
        np: p ? p.kind === 'np' : false,
      };
    });
    skillSeries[name] = series;
    // último punto con dato definido (nota o NP), recorriendo de atrás a delante
    let latest: number | null = null;
    let latestNp = false;
    for (let i = series.length - 1; i >= 0; i--) {
      const pt = series[i];
      if (pt.value != null) { latest = pt.value; latestNp = false; break; }
      if (pt.np) { latest = null; latestNp = true; break; }
    }
    return { name, latest, latestNp };
  });

  return { kpis: { last, best, average, count, trend }, skills, evolution, skillSeries, calls: enriched };
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `cd /opt/mw-secretaria/backend && npm test 2>&1 | tail -15`
Expected: PASS (incluye los tests de `mock-metrics`).

- [ ] **Step 5: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/mocks/mock-metrics.ts backend/src/modules/mocks/mock-metrics.test.ts
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(mocks): computeMockMetrics puro con tests (NP excluido de medias)"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 2: Extender `GET /mocks/results/:id` con métricas + nivel objetivo

**Files:**
- Modify: `/opt/mw-secretaria/backend/src/modules/mocks/mocks.controller.ts` (endpoint `results/:mockUserId`, ~líneas 52-76)

**Interfaces:**
- Consumes: `computeMockMetrics` (Task 1); `programs.mock_exam_type` (Plan A migración 035, opcional).
- Produces: respuesta JSON `{ fullName, targetLevel: { code, label } | null, metrics: MockMetrics }` — consumida por el frontend (Task 4). Mantener `calls` dentro de `metrics.calls` para el detalle por destreza.

- [ ] **Step 1: Leer el endpoint actual**

Run: `sed -n '1,90p' /opt/mw-secretaria/backend/src/modules/mocks/mocks.controller.ts`
Identificar dónde se construye `{ fullName, calls }` (parts con `part`, `score`, `status`).

- [ ] **Step 2: Importar la función de métricas**

Al inicio de `mocks.controller.ts`:
```ts
import { computeMockMetrics, RawCall } from './mock-metrics';
```

- [ ] **Step 3: Añadir resolución del nivel objetivo (helper privado)**

Añadir un método privado en el controller que, dado el `mockUserId`, busque el `mock_exam_type` del grupo Cambridge activo del alumno en Secretaría (vía `students.mock_user_id` → enrollment activo → program). Usa el DataSource ya inyectado (`@InjectDataSource`); si no existe en este controller, inyectarlo igual que en otros controllers:
```ts
private readonly EXAM_LABELS: Record<string, string> = {
  A2_KEY: 'A2 Key', B1_PET: 'B1 Preliminary (PET)', B2_FIRST: 'B2 First (FCE)',
  C1_CAE: 'C1 Advanced (CAE)', C2_CPE: 'C2 Proficiency (CPE)',
};

private async resolveTargetLevel(mockUserId: number): Promise<{ code: string; label: string } | null> {
  const rows = await this.ds.query(
    `SELECT p.mock_exam_type AS code
     FROM secretaria.students s
     JOIN secretaria.enrollments e ON e.student_id = s.id AND e.status <> 'baja'
     JOIN secretaria.groups g ON g.id = e.group_id
     JOIN secretaria.programs p ON p.id = g.program_id
     JOIN secretaria.academic_years ay ON ay.id = g.academic_year_id AND ay.is_active = true
     WHERE s.mock_user_id = $1 AND p.mock_exam_type IS NOT NULL
     LIMIT 1`,
    [mockUserId],
  );
  if (!rows.length) return null;
  const code = rows[0].code as string;
  return { code, label: this.EXAM_LABELS[code] || code };
}
```
> Si el controller no inyecta `DataSource` todavía, añadir `@InjectDataSource() private ds: DataSource` al constructor (import `{ InjectDataSource } from '@nestjs/typeorm'` y `{ DataSource } from 'typeorm'`). El acceso al SQLite de Mocks (sql.js) se mantiene igual para los resultados.

- [ ] **Step 4: Devolver la estructura enriquecida**

Donde el endpoint hoy retorna `{ fullName, calls }`, transformar a:
```ts
const rawCalls: RawCall[] = calls; // las calls ya tienen { examName, examDate, parts:[{part,score,status}] }
const metrics = computeMockMetrics(rawCalls);
const targetLevel = await this.resolveTargetLevel(Number(mockUserId));
return { fullName, targetLevel, metrics };
```
> Mantener compatibilidad: el frontend nuevo (Task 4) consume `metrics`. Si algún consumidor antiguo esperaba `calls` en la raíz, ahora está en `metrics.calls` (enriquecido con `kind`).

- [ ] **Step 5: Build del backend**

Run: `cd /opt/mw-secretaria/backend && npm run build 2>&1 | tail -8`
Expected: build sin errores.

- [ ] **Step 6: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add backend/src/modules/mocks/mocks.controller.ts
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(mocks): endpoint results devuelve métricas + nivel objetivo"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 3: Añadir Recharts al frontend

**Files:**
- Modify: `/opt/mw-secretaria/frontend/package.json`

**Interfaces:** Produces: dependencia `recharts` disponible para Task 4.

- [ ] **Step 1: Instalar recharts**

Run: `cd /opt/mw-secretaria/frontend && npm install recharts@^2.12.0 && npm ls recharts`
Expected: `recharts` añadido a `dependencies`, sin errores de peer-deps (React 18 compatible).

- [ ] **Step 2: Verificar build con la nueva dependencia**

Run: `cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -6`
Expected: build sin errores.

- [ ] **Step 3: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add frontend/package.json frontend/package-lock.json
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "build(frontend): añadir recharts para la visualización de resultados Mock"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 4: Componente `MockResultsPanel` y reemplazo en la ficha

**Files:**
- Create: `/opt/mw-secretaria/frontend/src/components/MockResultsPanel.tsx`
- Modify: `/opt/mw-secretaria/frontend/src/App.tsx` (bloque `869-879`: la `Card` "Resultados de exámenes Mock" y la carga de datos en `FichaAlumno` ~líneas 761-767)

**Interfaces:**
- Consumes: respuesta de Task 2 (`{ fullName, targetLevel, metrics }`); colores por destreza de `App.tsx:591` (replicar el mapa o exportarlo).
- Produces: componente `<MockResultsPanel data={mockData} />`.

- [ ] **Step 1: Crear el componente**

Crear `src/components/MockResultsPanel.tsx`:
```tsx
import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Progress, Tag, Empty, Segmented } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// Colores por destreza (replica App.tsx:591)
const SKILL_COLOR: Record<string, string> = {
  reading: '#2563EB', 'reading & writing': '#2563EB', 'reading & use of english': '#4F46E5',
  writing: '#16A34A', listening: '#7C3AED', speaking: '#C43030',
  'use of english': '#0891B2', vocabulary: '#B45309', grammar: '#0D9488',
};
const skillColor = (name: string) => SKILL_COLOR[name.toLowerCase()] || '#579172';

type Metrics = {
  kpis: { last: number | null; best: number | null; average: number | null; count: number; trend: 'up' | 'down' | 'flat' | null };
  skills: { name: string; latest: number | null; latestNp: boolean }[];
  evolution: { date: string | null; examName: string; overall: number | null }[];
  skillSeries: Record<string, { date: string | null; examName: string; value: number | null; np: boolean }[]>;
  calls: { examName: string; examDate: string | null; overall: number | null; parts: { part: string; score: number | null; status: string; kind: 'scored' | 'pending' | 'np' }[] }[];
};
type Props = { data: { fullName?: string; targetLevel?: { code: string; label: string } | null; metrics: Metrics } | null };

const fmt = (n: number | null) => (n == null ? '—' : n.toFixed(1));
const TrendIcon = ({ t }: { t: string | null }) =>
  t === 'up' ? <ArrowUpOutlined style={{ color: '#16A34A' }} />
  : t === 'down' ? <ArrowDownOutlined style={{ color: '#C43030' }} />
  : t === 'flat' ? <MinusOutlined style={{ color: '#9B9BAB' }} /> : <span>—</span>;

export default function MockResultsPanel({ data }: Props) {
  const [view, setView] = useState<string>('Global');
  if (!data || !data.metrics || data.metrics.calls.length === 0) {
    return <Empty description="Sin simulacros registrados" />;
  }
  const { kpis, skills, evolution, skillSeries } = data.metrics;

  // Datos para la gráfica según selección
  const chartData =
    view === 'Global'
      ? evolution.map((e) => ({ name: e.examName, valor: e.overall }))
      : (skillSeries[view] || []).map((p) => ({ name: p.examName, valor: p.value }));

  return (
    <div>
      {/* KPIs */}
      <Row gutter={[12, 12]}>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Último" value={fmt(kpis.last)} suffix={kpis.last != null ? '%' : ''} /></Card></Col>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Mejor" value={fmt(kpis.best)} suffix={kpis.best != null ? '%' : ''} /></Card></Col>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Media" value={fmt(kpis.average)} suffix={kpis.average != null ? '%' : ''} /></Card></Col>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Simulacros" value={kpis.count} /></Card></Col>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Tendencia" valueRender={() => <TrendIcon t={kpis.trend} />} /></Card></Col>
        <Col xs={12} md={8}><Card size="small"><Statistic title="Nivel objetivo" valueRender={() => <span>{data.targetLevel?.label || '—'}</span>} /></Card></Col>
      </Row>

      {/* Barras por destreza */}
      <Card size="small" title="Por destreza (último simulacro con dato)" style={{ marginTop: 12 }}>
        {skills.map((s) => (
          <div key={s.name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{s.name}</span>
              {s.latestNp ? <Tag color="default">NP</Tag> : <span>{s.latest == null ? 'pendiente' : `${s.latest.toFixed(1)}%`}</span>}
            </div>
            <Progress
              percent={s.latest ?? 0}
              showInfo={false}
              strokeColor={skillColor(s.name)}
              status={s.latestNp ? 'normal' : undefined}
              trailColor={s.latestNp ? '#EDE9E4' : undefined}
            />
          </div>
        ))}
      </Card>

      {/* Evolución histórica */}
      <Card
        size="small"
        title="Evolución histórica"
        style={{ marginTop: 12 }}
        extra={<Segmented size="small" value={view} onChange={(v) => setView(v as string)} options={['Global', ...skills.map((s) => s.name)]} />}
      >
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => (v == null ? 'NP / pendiente' : `${v}%`)} />
              <Legend />
              <Line
                type="monotone" dataKey="valor" name={view}
                stroke={view === 'Global' ? '#579172' : skillColor(view)}
                strokeWidth={2} connectNulls dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Reemplazar el bloque en la ficha**

En `App.tsx`, sustituir la `Card` "Resultados de exámenes Mock" (`App.tsx:869-879`) por:
```tsx
import MockResultsPanel from './components/MockResultsPanel'; // arriba con los demás imports

// ... dentro de FichaAlumno, donde estaba la Card de mock:
<Card title="Resultados de exámenes Mock" size="small" style={{ marginTop: 12 }}>
  <MockResultsPanel data={mock} />
</Card>
```
El estado `mock` ya se carga en `FichaAlumno` (`App.tsx:761-767`) con `GET /mocks/results/{mockUserId}`; ahora la respuesta es `{ fullName, targetLevel, metrics }` y `MockResultsPanel` la consume directamente. Verificar que la condición de carga (`if (student.mockUserId)`) se mantiene.

- [ ] **Step 3: Build del frontend**

Run: `cd /opt/mw-secretaria/frontend && npm run build 2>&1 | tail -8`
Expected: build sin errores de TypeScript.

- [ ] **Step 4: Commit + push**

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria add frontend/src/components/MockResultsPanel.tsx frontend/src/App.tsx
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria commit -m "feat(ficha): panel moderno de resultados Mock (KPIs, barras, evolución, NP)"
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria push origin HEAD
```

---

### Task 5: Despliegue + validación visual

**Files:** ninguno (operativo). Sigue [[project-secretaria-deploy]].

**Interfaces:** Consumes: Tasks 1-4. Produces: ficha en producción verificada.

- [ ] **Step 1: Rebuild + recrear backend (volumen Mocks incluido)**

Run (comando COMPLETO de [[project-secretaria-deploy]]):
```bash
cd /opt/mw-secretaria/backend && docker build -t mw-secretaria-api:latest .
docker stop mw-secretaria-api && docker rm mw-secretaria-api
docker run -d --name mw-secretaria-api --network mw-panel_mw-network \
  -p 127.0.0.1:3010:3010 --env-file /opt/mw-secretaria/backend/.env \
  -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db \
  --restart unless-stopped mw-secretaria-api:latest
```

- [ ] **Step 2: Deploy frontend**

Run:
```bash
cd /opt/mw-secretaria/frontend && npm run build && sudo cp -r dist/* /opt/mw-secretaria/frontend-dist/
```

- [ ] **Step 3: Verificar el endpoint (JWT admin)**

Run:
```bash
UID=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT user_id FROM secretaria.staff_roles WHERE role='secretaria_admin' LIMIT 1")
TOKEN=$(docker exec mw-secretaria-api node -e "console.log(require('jsonwebtoken').sign({sub:'$UID',email:'x'},process.env.JWT_SECRET,{expiresIn:'5m'}))")
# un mockUserId real con resultados:
MUID=$(docker exec mw-panel-db-prod psql -tA -U mwpanel -d mwpanel -c "SELECT mock_user_id FROM secretaria.students WHERE mock_user_id IS NOT NULL LIMIT 1")
curl -s http://127.0.0.1:3010/api/secretaria/mocks/results/$MUID -H "Authorization: Bearer $TOKEN" | head -c 800; echo
```
Expected: JSON con `metrics.kpis`, `metrics.skills`, `metrics.evolution`, y `targetLevel`. Comprobar que ninguna media usa NP (un alumno con una destreza `NOT_PRESENTED` no la suma como 0).

- [ ] **Step 4: Validación visual en producción (spec §15.7-9)**

Abrir `https://secretaria.mundoworld.school`, entrar en la ficha de un alumno con `mockUserId` y verificar:
1. KPIs visibles (Último, Mejor, Media, Simulacros, Tendencia, Nivel objetivo).
2. Barras por destreza con color; una destreza no presentada muestra **NP**, no 0.
3. Gráfica de evolución (Global + togglable por destreza); los puntos NP/pendientes no rompen la línea (huecos con `connectNulls`).
4. Responsive: en móvil las tarjetas se apilan.
5. Un alumno sin notas no muestra ceros ni suspensos: KPIs en `—`.

- [ ] **Step 5: Sin commit adicional** (todo commiteado en Tasks 1-4). Confirmar `git status` limpio:

```bash
git --git-dir=/root/secretaria-repo.git --work-tree=/opt/mw-secretaria status --short
```

---

## Self-review (cobertura del spec, parte visualización)

- §8 rediseño moderno → Task 4 (componente nuevo reemplaza la tabla).
- §9 resultados por destreza con barras → Task 4 (sección "Por destreza").
- §10 evolución histórica con gráfica → Task 4 (LineChart + Segmented por destreza).
- §11 indicadores resumidos (último, mejor, media, nº, tendencia, nivel objetivo) → Task 1 (KPIs) + Task 2 (targetLevel) + Task 4 (cabecera).
- §12 NP nunca 0 → Task 1 (`classifyPart`) + Task 4 (chip "NP"/"pendiente").
- §13 NP fuera de medias/tendencias/gráficas → Task 1 (tests lo garantizan) + Task 4 (`connectNulls`).
- §14 UX responsive → Task 4 (grid `xs/md`, Drawer full-width móvil).
- §15.7-9 validación NP, medias, gráficas → Task 5 step 3-4.
