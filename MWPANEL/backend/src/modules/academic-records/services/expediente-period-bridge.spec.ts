import { mapGradePeriodToAcademicPeriod, resolveAcademicYearName } from './expediente-period-bridge';
import { GradePeriod } from '../../grades/entities/centralized-grade.entity';
import { AcademicPeriod } from '../entities/academic-record.types';

describe('expediente-period-bridge', () => {
  it('mapea GradePeriod→AcademicPeriod', () => {
    expect(mapGradePeriodToAcademicPeriod(GradePeriod.FIRST_TRIMESTER)).toBe(AcademicPeriod.FIRST_TRIMESTER);
    expect(mapGradePeriodToAcademicPeriod(GradePeriod.THIRD_TRIMESTER)).toBe(AcademicPeriod.THIRD_TRIMESTER);
    expect(mapGradePeriodToAcademicPeriod(GradePeriod.ANNUAL)).toBe(AcademicPeriod.ANNUAL);
    expect(mapGradePeriodToAcademicPeriod(GradePeriod.CONTINUOUS)).toBe(AcademicPeriod.ANNUAL);
    expect(mapGradePeriodToAcademicPeriod(undefined)).toBe(AcademicPeriod.ANNUAL);
  });
  it('resolveAcademicYearName devuelve el nombre si no es vacío', () => {
    expect(resolveAcademicYearName('2025-2026')).toBe('2025-2026');
    expect(resolveAcademicYearName('2099-2100')).toBe('2099-2100'); // sin tope
    expect(resolveAcademicYearName('')).toBeNull();
  });
});
