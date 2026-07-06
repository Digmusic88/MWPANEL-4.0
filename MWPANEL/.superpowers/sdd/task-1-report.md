# Task 1 Report — fix(criterion-knowledge): E1 gap closed

## Status: DONE

## Commit
- `c116137` — fix(criterion-knowledge): añadir endpoint GET candidates/:criterionId y reparar selector manual en CriterionKnowledgeMap

## Changes made

### Backend

**`services/criterion-knowledge.service.ts`**
- Added `import { CandidatePoolService } from './candidate-pool.service'`
- Added `private readonly pool: CandidatePoolService` as 4th constructor param (plain DI, no `@InjectRepository`)
- Added `getCandidatesForLinking(criterionId)`: calls `pool.getCandidates`, fetches existing links, filters already-linked ids, maps to `{id, code, title, block}`

**`criterion-knowledge.controller.ts`**
- Added `@Get('candidates/:criterionId')` endpoint after `getForCriterion`
- Guard: `@Roles(UserRole.ADMIN)`
- Delegates to `service.getCandidatesForLinking(criterionId)`
- Route does NOT clash with existing `criterion/:criterionId` route

**`services/__tests__/criterion-knowledge.service.spec.ts`**
- Added `import { CandidatePoolService } from '../candidate-pool.service'`
- Updated `build` helper to provide `CandidatePoolService` mock, defaulting to `{ getCandidates: jest.fn() }` when `repos.pool` is not supplied (preserves existing 3 tests without modification)
- Added 4th test: `getCandidatesForLinking excluye saberes ya enlazados y mapea {id,code,title,block}`

### Frontend

**`services/criterionKnowledgeService.ts`**
- Added `getCandidates` method: `GET /criterion-knowledge/candidates/:criterionId` returning `{id, code, title, block}[]`

**`pages/admin/CriterionKnowledgeMap.tsx`**
- Removed: `Input`, `Spin` imports (unused after refactor)
- Removed: `BasicKnowledgeOption` interface
- Removed: `knowledgeOptions` state, `loadingKnowledge` state, `loadKnowledgeOptions` function (called non-existent `/competencies/search`)
- Added: `candidatesMap: Record<string, {id,code,title,block}[]>` state
- Added: `loadingCandidates: Record<string, boolean>` state
- Added: `loadCandidates(criterionId)` — loads on first open, skips if already cached
- Updated `handleManualLink`: invalidates `candidatesMap[criterionId]` after linking so the dropdown refreshes on next open
- Updated Select in `renderKnowledge`:
  - `onDropdownVisibleChange={(open) => open && loadCandidates(r.criterion.id)}`
  - `loading={loadingCandidates[r.criterion.id]}`
  - `options={(candidatesMap[r.criterion.id] || []).map(...)}`
  - `filterOption` uses local string match (replaces `filterOption={false}` + `onSearch`)

**`pages/admin/__tests__/CriterionKnowledgeMap.test.tsx`**
- Added `getCandidates: vi.fn().mockResolvedValue([])` to mock object

## Test results

| Suite | Result |
|-------|--------|
| Backend Jest (4 tests) | PASS 4/4 |
| TypeScript check (criterion-knowledge) | NO_CK_ERRORS |
| Frontend Vitest (1 test) | PASS 1/1 |
| Frontend build | ✓ built in 32.21s (clean) |

## Concerns

None. All 4 suites green, build clean, 6 files only staged.
