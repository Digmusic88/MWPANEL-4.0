import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsUUID, IsInt, IsOptional, IsNumber, IsIn, IsBoolean, Min, Max } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

class AssignDto {
  @IsUUID() enrollmentId: string;
  @IsInt() @Min(1) @Max(7) weekday: number;
  @IsString() slotTime: string; // HH:MM
  @IsOptional() @IsString() room?: string;
  @IsOptional() @IsNumber() hours?: number;
}
class MoveDto {
  @IsInt() @Min(1) @Max(7) weekday: number;
  @IsString() slotTime: string;
  @IsOptional() @IsString() room?: string;
}
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

  // Tablero de Apoyo: asignaciones (día×hora×sala), pool sin asignar y lista de espera.
  @Get('board') @Roles('secretaria_admin','secretaria_staff','direccion')
  async board(@Query('academicYearId') yearId?: string) {
    const { yid, sid } = await this.ctx(yearId);
    const assignments = await this.ds.query(`
      SELECT a.id, a.enrollment_id AS "enrollmentId", a.weekday, a.slot_time AS "slotTime", a.room,
             a.hours, e.apoyo_level AS "apoyoLevel",
             (SELECT COALESCE(SUM(h.hours),0) FROM secretaria.apoyo_assignments h WHERE h.enrollment_id=e.id) AS "totalHours",
             secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.apoyo_assignments a
      JOIN secretaria.enrollments e ON e.id=a.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2
      ORDER BY a.weekday, a.slot_time, "studentName"`, [yid, sid]);
    // Pool: matriculados de apoyo SIN ninguna asignación
    const pool = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.apoyo_level AS "apoyoLevel",
             secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status='matriculado'
        AND NOT EXISTS (SELECT 1 FROM secretaria.apoyo_assignments a WHERE a.enrollment_id=e.id)
      ORDER BY "studentName"`, [yid, sid]);
    // Lista de espera: matrículas de apoyo en estado lista_espera
    const waitlist = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.waitlist_reason AS "reason",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2 AND e.status='lista_espera'
      ORDER BY "studentName"`, [yid, sid]);
    // Franjas horarias persistentes (+ las que tengan asignaciones aunque no estén en la lista)
    const slotRows = await this.ds.query(`
      SELECT slot_time AS "slotTime" FROM secretaria.apoyo_slots
      UNION SELECT DISTINCT a.slot_time FROM secretaria.apoyo_assignments a
      ORDER BY 1`);
    const slots = slotRows.map((r: any) => r.slotTime);
    return { assignments, pool, waitlist, slots };
  }

  // Franjas horarias (filas de la rejilla)
  @Post('slots') @Roles('secretaria_admin','secretaria_staff')
  async addSlot(@Body() b: { slotTime: string }) {
    if (!/^\d{1,2}:\d{2}$/.test(b.slotTime || '')) return { ok: false, error: 'Formato HH:MM' };
    await this.ds.query(`INSERT INTO secretaria.apoyo_slots(slot_time) VALUES ($1) ON CONFLICT (slot_time) DO NOTHING`, [b.slotTime]);
    return { ok: true };
  }

  // Elimina una franja horaria. Si tenía alumnos asignados, también los quita de ella.
  @Delete('slots/:slotTime') @Roles('secretaria_admin','secretaria_staff')
  async deleteSlot(@Param('slotTime') slotTime: string) {
    const removed = await this.ds.query(`DELETE FROM secretaria.apoyo_assignments WHERE slot_time=$1 RETURNING id`, [slotTime]);
    await this.ds.query(`DELETE FROM secretaria.apoyo_slots WHERE slot_time=$1`, [slotTime]);
    const n = Array.isArray(removed) ? (Array.isArray(removed[0]) ? removed[0].length : removed.length) : 0;
    return { ok: true, assignmentsRemoved: n };
  }

  @Post('assign') @Roles('secretaria_admin','secretaria_staff')
  async assign(@Body() b: AssignDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.apoyo_assignments(enrollment_id, weekday, slot_time, room, hours)
       VALUES ($1,$2,$3,$4,COALESCE($5,1)) RETURNING id`,
      [b.enrollmentId, b.weekday, b.slotTime, b.room || null, b.hours ?? null]);
    return { ok: true, id: r[0].id };
  }

  @Patch('assignment/:id') @Roles('secretaria_admin','secretaria_staff')
  async move(@Param('id') id: string, @Body() b: MoveDto) {
    await this.ds.query(`UPDATE secretaria.apoyo_assignments SET weekday=$2, slot_time=$3, room=COALESCE($4, room) WHERE id=$1`,
      [id, b.weekday, b.slotTime, b.room ?? null]);
    return { ok: true };
  }

  @Patch('assignment/:id/room') @Roles('secretaria_admin','secretaria_staff')
  async setRoom(@Param('id') id: string, @Body() b: { room?: string }) {
    await this.ds.query(`UPDATE secretaria.apoyo_assignments SET room=$2 WHERE id=$1`, [id, b.room || null]);
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
    await this.ds.query(`DELETE FROM secretaria.apoyo_assignments WHERE id=$1`, [id]);
    return { ok: true };
  }

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
