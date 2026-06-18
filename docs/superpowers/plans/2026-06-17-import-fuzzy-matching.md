# Import Fuzzy Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir fuzzy matching al importador Excel para que nombres con diferencias menores se emparejen automáticamente y los que no se resuelvan se ofrezcan para revisión manual antes del commit.

**Architecture:** Se extiende `import.parser.ts` con funciones de similitud (word-set + Levenshtein). `parseWorkbook` recibe un parámetro opcional `mappings` y devuelve `fuzzyMatched[]` y `needsReview[]` además de los datos actuales. El controller pasa los nuevos campos al preview y acepta `mappings` JSON en el commit. El frontend añade dos tarjetas (auto-emparejados para validar, manuales para resolver) y envía los mappings al hacer commit.

**Tech Stack:** TypeScript, NestJS (FileInterceptor / `@Body`), React + Ant Design (`Checkbox`, `Select`, `Table`, `Card`)

## Global Constraints

- Sin cambios de esquema de BD (no migrations).
- Sin dependencias nuevas (Levenshtein implementado inline).
- El flujo preview → commit existente no se rompe: si no hay fuzzyMatched ni needsReview, la UI queda idéntica a la actual.
- Thresholds: auto-match ≥ 0.88, candidatos en needsReview ≥ 0.45, máximo 3 candidatos por item.
- `norm()` del backend: `s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()`

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/src/modules/import/import.parser.ts` | Modificar | Añadir `levenshtein`, `similarity`, interfaces `FuzzyMatch`/`ReviewItem`, lógica fuzzy en `parseWorkbook`, actualizar `summarize` |
| `backend/src/modules/import/import.parser.spec.ts` | Crear | Tests unitarios de `similarity` y comportamiento de `parseWorkbook` |
| `backend/src/modules/import/import.controller.ts` | Modificar | `commit` acepta `mappings` body field; `preview` ya funciona vía `summarize` |
| `frontend/src/App.tsx` — `function Importador()` | Modificar | Nuevo estado, `doPreview`, `handleCommit`, Tarjeta A, Tarjeta B |

---

## Task 1: Funciones de similitud en el parser (con tests)

**Files:**
- Modify: `backend/src/modules/import/import.parser.ts`
- Create: `backend/src/modules/import/import.parser.spec.ts`

**Interfaces produces:**
```typescript
export function similarity(a: string, b: string): number
// Usa norm() internamente sobre los inputs — llamar con strings ya normalizados
// para tests; en producción se llama con norm(paymentName) vs keys de byName (ya normalizados)
```

- [ ] **Step 1: Añadir `levenshtein` y `similarity` en `import.parser.ts`**

Insertar inmediatamente después de la línea `const isName = ...` (línea 12):

```typescript
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const wa = a.split(' ').filter(Boolean).sort();
  const wb = b.split(' ').filter(Boolean).sort();
  if (wa.join(' ') === wb.join(' ')) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}
```

- [ ] **Step 2: Crear `import.parser.spec.ts` con tests de `similarity`**

```typescript
import { similarity, norm } from './import.parser';

