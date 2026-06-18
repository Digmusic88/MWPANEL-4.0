import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { IsString, IsUUID, IsIn, IsOptional } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { isOnlyTeacher } from '../../common/teacher-scope';

const LEVELS = ['KEY', 'PET', 'FCE', 'CAE'];
// Patrones de nombre de grupo/programa por nivel (para autocargar candidatos)
const LEVEL_PATTERNS: Record<string, string[]> = {
  KEY: ['%key%', '%ket%'],
  PET: ['%pet%', '%prelim%'],
  FCE: ['%fce%', '%first%'],
  CAE: ['%cae%', '%advanced%'],
};
const ATTEND = ['sin_confirmar', 'asiste', 'no_asiste'];

class SessionDto {
  @IsString() name: string;
  @IsIn(LEVELS) level: string;
  @IsOptional() @IsString() examDate?: string;
  @IsOptional() @IsString() notes?: string;
}
class AddCandidateDto { @IsUUID() studentId: string; }
class MarkDto { @IsIn(ATTEND) status: string; }

@Controller('secretaria/examenes')
@UseGuards(SecretariaAuthGuard)
export class ExamenesController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // Lista de convocatorias con conteos (inscritos / asisten / sin confirmar)
  @Get() @Roles('secretaria_admin', 'secretaria_staff', 'direccion', 'secretaria_teacher')
  list() {
    return this.ds.query(`
      SELECT s.id, s.name, s.level, s.exam_date AS "examDate", s.notes,
             (SELECT count(*) FROM secretaria.exam_candidates c WHERE c.session_id=s.id) AS "total",
             (SELECT count(*) FROM secretaria.exam_candidates c WHERE c.session_id=s.id AND c.status='asiste') AS "asisten",
             (SELECT count(*) FROM secretaria.exam_candidates c WHERE c.session_id=s.id AND c.status='sin_confirmar') AS "sinConfirmar"
      FROM secretaria.exam_sessions s ORDER BY s.exam_date DESC NULLS LAST, s.created_at DESC`);
  }

  // Crear convocatoria + autocargar candidatos de los grupos del nivel
  @Post() @Roles('secretaria_admin', 'secretaria_staff')
  async create(@Body() b: SessionDto) {
    const yid = await this.activeYearId();
    const s = await this.ds.query(
      `INSERT INTO secretaria.exam_sessions(name, level, exam_date, academic_year_id, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [b.name, b.level, b.examDate || null, yid, b.notes || null]);
    const id = s[0].id;
    const added = await this.loadCandidates(id, b.level, yid);
    return { ok: true, id, candidates: added };
  }

  // Re-sincroniza: añade los alumnos del nivel que aún no estén como candidatos
  @Post(':id/reload') @Roles('secretaria_admin', 'secretaria_staff')
  async reload(@Param('id') id: string) {
    const s = await this.ds.query(`SELECT level, academic_year_id FROM secretaria.exam_sessions WHERE id=$1`, [id]);
    if (!s[0]) throw new ForbiddenException('Convocatoria no encontrada');
    const added = await this.loadCandidates(id, s[0].level, s[0].academic_year_id);
    return { ok: true, added };
  }

  private async loadCandidates(sessionId: string, level: string, yearId: string): Promise<number> {
    const patterns = LEVEL_PATTERNS[level] || [];
    if (!patterns.length) return 0;
    const r = await this.ds.query(`
      INSERT INTO secretaria.exam_candidates(session_id, student_id, group_id)
      SELECT $1, e.student_id, e.group_id
      FROM secretaria.enrollments e
      JOIN secretaria.groups g ON g.id=e.group_id
      LEFT JOIN secretaria.programs pr ON pr.id=g.program_id
      WHERE e.academic_year_id=$2 AND e.status='matriculado'
        AND (g.name ILIKE ANY($3) OR pr.name ILIKE ANY($3))
      ON CONFLICT (session_id, student_id) DO NOTHING
      RETURNING id`, [sessionId, yearId, patterns]);
    return r.length;
  }

  @Delete(':id') @Roles('secretaria_admin')
  async remove(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.exam_sessions WHERE id=$1`, [id]);
    return { ok: true };
  }

  // Candidatos de una convocatoria (con nombre, grupo, estado)
  @Get(':id/candidates') @Roles('secretaria_admin', 'secretaria_staff', 'direccion', 'secretaria_teacher')
  candidates(@Param('id') id: string) {
    return this.ds.query(`
      SELECT c.id, c.student_id AS "studentId", c.group_id AS "groupId", c.status, c.added_manually AS "addedManually",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             g.name AS "groupName", g.color AS "groupColor"
      FROM secretaria.exam_candidates c
      JOIN secretaria.students st ON st.id=c.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      LEFT JOIN secretaria.groups g ON g.id=c.group_id
      WHERE c.session_id=$1 ORDER BY "groupName" NULLS LAST, "studentName"`, [id]);
  }

  // Añadir un alumno manualmente (excepcional)
  @Post(':id/candidates') @Roles('secretaria_admin', 'secretaria_staff')
  async addCandidate(@Param('id') id: string, @Body() b: AddCandidateDto) {
    const yid = await this.activeYearId();
    const g = await this.ds.query(`SELECT group_id FROM secretaria.enrollments WHERE student_id=$1 AND academic_year_id=$2 AND group_id IS NOT NULL LIMIT 1`, [b.studentId, yid]);
    await this.ds.query(
      `INSERT INTO secretaria.exam_candidates(session_id, student_id, group_id, added_manually) VALUES ($1,$2,$3,true)
       ON CONFLICT (session_id, student_id) DO NOTHING`, [id, b.studentId, g[0]?.group_id || null]);
    return { ok: true };
  }

  // Marcar asistencia de un candidato (profesor solo en sus grupos)
  @Patch('candidate/:cid') @Roles('secretaria_admin', 'secretaria_staff', 'secretaria_teacher')
  async mark(@Req() req: any, @Param('cid') cid: string, @Body() b: MarkDto) {
    if (isOnlyTeacher(req.user)) {
      const own = await this.ds.query(`
        SELECT 1 FROM secretaria.exam_candidates c JOIN secretaria.groups g ON g.id=c.group_id
        JOIN secretaria.teachers t ON t.id=g.teacher_id WHERE c.id=$1 AND t.user_id=$2`, [cid, req.user.id]);
      if (!own[0]) throw new ForbiddenException('Solo puedes marcar candidatos de tus grupos');
    }
    await this.ds.query(`UPDATE secretaria.exam_candidates SET status=$2::secretaria.exam_attend WHERE id=$1`, [cid, b.status]);
    return { ok: true };
  }

  @Delete('candidate/:cid') @Roles('secretaria_admin', 'secretaria_staff')
  async removeCandidate(@Param('cid') cid: string) {
    await this.ds.query(`DELETE FROM secretaria.exam_candidates WHERE id=$1`, [cid]);
    return { ok: true };
  }
}
