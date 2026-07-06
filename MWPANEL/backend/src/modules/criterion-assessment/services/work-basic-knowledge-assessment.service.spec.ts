import { ForbiddenException } from '@nestjs/common';
import { WorkBasicKnowledgeAssessmentService } from './work-basic-knowledge-assessment.service';
import { BulkWorkSaberDto } from '../dto/work-saber.dto';

function makeRepo(rows: any[] = []) {
  const store = [...rows];
  return {
    find: jest.fn(async (q: any) => store.filter((r) => {
      const w = q.where;
      return Object.keys(w).every((k) => {
        const v = w[k];
        return v && v._type === 'in' ? v._value.includes(r[k]) : r[k] === v;
      });
    })),
    findOne: jest.fn(async (q: any) => store.find((r) => Object.keys(q.where).every((k) => r[k] === q.where[k])) || null),
    save: jest.fn(async (r: any) => { const i = store.findIndex((x) => x.id === r.id); if (i >= 0) store[i] = r; else store.push({ ...r, id: r.id || 'new' }); return r; }),
    delete: jest.fn(async () => ({ affected: 1 })),
    create: jest.fn((r: any) => ({ ...r })),
    _store: store,
  } as any;
}

/** Mock de EvaluationPeriod repo: createQueryBuilder(...).getOne() devuelve `period`. */
function makeEpRepo(period: any) {
  const qb: any = {
    leftJoin: jest.fn(() => qb),
    where: jest.fn(() => qb),
    andWhere: jest.fn(() => qb),
    getOne: jest.fn(async () => period),
  };
  return { createQueryBuilder: jest.fn(() => qb) } as any;
}

/** Mock de CriterionAssessmentService.assertTeacherAssignment: por defecto resuelve OK con teacherId 'T'. */
function makeCriterionService(opts?: { teacherId?: string; reject?: boolean }) {
  const teacherId = opts?.teacherId ?? 'T';
  return {
    assertTeacherAssignment: jest.fn(async (_userId: string, _role: string, subjectAssignmentId: string) => {
      if (opts?.reject) throw new ForbiddenException('No tienes acceso a esta asignación');
      return { id: subjectAssignmentId, teacherId };
    }),
  } as any;
}

describe('recomputeBkaAggregate', () => {
  it('escribe BKA = media redondeada de las WBKA del saber', async () => {
    const wbkaRepo = makeRepo([
      { id: 'w1', studentId: 'S', basicKnowledgeId: 'K', evaluationPeriodId: 'P', levelValue: 'ACHIEVED' },
      { id: 'w2', studentId: 'S', basicKnowledgeId: 'K', evaluationPeriodId: 'P', levelValue: 'IN_PROGRESS' },
    ]);
    const bkaRepo = makeRepo();
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, makeCriterionService(),
    );
    await svc.recomputeBkaAggregate('S', 'K', 'P', 'SA', 'T');
    // media de (2,1)=1.5 → round 2 → ACHIEVED
    expect(bkaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ levelValue: 'ACHIEVED', studentId: 'S', basicKnowledgeId: 'K', evaluationPeriodId: 'P' }));
  });

  it('borra la fila BKA agregada si no quedan WBKA', async () => {
    const wbkaRepo = makeRepo([]);
    const bkaRepo = makeRepo([{ id: 'b1', studentId: 'S', basicKnowledgeId: 'K', evaluationPeriodId: 'P' }]);
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, makeCriterionService(),
    );
    await svc.recomputeBkaAggregate('S', 'K', 'P', 'SA', 'T');
    expect(bkaRepo.delete).toHaveBeenCalledWith({ id: 'b1' });
  });
});

