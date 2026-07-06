import { Injectable, NotFoundException, BadGatewayException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CurriculumGeneration, GenerationStatus, GenerationScopeType } from '../entities/curriculum-generation.entity';
import { SystemSetting } from '../../settings/entities/system-setting.entity';
import { DecreeLoaderService } from './decree-loader.service';
import { CurriculumPromptService } from './curriculum-prompt.service';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'google/gemini-2.5-flash';

@Injectable()
export class CurriculumGenerationService {
  constructor(
    @InjectRepository(CurriculumGeneration) private readonly repo: Repository<CurriculumGeneration>,
    @InjectRepository(SystemSetting) private readonly settingRepo: Repository<SystemSetting>,
    private readonly decrees: DecreeLoaderService,
    private readonly prompt: CurriculumPromptService,
    private readonly config: ConfigService,
  ) {}

  private async apiKey(): Promise<string> {
    const s = await this.settingRepo.findOne({ where: { key: 'openrouter_api_key' } });
    return s?.value || this.config.get<string>('OPENROUTER_API_KEY') || '';
  }

  async generate(subjectName: string, scopeType: 'cycle' | 'course', scopeId: string, userId: string): Promise<CurriculumGeneration> {
    const key = await this.apiKey();
    if (!key) throw new BadGatewayException('OpenRouter API key no configurada');
    const scope = await this.decrees.resolveScope(scopeType, scopeId);
    const decreeText = this.decrees.getDecreeText(scope.decreeKey);
    const { system, user } = this.prompt.build(subjectName, scope.scopeLabel, decreeText);
    let payload: any;
    try {
      const resp = await axios.post(OPENROUTER_URL, {
        model: OPENROUTER_MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: 12000, temperature: 0.2, response_format: { type: 'json_object' },
      }, { headers: {
        'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://plataforma.mundoworld.school', 'X-Title': 'MW Panel - Curriculum Generation',
      }, timeout: 120000 });
      const content = resp.data?.choices?.[0]?.message?.content ?? '';
      const a = content.indexOf('{'); const b = content.lastIndexOf('}');
      payload = a >= 0 && b > a ? JSON.parse(content.slice(a, b + 1)) : null;
    } catch (e: any) {
      throw new BadGatewayException(`La IA no pudo generar el currículo: ${e?.message || 'error'}`);
    }
    if (!payload || !Array.isArray(payload.specificCompetencies) || !Array.isArray(payload.basicKnowledge)) {
      throw new BadGatewayException('La IA devolvió un formato inesperado');
    }
    const row = this.repo.create({
      subjectName, educationalLevelId: scope.educationalLevelId,
      scopeType: scopeType as GenerationScopeType, scopeId,
      status: GenerationStatus.DRAFT, model: OPENROUTER_MODEL, payload, createdBy: userId,
    });
    return this.repo.save(row);
  }

  async getOne(id: string): Promise<CurriculumGeneration> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Generación no encontrada');
    return row;
  }

  async saveEdited(id: string, payload: any): Promise<CurriculumGeneration> {
    const row = await this.getOne(id);
    row.payload = payload;
    return this.repo.save(row);
  }

  async discard(id: string): Promise<{ discarded: boolean }> {
    const row = await this.getOne(id);
    row.status = GenerationStatus.DISCARDED;
    await this.repo.save(row);
    return { discarded: true };
  }

  list(subjectName: string, scopeType: GenerationScopeType, scopeId: string) {
    return this.repo.find({ where: { subjectName, scopeType, scopeId }, order: { createdAt: 'DESC' } });
  }
}
