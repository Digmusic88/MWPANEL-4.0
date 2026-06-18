import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { isOnlyTeacher, teacherIdOf } from '../../common/teacher-scope';

class SlotDto {
  @IsUUID() groupId: string;
  @IsInt() @Min(1) @Max(7) weekday: number; // 1=Lunes ... 7=Domingo
  @IsString() startTime: string; // HH:MM
  @IsString() endTime: string;
  @IsOptional() @IsString() room?: string;
}

@Controller('secretaria/schedule')
@UseGuards(SecretariaAuthGuard)
export class ScheduleController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Franjas horarias del curso (con grupo/programa/servicio para pintar el horario)
  @Get()
  async list(@Req() req: any, @Query('academicYearId') yearId: string, @Query('groupId') groupId?: string) {
    // RGPD: un profesor solo ve los horarios de SUS grupos
    const teacherId = isOnlyTeacher(req.user)
      ? ((await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000')
      : null;
    return this.ds.query(`
      SELECT ss.id, ss.group_id AS "groupId", ss.weekday, to_char(ss.start_time,'HH24:MI') AS "startTime",
             to_char(ss.end_time,'HH24:MI') AS "endTime", ss.room,
             g.name AS "groupName", g.academic_year_id AS "academicYearId", g.teacher_id AS "teacherId",
             t.full_name AS "teacherName", g.color AS "color",
             pr.name AS "programName", sv.name AS "serviceName", sv.color AS "serviceColor"
      FROM secretaria.schedule_slots ss
      JOIN secretaria.groups g ON g.id=ss.group_id
      LEFT JOIN secretaria.teachers t ON t.id=g.teacher_id
      LEFT JOIN secretaria.programs pr ON pr.id=g.program_id
      LEFT JOIN secretaria.services sv ON sv.id=pr.service_id
      WHERE ($1::uuid IS NULL OR g.academic_year_id=$1)
        AND ($2::uuid IS NULL OR ss.group_id=$2)
        AND ($3::uuid IS NULL OR g.teacher_id=$3)
      ORDER BY ss.weekday, ss.start_time`, [yearId || null, groupId || null, teacherId]);
  }

  // Rejilla por AULA (estilo Excel): aulas (columnas), franjas horarias y bloques de clase.
  @Get('grid') @Roles('secretaria_admin','secretaria_staff','direccion')
  async grid(@Query('academicYearId') yearId: string) {
    const yid = yearId || (await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`).then(r => r[0]?.id));
    const blocks = await this.ds.query(`
      SELECT ss.id, ss.group_id AS "groupId", ss.weekday, to_char(ss.start_time,'HH24:MI') AS start,
             to_char(ss.end_time,'HH24:MI') AS "end", COALESCE(ss.room, g.room) AS room,
             g.name AS "groupName", t.id AS "teacherId", t.full_name AS "teacherName",
             g.color AS "color", sv.name AS "serviceName", sv.color AS "serviceColor", pr.name AS "programName"
      FROM secretaria.schedule_slots ss
      JOIN secretaria.groups g ON g.id=ss.group_id
      LEFT JOIN secretaria.programs pr ON pr.id=g.program_id
      LEFT JOIN secretaria.services sv ON sv.id=pr.service_id
      LEFT JOIN secretaria.teachers t ON t.id=g.teacher_id
      WHERE g.academic_year_id=$1
      ORDER BY ss.weekday, ss.start_time`, [yid]);
    const roomRows = await this.ds.query(`
      SELECT name FROM secretaria.rooms
      UNION SELECT DISTINCT COALESCE(ss.room, g.room) FROM secretaria.schedule_slots ss JOIN secretaria.groups g ON g.id=ss.group_id WHERE COALESCE(ss.room,g.room) IS NOT NULL
      ORDER BY 1`);
    const rooms = roomRows.map((r: any) => r.name).filter(Boolean);
    return { rooms, blocks };
  }

  @Post() @Roles('secretaria_admin','secretaria_staff')
  async create(@Body() b: SlotDto) {
    // Evita duplicar: si el MISMO grupo ya tiene franja ese día y hora, se actualiza (aula/fin) en vez de crear otra.
    const dup = await this.ds.query(
      `SELECT id FROM secretaria.schedule_slots WHERE group_id=$1 AND weekday=$2 AND start_time=$3 LIMIT 1`,
      [b.groupId, b.weekday, b.startTime]);
    // Al colocar un bloque en un aula concreta, sincroniza también el aula del grupo (sección Grupos).
    if (b.room && b.room.trim()) {
      await this.ds.query(`UPDATE secretaria.groups SET room=$1 WHERE id=$2`, [b.room.trim(), b.groupId]);
    }
    if (dup[0]) {
      await this.ds.query(`UPDATE secretaria.schedule_slots SET end_time=$2, room=$3 WHERE id=$1`,
        [dup[0].id, b.endTime, b.room || null]);
      return { ok: true, id: dup[0].id, merged: true };
    }
    const r = await this.ds.query(
      `INSERT INTO secretaria.schedule_slots(group_id, weekday, start_time, end_time, room) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [b.groupId, b.weekday, b.startTime, b.endTime, b.room || null]);
    return { ok: true, id: r[0].id };
  }

  // Mover/editar un bloque (arrastrar en la rejilla): cambia día, hora y/o aula.
  @Patch(':id') @Roles('secretaria_admin','secretaria_staff')
  async move(@Param('id') id: string, @Body() b: { weekday?: number; startTime?: string; endTime?: string; room?: string }) {
    const sets: string[] = []; const params: any[] = [];
    const push = (col: string, val: any) => { params.push(val); sets.push(`${col}=$${params.length}`); };
    if (b.weekday !== undefined) push('weekday', b.weekday);
    if (b.startTime !== undefined) push('start_time', b.startTime);
    if (b.endTime !== undefined) push('end_time', b.endTime);
    if (b.room !== undefined) push('room', b.room || null);
    if (!sets.length) return { ok: true };
    params.push(id);
    await this.ds.query(`UPDATE secretaria.schedule_slots SET ${sets.join(', ')} WHERE id=$${params.length}`, params);
    // Sincroniza el aula del GRUPO con el aula del bloque movido (lo refleja la sección Grupos).
    if (b.room !== undefined) {
      await this.ds.query(
        `UPDATE secretaria.groups g SET room=$1 FROM secretaria.schedule_slots ss WHERE ss.id=$2 AND g.id=ss.group_id`,
        [b.room || null, id]);
    }
    return { ok: true };
  }

  @Delete(':id') @Roles('secretaria_admin','secretaria_staff')
  async remove(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.schedule_slots WHERE id=$1`, [id]);
    return { ok: true };
  }

  // Gestión de AULAS (columnas del horario)
  @Get('rooms') rooms() { return this.ds.query(`SELECT name FROM secretaria.rooms ORDER BY sort, name`); }
  @Post('rooms') @Roles('secretaria_admin','secretaria_staff')
  async addRoom(@Body() b: { name: string }) {
    if (!b.name?.trim()) return { ok: false, error: 'Nombre vacío' };
    await this.ds.query(`INSERT INTO secretaria.rooms(name, sort) VALUES ($1, COALESCE((SELECT max(sort)+1 FROM secretaria.rooms),0)) ON CONFLICT (name) DO NOTHING`, [b.name.trim()]);
    return { ok: true };
  }
  @Delete('rooms/:name') @Roles('secretaria_admin','secretaria_staff')
  async deleteRoom(@Param('name') name: string) {
    // Quita el aula de la lista; los bloques que la usaban quedan sin aula (room=NULL)
    await this.ds.query(`UPDATE secretaria.schedule_slots SET room=NULL WHERE room=$1`, [name]);
    await this.ds.query(`DELETE FROM secretaria.rooms WHERE name=$1`, [name]);
    return { ok: true };
  }
}
