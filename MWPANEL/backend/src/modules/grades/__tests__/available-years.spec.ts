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
import { UserRole } from '../../users/entities/user.entity';

describe('GradesService.getStudentAvailableYears', () => {
  let service: GradesService;
  let queryFn: jest.Mock;

  const makeRepo = (overrides: any = {}) => ({
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
    manager: { query: jest.fn(), findOne: jest.fn() },
    ...overrides,
  });

  beforeEach(async () => {
    queryFn = jest.fn();
    // subjectAssignmentRepository.manager.query es donde corre el UNION
    const subjectAssignmentRepo = makeRepo({ manager: { query: queryFn, findOne: jest.fn() } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        { provide: getRepositoryToken(Student), useValue: makeRepo({ findOne: jest.fn().mockResolvedValue({ id: 's1' }) }) },
        { provide: getRepositoryToken(Teacher), useValue: makeRepo() },
        { provide: getRepositoryToken(TaskSubmission), useValue: makeRepo() },
        { provide: getRepositoryToken(ActivityAssessment), useValue: makeRepo() },
        { provide: getRepositoryToken(ExamGrade), useValue: makeRepo() },
        { provide: getRepositoryToken(Evaluation), useValue: makeRepo() },
        { provide: getRepositoryToken(SubjectAssignment), useValue: subjectAssignmentRepo },
        { provide: getRepositoryToken(ClassGroup), useValue: makeRepo() },
        { provide: getRepositoryToken(FamilyStudent), useValue: makeRepo() },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  it('devuelve los años con datos mapeados a {id,name,isCurrent,isArchived}', async () => {
    queryFn.mockResolvedValue([
      { id: 'y2', name: '2025-2026', isCurrent: true, isArchived: false },
      { id: 'y1', name: '2024-2025', isCurrent: false, isArchived: true },
    ]);

    const result = await service.getStudentAvailableYears('s1', 'admin-user', UserRole.ADMIN);

    expect(result).toEqual([
      { id: 'y2', name: '2025-2026', isCurrent: true, isArchived: false },
      { id: 'y1', name: '2024-2025', isCurrent: false, isArchived: true },
    ]);
    // Verifica que la query se ejecutó con el studentId como parámetro
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryFn.mock.calls[0][1]).toEqual(['s1']);
  });

  it('devuelve [] cuando el alumno no tiene datos en ningún año', async () => {
    queryFn.mockResolvedValue([]);
    const result = await service.getStudentAvailableYears('s1', 'admin-user', UserRole.ADMIN);
    expect(result).toEqual([]);
  });

  it('normaliza isCurrent/isArchived a boolean (Postgres puede devolver strings)', async () => {
    queryFn.mockResolvedValue([
      { id: 'y2', name: '2025-2026', isCurrent: 't', isArchived: 'f' },
    ]);
    const result = await service.getStudentAvailableYears('s1', 'admin-user', UserRole.ADMIN);
    expect(result[0].isCurrent).toBe(true);
    expect(result[0].isArchived).toBe(false);
  });
});
