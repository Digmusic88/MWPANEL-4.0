import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CurriculumGenerationService } from '../curriculum-generation.service';
import { CurriculumGeneration } from '../../entities/curriculum-generation.entity';
import { SystemSetting } from '../../../settings/entities/system-setting.entity';
import { DecreeLoaderService } from '../decree-loader.service';
import { CurriculumPromptService } from '../curriculum-prompt.service';

jest.mock('axios');

describe('CurriculumGenerationService', () => {
  const build = async () => {
    const genRepo = { create: (x: any) => x, save: jest.fn(async (x) => ({ id: 'g1', ...x })) };
    const mod = await Test.createTestingModule({
      providers: [
        CurriculumGenerationService,
        { provide: getRepositoryToken(CurriculumGeneration), useValue: genRepo },
        { provide: getRepositoryToken(SystemSetting), useValue: { findOne: jest.fn().mockResolvedValue({ value: 'sk-or-test' }) } },
        { provide: DecreeLoaderService, useValue: { resolveScope: jest.fn().mockResolvedValue({ educationalLevelId: 'L', levelName: 'Educación Primaria', scopeLabel: '3º Primaria', decreeKey: 'primaria' }), getDecreeText: jest.fn().mockReturnValue('DECRETO') } },
        { provide: CurriculumPromptService, useValue: { build: jest.fn().mockReturnValue({ system: 's', user: 'u' }) } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    return { svc: mod.get(CurriculumGenerationService), genRepo };
  };

  it('genera un draft parseando el JSON de Gemini', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: { choices: [{ message: { content: '{"specificCompetencies":[{"code":"CE.MAT.1","name":"x","description":"d","keyCompetencyCodes":["STEM"],"criteria":[{"code":"1.1","description":"c"}]}],"basicKnowledge":[{"code":"A.1","block":"A","title":"t","description":"d","knowledgeType":"KNOWLEDGE"}]}' } }] } });
    const { svc, genRepo } = await build();
    const res = await svc.generate('Matemáticas', 'course', 'c1', 'u1');
    expect(genRepo.save).toHaveBeenCalled();
    expect(res.payload.specificCompetencies[0].code).toBe('CE.MAT.1');
    expect(res.status).toBe('draft');
  });

  it('si la IA falla, lanza y NO guarda', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('boom'));
    const { svc, genRepo } = await build();
    await expect(svc.generate('Matemáticas', 'course', 'c1', 'u1')).rejects.toThrow();
    expect(genRepo.save).not.toHaveBeenCalled();
  });
});
