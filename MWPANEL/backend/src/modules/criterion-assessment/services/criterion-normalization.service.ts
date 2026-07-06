import { Injectable } from '@nestjs/common';
import { CriterionScaleType, AchievementLevel } from '../entities/criterion-assessment.entity';

export interface NormalizeInput {
  scaleType: CriterionScaleType;
  levelValue?: AchievementLevel | string | null;
  numericValue?: number | null;
  numericMax: number;
  levelMapping: Record<string, number>;
}

@Injectable()
export class CriterionNormalizationService {
  normalize(input: NormalizeInput): number {
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    if (input.scaleType === CriterionScaleType.LEVELS || input.scaleType === CriterionScaleType.LEVELS3) {
      const v = input.levelValue ? input.levelMapping[input.levelValue as string] : undefined;
      return clamp(typeof v === 'number' ? v : 0);
    }
    const max = input.numericMax > 0 ? input.numericMax : 10;
    const val = typeof input.numericValue === 'number' ? input.numericValue : 0;
    return clamp((val / max) * 100);
  }
}
