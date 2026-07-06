import { CriterionRollupService } from './criterion-rollup.service';

function caRepoMock(existing: any[] = []) {
  const store = [...existing];
  return {
    find: jest.fn(async () => [...store]),
    save: jest.fn(async (r: any) => r),
    delete: jest.fn(async () => ({ affected: 1 })),
    create: jest.fn((r: any) => ({ ...r })),
  } as any;
}

describe('rollupForStudentCriteria', () => {
  const linkRepo = { find: jest.fn(async () => [{ evaluationCriterionId: 'C1', basicKnowledgeId: 'K1' }]) } as any;
  const wbkaSvc = { saberStateValuesForCriteria: jest.fn(async () => new Map([['C1', [2]]])) } as any; // saber K1 = ACHIEVED
  const derivation = { gatherScores: jest.fn(async () => [40]) } as any;                                   // nota 40 → estado 0
  const saRepo = { findOne: jest.fn(async () => ({ id: 'SA', teacherId: 'T' })) } as any;
  const applicable = { getForAssignment: jest.fn(async () => ({ groups: [] })) } as any;

  it('escribe derived_saber con la media de saberes+notas', async () => {
    const caRepo = caRepoMock([]);
    const svc = new CriterionRollupService(caRepo, linkRepo, saRepo, wbkaSvc, derivation, applicable);
    const writes = await svc.rollupForStudentCriteria('S', 'SA', ['C1'], 'P', 'T');
    // saber [2] + nota 40 (0) → media 1 → IN_PROGRESS (50)
    expect(caRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      evaluationCriterionId: 'C1', source: 'derived_saber', levelValue: 'IN_PROGRESS', normalizedScore: 50,
    }));
    expect(writes).toBe(1);
  });

  it('respeta una fila manual (no la pisa)', async () => {
    const caRepo = caRepoMock([{ id: 'x', studentId: 'S', evaluationCriterionId: 'C1', evaluationPeriodId: 'P', source: 'manual' }]);
    const svc = new CriterionRollupService(caRepo, linkRepo, saRepo, wbkaSvc, derivation, applicable);
    await svc.rollupForStudentCriteria('S', 'SA', ['C1'], 'P', 'T');
    expect(caRepo.save).not.toHaveBeenCalled();
    expect(caRepo.delete).not.toHaveBeenCalled();
  });
});

describe('rollupForWork', () => {
  const linkRepo = { find: jest.fn(async () => [{ evaluationCriterionId: 'C1', basicKnowledgeId: 'K1' }]) } as any;
  const derivation = { gatherScores: jest.fn(async () => [40]) } as any;
  const applicable = { getForAssignment: jest.fn(async () => ({ groups: [] })) } as any;

  it('resuelve periodo y teacherId y delega en rollupForStudentCriteria (nota entra vía saberStateValuesForCriteria/gatherScores)', async () => {
    const caRepo = caRepoMock([]);
    const wbkaSvc = {
      resolvePeriodId: jest.fn(async () => 'P'),
      saberStateValuesForCriteria: jest.fn(async () => new Map([['C1', [2]]])),
    } as any;
    const saRepo = { findOne: jest.fn(async () => ({ id: 'SA', teacherId: 'T' })) } as any;
    const svc = new CriterionRollupService(caRepo, linkRepo, saRepo, wbkaSvc, derivation, applicable);

    await svc.rollupForWork({ studentId: 'S', subjectAssignmentId: 'SA', criterionIds: ['C1'], referenceDate: new Date() });

    expect(wbkaSvc.resolvePeriodId).toHaveBeenCalledWith('SA', expect.any(Date));
    expect(caRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      evaluationCriterionId: 'C1', source: 'derived_saber',
    }));
  });

  it('no escribe nada si no puede resolver el periodo (fail-soft)', async () => {
    const caRepo = caRepoMock([]);
    const wbkaSvc = { resolvePeriodId: jest.fn(async () => null), saberStateValuesForCriteria: jest.fn() } as any;
    const saRepo = { findOne: jest.fn(async () => ({ id: 'SA', teacherId: 'T' })) } as any;
    const svc = new CriterionRollupService(caRepo, linkRepo, saRepo, wbkaSvc, derivation, applicable);

    await svc.rollupForWork({ studentId: 'S', subjectAssignmentId: 'SA', criterionIds: ['C1'], referenceDate: new Date() });

    expect(caRepo.save).not.toHaveBeenCalled();
  });

  it('no escribe nada si la asignatura no tiene teacherId (fail-soft)', async () => {
    const caRepo = caRepoMock([]);
    const wbkaSvc = { resolvePeriodId: jest.fn(async () => 'P'), saberStateValuesForCriteria: jest.fn() } as any;
    const saRepo = { findOne: jest.fn(async () => ({ id: 'SA' })) } as any; // sin teacherId
    const svc = new CriterionRollupService(caRepo, linkRepo, saRepo, wbkaSvc, derivation, applicable);

    await svc.rollupForWork({ studentId: 'S', subjectAssignmentId: 'SA', criterionIds: ['C1'], referenceDate: new Date() });

    expect(caRepo.save).not.toHaveBeenCalled();
  });
});

describe('rollupForAssignment', () => {
  const linkRepo = { find: jest.fn(async () => [{ evaluationCriterionId: 'C1', basicKnowledgeId: 'K1' }]) } as any;
  const wbkaSvc = { saberStateValuesForCriteria: jest.fn(async () => new Map([['C1', [2]]])) } as any;
  const derivation = { gatherScores: jest.fn(async () => [40]) } as any;
  const saRepo = { findOne: jest.fn(async () => ({ id: 'SA', teacherId: 'T' })) } as any;
  // Mismo shape que consume rollupForAssignment: groups[].criteria[].id
  const applicable = { getForAssignment: jest.fn(async () => ({ groups: [{ criteria: [{ id: 'C1' }] }] })) } as any;

  it('resuelve los criterios aplicables via ApplicableCriteriaService y procesa a TODOS los alumnos', async () => {
    const caRepo = caRepoMock([]);
    const svc = new CriterionRollupService(caRepo, linkRepo, saRepo, wbkaSvc, derivation, applicable);
    const spy = jest.spyOn(svc, 'rollupForStudentCriteria');

    const writes = await svc.rollupForAssignment('SA', 'P', 'T', ['studentA', 'studentB']);

    expect(applicable.getForAssignment).toHaveBeenCalledWith('SA');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 'studentA', 'SA', ['C1'], 'P', 'T');
    expect(spy).toHaveBeenNthCalledWith(2, 'studentB', 'SA', ['C1'], 'P', 'T');
    // Cada alumno escribe su propia fila derived_saber → 2 saves totales, writes=2
    expect(caRepo.save).toHaveBeenCalledTimes(2);
    expect(writes).toBe(2);
  });
});
