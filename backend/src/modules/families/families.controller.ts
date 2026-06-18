import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Family, Guardian } from './entities';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

class GuardianDto {
  @IsString() fullName: string;
  @IsOptional() @IsString() relationship?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() nif?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() isPrimaryContact?: boolean;
}
class FamilyDto {
  @IsString() displayName: string;
  @IsOptional() @IsString() notes?: string;
}
class AddStudentDto {
  @IsString() firstName: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() birthDate?: string;
}

@Controller('secretaria/families')
@UseGuards(SecretariaAuthGuard)
export class FamiliesController {
  constructor(
    @InjectRepository(Family) private families: Repository<Family>,
    @InjectRepository(Guardian) private guardians: Repository<Guardian>,
    private ds: DataSource,
  ) {}

  @Get() @Roles('secretaria_admin','secretaria_staff','direccion') async list(@Query('q') q?: string) {
    // Devuelve TODAS las familias (sin tope) e incluye nombres de tutores y alumnos para poder buscarlos.
    const like = q ? `%${q}%` : null;
    return this.ds.query(`
      SELECT f.id, f.display_name AS "displayName", f.notes,
             COALESCE(string_agg(DISTINCT g.full_name, ', '), '') AS "guardiansText",
             COALESCE((SELECT string_agg(DISTINCT NULLIF(TRIM(COALESCE(s.first_name,'')||' '||COALESCE(s.last_name,'')),''), ', ')
                       FROM secretaria.students s WHERE s.family_id=f.id), '') AS "studentsText"
      FROM secretaria.families f
      LEFT JOIN secretaria.guardians g ON g.family_id=f.id
      WHERE $1::text IS NULL
         OR f.display_name ILIKE $1
         OR EXISTS (SELECT 1 FROM secretaria.guardians g2 WHERE g2.family_id=f.id AND g2.full_name ILIKE $1)
         OR EXISTS (SELECT 1 FROM secretaria.students s2 WHERE s2.family_id=f.id AND TRIM(COALESCE(s2.first_name,'')||' '||COALESCE(s2.last_name,'')) ILIKE $1)
      GROUP BY f.id
      ORDER BY f.display_name ASC`, [like]);
  }
  @Get(':id') @Roles('secretaria_admin','secretaria_staff','direccion') async one(@Param('id') id: string) {
    const family = await this.families.findOne({ where: { id } });
    const guardians = await this.guardians.find({ where: { familyId: id } });
    const students = await this.ds.query(`
      SELECT s.id, s.first_name AS "firstName", s.last_name AS "lastName", s.birth_date AS "birthDate", s.is_active AS "isActive",
             COALESCE(json_agg(DISTINCT sv.name) FILTER (WHERE sv.name IS NOT NULL), '[]') AS "services"
      FROM secretaria.students s
      LEFT JOIN secretaria.enrollments e ON e.student_id=s.id
      LEFT JOIN secretaria.academic_years ay ON ay.id=e.academic_year_id AND ay.is_active=true
      LEFT JOIN secretaria.services sv ON sv.id=e.service_id
      WHERE s.family_id=$1
      GROUP BY s.id ORDER BY s.is_active DESC, s.first_name`, [id]);
    return { ...family, guardians, students };
  }

  // Añadir un hijo/hermano NUEVO a la familia (se crea como alumno del centro, a completar luego)
  @Post(':id/students') @Roles('secretaria_admin','secretaria_staff')
  async addStudent(@Param('id') id: string, @Body() b: AddStudentDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.students(family_id, first_name, last_name, birth_date)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [id, b.firstName, b.lastName || null, b.birthDate || null]);
    return { ok: true, id: r[0].id };
  }

  // Vincular un alumno YA EXISTENTE del centro a esta familia (hermano ya inscrito)
  @Post(':id/attach-student') @Roles('secretaria_admin','secretaria_staff')
  async attachStudent(@Param('id') id: string, @Body() b: { studentId: string }) {
    await this.ds.query(`UPDATE secretaria.students SET family_id=$1 WHERE id=$2`, [id, b.studentId]);
    return { ok: true };
  }
  @Post() @Roles('secretaria_admin','secretaria_staff')
  create(@Body() b: FamilyDto) { return this.families.save(this.families.create(b)); }
  @Patch(':id') @Roles('secretaria_admin','secretaria_staff')
  async update(@Param('id') id: string, @Body() b: Partial<FamilyDto>) { await this.families.update(id, b); return this.families.findOne({ where: { id } }); }

  @Post(':id/guardians') @Roles('secretaria_admin','secretaria_staff')
  addGuardian(@Param('id') id: string, @Body() b: GuardianDto) {
    return this.guardians.save(this.guardians.create({ ...b, familyId: id }));
  }
}
