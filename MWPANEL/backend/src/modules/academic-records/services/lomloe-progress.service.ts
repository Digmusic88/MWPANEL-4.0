import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CriterionAssessment, THREE_STATE_LEVELS } from '../../criterion-assessment/entities/criterion-assessment.entity';
import { BasicKnowledgeAssessment } from '../../criterion-assessment/entities/basic-knowledge-assessment.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { CriterionBasicKnowledge, CriterionKnowledgeStatus } from '../../criterion-knowledge/entities/criterion-basic-knowledge.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { EvaluationPeriod, PeriodType } from '../../evaluations/entities/evaluation-period.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { CurricularAdaptationService } from '../../dua/services/curricular-adaptation.service';

export type ThreeState = 'NOT_ACHIEVED' | 'IN_PROGRESS' | 'ACHIEVED';
export interface TrimStates { T1: ThreeState | null; T2: ThreeState | null; T3: ThreeState | null }
export interface LomloeSaber { basicKnowledgeId: string; code: string; name: string; states: TrimStates }
export interface LomloeCriterion { criterionId: string; code: string; name: string; specificCompetencyCode?: string; states: TrimStates; saberes: LomloeSaber[] }
export interface LomloeSubject { subjectName: string; subjectAssignmentId: string; adaptation?: { type: string }; criteria: LomloeCriterion[] }
export interface LomloeProgress { subjects: LomloeSubject[] }

const SOURCE_RANK: Record<string, number> = { manual: 3, derived_saber: 2, derived: 1 };

@Injectable()
export class LomloeProgressService {
  private readonly logger = new Logger(LomloeProgressService.name);

  constructor(
    @InjectRepository(CriterionAssessment) private readonly caRepo: Repository<CriterionAssessment>,
    @InjectRepository(BasicKnowledgeAssessment) private readonly bkaRepo: Repository<BasicKnowledgeAssessment>,
    @InjectRepository(EvaluationCriterion) private readonly critRepo: Repository<EvaluationCriterion>,
    @InjectRepository(BasicKnowledge) private readonly bkRepo: Repository<BasicKnowledge>,
    @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
    @InjectRepository(SubjectAssignment) private readonly saRepo: Repository<SubjectAssignment>,
    @InjectRepository(EvaluationPeriod) private readonly epRepo: Repository<EvaluationPeriod>,
    @InjectRepository(AcademicYear) private readonly ayRepo: Repository<AcademicYear>,
    private readonly curricularAdaptations: CurricularAdaptationService,
  ) {}

  static normalizeToState(scaleType: string | null, levelValue: string | null, normalizedScore: number | null): ThreeState | null {
    if (scaleType === 'levels3' && levelValue && (THREE_STATE_LEVELS as readonly string[]).includes(levelValue)) {
      return levelValue as ThreeState;
    }
    if (normalizedScore === null || normalizedScore === undefined || isNaN(Number(normalizedScore))) return null;
    const s = Number(normalizedScore);
    if (s < 50) return 'NOT_ACHIEVED';
    if (s < 80) return 'IN_PROGRESS';
    return 'ACHIEVED';
  }

  async getProgressByYearName(studentId: string, academicYearName: string): Promise<LomloeProgress> {
    const ay = await this.ayRepo.findOne({ where: { name: academicYearName } as any });
    if (!ay) return { subjects: [] };
    return this.getProgress(studentId, (ay as any).id);
  }

