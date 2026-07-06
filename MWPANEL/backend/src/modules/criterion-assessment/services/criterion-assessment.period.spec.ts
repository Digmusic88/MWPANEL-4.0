import { BadRequestException } from '@nestjs/common';
import { CriterionAssessmentService } from './criterion-assessment.service';

const mkRepo = (rows: any[] = []) => ({
  find: jest.fn().mockResolvedValue(rows),
  findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve(x)),
});

function build(periodBelongs: boolean) {
  const caRepo = mkRepo();
  const saRepo = mkRepo([{ id: 'sa1', academicYear: { id: 'ay1' }, teacherId: 't1' }]);
  const epRepo: any = {
    findOne: jest.fn().mockResolvedValue(periodBelongs ? { id: 'T1', academicYear: { id: 'ay1' } } : null),
    createQueryBuilder: jest.fn(),
  };
  const svc = new CriterionAssessmentService(
    caRepo as any, saRepo as any, epRepo as any,
    { getForAssignment: jest.fn().mockResolvedValue({ students: [], groups: [] }) } as any,
    { getEffectiveConfig: jest.fn().mockResolvedValue({ scaleType: 'levels3', numericMax: 10, levelMapping: { NOT_ACHIEVED: 0, IN_PROGRESS: 50, ACHIEVED: 100 } }) } as any,
    { normalize: jest.fn().mockReturnValue(50) } as any,
  );
  return { svc, caRepo };
}

describe('CriterionAssessmentService periodo por trimestre', () => {
  it('bulkUpsert escribe en el periodo (trimestre) recibido', async () => {
    const { svc, caRepo } = build(true);
    await svc.bulkUpsert('u1', 'admin', {
      subjectAssignmentId: 'sa1', evaluationPeriodId: 'T1',
      items: [{ studentId: 's1', evaluationCriterionId: 'c1', levelValue: 'IN_PROGRESS' }],
    } as any);
    const saved = (caRepo.save as jest.Mock).mock.calls[0][0];
    expect(saved.evaluationPeriodId).toBe('T1');
  });

  it('rechaza un periodo que no pertenece al año de la asignatura', async () => {
    const { svc } = build(false);
    await expect(svc.bulkUpsert('u1', 'admin', {
      subjectAssignmentId: 'sa1', evaluationPeriodId: 'BAD',
      items: [{ studentId: 's1', evaluationCriterionId: 'c1', levelValue: 'IN_PROGRESS' }],
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un periodo que existe pero es de otro año académico', async () => {
    const caRepo = mkRepo();
    const saRepo = mkRepo([{ id: 'sa1', academicYear: { id: 'ay1' }, teacherId: 't1' }]);
    const epRepo: any = { findOne: jest.fn().mockResolvedValue({ id: 'T9', academicYear: { id: 'ay-OTHER' } }), createQueryBuilder: jest.fn() };
    const svc = new CriterionAssessmentService(
      caRepo as any, saRepo as any, epRepo as any,
      { getForAssignment: jest.fn() } as any,
      { getEffectiveConfig: jest.fn() } as any,
      { normalize: jest.fn() } as any,
    );
    await expect(svc.validatePeriodForAssignment('sa1', 'T9')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bulkUpsert bajo levels3 guarda el levelValue (no lo anula)', async () => {
    const { svc, caRepo } = build(true);
    await svc.bulkUpsert('u1', 'admin', {
      subjectAssignmentId: 'sa1', evaluationPeriodId: 'T1',
      items: [{ studentId: 's1', evaluationCriterionId: 'c1', levelValue: 'IN_PROGRESS' }],
    } as any);
    const saved = (caRepo.save as jest.Mock).mock.calls[0][0];
    expect(saved.levelValue).toBe('IN_PROGRESS');
  });
});
