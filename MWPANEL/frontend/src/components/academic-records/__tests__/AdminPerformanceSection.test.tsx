import { describe, it, expect } from 'vitest';
import { computeSummary } from '../AdminPerformanceSection';

describe('computeSummary (resumen de rendimiento admin)', () => {
  it('calcula medias por asignatura (solo ANNUAL) y % aprobados desde isPassing', () => {
    const entries = [
      // Lengua: dos ANNUAL? No: una ANNUAL por asignatura. Mezclamos trimestrales para verificar que se ignoran.
      { subjectAssignmentId: 'sa1', title: 'Lengua', period: 'annual', numericValue: 80, isPassing: true },
      { subjectAssignmentId: 'sa1', title: 'Lengua', period: 'first_trimester', numericValue: 50, isPassing: true },
      { subjectAssignmentId: 'sa2', title: 'Mates', period: 'annual', numericValue: 40, isPassing: false },
      { subjectAssignmentId: 'sa3', title: 'Inglés', period: 'annual', numericValue: '60.50', isPassing: true },
    ];
    const s = computeSummary(entries as any);
    // solo 3 ANNUAL: Lengua 80, Mates 40, Inglés 60.5
    expect(s.totalSubjects).toBe(3);
    expect(s.perSubject).toEqual([
      { subject: 'Lengua', average: 80 },
      { subject: 'Mates', average: 40 },
      { subject: 'Inglés', average: 60.5 },
    ]);
    // 2 de 3 aprobadas -> 66.67%
    expect(s.passingPct).toBe(66.67);
  });

  it('sin entradas ANNUAL -> resumen vacío sin romper', () => {
    const s = computeSummary([] as any);
    expect(s.totalSubjects).toBe(0);
    expect(s.perSubject).toEqual([]);
    expect(s.passingPct).toBe(0);
  });
});
