import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsInt, IsNumber, Min } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

class SaveDto {
  @IsUUID() studentId: string;
  @IsString() period: string; // YYYY-MM
  @IsInt() @Min(0) daysCount: number;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsUUID() academicYearId?: string;
}
class ChargeDto {
  @IsUUID() studentId: string;
  @IsString() period: string;
  @IsOptional() @IsUUID() academicYearId?: string;
}

@Controller('secretaria/taper')
@UseGuards(SecretariaAuthGuard)
export class TaperController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }
  private async dayRate(yearId: string): Promise<number> {
    const r = await this.ds.query(`
      SELECT amount FROM secretaria.fee_schedules f
      JOIN secretaria.services sv ON sv.id=f.service_id AND sv.code='TAPER'
      WHERE f.academic_year_id=$1 AND f.concept='taper_dia' AND f.is_active
      ORDER BY amount DESC LIMIT 1`, [yearId]);
    return r[0] ? Number(r[0].amount) : 0;
  }

  // Alumnos con servicio Táper + su uso del mes
  @Get() @Roles('secretaria_admin','secretaria_staff','direccion')
  async list(@Query('period') period: string, @Query('academicYearId') yearId?: string) {
    const yid = yearId || (await this.activeYearId());
    const rate = await this.dayRate(yid);
    const rows = await this.ds.query(`
      SELECT st.id AS "studentId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             tu.days_count AS "daysCount", tu.amount, tu.charge_id AS "chargeId", ch.status AS "chargeStatus"
      FROM secretaria.enrollments e
      JOIN secretaria.services sv ON sv.id=e.service_id AND sv.code='TAPER'
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      LEFT JOIN secretaria.taper_usage tu ON tu.student_id=st.id AND tu.period=$2
      LEFT JOIN secretaria.charges ch ON ch.id=tu.charge_id
      WHERE e.academic_year_id=$1 AND e.status='matriculado'
      ORDER BY "studentName"`, [yid, period]);
    return { dayRate: rate, rows };
  }

  // Guardar/actualizar el uso de táper de un alumno en un mes
  @Post('save') @Roles('secretaria_admin','secretaria_staff')
  async save(@Body() b: SaveDto) {
    const yid = b.academicYearId || (await this.activeYearId());
    const amount = b.amount != null ? b.amount : b.daysCount * (await this.dayRate(yid));
    const ex = await this.ds.query(`SELECT id FROM secretaria.taper_usage WHERE student_id=$1 AND period=$2`, [b.studentId, b.period]);
    if (ex.length) {
      await this.ds.query(`UPDATE secretaria.taper_usage SET days_count=$2, amount=$3 WHERE id=$1`, [ex[0].id, b.daysCount, amount]);
    } else {
      await this.ds.query(`INSERT INTO secretaria.taper_usage(student_id, period, days_count, amount) VALUES ($1,$2,$3,$4)`, [b.studentId, b.period, b.daysCount, amount]);
    }
    return { ok: true, amount };
  }

  // Generar el recibo del táper del mes (sobre la matrícula de Táper del alumno)
  @Post('generate-charge') @Roles('secretaria_admin','secretaria_staff')
  async generateCharge(@Body() b: ChargeDto) {
    const yid = b.academicYearId || (await this.activeYearId());
    const tu = await this.ds.query(`SELECT id, amount, charge_id FROM secretaria.taper_usage WHERE student_id=$1 AND period=$2`, [b.studentId, b.period]);
    if (!tu[0]) throw new BadRequestException('Primero guarda el uso del mes');
    if (tu[0].charge_id) return { ok: false, error: 'Ya tiene recibo generado este mes' };
    if (!Number(tu[0].amount)) throw new BadRequestException('El importe es 0 (configura la tarifa taper_dia o pon importe manual)');
    const enr = await this.ds.query(`
      SELECT e.id FROM secretaria.enrollments e
      JOIN secretaria.services sv ON sv.id=e.service_id AND sv.code='TAPER'
      WHERE e.student_id=$1 AND e.academic_year_id=$2 AND e.status='matriculado' LIMIT 1`, [b.studentId, yid]);
    if (!enr[0]) throw new BadRequestException('El alumno no tiene matrícula de Táper en este curso');
    const ch = await this.ds.query(
      `INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status) VALUES ($1,$2,'taper_dia',$3,'pendiente') RETURNING id`,
      [enr[0].id, b.period, tu[0].amount]);
    await this.ds.query(`UPDATE secretaria.taper_usage SET charge_id=$2 WHERE id=$1`, [tu[0].id, ch[0].id]);
    return { ok: true, chargeId: ch[0].id };
  }
}
