import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

@Controller('secretaria/stats')
@UseGuards(SecretariaAuthGuard)
@Roles('secretaria_admin', 'secretaria_staff', 'direccion')
export class StatsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  @Get('overview')
  async overview(@Query('academicYearId') yearId?: string) {
    const yr = await this.ds.query(`SELECT id, label FROM secretaria.academic_years WHERE ${yearId ? 'id=$1' : 'is_active=true'} LIMIT 1`, yearId ? [yearId] : []);
    const yid = yr[0]?.id;
    const yearLabel = yr[0]?.label || '';
    const one = async (sql: string, params: any[] = []) => (await this.ds.query(sql, params))[0] || {};
    const many = (sql: string, params: any[] = []) => this.ds.query(sql, params);

    // Alumnos
    const students = await one(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE mwpanel_student_id IS NULL)::int AS academia,
             count(*) FILTER (WHERE mwpanel_student_id IS NOT NULL)::int AS escuela
      FROM secretaria.students WHERE is_active=true`);

    const families = await one(`SELECT count(*)::int AS total FROM secretaria.families`);
    const teachers = await one(`SELECT count(*)::int AS total FROM secretaria.teachers WHERE is_active=true`);

    // Matrículas del curso por estado
    const enrollStatus = await one(`
      SELECT count(*) FILTER (WHERE status='matriculado')::int AS matriculado,
             count(*) FILTER (WHERE status='preinscrito')::int AS preinscrito,
             count(*) FILTER (WHERE status='lista_espera')::int AS lista_espera,
             count(*) FILTER (WHERE status='pendiente')::int AS pendiente,
             count(*) FILTER (WHERE status='baja')::int AS baja
      FROM secretaria.enrollments WHERE academic_year_id=$1`, [yid]);

    const byService = await many(`
      SELECT sv.name AS service,
             count(*) FILTER (WHERE e.status='matriculado')::int AS matriculado,
             count(*) FILTER (WHERE e.status='preinscrito')::int AS preinscrito,
             count(*) FILTER (WHERE e.status='lista_espera')::int AS espera
      FROM secretaria.services sv
      LEFT JOIN secretaria.enrollments e ON e.service_id=sv.id AND e.academic_year_id=$1
      GROUP BY sv.id, sv.name ORDER BY matriculado DESC`, [yid]);

    // Grupos: ocupación
    const groups = await one(`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE teacher_id IS NOT NULL)::int AS "withTeacher"
      FROM secretaria.groups WHERE academic_year_id=$1`, [yid]);
    const occupancy = await many(`
      SELECT g.name, sv.name AS service, g.capacity,
             (SELECT count(*)::int FROM secretaria.enrollments e WHERE e.group_id=g.id AND e.status='matriculado') AS count
      FROM secretaria.groups g
      LEFT JOIN secretaria.programs pr ON pr.id=g.program_id
      LEFT JOIN secretaria.services sv ON sv.id=pr.service_id
      WHERE g.academic_year_id=$1 ORDER BY count DESC LIMIT 30`, [yid]);

    // Económico (recibos del curso)
    const finance = await one(`
      SELECT COALESCE(sum(c.amount_due) FILTER (WHERE c.status='pagado'),0)::numeric AS cobrado,
             COALESCE(sum(c.amount_due) FILTER (WHERE c.status='pendiente' AND e.status='matriculado'),0)::numeric AS pendiente,
             count(*) FILTER (WHERE c.status='pendiente' AND e.status='matriculado')::int AS "pendienteCount",
             count(*) FILTER (WHERE c.status='pagado')::int AS "pagadoCount",
             count(*) FILTER (WHERE c.status='exento')::int AS "exentoCount"
      FROM secretaria.charges c JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      WHERE e.academic_year_id=$1`, [yid]);
    const morosidad = await one(`
      SELECT count(DISTINCT f.id)::int AS families, COALESCE(sum(c.amount_due),0)::numeric AS amount
      FROM secretaria.charges c
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      JOIN secretaria.families f ON f.id=st.family_id
      WHERE e.academic_year_id=$1 AND c.status='pendiente' AND e.status='matriculado'`, [yid]);
    const byConcept = await many(`
      SELECT c.concept,
             COALESCE(sum(c.amount_due) FILTER (WHERE c.status='pagado'),0)::numeric AS cobrado,
             COALESCE(sum(c.amount_due) FILTER (WHERE c.status='pendiente' AND e.status='matriculado'),0)::numeric AS pendiente
      FROM secretaria.charges c JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      WHERE e.academic_year_id=$1 GROUP BY c.concept ORDER BY cobrado DESC`, [yid]);

    // Documentación
    const documents = await one(`
      SELECT count(*) FILTER (WHERE status='recibido')::int AS recibido,
             count(*) FILTER (WHERE status='pendiente')::int AS pendiente,
             count(*) FILTER (WHERE status='caducado')::int AS caducado,
             count(*)::int AS total
      FROM secretaria.student_documents WHERE academic_year_id=$1`, [yid]);

    // SEPA y rifas (resumen ligero)
    const sepa = await one(`SELECT count(*)::int AS batches, count(*) FILTER (WHERE status='procesada')::int AS procesadas FROM secretaria.sepa_batches`);
    const levelTests = await one(`SELECT count(*)::int AS total FROM secretaria.level_tests WHERE academic_year_id=$1`, [yid]);

    return { yearLabel, students, families, teachers, enrollStatus, byService, groups, occupancy, finance, morosidad, byConcept, documents, sepa, levelTests };
  }
}
