import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { GradesService } from '../../grades/grades.service';
import { AttendanceService } from '../../attendance/attendance.service';
import { FormativeEvaluationService } from '../../competencies/services/formative-evaluation.service';
import { EvaluationsService } from '../../evaluations/evaluations.service';
import { DuaService } from '../../dua/services/dua.service';
import { AccommodationService } from '../../dua/services/accommodation.service';
import { QualitativeReportService } from '../../student-reports/services/qualitative-report.service';
import { CompetencyValuationService } from '../../criterion-assessment/services/competency-valuation.service';
import { CentralizedGradesService } from '../../grades/services/centralized-grades.service';
import { ApplicableCriteriaService } from '../../criterion-assessment/services/applicable-criteria.service';
import { LomloeProgressService } from '../../academic-records/services/lomloe-progress.service';
import { GradePeriod } from '../../grades/entities/centralized-grade.entity';
import { UserRole } from '../../users/entities/user.entity';
import { StudentReportData, StudentReportFilters, ReportSection, SubjectSubgrade, LomloeCatalogEntry } from '../types/student-report.types';

const MAX_WORKS_PER_SUBJECT = 6;
const MAX_CRITERIA_PER_SUBJECT = 8;

@Injectable()
export class StudentReportDataCollector {
  private readonly logger = new Logger(StudentReportDataCollector.name);

  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly grades: GradesService,
    private readonly attendance: AttendanceService,
    private readonly formative: FormativeEvaluationService,
    private readonly evaluations: EvaluationsService,
    private readonly dua: DuaService,
    private readonly accommodation: AccommodationService,
    private readonly qualitative: QualitativeReportService,
    private readonly valuation: CompetencyValuationService,
    @InjectRepository(AcademicYear) private readonly yearRepo: Repository<AcademicYear>,
    private readonly centralized: CentralizedGradesService,
    private readonly applicable: ApplicableCriteriaService,
    private readonly lomloeProgress: LomloeProgressService,
  ) {}

  private wants(filters: StudentReportFilters, s: ReportSection): boolean {
    return !filters.sections || filters.sections.length === 0 || filters.sections.includes(s);
  }

  async collect(studentId: string, filters: StudentReportFilters, userId: string, userRole: UserRole): Promise<StudentReportData> {
    const student = await this.studentRepo.findOne({ where: { id: studentId }, relations: ['user', 'user.profile', 'educationalLevel', 'classGroups'] });
    if (!student) throw new NotFoundException('Alumno no encontrado');

    const result: StudentReportData = {
      student: {
        id: student.id,
        firstName: student.user?.profile?.firstName ?? '',
        lastName: student.user?.profile?.lastName ?? '',
        enrollmentNumber: student.enrollmentNumber,
        classGroup: student.classGroups?.[0]?.name ?? null,
        educationalLevel: student.educationalLevel?.name ?? null,
      },
      filters,
    };

    const year = await this.yearRepo.findOne({ where: { id: filters.academicYearId } });
    const startDate = year?.startDate ? new Date(year.startDate) : undefined;
    const endDate = year?.endDate ? new Date(year.endDate) : undefined;

    if (this.wants(filters, 'academic')) {
      try {
        const g = await this.grades.getStudentGrades(studentId, userId, userRole);
        let subs = (g.subjectGrades || []);
        if (filters.subjectIds?.length) subs = subs.filter((s: any) => filters.subjectIds!.includes(s.subjectId));
        result.academic = {
          hasData: subs.length > 0,
          overallAverage: this.num(g.summary?.overallAverage),
          subjects: subs.map((s: any) => ({
            subjectId: s.subjectId, name: s.subjectName, code: s.subjectCode,
            average: this.num(s.averageGrade),
            taskAverage: this.num(s.taskAverage), activityAverage: this.num(s.activityAverage), examAverage: this.num(s.examAverage),
            gradedItems: (s.gradedTasks || 0) + (s.examGradedCount || 0) + (s.activityAssessments || 0),
          })),
        };
      } catch { result.academic = { hasData: false, overallAverage: null, subjects: [] }; }
    }

    if (this.wants(filters, 'competencies')) {
      try {
        // LOMLOE primero (0-100). Fallback a la escala antigua 1-5 si el alumno no tiene datos LOMLOE.
        // El cálculo LOMLOE va en su propio try: si FALLA (no solo si no hay datos), cae al agregado 1-5
        // para no perder las competencias que el informe antiguo sí mostraría.
        let lomloe: { hasData: boolean; byKey: any[] } | null = null;
        try { lomloe = await this.valuation.getStudentValuation(studentId); } catch { lomloe = null; }
        if (lomloe && lomloe.hasData && lomloe.byKey.length > 0) {
          result.competencies = {
            hasData: true, scale: '0-100',
            items: lomloe.byKey.map((k: any) => ({ code: k.code, name: k.name, score: k.score })),
          };
        } else {
          const evals = await this.evaluations.findByStudent(studentId);
          const map = new Map<string, { code: string; name: string; sum: number; n: number }>();
          for (const ev of evals) for (const ce of (ev.competencyEvaluations || [])) {
            if (ce.isActive === false || !ce.competency) continue;
            const k = ce.competency.code;
            const cur = map.get(k) || { code: k, name: ce.competency.name, sum: 0, n: 0 };
            cur.sum += Number(ce.score); cur.n += 1; map.set(k, cur);
          }
          const items = [...map.values()].map((c) => ({ code: c.code, name: c.name, score: c.n ? Number((c.sum / c.n).toFixed(1)) : null }));
          result.competencies = { hasData: items.length > 0, scale: '1-5', items };
        }
      } catch { result.competencies = { hasData: false, scale: '1-5', items: [] }; }
    }

    if (this.wants(filters, 'socioEmotional')) {
      try {
        const prog = await this.formative.getStudentProgress(studentId, startDate && endDate ? { startDate, endDate } : undefined);
        const byAspect: Record<string, number> = {}; const byType: Record<string, number> = {};
        for (const o of prog.observations) {
          for (const [k, v] of Object.entries(o.developmentAspects || {})) if (v) byAspect[k] = (byAspect[k] || 0) + 1;
          if (o.observationType) byType[o.observationType] = (byType[o.observationType] || 0) + 1;
        }
        result.socioEmotional = {
          hasData: prog.progressSummary.totalObservations > 0,
          totalObservations: prog.progressSummary.totalObservations,
          byAspect, byType, byProgress: prog.progressSummary.byIndicator || {},
          requiresFollowUp: prog.progressSummary.requiresFollowUp || 0,
          notes: prog.observations.slice(0, 8).map((o) => ({ date: this.iso(o.observationDateTime), context: o.context, type: o.observationType, text: o.observation })),
        };
      } catch { result.socioEmotional = { hasData: false, totalObservations: 0, byAspect: {}, byType: {}, byProgress: {}, requiresFollowUp: 0, notes: [] }; }
    }

    if (this.wants(filters, 'attendance')) {
      try {
        const days = startDate && endDate ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)) : 30;
        const a = await this.attendance.getStudentAttendanceStats(studentId, days, userId, userRole.toLowerCase());
        const st = a?.stats || {};
        result.attendance = { hasData: (st.totalDays || 0) > 0, attendanceRate: this.num(st.attendanceRate), presentDays: st.presentDays || 0, absentDays: st.absentDays || 0, lateDays: st.lateDays || 0, justifiedAbsences: st.justifiedAbsences || 0 };
      } catch { result.attendance = { hasData: false, attendanceRate: null, presentDays: 0, absentDays: 0, lateDays: 0, justifiedAbsences: 0 }; }
    }

    if (this.wants(filters, 'dua')) {
      try {
        const profile = await this.dua.findProfileByStudent(studentId);
        const accs = profile ? await this.accommodation.findAccommodationsByProfile(studentId) : [];
        result.dua = {
          hasData: !!profile || accs.length > 0,
          strengths: profile?.strengths || [], barriers: profile?.barriersIdentified || [],
          accommodations: accs.map((x: any) => ({ name: x.name, type: x.type, status: x.status })),
        };
      } catch { result.dua = { hasData: false, strengths: [], barriers: [], accommodations: [] }; }
    }

    if (this.wants(filters, 'qualitative')) {
      try {
        const reports = await this.qualitative.getStudentReports(studentId, filters.academicYearId);
        result.qualitative = {
          hasData: reports.length > 0,
          reports: reports.map((r: any) => ({ contextTag: r.contextTag, content: r.content, priority: r.priority,
            author: [r.authorTeacher?.user?.profile?.firstName, r.authorTeacher?.user?.profile?.lastName].filter(Boolean).join(' '),
            date: this.iso(r.updatedAt) })),
        };
      } catch { result.qualitative = { hasData: false, reports: [] }; }
    }

    if (filters.detailed && filters.academicYearId) {
      try {
        const sas = await this.grades.getStudentSubjectAssignmentsForYear(studentId, filters.academicYearId);
        const filtered = filters.subjectIds?.length
          ? sas.filter(sa => filters.subjectIds!.includes((sa as any).subject?.id))
          : sas;

        // (a) subnotas acotadas por asignatura
        const subgrades: SubjectSubgrade[] = [];
        for (const sa of filtered) {
          try {
            const bd = await this.centralized.getStudentGradeBreakdown(studentId, (sa as any).id, GradePeriod.ANNUAL);
            const sd = bd?.sourceDetails || {};
            const works = [
              ...(sd.tasks || []).map((t: any) => ({ title: t.title, type: t.type ?? 'tarea', score: t.score ?? null, percentage: t.percentage ?? null, status: t.status })),
              ...(sd.activities || []).map((a: any) => ({ title: a.title, type: a.type ?? 'actividad', score: a.score ?? null, percentage: a.percentage ?? null })),
            ].slice(0, MAX_WORKS_PER_SUBJECT);
            subgrades.push({
              subjectAssignmentId: (sa as any).id,
              subjectName: (sa as any).subject?.name || 'Asignatura',
              finalGrade: bd?.finalGrade ?? null,
              works,
            });
          } catch { /* asignatura sin desglose → se omite con gracia */ }
        }
        result.subgrades = subgrades;

        // (b) catálogo LOMLOE acotado por asignatura
        const lomloeCatalog: LomloeCatalogEntry[] = [];
        for (const sa of filtered) {
          try {
            const cat = await this.applicable.getForAssignment((sa as any).id);
            const criteria = (cat?.groups || [])
              .flatMap((g: any) => (g.criteria || []).map((c: any) => ({ code: c.code, description: c.description })))
              .slice(0, MAX_CRITERIA_PER_SUBJECT);
            if (criteria.length) lomloeCatalog.push({ subjectAssignmentId: (sa as any).id, subjectName: (sa as any).subject?.name || 'Asignatura', criteria });
          } catch { /* catálogo no disponible → se omite */ }
        }
        result.lomloeCatalog = lomloeCatalog;

        // (c) progreso por criterio (reutiliza SP-C; hoy 0 filas en prod → subjects:[])
        try { result.lomloeProgress = await this.lomloeProgress.getProgress(studentId, filters.academicYearId); }
        catch { result.lomloeProgress = { subjects: [] }; }
      } catch (e: any) {
        this.logger.warn(`Paso detallado del informe falló, se continúa sin él: ${e?.message || e}`);
      }
    }

    return result;
  }

  private num(v: any): number | null { if (v === null || v === undefined || v === '') return null; const n = Number(v); return isNaN(n) ? null : n; }
  private iso(d: any): string { try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; } }
}
