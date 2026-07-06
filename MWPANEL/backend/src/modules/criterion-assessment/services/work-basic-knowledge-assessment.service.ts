import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WorkBasicKnowledgeAssessment } from '../entities/work-basic-knowledge-assessment.entity';
import { BasicKnowledgeAssessment } from '../entities/basic-knowledge-assessment.entity';
import { EvaluationPeriod, PeriodType } from '../../evaluations/entities/evaluation-period.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { CriterionBasicKnowledge, CriterionKnowledgeStatus } from '../../criterion-knowledge/entities/criterion-basic-knowledge.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { STATE_TO_VALUE, ThreeState, rollUpCriterionState } from './saber-rollup.util';
import { BulkWorkSaberDto } from '../dto/work-saber.dto';
import { CriterionAssessmentService } from './criterion-assessment.service';

@Injectable()
export class WorkBasicKnowledgeAssessmentService {
  private readonly logger = new Logger(WorkBasicKnowledgeAssessmentService.name);

  constructor(
    @InjectRepository(WorkBasicKnowledgeAssessment) private readonly wbkaRepo: Repository<WorkBasicKnowledgeAssessment>,
    @InjectRepository(BasicKnowledgeAssessment) private readonly bkaRepo: Repository<BasicKnowledgeAssessment>,
    @InjectRepository(EvaluationPeriod) private readonly epRepo: Repository<EvaluationPeriod>,
    @InjectRepository(SubjectAssignment) private readonly saRepo: Repository<SubjectAssignment>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Activity) private readonly actRepo: Repository<Activity>,
    @InjectRepository(CriterionBasicKnowledge) private readonly linkRepo: Repository<CriterionBasicKnowledge>,
    @InjectRepository(BasicKnowledge) private readonly bkRepo: Repository<BasicKnowledge>,
    private readonly criterionService: CriterionAssessmentService,
  ) {}

  /** Trimestre que contiene referenceDate para la asignatura (mismo criterio que D3b). */
  async resolvePeriodId(subjectAssignmentId: string, referenceDate: Date): Promise<string | null> {
    const assignment = await this.saRepo.findOne({ where: { id: subjectAssignmentId }, relations: ['academicYear'] });
    const academicYearId = (assignment as any)?.academicYear?.id;
    if (!academicYearId) {
      this.logger.warn(`Sin año académico para la asignatura ${subjectAssignmentId}; no se resuelve el periodo WBKA`);
      return null;
    }
    const ref = referenceDate ?? new Date();
    const period = await this.epRepo.createQueryBuilder('ep')
      .leftJoin('ep.academicYear', 'ay')
      .where('ay.id = :ay', { ay: academicYearId })
      .andWhere('ep.type IN (:...types)', { types: [PeriodType.TRIMESTER_1, PeriodType.TRIMESTER_2, PeriodType.TRIMESTER_3] })
      .andWhere('ep.startDate <= :ref AND ep.endDate >= :ref', { ref })
      .getOne();
    if (!period) {
      this.logger.warn(`Sin trimestre para la fecha ${ref.toISOString()} en la asignatura ${subjectAssignmentId}; no se resuelve el periodo WBKA`);
      return null;
    }
    return period.id;
  }

  /** Recalcula (o borra) la fila BKA agregada del saber desde sus WBKA en el periodo. */
  async recomputeBkaAggregate(
    studentId: string, basicKnowledgeId: string, evaluationPeriodId: string,
    subjectAssignmentId: string, teacherId: string,
  ): Promise<void> {
    const marks = await this.wbkaRepo.find({ where: { studentId, basicKnowledgeId, evaluationPeriodId } });
    const existing = await this.bkaRepo.findOne({ where: { studentId, basicKnowledgeId, evaluationPeriodId } });

    if (marks.length === 0) {
      if (existing) await this.bkaRepo.delete({ id: existing.id });
      return;
    }
    const values = marks.map((m) => STATE_TO_VALUE[m.levelValue as ThreeState] ?? 0);
    const state = rollUpCriterionState(values);
    if (!state) { if (existing) await this.bkaRepo.delete({ id: existing.id }); return; }

    const row = existing || this.bkaRepo.create({ studentId, basicKnowledgeId, evaluationPeriodId, subjectAssignmentId });
    row.levelValue = state;
    row.subjectAssignmentId = subjectAssignmentId;
    row.teacherId = teacherId;
    row.assessedAt = new Date();
    await this.bkaRepo.save(row);
  }

  /** Por criterio, valores de estado (0/1/2) de sus saberes que tengan BKA para el alumno/periodo. */
  async saberStateValuesForCriteria(
    studentId: string, saberIdsByCriterion: Map<string, string[]>, evaluationPeriodId: string,
  ): Promise<Map<string, number[]>> {
    const allSaberIds = Array.from(new Set(Array.from(saberIdsByCriterion.values()).flat()));
    const out = new Map<string, number[]>();
    if (allSaberIds.length === 0) return out;
    const rows = await this.bkaRepo.find({ where: { studentId, basicKnowledgeId: In(allSaberIds), evaluationPeriodId } });
    const byId = new Map(rows.map((r) => [r.basicKnowledgeId, STATE_TO_VALUE[r.levelValue as ThreeState] ?? 0]));
    for (const [criterionId, saberIds] of saberIdsByCriterion) {
      out.set(criterionId, saberIds.filter((s) => byId.has(s)).map((s) => byId.get(s)!));
    }
    return out;
  }

  private async resolveWork(workId: string, workType: string): Promise<{ subjectAssignmentId: string; referenceDate: Date; criterionIds: string[] } | null> {
    if (workType === 'activity') {
      const a = await this.actRepo.findOne({ where: { id: workId }, relations: ['evaluationCriteria', 'subjectAssignment'] });
      if (!a) return null;
      return {
        subjectAssignmentId: (a as any).subjectAssignment?.id ?? (a as any).subjectAssignmentId,
        referenceDate: (a as any).assignedDate ? new Date((a as any).assignedDate) : new Date(),
        criterionIds: ((a as any).evaluationCriteria || []).map((c: any) => c.id),
      };
    }
    // 'task' | 'test' → Task
    const t = await this.taskRepo.findOne({ where: { id: workId }, relations: ['evaluationCriteria', 'subjectAssignment'] });
    if (!t) return null;
    return {
      subjectAssignmentId: (t as any).subjectAssignment?.id ?? (t as any).subjectAssignmentId,
      referenceDate: (t as any).assignedDate ? new Date((t as any).assignedDate) : ((t as any).dueDate ? new Date((t as any).dueDate) : new Date()),
      criterionIds: ((t as any).evaluationCriteria || []).map((c: any) => c.id),
    };
  }

  /** saberIds de los criterios recibidos, y viceversa: todos los criterios (CONFIRMED) que
   *  cuelgan de esos mismos saberIds, aunque estén taguedos a OTRO trabajo (SP-B2 Fase 2, I3). */
  private async criteriaConfirmedForSaberes(saberIds: string[]): Promise<string[]> {
    if (saberIds.length === 0) return [];
    const links = await this.linkRepo.find({
      where: { basicKnowledgeId: In(saberIds), status: CriterionKnowledgeStatus.CONFIRMED },
    });
    return [...new Set(links.map((l) => l.evaluationCriterionId))];
  }

  async getCell(userId: string, role: string, workId: string, workType: string, studentId: string): Promise<any> {
    const work = await this.resolveWork(workId, workType);
    if (!work) return { subjectAssignmentId: null, evaluationPeriodId: null, saberes: [], marks: {} };
    await this.criterionService.assertTeacherAssignment(userId, role, work.subjectAssignmentId);
    const periodId = await this.resolvePeriodId(work.subjectAssignmentId, work.referenceDate);
    // saberes confirmados de los criterios del trabajo
    const links = await this.linkRepo.find({ where: { evaluationCriterionId: In(work.criterionIds), status: CriterionKnowledgeStatus.CONFIRMED } });
    const saberIds = Array.from(new Set(links.map((l) => l.basicKnowledgeId)));
    const saberes = saberIds.length ? await this.bkRepo.find({ where: { id: In(saberIds) } }) : [];
    const marks: Record<string, string> = {};
    if (periodId && saberIds.length) {
      const wbka = await this.wbkaRepo.find({ where: { studentId, workId, evaluationPeriodId: periodId, basicKnowledgeId: In(saberIds) } });
      for (const m of wbka) marks[m.basicKnowledgeId] = m.levelValue;
    }
    const critBySaber = new Map<string, string>();
    for (const l of links) if (!critBySaber.has(l.basicKnowledgeId)) critBySaber.set(l.basicKnowledgeId, l.evaluationCriterionId);
    return {
      subjectAssignmentId: work.subjectAssignmentId, evaluationPeriodId: periodId,
      saberes: saberes.map((s) => ({ id: s.id, code: s.code, name: s.title ?? s.description, criterionId: critBySaber.get(s.id) })),
      marks,
    };
  }

  /** Guarda marcas por trabajo, recalcula BKA por saber. Devuelve {saved, work, periodId, teacherId, criterionIds}.
   *  `criterionIds` va EXPANDIDO (I3): unión de los criterios del propio trabajo + todo criterio
   *  CONFIRMED enlazado a cualquiera de los saberes recién marcados (aunque cuelgue de otro trabajo). */
  async bulkUpsert(userId: string, role: string, dto: BulkWorkSaberDto): Promise<{ saved: number; subjectAssignmentId: string; evaluationPeriodId: string; teacherId: string; criterionIds: string[] }> {
    const work = await this.resolveWork(dto.workId, dto.workType);
    if (!work) return { saved: 0, subjectAssignmentId: '', evaluationPeriodId: '', teacherId: '', criterionIds: [] };
    const assignment = await this.criterionService.assertTeacherAssignment(userId, role, work.subjectAssignmentId);
    const teacherId = (assignment as any).teacherId;
    const periodId = await this.resolvePeriodId(work.subjectAssignmentId, work.referenceDate);
    if (!periodId) return { saved: 0, subjectAssignmentId: work.subjectAssignmentId, evaluationPeriodId: '', teacherId, criterionIds: work.criterionIds };
    let saved = 0;
    for (const m of dto.marks) {
      const existing = await this.wbkaRepo.findOne({ where: { studentId: dto.studentId, basicKnowledgeId: m.basicKnowledgeId, workId: dto.workId, evaluationPeriodId: periodId } });
      const row = existing || this.wbkaRepo.create({
        studentId: dto.studentId, basicKnowledgeId: m.basicKnowledgeId, workId: dto.workId, workType: dto.workType,
        subjectAssignmentId: work.subjectAssignmentId, evaluationPeriodId: periodId, teacherId,
      });
      row.levelValue = m.levelValue; row.teacherId = teacherId; row.assessedAt = new Date();
      await this.wbkaRepo.save(row); saved++;
      await this.recomputeBkaAggregate(dto.studentId, m.basicKnowledgeId, periodId, work.subjectAssignmentId, teacherId);
    }
    const markedSaberIds = [...new Set(dto.marks.map((m) => m.basicKnowledgeId))];
    const reverseCriterionIds = await this.criteriaConfirmedForSaberes(markedSaberIds);
    const criterionIds = [...new Set([...work.criterionIds, ...reverseCriterionIds])];
    return { saved, subjectAssignmentId: work.subjectAssignmentId, evaluationPeriodId: periodId, teacherId, criterionIds };
  }
}
