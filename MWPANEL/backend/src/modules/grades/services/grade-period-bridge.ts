import { GradePeriod } from '../entities/centralized-grade.entity';
import { PeriodType } from '../../evaluations/entities/evaluation-period.entity';

export function mapGradePeriodToPeriodTypes(period?: GradePeriod): PeriodType[] {
  switch (period) {
    case GradePeriod.FIRST_TRIMESTER: return [PeriodType.TRIMESTER_1];
    case GradePeriod.SECOND_TRIMESTER: return [PeriodType.TRIMESTER_2];
    case GradePeriod.THIRD_TRIMESTER: return [PeriodType.TRIMESTER_3];
    case GradePeriod.ANNUAL: return [PeriodType.TRIMESTER_1, PeriodType.TRIMESTER_2, PeriodType.TRIMESTER_3];
    case GradePeriod.CONTINUOUS:
    default: return [PeriodType.CONTINUOUS];
  }
}
