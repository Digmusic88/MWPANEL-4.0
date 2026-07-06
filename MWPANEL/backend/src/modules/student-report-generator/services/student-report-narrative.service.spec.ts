import { StudentReportNarrativeService } from './student-report-narrative.service';
import { StudentReportMetrics, StudentReportData } from '../types/student-report.types';

const config = { get: jest.fn().mockReturnValue(undefined) } as any; // sin ANTHROPIC_API_KEY → fallback
const svc = new StudentReportNarrativeService(config);
const student = { id: 's1', firstName: 'Ana', lastName: 'Pérez', enrollmentNumber: 'E1', classGroup: 'G1', educationalLevel: 'Primaria' };

describe('StudentReportNarrativeService.buildFallback', () => {
  it('produces all sections deterministically from metrics', () => {
    const metrics: StudentReportMetrics = {
      academic: { overallAverage: 72, band: 'bien', best: { name: 'Mates', average: 90 }, worst: { name: 'Lengua', average: 54 } },
      competencies: { averageScore: 3.5, strengths: ['Lingüística'], weaknesses: ['STEM'] },
      socioEmotional: { dominantAspects: ['social'], positiveRatio: 0.75, predominantProgress: 'ACHIEVING' },
      attendance: { rate: 95, alert: false },
      overallVerdict: 'consolidado',
    };
    const n = svc.buildFallback(metrics, { student, filters: { academicYearId: 'y1' } } as StudentReportData);
    expect(n.aiGenerated).toBe(false);
    expect(n.academicAssessment).toContain('Mates');
    expect(n.socioEmotionalAssessment.length).toBeGreaterThan(0);
    expect(n.strengths.length).toBeGreaterThan(0);
    expect(Array.isArray(n.recommendations)).toBe(true);
  });

  it('handles sin_datos verdict gracefully', () => {
    const n = svc.buildFallback({ overallVerdict: 'sin_datos' }, { student, filters: { academicYearId: 'y1' } } as StudentReportData);
    expect(n.aiGenerated).toBe(false);
    expect(n.academicAssessment).toBeDefined();
  });

  it('build() falls back to deterministic when AI disabled', async () => {
    const n = await svc.build({ overallVerdict: 'en_progreso' }, { student, filters: { academicYearId: 'y1' } } as StudentReportData);
    expect(n.aiGenerated).toBe(false);
  });

  it('detailed sin API key → fallback rellena detailedAcademic y lomloeAssessment desde los datos', async () => {
    const data: any = {
      student: { firstName: 'Ana', lastName: 'P' }, filters: { detailed: true },
      subgrades: [{ subjectName: 'Mates', finalGrade: 72, works: [{ title: 'Tarea 1', type: 'tarea', score: 8, percentage: 80 }] }],
      lomloeCatalog: [{ subjectName: 'Mates', criteria: [{ code: '1.1', description: 'Resolver problemas' }] }],
    };
    const n = await svc.build({ academic: { overallAverage: 72, band: 'notable' } } as any, data);
    expect(n.aiGenerated).toBe(false);
    expect(n.detailedAcademic).toContain('Mates');
    expect(n.detailedAcademic).toContain('Tarea 1');
    expect(n.lomloeAssessment).toContain('1.1');
  });

  it('sin detailed → no añade campos detallados (salida actual intacta)', async () => {
    const data: any = { student: { firstName: 'Ana' }, filters: {} };
    const n = await svc.build({} as any, data);
    expect(n.detailedAcademic).toBeUndefined();
    expect(n.lomloeAssessment).toBeUndefined();
  });

  it('prompt detallado incluye trabajos y criterios', () => {
    const p = (svc as any).prompt({}, {
      student: { firstName: 'A' }, filters: { detailed: true },
      subgrades: [{ subjectName: 'Mates', finalGrade: 72, works: [{ title: 'Tarea 1' }] }],
      lomloeCatalog: [{ subjectName: 'Mates', criteria: [{ code: '1.1', description: 'x' }] }],
    });
    expect(p).toContain('Tarea 1');
    expect(p).toContain('1.1');
  });
});
