import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AcademicRecordsSyncService } from './academic-records-sync.service';
import { AcademicRecord } from '../entities/academic-record.entity';
import { AcademicRecordEntry } from '../entities/academic-record-entry.entity';
import { CentralizedGrade } from '../../grades/entities/centralized-grade.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { AcademicYear as AcademicYearEntity } from '../../students/entities/academic-year.entity';
import { EvaluationPeriod } from '../../evaluations/entities/evaluation-period.entity';
import { AcademicRecordsService } from '../academic-records.service';
import { CompetencyValuationService } from '../../criterion-assessment/services/competency-valuation.service';

describe('AcademicRecordsSyncService', () => {
  let svc: AcademicRecordsSyncService;
  const recRepo = { findOne: jest.fn() };
  const entryRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => ({ id: 'e1', ...x })) };
  const cgRepo = { find: jest.fn() };
  const saRepo = { findOne: jest.fn() };
  const ayRepo = { findOne: jest.fn() };
  const epRepo = { createQueryBuilder: jest.fn() };
  const arService = { findOrCreateRecord: jest.fn(), recomputeGPA: jest.fn() };
  const valuation = { getValuation: jest.fn() };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({ providers: [
      AcademicRecordsSyncService,
      { provide: getRepositoryToken(AcademicRecord), useValue: recRepo },
      { provide: getRepositoryToken(AcademicRecordEntry), useValue: entryRepo },
      { provide: getRepositoryToken(CentralizedGrade), useValue: cgRepo },
      { provide: getRepositoryToken(SubjectAssignment), useValue: saRepo },
      { provide: getRepositoryToken(AcademicYearEntity), useValue: ayRepo },
      { provide: getRepositoryToken(EvaluationPeriod), useValue: epRepo },
      { provide: AcademicRecordsService, useValue: arService },
      { provide: CompetencyValuationService, useValue: valuation },
    ]}).compile();
    svc = mod.get(AcademicRecordsSyncService);
    jest.clearAllMocks();
    // EvaluationPeriod query builder → un periodo
    epRepo.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([{ id: 'ep1' }]),
    });
  });

  it('vuelca una nota FINAL como entry con numericValue=finalGrade (0-100) + resumen competencial', async () => {
    ayRepo.findOne.mockResolvedValue({ id: 'y1', name: '2025-2026' });
    arService.findOrCreateRecord.mockResolvedValue({ id: 'r1' });
    cgRepo.find.mockResolvedValue([
      { studentId: 'st1', subjectAssignmentId: 'sa1', period: 'first_trimester', finalGrade: '80.00', status: 'final', subjectAssignment: { subject: { name: 'Lengua' } } },
    ]);
    valuation.getValuation.mockResolvedValue({ bySpecific: [], byKey: [{ code: 'CCL', name: 'Ling', score: 80 }] });
    entryRepo.findOne.mockResolvedValue(null);
    const res = await svc.syncStudent('st1', 'y1');
    expect(res.entries).toBe(1);
    const saved = entryRepo.save.mock.calls[0][0];
    expect(saved.numericValue).toBe(80); // 80.00 already on 0-100 scale
    expect(saved.subjectAssignmentId).toBe('sa1');
    expect(saved.comments).toContain('CCL: 80');
    expect(arService.recomputeGPA).toHaveBeenCalledWith('r1');
  });

  it('salta una nota cuyo entry falla (FK/datos) sin abortar el sync', async () => {
    ayRepo.findOne.mockResolvedValue({ id: 'y1', name: '2025-2026' });
    arService.findOrCreateRecord.mockResolvedValue({ id: 'r1' });
    cgRepo.find.mockResolvedValue([
      { studentId: 'st1', subjectAssignmentId: 'orphan', period: 'first_trimester', finalGrade: '80.00', status: 'final', subjectAssignment: { subject: { name: 'X' } } },
      { studentId: 'st1', subjectAssignmentId: 'sa2', period: 'first_trimester', finalGrade: '60.00', status: 'final', subjectAssignment: { subject: { name: 'Y' } } },
    ]);
    valuation.getValuation.mockResolvedValue({ bySpecific: [], byKey: [] });
    entryRepo.findOne.mockResolvedValue(null);
    // la 1ª save lanza (FK), la 2ª funciona
    entryRepo.save.mockReset();
    entryRepo.save.mockRejectedValueOnce(new Error('FK violation')).mockResolvedValue({ id: 'e2' });
    const res = await svc.syncStudent('st1', 'y1');
    expect(res.entries).toBe(1); // solo la válida se contó; el sync NO se cayó
    expect(arService.recomputeGPA).toHaveBeenCalledWith('r1');
  });
});
