import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicRecordEntry } from '../entities/academic-record-entry.entity';
import { AcademicYear as AcademicYearEntity } from '../../students/entities/academic-year.entity';
import { EvaluationPeriod } from '../../evaluations/entities/evaluation-period.entity';
import { ActivityAssessment } from '../../activities/entities/activity-assessment.entity';
import { TaskSubmission } from '../../tasks/entities/task-submission.entity';
import { ExamGrade } from '../../tasks/entities/exam-grade.entity';
import { AcademicRecordsService } from '../academic-records.service';
import { AcademicPeriod, EntryType } from '../entities/academic-record.types';
import { AcademicRecord } from '../entities/academic-record.entity';
import { CompetencyValuationService } from '../../criterion-assessment/services/competency-valuation.service';

export interface BuildResult { recordId: string; entries: number; }

/** Una nota normalizada a 0-100, lista para promediar. */
interface GradeRow {
  subjectAssignmentId: string;
  subjectName: string;
  percentage: number; // 0-100
  date: Date;
}

/** Trimestre con su rango de fechas, mapeado al AcademicPeriod correspondiente. */
interface TrimesterBucket {
  period: AcademicPeriod;
  start: Date;
  end: Date;
}

@Injectable()
export class ExpedienteBuilderService {
  constructor(
    @InjectRepository(AcademicRecordEntry) private readonly entryRepo: Repository<AcademicRecordEntry>,
    @InjectRepository(AcademicYearEntity) private readonly ayRepo: Repository<AcademicYearEntity>,
    @InjectRepository(EvaluationPeriod) private readonly epRepo: Repository<EvaluationPeriod>,
    @InjectRepository(ActivityAssessment) private readonly aaRepo: Repository<ActivityAssessment>,
    @InjectRepository(TaskSubmission) private readonly tsRepo: Repository<TaskSubmission>,
    @InjectRepository(ExamGrade) private readonly egRepo: Repository<ExamGrade>,
    @InjectRepository(AcademicRecord) private readonly arRepo: Repository<AcademicRecord>,
    @Inject(forwardRef(() => AcademicRecordsService))
    private readonly arService: AcademicRecordsService,
    private readonly valuation: CompetencyValuationService,
  ) {}

  /**
   * Construye (idempotente) el expediente de un alumno×año desde las 3 fuentes reales.
   * Upsert por (academicRecordId, subjectAssignmentId, period). Escala 0-100, apto >= 50.
   */
  async buildForStudentYear(studentId: string, academicYearId: string): Promise<BuildResult> {
    const ay = await this.ayRepo.findOne({ where: { id: academicYearId } });
    const yearName = ay && (ay as any).name ? String((ay as any).name).trim() : null;
    if (!yearName) throw new BadRequestException('Año académico no encontrado');

    const record = await this.arService.findOrCreateRecord(studentId, yearName);

    const trimesters = await this.loadTrimesterBuckets(academicYearId);
    const rows = await this.gatherGrades(studentId, academicYearId);

    // Agrupar por subjectAssignmentId
    const bySubject = new Map<string, GradeRow[]>();
    for (const r of rows) {
      const arr = bySubject.get(r.subjectAssignmentId) || [];
      arr.push(r);
      bySubject.set(r.subjectAssignmentId, arr);
    }

    let count = 0;
    for (const [subjectAssignmentId, subjectRows] of bySubject.entries()) {
      const subjectName = subjectRows[0].subjectName || 'Asignatura';
      // Entrada anual: media de TODAS las notas de la asignatura
      count += await this.upsertEntry(record.id, subjectAssignmentId, subjectName, AcademicPeriod.ANNUAL, this.mean(subjectRows.map((r) => r.percentage)));
      // Entradas por trimestre: media de las notas cuya fecha cae en el rango
      for (const t of trimesters) {
        const inRange = subjectRows.filter((r) => this.inRange(r.date, t.start, t.end));
        if (inRange.length === 0) continue; // sin notas en ese trimestre → no se crea entrada
        count += await this.upsertEntry(record.id, subjectAssignmentId, subjectName, t.period, this.mean(inRange.map((r) => r.percentage)));
      }
    }

    await this.arService.recomputeGPA(record.id);

    // Snapshot de competencias LOMLOE (0-100) en el expediente. Fail-soft: si falla, no rompe el build.
    try {
      const val = await this.valuation.getStudentValuation(studentId);
      if (val.hasData && val.byKey.length > 0) {
        await this.arRepo.update(record.id, {
          competencies: {
            byKey: val.byKey,
            bySpecific: val.bySpecific,
            scale: '0-100',
            generatedAt: new Date().toISOString(),
          },
        });
      }
    } catch { /* competencias no disponibles: se deja el snapshot anterior */ }

    return { recordId: record.id, entries: count };
  }

