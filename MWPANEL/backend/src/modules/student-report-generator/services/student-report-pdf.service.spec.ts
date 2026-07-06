import { StudentReportPdfService } from './student-report-pdf.service';
import { StudentReportResult } from '../types/student-report.types';

const svc = new StudentReportPdfService();
const result: StudentReportResult = {
  student: { id: 's1', firstName: 'Ana', lastName: 'Pérez', enrollmentNumber: 'E1', classGroup: 'G1', educationalLevel: 'Primaria' },
  filters: { academicYearId: 'y1' },
  data: { student: { id: 's1', firstName: 'Ana', lastName: 'Pérez', enrollmentNumber: 'E1', classGroup: 'G1', educationalLevel: 'Primaria' }, filters: { academicYearId: 'y1' },
    academic: { hasData: true, overallAverage: 72, subjects: [{ subjectId: 'a', name: 'Mates', code: 'MAT', average: 90, gradedItems: 3 }] } },
  metrics: { academic: { overallAverage: 72, band: 'bien' }, overallVerdict: 'en_progreso' },
  narrative: { aiGenerated: false, academicAssessment: 'Buen rendimiento.', socioEmotionalAssessment: 'Sin datos.', strengths: ['Mates'], improvementAreas: [], recommendations: ['Seguir así'] },
  generatedAt: new Date().toISOString(),
};

describe('StudentReportPdfService', () => {
  it('generates a non-empty PDF buffer', async () => {
    const buf = await svc.generate(result);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 4).toString()).toBe('%PDF'); // cabecera PDF
  });
});
