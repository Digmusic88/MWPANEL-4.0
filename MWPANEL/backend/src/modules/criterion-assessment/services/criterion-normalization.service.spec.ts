import { CriterionNormalizationService } from './criterion-normalization.service';
import { CriterionScaleType, AchievementLevel } from '../entities/criterion-assessment.entity';

describe('CriterionNormalizationService', () => {
  const svc = new CriterionNormalizationService();
  const mapping = { EMERGING: 40, DEVELOPING: 60, ACHIEVING: 80, EXCEEDING: 100 };

  it('niveles → levelMapping', () => {
    expect(svc.normalize({ scaleType: CriterionScaleType.LEVELS, levelValue: AchievementLevel.ACHIEVING, numericMax: 10, levelMapping: mapping })).toBe(80);
  });
  it('numérico → (value/max)*100', () => {
    expect(svc.normalize({ scaleType: CriterionScaleType.NUMERIC, numericValue: 7, numericMax: 10, levelMapping: mapping })).toBe(70);
  });
  it('numérico recorta a [0,100]', () => {
    expect(svc.normalize({ scaleType: CriterionScaleType.NUMERIC, numericValue: 12, numericMax: 10, levelMapping: mapping })).toBe(100);
  });
  it('nivel desconocido → 0', () => {
    expect(svc.normalize({ scaleType: CriterionScaleType.LEVELS, levelValue: 'X' as any, numericMax: 10, levelMapping: mapping })).toBe(0);
  });
});

describe('CriterionNormalizationService levels3', () => {
  const svc = new CriterionNormalizationService();
  const mapping = { NOT_ACHIEVED: 0, IN_PROGRESS: 50, ACHIEVED: 100 };
  const base = { scaleType: CriterionScaleType.LEVELS3, numericValue: null, numericMax: 10, levelMapping: mapping };

  it('ACHIEVED -> 100', () => expect(svc.normalize({ ...base, levelValue: 'ACHIEVED' })).toBe(100));
  it('IN_PROGRESS -> 50', () => expect(svc.normalize({ ...base, levelValue: 'IN_PROGRESS' })).toBe(50));
  it('NOT_ACHIEVED -> 0', () => expect(svc.normalize({ ...base, levelValue: 'NOT_ACHIEVED' })).toBe(0));
  it('mapping personalizado', () =>
    expect(svc.normalize({ ...base, levelMapping: { NOT_ACHIEVED: 10, IN_PROGRESS: 60, ACHIEVED: 95 }, levelValue: 'IN_PROGRESS' })).toBe(60));
  it('nivel desconocido -> 0', () => expect(svc.normalize({ ...base, levelValue: 'ZZZ' as any })).toBe(0));
});
