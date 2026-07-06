import { GradePeriod } from '../../grades/entities/centralized-grade.entity';
import { AcademicPeriod } from '../entities/academic-record.types';

export function mapGradePeriodToAcademicPeriod(period?: GradePeriod): AcademicPeriod {
  switch (period) {
    case GradePeriod.FIRST_TRIMESTER: return AcademicPeriod.FIRST_TRIMESTER;
    case GradePeriod.SECOND_TRIMESTER: return AcademicPeriod.SECOND_TRIMESTER;
    case GradePeriod.THIRD_TRIMESTER: return AcademicPeriod.THIRD_TRIMESTER;
    case GradePeriod.ANNUAL:
    case GradePeriod.CONTINUOUS:
    default: return AcademicPeriod.ANNUAL;
  }
}

export function resolveAcademicYearName(name: string): string | null {
  return name && name.trim() ? name : null;
}
