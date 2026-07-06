import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CriterionScaleConfig } from '../entities/criterion-scale-config.entity';
import { CriterionScaleType, LEVELS3_DEFAULT_MAPPING } from '../entities/criterion-assessment.entity';
import { SettingsService } from '../../settings/settings.service';

const DEFAULT_MAPPING = { EMERGING: 40, DEVELOPING: 60, ACHIEVING: 80, EXCEEDING: 100 };
const CENTER_KEY = 'criterion.defaultScale';

export interface EffectiveScale { scaleType: CriterionScaleType; numericMax: number; levelMapping: Record<string, number>; }

@Injectable()
export class CriterionScaleConfigService {
  constructor(
    @InjectRepository(CriterionScaleConfig) private readonly repo: Repository<CriterionScaleConfig>,
    private readonly settings: SettingsService,
  ) {}

  async getCenterDefault(): Promise<EffectiveScale> {
    const v = await this.settings.getJSON<Partial<EffectiveScale>>(CENTER_KEY, {});
    return {
      scaleType: (v.scaleType as CriterionScaleType) || CriterionScaleType.LEVELS,
      numericMax: v.numericMax ?? 10,
      levelMapping: v.levelMapping ?? this.defaultMappingFor((v.scaleType as CriterionScaleType) || CriterionScaleType.LEVELS),
    };
  }

  private defaultMappingFor(scaleType: CriterionScaleType): Record<string, number> {
    return scaleType === CriterionScaleType.LEVELS3 ? LEVELS3_DEFAULT_MAPPING : DEFAULT_MAPPING;
  }

  async getEffectiveConfig(subjectAssignmentId: string): Promise<EffectiveScale> {
    const cfg = await this.repo.findOne({ where: { subjectAssignmentId } });
    if (cfg) {
      const levelMapping = cfg.levelMapping && Object.keys(cfg.levelMapping).length
        ? cfg.levelMapping : this.defaultMappingFor(cfg.scaleType);
      return { scaleType: cfg.scaleType, numericMax: cfg.numericMax, levelMapping };
    }
    return this.getCenterDefault();
  }

  async setConfig(subjectAssignmentId: string, dto: Partial<EffectiveScale>): Promise<CriterionScaleConfig> {
    let cfg = await this.repo.findOne({ where: { subjectAssignmentId } });
    if (!cfg) cfg = this.repo.create({ subjectAssignmentId });
    if (dto.scaleType) cfg.scaleType = dto.scaleType;
    if (typeof dto.numericMax === 'number') cfg.numericMax = dto.numericMax;
    if (dto.levelMapping) cfg.levelMapping = dto.levelMapping;
    return this.repo.save(cfg);
  }

  async setCenterDefault(dto: Partial<EffectiveScale>): Promise<void> {
    await this.settings.upsert(CENTER_KEY, dto);
  }
}
