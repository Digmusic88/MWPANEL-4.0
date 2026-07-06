import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { CriterionAssessmentService } from './criterion-assessment.service';
import { CriterionAssessment, CriterionScaleType, AchievementLevel } from '../entities/criterion-assessment.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { ApplicableCriteriaService } from './applicable-criteria.service';
import { CriterionScaleConfigService } from './criterion-scale-config.service';
import { CriterionNormalizationService } from './criterion-normalization.service';

describe('CriterionAssessmentService', () => {
  let svc: CriterionAssessmentService;
  const caRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => ({ id: 'new', ...x })), find: jest.fn() };
  const saRepo = { findOne: jest.fn() };
  const applicable = { getForAssignment: jest.fn() };
  const scaleCfg = { getEffectiveConfig: jest.fn() };
  const norm = new CriterionNormalizationService();

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CriterionAssessmentService,
        { provide: getRepositoryToken(CriterionAssessment), useValue: caRepo },
        { provide: getRepositoryToken(SubjectAssignment), useValue: saRepo },
        { provide: ApplicableCriteriaService, useValue: applicable },
        { provide: CriterionScaleConfigService, useValue: scaleCfg },
        { provide: CriterionNormalizationService, useValue: norm },
      ],
    }).compile();
    svc = mod.get(CriterionAssessmentService);
    jest.clearAllMocks();
  });

  it('assertTeacherAssignment lanza 403 si no es admin ni tutor', async () => {
    saRepo.findOne.mockResolvedValue({ id: 'a1', teacherId: 't1', teacher: { user: { id: 'otherUser' } } });
    await expect(svc.assertTeacherAssignment('userX', 'teacher', 'a1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('admin bypassa el acceso', async () => {
    saRepo.findOne.mockResolvedValue({ id: 'a1', teacherId: 't1', teacher: { user: { id: 'otherUser' } } });
    await expect(svc.assertTeacherAssignment('admin1', 'admin', 'a1')).resolves.toBeTruthy();
  });

  it('bulkUpsert normaliza y guarda (insert nuevo)', async () => {
    saRepo.findOne.mockResolvedValue({ id: 'a1', teacherId: 't1', teacher: { user: { id: 'u1' } } });
    scaleCfg.getEffectiveConfig.mockResolvedValue({ scaleType: CriterionScaleType.LEVELS, numericMax: 10, levelMapping: { ACHIEVING: 80 } });
    caRepo.findOne.mockResolvedValue(null);
    const res = await svc.bulkUpsert('u1', 'teacher', {
      subjectAssignmentId: 'a1', evaluationPeriodId: 'p1',
      items: [{ studentId: 'st1', evaluationCriterionId: 'c1', levelValue: AchievementLevel.ACHIEVING }],
    });
    expect(res.saved).toBe(1);
    const saved = caRepo.save.mock.calls[0][0];
    expect(saved.normalizedScore).toBe(80);
    expect(saved.teacherId).toBe('t1');
  });
});
