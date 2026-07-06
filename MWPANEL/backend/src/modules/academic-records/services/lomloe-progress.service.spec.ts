import { LomloeProgressService } from './lomloe-progress.service';

describe('LomloeProgressService.normalizeToState', () => {
  const n = LomloeProgressService.normalizeToState;

  it('levels3 con levelValue válido → usa levelValue', () => {
    expect(n('levels3', 'ACHIEVED', 100)).toBe('ACHIEVED');
    expect(n('levels3', 'IN_PROGRESS', 55)).toBe('IN_PROGRESS');
    expect(n('levels3', 'NOT_ACHIEVED', 0)).toBe('NOT_ACHIEVED');
  });

  it('numeric por umbral 50/80', () => {
    expect(n('numeric', null, 49)).toBe('NOT_ACHIEVED');
    expect(n('numeric', null, 50)).toBe('IN_PROGRESS');
    expect(n('numeric', null, 79)).toBe('IN_PROGRESS');
    expect(n('numeric', null, 80)).toBe('ACHIEVED');
    expect(n('numeric', null, 100)).toBe('ACHIEVED');
  });

  it('levels3 con levelValue inválido cae a normalizedScore', () => {
    expect(n('levels3', 'WEIRD', 85)).toBe('ACHIEVED');
  });

  it('sin datos → null', () => {
    expect(n('numeric', null, null)).toBeNull();
    expect(n(null, null, null)).toBeNull();
  });
});

describe('LomloeProgressService.getProgress', () => {
  it('agrupa criterios por asignatura con estados por trimestre y saberes CONFIRMED', async () => {
    // periodos: T1=p1, T2=p2, T3=p3
    const epQb = {
      leftJoin: () => epQb, where: () => epQb, andWhere: () => epQb, orderBy: () => epQb,
      getMany: async () => [
        { id: 'p1', type: 'trimester_1', startDate: new Date('2025-09-01') },
        { id: 'p2', type: 'trimester_2', startDate: new Date('2026-01-01') },
        { id: 'p3', type: 'trimester_3', startDate: new Date('2026-04-01') },
      ],
    };
    const epRepo: any = { createQueryBuilder: () => epQb };
    const caRepo: any = { find: jest.fn().mockResolvedValue([
      { evaluationCriterionId: 'c1', subjectAssignmentId: 'sa1', evaluationPeriodId: 'p1', scaleType: 'levels3', levelValue: 'IN_PROGRESS', normalizedScore: 50, source: 'manual', updatedAt: new Date() },
      { evaluationCriterionId: 'c1', subjectAssignmentId: 'sa1', evaluationPeriodId: 'p2', scaleType: 'levels3', levelValue: 'ACHIEVED', normalizedScore: 100, source: 'derived_saber', updatedAt: new Date() },
    ]) };
    const bkaRepo: any = { find: jest.fn().mockResolvedValue([
      { basicKnowledgeId: 'k1', evaluationPeriodId: 'p2', scaleType: 'levels3', levelValue: 'ACHIEVED', normalizedScore: 100 },
    ]) };
    const critRepo: any = { find: jest.fn().mockResolvedValue([
      { id: 'c1', code: '1.1', description: 'Criterio uno', specificCompetency: { code: 'CE1', order: 1 } },
    ]) };
    const bkRepo: any = { find: jest.fn().mockResolvedValue([{ id: 'k1', code: 'A.1', title: 'Saber uno' }]) };
    const linkRepo: any = { find: jest.fn().mockResolvedValue([{ evaluationCriterionId: 'c1', basicKnowledgeId: 'k1', status: 'confirmed' }]) };
    const saRepo: any = { find: jest.fn().mockResolvedValue([{ id: 'sa1', subject: { name: 'Matemáticas' } }]) };
    const ayRepo: any = { findOne: jest.fn() };
    const adaptSvc: any = { getAdaptationMap: jest.fn().mockResolvedValue(new Map()) };

    const svc = new LomloeProgressService(caRepo, bkaRepo, critRepo, bkRepo, linkRepo, saRepo, epRepo, ayRepo, adaptSvc);
    const res = await svc.getProgress('stu1', 'ay1');

    expect(res.subjects).toHaveLength(1);
    expect(res.subjects[0].subjectName).toBe('Matemáticas');
    const crit = res.subjects[0].criteria[0];
    expect(crit.code).toBe('1.1');
    expect(crit.states).toEqual({ T1: 'IN_PROGRESS', T2: 'ACHIEVED', T3: null });
    expect(crit.saberes[0].code).toBe('A.1');
    expect(crit.saberes[0].states).toEqual({ T1: null, T2: 'ACHIEVED', T3: null });
  });

  it('alumno sin criterion_assessments → subjects vacío', async () => {
    const epQb = { leftJoin: () => epQb, where: () => epQb, andWhere: () => epQb, orderBy: () => epQb, getMany: async () => [] };
    const epRepo: any = { createQueryBuilder: () => epQb };
    const caRepo: any = { find: jest.fn().mockResolvedValue([]) };
    const svc = new LomloeProgressService(caRepo, {} as any, {} as any, {} as any, {} as any, {} as any, epRepo, {} as any, {} as any);
    const res = await svc.getProgress('stu1', 'ay1');
    expect(res.subjects).toEqual([]);
  });
});
