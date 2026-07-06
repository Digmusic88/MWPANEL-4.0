import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExpedienteBuilderService } from './expediente-builder.service';
import { AcademicRecordEntry } from '../entities/academic-record-entry.entity';
import { AcademicYear as AcademicYearEntity } from '../../students/entities/academic-year.entity';
import { EvaluationPeriod } from '../../evaluations/entities/evaluation-period.entity';
import { ActivityAssessment } from '../../activities/entities/activity-assessment.entity';
import { TaskSubmission } from '../../tasks/entities/task-submission.entity';
import { ExamGrade } from '../../tasks/entities/exam-grade.entity';
import { AcademicRecordsService } from '../academic-records.service';
import { AcademicPeriod, EntryType } from '../entities/academic-record.types';

// Helper: arma un query builder encadenable que resuelve getMany() con `rows`.
function qb(rows: any[]) {
  const builder: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  return builder;
}

describe('ExpedienteBuilderService.buildForStudentYear', () => {
  let svc: ExpedienteBuilderService;

  // Repos de entrada/salida
  const entryStore: any[] = [];
  const entryRepo = {
    findOne: jest.fn(),
    create: jest.fn((x) => ({ ...x })),
    save: jest.fn((x) => {
      if (!x.id) x.id = 'e' + (entryStore.length + 1);
      entryStore.push(x);
      return x;
    }),
  };
  const ayRepo = { findOne: jest.fn() };
  const epRepo = { createQueryBuilder: jest.fn() };
  const aaRepo = { createQueryBuilder: jest.fn() };
  const tsRepo = { createQueryBuilder: jest.fn() };
  const egRepo = { createQueryBuilder: jest.fn() };
  const arService = { findOrCreateRecord: jest.fn(), recomputeGPA: jest.fn() };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [
      ExpedienteBuilderService,
      { provide: getRepositoryToken(AcademicRecordEntry), useValue: entryRepo },
      { provide: getRepositoryToken(AcademicYearEntity), useValue: ayRepo },
      { provide: getRepositoryToken(EvaluationPeriod), useValue: epRepo },
      { provide: getRepositoryToken(ActivityAssessment), useValue: aaRepo },
      { provide: getRepositoryToken(TaskSubmission), useValue: tsRepo },
      { provide: getRepositoryToken(ExamGrade), useValue: egRepo },
      { provide: AcademicRecordsService, useValue: arService },
    ]}).compile();
    svc = mod.get(ExpedienteBuilderService);
    jest.clearAllMocks();
    entryStore.length = 0;
    entryRepo.findOne.mockResolvedValue(null);
    ayRepo.findOne.mockResolvedValue({ id: 'y1', name: '2025-2026' });
    arService.findOrCreateRecord.mockResolvedValue({ id: 'r1' });
  });

  it('genera entrada anual + por trimestre con medias correctas en escala 0-100 e isPassing', async () => {
    // 3 trimestres con fechas
    epRepo.createQueryBuilder.mockReturnValue(qb([
      { id: 'p1', type: 'trimester_1', name: '1º Trimestre', startDate: '2025-09-01', endDate: '2025-12-01' },
      { id: 'p2', type: 'trimester_2', name: '2º Trimestre', startDate: '2025-12-02', endDate: '2026-03-15' },
      { id: 'p3', type: 'trimester_3', name: '3º Trimestre', startDate: '2026-03-16', endDate: '2026-06-20' },
    ]));
    // activity: 80/100 (1ºtri) y 100/100 (2ºtri) de Lengua (sa1)
    aaRepo.createQueryBuilder.mockReturnValue(qb([
      { value: '8', assessedAt: '2025-10-10', activity: { valuationType: 'score', maxScore: 10, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
      { value: '10', assessedAt: '2026-01-10', activity: { valuationType: 'score', maxScore: 10, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
    ]));
    // task: 60/100 (3ºtri) de Lengua (sa1)
    tsRepo.createQueryBuilder.mockReturnValue(qb([
      { finalGrade: '60', isGraded: true, submittedAt: '2026-04-10', status: 'graded', task: { isTestYourself: false, status: 'closed', maxPoints: 100, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
    ]));
    egRepo.createQueryBuilder.mockReturnValue(qb([]));

    const res = await svc.buildForStudentYear('st1', 'y1');

    // 4 entradas: anual + 1ºtri + 2ºtri + 3ºtri
    expect(res.entries).toBe(4);
    const byPeriod = Object.fromEntries(entryStore.map((e) => [e.period, e]));
    // anual = media(80,100,60)=80 (escala 0-100, sin /10)
    expect(byPeriod[AcademicPeriod.ANNUAL].numericValue).toBe(80);
    expect(byPeriod[AcademicPeriod.ANNUAL].isPassing).toBe(true);
    expect(byPeriod[AcademicPeriod.ANNUAL].subjectAssignmentId).toBe('sa1');
    expect(byPeriod[AcademicPeriod.ANNUAL].title).toBe('Lengua');
    expect(byPeriod[AcademicPeriod.ANNUAL].type).toBe(EntryType.ACADEMIC);
    // 1ºtri = 80
    expect(byPeriod[AcademicPeriod.FIRST_TRIMESTER].numericValue).toBe(80);
    // 2ºtri = 100 (un 100 perfecto: ya no desborda con decimal(5,2))
    expect(byPeriod[AcademicPeriod.SECOND_TRIMESTER].numericValue).toBe(100);
    // 3ºtri = 60
    expect(byPeriod[AcademicPeriod.THIRD_TRIMESTER].numericValue).toBe(60);
    expect(arService.recomputeGPA).toHaveBeenCalledWith('r1');
  });

  it('marca isPassing=false cuando la media anual < 50%', async () => {
    epRepo.createQueryBuilder.mockReturnValue(qb([]));
    aaRepo.createQueryBuilder.mockReturnValue(qb([
      { value: '4', assessedAt: '2025-10-10', activity: { valuationType: 'score', maxScore: 10, subjectAssignment: { id: 'sa2', subject: { name: 'Mates' } } } },
    ]));
    tsRepo.createQueryBuilder.mockReturnValue(qb([]));
    egRepo.createQueryBuilder.mockReturnValue(qb([]));
    const res = await svc.buildForStudentYear('st1', 'y1');
    expect(res.entries).toBe(1); // solo anual (sin trimestres)
    expect(entryStore[0].period).toBe(AcademicPeriod.ANNUAL);
    expect(entryStore[0].numericValue).toBe(40); // media 40% en escala 0-100
    expect(entryStore[0].isPassing).toBe(false);
  });

  it('sin periodos trimestre → solo entrada anual (fallback)', async () => {
    epRepo.createQueryBuilder.mockReturnValue(qb([
      { id: 'pf', type: 'final', name: 'Evaluación Final', startDate: '2026-06-01', endDate: '2026-06-30' },
    ]));
    aaRepo.createQueryBuilder.mockReturnValue(qb([
      { value: '7', assessedAt: '2026-02-10', activity: { valuationType: 'score', maxScore: 10, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
    ]));
    tsRepo.createQueryBuilder.mockReturnValue(qb([]));
    egRepo.createQueryBuilder.mockReturnValue(qb([]));
    const res = await svc.buildForStudentYear('st1', 'y1');
    expect(res.entries).toBe(1);
    expect(entryStore[0].period).toBe(AcademicPeriod.ANNUAL);
    expect(entryStore[0].numericValue).toBe(70);
  });

  it('idempotencia: 2ª ejecución actualiza la misma entrada, no duplica', async () => {
    epRepo.createQueryBuilder.mockReturnValue(qb([]));
    aaRepo.createQueryBuilder.mockReturnValue(qb([
      { value: '5', assessedAt: '2025-10-10', activity: { valuationType: 'score', maxScore: 10, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
    ]));
    tsRepo.createQueryBuilder.mockReturnValue(qb([]));
    egRepo.createQueryBuilder.mockReturnValue(qb([]));
    // 1ª pasada: no existe entrada
    await svc.buildForStudentYear('st1', 'y1');
    const existing = entryStore[0];
    entryStore.length = 0;
    // 2ª pasada: findOne devuelve la entrada existente → debe reusar (no crear nueva)
    entryRepo.findOne.mockResolvedValue(existing);
    entryRepo.create.mockClear();
    const res = await svc.buildForStudentYear('st1', 'y1');
    expect(res.entries).toBe(1);
    expect(entryRepo.create).not.toHaveBeenCalled(); // reusó, no creó
  });

  it('excluye task isTestYourself y status no published/closed; activity no-score; numericGrade NaN', async () => {
    epRepo.createQueryBuilder.mockReturnValue(qb([]));
    // activity emoji (no score) → ignorada; activity score válida 90
    aaRepo.createQueryBuilder.mockReturnValue(qb([
      { value: '🙂', assessedAt: '2025-10-10', activity: { valuationType: 'emoji', maxScore: 10, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
      { value: '9', assessedAt: '2025-10-11', activity: { valuationType: 'score', maxScore: 10, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
    ]));
    // task draft → fuera; task isTestYourself → fuera. La consulta real ya filtra, pero el builder vuelve a guardar contra value NaN.
    tsRepo.createQueryBuilder.mockReturnValue(qb([]));
    // exam con numericGrade no numérico → se ignora
    egRepo.createQueryBuilder.mockReturnValue(qb([
      { numericGrade: 'NV', gradedAt: '2025-11-01', task: { maxPoints: 100, subjectAssignment: { id: 'sa1', subject: { name: 'Lengua' } } } },
    ]));
    const res = await svc.buildForStudentYear('st1', 'y1');
    expect(res.entries).toBe(1); // solo la activity score 90 → anual 90
    expect(entryStore[0].numericValue).toBe(90);
  });
});

describe('ExpedienteBuilderService.buildYear', () => {
  let svc: ExpedienteBuilderService;
  const entryRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => ({ id: 'e', ...x })) };
  const ayRepo = { findOne: jest.fn() };
  const epRepo = { createQueryBuilder: jest.fn() };
  const aaRepo = { createQueryBuilder: jest.fn() };
  const tsRepo = { createQueryBuilder: jest.fn() };
  const egRepo = { createQueryBuilder: jest.fn() };
  const arService = { findOrCreateRecord: jest.fn(), recomputeGPA: jest.fn() };

  // helper qb local (idéntico al de arriba)
  function qb(rows: any[]) {
    const b: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(), leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(rows),
      getRawMany: jest.fn().mockResolvedValue(rows),
    };
    return b;
  }

  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [
      ExpedienteBuilderService,
      { provide: getRepositoryToken(AcademicRecordEntry), useValue: entryRepo },
      { provide: getRepositoryToken(AcademicYearEntity), useValue: ayRepo },
      { provide: getRepositoryToken(EvaluationPeriod), useValue: epRepo },
      { provide: getRepositoryToken(ActivityAssessment), useValue: aaRepo },
      { provide: getRepositoryToken(TaskSubmission), useValue: tsRepo },
      { provide: getRepositoryToken(ExamGrade), useValue: egRepo },
      { provide: AcademicRecordsService, useValue: arService },
    ]}).compile();
    svc = mod.get(ExpedienteBuilderService);
    jest.clearAllMocks();
    ayRepo.findOne.mockResolvedValue({ id: 'y1', name: '2025-2026' });
    arService.findOrCreateRecord.mockResolvedValue({ id: 'r1' });
    entryRepo.findOne.mockResolvedValue(null);
    // distinct studentIds desde 3 fuentes: st1 (activity), st1 (task dup), st2 (exam)
    aaRepo.createQueryBuilder.mockReturnValue(qb([{ studentId: 'st1' }]));
    tsRepo.createQueryBuilder.mockReturnValue(qb([{ studentId: 'st1' }]));
    egRepo.createQueryBuilder.mockReturnValue(qb([{ studentId: 'st2' }]));
    epRepo.createQueryBuilder.mockReturnValue(qb([]));
  });

  it('agrupa studentIds distintos (st1, st2) y llama buildForStudentYear por alumno', async () => {
    const spy = jest.spyOn(svc, 'buildForStudentYear').mockResolvedValue({ recordId: 'r', entries: 1 });
    const res = await svc.buildYear('y1');
    expect(res.students).toBe(2); // st1 deduplicado entre activity y task
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('st1', 'y1');
    expect(spy).toHaveBeenCalledWith('st2', 'y1');
  });

  it('si buildForStudentYear lanza para un alumno, no aborta el resto', async () => {
    const spy = jest.spyOn(svc, 'buildForStudentYear')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ recordId: 'r', entries: 1 });
    const res = await svc.buildYear('y1');
    expect(res.students).toBe(2);
    expect(res.records).toBe(1); // solo 1 alumno construido OK
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
