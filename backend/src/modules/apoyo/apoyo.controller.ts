import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsUUID, IsOptional, IsNumber, IsIn, IsBoolean, Min } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

class FeeTierDto {
  @IsUUID() academicYearId: string;
  @IsIn(['primaria','secundaria','bachillerato']) etapa: string;
  @IsIn(['mensualidad','matricula','material']) concept: string;
  @IsOptional() @IsNumber() hours?: number | null;
  @IsNumber() @Min(0) amount: number;
}
class UpdateFeeTierDto {
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsNumber() hours?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('secretaria/apoyo')
@UseGuards(SecretariaAuthGuard)
export class ApoyoController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async ctx(yearId?: string) {
    const yid = yearId || (await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`).then(r => r[0]?.id));
    const sid = await this.ds.query(`SELECT id FROM secretaria.services WHERE code='APOYO' LIMIT 1`).then(r => r[0]?.id);
    return { yid, sid };
  }

  // Tablero kanban de Apoyo: grupos con nombre + alumnos (estilo Danza; con horas y nivel)
  @Get('board') @Roles('secretaria_admin','secretaria_staff','direccion')
  async board(@Query('academicYearId') yearId?: string) {
    const { yid, sid } = await this.ctx(yearId);
    const groups = await this.ds.query(`
      SELECT g.id, g.name, g.room, g.color,
        COALESCE((SELECT json_agg(json_build_object('weekday', ss.weekday, 'startTime', to_char(ss.start_time,'HH24:MI'), 'room', ss.room) ORDER BY ss.weekday, ss.start_time)
                  FROM secretaria.schedule_slots ss WHERE ss.group_id=g.id), '[]'::json) AS schedule
      FROM secretaria.groups g JOIN secretaria.programs p ON p.id=g.program_id
      WHERE g.academic_year_id=$1 AND p.service_id=$2 ORDER BY g.sort_order, g.name`, [yid, sid]);
    const studentsRaw = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.status, e.notes AS comment, e.apoyo_level AS "apoyoLevel",
        COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
        secretaria.fn_resolve_monthly_fee(e.id) AS monthly,
        COALESCE((SELECT json_agg(json_build_object('id', a.id, 'groupId', a.group_id, 'weekday', a.weekday, 'startTime', a.slot_time, 'hours', a.hours) ORDER BY a.weekday, a.slot_time)
                  FROM secretaria.apoyo_assignments a WHERE a.enrollment_id=e.id), '[]'::json) AS assignments
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status IN ('matriculado','preinscrito','lista_espera','pendiente')
      ORDER BY "studentName"`, [yid, sid]);
    const students = studentsRaw.map((s: any) => ({ ...s, totalHours: (s.assignments || []).reduce((sum: number, a: any) => sum + Number(a.hours || 0), 0) }));
    return { groups, students };
  }

  // Detalle de Apoyo de un alumno (para la ficha)
  @Get('student/:enrollmentId') @Roles('secretaria_admin','secretaria_staff','direccion')
  async studentDetail(@Param('enrollmentId') enrollmentId: string) {
    const assignments = await this.ds.query(`
      SELECT a.id, a.group_id AS "groupId", g.name AS "groupName", a.weekday, a.slot_time AS "slotTime", a.hours
      FROM secretaria.apoyo_assignments a JOIN secretaria.groups g ON g.id=a.group_id
      WHERE a.enrollment_id=$1 ORDER BY a.weekday, a.slot_time`, [enrollmentId]);
    const meta = await this.ds.query(`SELECT apoyo_level AS "apoyoLevel", secretaria.fn_resolve_monthly_fee(id) AS monthly FROM secretaria.enrollments WHERE id=$1`, [enrollmentId]);
    const totalHours = assignments.reduce((sum: number, a: any) => sum + Number(a.hours || 0), 0);
    return { apoyoLevel: meta[0]?.apoyoLevel || null, monthly: meta[0]?.monthly ?? null, totalHours, assignments };
  }

