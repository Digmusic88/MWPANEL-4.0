import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard } from '../../common/secretaria-auth.guard';
import { isOnlyTeacher, teacherIdOf, assertTeacherOwnsGroup } from '../../common/teacher-scope';

// Apartados oficiales reales de Cambridge por nivel (precargados y luego editables por grupo)
const SECTION_TEMPLATES: Record<string, string[]> = {
  STARTERS: ['Vocabulary', 'Listening', 'Reading & Writing', 'Speaking'],
  MOVERS:   ['Vocabulary', 'Listening', 'Reading & Writing', 'Speaking'],
  FLYERS:   ['Vocabulary', 'Listening', 'Reading & Writing', 'Speaking'],
  KEY:      ['Vocabulary', 'Reading & Writing', 'Listening', 'Speaking'],
  PET:      ['Vocabulary', 'Reading', 'Writing', 'Listening', 'Speaking'],
  FCE:      ['Vocabulary', 'Reading & Use of English', 'Writing', 'Listening', 'Speaking'],
  CAE:      ['Vocabulary', 'Reading & Use of English', 'Writing', 'Listening', 'Speaking'],
  DEFAULT:  ['Vocabulary', 'Grammar', 'Reading', 'Writing', 'Listening', 'Speaking'],
};
function inferLevel(name: string): string {
  const n = (name || '').toLowerCase();
  if (/cae|advanced|c1/.test(n)) return 'CAE';
  if (/fce|first|b2/.test(n)) return 'FCE';
  if (/pet|prelim|b1/.test(n)) return 'PET';
  if (/key|ket|a2/.test(n)) return 'KEY';
  if (/flyer/.test(n)) return 'FLYERS';
  if (/mover/.test(n)) return 'MOVERS';
  if (/starter|pre-?a1/.test(n)) return 'STARTERS';
  return 'DEFAULT';
}

// Filtro común de día lectivo (dentro de trimestre y no día sin clase) para una columna de fecha "d"
const CLASS_DAY_FILTER = `
  (NOT EXISTS (SELECT 1 FROM secretaria.academic_terms at2 WHERE at2.academic_year_id=g.academic_year_id)
   OR EXISTS (SELECT 1 FROM secretaria.academic_terms at2
              LEFT JOIN secretaria.group_term_dates gtd ON gtd.academic_term_id=at2.id AND gtd.group_id=g.id
              WHERE at2.academic_year_id=g.academic_year_id
                AND {D} BETWEEN COALESCE(gtd.start_date, at2.start_date) AND COALESCE(gtd.end_date, at2.end_date)))
  AND NOT EXISTS (SELECT 1 FROM secretaria.non_class_days nc WHERE nc.academic_year_id=g.academic_year_id AND {D} BETWEEN nc.date AND COALESCE(nc.end_date, nc.date))`;

class SectionDto {
  @IsUUID() groupId: string;
  @IsString() name: string;
}
class SectionPatchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
class EntryDto {
  @IsUUID() groupId: string;
  @IsUUID() sectionId: string;
  @IsDateString() date: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsBoolean() isDone?: boolean;
}

