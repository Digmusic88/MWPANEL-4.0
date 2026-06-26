import { Controller, Get, Post, Put, Body, UseGuards, Query } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsNumber, IsIn, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { dedupeCells, summarizeBulkOutcomes } from './payments.bulk';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const METHODS = ['efectivo','transferencia','domiciliacion','bizum','tpv'];

// Descuento por hermanos: importe en € por cada hermano ADICIONAL facturado ese mes.
// Fuente única: clave 'sibling_discount_eur' en secretaria.org_settings (editable en Configuración).
// Fallback a este valor si no está configurado. Ver PaymentsController.getSiblingDiscountEur().
const SIBLING_DISCOUNT_DEFAULT_EUR = 5;

class GenerateDto { @IsUUID() academicYearId: string; @IsString() period: string; @IsOptional() @IsUUID() serviceId?: string; }
class GenerateCourseDto { @IsUUID() academicYearId: string; @IsOptional() @IsUUID() serviceId?: string; }
class PayChargeDto {
  @IsUUID() chargeId: string;
  @IsIn(METHODS) method: string;
  @IsOptional() @IsString() paidAt?: string;
  @IsOptional() @IsNumber() amount?: number;
}
// Cobro directo sobre una CELDA de la matriz (exista o no el recibo): si el recibo
// no existe, se crea al vuelo (así no hay que generar pendientes a todos para cobrar
// por adelantado, evitando falsa morosidad). Marca pagado o, con exempt, exento.
class PayCellDto {
  @IsUUID() enrollmentId: string;
  @IsIn(['matricula','material','mensualidad']) concept: string;
  @IsOptional() @IsString() period?: string;   // '2026-09' (sólo mensualidad)
  @IsOptional() @IsString() mm?: string;        // '09' para resolver importe de mensualidad
  @IsOptional() @IsIn(METHODS) method?: string;
  @IsOptional() @IsString() paidAt?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsBoolean() exempt?: boolean;
}

// Cobro masivo: lista de celdas + método/fecha comunes; el importe se auto-resuelve por celda.
class BulkCellTargetDto {
  @IsUUID() enrollmentId: string;
  @IsIn(['matricula','material','mensualidad']) concept: string;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsString() mm?: string;
}
class PayCellsBulkDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkCellTargetDto) cells: BulkCellTargetDto[];
  @IsOptional() @IsIn(METHODS) method?: string;
  @IsOptional() @IsString() paidAt?: string;
  @IsOptional() @IsBoolean() exempt?: boolean;
}

// Ajuste global del importe del descuento por hermanos (€/mes por hermano adicional).
class DiscountSettingDto { @IsNumber() siblingDiscountEur: number; }
// Aplicar/anular la línea de descuento de UNA familia en UN mes (abono). El importe se
// recalcula SIEMPRE en servidor (no se confía en el cliente).
class ApplyDiscountDto {
  @IsUUID() familyId: string;
  @IsUUID() academicYearId: string;
  @IsString() period: string;            // 'YYYY-MM'
  @IsOptional() @IsIn(METHODS) method?: string;
  @IsOptional() @IsString() paidAt?: string;
}
class UnapplyDiscountDto { @IsUUID() familyId: string; @IsString() period: string; }

// Meses de mensualidad del curso (sep→ago). El cobro real de cada mes lo decide
// el factor por programa (0 no se cobra, 0.5 medio mes, 1 completo).
function monthCols(startYear: number) {
  return [
    { key: `${startYear}-09`, mm: '09', label: 'Sep' }, { key: `${startYear}-10`, mm: '10', label: 'Oct' },
    { key: `${startYear}-11`, mm: '11', label: 'Nov' }, { key: `${startYear}-12`, mm: '12', label: 'Dic' },
    { key: `${startYear + 1}-01`, mm: '01', label: 'Ene' }, { key: `${startYear + 1}-02`, mm: '02', label: 'Feb' },
    { key: `${startYear + 1}-03`, mm: '03', label: 'Mar' }, { key: `${startYear + 1}-04`, mm: '04', label: 'Abr' },
    { key: `${startYear + 1}-05`, mm: '05', label: 'May' }, { key: `${startYear + 1}-06`, mm: '06', label: 'Jun' },
    { key: `${startYear + 1}-07`, mm: '07', label: 'Jul' }, { key: `${startYear + 1}-08`, mm: '08', label: 'Ago' },
  ];
}

