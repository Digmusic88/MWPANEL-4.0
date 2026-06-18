import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { isOnlyTeacher, teacherIdOf } from '../../common/teacher-scope';

class TestDto {
  @IsOptional() @IsString() candidateName?: string;
  @IsOptional() @IsString() candidateContact?: string;
  @IsOptional() @IsUUID() studentId?: string;
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsDateString() testDate?: string;
  @IsOptional() @IsString() testTime?: string;  // 'HH:MM'
  @IsOptional() @IsString() evaluator?: string;
  @IsOptional() @IsUUID() evaluatorTeacherId?: string;  // profesor evaluador
  @IsOptional() @IsString() resultLevel?: string;
  @IsOptional() @IsUUID() recommendedProgramId?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('secretaria/level-tests')
@UseGuards(SecretariaAuthGuard)
export class LevelTestsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  @Get()
  async list(@Request() req: any, @Query('academicYearId') yearId?: string) {
    // RGPD: un profesor solo ve pruebas de alumnos de SUS grupos
    const teacherId = isOnlyTeacher(req.user)
      ? ((await teacherIdOf(this.ds, req.user.id)) || '00000000-0000-0000-0000-000000000000')
      : null;
    return this.ds.query(`
      SELECT lt.id, lt.candidate_name AS "candidateName", lt.candidate_contact AS "candidateContact",
             lt.student_id AS "studentId", lt.test_date AS "testDate",
             lt.test_time AS "testTime",
             lt.evaluator, lt.evaluator_teacher_id AS "evaluatorTeacherId",
             COALESCE(et.full_name, lt.evaluator) AS "evaluatorName",
             lt.result_level AS "resultLevel", lt.recommended_program_id AS "recommendedProgramId",
             lt.notes, pr.name AS "recommendedProgramName",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), lt.candidate_name) AS "displayName"
      FROM secretaria.level_tests lt
      LEFT JOIN secretaria.students st ON st.id=lt.student_id
      LEFT JOIN secretaria.teachers et ON et.id=lt.evaluator_teacher_id
      LEFT JOIN secretaria.programs pr ON pr.id=lt.recommended_program_id
      WHERE ($1::uuid IS NULL OR lt.academic_year_id=$1)
        AND ($2::uuid IS NULL OR lt.evaluator_teacher_id=$2 OR EXISTS (
          SELECT 1 FROM secretaria.enrollments e
          JOIN secretaria.groups g ON g.id=e.group_id
          WHERE e.student_id=lt.student_id AND g.teacher_id=$2
        ))
      ORDER BY lt.test_date DESC NULLS LAST`, [yearId || null, teacherId]);
  }

  @Post() @Roles('secretaria_admin','secretaria_staff')
  async create(@Body() b: TestDto, @Request() req: any) {
    const yearId = b.academicYearId || await this.activeYearId();
    const r = await this.ds.query(`
      INSERT INTO secretaria.level_tests
        (student_id, candidate_name, candidate_contact, academic_year_id,
         test_date, test_time, evaluator, evaluator_teacher_id, result_level, recommended_program_id, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id
    `, [b.studentId||null, b.candidateName||null, b.candidateContact||null,
        yearId||null, b.testDate||null, b.testTime||null,
        b.evaluator||null, b.evaluatorTeacherId||null, b.resultLevel||null, b.recommendedProgramId||null, b.notes||null]);
    return { id: r[0].id };
  }

  @Patch(':id') @Roles('secretaria_admin','secretaria_staff')
  async update(@Param('id') id: string, @Body() b: TestDto) {
    await this.ds.query(`
      UPDATE secretaria.level_tests SET
        candidate_name      = COALESCE($2, candidate_name),
        candidate_contact   = COALESCE($3, candidate_contact),
        test_date           = COALESCE($4, test_date),
        test_time           = COALESCE($5, test_time),
        evaluator           = COALESCE($6, evaluator),
        evaluator_teacher_id = COALESCE($10::uuid, evaluator_teacher_id),
        result_level        = COALESCE($7, result_level),
        recommended_program_id = COALESCE($8::uuid, recommended_program_id),
        notes               = COALESCE($9, notes)
      WHERE id = $1
    `, [id, b.candidateName||null, b.candidateContact||null,
        b.testDate||null, b.testTime||null,
        b.evaluator||null, b.resultLevel||null,
        b.recommendedProgramId||null, b.notes||null, b.evaluatorTeacherId||null]);
    return { ok: true };
  }

  @Delete(':id') @Roles('secretaria_admin','secretaria_staff')
  async remove(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.level_tests WHERE id=$1`, [id]);
    return { ok: true };
  }
}
