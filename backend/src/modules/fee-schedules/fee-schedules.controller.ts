import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsNumber, IsIn } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FeeSchedule } from './entity';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const CONCEPTS = ['matricula','mensualidad','material','maillot','taper_dia','taper_mes','otro'];

class FeeDto {
  @IsUUID() academicYearId: string;
  @IsUUID() serviceId: string;
  @IsOptional() @IsUUID() programId?: string;
  @IsOptional() @IsUUID() groupId?: string;       // tarifa por grupo concreto
  @IsIn(CONCEPTS) concept: string;
  @IsNumber() amount: number;
  @IsOptional() @IsString() label?: string;        // p. ej. "1 día/semana"
}

@Controller('secretaria/fee-schedules')
@UseGuards(SecretariaAuthGuard)
export class FeeSchedulesController {
  constructor(
    @InjectRepository(FeeSchedule) private fees: Repository<FeeSchedule>,
    private ds: DataSource,
  ) {}

  @Get() @Roles('secretaria_admin','secretaria_staff','direccion') async list(@Query('academicYearId') yearId?: string, @Query('serviceId') serviceId?: string) {
    const where: any = { isActive: true };
    // Por defecto, mostrar solo las tarifas del CURSO ACTIVO (evita duplicados de cursos anteriores).
    let effectiveYear = yearId;
    if (!effectiveYear) {
      const ay = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
      effectiveYear = ay[0]?.id;
    }
    if (effectiveYear) where.academicYearId = effectiveYear;
    if (serviceId) where.serviceId = serviceId;
    return this.fees.find({ where, order: { concept: 'ASC', amount: 'DESC' } });
  }

  @Post() @Roles('secretaria_admin','secretaria_staff')
  create(@Body() b: FeeDto) { return this.fees.save(this.fees.create(b)); }

  @Patch(':id') @Roles('secretaria_admin','secretaria_staff')
  async update(@Param('id') id: string, @Body() b: Partial<FeeDto>) { await this.fees.update(id, b); return this.fees.findOne({ where: { id } }); }

  @Delete(':id') @Roles('secretaria_admin')
  async remove(@Param('id') id: string) { await this.fees.update(id, { isActive: false }); return { ok: true }; }

  // Resuelve la tarifa mensual aplicable a una matrícula (override > grupo > programa > servicio)
  @Get('resolve/:enrollmentId') @Roles('secretaria_admin','secretaria_staff','direccion')
  async resolve(@Param('enrollmentId') enrollmentId: string) {
    const r = await this.ds.query(`SELECT secretaria.fn_resolve_monthly_fee($1) AS amount`, [enrollmentId]);
    return { enrollmentId, monthlyFee: r[0]?.amount ?? null };
  }

  // Previsualiza tarifas (matrícula + mensualidad) por servicio/grupo SIN enrollment.
  // Misma jerarquía que fn_resolve_concept_fee: grupo > programa(del grupo) > servicio.
  @Post('preview')
  async preview(@Body() b: { items?: { serviceId: string; groupId?: string | null }[]; academicYearId?: string }) {
    const yearId = b.academicYearId
      || (await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active LIMIT 1`))[0]?.id;
    if (!yearId) return { yearId: null, items: [] };

    const items = [];
    for (const it of (b.items || [])) {
      if (!it?.serviceId) continue;
      const groupId = it.groupId || null;
      items.push({
        serviceId: it.serviceId,
        groupId,
        matricula: await this.resolveConceptFee(yearId, it.serviceId, groupId, 'matricula'),
        mensualidad: await this.resolveConceptFee(yearId, it.serviceId, groupId, 'mensualidad'),
      });
    }
    return { yearId, items };
  }

  private async resolveConceptFee(
    yearId: string, serviceId: string, groupId: string | null, concept: string,
  ): Promise<number | null> {
    // OJO: esta previsualización en TS NO contempla la tarifa de Apoyo por etapa+horas
    // (esa se resuelve en SQL con secretaria.fn_resolve_apoyo_fee). Hoy ningún flujo de Apoyo
    // pasa por aquí (Apoyo no usa grupo/programa). Si se reutiliza este preview para Apoyo,
    // añadir la rama Apoyo o devolverá un importe incorrecto por la cadena grupo→programa→servicio.
    // 1. Tarifa propia del grupo
    if (groupId) {
      const g = await this.ds.query(
        `SELECT amount::numeric AS amount FROM secretaria.fee_schedules
         WHERE academic_year_id=$1 AND concept=$2::secretaria.fee_concept AND is_active AND group_id=$3
         ORDER BY amount DESC LIMIT 1`, [yearId, concept, groupId]);
      if (g[0]?.amount != null) return Number(g[0].amount);
      // 2. Tarifa del programa al que pertenece el grupo
      const p = await this.ds.query(
        `SELECT f.amount::numeric AS amount FROM secretaria.fee_schedules f
         JOIN secretaria.groups gr ON gr.program_id = f.program_id
         WHERE gr.id=$3 AND f.academic_year_id=$1 AND f.concept=$2::secretaria.fee_concept
           AND f.is_active AND f.group_id IS NULL
         ORDER BY f.amount DESC LIMIT 1`, [yearId, concept, groupId]);
      if (p[0]?.amount != null) return Number(p[0].amount);
    }
    // 3. Tarifa a nivel servicio
    const s = await this.ds.query(
      `SELECT amount::numeric AS amount FROM secretaria.fee_schedules
       WHERE academic_year_id=$1 AND concept=$2::secretaria.fee_concept AND is_active
         AND service_id=$3 AND program_id IS NULL AND group_id IS NULL
       ORDER BY amount DESC LIMIT 1`, [yearId, concept, serviceId]);
    return s[0]?.amount != null ? Number(s[0].amount) : null;
  }
}
