import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { isOnlyTeacher, teacherIdOf } from '../../common/teacher-scope';

class TeacherDto {
  @IsString() fullName: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('secretaria/teachers')
@UseGuards(SecretariaAuthGuard)
export class TeachersController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  @Get()
  list() {
    return this.ds.query(`
      SELECT t.id, t.full_name AS "fullName", t.email, t.phone, t.notes, t.is_active AS "isActive",
             t.mwpanel_teacher_id AS "mwpanelTeacherId",
             (SELECT count(*) FROM secretaria.groups g WHERE g.teacher_id=t.id) AS "groupCount"
      FROM secretaria.teachers t WHERE t.is_active ORDER BY t.full_name`);
  }

  // Docentes existentes en MW Panel (con marca de si ya están importados a Secretaría)
  @Get('mwpanel')
  mwpanel() {
    return this.ds.query(`
      SELECT v.mwpanel_teacher_id AS "mwpanelTeacherId", v.full_name AS "fullName", v.email, v.user_id AS "userId", v.specialties,
             EXISTS (SELECT 1 FROM secretaria.teachers t WHERE t.mwpanel_teacher_id=v.mwpanel_teacher_id) AS "imported"
      FROM secretaria.v_docentes_mwpanel v
      WHERE v.full_name IS NOT NULL ORDER BY v.full_name`);
  }

  // Importa un docente de MW Panel a Secretaría (para usarlo en grupos, panel, etc.)
  // grantAccess: además le concede acceso a Secretaría (rol profesor) si tiene cuenta.
  @Post('import-mwpanel') @Roles('secretaria_admin','secretaria_staff')
  async importMwpanel(@Body() b: { mwpanelTeacherId: string; grantAccess?: boolean }) {
    const v = await this.ds.query(`SELECT mwpanel_teacher_id, full_name, email, user_id FROM secretaria.v_docentes_mwpanel WHERE mwpanel_teacher_id=$1`, [b.mwpanelTeacherId]);
    if (!v[0]) return { ok: false, error: 'Docente no encontrado en MW Panel' };
    const exists = await this.ds.query(`SELECT id FROM secretaria.teachers WHERE mwpanel_teacher_id=$1`, [b.mwpanelTeacherId]);
    let teacherId = exists[0]?.id;
    if (!teacherId) {
      const r = await this.ds.query(
        `INSERT INTO secretaria.teachers(full_name, email, user_id, mwpanel_teacher_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        [v[0].full_name, v[0].email || null, v[0].user_id || null, b.mwpanelTeacherId]);
      teacherId = r[0].id;
    } else {
      // La ficha ya existía: garantizar el vínculo con el usuario de plataforma (necesario para el
      // control de acceso por rol del profesor). Rellena user_id/email si faltaban.
      await this.ds.query(
        `UPDATE secretaria.teachers SET user_id=COALESCE(user_id,$2), email=COALESCE(email,$3), is_active=true WHERE id=$1`,
        [teacherId, v[0].user_id || null, v[0].email || null]);
    }
    // Por defecto se concede acceso de profesor (el sentido de importar de MW Panel es que use el panel).
    // Solo posible si el docente tiene cuenta de plataforma (user_id).
    const grant = b.grantAccess !== false;
    if (grant && v[0].user_id) {
      await this.ds.query(`INSERT INTO secretaria.staff_roles(user_id, role) VALUES ($1,'secretaria_teacher'::secretaria.staff_role) ON CONFLICT DO NOTHING`, [v[0].user_id]);
    }
    return { ok: true, id: teacherId, linked: !!v[0].user_id, accessGranted: !!(grant && v[0].user_id) };
  }

  @Post() @Roles('secretaria_admin','secretaria_staff')
  async create(@Body() b: TeacherDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.teachers(full_name, email, phone, notes) VALUES ($1,$2,$3,$4) RETURNING id`,
      [b.fullName, b.email || null, b.phone || null, b.notes || null]);
    return { ok: true, id: r[0].id };
  }

  @Patch(':id') @Roles('secretaria_admin','secretaria_staff')
  async update(@Param('id') id: string, @Body() b: TeacherDto) {
    await this.ds.query(
      `UPDATE secretaria.teachers SET full_name=COALESCE($2,full_name), email=$3, phone=$4, notes=$5 WHERE id=$1`,
      [id, b.fullName, b.email || null, b.phone || null, b.notes || null]);
    return { ok: true };
  }

  @Delete(':id') @Roles('secretaria_admin')
  async remove(@Param('id') id: string) {
    await this.ds.query(`UPDATE secretaria.teachers SET is_active=false WHERE id=$1`, [id]);
    return { ok: true };
  }

  // Panel del profesor: sus grupos y los alumnos matriculados en cada uno (curso activo)
  @Get(':id/panel')
  async panel(@Req() req: any, @Param('id') id: string, @Query('academicYearId') yearId?: string) {
    // RGPD: un profesor solo puede ver SU propio panel
    if (isOnlyTeacher(req.user)) {
      const ownId = await teacherIdOf(this.ds, req.user.id);
      if (!ownId || ownId !== id) throw new ForbiddenException('No tienes acceso a este panel');
    }
    const yid = yearId || (await this.activeYearId());
    const groups = await this.ds.query(`
      SELECT g.id, g.name, pr.name AS "programName", sv.name AS "serviceName", g.room,
             (SELECT count(*) FROM secretaria.enrollments e WHERE e.group_id=g.id AND e.status='matriculado') AS "studentCount"
      FROM secretaria.groups g
      LEFT JOIN secretaria.programs pr ON pr.id=g.program_id
      LEFT JOIN secretaria.services sv ON sv.id=pr.service_id
      WHERE g.teacher_id=$1 AND g.academic_year_id=$2 ORDER BY g.name`, [id, yid]);
    const students = await this.ds.query(`
      SELECT e.id AS "enrollmentId", e.group_id AS "groupId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             st.id AS "studentId", st.birth_date AS "birthDate"
      FROM secretaria.enrollments e
      JOIN secretaria.groups g ON g.id=e.group_id
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE g.teacher_id=$1 AND e.academic_year_id=$2 AND e.status='matriculado'
      ORDER BY "studentName"`, [id, yid]);
    // Pruebas de nivel evaluadas por este profesor
    const levelTests = await this.ds.query(`
      SELECT lt.id, lt.test_date AS "testDate", lt.test_time AS "testTime", lt.result_level AS "resultLevel",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), lt.candidate_name) AS "studentName",
             pr.name AS "recommendedProgramName"
      FROM secretaria.level_tests lt
      LEFT JOIN secretaria.students st ON st.id=lt.student_id
      LEFT JOIN secretaria.programs pr ON pr.id=lt.recommended_program_id
      WHERE lt.evaluator_teacher_id=$1
      ORDER BY lt.test_date DESC NULLS LAST`, [id]);
    return { groups, students, levelTests };
  }
}
