import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CriterionScaleConfigService } from './criterion-scale-config.service';
import { CriterionScaleConfig } from '../entities/criterion-scale-config.entity';
import { SettingsService } from '../../settings/settings.service';
import { CriterionScaleType } from '../entities/criterion-assessment.entity';

describe('CriterionScaleConfigService', () => {
  let svc: CriterionScaleConfigService;
  const repo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => x) };
  const settings = { getJSON: jest.fn(), upsert: jest.fn() };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CriterionScaleConfigService,
        { provide: getRepositoryToken(CriterionScaleConfig), useValue: repo },
        { provide: SettingsService, useValue: settings },
      ],
    }).compile();
    svc = mod.get(CriterionScaleConfigService);
    jest.clearAllMocks();
  });

  it('usa el defecto de centro si no hay config de asignatura', async () => {
    repo.findOne.mockResolvedValue(null);
    settings.getJSON.mockResolvedValue({ scaleType: 'numeric', numericMax: 10, levelMapping: {} });
    const cfg = await svc.getEffectiveConfig('a1');
    expect(cfg.scaleType).toBe('numeric');
  });

  it('usa la config de asignatura si existe', async () => {
    repo.findOne.mockResolvedValue({ scaleType: CriterionScaleType.LEVELS, numericMax: 10, levelMapping: { EMERGING: 40 } });
    const cfg = await svc.getEffectiveConfig('a1');
    expect(cfg.scaleType).toBe(CriterionScaleType.LEVELS);
    expect(settings.getJSON).not.toHaveBeenCalled();
  });
});