@Controller('secretaria/payments')
@UseGuards(SecretariaAuthGuard)
export class PaymentsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async startYearFor(yearId: string): Promise<number> {
    const yr = await this.ds.query(`SELECT start_date FROM secretaria.academic_years WHERE id=$1`, [yearId]);
    return yr[0] ? new Date(yr[0].start_date).getFullYear() : new Date().getFullYear();
  }

  // ---------------- Descuento por hermanos: importe configurable ----------------
  // Caché en memoria (60s) para no leer org_settings en cada cálculo de matriz/morosidad.
  private _discCache: { v: number; t: number } | null = null;
  private async getSiblingDiscountEur(): Promise<number> {
    const now = Date.now();
    if (this._discCache && now - this._discCache.t < 60_000) return this._discCache.v;
    const r = await this.ds.query(`SELECT value FROM secretaria.org_settings WHERE key='sibling_discount_eur'`);
    const v = Number(r[0]?.value);
    const val = Number.isFinite(v) && v >= 0 ? v : SIBLING_DISCOUNT_DEFAULT_EUR;
    this._discCache = { v: val, t: now };
    return val;
  }

  @Get('discount-setting') @Roles('secretaria_admin','secretaria_staff','direccion')
  async getDiscountSetting() {
    return { siblingDiscountEur: await this.getSiblingDiscountEur() };
  }

  @Put('discount-setting') @Roles('secretaria_admin')
  async putDiscountSetting(@Body() b: DiscountSettingDto) {
    const val = Number(b.siblingDiscountEur);
    if (!Number.isFinite(val) || val < 0) return { ok: false, error: 'Importe no válido' };
    await this.ds.query(
      `INSERT INTO secretaria.org_settings(key,value) VALUES ('sibling_discount_eur',$1)
       ON CONFLICT (key) DO UPDATE SET value=$1`, [String(val)]);
    this._discCache = null; // invalida la caché
    return { ok: true, siblingDiscountEur: val };
  }

  // Descuento elegible (€) de UNA familia en UN mes: importe × (hermanos con cuota>0 ese mes − 1).
  private async eligibleDiscount(familyId: string, yearId: string, period: string): Promise<number> {
    const mm = period.slice(5, 7);
    const r = await this.ds.query(
      `SELECT count(DISTINCT st.id) FILTER (WHERE secretaria.fn_resolve_month_amount(e.id,$3) > 0) AS sib
         FROM secretaria.enrollments e
         JOIN secretaria.students st ON st.id=e.student_id
        WHERE st.family_id=$1 AND e.academic_year_id=$2 AND e.status='matriculado'`,
      [familyId, yearId, mm]);
    const sib = Number(r[0]?.sib) || 0;
    if (sib < 2) return 0;
    const eur = await this.getSiblingDiscountEur();
    return Math.round(eur * (sib - 1) * 100) / 100;
  }

  // Aplicar la línea de descuento de una familia/mes (clic en la celda de descuento).
  @Post('apply-discount') @Roles('secretaria_admin','secretaria_staff')
  async applyDiscount(@Body() b: ApplyDiscountDto) {
    const amount = await this.eligibleDiscount(b.familyId, b.academicYearId, b.period);
    if (amount <= 0) return { ok: true, applied: false };
    const paidAt = b.paidAt || new Date().toISOString().slice(0, 10);
    await this.ds.query(
      `INSERT INTO secretaria.sibling_discounts(family_id, academic_year_id, period, amount, status, method, applied_at)
       VALUES ($1,$2,$3,$4,'aplicado',$5,$6)
       ON CONFLICT (family_id, period) DO UPDATE
         SET amount=$4, status='aplicado', method=$5, applied_at=$6, academic_year_id=$2`,
      [b.familyId, b.academicYearId, b.period, amount, b.method || 'efectivo', paidAt]);
    return { ok: true, applied: true, amount };
  }

  @Post('unapply-discount') @Roles('secretaria_admin','secretaria_staff')
  async unapplyDiscount(@Body() b: UnapplyDiscountDto) {
    await this.ds.query(
      `UPDATE secretaria.sibling_discounts SET status='anulado' WHERE family_id=$1 AND period=$2`,
      [b.familyId, b.period]);
    return { ok: true };
  }

  // Genera las mensualidades de UN mes para los matriculados (sólo las que falten,
  // y sólo si el programa cobra ese mes: factor > 0). Importe = tarifa × factor del mes.
  @Post('generate-charges') @Roles('secretaria_admin','secretaria_staff')
  async generate(@Body() b: GenerateDto) {
    const mm = b.period.slice(-2);
    const r = await this.ds.query(`
      INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
      SELECT e.id, $2, 'mensualidad', secretaria.fn_resolve_month_amount(e.id, $4), 'pendiente'
      FROM secretaria.enrollments e
      WHERE e.academic_year_id=$1 AND e.status='matriculado'
        AND ($3::uuid IS NULL OR e.service_id=$3::uuid)
        AND secretaria.fn_resolve_month_amount(e.id, $4) IS NOT NULL
        AND secretaria.fn_resolve_month_amount(e.id, $4) > 0
        AND NOT EXISTS (SELECT 1 FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.period=$2 AND c.concept='mensualidad')
      RETURNING id`, [b.academicYearId, b.period, b.serviceId || null, mm]);
    return { generated: r.length };
  }

  // Genera TODOS los recibos del curso aplicables según los conceptos de cada programa
  @Post('generate-course-charges') @Roles('secretaria_admin','secretaria_staff')
  async generateCourse(@Body() b: GenerateCourseDto) {
    const startYear = await this.startYearFor(b.academicYearId);
    let total = 0;
    // Mensualidades de cada mes con factor > 0 según el programa (importe = tarifa × factor)
    for (const c of monthCols(startYear)) {
      const r = await this.ds.query(`
        INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
        SELECT e.id, $2, 'mensualidad', secretaria.fn_resolve_month_amount(e.id, $4), 'pendiente'
        FROM secretaria.enrollments e
        WHERE e.academic_year_id=$1 AND e.status='matriculado' AND ($3::uuid IS NULL OR e.service_id=$3::uuid)
          AND secretaria.fn_resolve_month_amount(e.id, $4) IS NOT NULL
          AND secretaria.fn_resolve_month_amount(e.id, $4) > 0
          AND NOT EXISTS (SELECT 1 FROM secretaria.charges ch WHERE ch.enrollment_id=e.id AND ch.period=$2 AND ch.concept='mensualidad')
        RETURNING id`, [b.academicYearId, c.key, b.serviceId || null, c.mm]);
      total += r.length;
    }
    // Matrícula y material (concepto sin periodo) según flag del programa
    for (const sp of [{ concept: 'matricula', flag: 'bills_matricula' }, { concept: 'material', flag: 'bills_material' }]) {
      const r = await this.ds.query(`
        INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
        SELECT e.id, NULL, '${sp.concept}', secretaria.fn_resolve_concept_fee(e.id,'${sp.concept}'), 'pendiente'
        FROM secretaria.enrollments e
        LEFT JOIN secretaria.groups g ON g.id=e.group_id
        LEFT JOIN secretaria.programs pr ON pr.id=g.program_id
        WHERE e.academic_year_id=$1 AND e.status='matriculado' AND ($2::uuid IS NULL OR e.service_id=$2::uuid)
          AND COALESCE(pr.${sp.flag}, false)=true
          AND secretaria.fn_resolve_concept_fee(e.id,'${sp.concept}') IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM secretaria.charges ch WHERE ch.enrollment_id=e.id AND ch.concept='${sp.concept}')
        RETURNING id`, [b.academicYearId, b.serviceId || null]);
      total += r.length;
    }
    // Maillot (Danza): una vez, si la matrícula tiene algún grupo con bills_maillot
    await this.ds.query(`
      INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
      SELECT e.id, NULL, 'maillot', secretaria.fn_resolve_danza_maillot(e.id), 'pendiente'
      FROM secretaria.enrollments e
      JOIN secretaria.services s ON s.id=e.service_id
      WHERE e.academic_year_id=$1 AND e.status='matriculado' AND s.code='DANZA'
        AND secretaria.fn_resolve_danza_maillot(e.id) IS NOT NULL
        AND secretaria.fn_resolve_danza_maillot(e.id) > 0
        AND NOT EXISTS (SELECT 1 FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.concept='maillot')`,
      [b.academicYearId]);
    return { generated: total };
  }

  // Genera el recibo de RESERVA DE PLAZA (matrícula) a los PREINSCRITOS que aún no lo tengan.
  // Tras migrar al curso nuevo, deja a cada preinscrito su recibo de matrícula para que, al pagarlo,
  // pasen automáticamente a matriculado. Requiere una tarifa de matrícula resoluble (servicio/programa/grupo).
  @Post('generate-reservations') @Roles('secretaria_admin','secretaria_staff')
  async generateReservations(@Body() b: GenerateCourseDto) {
    const r = await this.ds.query(`
      INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
      SELECT e.id, NULL, 'matricula', secretaria.fn_resolve_concept_fee(e.id,'matricula'), 'pendiente'
      FROM secretaria.enrollments e
      WHERE e.academic_year_id=$1 AND e.status='preinscrito'
        AND ($2::uuid IS NULL OR e.service_id=$2::uuid)
        AND secretaria.fn_resolve_concept_fee(e.id,'matricula') IS NOT NULL
        AND secretaria.fn_resolve_concept_fee(e.id,'matricula') > 0
        AND NOT EXISTS (SELECT 1 FROM secretaria.charges c WHERE c.enrollment_id=e.id AND c.concept='matricula')
      RETURNING id`, [b.academicYearId, b.serviceId || null]);
    return { generated: r.length };
  }

  // Matriz alumno × (matrícula, material, meses sep→ago) con conceptos aplicables por programa
  @Get('matrix') @Roles('secretaria_admin','secretaria_staff','direccion')
  async matrix(@Query('academicYearId') yearId: string, @Query('serviceId') serviceId?: string) {
    const startYear = await this.startYearFor(yearId);
    const months = monthCols(startYear);
    const columns = [
      { key: 'matricula', label: 'Matrícula', concept: 'matricula' },
      { key: 'material', label: 'Material', concept: 'material' },
      { key: 'maillot', label: 'Maillot', concept: 'maillot' },
      ...months.map(m => ({ key: m.key, label: m.label, concept: 'mensualidad', period: m.key, mm: m.mm })),
    ];

    const students = await this.ds.query(`
      SELECT e.id AS "enrollmentId", st.family_id AS "familyId",
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS "studentName",
             sv.name AS "serviceName", e.group_id AS "groupId", g.name AS "groupName",
             secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
             (SELECT count(*)::int FROM secretaria.danza_assignments da WHERE da.enrollment_id=e.id) AS "danzaDays",
             COALESCE(pr.bills_matricula,false) AS "billsMatricula", COALESCE(pr.bills_material,false) AS "billsMaterial",
             pr.month_billing AS "monthBilling",
             pr.name AS "programName"
      FROM secretaria.enrollments e
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      JOIN secretaria.services sv ON sv.id=e.service_id
      LEFT JOIN secretaria.groups g ON g.id=e.group_id
      LEFT JOIN secretaria.programs pr ON pr.id=g.program_id
      WHERE e.academic_year_id=$1 AND e.status='matriculado' AND ($2::uuid IS NULL OR e.service_id=$2::uuid)
      ORDER BY "studentName"`, [yearId, serviceId || null]);

    const charges = await this.ds.query(`
      SELECT c.id, c.enrollment_id AS "enrollmentId", c.concept, c.period, c.status, c.amount_due AS "amountDue",
             (SELECT max(p.paid_at) FROM secretaria.payment_allocations pa JOIN secretaria.payments p ON p.id=pa.payment_id
              WHERE pa.charge_id=c.id AND p.voided_at IS NULL) AS "paidAt"
      FROM secretaria.charges c JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      WHERE e.academic_year_id=$1 AND ($2::uuid IS NULL OR e.service_id=$2::uuid)`, [yearId, serviceId || null]);

    const byEnroll: any = {};
    for (const c of charges) {
      byEnroll[c.enrollmentId] = byEnroll[c.enrollmentId] || {};
      const k = c.concept === 'mensualidad' ? c.period : c.concept;
      byEnroll[c.enrollmentId][k] = c;
    }
    const rows = students.map((s: any) => ({ ...s, cells: byEnroll[s.enrollmentId] || {} }));

    // Descuento por hermanos: una fila por familia (presente en la vista) con ≥2 hermanos
    // FACTURADOS ese mes. El conteo cruza todos los servicios, aunque la matriz esté filtrada
    // por uno. El descuento de cada mes = importe × (hermanos con cuota>0 ese mes − 1).
    const famIds = [...new Set(students.map((s: any) => s.familyId).filter(Boolean))];
    const eur = await this.getSiblingDiscountEur();
    let discountRows: any[] = [];
    let appliedTotal = 0;
    if (famIds.length) {
      const periods = months.map(m => m.key);
      const mms = months.map(m => m.mm);
      // Hermanos facturados por familia y mes (cuota resuelta > 0).
      const sibRows = await this.ds.query(`
        WITH months AS (SELECT * FROM unnest($2::text[], $3::text[]) AS t(period, mm))
        SELECT st.family_id AS "familyId", f.display_name AS "familyName", mo.period AS period,
               count(DISTINCT st.id) FILTER (WHERE secretaria.fn_resolve_month_amount(e.id, mo.mm) > 0) AS sib
          FROM secretaria.enrollments e
          JOIN secretaria.students st ON st.id=e.student_id
          JOIN secretaria.families f ON f.id=st.family_id
          CROSS JOIN months mo
         WHERE e.academic_year_id=$1 AND e.status='matriculado' AND st.family_id = ANY($4::uuid[])
         GROUP BY st.family_id, f.display_name, mo.period`, [yearId, periods, mms, famIds]);
      // Descuentos ya aplicados (para marcar las celdas y restar del neto).
      const appliedRows = await this.ds.query(`
        SELECT family_id AS "familyId", period, amount
          FROM secretaria.sibling_discounts
         WHERE academic_year_id=$1 AND status='aplicado' AND family_id = ANY($2::uuid[])`, [yearId, famIds]);
      const applied: Record<string, Record<string, number>> = {};
      for (const a of appliedRows) {
        (applied[a.familyId] = applied[a.familyId] || {})[a.period] = Number(a.amount);
        appliedTotal += Number(a.amount) || 0;
      }
      const byFam: Record<string, any> = {};
      for (const s of sibRows) {
        const sib = Number(s.sib) || 0;
        const eligible = sib >= 2 ? Math.round(eur * (sib - 1) * 100) / 100 : 0;
        if (eligible <= 0) continue;
        const fam = byFam[s.familyId] || (byFam[s.familyId] = { familyId: s.familyId, familyName: s.familyName, cells: {} });
        const isApplied = applied[s.familyId]?.[s.period] != null;
        fam.cells[s.period] = { eligible, applied: isApplied, amount: isApplied ? applied[s.familyId][s.period] : null };
      }
      discountRows = Object.values(byFam)
        .filter((f: any) => Object.keys(f.cells).length > 0)
        .sort((a: any, b: any) => (a.familyName || '').localeCompare(b.familyName || ''));
    }

    // Totales del ámbito visible: bruto = Σ recibos facturados; neto = bruto − descuentos aplicados.
    const bruto = Math.round(charges.reduce((acc: number, c: any) => acc + Number(c.amountDue || 0), 0) * 100) / 100;
    const totals = { bruto, descuentoAplicado: Math.round(appliedTotal * 100) / 100, neto: Math.round((bruto - appliedTotal) * 100) / 100 };
    return { columns, rows, discountRows, totals };
  }

  // Registrar el cobro de un recibo concreto (clic en la celda)
  @Post('pay-charge') @Roles('secretaria_admin','secretaria_staff')
  async payCharge(@Body() b: PayChargeDto) {
    const rows = await this.ds.query(`
      SELECT c.id, c.amount_due, c.concept, c.enrollment_id AS "enrollmentId", e.status AS "enrStatus", st.family_id
      FROM secretaria.charges c JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id WHERE c.id=$1`, [b.chargeId]);
    if (!rows[0]) return { ok: false, error: 'Recibo no encontrado' };
    const amount = b.amount ?? Number(rows[0].amount_due);
    const paidAt = b.paidAt || new Date().toISOString().slice(0, 10);
    const pay = await this.ds.query(
      `INSERT INTO secretaria.payments(family_id, amount, paid_at, method) VALUES ($1,$2,$3,$4) RETURNING id`,
      [rows[0].family_id, amount, paidAt, b.method]);
    await this.ds.query(`INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount) VALUES ($1,$2,$3)`,
      [pay[0].id, b.chargeId, amount]);
    await this.ds.query(`UPDATE secretaria.charges SET status='pagado' WHERE id=$1`, [b.chargeId]);
    // Reserva de plaza: al pagar la MATRÍCULA, un alumno PREINSCRITO pasa a MATRICULADO automáticamente.
    let promoted = false;
    if (rows[0].concept === 'matricula' && rows[0].enrStatus === 'preinscrito') {
      await this.ds.query(
        `UPDATE secretaria.enrollments SET status='matriculado', enrolled_at=now(), status_changed_at=now()
         WHERE id=$1 AND status='preinscrito'`, [rows[0].enrollmentId]);
      promoted = true;
    }
    return { ok: true, paymentId: pay[0].id, promoted };
  }

  // Lógica de cobro de UNA celda, reutilizable por pay-cell y pay-cells-bulk.
  // `q` es cualquier ejecutor con .query (DataSource o QueryRunner) → permite usarla en transacción.
  private async applyCellPayment(
    q: { query: (sql: string, params?: any[]) => Promise<any> },
    p: { enrollmentId: string; concept: string; period?: string | null; mm?: string | null; method?: string; paidAt?: string; amount?: number; exempt?: boolean },
  ): Promise<{ ok: boolean; chargeId?: string; promoted: boolean; outcome: 'paid' | 'exempted' | 'skipped' | 'notfound' }> {
    const period = p.concept === 'mensualidad' ? (p.period || null) : null;
    const er = await q.query(
      `SELECT e.status AS "enrStatus", st.family_id AS "familyId"
       FROM secretaria.enrollments e JOIN secretaria.students st ON st.id=e.student_id WHERE e.id=$1`, [p.enrollmentId]);
    if (!er[0]) return { ok: false, promoted: false, outcome: 'notfound' };

    // ¿ya existe recibo para esta celda?
    const ex = await q.query(
      `SELECT id, status FROM secretaria.charges
       WHERE enrollment_id=$1 AND concept=$2::secretaria.fee_concept
         AND ((period IS NULL AND $3::text IS NULL) OR period=$3) LIMIT 1`,
      [p.enrollmentId, p.concept, period]);

    // importe: el indicado o el resuelto por tarifa (servicio/programa/grupo)
    let amount = p.amount;
    if (amount == null) {
      if (p.concept === 'mensualidad') {
        const mm = p.mm || (period ? period.slice(5, 7) : null);
        const r = await q.query(`SELECT secretaria.fn_resolve_month_amount($1,$2) AS a`, [p.enrollmentId, mm]);
        amount = Number(r[0]?.a) || 0;
      } else {
        const r = await q.query(`SELECT secretaria.fn_resolve_concept_fee($1,$2) AS a`, [p.enrollmentId, p.concept]);
        amount = Number(r[0]?.a) || 0;
      }
    }

    // crear el recibo si no existía
    let chargeId = ex[0]?.id;
    if (!chargeId) {
      const ins = await q.query(
        `INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
         VALUES ($1,$2,$3::secretaria.fee_concept,$4,'pendiente') RETURNING id`,
        [p.enrollmentId, period, p.concept, amount]);
      chargeId = ins[0].id;
    }

    let outcome: 'paid' | 'exempted' | 'skipped';
    if (p.exempt) {
      await q.query(`UPDATE secretaria.charges SET status='exento' WHERE id=$1`, [chargeId]);
      outcome = 'exempted';
    } else if (ex[0]?.status !== 'pagado') {
      const paidAt = p.paidAt || new Date().toISOString().slice(0, 10);
      const pay = await q.query(
        `INSERT INTO secretaria.payments(family_id, amount, paid_at, method) VALUES ($1,$2,$3,$4) RETURNING id`,
        [er[0].familyId, amount, paidAt, p.method || 'efectivo']);
      await q.query(`INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount) VALUES ($1,$2,$3)`,
        [pay[0].id, chargeId, amount]);
      await q.query(`UPDATE secretaria.charges SET status='pagado' WHERE id=$1`, [chargeId]);
      outcome = 'paid';
    } else {
      outcome = 'skipped'; // ya estaba pagado
    }

    // Reserva de plaza: al pagar/eximir la MATRÍCULA, un preinscrito pasa a matriculado.
    let promoted = false;
    if (p.concept === 'matricula' && er[0].enrStatus === 'preinscrito') {
      await q.query(
        `UPDATE secretaria.enrollments SET status='matriculado', enrolled_at=now(), status_changed_at=now()
         WHERE id=$1 AND status='preinscrito'`, [p.enrollmentId]);
      promoted = true;
    }
    return { ok: true, chargeId, promoted, outcome };
  }

  // Cobro directo de una celda de la matriz: crea el recibo si no existe y lo marca pagado (o exento).
  @Post('pay-cell') @Roles('secretaria_admin','secretaria_staff')
  async payCell(@Body() b: PayCellDto) {
    const r = await this.applyCellPayment(this.ds, b);
    if (!r.ok) return { ok: false, error: 'Matrícula no encontrada' };
    return { ok: true, chargeId: r.chargeId, promoted: r.promoted };
  }

  // Cobro/exención MASIVOS de varias celdas en una sola transacción. Importe auto por celda.
  @Post('pay-cells-bulk') @Roles('secretaria_admin','secretaria_staff')
  async payCellsBulk(@Body() b: PayCellsBulkDto) {
    const cells = dedupeCells(b.cells || []);
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    const outcomes: string[] = [];
    let promoted = 0;
    try {
      for (const c of cells) {
        const r = await this.applyCellPayment(qr, {
          enrollmentId: c.enrollmentId, concept: c.concept, period: c.period, mm: c.mm,
          method: b.method, paidAt: b.paidAt, exempt: b.exempt,
        });
        outcomes.push(r.outcome);
        if (r.promoted) promoted++;
      }
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
    return { ok: true, ...summarizeBulkOutcomes(outcomes), promoted };
  }

  // Marcar un recibo como exento (gris "x" del Excel)
  @Post('exempt-charge') @Roles('secretaria_admin','secretaria_staff')
  async exempt(@Body() b: { chargeId: string }) {
    const rows = await this.ds.query(
      `SELECT c.concept, c.enrollment_id AS "enrollmentId", e.status AS "enrStatus"
       FROM secretaria.charges c JOIN secretaria.enrollments e ON e.id=c.enrollment_id WHERE c.id=$1`, [b.chargeId]);
    await this.ds.query(`UPDATE secretaria.charges SET status='exento' WHERE id=$1`, [b.chargeId]);
    // Reserva exenta (beca): la matrícula exenta también confirma la plaza → matriculado.
    let promoted = false;
    if (rows[0] && rows[0].concept === 'matricula' && rows[0].enrStatus === 'preinscrito') {
      await this.ds.query(
        `UPDATE secretaria.enrollments SET status='matriculado', enrolled_at=now(), status_changed_at=now()
         WHERE id=$1 AND status='preinscrito'`, [rows[0].enrollmentId]);
      promoted = true;
    }
    return { ok: true, promoted };
  }

  // Cambiar el estado de un recibo (corregir errores): pagado / pendiente / anulado / exento.
  // Al pasar a pendiente/anulado/exento se deshace el cobro (se quitan pagos asociados al recibo).
  @Post('set-charge-status') @Roles('secretaria_admin','secretaria_staff')
  async setChargeStatus(@Body() b: { chargeId: string; status: 'pagado'|'pendiente'|'anulado'|'exento'; method?: string; amount?: number; paidAt?: string }) {
    if (!['pagado','pendiente','anulado','exento'].includes(b.status)) return { ok: false, error: 'Estado no válido' };
    const rows = await this.ds.query(`
      SELECT c.id, c.amount_due, c.concept, c.status, c.enrollment_id AS "enrollmentId", e.status AS "enrStatus", st.family_id
      FROM secretaria.charges c JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id WHERE c.id=$1`, [b.chargeId]);
    if (!rows[0]) return { ok: false, error: 'Recibo no encontrado' };
    const r = rows[0];

    if (b.status === 'pagado') {
      if (r.status !== 'pagado') {
        const amount = b.amount ?? Number(r.amount_due);
        const paidAt = b.paidAt || new Date().toISOString().slice(0, 10);
        const pay = await this.ds.query(
          `INSERT INTO secretaria.payments(family_id, amount, paid_at, method) VALUES ($1,$2,$3,$4) RETURNING id`,
          [r.family_id, amount, paidAt, b.method || 'efectivo']);
        await this.ds.query(`INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount) VALUES ($1,$2,$3)`,
          [pay[0].id, b.chargeId, amount]);
        await this.ds.query(`UPDATE secretaria.charges SET status='pagado' WHERE id=$1`, [b.chargeId]);
        if (r.concept === 'matricula' && r.enrStatus === 'preinscrito') {
          await this.ds.query(`UPDATE secretaria.enrollments SET status='matriculado', enrolled_at=now(), status_changed_at=now() WHERE id=$1 AND status='preinscrito'`, [r.enrollmentId]);
        }
      }
      return { ok: true };
    }

    // pendiente / anulado / exento → deshacer cualquier cobro del recibo y fijar el estado
    const pids = await this.ds.query(`SELECT DISTINCT payment_id FROM secretaria.payment_allocations WHERE charge_id=$1`, [b.chargeId]);
    await this.ds.query(`DELETE FROM secretaria.payment_allocations WHERE charge_id=$1`, [b.chargeId]);
    if (pids.length) {
      await this.ds.query(
        `DELETE FROM secretaria.payments p WHERE p.id = ANY($1::uuid[])
           AND NOT EXISTS (SELECT 1 FROM secretaria.payment_allocations pa WHERE pa.payment_id=p.id)`,
        [pids.map((x: any) => x.payment_id)]);
    }
    await this.ds.query(`UPDATE secretaria.charges SET status=$2 WHERE id=$1`, [b.chargeId, b.status]);
    return { ok: true };
  }

  // Morosidad: recibos pendientes agrupados por familia, con contacto para reclamar
  @Get('overdue') @Roles('secretaria_admin','secretaria_staff','direccion')
  async overdue(@Query('academicYearId') yearId: string) {
    const eur = await this.getSiblingDiscountEur();
    const rows = await this.ds.query(`
      SELECT f.id AS "familyId", f.display_name AS "familyName",
             count(c.id) AS "pendingCount", sum(c.amount_due) AS "totalDue",
             count(DISTINCT c.period) FILTER (WHERE c.concept='mensualidad') AS "pendingMonths",
             (SELECT count(DISTINCT st2.id) FROM secretaria.students st2
                JOIN secretaria.enrollments e2 ON e2.student_id=st2.id
               WHERE st2.family_id=f.id AND e2.status='matriculado' AND e2.academic_year_id=$1) AS "siblingCount",
             -- Descuento por hermanos PENDIENTE: por cada mes con mensualidad pendiente, importe ×
             -- (hermanos facturados ese mes − 1). Coherente con la regla de la matriz.
             COALESCE((
               SELECT SUM($2::numeric * GREATEST(0, z.sib - 1)) FROM (
                 SELECT pc.period,
                        (SELECT count(DISTINCT st3.id) FROM secretaria.enrollments e3
                           JOIN secretaria.students st3 ON st3.id=e3.student_id
                          WHERE st3.family_id=f.id AND e3.academic_year_id=$1 AND e3.status='matriculado'
                            AND secretaria.fn_resolve_month_amount(e3.id, substr(pc.period,6,2)) > 0) AS sib
                 FROM (SELECT DISTINCT c2.period
                         FROM secretaria.charges c2
                         JOIN secretaria.enrollments e2 ON e2.id=c2.enrollment_id
                         JOIN secretaria.students st2 ON st2.id=e2.student_id
                        WHERE st2.family_id=f.id AND c2.status='pendiente' AND c2.concept='mensualidad'
                          AND e2.academic_year_id=$1 AND e2.status='matriculado') pc
               ) z
             ), 0) AS "siblingDiscountTotal",
             (SELECT string_agg(DISTINCT g2.full_name, ', ') FROM secretaria.guardians g2 WHERE g2.family_id=f.id) AS "guardians",
             (SELECT string_agg(DISTINCT g2.phone, ', ') FROM secretaria.guardians g2 WHERE g2.family_id=f.id AND g2.phone IS NOT NULL) AS "phones",
             (SELECT string_agg(DISTINCT g2.email, ', ') FROM secretaria.guardians g2 WHERE g2.family_id=f.id AND g2.email IS NOT NULL) AS "emails"
      FROM secretaria.charges c
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      JOIN secretaria.families f ON f.id=st.family_id
      WHERE e.academic_year_id=$1 AND c.status='pendiente'
        AND e.status='matriculado'  -- preinscrito/lista de espera no son morosidad (no hay pago obligatorio)
      GROUP BY f.id, f.display_name`, [yearId, eur]);
    return rows.map((r: any) => {
      const totalDue = Number(r.totalDue) || 0;
      const siblingDiscountTotal = Math.min(totalDue, Number(r.siblingDiscountTotal) || 0);
      return { ...r, siblingDiscountTotal, netDue: Math.max(0, totalDue - siblingDiscountTotal) };
    }).sort((a: any, b: any) => b.netDue - a.netDue);
  }
}
