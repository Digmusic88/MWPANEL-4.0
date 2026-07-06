import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GradesService } from '../grades.service';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { TaskSubmission } from '../../tasks/entities/task-submission.entity';
import { ActivityAssessment } from '../../activities/entities/activity-assessment.entity';
import { ExamGrade } from '../../tasks/entities/exam-grade.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { FamilyStudent } from '../../users/entities/family.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { UserRole } from '../../users/entities/user.entity';

describe('GradesService.getStudentGrades year filter', () => {
  let service: GradesService;
  // QueryBuilders espía para tasks y exam grades
  let taskQB: any;
  let examQB: any;
  let activityFind: jest.Mock;
  let evaluationFind: jest.Mock;
  let managerFindOne: jest.Mock;

  const buildQB = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  });

  const studentEntity = {
    id: 's1',
    enrollmentNumber: 'E1',
    user: { id: 'u1', profile: { firstName: 'Ana', lastName: 'Lopez' } },
    classGroups: [],
    educationalLevel: null,
    course: null,
  };

  beforeEach(async () => {
    taskQB = buildQB();
    examQB = buildQB();
    activityFind = jest.fn().mockResolvedValue([]);
    evaluationFind = jest.fn().mockResolvedValue([]);
    managerFindOne = jest.fn().mockResolvedValue({ id: 'current-year' }); // año isCurrent

    const studentRepo: any = {
      findOne: jest.fn().mockResolvedValue(studentEntity),
    };
    const taskSubmissionRepo: any = { createQueryBuilder: jest.fn().mockReturnValue(taskQB) };
    const activityRepo: any = { find: activityFind };
    const examGradeRepo: any = { createQueryBuilder: jest.fn().mockReturnValue(examQB) };
    const evaluationRepo: any = { find: evaluationFind };
    const subjectAssignmentRepo: any = {
      find: jest.fn().mockResolvedValue([]),
      manager: { findOne: managerFindOne, query: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        { provide: getRepositoryToken(Student), useValue: studentRepo },
        { provide: getRepositoryToken(Teacher), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(TaskSubmission), useValue: taskSubmissionRepo },
        { provide: getRepositoryToken(ActivityAssessment), useValue: activityRepo },
        { provide: getRepositoryToken(ExamGrade), useValue: examGradeRepo },
        { provide: getRepositoryToken(Evaluation), useValue: evaluationRepo },
        { provide: getRepositoryToken(SubjectAssignment), useValue: subjectAssignmentRepo },
        { provide: getRepositoryToken(ClassGroup), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(FamilyStudent), useValue: { find: jest.fn() } },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  it('con academicYearId filtra las 4 fuentes por ese año', async () => {
    await service.getStudentGrades('s1', 'u1', UserRole.ADMIN, 'year-X');

    // tasks: andWhere con task.academicYearId
    expect(taskQB.andWhere).toHaveBeenCalledWith(
      'task.academicYearId = :academicYearId',
      { academicYearId: 'year-X' },
    );
    // exam grades: andWhere con examGrade.academicYearId
    expect(examQB.andWhere).toHaveBeenCalledWith(
      'examGrade.academicYearId = :academicYearId',
      { academicYearId: 'year-X' },
    );
    // activity assessments: find where incluye activity.academicYearId
    const activityWhere = activityFind.mock.calls[0][0].where;
    expect(activityWhere.activity.academicYearId).toBe('year-X');
    // evaluations: find where incluye academicYearId
    const evalWhere = evaluationFind.mock.calls[0][0].where;
    expect(evalWhere.academicYearId).toBe('year-X');
    // NO se resuelve el año actual cuando se pasa explícito
    expect(managerFindOne).not.toHaveBeenCalled();
  });

  it('sin academicYearId resuelve el año isCurrent y filtra por su id', async () => {
    await service.getStudentGrades('s1', 'u1', UserRole.ADMIN);

    expect(managerFindOne).toHaveBeenCalledWith(AcademicYear, { where: { isCurrent: true } });
    expect(taskQB.andWhere).toHaveBeenCalledWith(
      'task.academicYearId = :academicYearId',
      { academicYearId: 'current-year' },
    );
  });

  it('sin academicYearId y sin año actual no aplica filtro de año (no rompe)', async () => {
    managerFindOne.mockResolvedValue(null);
    await service.getStudentGrades('s1', 'u1', UserRole.ADMIN);

    // No debe haberse llamado andWhere con el filtro de año en tasks
    const yearCalls = taskQB.andWhere.mock.calls.filter(
      (c: any[]) => c[0] === 'task.academicYearId = :academicYearId',
    );
    expect(yearCalls.length).toBe(0);
  });
});
