import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CentralizedGradesService } from '../services/centralized-grades.service';
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
import { GradeReportsService } from '../services/grade-reports.service';
import { AIInsightsService } from '../services/ai-insights.service';
import { LomloeGradeModeService } from '../../criterion-assessment/services/lomloe-grade-mode.service';

describe('CentralizedGradesService.getStudentCentralizedGrades (year + visibility)', () => {
  let service: CentralizedGradesService;
  let qb: any;

  const buildQB = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    qb = buildQB();
    const repoStub: any = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const noop: any = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentralizedGradesService,
        { provide: getRepositoryToken(CentralizedGrade), useValue: repoStub },
        { provide: getRepositoryToken(GradeConfiguration), useValue: noop },
        { provide: getRepositoryToken(TaskSubmission), useValue: noop },
        { provide: getRepositoryToken(ActivityAssessment), useValue: noop },
        { provide: getRepositoryToken(CompetencyEvaluation), useValue: noop },
        { provide: getRepositoryToken(RubricAssessment), useValue: noop },
        { provide: getRepositoryToken(CriterionAssessment), useValue: noop },
        { provide: getRepositoryToken(EvaluationPeriod), useValue: noop },
        { provide: getRepositoryToken(Student), useValue: noop },
        { provide: getRepositoryToken(SubjectAssignment), useValue: noop },
        { provide: getRepositoryToken(Teacher), useValue: noop },
        { provide: getRepositoryToken(ExamGrade), useValue: noop },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
        { provide: HuggingFaceMCPService, useValue: noop },
        { provide: GradeReportsService, useValue: noop },
        { provide: AIInsightsService, useValue: noop },
        { provide: LomloeGradeModeService, useValue: { getMode: jest.fn().mockResolvedValue('parallel') } },
      ],
    }).compile();

    service = module.get<CentralizedGradesService>(CentralizedGradesService);
  });

  it('filtra por academicYearId cuando se pasa', async () => {
    await service.getStudentCentralizedGrades('s1', undefined, false, 'year-X', false);
    expect(qb.andWhere).toHaveBeenCalledWith(
      'grade.academicYearId = :academicYearId',
      { academicYearId: 'year-X' },
    );
  });

  it('oculta no visibles (visibleToFamily) para familia/alumno', async () => {
    await service.getStudentCentralizedGrades('s1', undefined, false, 'year-X', true);
    expect(qb.andWhere).toHaveBeenCalledWith('grade.visibleToFamily = true');
  });

  it('NO aplica el guard de visibilidad para profesor/admin', async () => {
    await service.getStudentCentralizedGrades('s1', undefined, true, 'year-X', false);
    const visibilityCalls = qb.andWhere.mock.calls.filter(
      (c: any[]) => c[0] === 'grade.visibleToFamily = true',
    );
    expect(visibilityCalls.length).toBe(0);
  });

  it('sin academicYearId no añade el filtro de año (no rompe)', async () => {
    await service.getStudentCentralizedGrades('s1');
    const yearCalls = qb.andWhere.mock.calls.filter(
      (c: any[]) => c[0] === 'grade.academicYearId = :academicYearId',
    );
    expect(yearCalls.length).toBe(0);
  });
});