  // Asignar (o actualizar horas de) un alumno a una franja de un grupo
  @Post('assign') @Roles('secretaria_admin','secretaria_staff')
  async assign(@Body() b: { enrollmentId: string; groupId: string; weekday: number; slotTime: string; hours?: number; room?: string }) {
    const chk = await this.ds.query(`
      SELECT 1 FROM secretaria.enrollments e JOIN secretaria.services se ON se.id=e.service_id
      JOIN secretaria.groups g ON g.id=$2 JOIN secretaria.programs p ON p.id=g.program_id JOIN secretaria.services sg ON sg.id=p.service_id
      WHERE e.id=$1 AND se.code='APOYO' AND sg.code='APOYO'`, [b.enrollmentId, b.groupId]);
    if (chk.length === 0) return { ok: false, error: 'La matrícula o el grupo no son de Apoyo' };
    await this.ds.query(
      `INSERT INTO secretaria.apoyo_assignments(enrollment_id, group_id, weekday, slot_time, room, hours)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,1))
       ON CONFLICT (enrollment_id, group_id, weekday, slot_time) DO UPDATE SET hours=EXCLUDED.hours, room=EXCLUDED.room`,
      [b.enrollmentId, b.groupId, b.weekday, b.slotTime, b.room || null, b.hours ?? null]);
    await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1 AND group_id IS NULL`, [b.enrollmentId, b.groupId]);
    return { ok: true };
  }

  @Patch('assignment/:id/hours') @Roles('secretaria_admin','secretaria_staff')
  async setHours(@Param('id') id: string, @Body() b: { hours?: number }) {
    const h = Number(b.hours);
    if (!Number.isFinite(h) || h <= 0) return { ok: false, error: 'Horas inválidas' };
    await this.ds.query(`UPDATE secretaria.apoyo_assignments SET hours=$2 WHERE id=$1`, [id, h]);
    return { ok: true };
  }

  @Delete('assignment/:id') @Roles('secretaria_admin','secretaria_staff')
  async remove(@Param('id') id: string) {
    const rows = await this.ds.query(`DELETE FROM secretaria.apoyo_assignments WHERE id=$1 RETURNING enrollment_id`, [id]);
    const enr = rows[0]?.enrollment_id;
    if (enr) {
      const rest = await this.ds.query(`SELECT group_id FROM secretaria.apoyo_assignments WHERE enrollment_id=$1 LIMIT 1`, [enr]);
      await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1`, [enr, rest[0]?.group_id || null]);
    }
    return { ok: true };
  }

  @Delete('assignments') @Roles('secretaria_admin','secretaria_staff')
  async delGroupAssignments(@Query('enrollmentId') enrollmentId: string, @Query('groupId') groupId: string) {
    await this.ds.query(`DELETE FROM secretaria.apoyo_assignments WHERE enrollment_id=$1 AND group_id=$2`, [enrollmentId, groupId]);
    const rest = await this.ds.query(`SELECT group_id FROM secretaria.apoyo_assignments WHERE enrollment_id=$1 LIMIT 1`, [enrollmentId]);
    await this.ds.query(`UPDATE secretaria.enrollments SET group_id=$2 WHERE id=$1`, [enrollmentId, rest[0]?.group_id || null]);
    return { ok: true };
  }

  // --- Tarifas por etapa + horas (se mantienen) ---
  @Get('fee-tiers') @Roles('secretaria_admin','secretaria_staff','direccion')
  async listTiers(@Query('academicYearId') yearId?: string) {
    const { yid } = await this.ctx(yearId);
    return this.ds.query(
      `SELECT id, academic_year_id AS "academicYearId", etapa, concept, hours, amount, is_active AS "isActive"
       FROM secretaria.apoyo_fee_tiers WHERE academic_year_id=$1
       ORDER BY etapa, concept, hours NULLS FIRST`, [yid]);
  }

  @Post('fee-tiers') @Roles('secretaria_admin','secretaria_staff')
  async createTier(@Body() b: FeeTierDto) {
    const hours = b.concept === 'mensualidad' ? Number(b.hours) : null;
    if (b.concept === 'mensualidad' && (!Number.isFinite(hours) || (hours as number) <= 0))
      return { ok: false, error: 'La mensualidad necesita un nº de horas > 0' };
    try {
      const r = await this.ds.query(
        `INSERT INTO secretaria.apoyo_fee_tiers(academic_year_id, etapa, concept, hours, amount)
         VALUES ($1,$2::secretaria.apoyo_level,$3::secretaria.fee_concept,$4,$5) RETURNING id`,
        [b.academicYearId, b.etapa, b.concept, hours, b.amount]);
      return { ok: true, id: r[0].id };
    } catch (e: any) {
      if (String(e?.message || '').includes('uniq')) return { ok: false, error: 'Ya existe un tramo para esa etapa/concepto/horas' };
      throw e;
    }
  }

  @Patch('fee-tiers/:id') @Roles('secretaria_admin','secretaria_staff')
  async updateTier(@Param('id') id: string, @Body() b: UpdateFeeTierDto) {
    const sets: string[] = []; const params: any[] = [];
    const push = (c: string, v: any) => { params.push(v); sets.push(`${c} = $${params.length}`); };
    if (b.amount !== undefined) push('amount', b.amount);
    if (b.hours !== undefined) push('hours', b.hours);
    if (b.isActive !== undefined) push('is_active', b.isActive);
    if (!sets.length) return { ok: true };
    params.push(id);
    await this.ds.query(`UPDATE secretaria.apoyo_fee_tiers SET ${sets.join(', ')} WHERE id=$${params.length}`, params);
    return { ok: true };
  }

  @Delete('fee-tiers/:id') @Roles('secretaria_admin','secretaria_staff')
  async deleteTier(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.apoyo_fee_tiers WHERE id=$1`, [id]);
    return { ok: true };
  }
}