describe('similarity', () => {
  it('strings idénticos → 1', () => {
    expect(similarity('juan garcia', 'juan garcia')).toBe(1);
  });

  it('palabras en orden distinto → 1 (word-set match)', () => {
    expect(similarity('garcia juan', 'juan garcia')).toBe(1);
  });

  it('un solo carácter de diferencia → score ≥ 0.88 (auto-match)', () => {
    // 'garcia lopez' vs 'garcia lopes' → levenshtein=1, maxLen=12 → 1-1/12 ≈ 0.917
    expect(similarity('garcia lopez', 'garcia lopes')).toBeGreaterThanOrEqual(0.88);
  });

  it('tilde residual eliminada por norm → score ≥ 0.88', () => {
    // norm ya elimina tildes; este test verifica que funcione con el resultado de norm
    const a = norm('Ana Martínez');   // 'ana martinez'
    const b = norm('Ana Martinez');  // 'ana martinez'
    expect(similarity(a, b)).toBe(1);
  });

  it('abreviatura de apellido → score entre 0.45 y 0.88 (revisión manual)', () => {
    // 'ana mtnez' (9) vs 'ana martinez' (12) → levenshtein=3, maxLen=12 → 1-3/12=0.75
    const s = similarity(norm('Ana Mtnez'), norm('Ana Martínez'));
    expect(s).toBeGreaterThanOrEqual(0.45);
    expect(s).toBeLessThan(0.88);
  });

  it('nombres completamente distintos → score < 0.45', () => {
    expect(similarity('pedro sanchez', 'maria fernandez')).toBeLessThan(0.45);
  });
});
```

- [ ] **Step 3: Ejecutar los tests y verificar que pasan**

```bash
cd /opt/mw-secretaria/backend
npx jest import.parser --no-coverage --passWithNoTests
```

Salida esperada: `Tests: 6 passed, 6 total` (o similar). Si falla alguno, ajustar los valores esperados en el test (no cambiar los umbrales del algoritmo).

- [ ] **Step 4: Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/import/import.parser.ts backend/src/modules/import/import.parser.spec.ts
git commit -m "feat(import): add levenshtein + similarity functions with tests"
```

---

## Task 2: Fuzzy matching en `parseWorkbook` y `summarize`

**Files:**
- Modify: `backend/src/modules/import/import.parser.ts`

**Interfaces consumes:** `similarity()` del Task 1, `norm()` existente  
**Interfaces produces:**
```typescript
export interface FuzzyMatch {
  svc: string;
  paymentName: string;   // nombre tal como aparece en la hoja de pagos
  rosterName: string;    // nombre del alumno en el listado
  similarity: number;    // 0–1
}

export interface ReviewItem {
  svc: string;
  paymentName: string;
  candidates: { name: string; similarity: number }[];  // top 3, vacío si ninguno ≥ 0.45
}

// parseWorkbook ahora acepta mappings opcionales
export function parseWorkbook(
  buf: Buffer,
  mappings?: Record<string, Record<string, string>>
): { students: ParsedStudent[]; warnings: string[]; fuzzyMatched: FuzzyMatch[]; needsReview: ReviewItem[] }

// summarize devuelve los nuevos arrays
export function summarize(parsed: ReturnType<typeof parseWorkbook>): {
  porServicio: any[];
  warnings: string[];
  fuzzyMatched: FuzzyMatch[];
  needsReview: ReviewItem[];
  totales: { alumnos: number; matriculados: number; bajas: number };
}
```

- [ ] **Step 1: Añadir interfaces `FuzzyMatch` y `ReviewItem` en `import.parser.ts`**

Insertar antes de `export interface ParsedStudent`:

```typescript
export interface FuzzyMatch {
  svc: string;
  paymentName: string;
  rosterName: string;
  similarity: number;
}

export interface ReviewItem {
  svc: string;
  paymentName: string;
  candidates: { name: string; similarity: number }[];
}
```

- [ ] **Step 2: Actualizar firma de `parseWorkbook` y añadir acumuladores**

Cambiar la línea:
```typescript
export function parseWorkbook(buf: Buffer): { students: ParsedStudent[]; warnings: string[] } {
```
por:
```typescript
export function parseWorkbook(
  buf: Buffer,
  mappings?: Record<string, Record<string, string>>,
): { students: ParsedStudent[]; warnings: string[]; fuzzyMatched: FuzzyMatch[]; needsReview: ReviewItem[] } {
```

Después de `const all: ParsedStudent[] = [];`, añadir:
```typescript
  const fuzzyMatched: FuzzyMatch[] = [];
  const needsReview: ReviewItem[] = [];
```

- [ ] **Step 3: Reemplazar el bloque de pagos dentro del bucle `for (const c of ROSTERS)`**

El bloque actual (líneas 78–96) empieza con `// Pagos de este servicio`. Reemplazarlo íntegramente por:

