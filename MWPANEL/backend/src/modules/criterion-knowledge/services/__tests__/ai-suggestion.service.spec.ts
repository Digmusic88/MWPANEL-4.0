import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiSuggestionService } from '../ai-suggestion.service';
import { CandidatePoolService } from '../candidate-pool.service';
import { CriterionBasicKnowledge } from '../../entities/criterion-basic-knowledge.entity';
import { EvaluationCriterion } from '../../../competencies/entities/evaluation-criterion.entity';
import { SystemSetting } from '../../../settings/entities/system-setting.entity';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AiSuggestionService', () => {
  const settingRepoStub = { findOne: jest.fn().mockResolvedValue(null) };

  const build = async (openrouterKey: string | undefined) => {
    settingRepoStub.findOne.mockResolvedValue(openrouterKey ? { value: openrouterKey } : null);
    const mod = await Test.createTestingModule({
      providers: [
        AiSuggestionService,
        { provide: CandidatePoolService, useValue: { getCandidates: jest.fn() } },
        { provide: getRepositoryToken(CriterionBasicKnowledge), useValue: { findOne: jest.fn(), find: jest.fn(), create: (x: any) => x, save: jest.fn((x) => x) } },
        { provide: getRepositoryToken(EvaluationCriterion), useValue: { find: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        { provide: getRepositoryToken(SystemSetting), useValue: settingRepoStub },
      ],
    }).compile();
    return mod.get(AiSuggestionService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin openrouter_api_key usa fallback léxico determinista y devuelve solo candidatos relevantes', async () => {
    const svc = await build(undefined);
    const criterion: any = { id: 'c1', description: 'Identificar los seres vivos y sus funciones vitales' };
    const candidates: any = [
      { id: 'k1', code: 'A.1', description: 'Los seres vivos: funciones vitales y clasificación' },
      { id: 'k2', code: 'B.3', description: 'Las máquinas y la energía eléctrica' },
    ];
    const result = await svc.suggestForCriterion(criterion, candidates);
    const ids = result.map((r) => r.basicKnowledgeId);
    expect(ids).toContain('k1');
    expect(ids).not.toContain('k2');
    expect(result.every((r) => r.confidence >= 0 && r.confidence <= 1)).toBe(true);
  });

  it('con openrouter_api_key llama a axios y parsea el JSON de respuesta', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: {
        choices: [{ message: { content: '{"matches":[{"id":"k1","confidence":0.9}]}' } }],
      },
    });
    const svc = await build('fake-key-123');
    const criterion: any = { id: 'c1', description: 'Identificar los seres vivos' };
    const candidates: any = [
      { id: 'k1', code: 'A.1', title: 'Seres vivos', description: 'funciones vitales' },
      { id: 'k2', code: 'B.3', title: 'Máquinas', description: 'energía eléctrica' },
    ];
    const result = await svc.suggestForCriterion(criterion, candidates);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({ model: 'google/gemini-2.5-flash' }),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer fake-key-123' }) }),
    );
    expect(result).toEqual([{ basicKnowledgeId: 'k1', confidence: 0.9 }]);
  });

  it('con openrouter_api_key hace fallback léxico si axios lanza', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('network error'));
    const svc = await build('fake-key-123');
    const criterion: any = { id: 'c1', description: 'Identificar los seres vivos y sus funciones vitales' };
    const candidates: any = [
      { id: 'k1', code: 'A.1', title: 'Seres vivos', description: 'Los seres vivos: funciones vitales y clasificación' },
      { id: 'k2', code: 'B.3', title: 'Máquinas', description: 'Las máquinas y la energía eléctrica' },
    ];
    const result = await svc.suggestForCriterion(criterion, candidates);
    // fallback léxico: k1 debería superar el threshold
    const ids = result.map((r) => r.basicKnowledgeId);
    expect(ids).toContain('k1');
    expect(result.every((r) => r.confidence >= 0 && r.confidence <= 1)).toBe(true);
  });

  it('lexicalScore es simétricamente alto para textos solapados y bajo para disjuntos', () => {
    // construir sin DI: el helper es puro
    const svc: any = new (AiSuggestionService as any)(
      { getCandidates: jest.fn() },
      { save: jest.fn() },
      { find: jest.fn() },
      { get: () => undefined },
      { findOne: jest.fn().mockResolvedValue(null) }, // settingRepo stub (5th arg)
    );
    expect(svc.lexicalScore('seres vivos funciones vitales', 'funciones vitales de los seres vivos')).toBeGreaterThan(0.4);
    expect(svc.lexicalScore('seres vivos', 'energía eléctrica máquinas')).toBeLessThan(0.2);
  });
});