// Cuaderno docente: planificación de clases por apartados (partes del examen) y día, con vista por día o por clase.
@Controller('secretaria/notebook')
@UseGuards(SecretariaAuthGuard)
export class NotebookController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Devuelve los apartados de un grupo; si no tiene, los autocrea desde la plantilla del nivel.
  private async ensureSections(groupId: string) {
    let secs = await this.ds.query(
      `SELECT id, name, sort_order AS "sortOrder" FROM secretaria.notebook_sections WHERE group_id=$1 ORDER BY sort_order, name`, [groupId]);
    if (secs.length === 0) {
      const g = await this.ds.query(`SELECT name FROM secretaria.groups WHERE id=$1`, [groupId]);
      const tpl = SECTION_TEMPLATES[inferLevel(g[0]?.name || '')] || SECTION_TEMPLATES.DEFAULT;
      for (let i = 0; i < tpl.length; i++) {
        await this.ds.query(`INSERT INTO secretaria.notebook_sections(group_id, name, sort_order) VALUES ($1,$2,$3)`, [groupId, tpl[i], i]);
      }
      secs = await this.ds.query(
        `SELECT id, name, sort_order AS "sortOrder" FROM secretaria.notebook_sections WHERE group_id=$1 ORDER BY sort_order, name`, [groupId]);
    }
    return secs;
  }

  private async guardGroup(req: any, groupId: string) {
    if (isOnlyTeacher(req.user)) await assertTeacherOwnsGroup(this.ds, req.user, groupId);
  }

  // Fechas de TODAS las sesiones del grupo en su curso (respeta trimestres y días sin clase).
  private async sessionDates(groupId: string): Promise<string[]> {
    const rows = await this.ds.query(`
      SELECT to_char(d,'YYYY-MM-DD') AS date
      FROM secretaria.schedule_slots ss
      JOIN secretaria.groups g ON g.id=ss.group_id
      JOIN secretaria.academic_years ay ON ay.id=g.academic_year_id
      CROSS JOIN generate_series(ay.start_date, ay.end_date, '1 day') d
      WHERE ss.group_id=$1 AND extract(isodow from d)=ss.weekday
        AND ${CLASS_DAY_FILTER.replace(/\{D\}/g, 'd::date')}
      ORDER BY d, ss.start_time`, [groupId]);
    return rows.map((r: any) => r.date);
  }

  // Total de sesiones por grupo (para admin/docente): total, dadas y restantes desde hoy.
  // Se calcula al vuelo, así que cambia solo al añadir festivos o ajustar trimestres.
  @Get('sessions')
  async sessions(@Req() req: any, @Query('academicYearId') yearId?: string) {
    const teacherId = isOnlyTeacher(req.user)
      ? ((await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000')
      : null;
    const yid = yearId || (await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`).then(r => r[0]?.id));
    return this.ds.query(`
      SELECT g.id AS "groupId", g.name AS "groupName", g.color AS "color",
             COALESCE(s.total,0)::int AS "totalSessions",
             COALESCE(s.done,0)::int AS "doneSessions",
             COALESCE(s.remaining,0)::int AS "remainingSessions"
      FROM secretaria.groups g
      LEFT JOIN LATERAL (
        SELECT count(*) AS total,
               count(*) FILTER (WHERE d::date < current_date) AS done,
               count(*) FILTER (WHERE d::date >= current_date) AS remaining
        FROM secretaria.academic_years ay
        JOIN secretaria.schedule_slots ss ON ss.group_id=g.id
        CROSS JOIN generate_series(ay.start_date, ay.end_date, '1 day') d
        WHERE ay.id=g.academic_year_id AND extract(isodow from d)=ss.weekday
          AND ${CLASS_DAY_FILTER.replace(/\{D\}/g, 'd::date')}
      ) s ON true
      WHERE g.academic_year_id=$1 AND ($2::uuid IS NULL OR g.teacher_id=$2)
      ORDER BY g.name`, [yid, teacherId]);
  }

  // ---- Apartados (editables) ----
  @Get('sections')
  async sections(@Req() req: any, @Query('groupId') groupId: string) {
    await this.guardGroup(req, groupId);
    return this.ensureSections(groupId);
  }

  @Post('sections')
  async addSection(@Req() req: any, @Body() b: SectionDto) {
    await this.guardGroup(req, b.groupId);
    const ord = (await this.ds.query(`SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM secretaria.notebook_sections WHERE group_id=$1`, [b.groupId]))[0].n;
    const r = await this.ds.query(`INSERT INTO secretaria.notebook_sections(group_id, name, sort_order) VALUES ($1,$2,$3) RETURNING id`, [b.groupId, b.name, ord]);
    return { ok: true, id: r[0].id };
  }

  @Patch('sections/:id')
  async patchSection(@Req() req: any, @Param('id') id: string, @Body() b: SectionPatchDto) {
    const gid = (await this.ds.query(`SELECT group_id FROM secretaria.notebook_sections WHERE id=$1`, [id]))[0]?.group_id;
    if (gid) await this.guardGroup(req, gid);
    await this.ds.query(`UPDATE secretaria.notebook_sections SET name=COALESCE($2,name), sort_order=COALESCE($3,sort_order) WHERE id=$1`, [id, b.name ?? null, b.sortOrder ?? null]);
    return { ok: true };
  }

  @Delete('sections/:id')
  async delSection(@Req() req: any, @Param('id') id: string) {
    const gid = (await this.ds.query(`SELECT group_id FROM secretaria.notebook_sections WHERE id=$1`, [id]))[0]?.group_id;
    if (gid) await this.guardGroup(req, gid);
    await this.ds.query(`DELETE FROM secretaria.notebook_sections WHERE id=$1`, [id]);
    return { ok: true };
  }

  // ---- Contenido (upsert por apartado+día) ----
  @Post('entry')
  async saveEntry(@Req() req: any, @Body() b: EntryDto) {
    await this.guardGroup(req, b.groupId);
    await this.ds.query(`
      INSERT INTO secretaria.notebook_entries(group_id, section_id, date, content, is_done, updated_at)
      VALUES ($1,$2,$3,$4,$5, now())
      ON CONFLICT (section_id, date)
      DO UPDATE SET content=$4, is_done=$5, updated_at=now()`,
      [b.groupId, b.sectionId, b.date, b.content ?? null, b.isDone ?? false]);
    return { ok: true };
  }

  // ---- Búsqueda de texto: encuentra entradas por su contenido (full-text español) ----
  // Inteligente por palabras: "writing página 34" encuentra entradas con esas palabras (y variantes).
  @Get('search')
  async search(@Req() req: any, @Query('q') q?: string, @Query('limit') limit?: string) {
    const query = (q || '').trim();
    if (!query) return [];
    const lim = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 100);
    const teacherId = isOnlyTeacher(req.user)
      ? ((await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000')
      : null;
    return this.ds.query(`
      SELECT to_char(e.date,'YYYY-MM-DD') AS date, e.is_done AS "isDone",
             g.id AS "groupId", g.name AS "groupName", g.color AS "color",
             s.name AS "sectionName", e.content,
             ts_headline('spanish', e.content, websearch_to_tsquery('spanish', $1),
               'StartSel=[[HL]],StopSel=[[/HL]],MaxFragments=2,MaxWords=18,MinWords=5') AS snippet
      FROM secretaria.notebook_entries e
      JOIN secretaria.notebook_sections s ON s.id = e.section_id
      JOIN secretaria.groups g ON g.id = e.group_id
      WHERE to_tsvector('spanish', COALESCE(e.content,'')) @@ websearch_to_tsquery('spanish', $1)
        AND ($2::uuid IS NULL OR g.teacher_id=$2)
      ORDER BY e.date DESC
      LIMIT $3`, [query, teacherId, lim]);
  }

  // ---- Vista POR DÍA: todas las clases del docente ese día ----
  @Get('day')
  async day(@Req() req: any, @Query('date') date: string) {
    const teacherId = isOnlyTeacher(req.user)
      ? ((await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000')
      : null;
    const groups = await this.ds.query(`
      SELECT DISTINCT g.id, g.name, g.color AS "color",
             to_char(ss.start_time,'HH24:MI') AS "startTime", to_char(ss.end_time,'HH24:MI') AS "endTime",
             COALESCE(ss.room, g.room) AS room
      FROM secretaria.schedule_slots ss
      JOIN secretaria.groups g ON g.id=ss.group_id
      WHERE extract(isodow from $1::date)=ss.weekday
        AND ($2::uuid IS NULL OR g.teacher_id=$2)
        AND ${CLASS_DAY_FILTER.replace(/\{D\}/g, '$1::date')}
      ORDER BY "startTime", g.name`, [date, teacherId]);
    const out: any[] = [];
    for (const g of groups) {
      const sections = await this.ensureSections(g.id);
      const entries = await this.ds.query(`SELECT section_id AS "sectionId", content, is_done AS "isDone" FROM secretaria.notebook_entries WHERE group_id=$1 AND date=$2`, [g.id, date]);
      const emap: any = {};
      entries.forEach((e: any) => { emap[e.sectionId] = { content: e.content, isDone: e.isDone }; });
      out.push({ ...g, sections, entries: emap });
    }
    return out;
  }

  // ---- Vista CALENDARIO (semana o día): instancias de clase del docente con sus apartados y contenido ----
  @Get('week')
  async week(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    const teacherId = isOnlyTeacher(req.user)
      ? ((await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000')
      : null;
    const rows = await this.ds.query(`
      SELECT to_char(d,'YYYY-MM-DD') AS date, extract(isodow from d)::int AS weekday,
             g.id AS "groupId", g.name AS "groupName", g.color AS "color",
             to_char(ss.start_time,'HH24:MI') AS "startTime", to_char(ss.end_time,'HH24:MI') AS "endTime",
             COALESCE(ss.room, g.room) AS room
      FROM secretaria.schedule_slots ss
      JOIN secretaria.groups g ON g.id=ss.group_id
      CROSS JOIN generate_series($1::date, $2::date, '1 day') d
      WHERE extract(isodow from d)=ss.weekday
        AND ($3::uuid IS NULL OR g.teacher_id=$3)
        AND ${CLASS_DAY_FILTER.replace(/\{D\}/g, 'd::date')}
      ORDER BY d, ss.start_time, g.name`, [from, to, teacherId]);
    // Cache de apartados y de fechas de sesión por grupo para no repetir consultas
    const secCache: Record<string, any[]> = {};
    const sdCache: Record<string, string[]> = {};
    for (const r of rows) {
      if (!secCache[r.groupId]) secCache[r.groupId] = await this.ensureSections(r.groupId);
      if (!sdCache[r.groupId]) sdCache[r.groupId] = await this.sessionDates(r.groupId);
      r.sections = secCache[r.groupId];
      const sd = sdCache[r.groupId];
      r.sessionsTotal = sd.length;
      r.sessionIndex = sd.filter(d => d <= r.date).length; // nº de sesión dentro del curso
      const ents = await this.ds.query(`SELECT section_id AS "sectionId", content, is_done AS "isDone" FROM secretaria.notebook_entries WHERE group_id=$1 AND date=$2`, [r.groupId, r.date]);
      const emap: any = {};
      ents.forEach((e: any) => { emap[e.sectionId] = { content: e.content, isDone: e.isDone }; });
      r.entries = emap;
    }
    return rows;
  }

  // ---- Vista POR CLASE: un grupo a lo largo de sus días lectivos ----
  @Get('class')
  async classView(@Req() req: any, @Query('groupId') groupId: string, @Query('from') from: string, @Query('to') to: string) {
    await this.guardGroup(req, groupId);
    const group = (await this.ds.query(`SELECT id, name, color AS "color" FROM secretaria.groups WHERE id=$1`, [groupId]))[0];
    const sections = await this.ensureSections(groupId);
    const days = await this.ds.query(`
      SELECT to_char(d,'YYYY-MM-DD') AS date, to_char(ss.start_time,'HH24:MI') AS "startTime", to_char(ss.end_time,'HH24:MI') AS "endTime"
      FROM secretaria.schedule_slots ss
      JOIN secretaria.groups g ON g.id=ss.group_id
      CROSS JOIN generate_series($2::date, $3::date, '1 day') d
      WHERE ss.group_id=$1 AND extract(isodow from d)=ss.weekday
        AND ${CLASS_DAY_FILTER.replace(/\{D\}/g, 'd::date')}
      ORDER BY d, ss.start_time`, [groupId, from, to]);
    const entries = await this.ds.query(`
      SELECT to_char(date,'YYYY-MM-DD') AS date, section_id AS "sectionId", content, is_done AS "isDone"
      FROM secretaria.notebook_entries WHERE group_id=$1 AND date BETWEEN $2 AND $3`, [groupId, from, to]);
    const emap: any = {};
    entries.forEach((e: any) => { emap[`${e.date}|${e.sectionId}`] = { content: e.content, isDone: e.isDone }; });
    return { group, sections, days, entries: emap };
  }
}
