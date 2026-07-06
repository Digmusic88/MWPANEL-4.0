import { StudentReportMetricsEngine } from './student-report-metrics.engine';
import { StudentReportData } from '../types/student-report.types';

const baseStudent = { id: 's1', firstName: 'Ana', lastName: 'Pérez', enrollmentNumber: 'E1', classGroup: 'G1', educationalLevel: 'Primaria' };
const engine = new StudentReportMetricsEngine();

describe('StudentReportMetricsEngine', () => {
  it('returns sin_datos verdict when nothing has data', () => {
    const m = engine.compute({ student: baseStudent, filters: { academicYearId: 'y1' } });
    expect(m.overallVerdict).toBe('sin_datos');
  });

  it('computes academic band and best/worst', () => {
    const data: StudentReportData = { student: baseStudent, filters: { academicYearId: 'y1' },
      academic: { hasData: true, overallAverage: 72, subjects: [
        { subjectId: 'a', name: 'Mates', code: 'MAT', average: 90, gradedItems: 3 },
        { subjectId: 'b', name: 'Lengua', code: 'LCL', average: 54, gradedItems: 2 },
      ] } };
    const m = engine.compute(data);
    expect(m.academic!.band).toBe('bien');      // 72 → bien (umbrales 85/70/50)
    expect(m.academic!.best!.name).toBe('Mates');
    expect(m.academic!.worst!.name).toBe('Lengua');
  });

  it('computes competency strengths/weaknesses', () => {
    const data: StudentReportData = { student: baseStudent, filters: { academicYearId: 'y1' },
      competencies: { hasData: true, items: [
        { code: 'CCL', name: 'Lingüística', score: 4.5 },
        { code: 'STEM', name: 'STEM', score: 2 },
        { code: 'CD', name: 'Digital', score: 3 },
      ] } };
    const m = engine.compute(data);
    expect(m.competencies!.strengths).toContain('Lingüística');
    expect(m.competencies!.weaknesses).toContain('STEM');
  });

  it('computes socioEmotional positiveRatio', () => {
    const data: StudentReportData = { student: baseStudent, filters: { academicYearId: 'y1' },
      socioEmotional: { hasData: true, totalObservations: 4, byAspect: { social: 3, emotional: 1 },
        byType: { ACHIEVEMENT: 2, INTERACTION: 1, DIFFICULTY: 1 }, byProgress: { ACHIEVING: 3, DEVELOPING: 1 },
        requiresFollowUp: 0, notes: [] } };
    const m = engine.compute(data);
    expect(m.socioEmotional!.positiveRatio).toBeCloseTo(0.75); // (ACHIEVEMENT+INTERACTION)/total
    expect(m.socioEmotional!.dominantAspects).toContain('social');
    expect(m.socioEmotional!.predominantProgress).toBe('ACHIEVING');
  });

  it('flags attendance alert when rate low', () => {
    const data: StudentReportData = { student: baseStudent, filters: { academicYearId: 'y1' },
      attendance: { hasData: true, attendanceRate: 80, presentDays: 16, absentDays: 4, lateDays: 0, justifiedAbsences: 1 } };
    const m = engine.compute(data);
    expect(m.attendance!.alert).toBe(true); // < 90
  });

  it('overall verdict consolidado with strong academic + positive socio + good attendance', () => {
    const data: StudentReportData = { student: baseStudent, filters: { academicYearId: 'y1' },
      academic: { hasData: true, overallAverage: 88, subjects: [{ subjectId: 'a', name: 'Mates', code: 'MAT', average: 88, gradedItems: 3 }] },
      attendance: { hasData: true, attendanceRate: 97, presentDays: 29, absentDays: 1, lateDays: 0, justifiedAbsences: 0 } };
    const m = engine.compute(data);
    expect(m.overallVerdict).toBe('consolidado');
  });
});
