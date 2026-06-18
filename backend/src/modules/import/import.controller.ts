import { Controller, Post, UseGuards, UploadedFile, UseInterceptors, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { parseWorkbook, summarize } from './import.parser';
import { splitName } from './name-splitter';

const SERVICE_CODE: Record<string, string> = { INGLES: 'INGLES', APOYO: 'APOYO', DANZA: 'DANZA', ESCUELA: 'ESCUELA' };

@Controller('secretaria/import')
@UseGuards(SecretariaAuthGuard)
export class ImportController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async year2526(): Promise<any> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE label='2025-2026' LIMIT 1`);
    if (y[0]) return y[0].id;
    const a = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return a[0]?.id;
  }

  // DRY-RUN: parsea y devuelve un resumen sin escribir nada
  @Post('preview') @Roles('secretaria_admin')
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Sube el fichero Excel');
    const parsed = parseWorkbook(file.buffer);
    const yid = await this.year2526();
    const existing = await this.ds.query(`SELECT count(*)::int AS n FROM secretaria.enrollments WHERE academic_year_id=$1`, [yid]);
    const summary: any = summarize(parsed);
    summary.yaHayMatriculas = existing[0].n;
    if (existing[0].n > 0) summary.warnings.unshift(`El curso 2025-2026 ya tiene ${existing[0].n} matrículas: el importe se BLOQUEARÁ para no duplicar. Vacía el curso antes de importar.`);
    // muestra de 5 alumnos
    summary.muestra = parsed.students.slice(0, 5).map((s: any) => ({ servicio: s.svc, nombre: s.name, baja: s.isBaja, grupo: s.group, nacimiento: s.birth, recibos: s.payments.filter((p: any) => p.paidAt).length }));
    return summary;
  }

  // COMMIT: escribe en BD dentro de una transacción
  @Post('commit') @Roles('secretaria_admin')
  @UseInterceptors(FileInterceptor('file'))
  async commit(@UploadedFile() file: any, @Body('mappings') mappingsStr?: string) {
    if (!file) throw new BadRequestException('Sube el fichero Excel');
    let mappings: Record<string, Record<string, string>> | undefined;
    if (mappingsStr) {
      try { mappings = JSON.parse(mappingsStr); }
      catch { throw new BadRequestException('mappings JSON inválido'); }
    }
    const parsed = parseWorkbook(file.buffer, mappings);
    const yid = await this.year2526();
    if (!yid) throw new BadRequestException('No existe el curso 2025-2026');
    const existing = await this.ds.query(`SELECT count(*)::int AS n FROM secretaria.enrollments WHERE academic_year_id=$1`, [yid]);
    if (existing[0].n > 0) throw new BadRequestException(`El curso 2025-2026 ya tiene ${existing[0].n} matrículas. Vacíalo antes de importar para no duplicar.`);

    const svcRows = await this.ds.query(`SELECT code, id FROM secretaria.services`);
    const svcId: Record<string, string> = {}; for (const s of svcRows) svcId[s.code] = s.id;

    return this.ds.transaction(async (m) => {
      let families = 0, students = 0, guardians = 0, enrollments = 0, charges = 0, payments = 0;
      for (const s of parsed.students) {
        const fam = await m.query(`INSERT INTO secretaria.families(display_name) VALUES ($1) RETURNING id`, [s.name]);
        const familyId = fam[0].id; families++;
        // tutores — la madre (columna madre) es el contacto primario; relación por columna
        let primary = true;
        for (const g of [{ n: s.mother, ph: s.phone1, rel: 'madre' }, { n: s.father, ph: s.phone2, rel: 'padre' }]) {
          if (!g.n) continue;
          await m.query(`INSERT INTO secretaria.guardians(family_id, full_name, relationship, phone, email, is_primary_contact) VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6)`,
            [familyId, g.n, g.rel, g.ph || null, primary ? (s.email || null) : null, primary]);
          guardians++; primary = false;
        }
        if (primary && (s.phone1 || s.email)) { // sin madre/padre: tutor genérico con el contacto
          await m.query(`INSERT INTO secretaria.guardians(family_id, full_name, relationship, phone, email, is_primary_contact) VALUES ($1,$2,'tutor',$3,$4,true)`,
            [familyId, s.name, s.phone1 || null, s.email || null]); guardians++;
        }
        const nm = splitName(s.name);
        const stu = await m.query(
          `INSERT INTO secretaria.students(family_id, first_name, last_name, birth_date, school_origin, grade_label, photo_consent, exit_consent)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [familyId, nm.firstName, nm.lastName || null, s.birth, s.school || null, s.grade || null, s.photo, s.exit]);
        const studentId = stu[0].id; students++;
        const status = s.isBaja ? 'baja' : 'matriculado';
        const notes = s.group ? `Importado · Grupo: ${s.group}` : 'Importado';
        const enr = await m.query(
          `INSERT INTO secretaria.enrollments(student_id, academic_year_id, service_id, status, notes)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [studentId, yid, svcId[SERVICE_CODE[s.svc]], status, notes]);
        const enrollmentId = enr[0].id; enrollments++;

        // Recibos a partir de los pagos del Excel
        for (const p of s.payments) {
          let amount = 0;
          if (p.concept === 'mensualidad') {
            const a = await m.query(`SELECT COALESCE(secretaria.fn_resolve_monthly_fee($1),0) AS amt`, [enrollmentId]);
            amount = Number(a[0].amt);
          } else {
            const a = await m.query(`SELECT COALESCE(secretaria.fn_resolve_concept_fee($1,$2),0) AS amt`, [enrollmentId, p.concept]);
            amount = Number(a[0].amt);
          }
          const st2 = p.exento ? 'exento' : 'pagado';
          const ch = await m.query(
            `INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [enrollmentId, p.period, p.concept, amount, st2]);
          charges++;
          if (!p.exento && p.paidAt) {
            const pay = await m.query(`INSERT INTO secretaria.payments(family_id, amount, paid_at, method) VALUES ($1,$2,$3,'efectivo') RETURNING id`, [familyId, amount, p.paidAt]);
            await m.query(`INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount) VALUES ($1,$2,$3)`, [pay[0].id, ch[0].id, amount]);
            payments++;
          }
        }
      }
      return { ok: true, families, students, guardians, enrollments, charges, payments, warnings: parsed.warnings };
    });
  }
}