describe('getCell / resolveWork routing por workType', () => {
  function idleRepos() {
    const wbkaRepo = makeRepo();
    const bkaRepo = makeRepo();
    const epRepo = {} as any; // no debería tocarse: saRepo no resuelve academicYear
    const saRepo = makeRepo(); // findOne siempre null → resolvePeriodId corta antes de usar epRepo
    const linkRepo = makeRepo();
    const bkRepo = makeRepo();
    return { wbkaRepo, bkaRepo, epRepo, saRepo, linkRepo, bkRepo };
  }

  it('workType "activity" resuelve vía Activity repo, NO vía Task repo', async () => {
    const { wbkaRepo, bkaRepo, epRepo, saRepo, linkRepo, bkRepo } = idleRepos();
    const actRepo = { findOne: jest.fn(async () => ({
      id: 'a1', subjectAssignment: { id: 'SA1' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C1' }],
    })) } as any;
    const taskRepo = { findOne: jest.fn(async () => { throw new Error('taskRepo.findOne NO debería llamarse para workType=activity'); }) } as any;
    const criterionService = makeCriterionService();
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, criterionService,
    );
    const cell = await svc.getCell('U1', 'teacher', 'a1', 'activity', 'S1');
    expect(actRepo.findOne).toHaveBeenCalledTimes(1);
    expect(taskRepo.findOne).not.toHaveBeenCalled();
    expect(cell.subjectAssignmentId).toBe('SA1');
    expect(criterionService.assertTeacherAssignment).toHaveBeenCalledWith('U1', 'teacher', 'SA1');
  });

  it.each(['test', 'task'])('workType "%s" resuelve vía Task repo, NO vía Activity repo', async (workType) => {
    const { wbkaRepo, bkaRepo, epRepo, saRepo, linkRepo, bkRepo } = idleRepos();
    const taskRepo = { findOne: jest.fn(async () => ({
      id: 't1', subjectAssignment: { id: 'SA2' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C2' }],
    })) } as any;
    const actRepo = { findOne: jest.fn(async () => { throw new Error('actRepo.findOne NO debería llamarse para workType=' + workType); }) } as any;
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, makeCriterionService(),
    );
    const cell = await svc.getCell('U1', 'teacher', 't1', workType, 'S1');
    expect(taskRepo.findOne).toHaveBeenCalledTimes(1);
    expect(actRepo.findOne).not.toHaveBeenCalled();
    expect(cell.subjectAssignmentId).toBe('SA2');
  });

  it('rechaza con Forbidden si el profesor no es dueño de la asignación (C1 IDOR)', async () => {
    const { wbkaRepo, bkaRepo, epRepo, saRepo, linkRepo, bkRepo } = idleRepos();
    const actRepo = { findOne: jest.fn(async () => ({
      id: 'a1', subjectAssignment: { id: 'SA1' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C1' }],
    })) } as any;
    const taskRepo = { findOne: jest.fn() } as any;
    const criterionService = makeCriterionService({ reject: true });
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, criterionService,
    );
    await expect(svc.getCell('INTRUDER', 'teacher', 'a1', 'activity', 'S1')).rejects.toThrow(ForbiddenException);
  });
});

