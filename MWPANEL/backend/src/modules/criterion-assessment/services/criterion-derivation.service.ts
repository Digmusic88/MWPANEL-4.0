import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CriterionAssessment, CriterionScaleType, AchievementLevel } from '../entities/criterion-assessment.entity';
import { CriterionScaleConfigService } from './criterion-scale-config.service';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { EvaluationPeriod, PeriodType } from '../../evaluations/entities/evaluation-period.entity';
import { Task, TaskValuationType } from '../../tasks/entities/task.entity';
import { TaskSubmission } from '../../tasks/entities/task-submission.entity';
import { ExamGrade } from '../../tasks/entities/exam-grade.entity';
import { Activity, ActivityValuationType } from '../../activities/entities/activity.entity';
import { ActivityAssessment } from '../../activities/entities/activity-assessment.entity';

const EMOJI_MAP: Record<string, number> = { sad: 33, neutral: 66, happy: 90 };
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export interface DeriveForWorkParams {
  studentId: string;
  subjectAssignmentId: string;
  criterionIds: string[];
  referenceDate: Date;
}

@Injectable()
export class CriterionDerivationService {
  private readonly logger = new Logger(CriterionDerivationService.name);

  constructor(
    @InjectRepository(CriterionAssessment) private readonly caRepo: Repository<CriterionAssessment>,
    @InjectRepository(SubjectAssignment) private readonly saRepo: Repository<SubjectAssignment>,
    @InjectRepository(EvaluationPeriod) private readonly epRepo: Repository<EvaluationPeriod>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskSubmission) private readonly subRepo: Repository<TaskSubmission>,
    @InjectRepository(ExamGrade) private readonly examRepo: Repository<ExamGrade>,
    @InjectRepository(Activity) private readonly actRepo: Repository<Activity>,
    @InjectRepository(ActivityAssessment) private readonly aaRepo: Repository<ActivityAssessment>,
    private readonly scaleCfg: CriterionScaleConfigService,
  ) {}

  async deriveForWork({ studentId, subjectAssignmentId, criterionIds, referenceDate }: DeriveForWorkParams): Promise<void> {
    if (!criterionIds || criterionIds.length === 0) return;

    const assignment = await this.saRepo.findOne({ where: { id: subjectAssignmentId }, relations: ['academicYear'] });
    const academicYearId = (assignment as any)?.academicYear?.id;
    if (!academicYearId) {
      this.logger.warn(`Sin año académico para la asignatura ${subjectAssignmentId}; se omite la derivación`);
      return;
    }
    const teacherId = (assignment as any)?.teacherId ?? null;
    if (!teacherId) {
      this.logger.warn(`Sin teacherId en la asignatura ${subjectAssignmentId}; se omite la derivación`);
      return;
    }
    const ref = referenceDate ?? new Date();
    const period = await this.epRepo.createQueryBuilder('ep')
      .leftJoin('ep.academicYear', 'ay')
      .where('ay.id = :ay', { ay: academicYearId })
      .andWhere('ep.type IN (:...types)', { types: [PeriodType.TRIMESTER_1, PeriodType.TRIMESTER_2, PeriodType.TRIMESTER_3] })
      .andWhere('ep.startDate <= :ref AND ep.endDate >= :ref', { ref })
      .getOne();
    if (!period) {
      this.logger.warn(`Sin trimestre para la fecha ${ref.toISOString()} en la asignatura ${subjectAssignmentId}; se omite la derivación`);
      return;
    }

    const scale = await this.scaleCfg.getEffectiveConfig(subjectAssignmentId);

    for (const criterionId of criterionIds) {
      const existing = await this.caRepo.findOne({
        where: { studentId, evaluationCriterionId: criterionId, evaluationPeriodId: period.id },
      });
      if (existing && (existing.source === 'manual' || existing.source === 'derived_saber')) continue; // manual y saberes mandan sobre la derivación de trabajos

      const scores = await this.gatherScores(studentId, subjectAssignmentId, criterionId);
      if (scores.length === 0) continue;
      const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;

      const row = existing || this.caRepo.create({
        studentId,
        evaluationCriterionId: criterionId,
        evaluationPeriodId: period.id,
        subjectAssignmentId,
      });
      row.source = 'derived';
      row.teacherId = teacherId;
      row.scaleType = scale.scaleType;
      row.normalizedScore = avg;
      if (scale.scaleType === CriterionScaleType.NUMERIC) {
        row.numericValue = Math.round((avg / 100) * scale.numericMax * 100) / 100;
        row.levelValue = null;
      } else {
        row.levelValue = this.inverseLevel(avg, scale.levelMapping);
        row.numericValue = null;
      }
      row.assessedAt = new Date();
      await this.caRepo.save(row);
    }
  }

  // nivel cuyo umbral (%) es el mayor <= avg; si ninguno, el nivel de menor umbral
  private inverseLevel(avg: number, mapping: Record<string, number>): AchievementLevel {
    const entries = Object.entries(mapping || {}).sort((a, b) => a[1] - b[1]);
    if (entries.length === 0) return AchievementLevel.EMERGING;
    let chosen = entries[0][0];
    for (const [lvl, pct] of entries) {
      if (avg >= pct) chosen = lvl;
    }
    return chosen as AchievementLevel;
  }

  async gatherScores(studentId: string, subjectAssignmentId: string, criterionId: string): Promise<number[]> {
    const scores: number[] = [];

    const tasks = await this.taskRepo.createQueryBuilder('t')
      .innerJoin('t.evaluationCriteria', 'c', 'c.id = :cid', { cid: criterionId })
      .where('t.subjectAssignmentId = :sa', { sa: subjectAssignmentId })
      .getMany();
    for (const t of tasks) {
      const sub = await this.subRepo.findOne({ where: { taskId: t.id, studentId, isGraded: true } });
      if (sub && sub.finalGrade != null) {
        if (t.valuationType === TaskValuationType.RUBRIC) {
          scores.push(clamp(Number(sub.finalGrade)));
        } else if (t.valuationType === TaskValuationType.SCORE && t.maxPoints) {
          scores.push(clamp((Number(sub.finalGrade) / Number(t.maxPoints)) * 100));
        }
      }
      const exam = await this.examRepo.findOne({ where: { taskId: t.id, studentId } });
      if (exam && exam.numericGrade != null) {
        const examMax = Number(t.maxPoints) || 100;
        scores.push(clamp((Number(exam.numericGrade) / examMax) * 100));
      }
    }

    const acts = await this.actRepo.createQueryBuilder('a')
      .innerJoin('a.evaluationCriteria', 'c', 'c.id = :cid', { cid: criterionId })
      .where('a.subjectAssignmentId = :sa', { sa: subjectAssignmentId })
      .getMany();
    for (const a of acts) {
      const asmt = await this.aaRepo.findOne({ where: { activityId: a.id, studentId } });
      if (!asmt || asmt.value == null) continue;
      if (a.valuationType === ActivityValuationType.SCORE) {
        const v = parseFloat(asmt.value);
        if (!isNaN(v) && a.maxScore) scores.push(clamp((v / Number(a.maxScore)) * 100));
      } else {
        const m = EMOJI_MAP[asmt.value];
        if (m != null) scores.push(m);
      }
    }

    return scores;
  }
}
