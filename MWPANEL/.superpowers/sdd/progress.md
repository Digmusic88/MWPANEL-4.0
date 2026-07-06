# Fix E1: criterion-knowledge candidates endpoint

BRANCH_BASE: 4e4890e7c0e46837df4a739f2af5c52d64474a12

## Tasks
- [ ] Task 1: Backend - add getCandidatesForLinking + controller endpoint + test
- [ ] Task 2: Frontend - add getCandidates to service + fix CriterionKnowledgeMap
- [ ] Task 3: Git commit

## Ledger
Task 1: complete (commit 4e4890e..c116137, review clean - spec ✅, quality Approved)

## Minor findings deferred to final review
- loadCandidates silent catch: no user feedback on network error (spec said "silent"; admin-only)
- service.ts (c as any).code/title/block casts: matches existing getConfirmedForCriterion pattern, pre-existing smell
- loadCandidates early-return prevents retry after failed load (null-sentinel would fix)
- unused findOne in new test's link mock (harmless noise)