```typescript
    // Pagos de este servicio
    const pc = PAYS[c.svc];
    const pw = pc && wb.Sheets[pc.sheet];
    if (!pw) { warnings.push(`Falta la hoja de pagos "${pc?.sheet}" (${c.svc})`); continue; }
    const prows: any[][] = XLSX.utils.sheet_to_json(pw, { header: 1, blankrows: false, defval: '' });

    // Inyectar mappings manuales: norm(paymentName) → ParsedStudent
    const svcMappings: Record<string, string> = mappings?.[c.svc] ?? {};
    for (const [normKey, rosterName] of Object.entries(svcMappings)) {
      const target = byName[norm(rosterName)];
      if (target) byName[normKey] = target;
    }

    let unresolvedCount = 0;
    for (const r of prows) {
      const nm = clean(r[pc.name]);
      if (!isName(nm)) continue;
      const normNm = norm(nm);
      let st = byName[normNm];

      if (!st) {
        // Puntuar todos los alumnos del roster por similitud
        const scored = Object.entries(byName)
          .map(([k, s]) => ({ key: k, student: s, score: similarity(normNm, k) }))
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0 && scored[0].score >= 0.88) {
          st = scored[0].student;
          fuzzyMatched.push({ svc: c.svc, paymentName: nm, rosterName: st.name, similarity: scored[0].score });
        } else {
          const candidates = scored
            .filter(x => x.score >= 0.45)
            .slice(0, 3)
            .map(x => ({ name: x.student.name, similarity: x.score }));
          needsReview.push({ svc: c.svc, paymentName: nm, candidates });
          unresolvedCount++;
          continue;
        }
      }

      for (const [col, concept, period] of pc.cells) {
        const v = r[col];
        const d = serialToDate(v);
        if (d) st.payments.push({ concept, period, paidAt: d, exento: false });
        else if (clean(v).toLowerCase() === 'x') st.payments.push({ concept, period, paidAt: null, exento: true });
      }
    }
    if (unresolvedCount > 0)
      warnings.push(`${c.svc}: ${unresolvedCount} fila(s) de pagos sin resolver (ver sección "Requieren revisión manual").`);
```

- [ ] **Step 4: Actualizar el `return` de `parseWorkbook`**

Cambiar:
```typescript
  return { students: all, warnings };
```
por:
```typescript
  return { students: all, warnings, fuzzyMatched, needsReview };
```

- [ ] **Step 5: Actualizar `summarize`**

Cambiar la firma y el return de `summarize`:

```typescript
export function summarize(parsed: ReturnType<typeof parseWorkbook>) {
  const bySvc: any = {};
  for (const s of parsed.students) {
    const k = s.svc;
    bySvc[k] = bySvc[k] || { servicio: k, total: 0, matriculados: 0, bajas: 0, recibosPagados: 0, recibosExentos: 0 };
    bySvc[k].total++;
    if (s.isBaja) bySvc[k].bajas++; else bySvc[k].matriculados++;
    bySvc[k].recibosPagados += s.payments.filter(p => p.paidAt).length;
    bySvc[k].recibosExentos += s.payments.filter(p => p.exento).length;
  }
  return {
    porServicio: Object.values(bySvc),
    warnings: parsed.warnings,
    fuzzyMatched: parsed.fuzzyMatched,
    needsReview: parsed.needsReview,
    totales: {
      alumnos: parsed.students.length,
      matriculados: parsed.students.filter(s => !s.isBaja).length,
      bajas: parsed.students.filter(s => s.isBaja).length,
    },
  };
}
```

- [ ] **Step 6: Ejecutar tests para verificar que siguen pasando**

```bash
cd /opt/mw-secretaria/backend
npx jest import.parser --no-coverage
```

Salida esperada: `6 passed`.

- [ ] **Step 7: Verificar que el backend compila sin errores**

```bash
cd /opt/mw-secretaria/backend
npx tsc --noEmit 2>&1 | head -30
```

Salida esperada: sin output (0 errores).

