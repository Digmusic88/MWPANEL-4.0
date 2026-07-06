import { StudentReportDataCollector } from './student-report-data.collector';
import { UserRole } from '../../users/entities/user.entity';

function makeCollector(overrides: any = {}) {
  const studentRepo = { findOne: jest.fn().mockResolvedValue({ id: 's1', enrollmentNumber: 'E1',
    user: { profile: { firstName: 'Ana', lastName: 'Pérez' } }, educationalLevel: { name: 'Primaria' }, classGroups: [{ name: 'G1' }] }) };
  const grades: any = { getStudentGrades: jest.fn().mockResolvedValue({ summary: { overallAverage: 80 }, subjectGrades: [
    { subjectId: 'a', subjectName: 'Mates', subjectCode: 'MAT', averageGrade: 80, gradedTasks: 2 }] }) };
  const attendance = { getStudentAttendanceStats: jest.fn().mockResolvedValue({ stats: { attendanceRate: 95, presentDays: 19, absentDays: 1, lateDays: 0, justifiedAbsences: 0 } }) };
  const formative = { getStudentProgress: jest.fn().mockResolvedValue({ observations: [], progressSummary: { totalObservations: 0, byIndicator: {}, byCompetency: [], recentTrend: 'stable', requiresFollowUp: 0 } }) };
  const evaluations = { findByStudent: jest.fn().mockResolvedValue([]) };
  const dua = { findProfileByStudent: jest.fn().mockResolvedValue(null) };
  const accommodation = { findAccommodationsByProfile: jest.fn().mockResolvedValue([]) };
  const qualitative = { getStudentReports: jest.fn().mockResolvedValue([]) };
  const valuation = { getStudentValuation: jest.fn().mockResolvedValue({ bySpecific: [], byKey: [], hasData: false }) };
  const academicYearRepo = { findOne: jest.fn().mockResolvedValue({ id: 'y1', startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30') }) };
  const centralized = { getStudentGradeBreakdown: jest.fn().mockResolvedValue(undefined) };
  const applicable = { getForAssignment: jest.fn().mockResolvedValue(undefined) };
  const lomloeProgress = { getProgress: jest.fn().mockResolvedValue({ subjects: [] }) };
  grades.getStudentSubjectAssignmentsForYear = jest.fn().mockResolvedValue([]);
  const c = new StudentReportDataCollector(studentRepo as any, grades as any, attendance as any, formative as any,
    evaluations as any, dua as any, accommodation as any, qualitative as any, valuation as any, academicYearRepo as any,
    centralized as any, applicable as any, lomloeProgress as any);
  return { c, grades, attendance, qualitative, centralized, applicable, lomloeProgress };
}

describe('StudentReportDataCollector', () => {
  it('collects only requested sections', async () => {
    const { c, attendance } = makeCollector();
    const data = await c.collect('s1', { academicYearId: 'y1', sections: ['academic'] }, 'u1', UserRole.ADMIN);
    expect(data.academic).toBeDefined();
    expect(data.attendance).toBeUndefined();
    expect(attendance.getStudentAttendanceStats).not.toHaveBeenCalled();
  });

  it('marks hasData=false when a section is empty', async () => {
    const { c } = makeCollector();
    const data = await c.collect('s1', { academicYearId: 'y1', sections: ['socioEmotional'] }, 'u1', UserRole.ADMIN);
    expect(data.socioEmotional!.hasData).toBe(false);
    expect(data.socioEmotional!.totalObservations).toBe(0);
  });

  it('maps academic subjectGrades', async () => {
    const { c } = makeCollector();
    const data = await c.collect('s1', { academicYearId: 'y1', sections: ['academic'] }, 'u1', UserRole.ADMIN);
    expect(data.academic!.hasData).toBe(true);
    expect(data.academic!.subjects[0]).toMatchObject({ name: 'Mates', average: 80 });
  });

  it('detailed: ensambla subgrades acotadas por asignatura respetando el tope', async () => {
    const { c, grades, centralized, applicable, lomloeProgress } = makeCollector();
    grades.getStudentSubjectAssignmentsForYear = jest.fn().mockResolvedValue([
      { id: 'sa1', subject: { id: 'su1', name: 'Mates' } },
    ]);
    centralized.getStudentGradeBreakdown = jest.fn().mockResolvedValue({
      finalGrade: 72,
      sourceDetails: {
        tasks: Array.from({ length: 8 }, (_, i) => ({ title: `T${i}`, type: 'tarea', score: 8, percentage: 100, status: 'graded' })),
        activities: [],
      },
    });
    applicable.getForAssignment = jest.fn().mockResolvedValue({
      groups: [{ specificCompetency: { id: 'sc1', code: 'SC1', name: 'x' }, criteria: [{ id: 'c1', code: '1.1', description: 'x' }] }],
    });
    lomloeProgress.getProgress = jest.fn().mockResolvedValue({ subjects: [] });

    const data = await c.collect('s1', { academicYearId: 'ay1', detailed: true } as any, 'u1', UserRole.ADMIN);
    expect(data.subgrades).toHaveLength(1);
    expect(data.subgrades![0].works.length).toBeLessThanOrEqual(6);
    expect(data.subgrades![0].finalGrade).toBe(72);
    expect(data.lomloeCatalog![0].criteria[0].code).toBe('1.1');
    expect(data.lomloeProgress).toEqual({ subjects: [] });
  });

  it('sin detailed: no toca los campos nuevos', async () => {
    const { c } = makeCollector();
    const data = await c.collect('s1', { academicYearId: 'ay1' } as any, 'u1', UserRole.ADMIN);
    expect(data.subgrades).toBeUndefined();
    expect(data.lomloeProgress).toBeUndefined();
  });
});
