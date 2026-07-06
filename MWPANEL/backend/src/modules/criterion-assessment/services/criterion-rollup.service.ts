import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CriterionAssessment, CriterionScaleType } from '../entities/criterion-assessment.entity';
import { CriterionBasicKnowledge, CriterionKnowledgeStatus } from '../../criterion-knowledge/entities/criterion-basic-knowledge.entity';
import { combineCriterionStateValue, decideCriterionWrite, STATE_TO_VALUE } from './saber-rollup.util';
import { WorkBasicKnowledgeAssessmentService } from './work-basic-knowledge-assessment.service';
import { CriterionDerivationService } from './criterion-derivation.service';
import { ApplicableCriteriaService } from './applicable-criteria.service';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';

@Injectable()
export class CriterionRollupService {
  constructor(
    @InjectRepository(CriterionAssessment) private readonly caRepo: Repository<CriterionAssessment>,
    @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
    @InjectRepository(SubjectAssignment) private readonly saRepo: Repository<SubjectAssignment>,
    private readonly wbkaSvc: WorkBasicKnowledgeAssessmentService,
    private readonly derivation: CriterionDerivationService,
    private readonly applicable: ApplicableCriteriaService,
  ) {}

  async confirmedSaberIdsByCriterion(criterionIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (criterionIds.length === 0) return out;
    const links = await this.linkRepo.find({
      where: { evaluationCriterionId: In(criterionIds), status: CriterionKnowledgeStatus.CONFIRMED },
    });
    for (const l of links) {
      const arr = out.get(l.evaluationCriterionId) || [];
      arr.push(l.basicKnowledgeId);
      out.set(l.evaluationCriterionId, arr);
    }
    for (const id of criterionIds) if (!out.has(id)) out.set(id, []);
    return out;
  }

  /** Recalcula el criterio combinando saberes (BKA) + notas de trabajos (gatherScores). */
  async rollupForStudentCriteria(
    studentId: string, subjectAssignmentId: string, criterionIds: string[],
    evaluationPeriodId: string, teacherId: string,
  ): Promise<number> {
    if (!criterionIds || criterionIds.length === 0) return 0;
    const saberIdsByCriterion = await this.confirmedSaberIdsByCriterion(criterionIds);
    const saberStates = await this.wbkaSvc.saberStateValuesForCriteria(studentId, saberIdsByCriterion, evaluationPeriodId);

    const existing = await this.caRepo.find({
      where: { studentId, evaluationCriterionId: In(criterionIds), evaluationPeriodId },
    });
    const existingByCrit = new Map(existing.map((e) => [e.evaluationCriterionId, e]));

    let writes = 0;
    let deletes = 0;
    for (const criterionId of criterionIds) {
      const numericScores = await this.derivation.gatherScores(studentId, subjectAssignmentId, criterionId);
      const saberVals = saberStates.get(criterionId) || [];
      const state = combineCriterionStateValue(saberVals, numericScores);
      const ex = existingByCrit.get(criterionId);

      // Reusa la matriz de precedencia: si hay estado combinado lo tratamos como "states" no vacío.
      const decision = decideCriterionWrite({
        existingExists: !!ex,
        existingSource: ex ? ex.source : null,
        states: state === null ? [] : [STATE_TO_VALUE[state]],
      });
      if (decision.action === 'skip') continue;
      // Un delete significa que el criterio YA NO tiene valor derivado: no cuenta como "derivado"
      // para el número devuelto (usado por el profe como "N criterios derivados").
      if (decision.action === 'delete') { await this.caRepo.delete({ id: ex!.id }); deletes++; continue; }

      const row = ex || this.caRepo.create({ studentId, evaluationCriterionId: criterionId, evaluationPeriodId, subjectAssignmentId });
      row.source = 'derived_saber';
      row.teacherId = teacherId;
      row.scaleType = CriterionScaleType.LEVELS3;
      row.levelValue = decision.levelValue;
      row.numericValue = null;
      row.normalizedScore = decision.normalizedScore;
      row.subjectAssignmentId = subjectAssignmentId;
      row.assessedAt = new Date();
      await this.caRepo.save(row);
      writes++;
    }
    return writes;
  }

  /**
   * Punto de entrada equivalente a `CriterionDerivationService.deriveForWork` (mismo shape de
   * parámetros) pero delegando en el roll-up unificado (saberes + nota). Resuelve internamente
   * el periodo (por fecha de referencia) y el teacherId (por la asignatura). Fail-soft: si no
   * puede resolver periodo o profesor, no escribe nada (mismo criterio que deriveForWork).
   */
  async rollupForWork(params: {
    studentId: string;
    subjectAssignmentId: string;
    criterionIds: string[];
    referenceDate: Date;
  }): Promise<void> {
    const { studentId, subjectAssignmentId, criterionIds, referenceDate } = params;
    if (!criterionIds || criterionIds.length === 0) return;
    const periodId = await this.wbkaSvc.resolvePeriodId(subjectAssignmentId, referenceDate);
    if (!periodId) return;
    const assignment = await this.saRepo.findOne({ where: { id: subjectAssignmentId } });
    const teacherId = (assignment as any)?.teacherId;
    if (!teacherId) return;
    await this.rollupForStudentCriteria(studentId, subjectAssignmentId, criterionIds, periodId, teacherId);
  }

  async rollupForAssignment(
    subjectAssignmentId: string, evaluationPeriodId: string, teacherId: string, studentIds: string[],
  ): Promise<number> {
    const { groups } = await this.applicable.getForAssignment(subjectAssignmentId);
    const criterionIds = groups.flatMap((g: any) => g.criteria.map((c: any) => c.id));
    if (criterionIds.length === 0 || studentIds.length === 0) return 0;
    let writes = 0;
    for (const studentId of studentIds) {
      writes += await this.rollupForStudentCriteria(studentId, subjectAssignmentId, criterionIds, evaluationPeriodId, teacherId);
    }
    return writes;
  }
}
