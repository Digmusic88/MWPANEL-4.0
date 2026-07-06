import { CentralizedGradesController } from './controllers/centralized-grades.controller';

function makeController(): CentralizedGradesController {
  return Object.create(CentralizedGradesController.prototype) as CentralizedGradesController;
}

describe('CentralizedGradesController — escala 0-100 (SP-D2a)', () => {
  it('usa finalGrade tal cual (0-100), sin multiplicar por 10', () => {
    const c = makeController();
    const grade: any = {
      studentId: 'stu-1',
      finalGrade: 75,
      breakdown: [],
      updatedAt: new Date('2026-06-27T00:00:00Z'),
      student: { user: { profile: { firstName: 'Ana', lastName: 'Pi' } }, enrollmentNumber: 'E1' },
    };
    const row = (c as any).mapGradeToClassRow(grade);
    expect(row.finalGrade).toBe(75);        // NO 750
    expect(row.isPassing).toBe(true);        // 75 >= 50
    expect(row.hasData).toBe(true);
  });

  it('finalGrade 0 → sin datos (null) y no aprobado', () => {
    const c = makeController();
    const grade: any = { studentId: 'stu-2', finalGrade: 0, breakdown: [], updatedAt: new Date(), student: {} };
    const row = (c as any).mapGradeToClassRow(grade);
    expect(row.finalGrade).toBeNull();
    expect(row.hasData).toBe(false);
    expect(row.isPassing).toBe(false);
  });

  it('un 40 (suspenso en %) se mapea a 40 y isPassing=false', () => {
    const c = makeController();
    const grade: any = { studentId: 'stu-3', finalGrade: 40, breakdown: [], updatedAt: new Date(), student: {} };
    const row = (c as any).mapGradeToClassRow(grade);
    expect(row.finalGrade).toBe(40);
    expect(row.isPassing).toBe(false);
  });
});
