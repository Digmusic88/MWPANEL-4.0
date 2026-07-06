import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CriterionBasicKnowledge, CriterionKnowledgeStatus, CriterionKnowledgeSource } from '../entities/criterion-basic-knowledge.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { CandidatePoolService } from './candidate-pool.service';
import { AiSuggestionService } from './ai-suggestion.service';
import { ApplicableCriteriaService } from '../../criterion-assessment/services/applicable-criteria.service';

@Injectable()
export class CriterionKnowledgeService {
  constructor(
    @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
    @InjectRepository(EvaluationCriterion) private readonly criterionRepo: Repository<EvaluationCriterion>,
    @InjectRepository(SpecificCompetency) private readonly specCompRepo: Repository<SpecificCompetency>,
    @InjectRepository(BasicKnowledge) private readonly bkRepo: Repository<BasicKnowledge>,
    private readonly pool: CandidatePoolService,
    private readonly ai: AiSuggestionService,
    private readonly applicable: ApplicableCriteriaService,
  ) {}

  async deriveKeyCompetencies(criterionId: string): Promise<{ id: string; code: string; name: string }[]> {
    const criterion = await this.criterionRepo.findOne({ where: { id: criterionId } });
    if (!criterion) throw new NotFoundException('Criterio no encontrado');
    const spec = await this.specCompRepo.findOne({
      where: { id: criterion.specificCompetencyId },
      relations: ['keyCompetencies'],
    });
    const keys = (spec as any)?.keyCompetencies || [];
    return keys.map((k: any) => ({ id: k.id, code: k.code, name: k.name }));
  }

  async getMapBySubject(subjectName: string, scope: { scopeType: 'cycle' | 'course'; scopeId: string }) {
    const where: any = scope.scopeType === 'cycle' ? { cycleId: scope.scopeId } : { courseId: scope.scopeId };
    const criteria = await this.criterionRepo.find({
      where, relations: ['specificCompetency', 'specificCompetency.subject'], order: { order: 'ASC' },
    });
    const inArea = criteria.filter((c) => (c.specificCompetency as any)?.subject?.name === subjectName);
    const criterionIds = inArea.map((c) => c.id);
    const links = criterionIds.length
      ? await this.linkRepo.find({ where: { evaluationCriterionId: In(criterionIds) }, relations: ['basicKnowledge'] })
      : [];
    const result = [];
    for (const c of inArea) {
      const myLinks = links
        .filter((l) => l.evaluationCriterionId === c.id && l.status !== CriterionKnowledgeStatus.REJECTED)
        .map((l) => ({
          linkId: l.id, basicKnowledgeId: l.basicKnowledgeId,
          code: (l.basicKnowledge as any)?.code, title: (l.basicKnowledge as any)?.title,
          description: (l.basicKnowledge as any)?.description,
          status: l.status, confidence: l.confidence, source: l.source,
        }));
      const keyCompetencies = await this.deriveKeyCompetencies(c.id);
      result.push({ criterion: { id: c.id, code: c.code, description: c.description }, knowledge: myLinks, keyCompetencies });
    }
    return result;
  }

  async confirm(linkId: string, userId: string): Promise<CriterionBasicKnowledge> {
    const row = await this.linkRepo.findOne({ where: { id: linkId } });
    if (!row) throw new NotFoundException('Enlace no encontrado');
    row.status = CriterionKnowledgeStatus.CONFIRMED;
    row.createdBy = row.createdBy || userId;
    return this.linkRepo.save(row);
  }

  async reject(linkId: string, userId: string): Promise<CriterionBasicKnowledge> {
    const row = await this.linkRepo.findOne({ where: { id: linkId } });
    if (!row) throw new NotFoundException('Enlace no encontrado');
    row.status = CriterionKnowledgeStatus.REJECTED;
    return this.linkRepo.save(row);
  }

  async linkManual(evaluationCriterionId: string, basicKnowledgeId: string, userId: string): Promise<CriterionBasicKnowledge> {
    const existing = await this.linkRepo.findOne({ where: { evaluationCriterionId, basicKnowledgeId } });
    if (existing) return existing;
    return this.linkRepo.save(this.linkRepo.create({
      evaluationCriterionId, basicKnowledgeId,
      status: CriterionKnowledgeStatus.CONFIRMED, source: CriterionKnowledgeSource.MANUAL,
      confidence: null, createdBy: userId,
    }));
  }

  async unlink(linkId: string): Promise<{ deleted: boolean }> {
    await this.linkRepo.delete({ id: linkId });
    return { deleted: true };
  }

  async getConfirmedForCriterion(criterionId: string) {
    const links = await this.linkRepo.find({
      where: { evaluationCriterionId: criterionId, status: CriterionKnowledgeStatus.CONFIRMED },
      relations: ['basicKnowledge'],
    });
    const knowledge = links.map((l) => ({
      basicKnowledgeId: l.basicKnowledgeId,
      code: (l.basicKnowledge as any)?.code, title: (l.basicKnowledge as any)?.title,
      block: (l.basicKnowledge as any)?.block,
      description: (l.basicKnowledge as any)?.description,
    }));
    const keyCompetencies = await this.deriveKeyCompetencies(criterionId);
    return { knowledge, keyCompetencies };
  }

  async getCandidatesForLinking(criterionId: string): Promise<{ id: string; code: string; title: string; block: string }[]> {
    const candidates = await this.pool.getCandidates(criterionId); // returns BasicKnowledge[]
    const linked = await this.linkRepo.find({ where: { evaluationCriterionId: criterionId } });
    const linkedIds = new Set(linked.map((l) => l.basicKnowledgeId));
    return candidates
      .filter((c) => !linkedIds.has(c.id))
      .map((c) => ({ id: c.id, code: (c as any).code, title: (c as any).title, block: (c as any).block }));
  }