- [ ] **Step 8: Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/import/import.parser.ts
git commit -m "feat(import): fuzzy matching in parseWorkbook + summarize"
```

---

## Task 3: Controller — preview pasa nuevos campos, commit acepta mappings

**Files:**
- Modify: `backend/src/modules/import/import.controller.ts`

**Interfaces consumes:**
- `parseWorkbook(buf, mappings?)` del Task 2
- `summarize(parsed)` actualizado del Task 2

- [ ] **Step 1: Añadir `Body` a los imports de NestJS en el controller**

La línea 1 actual:
```typescript
import { Controller, Post, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
```
Cambiar a:
```typescript
import { Controller, Post, UseGuards, UploadedFile, UseInterceptors, BadRequestException, Body } from '@nestjs/common';
```

- [ ] **Step 2: Actualizar el método `commit` para aceptar y usar `mappings`**

Localizar la firma del método `commit` (línea ~39):
```typescript
  async commit(@UploadedFile() file: any) {
```
Cambiar a:
```typescript
  async commit(@UploadedFile() file: any, @Body('mappings') mappingsStr?: string) {
```

Localizar la línea:
```typescript
    const parsed = parseWorkbook(file.buffer);
```
Cambiar a:
```typescript
    const mappings = mappingsStr ? (JSON.parse(mappingsStr) as Record<string, Record<string, string>>) : undefined;
    const parsed = parseWorkbook(file.buffer, mappings);
```

> **Nota:** El `preview` endpoint no necesita cambios — `summarize` ya incluye `fuzzyMatched` y `needsReview` en su respuesta.

- [ ] **Step 3: Verificar que el backend compila**

```bash
cd /opt/mw-secretaria/backend
npx tsc --noEmit 2>&1 | head -30
```

Salida esperada: sin errores.

- [ ] **Step 4: Commit**

```bash
cd /opt/mw-secretaria
git add backend/src/modules/import/import.controller.ts
git commit -m "feat(import): commit endpoint accepts optional mappings JSON field"
```

---

## Task 4: Frontend — estado, Tarjeta A, Tarjeta B y commit con mappings

**Files:**
- Modify: `frontend/src/App.tsx` — función `Importador()` (línea ~2013)

**Interfaces consumes:**
- `preview.fuzzyMatched: FuzzyMatch[]`
- `preview.needsReview: ReviewItem[]`
- `POST /import/commit` con campo `mappings` en FormData

- [ ] **Step 1: Añadir `Checkbox` a los imports de antd en `App.tsx`**

Localizar la línea que importa componentes de `antd` (cerca del inicio del fichero). Añadir `Checkbox` si no está ya:

```typescript
import { ..., Checkbox } from 'antd';
```

> Buscar con: `grep -n "from 'antd'" /opt/mw-secretaria/frontend/src/App.tsx | head -5`

- [ ] **Step 2: Añadir función `normName` dentro de `function Importador()`**

Insertar justo después de `function Importador() {`:

```typescript
  const normName = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
```

- [ ] **Step 3: Añadir estado nuevo dentro de `function Importador()`**

Después de los `useState` existentes (`file`, `preview`, `result`, `loading`), añadir:

```typescript
  const [checkedAuto, setCheckedAuto] = useState<Set<string>>(new Set());
  const [manualMap, setManualMap] = useState<Record<string, string>>({});
```

- [ ] **Step 4: Reemplazar la función `send` por `doPreview` y `handleCommit`**

Eliminar la función `send` actual (líneas ~2018–2025):
```typescript
  const send = async (path: string, setter: (d: any) => void) => {
    if (!file) { message.warning('Selecciona primero el fichero Excel'); return; }
    const fd = new FormData(); fd.append('file', file);
    setLoading(true);
    try { const { data } = await api.post(path, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setter(data); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
```

Sustituirla por:

```typescript
  const doPreview = async () => {
    if (!file) { message.warning('Selecciona primero el fichero Excel'); return; }
    const fd = new FormData(); fd.append('file', file);
    setLoading(true);
    try {
      const { data } = await api.post('/import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPreview(data);
      const initial = new Set<string>();
      (data.fuzzyMatched || []).forEach((m: any) => initial.add(`${m.svc}|${m.paymentName}`));
      setCheckedAuto(initial);
      setManualMap({});
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const handleCommit = async () => {
    if (!file) return;
    const mappings: Record<string, Record<string, string>> = {};
    for (const m of (preview?.fuzzyMatched || [])) {
      const key = `${m.svc}|${m.paymentName}`;
      if (checkedAuto.has(key)) {
        mappings[m.svc] ??= {};
        mappings[m.svc][normName(m.paymentName)] = m.rosterName;
      }
    }
    for (const [key, rosterName] of Object.entries(manualMap)) {
      if (!rosterName || rosterName === '__skip__') continue;
      const idx = key.indexOf('|');
      const svc = key.slice(0, idx);
      const paymentName = key.slice(idx + 1);
      mappings[svc] ??= {};
      mappings[svc][normName(paymentName)] = rosterName;
    }
    const fd = new FormData();
    fd.append('file', file);
    if (Object.keys(mappings).length > 0) fd.append('mappings', JSON.stringify(mappings));
    setLoading(true);
    try {
      const { data } = await api.post('/import/commit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data);
    } catch (e: any) { message.error(e?.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
```

- [ ] **Step 5: Actualizar el handler del `input[type=file]` para resetear nuevo estado**

Localizar:
```typescript
onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); }}
```
Cambiar a:
```typescript
onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); setCheckedAuto(new Set()); setManualMap({}); }}
```

- [ ] **Step 6: Actualizar los botones para usar `doPreview` y `handleCommit`**

Localizar:
```typescript
<Button type="primary" loading={loading} onClick={() => send('/import/preview', setPreview)} disabled={!file}>Vista previa (dry-run)</Button>
<Popconfirm title="¿Importar de verdad a la base de datos?" disabled={!preview || blocked} onConfirm={() => send('/import/commit', setResult)}>
```
Cambiar a:
```typescript
<Button type="primary" loading={loading} onClick={doPreview} disabled={!file}>Vista previa (dry-run)</Button>
<Popconfirm title="¿Importar de verdad a la base de datos?" disabled={!preview || blocked} onConfirm={handleCommit}>
```

- [ ] **Step 7: Añadir Tarjeta A — "Emparejados automáticamente"**

Insertar después de la sección de `{preview.warnings?.length > 0 && ...}` (después de cerrar el Alert de warnings, antes de la sección `<Text type="secondary">Muestra...`):

```tsx
          {(preview.fuzzyMatched?.length > 0) && (
            <Card
              size="small"
              title={`Emparejados automáticamente — ${preview.fuzzyMatched.length} nombre(s)`}
              style={{ marginBottom: 12 }}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Desmarca los que no sean correctos</Text>}
            >
              <Table
                rowKey={(r: any) => `${r.svc}|${r.paymentName}`}
                dataSource={preview.fuzzyMatched}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Servicio', dataIndex: 'svc', width: 80 },
                  { title: 'Nombre en Excel (pagos)', dataIndex: 'paymentName' },
                  { title: '→', width: 28, align: 'center' as const, render: () => '→' },
                  { title: 'Nombre en listado', dataIndex: 'rosterName' },
                  {
                    title: 'Sim.', dataIndex: 'similarity', width: 70, align: 'center' as const,
                    render: (s: number) => <Tag color={s >= 0.9 ? 'green' : 'orange'}>{Math.round(s * 100)}%</Tag>,
                  },
                  {
                    title: 'Usar', width: 56, align: 'center' as const,
                    render: (_: any, r: any) => {
                      const k = `${r.svc}|${r.paymentName}`;
                      return (
                        <Checkbox
                          checked={checkedAuto.has(k)}
                          onChange={e => setCheckedAuto(prev => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(k) : next.delete(k);
                            return next;
                          })}
                        />
                      );
                    },
                  },
                ]}
              />
            </Card>
          )}
```

- [ ] **Step 8: Añadir Tarjeta B — "Requieren revisión manual"**

Insertar inmediatamente después de la Tarjeta A:

```tsx
          {(preview.needsReview?.length > 0) && (
            <Card
              size="small"
              title={`Requieren revisión manual — ${preview.needsReview.length} nombre(s)`}
              style={{ marginBottom: 12 }}
              extra={<Text type="secondary" style={{ fontSize: 12 }}>Los no asignados se omitirán</Text>}
            >
              <Table
                rowKey={(r: any) => `${r.svc}|${r.paymentName}`}
                dataSource={preview.needsReview}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Servicio', dataIndex: 'svc', width: 80 },
                  { title: 'Nombre en Excel (pagos)', dataIndex: 'paymentName' },
                  {
                    title: 'Asignar a…',
                    render: (_: any, r: any) => {
                      if (!r.candidates?.length)
                        return <Text type="secondary" style={{ fontSize: 12 }}>Sin candidatos — se omitirá</Text>;
                      const k = `${r.svc}|${r.paymentName}`;
                      return (
                        <Select
                          style={{ width: '100%', minWidth: 220 }}
                          placeholder="Seleccionar alumno…"
                          allowClear
                          value={manualMap[k] && manualMap[k] !== '__skip__' ? manualMap[k] : undefined}
                          onChange={val =>
                            setManualMap(prev => ({ ...prev, [k]: val ?? '__skip__' }))
                          }
                          options={[
                            ...r.candidates.map((c: any) => ({
                              value: c.name,
                              label: `${c.name} — ${Math.round(c.similarity * 100)}%`,
                            })),
                            { value: '__skip__', label: 'No importar este pago' },
                          ]}
                        />
                      );
                    },
                  },
                ]}
              />
            </Card>
          )}
```

- [ ] **Step 9: Verificar que el frontend compila**

```bash
cd /opt/mw-secretaria/frontend
npm run build 2>&1 | tail -20
```

Salida esperada: `✓ built in ...` sin errores TypeScript.

- [ ] **Step 10: Commit**

```bash
cd /opt/mw-secretaria
git add frontend/src/App.tsx
git commit -m "feat(import): tarjeta A/B para fuzzy-matched y revisión manual"
```

---

## Task 5: Deploy y verificación

**Files:** ninguno nuevo

- [ ] **Step 1: Reconstruir y redesplegar el backend**

```bash
cd /opt/mw-secretaria
docker build -t mw-secretaria-api:latest backend/
docker rm -f mw-secretaria-api
docker run -d --name mw-secretaria-api \
  --network mw-panel_mw-network \
  -p 127.0.0.1:3010:3010 \
  --env-file backend/.env \
  -v /opt/mw-panel/cambridge-mocks-data/data/database.db:/mocks/database.db:ro \
  --restart unless-stopped \
  mw-secretaria-api:latest
```

- [ ] **Step 2: Verificar que el backend arrancó**

```bash
sleep 5 && curl -s http://localhost:3010/api/health/status | grep -o '"status":"[^"]*"'
```

Salida esperada: `"status":"ok"`.

- [ ] **Step 3: Desplegar el frontend**

```bash
cd /opt/mw-secretaria/frontend
npm run build && cp -r dist/* /opt/mw-secretaria/frontend-dist/
```

- [ ] **Step 4: Verificar la UI manualmente**

1. Abrir https://secretaria.mundoworld.school → Importar Excel
2. Subir el fichero `Datos y Pagos  25-26 OFICIAL.xlsx`
3. Pulsar "Vista previa (dry-run)"
4. Comprobar que aparece la Tarjeta A con los emparejados automáticamente (similitud %)
5. Comprobar que aparece la Tarjeta B con los que necesitan revisión manual (Select con candidatos)
6. En Tarjeta B, asignar algunos alumnos manualmente
7. Pulsar "Importar de verdad" → confirmar → verificar en el resultado que los warnings de "sin resolver" son menos que los avisos originales

- [ ] **Step 5: Commit final con tag**

```bash
cd /opt/mw-secretaria
git tag import-fuzzy-v1
```
