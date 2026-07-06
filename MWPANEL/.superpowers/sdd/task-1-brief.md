# Task 1: Fix E1 — criterion-knowledge candidates endpoint (backend + frontend + tests + git)

## Overview
This is a self-contained fix that closes the "E1" gap in the curricular connection feature.
The admin curation screen (`CriterionKnowledgeMap.tsx`) has a broken "Añadir saber manual"
flow: it calls `GET /competencies/search` which doesn't exist. The fix replaces it with a
proper endpoint `GET /criterion-knowledge/candidates/:criterionId` that reuses the already-built
`CandidatePoolService`.

---

## BACKEND

### File 1: `src/modules/criterion-knowledge/services/criterion-knowledge.service.ts`

Inject `CandidatePoolService` into the constructor (it's already a provider/export of the same
module). Import it from `./candidate-pool.service`. Add this method:

```ts
async getCandidatesForLinking(criterionId: string): Promise<{ id: string; code: string; title: string; block: string }[]> {
  const candidates = await this.pool.getCandidates(criterionId); // returns BasicKnowledge[]
  const linked = await this.linkRepo.find({ where: { evaluationCriterionId: criterionId } });
  const linkedIds = new Set(linked.map((l) => l.basicKnowledgeId));
  return candidates
    .filter((c) => !linkedIds.has(c.id))
    .map((c) => ({ id: c.id, code: (c as any).code, title: (c as any).title, block: (c as any).block }));
}
```

The injected pool property should be named `pool` (private, using `CandidatePoolService`).
The link repo is already in the constructor as `linkRepo` (type `Repository<CriterionBasicKnowledge>`).

Current constructor (read from file):
```ts
constructor(
  @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
  @InjectRepository(EvaluationCriterion) private readonly criterionRepo: Repository<EvaluationCriterion>,
  @InjectRepository(SpecificCompetency) private readonly specCompRepo: Repository<SpecificCompetency>,
) {}
```

New constructor should add `CandidatePoolService` as a fourth param (no `@InjectRepository` — it's
a plain service injection):
```ts
constructor(
  @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
  @InjectRepository(EvaluationCriterion) private readonly criterionRepo: Repository<EvaluationCriterion>,
  @InjectRepository(SpecificCompetency) private readonly specCompRepo: Repository<SpecificCompetency>,
  private readonly pool: CandidatePoolService,
) {}
```

### File 2: `src/modules/criterion-knowledge/criterion-knowledge.controller.ts`

Add a new GET endpoint. It must NOT clash with the existing `GET 'criterion/:criterionId'`.
Add this after the existing `getForCriterion` handler:

```ts
@Get('candidates/:criterionId')
@Roles(UserRole.ADMIN)
getCandidates(@Param('criterionId') criterionId: string) {
  return this.service.getCandidatesForLinking(criterionId);
}
```

Import `Param` is already imported. No module changes needed — `CandidatePoolService` is already
in providers/exports of `CriterionKnowledgeModule`.

### File 3: `src/modules/criterion-knowledge/services/__tests__/criterion-knowledge.service.spec.ts`

Add a 4th test case. The existing `build` helper creates a test module — update it to also provide
a mock for `CandidatePoolService`. Since `CandidatePoolService` is now a constructor dependency,
the test module needs it as a provider.

Update the `build` helper's `providers` array to add:
```ts
{ provide: CandidatePoolService, useValue: repos.pool }
```

(Import `CandidatePoolService` from `../candidate-pool.service`.)

Then add the new test:
```ts
it('getCandidatesForLinking excluye saberes ya enlazados y mapea {id,code,title,block}', async () => {
  const allCandidates = [
    { id: 'k1', code: 'A.1', title: 'Saber uno', block: 'Bloque 1' },
    { id: 'k2', code: 'A.2', title: 'Saber dos', block: 'Bloque 1' },
    { id: 'k3', code: 'A.3', title: 'Saber tres', block: 'Bloque 2' },
  ];
  const repos = {
    link: {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([{ basicKnowledgeId: 'k2' }]), // k2 already linked
    },
    criterion: {},
    spec: {},
    pool: { getCandidates: jest.fn().mockResolvedValue(allCandidates) },
  };
  const svc = await build(repos);
  const result = await svc.getCandidatesForLinking('c1');
  expect(result).toHaveLength(2);
  expect(result.find((r) => r.id === 'k2')).toBeUndefined(); // excluded
  expect(result).toEqual(expect.arrayContaining([
    { id: 'k1', code: 'A.1', title: 'Saber uno', block: 'Bloque 1' },
    { id: 'k3', code: 'A.3', title: 'Saber tres', block: 'Bloque 2' },
  ]));
});
```

**IMPORTANT:** The existing 3 tests use `build` without a `pool` key in `repos`. After you add
`repos.pool` to the `build` helper, the existing tests will fail because `repos.pool` is undefined.
Fix this by making `pool` default to `{ getCandidates: jest.fn() }` in the build helper when not
provided, OR by adding `pool: {}` to each existing test's repos object.

Run the spec:
```bash
npx jest src/modules/criterion-knowledge/services/__tests__/criterion-knowledge.service.spec.ts --runInBand
```
All 4 tests must be green.

Also run TypeScript check (criterion-knowledge files only):
```bash
cd /opt/mw-panel/backend && npx tsc --noEmit 2>&1 | grep -i "criterion-knowledge" || echo "NO_CK_ERRORS"
```

