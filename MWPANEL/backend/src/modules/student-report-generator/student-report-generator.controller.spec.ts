import { ForbiddenException } from '@nestjs/common';
import { StudentReportService } from './services/student-report.service';
import { UserRole } from '../users/entities/user.entity';

describe('StudentReportService access', () => {
  const collector = { collect: jest.fn().mockResolvedValue({ student: { id: 's1', firstName: 'Ana', lastName: 'P', enrollmentNumber: 'E1', classGroup: null, educationalLevel: null }, filters: { academicYearId: 'y1' } }) };
  const metrics = { compute: jest.fn().mockReturnValue({ overallVerdict: 'sin_datos' }) };
  const narrative = { build: jest.fn().mockResolvedValue({ aiGenerated: false, academicAssessment: '', socioEmotionalAssessment: '', strengths: [], improvementAreas: [], recommendations: [] }) };
  const pdf = { generate: jest.fn() };
  const yearRepo = { find: jest.fn(), findOne: jest.fn() };

  it('throws 403 for a teacher without access', async () => {
    const students = { canTeacherAccessStudent: jest.fn().mockResolvedValue(false) };
    const svc = new StudentReportService(collector as any, metrics as any, narrative as any, pdf as any, students as any, yearRepo as any);
    await expect(svc.generate({ studentId: 's1', academicYearId: 'y1' } as any, 'u1', UserRole.TEACHER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('admin bypasses access check and returns a result', async () => {
    const students = { canTeacherAccessStudent: jest.fn() };
    const svc = new StudentReportService(collector as any, metrics as any, narrative as any, pdf as any, students as any, yearRepo as any);
    const r = await svc.generate({ studentId: 's1', academicYearId: 'y1' } as any, 'admin1', UserRole.ADMIN);
    expect(r.metrics.overallVerdict).toBe('sin_datos');
    expect(students.canTeacherAccessStudent).not.toHaveBeenCalled();
  });
});