  /** Trimestres del año, ordenados por startDate, mapeados a AcademicPeriod por orden. */
  private async loadTrimesterBuckets(academicYearId: string): Promise<TrimesterBucket[]> {
    const periods = await this.epRepo.createQueryBuilder('ep')
      .leftJoin('ep.academicYear', 'ay')
      .where('ay.id = :ayId', { ayId: academicYearId })
      .andWhere("ep.type IN (:...t)", { t: ['trimester_1', 'trimester_2', 'trimester_3'] })
      .orderBy('ep.startDate', 'ASC')
      .getMany();
    const periodOrder = [AcademicPeriod.FIRST_TRIMESTER, AcademicPeriod.SECOND_TRIMESTER, AcademicPeriod.THIRD_TRIMESTER];
    return periods.slice(0, 3).map((p: any, i: number) => ({
      period: periodOrder[i],
      start: new Date(p.startDate),
      end: new Date(p.endDate),
    }));
  }

  /** Reúne las 3 fuentes del año, normalizadas a 0-100. Best-effort por fuente. */
  private async gatherGrades(studentId: string, academicYearId: string): Promise<GradeRow[]> {
    const rows: GradeRow[] = [];

    // activity_assessments: solo valuationType='score' y parseFloat válido; %=value/(maxScore||10)*100
    const assessments = await this.aaRepo.createQueryBuilder('aa')
      .leftJoinAndSelect('aa.activity', 'activity')
      .leftJoinAndSelect('activity.subjectAssignment', 'sa')
      .leftJoinAndSelect('sa.subject', 'subject')
      .where('aa.studentId = :studentId', { studentId })
      .andWhere('activity.academicYearId = :ayId', { ayId: academicYearId })
      .getMany();
    for (const a of assessments as any[]) {
      const sa = a.activity?.subjectAssignment;
      if (!sa?.id) continue;
      if (a.activity?.valuationType !== 'score') continue;
      const val = parseFloat(a.value);
      if (isNaN(val)) continue;
      const maxScore = Number(a.activity?.maxScore) || 10;
      rows.push({ subjectAssignmentId: sa.id, subjectName: sa.subject?.name, percentage: (val / maxScore) * 100, date: new Date(a.assessedAt) });
    }

    // task_submissions: excluir isTestYourself; task.status IN ('published','closed'); %=finalGrade/(maxPoints||100)*100
    const submissions = await this.tsRepo.createQueryBuilder('ts')
      .leftJoinAndSelect('ts.task', 'task')
      .leftJoinAndSelect('task.subjectAssignment', 'sa')
      .leftJoinAndSelect('sa.subject', 'subject')
      .where('ts.studentId = :studentId', { studentId })
      .andWhere('task.academicYearId = :ayId', { ayId: academicYearId })
      .andWhere('task.isTestYourself = false')
      .andWhere("task.status IN (:...st)", { st: ['published', 'closed'] })
      .getMany();
    for (const s of submissions as any[]) {
      const sa = s.task?.subjectAssignment;
      if (!sa?.id) continue;
      if (!s.isGraded || s.finalGrade === null || s.finalGrade === undefined) continue;
      const grade = Number(s.finalGrade);
      if (isNaN(grade)) continue;
      const maxPoints = Number(s.task?.maxPoints) || 100;
      rows.push({ subjectAssignmentId: sa.id, subjectName: sa.subject?.name, percentage: (grade / maxPoints) * 100, date: new Date(s.submittedAt) });
    }

    // exam_grades: %=numericGrade/(maxPoints||100)*100; academicYearId directo en examGrade
    const exams = await this.egRepo.createQueryBuilder('eg')
      .leftJoinAndSelect('eg.task', 'task')
      .leftJoinAndSelect('task.subjectAssignment', 'sa')
      .leftJoinAndSelect('sa.subject', 'subject')
      .where('eg.studentId = :studentId', { studentId })
      .andWhere('eg.academicYearId = :ayId', { ayId: academicYearId })
      .getMany();
    for (const e of exams as any[]) {
      const sa = e.task?.subjectAssignment;
      if (!sa?.id) continue;
      const grade = Number(e.numericGrade);
      if (e.numericGrade === null || e.numericGrade === undefined || isNaN(grade)) continue;
      const maxPoints = Number(e.task?.maxPoints) || 100;
      rows.push({ subjectAssignmentId: sa.id, subjectName: sa.subject?.name, percentage: (grade / maxPoints) * 100, date: new Date(e.gradedAt) });
    }

    return rows;
  }

