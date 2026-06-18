import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsUUID, IsInt, IsOptional, Min, Max } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

class AssignDto {
  @IsUUID() enrollmentId: string;
  @IsInt() @Min(1) @Max(7) weekday: number;
  @IsString() slotTime: string; // HH:MM
  @IsOptional() @IsString() room?: string;
}
class MoveDto {
  @IsInt() @Min(1) @Max(7) weekday: number;
  @IsString() slotTime: string;
  @IsOptional() @IsString() room?: string;
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
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.apoyo_assignments a
      JOIN secretaria.enrollments e ON e.id=a.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1 AND e.service_id=$2
      ORDER BY a.weekday, a.slot_time, "studentName"`, [yid, sid]);
    // Pool: matriculados de apoyo SIN ninguna asignación
    const pool = await this.ds.query(`
      SELECT e.id AS "enrollmentId",
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
      `INSERT INTO secretaria.apoyo_assignments(enrollment_id, weekday, slot_time, room) VALUES ($1,$2,$3,$4) RETURNING id`,
      [b.enrollmentId, b.weekday, b.slotTime, b.room || null]);
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

  @Delete('assignment/:id') @Roles('secretaria_admin','secretaria_staff')
  async remove(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.apoyo_assignments WHERE id=$1`, [id]);
    return { ok: true };
  }
}
