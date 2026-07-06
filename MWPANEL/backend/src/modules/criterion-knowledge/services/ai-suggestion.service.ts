import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CandidatePoolService } from './candidate-pool.service';
import { CriterionBasicKnowledge, CriterionKnowledgeStatus, CriterionKnowledgeSource } from '../entities/criterion-basic-knowledge.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { SystemSetting } from '../../settings/entities/system-setting.entity';

const LEXICAL_THRESHOLD = 0.25;
const OPENROUTER_MODEL = 'google/gemini-2.5-flash';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class AiSuggestionService {
  private readonly logger = new Logger(AiSuggestionService.name);
  constructor(
    private readonly pool: CandidatePoolService,
    @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
    @InjectRepository(EvaluationCriterion) private readonly criterionRepo: Repository<EvaluationCriterion>,
    private readonly config: ConfigService,
    @InjectRepository(SystemSetting) private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  private tokenize(s: string): Set<string> {
    return new Set(
      (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/)
        .filter((w) => w.length > 3),
    );
  }

  lexicalScore(a: string, b: string): number {
    const ta = this.tokenize(a); const tb = this.tokenize(b);
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    return inter / Math.min(ta.size, tb.size); // overlap coefficient (simétrico-acotado)
  }

  private async getOpenRouterApiKey(): Promise<string> {
    try {
      const setting = await this.settingRepo.findOne({ where: { key: 'openrouter_api_key' } });
      if (setting?.value) return setting.value;
    } catch {
      // ignore DB errors, fall through to env
    }
    return this.config.get<string>('OPENROUTER_API_KEY', '');
  }

  async suggestForCriterion(criterion: EvaluationCriterion, candidates: BasicKnowledge[]): Promise<{ basicKnowledgeId: string; confidence: number }[]> {
    if (candidates.length === 0) return [];
    const apiKey = await this.getOpenRouterApiKey();
    if (apiKey) {
      try {
        return await this.suggestWithOpenRouter(criterion, candidates);
      } catch (e: any) {
        this.logger.warn(`IA no disponible, fallback léxico: ${e?.message}`);
      }
    }
    return this.suggestLexical(criterion, candidates);
  }

  private suggestLexical(criterion: EvaluationCriterion, candidates: BasicKnowledge[]): { basicKnowledgeId: string; confidence: number }[] {
    return candidates
      .map((k) => ({ basicKnowledgeId: k.id, confidence: Number(this.lexicalScore(criterion.description, `${(k as any).title} ${k.description}`).toFixed(3)) }))
      .filter((r) => r.confidence >= LEXICAL_THRESHOLD);
  }

  private async suggestWithOpenRouter(criterion: EvaluationCriterion, candidates: BasicKnowledge[]): Promise<{ basicKnowledgeId: string; confidence: number }[]> {
    const apiKey = await this.getOpenRouterApiKey();
    const list = candidates.map((k) => ({ id: k.id, code: (k as any).code, description: `${(k as any).title}: ${k.description}`.slice(0, 300) }));
    const prompt = `Criterio de evaluación LOMLOE: "${criterion.description}". ` +
      `De la siguiente lista de saberes básicos del área, indica cuáles evalúa ese criterio. ` +
      `Saberes: ${JSON.stringify(list)}. ` +
      `Devuelve SOLO un JSON: {"matches":[{"id":"<id del saber>","confidence":<0..1>}]}. ` +
      `Incluye solo los saberes realmente relacionados (puede ser ninguno).`;
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'Eres un experto en currículo LOMLOE español. Relacionas criterios de evaluación con saberes básicos. Devuelve solo JSON válido.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://plataforma.mundoworld.school',
          'X-Title': 'MW Panel - Criterion Suggestions',
        },
        timeout: 20000,
      },
    );
    const text: string = response.data?.choices?.[0]?.message?.content ?? '';
    const a = text.indexOf('{'); const b = text.lastIndexOf('}');
    const parsed = a >= 0 && b > a ? JSON.parse(text.slice(a, b + 1)) : { matches: [] };
    const validIds = new Set(candidates.map((k) => k.id));
    return (parsed.matches || [])
      .filter((m: any) => validIds.has(m.id))
      .map((m: any) => ({ basicKnowledgeId: m.id, confidence: Math.max(0, Math.min(1, Number(m.confidence) || 0)) }));
  }

  async suggestSaberesForText(text: string, candidates: BasicKnowledge[]): Promise<{ basicKnowledgeId: string; confidence: number }[]> {
    if (!text || candidates.length === 0) return [];
    const apiKey = await this.getOpenRouterApiKey();
    if (apiKey) {
      try {
        const list = candidates.map((k) => ({ id: k.id, code: (k as any).code, description: `${(k as any).title}: ${k.description}`.slice(0, 300) }));
        const prompt = `Descripción/rúbrica de un TRABAJO escolar (actividad/tarea/examen): "${text.slice(0, 2000)}". ` +
          `De la siguiente lista de saberes básicos LOMLOE del área, indica cuáles EVALÚA ese trabajo. ` +
          `Saberes: ${JSON.stringify(list)}. ` +
          `Devuelve SOLO un JSON: {"matches":[{"id":"<id del saber>","confidence":<0..1>}]}. ` +
          `Incluye solo los saberes realmente evaluados (puede ser ninguno).`;
        const response = await axios.post(OPENROUTER_URL, {
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: 'Eres un experto en currículo LOMLOE español. Relacionas trabajos de aula con saberes básicos. Devuelve solo JSON válido.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 4000, temperature: 0.2, response_format: { type: 'json_object' },
        }, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://plataforma.mundoworld.school', 'X-Title': 'MW Panel - Work Tagging' },
          timeout: 20000,
        });
        const raw: string = response.data?.choices?.[0]?.message?.content ?? '';
        const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');
        const parsed = a >= 0 && b > a ? JSON.parse(raw.slice(a, b + 1)) : { matches: [] };
        const validIds = new Set(candidates.map((k) => k.id));
        return (parsed.matches || []).filter((m: any) => validIds.has(m.id))
          .map((m: any) => ({ basicKnowledgeId: m.id, confidence: Math.max(0, Math.min(1, Number(m.confidence) || 0)) }));
      } catch (e: any) {
        this.logger.warn(`IA no disponible (work tagging), fallback léxico: ${e?.message}`);
      }
    }
    // fallback léxico
    return candidates.map((k) => ({ basicKnowledgeId: k.id, confidence: Number(this.lexicalScore(text, `${(k as any).title} ${k.description}`).toFixed(3)) }))
      .filter((r) => r.confidence >= 0.25);
  }

  async suggestForSubject(subjectName: string, scope: { scopeType: 'cycle' | 'course'; scopeId: string }, userId: string): Promise<{ criteriaProcessed: number; suggestionsCreated: number; aiUsed: boolean }> {
    const apiKey = await this.getOpenRouterApiKey();
    const aiUsed = !!apiKey;
    // criterios del área en ese ámbito
    const where: any = scope.scopeType === 'cycle' ? { cycleId: scope.scopeId } : { courseId: scope.scopeId };
    const criteria = await this.criterionRepo.find({
      where, relations: ['specificCompetency', 'specificCompetency.subject'],
    });
    const inArea = criteria.filter((c) => (c.specificCompetency as any)?.subject?.name === subjectName);
    let suggestionsCreated = 0;
    for (const criterion of inArea) {
      const candidates = await this.pool.getCandidates(criterion.id);
      const matches = await this.suggestForCriterion(criterion, candidates);
      for (const m of matches) {
        const existing = await this.linkRepo.findOne({ where: { evaluationCriterionId: criterion.id, basicKnowledgeId: m.basicKnowledgeId } });
        if (existing) continue; // no pisar confirmados/rechazados/sugeridos previos
        await this.linkRepo.save(this.linkRepo.create({
          evaluationCriterionId: criterion.id,
          basicKnowledgeId: m.basicKnowledgeId,
          status: CriterionKnowledgeStatus.SUGGESTED,
          source: CriterionKnowledgeSource.AI,
          confidence: m.confidence,
          createdBy: userId,
        }));
        suggestionsCreated++;
      }
    }
    return { criteriaProcessed: inArea.length, suggestionsCreated, aiUsed };
  }
}
