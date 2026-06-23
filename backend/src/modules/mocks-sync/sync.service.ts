import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { buildDesiredState, GroupStudentRow, buildExamCalls, ExamCandidateRow } from './desired-state';
import { MocksApiClient, ReconcileReport } from './mocks-api.client';

export type ReconcileOutcome = (ReconcileReport & { ok: true }) | { ok: false; skipped: true };

@Injectable()
export class SyncService {
  private readonly log = new Logger('MocksSync');
  private running = false;

  constructor(
    @InjectDataSource() private ds: DataSource,
    private readonly mocks: MocksApiClient,
  ) {}

  async reconcile(trigger: 'change-feed' | 'cron' | 'manual'): Promise<ReconcileOutcome> {
    if (this.running) {
      this.log.warn(`reconcile(${trigger}) omitido: ya hay uno en curso`);
      return { ok: false, skipped: true };
    }
    this.running = true;
    const t0 = Date.now();
    try {
      // Año activo
      const yearRows = await this.ds.query(
        `SELECT label FROM secretaria.academic_years WHERE is_active = true LIMIT 1`,
      );
      if (!yearRows.length) throw new Error('No hay academic_year activo');
      const academicYear: string = yearRows[0].label;

      // Filas planas grupo × alumno (solo programas con mock_exam_type, año activo)
      const rows: GroupStudentRow[] = await this.ds.query(
        `SELECT g.id::text   AS "groupExternalId",
                g.name        AS "groupName",
                p.mock_exam_type AS "examType",
                s.id::text    AS "studentExternalId",
                COALESCE(NULLIF(TRIM(s.first_name), ''), va.first_name) AS "firstName",
                COALESCE(NULLIF(TRIM(s.last_name),  ''), va.last_name)  AS "lastName",
                s.mock_user_id AS "mockUserId"
         FROM secretaria.groups g
         JOIN secretaria.programs p ON p.id = g.program_id
         JOIN secretaria.academic_years ay ON ay.id = g.academic_year_id AND ay.is_active = true
         LEFT JOIN secretaria.enrollments e
                ON e.group_id = g.id AND e.status = 'matriculado'
         LEFT JOIN secretaria.students s
                ON s.id = e.student_id AND s.is_active = true
         LEFT JOIN secretaria.v_alumnos_escuela va
                ON va.mwpanel_student_id = s.mwpanel_student_id
         WHERE p.mock_exam_type IS NOT NULL
         ORDER BY g.id, s.last_name, s.first_name`,
      );

      const groups = buildDesiredState(rows);

      // Convocatorias (exam_sessions de nivel KEY/PET/FCE/CAE del año activo) + candidatos 'asiste'
      const examRows: ExamCandidateRow[] = await this.ds.query(
        `SELECT es.id::text         AS "sessionExternalId",
                es.name             AS "sessionName",
                to_char(es.exam_date, 'YYYY-MM-DD') AS "examDate",
                es.level            AS "level",
                ec.student_id::text AS "studentExternalId",
                s.mock_user_id      AS "mockUserId"
         FROM secretaria.exam_sessions es
         JOIN secretaria.academic_years ay ON ay.id = es.academic_year_id AND ay.is_active = true
         JOIN secretaria.exam_candidates ec ON ec.session_id = es.id AND ec.status = 'asiste'
         JOIN secretaria.students s ON s.id = ec.student_id AND s.is_active = true
         WHERE es.level IN ('KEY','PET','FCE','CAE')
         ORDER BY es.exam_date, es.id`,
      );
      const examCalls = buildExamCalls(examRows);

      const report: ReconcileReport = await this.mocks.reconcile({ academicYear, groups, examCalls });

      // Persistir ids devueltos
      for (const g of report.groups) {
        await this.ds.query(
          `UPDATE secretaria.groups SET mock_group_id = $1 WHERE id = $2::uuid AND (mock_group_id IS DISTINCT FROM $1)`,
          [g.mockGroupId, g.externalId],
        );
      }
      for (const s of report.students) {
        await this.ds.query(
          `UPDATE secretaria.students SET mock_user_id = $1 WHERE id = $2::uuid AND (mock_user_id IS DISTINCT FROM $1)`,
          [s.mockUserId, s.externalId],
        );
      }

      await this.writeLog(trigger, true, report, null, Date.now() - t0);
      this.log.log(
        `reconcile(${trigger}) ok: +${report.created} alumnos, ${report.enrolled} altas, ${report.unenrolled} bajas, ${report.renamed} renombrados, +${report.examCallsCreated ?? 0} convocatorias (${report.examCallsLinked ?? 0} candidatos), ${report.incidencias.length} incidencias`,
      );
      return { ...report, ok: true as const };
    } catch (e: any) {
      await this.writeLog(trigger, false, null, String(e?.message || e), Date.now() - t0);
      this.log.error(`reconcile(${trigger}) FALLÓ: ${e?.message || e}`);
      throw e;
    } finally {
      this.running = false;
    }
  }

  private async writeLog(
    trigger: string, ok: boolean, report: ReconcileReport | null, error: string | null, durationMs: number,
  ) {
    await this.ds.query(
      `INSERT INTO secretaria.mock_sync_log
         (trigger, ok, created, renamed, enrolled, unenrolled, adopted, incidencias, error, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
      [
        trigger, ok,
        report?.created ?? 0, report?.renamed ?? 0, report?.enrolled ?? 0,
        report?.unenrolled ?? 0, report?.adopted ?? 0,
        JSON.stringify(report?.incidencias ?? []), error, durationMs,
      ],
    );
  }
}
