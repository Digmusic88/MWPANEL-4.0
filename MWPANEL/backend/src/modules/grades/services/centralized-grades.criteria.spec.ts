import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CentralizedGradesService } from './centralized-grades.service';
import { CentralizedGrade } from '../entities/centralized-grade.entity';
import { GradeConfiguration } from '../entities/grade-configuration.entity';
import { TaskSubmission } from '../../tasks/entities/task-submission.entity';
import { ActivityAssessment } from '../../activities/entities/activity-assessment.entity';
import { CompetencyEvaluation } from '../../evaluations/entities/competency-evaluation.entity';
import { RubricAssessment } from '../../activities/entities/rubric-assessment.entity';
import { CriterionAssessment } from '../../criterion-assessment/entities/criterion-assessment.entity';
import { EvaluationPeriod } from '../../evaluations/entities/evaluation-period.entity';
import { Student } from '../../students/entities/student.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { ExamGrade } from '../../tasks/entities/exam-grade.entity';
import { HuggingFaceMCPService } from '../../../services/ai/huggingface-mcp.service';
import { GradeReportsService } from './grade-reports.service';
import { AIInsightsService } from './ai-insights.service';
import { LomloeGradeModeService } from '../../criterion-assessment/services/lomloe-grade-mode.service';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('CentralizedGradesService – processCriteria', () => {
  let svc: CentralizedGradesService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CentralizedGradesService,
        { provide: getRepositoryToken(CentralizedGrade), useValue: makeRepo() },
        { provide: getRepositoryToken(GradeConfiguration), useValue: makeRepo() },
        { provide: getRepositoryToken(TaskSubmission), useValue: makeRepo() },
        { provide: getRepositoryToken(ActivityAssessment), useValue: makeRepo() },
        { provide: getRepositoryToken(CompetencyEvaluation), useValue: makeRepo() },
        { provide: getRepositoryToken(RubricAssessment), useValue: makeRepo() },
        { provide: getRepositoryToken(CriterionAssessment), useValue: makeRepo() },
        { provide: getRepositoryToken(EvaluationPeriod), useValue: makeRepo() },
        { provide: getRepositoryToken(Student), useValue: makeRepo() },
        { provide: getRepositoryToken(SubjectAssignment), useValue: makeRepo() },
        { provide: getRepositoryToken(Teacher), useValue: makeRepo() },
        { provide: getRepositoryToken(ExamGrade), useValue: makeRepo() },
        { provide: HuggingFaceMCPService, useValue: { generateInsights: jest.fn() } },
        { provide: GradeReportsService, useValue: {} },
        { provide: AIInsightsService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: LomloeGradeModeService, useValue: { getMode: jest.fn().mockResolvedValue('parallel') } },
      ],
    }).compile();
    svc = mod.get(CentralizedGradesService);
  });

  it('promedia normalizedScore correctamente (80 + 60 = 70)', () => {
    const now = new Date();
    const items = [
      { id: 'a', normalizedScore: 80, updatedAt: now },
      { id: 'b', normalizedScore: 60, updatedAt: now },
    ] as CriterionAssessment[];
    const result = (svc as any).processCriteria(items, {});
    expect(result).not.toBeNull();
    expect(result.score).toBe(70);
    expect(result.count).toBe(2);
    expect(result.ids).toEqual(['a', 'b']);
  });

  it('devuelve null con array vacío', () => {
    const result = (svc as any).processCriteria([], {});
    expect(result).toBeNull();
  });

  it('devuelve null con null', () => {
    const result = (svc as any).processCriteria(null, {});
    expect(result).toBeNull();
  });

  it('incluye lastUpdate correcto (el más reciente)', () => {
    const earlier = new Date('2025-01-01');
    const later = new Date('2025-06-01');
    const items = [
      { id: 'a', normalizedScore: 90, updatedAt: earlier },
      { id: 'b', normalizedScore: 50, updatedAt: later },
    ] as CriterionAssessment[];
    const result = (svc as any).processCriteria(items, {});
    expect(result.lastUpdate).toEqual(later);
  });
});