  async getScopesForSubject(subjectName: string): Promise<{ scopeType: 'cycle' | 'course'; scopeId: string; label: string }[]> {
    const criteria = await this.criterionRepo.find({
      relations: ['specificCompetency', 'specificCompetency.subject', 'cycle', 'course'],
    });
    const inArea = criteria.filter((c) => (c.specificCompetency as any)?.subject?.name === subjectName);
    const byKey = new Map<string, { scopeType: 'cycle' | 'course'; scopeId: string; label: string }>();
    for (const c of inArea) {
      if (c.cycleId && (c as any).cycle) {
        byKey.set(`cycle:${c.cycleId}`, { scopeType: 'cycle', scopeId: c.cycleId, label: (c as any).cycle.name });
      }
      if (c.courseId && (c as any).course) {
        byKey.set(`course:${c.courseId}`, { scopeType: 'course', scopeId: c.courseId, label: (c as any).course.name });
      }
    }
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Fase 0 SP-B2: enlaza (auto-confirmado) ≥1 saber a cada criterio SIN ningún enlace.
   * Usa IA (con fallback léxico) sobre los candidatos del área; si no hay match, enlaza
   * el mejor candidato por score léxico ("suelo") para garantizar el cierre. Idempotente.
   */
  async backfillOrphanCriteria(userId: string): Promise<{ processed: number; linksCreated: number; byFloor: number; stillOrphan: string[] }> {
    const orphans = await this.criterionRepo
      .createQueryBuilder('ec')
      .where(
        'NOT EXISTS (SELECT 1 FROM criterion_basic_knowledge c WHERE c."evaluationCriterionId" = ec.id)',
      )
      .getMany();

    let linksCreated = 0;
    let byFloor = 0;
    const stillOrphan: string[] = [];

    for (const criterion of orphans) {
      let candidates = await this.pool.getCandidates(criterion.id);
      if (candidates.length === 0) candidates = await this.pool.getSubjectWideCandidates(criterion.id);
      if (candidates.length === 0) { stillOrphan.push(criterion.id); continue; }

      let matches = await this.ai.suggestForCriterion(criterion, candidates);
      if (matches.length === 0) {
        const best = candidates
          .map((k) => ({ id: k.id, score: this.ai.lexicalScore(criterion.description, `${(k as any).title} ${k.description}`) }))
          .sort((a, b) => b.score - a.score)[0];
        matches = [{ basicKnowledgeId: best.id, confidence: Number(best.score.toFixed(3)) }];
        byFloor++;
      }

      for (const m of matches) {
        const existing = await this.linkRepo.findOne({
          where: { evaluationCriterionId: criterion.id, basicKnowledgeId: m.basicKnowledgeId },
        });
        if (existing) continue;
        await this.linkRepo.save(this.linkRepo.create({
          evaluationCriterionId: criterion.id,
          basicKnowledgeId: m.basicKnowledgeId,
          status: CriterionKnowledgeStatus.CONFIRMED,
          source: CriterionKnowledgeSource.AI,
          confidence: m.confidence,
          createdBy: userId,
        }));
        linksCreated++;
      }
    }

    return { processed: orphans.length, linksCreated, byFloor, stillOrphan };
  }

  /**
   * SP-B2 Fase 2 (Task 7): dado un texto libre (descripción/rúbrica de un trabajo) y la
   * asignación de asignatura, sugiere saberes básicos (con su(s) criterio(s) LOMLOE) que ese
   * trabajo evalúa. Solo SUGIERE — no persiste ningún enlace ni tag; el tagueo real lo hace
   * el frontend vía el `criterionIds` existente al crear/editar el trabajo.
   */
  async suggestSaberesForWork(subjectAssignmentId: string, text: string): Promise<{ suggestions: any[] }> {
    // 1) criterios aplicables de la asignatura
    const { groups } = await this.applicable.getForAssignment(subjectAssignmentId);
    const criterionIds: string[] = groups.flatMap((g: any) => g.criteria.map((c: any) => c.id));
    if (criterionIds.length === 0) return { suggestions: [] };
    // 2) saberes confirmados de esos criterios (pool candidato) + reverse saber→criterios
    const links = await this.linkRepo.find({ where: { evaluationCriterionId: In(criterionIds), status: CriterionKnowledgeStatus.CONFIRMED } });
    const saberIds = Array.from(new Set(links.map((l) => l.basicKnowledgeId)));
    if (saberIds.length === 0) return { suggestions: [] };
    const critsBySaber = new Map<string, string[]>();
    for (const l of links) { const a = critsBySaber.get(l.basicKnowledgeId) || []; a.push(l.evaluationCriterionId); critsBySaber.set(l.basicKnowledgeId, a); }
    const saberes = await this.bkRepo.find({ where: { id: In(saberIds) } });
    // 3) IA
    const matches = await this.ai.suggestSaberesForText(text, saberes);
    const byId = new Map(saberes.map((s: any) => [s.id, s]));
    const suggestions = matches
      .sort((a, b) => b.confidence - a.confidence)
      .map((m) => {
        const s: any = byId.get(m.basicKnowledgeId);
        return { basicKnowledgeId: m.basicKnowledgeId, code: s?.code, name: s?.title ?? s?.description, criterionIds: critsBySaber.get(m.basicKnowledgeId) || [], confidence: m.confidence };
      });
    return { suggestions };
  }
}
