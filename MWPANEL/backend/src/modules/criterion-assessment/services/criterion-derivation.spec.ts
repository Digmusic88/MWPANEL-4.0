import { CriterionDerivationService } from './criterion-derivation.service';

const repo = (rows: any[] = []) => ({
  find: jest.fn().mockResolvedValue(rows),
  findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve(x)),
  createQueryBuilder: jest.fn(() => ({ innerJoin: () => ({ where: () => ({ getMany: async () => [] }) }), leftJoin() { return this; }, where() { return this; }, andWhere() { return this; }, getOne: async () => null })),
});

function build(teacherId: string | null, trimester: any) {
  const caRepo = repo();
  const saRepo = repo([{ id: 'sa1', academicYear: { id: 'ay1' }, teacherId }]);
  const epRepo: any = { findOne: jest.fn().mockResolvedValue(trimester), createQueryBuilder: repo().createQueryBuilder };
  const svc = new CriterionDerivationService(
    caRepo as any, saRepo as any, epRepo as any,
    repo() as any, repo() as any, repo() as any, repo() as any, repo() as any,
    { getEffectiveConfig: jest.fn().mockResolvedValue({ scaleType: 'levels3', numericMax: 10, levelMapping: { NOT_ACHIEVED: 0, IN_PROGRESS: 50, ACHIEVED: 100 } }) } as any,
  );
  return { svc, caRepo };
}

describe('CriterionDerivationService', () => {
  it('no inserta marca derivada si la asignatura no tiene teacherId', async () => {
    const { svc, caRepo } = build(null, { id: 'T1' });
    await svc.deriveForWork({ studentId: 's1', subjectAssignmentId: 'sa1', criterionIds: ['c1'], referenceDate: new Date('2026-10-15') } as any);
    expect(caRepo.save).not.toHaveBeenCalled();
  });
  it('omite si no resuelve trimestre para la fecha', async () => {
    const { svc, caRepo } = build('t1', null);
    await svc.deriveForWork({ studentId: 's1', subjectAssignmentId: 'sa1', criterionIds: ['c1'], referenceDate: new Date('2026-10-15') } as any);
    expect(caRepo.save).not.toHaveBeenCalled();
  });

  it('deriva y guarda la marca en el trimestre resuelto', async () => {
    const caRepo = repo();
    const saRepo = repo([{ id: 'sa1', academicYear: { id: 'ay1' }, teacherId: 't1' }]);
    const qb = { leftJoin() { return this; }, where() { return this; }, andWhere() { return this; }, getOne: async () => ({ id: 'T2' }) };
    const epRepo: any = { findOne: jest.fn(), createQueryBuilder: () => qb };
    const svc = new CriterionDerivationService(
      caRepo as any, saRepo as any, epRepo as any,
      repo() as any, repo() as any, repo() as any, repo() as any, repo() as any,
      { getEffectiveConfig: jest.fn().mockResolvedValue({ scaleType: 'levels3', numericMax: 10, levelMapping: { NOT_ACHIEVED: 0, IN_PROGRESS: 50, ACHIEVED: 100 } }) } as any,
    );
    jest.spyOn(svc as any, 'gatherScores').mockResolvedValue([80]);
    await svc.deriveForWork({ studentId: 's1', subjectAssignmentId: 'sa1', criterionIds: ['c1'], referenceDate: new Date('2026-12-15') } as any);
    expect(caRepo.save).toHaveBeenCalled();
    const saved = (caRepo.save as jest.Mock).mock.calls[0][0];
    expect(saved.evaluationPeriodId).toBe('T2');
    expect(saved.source).toBe('derived');
    expect(saved.teacherId).toBe('t1');
  });

  it('no pisa una fila derivada de saberes (derived_saber): deriveForWork la deja intacta', async () => {
    const caRepo = repo([{ id: 'x', source: 'derived_saber' }]);
    const saRepo = repo([{ id: 'sa1', academicYear: { id: 'ay1' }, teacherId: 't1' }]);
    const qb = { leftJoin() { return this; }, where() { return this; }, andWhere() { return this; }, getOne: async () => ({ id: 'T2' }) };
    const epRepo: any = { findOne: jest.fn(), createQueryBuilder: () => qb };
    const svc = new CriterionDerivationService(
      caRepo as any, saRepo as any, epRepo as any,
      repo() as any, repo() as any, repo() as any, repo() as any, repo() as any,
      { getEffectiveConfig: jest.fn().mockResolvedValue({ scaleType: 'levels3', numericMax: 10, levelMapping: { NOT_ACHIEVED: 0, IN_PROGRESS: 50, ACHIEVED: 100 } }) } as any,
    );
    jest.spyOn(svc as any, 'gatherScores').mockResolvedValue([80]);
    await svc.deriveForWork({ studentId: 's1', subjectAssignmentId: 'sa1', criterionIds: ['c1'], referenceDate: new Date('2026-12-15') } as any);
    expect(caRepo.save).not.toHaveBeenCalled();
  });
});
