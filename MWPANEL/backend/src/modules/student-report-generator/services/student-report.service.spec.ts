import { StudentReportService } from './student-report.service';
import { UserRole } from '../../users/entities/user.entity';

describe('StudentReportService.toFilters (detailed propagation)', () => {
  const student = { id: 's1', firstName: 'Ana', lastName: 'Pérez', enrollmentNumber: 'E1', classGroup: null, educationalLevel: null };
  const baseData = { student, filters: {}, academic: undefined };

  function buildService() {
    const collector = { collect: jest.fn().mockResolvedValue(baseData) };
    const metrics = { compute: jest.fn().mockReturnValue({ overallVerdict: 'sin_datos' }) };
    const narrative = { build: jest.fn().mockResolvedValue({ aiGenerated: false, academicAssessment: '', socioEmotionalAssessment: '', strengths: [], improvementAreas: [], recommendations: [] }) };
    const pdf = { generate: jest.fn() };
    const students = { canTeacherAccessStudent: jest.fn().mockResolvedValue(true) };
    const yearRepo = { find: jest.fn() };
    const service = new StudentReportService(collector as any, metrics as any, narrative as any, pdf as any, students as any, yearRepo as any);
    return { service, collector };
  }

  it('propaga detailed:true del DTO hasta los filtros pasados al collector', async () => {
    const { service, collector } = buildService();
    await service.generate({ studentId: 's1', academicYearId: 'y1', detailed: true } as any, 'u1', UserRole.ADMIN);
    expect(collector.collect).toHaveBeenCalledTimes(1);
    const [, filtersArg] = collector.collect.mock.calls[0];
    expect(filtersArg.detailed).toBe(true);
  });

  it('retrocompat: sin detailed en el DTO, filtros quedan con detailed undefined', async () => {
    const { service, collector } = buildService();
    await service.generate({ studentId: 's1', academicYearId: 'y1' } as any, 'u1', UserRole.ADMIN);
    const [, filtersArg] = collector.collect.mock.calls[0];
    expect(filtersArg.detailed).toBeUndefined();
  });
});
