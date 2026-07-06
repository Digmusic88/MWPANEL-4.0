import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BasicKnowledgeAssessment } from '../entities/basic-knowledge-assessment.entity';
import { CriterionAssessment } from '../entities/criterion-assessment.entity';
import { CriterionBasicKnowledge, CriterionKnowledgeStatus } from '../../criterion-knowledge/entities/criterion-basic-knowledge.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { ApplicableCriteriaService } from './applicable-criteria.service';
import { CriterionAssessmentService } from './criterion-assessment.service';
import { STATE_TO_VALUE, rollUpCriterionState, ThreeState } from './saber-rollup.util';
import { BulkSaberDto } from '../dto/bulk-saber.dto';
import { CriterionRollupService } from './criterion-rollup.service';

@Injectable()
export class BasicKnowledgeAssessmentService {
  constructor(
    @InjectRepository(BasicKnowledgeAssessment) private readonly bkaRepo: Repository<BasicKnowledgeAssessment>,
    @InjectRepository(CriterionAssessment) private readonly caRepo: Repository<CriterionAssessment>,
    @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
    @InjectRepository(BasicKnowledge) private readonly bkRepo: Repository<BasicKnowledge>,
    private readonly applicable: ApplicableCriteriaService,
    private readonly criterionService: CriterionAssessmentService,
    private readonly rollup: CriterionRollupService,
  ) {}

  /** criterioId -> saberIds confirmados */
  private async confirmedLinks(criterionIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (criterionIds.length === 0) return map;
    const links = await this.linkRepo.find({
      where: { evaluationCriterionId: In(criterionIds), status: CriterionKnowledgeStatus.CONFIRMED },
    });
    for (const l of links) {
      const arr = map.get(l.evaluationCriterionId) || [];
      arr.push(l.basicKnowledgeId);
      map.set(l.evaluationCriterionId, arr);
    }
    return map;
  }

  /** studentId -> (saberId -> valor 0/1/2), solo saberes marcados */
  private async marksByStudent(studentIds: string[], periodId: string): Promise<Map<string, Map<string, number>>> {
    const out = new Map<string, Map<string, number>>();
    if (studentIds.length === 0) return out;
    const rows = await this.bkaRepo.find({ where: { studentId: In(studentIds), evaluationPeriodId: periodId } });
    for (const r of rows) {
      const m = out.get(r.studentId) || new Map<string, number>();
      m.set(r.basicKnowledgeId, STATE_TO_VALUE[r.levelValue as ThreeState] ?? 0);
      out.set(r.studentId, m);
    }
    return out;
  }

  /** Estado derivado (solo lectura) por `${studentId}|${criterionId}` -> ThreeState|null */
  async computeDerived(studentIds: string[], criterionIds: string[], periodId: string): Promise<Map<string, ThreeState | null>> {
    const links = await this.confirmedLinks(criterionIds);
    const marks = await this.marksByStudent(studentIds, periodId);
    const result = new Map<string, ThreeState | null>();
    for (const studentId of studentIds) {
      const smarks = marks.get(studentId) || new Map<string, number>();
      for (const criterionId of criterionIds) {
        const saberIds = links.get(criterionId) || [];
        const states = saberIds.filter((sid) => smarks.has(sid)).map((sid) => smarks.get(sid)!);
        result.set(`${studentId}|${criterionId}`, rollUpCriterionState(states));
      }
    }
    return result;
  }

  async getGrid(userId: string, role: string, subjectAssignmentId: string, evaluationPeriodId: string) {
    await this.criterionService.assertTeacherAssignment(userId, role, subjectAssignmentId);
    const periodId = await this.criterionService.validatePeriodForAssignment(subjectAssignmentId, evaluationPeriodId);
    const { students, groups } = await this.applicable.getForAssignment(subjectAssignmentId);
    const criterionIds = groups.flatMap((g: any) => g.criteria.map((c: any) => c.id));
    const links = await this.confirmedLinks(criterionIds);

    const allSaberIds = [...new Set([...links.values()].flat())];
    const saberes = allSaberIds.length ? await this.bkRepo.find({ where: { id: In(allSaberIds) } }) : [];
    const saberById = new Map(saberes.map((s: any) => [s.id, s]));

    const enrichedGroups = groups.map((g: any) => ({
      specificCompetency: g.specificCompetency,
      criteria: g.criteria.map((c: any) => ({
        id: c.id, code: c.code, description: c.description,
        saberes: (links.get(c.id) || [])
          .map((sid) => {
            const s: any = saberById.get(sid);
            return s ? { basicKnowledgeId: s.id, code: s.code, title: s.title, description: s.description } : null;
          })
          .filter(Boolean),
      })),
    }));

    const studentIds = students.map((s: any) => s.id);
    const saberMarks = await this.bkaRepo.find({ where: { studentId: In(studentIds), evaluationPeriodId: periodId } });
    const derivedMap = await this.computeDerived(studentIds, criterionIds, periodId);
    const derived = [...derivedMap.entries()].map(([k, v]) => {
      const [studentId, evaluationCriterionId] = k.split('|');
      return { studentId, evaluationCriterionId, levelValue: v };
    });

    return { students, groups: enrichedGroups, saberMarks, derived };
  }

  async bulkUpsert(userId: string, role: string, dto: BulkSaberDto): Promise<{ saved: number; derived: number }> {
    const assignment = await this.criterionService.assertTeacherAssignment(userId, role, dto.subjectAssignmentId);
    const periodId = await this.criterionService.validatePeriodForAssignment(dto.subjectAssignmentId, dto.evaluationPeriodId);
    const teacherId = (assignment as any).teacherId;

    let saved = 0;
    for (const item of dto.items) {
      let row = await this.bkaRepo.findOne({
        where: { studentId: item.studentId, basicKnowledgeId: item.basicKnowledgeId, evaluationPeriodId: periodId },
      });
      if (!row) {
        row = this.bkaRepo.create({
          studentId: item.studentId,
          basicKnowledgeId: item.basicKnowledgeId,
          evaluationPeriodId: periodId,
          subjectAssignmentId: dto.subjectAssignmentId,
        });
      }
      row.teacherId = teacherId;
      row.levelValue = item.levelValue;
      row.assessedAt = new Date();
      await this.bkaRepo.save(row);
      saved++;
    }

    const studentIds = [...new Set(dto.items.map((i) => i.studentId))];
    const derived = await this.deriveAndPersist(dto.subjectAssignmentId, periodId, teacherId, studentIds);
    return { saved, derived };
  }

  /**
   * Recalcula y persiste los criterios derivados de los alumnos afectados (todos los criterios
   * aplicables de la asignatura). SP-B2 Fase 2: delega en el roll-up unificado (saberes + nota),
   * que respeta filas manuales (skip) y borra derivadas sin estado combinado.
   */
  async deriveAndPersist(subjectAssignmentId: string, periodId: string, teacherId: string, studentIds: string[]): Promise<number> {
    return this.rollup.rollupForAssignment(subjectAssignmentId, periodId, teacherId, studentIds);
  }
}
