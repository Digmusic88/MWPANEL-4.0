import { GradesService } from './grades.service';

// Nota: grades.service.spec.ts existente ya falla en DI (deps desactualizadas,
// preexistente, fuera de alcance de esta tarea). Para no acoplarnos a ese arnés
// roto, instanciamos GradesService directamente con dobles mínimos, como hace
// el patrón de SP-C (criterion-assessment.period.spec.ts).
function buildService(overrides: { studentRepository?: any; subjectAssignmentRepository?: any } = {}) {
  const studentRepository = overrides.studentRepository ?? { findOne: jest.fn() };
  const subjectAssignmentRepository = overrides.subjectAssignmentRepository ?? { find: jest.fn() };

  const service = new (GradesService as any)(
    studentRepository, // studentRepository
    {}, // teacherRepository
    {}, // taskSubmissionRepository
    {}, // activityAssessmentRepository
    {}, // examGradeRepository
    {}, // evaluationRepository
    subjectAssignmentRepository, // subjectAssignmentRepository
    {}, // classGroupRepository
    {}, // familyStudentRepository
  ) as GradesService;

  return { service, studentRepository, subjectAssignmentRepository };
}

describe('GradesService.getStudentSubjectAssignmentsForYear', () => {
  it('filtra por los classGroups del alumno y el año académico', async () => {
    const studentRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', classGroups: [{ id: 'cg1' }] }),
    };
    const subjectAssignmentRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'sa1' }, { id: 'sa2' }]),
    };
    const { service } = buildService({ studentRepository, subjectAssignmentRepository });

    const res = await service.getStudentSubjectAssignmentsForYear('s1', 'ay1');

    expect(res).toHaveLength(2);
    expect(studentRepository.findOne).toHaveBeenCalledWith({
      where: { id: 's1' },
      relations: ['classGroups'],
    });
    expect(subjectAssignmentRepository.find).toHaveBeenCalledWith({
      where: [{ classGroup: { id: 'cg1' }, academicYearId: 'ay1' }],
      relations: ['subject'],
    });
  });

  it('sin academicYearId, filtra solo por classGroups', async () => {
    const studentRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', classGroups: [{ id: 'cg1' }, { id: 'cg2' }] }),
    };
    const subjectAssignmentRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'sa1' }]),
    };
    const { service } = buildService({ studentRepository, subjectAssignmentRepository });

    const res = await service.getStudentSubjectAssignmentsForYear('s1');

    expect(res).toHaveLength(1);
    expect(subjectAssignmentRepository.find).toHaveBeenCalledWith({
      where: [{ classGroup: { id: 'cg1' } }, { classGroup: { id: 'cg2' } }],
      relations: ['subject'],
    });
  });

  it('devuelve [] si el alumno no tiene classGroups', async () => {
    const studentRepository = { findOne: jest.fn().mockResolvedValue({ id: 's1', classGroups: [] }) };
    const subjectAssignmentRepository = { find: jest.fn() };
    const { service } = buildService({ studentRepository, subjectAssignmentRepository });

    const res = await service.getStudentSubjectAssignmentsForYear('s1', 'ay1');

    expect(res).toEqual([]);
    expect(subjectAssignmentRepository.find).not.toHaveBeenCalled();
  });

  it('devuelve [] si el alumno no existe', async () => {
    const studentRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const subjectAssignmentRepository = { find: jest.fn() };
    const { service } = buildService({ studentRepository, subjectAssignmentRepository });

    const res = await service.getStudentSubjectAssignmentsForYear('missing', 'ay1');

    expect(res).toEqual([]);
  });
});
