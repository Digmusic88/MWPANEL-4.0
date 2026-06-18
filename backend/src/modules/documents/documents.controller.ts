import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsIn, IsArray } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const DOC_CODES = ['foto', 'tarjeta_sanitaria', 'inscripcion', 'aut_imagen', 'aut_salida', 'otro'];
const DOC_STATUS = ['pendiente', 'recibido', 'caducado', 'no_aplica'];

class TypeDto {
  @IsOptional() @IsIn(DOC_CODES) code?: string;
  @IsString() name: string;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredFor?: string[];
}
class SetStatusDto {
  @IsUUID() studentId: string;
  @IsUUID() documentTypeId: string;
  @IsIn(DOC_STATUS) status: string;
  @IsOptional() @IsUUID() academicYearId?: string;
}

@Controller('secretaria/documents')
@UseGuards(SecretariaAuthGuard)
export class DocumentsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // ---------------- Tipos de documento ----------------
  @Get('types')
  types() {
    return this.ds.query(`SELECT id, code, name, required_for::text[] AS "requiredFor" FROM secretaria.document_types ORDER BY name`);
  }

  @Post('types') @Roles('secretaria_admin','secretaria_staff')
  async createType(@Body() b: TypeDto) {
    const code = b.code || 'otro';
    const r = await this.ds.query(
      `INSERT INTO secretaria.document_types(code, name, required_for) VALUES ($1, $2, $3::secretaria.service_code[]) RETURNING id`,
      [code, b.name, b.requiredFor || []]);
    return { ok: true, id: r[0].id };
  }

  @Patch('types/:id') @Roles('secretaria_admin','secretaria_staff')
  async updateType(@Param('id') id: string, @Body() b: TypeDto) {
    await this.ds.query(
      `UPDATE secretaria.document_types SET name=$2, required_for=$3::secretaria.service_code[] WHERE id=$1`,
      [id, b.name, b.requiredFor || []]);
    return { ok: true };
  }

  @Delete('types/:id') @Roles('secretaria_admin')
  async deleteType(@Param('id') id: string) {
    const used = await this.ds.query(`SELECT 1 FROM secretaria.student_documents WHERE document_type_id=$1 LIMIT 1`, [id]);
    if (used.length) throw new BadRequestException('No se puede eliminar: hay alumnos con este documento registrado');
    await this.ds.query(`DELETE FROM secretaria.document_types WHERE id=$1`, [id]);
    return { ok: true };
  }

  // ---------------- Checklist alumno × documento ----------------
  // Un documento aplica a un alumno si required_for está vacío (general) o
  // contiene alguno de los servicios en los que el alumno está matriculado.
  @Get('matrix')
  async matrix(@Query('academicYearId') yearId: string, @Query('serviceId') serviceId?: string) {
    const yid = yearId || (await this.activeYearId());
    const columns = await this.ds.query(`SELECT id, code, name, required_for::text[] AS "requiredFor" FROM secretaria.document_types ORDER BY name`);

    const students = await this.ds.query(`
      SELECT st.id AS "studentId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             array_agg(DISTINCT sv.code)::text[] AS "serviceCodes"
      FROM secretaria.students st
      JOIN secretaria.enrollments e ON e.student_id=st.id AND e.academic_year_id=$1 AND e.status='matriculado'
      JOIN secretaria.services sv ON sv.id=e.service_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE ($2::uuid IS NULL OR EXISTS (
        SELECT 1 FROM secretaria.enrollments e2 WHERE e2.student_id=st.id AND e2.academic_year_id=$1 AND e2.status='matriculado' AND e2.service_id=$2))
      GROUP BY st.id, "studentName"
      ORDER BY "studentName"`, [yid, serviceId || null]);

    const docs = await this.ds.query(
      `SELECT student_id AS "studentId", document_type_id AS "documentTypeId", status, file_path AS "filePath"
       FROM secretaria.student_documents WHERE academic_year_id=$1`, [yid]);
    const byStudent: any = {};
    for (const d of docs) { byStudent[d.studentId] = byStudent[d.studentId] || {}; byStudent[d.studentId][d.documentTypeId] = d; }

    const rows = students.map((s: any) => ({ ...s, cells: byStudent[s.studentId] || {} }));
    return { columns, rows };
  }

  // Marca/actualiza el estado de un documento de un alumno (upsert por curso)
  @Post('set-status') @Roles('secretaria_admin','secretaria_staff')
  async setStatus(@Body() b: SetStatusDto) {
    const yid = b.academicYearId || (await this.activeYearId());
    await this.ds.query(`
      INSERT INTO secretaria.student_documents(student_id, document_type_id, academic_year_id, status, reviewed_at)
      VALUES ($1,$2,$3,$4, now())
      ON CONFLICT (student_id, document_type_id, academic_year_id)
      DO UPDATE SET status=$4, reviewed_at=now()`,
      [b.studentId, b.documentTypeId, yid, b.status]);
    return { ok: true };
  }
}