  async getProgress(studentId: string, academicYearId: string): Promise<LomloeProgress> {
    // 1. periodos trimestre
    const periods = await this.epRepo.createQueryBuilder('ep')
      .leftJoin('ep.academicYear', 'ay')
      .where('ay.id = :ay', { ay: academicYearId })
      .andWhere('ep.type IN (:...types)', { types: [PeriodType.TRIMESTER_1, PeriodType.TRIMESTER_2, PeriodType.TRIMESTER_3] })
      .orderBy('ep.startDate', 'ASC')
      .getMany();
    const idByTrim: Record<'T1' | 'T2' | 'T3', string | null> = { T1: null, T2: null, T3: null };
    const trimById = new Map<string, 'T1' | 'T2' | 'T3'>();
    for (const p of periods) {
      const t = p.type === PeriodType.TRIMESTER_1 ? 'T1' : p.type === PeriodType.TRIMESTER_2 ? 'T2' : 'T3';
      idByTrim[t] = (p as any).id;
      trimById.set((p as any).id, t);
    }
    const presentIds = Object.values(idByTrim).filter((x): x is string => Boolean(x));
    if (presentIds.length === 0) return { subjects: [] };

    // 2. criterion_assessments del alumno
    const rows = await this.caRepo.find({ where: { studentId, evaluationPeriodId: In(presentIds) } as any });
    if (rows.length === 0) return { subjects: [] };

    // 3. estado por (criterio, trim) con precedencia de source
    const emptyTrim = (): TrimStates => ({ T1: null, T2: null, T3: null });
    const critStates = new Map<string, TrimStates>();
    const critToSa = new Map<string, string>();
    const bestRank = new Map<string, number>(); // key criterio|trim
    for (const r of rows) {
      const trim = trimById.get((r as any).evaluationPeriodId);
      if (!trim) continue;
      const cid = (r as any).evaluationCriterionId;
      if (!critStates.has(cid)) critStates.set(cid, emptyTrim());
      if ((r as any).subjectAssignmentId) critToSa.set(cid, (r as any).subjectAssignmentId);
      const key = `${cid}|${trim}`;
      const rank = SOURCE_RANK[(r as any).source] ?? 0;
      if (rank >= (bestRank.get(key) ?? -1)) {
        bestRank.set(key, rank);
        critStates.get(cid)![trim] = LomloeProgressService.normalizeToState((r as any).scaleType, (r as any).levelValue, (r as any).normalizedScore);
      }
    }

    const criterionIds = Array.from(critStates.keys());
    // 4. metadatos de criterio
    const crits = await this.critRepo.find({ where: { id: In(criterionIds) } as any, relations: ['specificCompetency'] });
    const critMeta = new Map(crits.map((c: any) => [c.id, c]));

    // 5. nombres de asignatura
    const saIds = Array.from(new Set(Array.from(critToSa.values())));
    const sas = saIds.length ? await this.saRepo.find({ where: { id: In(saIds) } as any, relations: ['subject'] }) : [];
    const saName = new Map(sas.map((s: any) => [s.id, s.subject?.name || 'Asignatura']));
    const saToSubjectId = new Map<string, string>(sas.filter((s: any) => s.subject?.id).map((s: any) => [s.id, s.subject.id]));

    // Adaptaciones curriculares por subjectId (fail-soft: si falla, sin adaptación)
    let adaptMap: Map<string, { type: string; notes: string | null }> = new Map();
    try {
      adaptMap = await this.curricularAdaptations.getAdaptationMap(studentId, academicYearId) as any;
    } catch (e: any) {
      this.logger?.warn?.(`No se pudo cargar adaptaciones LOMLOE: ${e?.message || e}`);
    }

    // 6. saberes CONFIRMED por criterio
    const links = criterionIds.length ? await this.linkRepo.find({ where: { evaluationCriterionId: In(criterionIds), status: CriterionKnowledgeStatus.CONFIRMED } as any }) : [];
    const saberIdsByCrit = new Map<string, string[]>();
    const allSaberIds = new Set<string>();
    for (const l of links) {
      const arr = saberIdsByCrit.get((l as any).evaluationCriterionId) || [];
      arr.push((l as any).basicKnowledgeId);
      saberIdsByCrit.set((l as any).evaluationCriterionId, arr);
      allSaberIds.add((l as any).basicKnowledgeId);
    }
    const bkRows = allSaberIds.size ? await this.bkaRepo.find({ where: { studentId, evaluationPeriodId: In(presentIds), basicKnowledgeId: In(Array.from(allSaberIds)) } as any }) : [];
    const saberStates = new Map<string, TrimStates>();
    for (const r of bkRows) {
      const trim = trimById.get((r as any).evaluationPeriodId);
      if (!trim) continue;
      const kid = (r as any).basicKnowledgeId;
      if (!saberStates.has(kid)) saberStates.set(kid, emptyTrim());
      saberStates.get(kid)![trim] = LomloeProgressService.normalizeToState((r as any).scaleType ?? 'levels3', (r as any).levelValue, (r as any).normalizedScore);
    }
    const bks = allSaberIds.size ? await this.bkRepo.find({ where: { id: In(Array.from(allSaberIds)) } as any }) : [];
    const bkMeta = new Map(bks.map((k: any) => [k.id, k]));

    // 7. construir por asignatura
    const bySa = new Map<string, LomloeCriterion[]>();
    for (const cid of criterionIds) {
      const sa = critToSa.get(cid);
      if (!sa) continue;
      const meta: any = critMeta.get(cid);
      const saberes: LomloeSaber[] = (saberIdsByCrit.get(cid) || [])
        .map((kid) => {
          const km: any = bkMeta.get(kid);
          return { basicKnowledgeId: kid, code: km?.code || '', name: km?.title || km?.description || '', states: saberStates.get(kid) || emptyTrim() };
        })
        .sort((a, b) => (a.code || '').localeCompare(b.code || '', 'es'));
      const crit: LomloeCriterion = {
        criterionId: cid,
        code: meta?.code || '',
        name: meta?.description || '',
        specificCompetencyCode: meta?.specificCompetency?.code,
        states: critStates.get(cid)!,
        saberes,
      };
      if (!bySa.has(sa)) bySa.set(sa, []);
      bySa.get(sa)!.push(crit);
    }

    const subjects: LomloeSubject[] = Array.from(bySa.entries()).map(([sa, criteria]) => ({
      subjectAssignmentId: sa,
      subjectName: saName.get(sa) || 'Asignatura',
      adaptation: (() => {
        const subjectId = saToSubjectId.get(sa);
        const a = subjectId ? adaptMap.get(subjectId) : undefined;
        return a ? { type: a.type } : undefined;
      })(),
      criteria: criteria.sort((a, b) => {
        const oa = (critMeta.get(a.criterionId) as any)?.specificCompetency?.order ?? 0;
        const ob = (critMeta.get(b.criterionId) as any)?.specificCompetency?.order ?? 0;
        if (oa !== ob) return oa - ob;
        return (a.code || '').localeCompare(b.code || '', 'es');
      }),
    })).sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'es'));

    return { subjects };
  }
}
