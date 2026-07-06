import { StudentAutoReportResult } from '@/types/studentAutoReport';

export function buildReportFixture(overrides: Partial<StudentAutoReportResult> = {}): StudentAutoReportResult {
  const student = { id: 's1', firstName: 'Diego', lastName: 'López Martín', enrollmentNumber: 'EST003', classGroup: '1ºA', educationalLevel: 'Educación Primaria' };
  const base: StudentAutoReportResult = {
    student,
    filters: { academicYearId: 'y1' },
    data: {
      student,
      filters: { academicYearId: 'y1' },
      academic: { hasData: true, overallAverage: 72, subjects: [
        { subjectId: 'a', name: 'Lengua', code: 'LCL-1P', average: 70, taskAverage: 68, activityAverage: null, examAverage: 75, gradedItems: 4 },
      ] },
      competencies: { hasData: true, items: [
        { code: 'CCL', name: 'Comunicación lingüística', score: 4 },
        { code: 'STEM', name: 'Matemática y STEM', score: 3 },
      ] },
      socioEmotional: { hasData: false, totalObservations: 0, byAspect: {}, byType: {}, byProgress: {}, requiresFollowUp: 0, notes: [] },
      attendance: { hasData: true, attendanceRate: 96, presentDays: 80, absentDays: 3, lateDays: 1, justifiedAbsences: 2 },
      dua: { hasData: false, strengths: [], barriers: [], accommodations: [] },
      qualitative: { hasData: false, reports: [] },
    },
    metrics: {
      overallVerdict: 'en_progreso',
      academic: { overallAverage: 72, band: 'suficiente', best: { name: 'Lengua', average: 70 }, worst: { name: 'Mates', average: 50 } },
      competencies: { averageScore: 3.5, strengths: ['CCL'], weaknesses: ['STEM'] },
      socioEmotional: { dominantAspects: [], positiveRatio: null, predominantProgress: null },
      attendance: { rate: 96, alert: false },
    },
    narrative: {
      aiGenerated: false,
      academicAssessment: 'Rendimiento en progreso (media 72/100).',
      socioEmotionalAssessment: 'Sin observaciones formativas registradas.',
      strengths: ['Comunicación lingüística.'],
      improvementAreas: ['Competencia matemática.'],
      recommendations: ['Reforzar resolución de problemas.'],
    },
    generatedAt: '2026-06-25T13:35:35.576Z',
  };
  return { ...base, ...overrides };
}
