import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicRecord } from '../entities/academic-record.entity';
import { AcademicRecordEntry } from '../entities/academic-record-entry.entity';
import { EntryType } from '../entities/academic-record.types';
import { CentralizedGrade, GradeStatus } from '../../grades/entities/centralized-grade.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { AcademicYear as AcademicYearEntity } from '../../students/entities/academic-year.entity';
import { EvaluationPeriod } from '../../evaluations/entities/evaluation-period.entity';
import { AcademicRecordsService } from '../academic-records.service';
import { CompetencyValuationService } from '../../criterion-assessment/services/competency-valuation.service';
import { mapGradePeriodToAcademicPeriod, resolveAcademicYearName } from './expediente-period-bridge';
import { mapGradePeriodToPeriodTypes } from '../../grades/services/grade-period-bridge';

@Injectable()
export class AcademicRecordsSyncService {
  constructor(
    @InjectRepository(AcademicRecord) private readonly recRepo: Repository<AcademicRecord>,
    @InjectRepository(AcademicRecordEntry) private readonly entryRepo: Repository<AcademicRecordEntry>,
    @InjectRepository(CentralizedGrade) private readonly cgRepo: Repository<CentralizedGrade>,
    @InjectRepository(SubjectAssignment) private readonly saRepo: Repository<SubjectAssignment>,
    @InjectRepository(AcademicYearEntity) private readonly ayRepo: Repository<AcademicYearEntity>,
    @InjectRepository(EvaluationPeriod) private readonly epRepo: Repository<EvaluationPeriod>,
    @Inject(forwardRef(() => AcademicRecordsService))
    private readonly arService: AcademicRecordsService,
    private readonly valuation: CompetencyValuationService,
  ) {}

  async syncStudent(studentId: string, academicYearId: string, period?: any): Promise<{ entries: number; recordId: string }> {
    const ay = await this.ayRepo.findOne({ where: { id: academicYearId } });
    const yearName = ay ? resolveAcademicYearName((ay as any).name) : null;
    if (!yearName) throw new BadRequestException('Año académico fuera del rango del expediente');

    const record = await this.arService.findOrCreateRecord(studentId, yearName);

    const where: any = { studentId, status: GradeStatus.FINAL };
    if (period) where.period = period;
    const grades = await this.cgRepo.find({ where, relations: ['subjectAssignment', 'subjectAssignment.subject'] });

    let count = 0;
    for (const g of grades) {
     try {
      const acadPeriod = mapGradePeriodToAcademicPeriod((g as any).period);
      const subjectName = (g as any).subjectAssignment?.subject?.name || 'Asignatura';
      // Resumen de valoración competencial: resolver el EvaluationPeriod del periodo de la nota y llamar a getValuation
      let comments: string | undefined;
      try {
        const periodTypes = mapGradePeriodToPeriodTypes((g as any).period);
        const eps = await this.epRepo.createQueryBuilder('ep')
          .leftJoin('ep.academicYear', 'ay')
          .where('ep.type IN (:...t)', { t: periodTypes })
          .andWhere('ay.id = :ay', { ay: academicYearId })
          .getMany();
        if (eps.length > 0) {
          const val = await this.valuation.getValuation(studentId, (g as any).subjectAssignmentId, eps[0].id);
          if (val?.byKey?.length) {
            comments = 'Competencias clave — ' + val.byKey.map((k: any) => `${k.code}: ${k.score}`).join(' · ');
          }
        }
      } catch { comments = undefined; /* best-effort; no rompe el volcado de la nota */ }

      let entry = await this.entryRepo.findOne({
        where: { academicRecordId: record.id, subjectAssignmentId: (g as any).subjectAssignmentId, period: acadPeriod, type: EntryType.ACADEMIC, isActive: true },
      });
      const numericValue = Math.round(Number((g as any).finalGrade) * 100) / 100;
      if (!entry) {
        entry = this.entryRepo.create({
          academicRecordId: record.id,
          subjectAssignmentId: (g as any).subjectAssignmentId,
          period: acadPeriod,
          type: EntryType.ACADEMIC,
          title: subjectName,
          entryDate: new Date(),
          isActive: true,
        });
      }
      entry.numericValue = numericValue as any;
      entry.letterGrade = (g as any).letterGrade || null;
      entry.isPassing = numericValue >= 50;
      if (comments) entry.comments = comments;
      await this.entryRepo.save(entry);
      count++;
     } catch {
      // Nota con asignación inexistente (FK) u otro fallo de datos: saltar esa nota, no abortar el sync completo
     }
    }

    await this.arService.recomputeGPA(record.id);
    return { entries: count, recordId: record.id };
  }

  async syncClass(subjectAssignmentId: string, academicYearId: string, period?: any): Promise<{ students: number; entries: number }> {
    const assignment = await this.saRepo.findOne({ where: { id: subjectAssignmentId }, relations: ['classGroups', 'classGroups.students'] });
    const students = [...new Map((assignment as any)?.classGroups?.flatMap((g: any) => g.students || []).map((s: any) => [s.id, s])).values()];
    let entries = 0;
    for (const s of students as any[]) {
      try { const r = await this.syncStudent(s.id, academicYearId, period); entries += r.entries; } catch { /* saltar alumno */ }
    }
    return { students: students.length, entries };
  }

  /** Best-effort sync triggered when an EvaluationPeriod is closed (isActive → false).
   *  Resolves all students with FINAL grades in the period's academic year and syncs each.
   *  Never throws — any error is swallowed so the period-close operation is never affected. */
  async syncByPeriodClose(period: EvaluationPeriod): Promise<void> {
    const academicYearId = (period as any).academicYear?.id ?? (period as any).academicYearId;
    if (!academicYearId) return; // nothing to sync without an academic year reference

    // Gather distinct studentIds that have FINAL grades in this academic year
    const rows = await this.cgRepo
      .createQueryBuilder('cg')
      .select('DISTINCT cg.studentId', 'studentId')
      .where('cg.status = :status', { status: GradeStatus.FINAL })
      .innerJoin('cg.subjectAssignment', 'sa')
      .innerJoin('sa.academicYear', 'ay', 'ay.id = :ayId', { ayId: academicYearId })
      .getRawMany();

    for (const row of rows) {
      try { await this.syncStudent(row.studentId, academicYearId); } catch { /* saltar alumno */ }
    }
  }
}
