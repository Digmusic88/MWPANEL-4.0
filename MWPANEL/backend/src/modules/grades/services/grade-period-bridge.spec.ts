import { mapGradePeriodToPeriodTypes } from './grade-period-bridge';
import { GradePeriod } from '../entities/centralized-grade.entity';
import { PeriodType } from '../../evaluations/entities/evaluation-period.entity';

describe('mapGradePeriodToPeriodTypes', () => {
  it('mapea trimestres 1:1 por nombre', () => {
    expect(mapGradePeriodToPeriodTypes(GradePeriod.FIRST_TRIMESTER)).toEqual([PeriodType.TRIMESTER_1]);
    expect(mapGradePeriodToPeriodTypes(GradePeriod.SECOND_TRIMESTER)).toEqual([PeriodType.TRIMESTER_2]);
    expect(mapGradePeriodToPeriodTypes(GradePeriod.THIRD_TRIMESTER)).toEqual([PeriodType.TRIMESTER_3]);
  });
  it('ANNUAL agrega los 3 trimestres', () => {
    expect(mapGradePeriodToPeriodTypes(GradePeriod.ANNUAL)).toEqual([PeriodType.TRIMESTER_1, PeriodType.TRIMESTER_2, PeriodType.TRIMESTER_3]);
  });
  it('CONTINUOUS y undefined → CONTINUOUS', () => {
    expect(mapGradePeriodToPeriodTypes(GradePeriod.CONTINUOUS)).toEqual([PeriodType.CONTINUOUS]);
    expect(mapGradePeriodToPeriodTypes(undefined)).toEqual([PeriodType.CONTINUOUS]);
  });
});
