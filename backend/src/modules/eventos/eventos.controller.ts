import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { IsString, IsOptional, IsDateString, IsIn, IsUUID } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { isOnlyTeacher, teacherIdOf } from '../../common/teacher-scope';

const EVENT_TYPES = ['clase', 'convocatoria', 'examen_oficial', 'reunion', 'otro'];

class EventDto {
  @IsString() title: string;
  @IsDateString() eventDate: string;
  @IsOptional() @IsIn(EVENT_TYPES) eventType?: string;
  @IsOptional() @IsString() eventTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsUUID() groupId?: string;
  @IsOptional() @IsString() description?: string;
}

@Controller('secretaria/eventos')
@UseGuards(SecretariaAuthGuard)
export class EventosController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Lista de eventos manuales. ?scope=upcoming → recientes + futuros; si no, todos.
  @Get()
  list(@Query('scope') scope?: string) {
    const where = scope === 'upcoming' ? `WHERE e.event_date >= current_date - 7` : '';
    return this.ds.query(`
      SELECT e.id, e.title, e.description, e.event_type AS "eventType",
             e.event_date AS "eventDate", e.event_time AS "eventTime", e.end_time AS "endTime",
             e.location, e.group_id AS "groupId", g.name AS "groupName", g.color AS "color"
      FROM secretaria.events e
      LEFT JOIN secretaria.groups g ON g.id=e.group_id
      ${where} ORDER BY e.event_date ASC, e.event_time ASC NULLS LAST`);
  }

  // Agenda agregada para el calendario / panel del docente: eventos manuales + clases (del horario) +
  // convocatorias de simulacro, en un rango de fechas. RGPD: el profesor solo ve lo suyo.
  @Get('agenda')
  async agenda(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    const f = from || new Date().toISOString().slice(0, 10);
    const t = to || new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);
    const teacherId = isOnlyTeacher(req.user)
      ? ((await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000')
      : null;

    // 1) Eventos manuales (el profesor ve los generales y los de SUS grupos)
    const events = await this.ds.query(`
      SELECT e.id, e.event_type AS "type", e.title, to_char(e.event_date,'YYYY-MM-DD') AS date,
             e.event_time AS time, e.end_time AS "endTime", e.location, e.description,
             e.group_id AS "groupId", g.name AS "groupName", g.color AS "color"
      FROM secretaria.events e
      LEFT JOIN secretaria.groups g ON g.id=e.group_id
      WHERE e.event_date BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR e.group_id IS NULL OR g.teacher_id=$3)`, [f, t, teacherId]);

    // 2) Clases (franjas del horario) expandidas por día según el día de la semana.
    //    Sólo dentro de los trimestres del curso (si hay alguno definido) y excluyendo los días sin clase.
    const classes = await this.ds.query(`
      SELECT ('clase-'||ss.id||'-'||to_char(d,'YYYYMMDD')) AS id, 'clase' AS "type", g.name AS title,
             to_char(d,'YYYY-MM-DD') AS date, to_char(ss.start_time,'HH24:MI') AS time,
             to_char(ss.end_time,'HH24:MI') AS "endTime", COALESCE(ss.room, g.room) AS location,
             NULL AS description, g.id AS "groupId", g.name AS "groupName", g.color AS "color"
      FROM secretaria.schedule_slots ss
      JOIN secretaria.groups g ON g.id=ss.group_id
      CROSS JOIN generate_series($1::date, $2::date, '1 day') d
      WHERE extract(isodow from d) = ss.weekday
        AND ($3::uuid IS NULL OR g.teacher_id=$3)
        AND (NOT EXISTS (SELECT 1 FROM secretaria.academic_terms at2 WHERE at2.academic_year_id=g.academic_year_id)
             OR EXISTS (SELECT 1 FROM secretaria.academic_terms at2 WHERE at2.academic_year_id=g.academic_year_id AND d::date BETWEEN at2.start_date AND at2.end_date))
        AND NOT EXISTS (SELECT 1 FROM secretaria.non_class_days nc WHERE nc.academic_year_id=g.academic_year_id AND d::date BETWEEN nc.date AND COALESCE(nc.end_date, nc.date))`,
      [f, t, teacherId]);

    // 3) Convocatorias de simulacro (todos los docentes las ven)
    const exams = await this.ds.query(`
      SELECT es.id, 'convocatoria' AS "type", (es.name||' ('||es.level||')') AS title,
             to_char(es.exam_date,'YYYY-MM-DD') AS date, NULL AS time, NULL AS "endTime",
             NULL AS location, es.notes AS description, NULL AS "groupId", NULL AS "groupName", NULL AS "color"
      FROM secretaria.exam_sessions es
      WHERE es.exam_date BETWEEN $1 AND $2`, [f, t]);

    // 4) Pruebas de nivel (el profesor ve aquellas en las que es evaluador; el admin, todas)
    const levelTests = await this.ds.query(`
      SELECT lt.id, 'prueba_nivel' AS "type",
             ('Prueba de nivel — '||COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), lt.candidate_name, 'Candidato')) AS title,
             to_char(lt.test_date,'YYYY-MM-DD') AS date, lt.test_time AS time, NULL AS "endTime",
             NULL AS location, lt.notes AS description, NULL AS "groupId", NULL AS "groupName", NULL AS "color"
      FROM secretaria.level_tests lt
      LEFT JOIN secretaria.students st ON st.id=lt.student_id
      WHERE lt.test_date BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR lt.evaluator_teacher_id=$3)`, [f, t, teacherId]);

    // 5) Días sin clase del curso activo (festivos/puentes/descansos/vacaciones), expandidos por día
    const nonClass = await this.ds.query(`
      SELECT (nc.id::text||'-'||to_char(d,'YYYYMMDD')) AS id, 'festivo' AS "type",
             (nc.label||CASE WHEN nc.kind<>'festivo' THEN ' ('||nc.kind||')' ELSE '' END) AS title,
             to_char(d,'YYYY-MM-DD') AS date, NULL AS time, NULL AS "endTime",
             NULL AS location, NULL AS description, NULL AS "groupId", NULL AS "groupName", NULL AS "color"
      FROM secretaria.non_class_days nc
      CROSS JOIN generate_series(GREATEST(nc.date, $1::date), LEAST(COALESCE(nc.end_date, nc.date), $2::date), '1 day') d
      WHERE nc.academic_year_id IN (SELECT id FROM secretaria.academic_years WHERE is_active=true)`, [f, t]);

    return [...events, ...classes, ...exams, ...levelTests, ...nonClass];
  }

  @Post() @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async create(@Body() b: EventDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.events(title, event_date, event_type, event_time, end_time, location, group_id, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [b.title, b.eventDate, b.eventType || 'otro', b.eventTime || null, b.endTime || null, b.location || null, b.groupId || null, b.description || null]);
    return { ok: true, id: r[0].id };
  }

  @Patch(':id') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async update(@Param('id') id: string, @Body() b: EventDto) {
    await this.ds.query(
      `UPDATE secretaria.events SET title=COALESCE($2,title), event_date=COALESCE($3,event_date),
         event_type=COALESCE($4,event_type), event_time=$5, end_time=$6, location=$7, group_id=$8, description=$9
       WHERE id=$1`,
      [id, b.title, b.eventDate, b.eventType || null, b.eventTime || null, b.endTime || null, b.location || null, b.groupId || null, b.description || null]);
    return { ok: true };
  }

  @Delete(':id') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async remove(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.events WHERE id=$1`, [id]);
    return { ok: true };
  }
}