  /** Upsert idempotente de una entrada por (record, subjectAssignment, period). Devuelve 1. */
  private async upsertEntry(academicRecordId: string, subjectAssignmentId: string, subjectName: string, period: AcademicPeriod, meanPercentage: number): Promise<number> {
    const numericValue = Math.round(meanPercentage * 100) / 100; // escala 0-100, 2 decimales
    let entry = await this.entryRepo.findOne({
      where: { academicRecordId, subjectAssignmentId, period, type: EntryType.ACADEMIC, isActive: true },
    });
    if (!entry) {
      entry = this.entryRepo.create({
        academicRecordId,
        subjectAssignmentId,
        period,
        type: EntryType.ACADEMIC,
        title: subjectName,
        entryDate: new Date(),
        isActive: true,
      });
    }
    entry.title = subjectName;
    entry.numericValue = numericValue as any;
    entry.isPassing = numericValue >= 50;
    await this.entryRepo.save(entry);
    return 1;
  }

  /**
   * Reconstruye el expediente de TODOS los alumnos con notas ese año.
   * Descubre studentIds distintos vía query builders (nombres de propiedad de entidad,
   * NUNCA SQL crudo: activity_assessments/task_submissions usan camelCase studentId).
   */
  async buildYear(academicYearId: string): Promise<{ students: number; records: number }> {
    const ids = new Set<string>();

    const aaIds = await this.aaRepo.createQueryBuilder('aa')
      .select('DISTINCT aa.studentId', 'studentId')
      .leftJoin('aa.activity', 'activity')
      .where('activity.academicYearId = :ayId', { ayId: academicYearId })
      .getRawMany();
    for (const r of aaIds) if (r.studentId) ids.add(r.studentId);

    const tsIds = await this.tsRepo.createQueryBuilder('ts')
      .select('DISTINCT ts.studentId', 'studentId')
      .leftJoin('ts.task', 'task')
      .where('task.academicYearId = :ayId', { ayId: academicYearId })
      .getRawMany();
    for (const r of tsIds) if (r.studentId) ids.add(r.studentId);

    const egIds = await this.egRepo.createQueryBuilder('eg')
      .select('DISTINCT eg.studentId', 'studentId')
      .where('eg.academicYearId = :ayId', { ayId: academicYearId })
      .getRawMany();
    for (const r of egIds) if (r.studentId) ids.add(r.studentId);

    let records = 0;
    for (const studentId of ids) {
      try { await this.buildForStudentYear(studentId, academicYearId); records++; }
      catch { /* saltar alumno con datos inconsistentes; no abortar el lote */ }
    }
    return { students: ids.size, records };
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private inRange(d: Date, start: Date, end: Date): boolean {
    const t = d.getTime();
    return !isNaN(t) && t >= start.getTime() && t <= end.getTime();
  }
}
