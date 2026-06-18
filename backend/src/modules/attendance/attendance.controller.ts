import { Controller, Get, Post, Delete, Body, Query, UseGuards, Req } from '@nestjs/common';
import { IsString, IsArray, IsUUID, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { assertTeacherOwnsGroup, assertTeacherOwnsEnrollments, isOnlyTeacher, teacherIdOf } from '../../common/teacher-scope';

const STATUS = ['presente', 'ausente', 'justificada', 'retraso'];

class RecordDto {
  @IsUUID() enrollmentId: string;
  @IsIn(STATUS) status: string;
  @IsOptional() @IsString() notes?: string;
}
class SaveDto {
  @IsString() date: string; // YYYY-MM-DD
  @IsArray() @ValidateNested({ each: true }) @Type(() => RecordDto) records: RecordDto[];
}

@Controller('secretaria/attendance')
@UseGuards(SecretariaAuthGuard)
export class AttendanceController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // Hoja de asistencia de un grupo en una fecha: alumnos matriculados + su estado (si ya registrado)
  @Get()
  async sheet(@Req() req: any, @Query('groupId') groupId: string, @Query('date') date: string, @Query('academicYearId') yearId?: string) {
    await assertTeacherOwnsGroup(this.ds, req.user, groupId);
    const yid = yearId || (await this.activeYearId());
    return this.ds.query(`
      SELECT e.id AS "enrollmentId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             a.status, a.notes
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      LEFT JOIN secretaria.attendance a ON a.enrollment_id=e.id AND a.date=$2
      WHERE e.group_id=$1 AND e.academic_year_id=$3 AND e.status='matriculado'
      ORDER BY "studentName"`, [groupId, date, yid]);
  }

  // Rejilla histórica: alumnos × días registrados (recientes a la derecha) + el día seleccionado.
  @Get('grid')
  async grid(@Req() req: any, @Query('groupId') groupId: string, @Query('date') date: string, @Query('academicYearId') yearId?: string) {
    await assertTeacherOwnsGroup(this.ds, req.user, groupId);
    const yid = yearId || (await this.activeYearId());
    const students = await this.ds.query(`
      SELECT e.id AS "enrollmentId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.group_id=$1 AND e.academic_year_id=$2 AND e.status='matriculado'
      ORDER BY "studentName"`, [groupId, yid]);
    const dRows = await this.ds.query(`
      SELECT to_char(a.date,'YYYY-MM-DD') AS d
      FROM secretaria.attendance a JOIN secretaria.enrollments e ON e.id=a.enrollment_id
      WHERE e.group_id=$1 GROUP BY a.date ORDER BY a.date DESC LIMIT 30`, [groupId]);
    let dates: string[] = dRows.map((r: any) => r.d);
    if (date && !dates.includes(date)) dates.push(date);
    dates.sort();
    const recs = await this.ds.query(`
      SELECT a.enrollment_id AS "enrollmentId", to_char(a.date,'YYYY-MM-DD') AS d, a.status::text AS status
      FROM secretaria.attendance a JOIN secretaria.enrollments e ON e.id=a.enrollment_id
      WHERE e.group_id=$1 AND to_char(a.date,'YYYY-MM-DD') = ANY($2)`, [groupId, dates]);
    const map: any = {};
    for (const r of recs) { map[r.enrollmentId] = map[r.enrollmentId] || {}; map[r.enrollmentId][r.d] = r.status; }
    return { students, dates, records: map };
  }

  // Guardar la hoja de asistencia (upsert por matrícula+fecha)
  @Post('save') @Roles('secretaria_admin','secretaria_staff','secretaria_teacher')
  async save(@Req() req: any, @Body() b: SaveDto) {
    await assertTeacherOwnsEnrollments(this.ds, req.user, b.records.map(r => r.enrollmentId));
    for (const r of b.records) {
      await this.ds.query(`
        INSERT INTO secretaria.attendance(enrollment_id, date, status, notes, updated_at)
        VALUES ($1,$2,$3,$4, now())
        ON CONFLICT (enrollment_id, date)
        DO UPDATE SET status=$3, notes=$4, updated_at=now()`,
        [r.enrollmentId, b.date, r.status, r.notes || null]);
    }
    return { ok: true, saved: b.records.length };
  }

  // Borrar la asistencia de un grupo en una fecha (p. ej. pasada por error).
  @Delete('day') @Roles('secretaria_admin','secretaria_staff','secretaria_teacher')
  async deleteDay(@Req() req: any, @Query('groupId') groupId: string, @Query('date') date: string) {
    await assertTeacherOwnsGroup(this.ds, req.user, groupId);
    const r = await this.ds.query(
      `DELETE FROM secretaria.attendance a USING secretaria.enrollments e
       WHERE a.enrollment_id=e.id AND e.group_id=$1 AND a.date=$2`, [groupId, date]);
    return { ok: true, deleted: Array.isArray(r) ? (r[1] ?? 0) : 0 };
  }

  // Aviso de faltas: alumnos cuyas ÚLTIMAS sesiones son faltas (ausente) consecutivas ≥ umbral.
  // Una sesión = (matrícula, fecha) con registro de asistencia. 'justificada'/'retraso'/'presente'
  // rompen la racha. Profesor: sólo sus grupos. Admin/staff/dirección: todo el centro.
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
      WITH att AS (
        SELECT a.enrollment_id, a.date, a.status
        FROM secretaria.attendance a
        JOIN secretaria.enrollments e ON e.id=a.enrollment_id
        WHERE e.academic_year_id=$1
      ),
      brk AS (
        SELECT enrollment_id, max(date) AS break_date
        FROM att WHERE status <> 'ausente' GROUP BY enrollment_id
      ),
      streak AS (
        SELECT a.enrollment_id, count(*)::int AS cons, max(a.date) AS last_date, min(a.date) AS first_date
        FROM att a LEFT JOIN brk b ON b.enrollment_id=a.enrollment_id
        WHERE a.status='ausente' AND (b.break_date IS NULL OR a.date > b.break_date)
        GROUP BY a.enrollment_id
      )
      SELECT e.id AS "enrollmentId", st.id AS "studentId",
             s.cons AS "consecutiveAbsences", s.first_date AS "firstAbsence", s.last_date AS "lastAbsence",
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

  // Resumen por grupo en un rango: % asistencia por alumno
  @Get('summary')
  async summary(@Req() req: any, @Query('groupId') groupId: string, @Query('from') from: string, @Query('to') to: string) {
    await assertTeacherOwnsGroup(this.ds, req.user, groupId);
    return this.ds.query(`
      SELECT COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             count(a.id) FILTER (WHERE a.status='presente') AS "presente",
             count(a.id) FILTER (WHERE a.status='ausente') AS "ausente",
             count(a.id) FILTER (WHERE a.status='justificada') AS "justificada",
             count(a.id) FILTER (WHERE a.status='retraso') AS "retraso",
             count(a.id) AS "total"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      LEFT JOIN secretaria.attendance a ON a.enrollment_id=e.id AND a.date BETWEEN $2 AND $3
      WHERE e.group_id=$1 AND e.status='matriculado'
      GROUP BY st.id, "studentName" ORDER BY "studentName"`, [groupId, from, to]);
  }

  // Estadísticas de asistencia con nivel: alumno (si groupId), grupo (si serviceId) o servicio (global).
  // Profesor: limitado a sus grupos. Filtros de fechas (mes/trimestre/curso desde el frontend).
  @Get('stats')
  async stats(@Req() req: any, @Query('from') from: string, @Query('to') to: string,
    @Query('groupId') groupId?: string, @Query('serviceId') serviceId?: string) {
    const onlyTeacher = isOnlyTeacher(req.user);
    if (groupId) await assertTeacherOwnsGroup(this.ds, req.user, groupId);
    const params: any[] = [from, to];
    let where = 'a.date BETWEEN $1 AND $2';
    if (onlyTeacher) {
      const tid = (await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000';
      params.push(tid); where += ` AND g.teacher_id = $${params.length}`;
    }
    if (groupId) { params.push(groupId); where += ` AND e.group_id = $${params.length}`; }
    if (serviceId) { params.push(serviceId); where += ` AND e.service_id = $${params.length}`; }

    let level: string; let dim: string; let groupby: string;
    if (groupId) { level = 'student'; dim = `COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "name"`; groupby = 'st.id, st.first_name, st.last_name, va.first_name, va.last_name'; }
    else if (serviceId) { level = 'group'; dim = 'g.name AS "name"'; groupby = 'g.id, g.name'; }
    else { level = 'service'; dim = 'sv.name AS "name"'; groupby = 'sv.id, sv.name'; }

    const rows = await this.ds.query(`
      SELECT ${dim},
             count(a.id) FILTER (WHERE a.status='presente')::int AS presente,
             count(a.id) FILTER (WHERE a.status='ausente')::int AS ausente,
             count(a.id) FILTER (WHERE a.status='justificada')::int AS justificada,
             count(a.id) FILTER (WHERE a.status='retraso')::int AS retraso,
             count(a.id)::int AS total
      FROM secretaria.attendance a
      JOIN secretaria.enrollments e ON e.id=a.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      LEFT JOIN secretaria.groups g ON g.id=e.group_id
      JOIN secretaria.services sv ON sv.id=e.service_id
      WHERE ${where}
      GROUP BY ${groupby} ORDER BY 1`, params);

    const totals = rows.reduce((acc: any, r: any) => ({
      presente: acc.presente + r.presente, ausente: acc.ausente + r.ausente,
      justificada: acc.justificada + r.justificada, retraso: acc.retraso + r.retraso, total: acc.total + r.total,
    }), { presente: 0, ausente: 0, justificada: 0, retraso: 0, total: 0 });
    return { level, rows, totals, onlyTeacher };
  }
}