describe('bulkUpsert', () => {
  function makeDto(marks: Array<{ basicKnowledgeId: string; levelValue: string }>): BulkWorkSaberDto {
    return { workId: 't1', workType: 'task', studentId: 'S1', marks } as BulkWorkSaberDto;
  }

  it('devuelve saved:0 sin escribir WBKA cuando el periodo resuelve a null', async () => {
    const wbkaRepo = makeRepo();
    const bkaRepo = makeRepo();
    const epRepo = {} as any; // no debería tocarse
    const saRepo = makeRepo(); // findOne → null → academicYearId undefined → periodId null
    const linkRepo = makeRepo();
    const bkRepo = makeRepo();
    const taskRepo = { findOne: jest.fn(async () => ({
      id: 't1', subjectAssignment: { id: 'SAX' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C1' }],
    })) } as any;
    const actRepo = { findOne: jest.fn() } as any;
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, makeCriterionService(),
    );
    const result = await svc.bulkUpsert('T1', 'teacher', makeDto([{ basicKnowledgeId: 'K1', levelValue: 'ACHIEVED' }]));
    expect(result.saved).toBe(0);
    expect(result.subjectAssignmentId).toBe('SAX');
    expect(result.evaluationPeriodId).toBe('');
    expect(wbkaRepo.save).not.toHaveBeenCalled();
  });

  it('escribe filas WBKA y devuelve saved>0 cuando el periodo resuelve correctamente', async () => {
    const wbkaRepo = makeRepo();
    const bkaRepo = makeRepo();
    const period = { id: 'P1' };
    const epRepo = makeEpRepo(period);
    const saRepo = makeRepo([{ id: 'SA3', academicYear: { id: 'AY1' } }]);
    const linkRepo = makeRepo();
    const bkRepo = makeRepo();
    const taskRepo = { findOne: jest.fn(async () => ({
      id: 't1', subjectAssignment: { id: 'SA3' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C1' }],
    })) } as any;
    const actRepo = { findOne: jest.fn() } as any;
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, makeCriterionService({ teacherId: 'TEACHER-1' }),
    );
    const dto = makeDto([
      { basicKnowledgeId: 'K1', levelValue: 'ACHIEVED' },
      { basicKnowledgeId: 'K2', levelValue: 'IN_PROGRESS' },
    ]);
    const result = await svc.bulkUpsert('T1', 'teacher', dto);
    expect(result.saved).toBe(2);
    expect(result.subjectAssignmentId).toBe('SA3');
    expect(result.evaluationPeriodId).toBe('P1');
    expect(wbkaRepo.save).toHaveBeenCalledTimes(2);
  });

  it('rechaza con Forbidden si el profesor no es dueño de la asignación, sin escribir nada (C1 IDOR)', async () => {
    const wbkaRepo = makeRepo();
    const bkaRepo = makeRepo();
    const period = { id: 'P1' };
    const epRepo = makeEpRepo(period);
    const saRepo = makeRepo([{ id: 'SA3', academicYear: { id: 'AY1' } }]);
    const linkRepo = makeRepo();
    const bkRepo = makeRepo();
    const taskRepo = { findOne: jest.fn(async () => ({
      id: 't1', subjectAssignment: { id: 'SA3' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C1' }],
    })) } as any;
    const actRepo = { findOne: jest.fn() } as any;
    const criterionService = makeCriterionService({ reject: true });
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, criterionService,
    );
    const dto = makeDto([{ basicKnowledgeId: 'K1', levelValue: 'ACHIEVED' }]);
    await expect(svc.bulkUpsert('INTRUDER', 'teacher', dto)).rejects.toThrow(ForbiddenException);
    expect(wbkaRepo.save).not.toHaveBeenCalled();
  });

  it('stampa teacherId de la asignación (Teacher entity id), NO el userId del profesor (I2)', async () => {
    const wbkaRepo = makeRepo();
    const bkaRepo = makeRepo();
    const period = { id: 'P1' };
    const epRepo = makeEpRepo(period);
    const saRepo = makeRepo([{ id: 'SA3', academicYear: { id: 'AY1' } }]);
    const linkRepo = makeRepo();
    const bkRepo = makeRepo();
    const taskRepo = { findOne: jest.fn(async () => ({
      id: 't1', subjectAssignment: { id: 'SA3' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C1' }],
    })) } as any;
    const actRepo = { findOne: jest.fn() } as any;
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, makeCriterionService({ teacherId: 'TEACHER-ENTITY-ID' }),
    );
    const dto = makeDto([{ basicKnowledgeId: 'K1', levelValue: 'ACHIEVED' }]);
    const result = await svc.bulkUpsert('USER-LOGIN-ID', 'teacher', dto);
    expect(result.teacherId).toBe('TEACHER-ENTITY-ID');
    expect(wbkaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'TEACHER-ENTITY-ID' }));
    expect(bkaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 'TEACHER-ENTITY-ID' }));
  });

  it('expande criterionIds con los criterios CONFIRMED de OTRO trabajo que comparten saber marcado (I3)', async () => {
    const wbkaRepo = makeRepo();
    const bkaRepo = makeRepo();
    const period = { id: 'P1' };
    const epRepo = makeEpRepo(period);
    const saRepo = makeRepo([{ id: 'SA3', academicYear: { id: 'AY1' } }]);
    // K1 está confirmado en C1 (el propio criterio del trabajo) Y en C-OTHER (criterio de otro trabajo)
    const linkRepo = makeRepo([
      { id: 'L1', evaluationCriterionId: 'C1', basicKnowledgeId: 'K1', status: 'confirmed' },
      { id: 'L2', evaluationCriterionId: 'C-OTHER', basicKnowledgeId: 'K1', status: 'confirmed' },
      { id: 'L3', evaluationCriterionId: 'C-REJECTED', basicKnowledgeId: 'K1', status: 'rejected' },
    ]);
    const bkRepo = makeRepo();
    const taskRepo = { findOne: jest.fn(async () => ({
      id: 't1', subjectAssignment: { id: 'SA3' }, assignedDate: '2026-01-10', evaluationCriteria: [{ id: 'C1' }],
    })) } as any;
    const actRepo = { findOne: jest.fn() } as any;
    const svc = new WorkBasicKnowledgeAssessmentService(
      wbkaRepo, bkaRepo, epRepo, saRepo, taskRepo, actRepo, linkRepo, bkRepo, makeCriterionService(),
    );
    const dto = makeDto([{ basicKnowledgeId: 'K1', levelValue: 'ACHIEVED' }]);
    const result = await svc.bulkUpsert('T1', 'teacher', dto);
    expect(result.criterionIds.sort()).toEqual(['C-OTHER', 'C1'].sort());
    expect(result.criterionIds).not.toContain('C-REJECTED');
  });
});
