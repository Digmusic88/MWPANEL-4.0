import { Controller, Get, Post, Delete, Body, Query, Req, UseGuards } from '@nestjs/common';
import { IsString, IsArray, IsUUID, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { assertTeacherOwnsGroup, isOnlyTeacher, teacherIdOf } from '../../common/teacher-scope';

const LEVELS = ['verde', 'naranja', 'roja'];

class RecordDto {
  @IsUUID() enrollmentId: string;
  @IsIn(LEVELS) level: string;
  @IsOptional() @IsString() notes?: string;
}
class SaveDto {
  @IsString() date: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RecordDto) records: RecordDto[];
}

@Controller('secretaria/tareas')
@UseGuards(SecretariaAuthGuard)
export class TareasController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // Hoja de tareas de un grupo en una fecha (alumnos matriculados + su carita; verde por defecto)
  @Get()
  async sheet(@Query('groupId') groupId: string, @Query('date') date: string, @Query('academicYearId') yearId?: string) {
    const yid = yearId || (await this.activeYearId());
    return this.ds.query(`
      SELECT e.id AS "enrollmentId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             COALESCE(tr.level::text, 'verde') AS level, tr.notes
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      LEFT JOIN secretaria.task_records tr ON tr.enrollment_id=e.id AND tr.date=$2
      WHERE e.group_id=$1 AND e.academic_year_id=$3 AND e.status='matriculado'
      ORDER BY "studentName"`, [groupId, date, yid]);
  }

  // Rejilla histórica: alumnos × días registrados (recientes a la derecha) + el día seleccionado.
  @Get('grid')
  async grid(@Query('groupId') groupId: string, @Query('date') date: string, @Query('academicYearId') yearId?: string) {
    const yid = yearId || (await this.activeYearId());
    const students = await this.ds.query(`
      SELECT e.id AS "enrollmentId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.group_id=$1 AND e.academic_year_id=$2 AND e.status='matriculado'
      ORDER BY "studentName"`, [groupId, yid]);
    // Últimas 30 fechas con registros del grupo
    const dRows = await this.ds.query(`
      SELECT to_char(tr.date,'YYYY-MM-DD') AS d
      FROM secretaria.task_records tr JOIN secretaria.enrollments e ON e.id=tr.enrollment_id
      WHERE e.group_id=$1 GROUP BY tr.date ORDER BY tr.date DESC LIMIT 30`, [groupId]);
    let dates: string[] = dRows.map((r: any) => r.d);
    if (date && !dates.includes(date)) dates.push(date);
    dates.sort(); // ascendente → la más reciente a la derecha
    const recs = await this.ds.query(`
      SELECT tr.enrollment_id AS "enrollmentId", to_char(tr.date,'YYYY-MM-DD') AS d, tr.level::text AS level
      FROM secretaria.task_records tr JOIN secretaria.enrollments e ON e.id=tr.enrollment_id
      WHERE e.group_id=$1 AND to_char(tr.date,'YYYY-MM-DD') = ANY($2)`, [groupId, dates]);
    const map: any = {};
    for (const r of recs) { map[r.enrollmentId] = map[r.enrollmentId] || {}; map[r.enrollmentId][r.d] = r.level; }
    return { students, dates, records: map };
  }

  // Guardar la hoja (upsert por matrícula+fecha)
  @Post('save') @Roles('secretaria_admin','secretaria_staff','secretaria_teacher')
  async save(@Body() b: SaveDto) {
    for (const r of b.records) {
      await this.ds.query(`
        INSERT INTO secretaria.task_records(enrollment_id, date, level, notes, updated_at)
        VALUES ($1,$2,$3::secretaria.task_level,$4, now())
        ON CONFLICT (enrollment_id, date)
        DO UPDATE SET level=$3::secretaria.task_level, notes=$4, updated_at=now()`,
        [r.enrollmentId, b.date, r.level, r.notes || null]);
    }
    return { ok: true, saved: b.records.length };
  }

  // Borrar el registro de tareas de un grupo en una fecha (p. ej. registrado por error).
  @Delete('day') @Roles('secretaria_admin','secretaria_staff','secretaria_teacher')
  async deleteDay(@Req() req: any, @Query('groupId') groupId: string, @Query('date') date: string) {
    await assertTeacherOwnsGroup(this.ds, req.user, groupId);
    const r = await this.ds.query(
      `DELETE FROM secretaria.task_records tr USING secretaria.enrollments e
       WHERE tr.enrollment_id=e.id AND e.group_id=$1 AND tr.date=$2`, [groupId, date]);
    return { ok: true, deleted: Array.isArray(r) ? (r[1] ?? 0) : 0 };
  }

  // Aviso de tareas: alumnos con 3+ "rojas" (no hizo la tarea) en sesiones consecutivas.
  // verde/naranja rompen la racha. Profesor: sus grupos. Admin/staff/dirección: todo.
  @Get('alerts')
  async alerts(@Req() req: any, @Query('threshold') threshold?: string) {
    const yid = await this.activeYearId();
    const min = Math.max(2, parseInt(threshold || '3', 10) || 3);
    const onlyTeacher = isOnlyTeacher(req.user);
    const params: any[] = [yid, min];
    let teacherWhere = '';
    if (onlyTeacher) {
      const tid = (await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000';
      params.push(tid); teacherWhere = ` AND g.teacher_id = $${params.length}`;
    }
    return this.ds.query(`
      WITH tr AS (
        SELECT t.enrollment_id, t.date, t.level::text AS level
        FROM secretaria.task_records t JOIN secretaria.enrollments e ON e.id=t.enrollment_id
        WHERE e.academic_year_id=$1
      ),
      brk AS (
        SELECT enrollment_id, max(date) AS break_date FROM tr WHERE level <> 'roja' GROUP BY enrollment_id
      ),
      streak AS (
        SELECT a.enrollment_id, count(*)::int AS cons, max(a.date) AS last_date, min(a.date) AS first_date
        FROM tr a LEFT JOIN brk b ON b.enrollment_id=a.enrollment_id
        WHERE a.level='roja' AND (b.break_date IS NULL OR a.date > b.break_date)
        GROUP BY a.enrollment_id
      )
      SELECT e.id AS "enrollmentId", st.id AS "studentId",
             s.cons AS "consecutiveMissed", s.first_date AS "firstMissed", s.last_date AS "lastMissed",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             sv.name AS "serviceName", g.name AS "groupName", t.full_name AS "teacherName"
      FROM streak s
      JOIN secretaria.enrollments e ON e.id=s.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      JOIN secretaria.services sv ON sv.id=e.service_id
      LEFT JOIN secretaria.groups g ON g.id=e.group_id
      LEFT JOIN secretaria.teachers t ON t.id=g.teacher_id
      WHERE s.cons >= $2 ${teacherWhere}
      ORDER BY s.cons DESC, "studentName"`, params);
  }

  // Estadísticas por alumno en un rango (conteo de cada carita)
  @Get('summary')
  async summary(@Query('groupId') groupId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.ds.query(`
      SELECT COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             count(tr.id) FILTER (WHERE tr.level='verde') AS "verde",
             count(tr.id) FILTER (WHERE tr.level='naranja') AS "naranja",
             count(tr.id) FILTER (WHERE tr.level='roja') AS "roja",
             count(tr.id) AS "total"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      LEFT JOIN secretaria.task_records tr ON tr.enrollment_id=e.id AND tr.date BETWEEN $2 AND $3
      WHERE e.group_id=$1 AND e.status='matriculado'
      GROUP BY st.id, "studentName" ORDER BY "studentName"`, [groupId, from, to]);
  }
}