---

## FRONTEND

### File 4: `src/services/criterionKnowledgeService.ts`

Add `getCandidates` to the exported object. Use the existing `base` const and `apiClient`.
The return type is `{ id: string; code: string; title: string; block: string }[]`.

Add after `getForCriterion`:
```ts
getCandidates: (criterionId: string) =>
  apiClient.get<{ id: string; code: string; title: string; block: string }[]>(`${base}/candidates/${criterionId}`).then((r) => r.data),
```

### File 5: `src/pages/admin/CriterionKnowledgeMap.tsx`

The current broken flow:
- A single shared `knowledgeOptions: BasicKnowledgeOption[]` state + `loadKnowledgeOptions(search)` that calls the non-existent `/competencies/search`.
- A shared Select that uses `onSearch={loadKnowledgeOptions}` and `filterOption={false}`.

Replace this with a per-criterion candidate-loading pattern:

1. **Remove** the shared `knowledgeOptions` state, `loadingKnowledge` state, and the `loadKnowledgeOptions` function entirely.
2. **Add** per-criterion candidates state:
   ```ts
   const [candidatesMap, setCandidatesMap] = useState<Record<string, { id: string; code: string; title: string; block: string }[]>>({});
   const [loadingCandidates, setLoadingCandidates] = useState<Record<string, boolean>>({});
   ```
3. **Add** a loader function:
   ```ts
   const loadCandidates = async (criterionId: string) => {
     if (candidatesMap[criterionId]) return; // already loaded
     setLoadingCandidates((prev) => ({ ...prev, [criterionId]: true }));
     try {
       const items = await criterionKnowledgeService.getCandidates(criterionId);
       setCandidatesMap((prev) => ({ ...prev, [criterionId]: items }));
     } catch {
       // silent
     } finally {
       setLoadingCandidates((prev) => ({ ...prev, [criterionId]: false }));
     }
   };
   ```
4. **Update** the `renderKnowledge` function's Select to:
   - Use `onDropdownVisibleChange={(open) => open && loadCandidates(r.criterion.id)}` to load on open
   - Use `loading={loadingCandidates[r.criterion.id]}` 
   - Use `options={(candidatesMap[r.criterion.id] || []).map((k) => ({ value: k.id, label: \`${k.code} ${k.title}\` }))}`
   - Use `showSearch` with `filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}` for local filtering
   - Remove `filterOption={false}` and `onSearch={loadKnowledgeOptions}`
   - Keep `allowClear`, `size="small"`, `placeholder="Añadir saber…"`, `style={{ width: 180 }}`
   - Keep `value={manualAdd[r.criterion.id]}` and `onChange`

5. **Also update** `handleManualLink` — currently it calls `criterionKnowledgeService.linkManual` and then `load()`. That's fine; keep it as-is. BUT also invalidate the candidates cache for that criterion after linking so the linked item disappears from the dropdown:
   ```ts
   setCandidatesMap((prev) => {
     const { [criterionId]: _, ...rest } = prev;
     return rest;
   });
   ```

6. **Remove** the unused `BasicKnowledgeOption` interface and the `Input` import if it's no longer used.

Keep all the rest of the component exactly as-is (subject/scope selects, table, suggest button, status actions, etc.).

### File 6: `src/pages/admin/__tests__/CriterionKnowledgeMap.test.tsx`

The mock must include `getCandidates`:
```ts
getCandidates: vi.fn().mockResolvedValue([]),
```
Add it to the existing mock object alongside `getMap`, `suggest`, etc.

Run the test:
```bash
cd /opt/mw-panel/frontend && npx vitest run src/pages/admin/__tests__/CriterionKnowledgeMap.test.tsx
```
Must be green.

Then run build:
```bash
cd /opt/mw-panel/frontend && npm run build 2>&1 | tail -20
```
Must complete without TypeScript or import errors in the changed files.

---

## GIT COMMIT

Stage only the changed files (NEVER `git add -A`):
```bash
git -C /opt/mw-panel add \
  backend/src/modules/criterion-knowledge/services/criterion-knowledge.service.ts \
  backend/src/modules/criterion-knowledge/services/__tests__/criterion-knowledge.service.spec.ts \
  backend/src/modules/criterion-knowledge/criterion-knowledge.controller.ts \
  frontend/src/services/criterionKnowledgeService.ts \
  frontend/src/pages/admin/CriterionKnowledgeMap.tsx \
  frontend/src/pages/admin/__tests__/CriterionKnowledgeMap.test.tsx
```

Commit with message:
```
fix(criterion-knowledge): añadir endpoint GET candidates/:criterionId y reparar selector manual en CriterionKnowledgeMap

- Backend: CandidatePoolService inyectado en CriterionKnowledgeService; método getCandidatesForLinking filtra los ya enlazados
- Backend: nuevo endpoint GET /criterion-knowledge/candidates/:criterionId (ADMIN)
- Frontend: criterionKnowledgeService.getCandidates; CriterionKnowledgeMap carga candidatos por criterio al abrir el Select
- Tests: spec backend 4/4, vitest frontend verde, build limpio
```

---

## REPORT FILE
Write your full report to: `/opt/mw-panel/.superpowers/sdd/task-1-report.md`
