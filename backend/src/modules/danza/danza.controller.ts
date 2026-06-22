// backend/src/modules/danza/danza.controller.ts
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

@Controller('secretaria/danza')
@UseGuards(SecretariaAuthGuard)
export class DanzaController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // --- Task 5: Tier CRUD ---

  @Get('tiers')
  async tiers(@Query('groupId') groupId?: string) {
    if (groupId) {
      return this.ds.query(`SELECT id, group_id AS "groupId", days, amount FROM secretaria.danza_fee_tiers WHERE group_id=$1 ORDER BY days`, [groupId]);
    }
    return this.ds.query(`SELECT id, group_id AS "groupId", days, amount FROM secretaria.danza_fee_tiers WHERE group_id IS NULL ORDER BY days`);
  }

  @Post('tiers') @Roles('secretaria_admin','secretaria_staff','direccion')
  async setTier(@Body() b: { groupId?: string | null; days: number; amount: number }) {
    if (!b.days || b.days < 1) return { ok: false, error: 'Nº de días inválido' };
    if (b.amount == null || b.amount <= 0) return { ok: false, error: 'Importe inválido' };
    // upsert manual (índices parciales no admiten ON CONFLICT con NULL fácilmente)
    if (b.groupId) {
      await this.ds.query(`DELETE FROM secretaria.danza_fee_tiers WHERE group_id=$1 AND days=$2`, [b.groupId, b.days]);
      await this.ds.query(`INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount) VALUES ($1,$2,$3)`, [b.groupId, b.days, b.amount]);
    } else {
      await this.ds.query(`DELETE FROM secretaria.danza_fee_tiers WHERE group_id IS NULL AND days=$1`, [b.days]);
      await this.ds.query(`INSERT INTO secretaria.danza_fee_tiers(group_id, days, amount) VALUES (NULL,$1,$2)`, [b.days, b.amount]);
    }
    return { ok: true };
  }

  @Delete('tiers/:id') @Roles('secretaria_admin','secretaria_staff','direccion')
  async delTier(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.danza_fee_tiers WHERE id=$1`, [id]);
    return { ok: true };
  }

  // --- Task 6: Board + assignments ---

  @Get('board')
  async board(@Query('academicYearId') yearId: string) {
    const danzaSvc = await this.ds.query(`SELECT id FROM secretaria.services WHERE code='DANZA' LIMIT 1`);
    const svcId = danzaSvc[0]?.id;
    const groups = await this.ds.query(`
      SELECT g.id, g.name, g.room, g.color, g.bills_maillot AS "billsMaillot",
        COALESCE((SELECT json_agg(json_build_object('weekday', ss.weekday, 'startTime', to_char(ss.start_time,'HH24:MI'), 'room', ss.room) ORDER BY ss.weekday, ss.start_time)
                  FROM secretaria.schedule_slots ss WHERE ss.group_id=g.id), '[]'::json) AS schedule
      FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id
      WHERE g.academic_year_id=$1 AND p.service_id=$2 ORDER BY g.sort_order, g.name`, [yearId, svcId]);
    const students = await this.ds.query(`
      SELECT e.id AS "enrollmentId",
        COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
        secretaria.fn_resolve_danza_monthly(e.id) AS monthly,
        secretaria.fn_resolve_danza_maillot(e.id) AS maillot,
        COALESCE((SELECT json_agg(json_build_object('id', da.id, 'groupId', da.group_id, 'weekday', da.weekday, 'startTime', to_char(da.start_time,'HH24:MI'), 'room', da.room) ORDER BY da.weekday, da.start_time)
                  FROM secretaria.danza_assignments da WHERE da.enrollment_id=e.id), '[]'::json) AS assignments
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status IN ('matriculado','preinscrito','lista_espera','pendiente')
      ORDER BY "studentName"`, [yearId, svcId]);
    const withDays = students.map((s: any) => ({ ...s, totalDays: (s.assignments || []).length }));
    return {
      groups,
      students: withDays.filter((s: any) => s.totalDays > 0),
      pool: withDays.filter((s: any) => s.totalDays === 0).map((s: any) => ({ enrollmentId: s.enrollmentId, studentName: s.studentName })),
    };
  }

  @Post('assign') @Roles('secretaria_admin','secretaria_staff','direccion')
  async assign(@Body() b: { enrollmentId: string; groupId: string; weekday: number; startTime: string; room?: string }) {
    await this.ds.query(
      `INSERT INTO secretaria.danza_assignments(enrollment_id, group_id, weekday, start_time, room)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (enrollment_id, group_id, weekday, start_time) DO NOTHING`,
      [b.enrollmentId, b.groupId, b.weekday, b.startTime, b.room || null]);
    // mantener enrollments.group_id = grupo representativo (si está NULL)
    await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1 AND group_id IS NULL`, [b.enrollmentId, b.groupId]);
    return { ok: true };
  }

  @Delete('assignment/:id') @Roles('secretaria_admin','secretaria_staff','direccion')
  async delAssignment(@Param('id') id: string) {
    const rows = await this.ds.query(`DELETE FROM secretaria.danza_assignments WHERE id=$1 RETURNING enrollment_id`, [id]);
    const enr = rows[0]?.enrollment_id;
    if (enr) {
      const rest = await this.ds.query(`SELECT group_id FROM secretaria.danza_assignments WHERE enrollment_id=$1 LIMIT 1`, [enr]);
      await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1`, [enr, rest[0]?.group_id || null]);
    }
    return { ok: true };
  }
}
