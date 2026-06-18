import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsDateString, IsIn, IsUUID, IsInt } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const KINDS = ['festivo', 'puente', 'descanso', 'vacaciones'];

class TermDto {
  @IsUUID() academicYearId: string;
  @IsString() name: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
class NonClassDto {
  @IsUUID() academicYearId: string;
  @IsString() label: string;
  @IsDateString() date: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsIn(KINDS) kind?: string;
}

// Calendario escolar: trimestres (rangos lectivos) + días sin clase (festivos/puentes/descansos/vacaciones).
@Controller('secretaria/calendar-config')
@UseGuards(SecretariaAuthGuard)
export class CalendarioController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // ---- Trimestres ----
  @Get('terms')
  async terms(@Query('academicYearId') yearId?: string) {
    const yid = yearId || (await this.activeYearId());
    return this.ds.query(`
      SELECT id, name, to_char(start_date,'YYYY-MM-DD') AS "startDate", to_char(end_date,'YYYY-MM-DD') AS "endDate", sort_order AS "sortOrder"
      FROM secretaria.academic_terms WHERE academic_year_id=$1 ORDER BY start_date, sort_order`, [yid]);
  }

  @Post('terms') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async createTerm(@Body() b: TermDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.academic_terms(academic_year_id, name, start_date, end_date, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [b.academicYearId, b.name, b.startDate, b.endDate, b.sortOrder || 0]);
    return { ok: true, id: r[0].id };
  }

  @Delete('terms/:id') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async removeTerm(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.academic_terms WHERE id=$1`, [id]);
    return { ok: true };
  }

  // ---- Días sin clase ----
  @Get('nonclass')
  async nonclass(@Query('academicYearId') yearId?: string) {
    const yid = yearId || (await this.activeYearId());
    return this.ds.query(`
      SELECT id, label, kind, to_char(date,'YYYY-MM-DD') AS "date", to_char(end_date,'YYYY-MM-DD') AS "endDate"
      FROM secretaria.non_class_days WHERE academic_year_id=$1 ORDER BY date`, [yid]);
  }

  @Post('nonclass') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async createNonClass(@Body() b: NonClassDto) {
    const r = await this.ds.query(
      `INSERT INTO secretaria.non_class_days(academic_year_id, label, date, end_date, kind)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [b.academicYearId, b.label, b.date, b.endDate || null, b.kind || 'festivo']);
    return { ok: true, id: r[0].id };
  }

  @Delete('nonclass/:id') @Roles('secretaria_admin', 'secretaria_staff', 'direccion')
  async removeNonClass(@Param('id') id: string) {
    await this.ds.query(`DELETE FROM secretaria.non_class_days WHERE id=$1`, [id]);
    return { ok: true };
  }
}
