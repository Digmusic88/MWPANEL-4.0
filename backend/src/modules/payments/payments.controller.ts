import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsNumber, IsIn, IsBoolean } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const METHODS = ['efectivo','transferencia','domiciliacion','bizum','tpv'];

// Descuento por hermanos: 5€ por cada hermano adicional (alumno matriculado) de la familia, por mes.
const SIBLING_DISCOUNT_EUR = 5;

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
             sv.name AS "serviceName", secretaria.fn_resolve_monthly_fee(e.id) AS "monthlyFee",
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
    // Descuento por hermanos: una fila por familia (presente en la vista) con ≥2 alumnos matriculados.
    // El conteo de hermanos cruza todos los servicios, aunque la matriz esté filtrada por uno.
    const famIds = [...new Set(students.map((s: any) => s.familyId).filter(Boolean))];
    let discountRows: any[] = [];
    if (famIds.length) {
      const fams = await this.ds.query(`
        SELECT f.id AS "familyId", f.display_name AS "familyName",
               (SELECT count(DISTINCT st2.id) FROM secretaria.students st2
                  JOIN secretaria.enrollments e2 ON e2.student_id=st2.id
                 WHERE st2.family_id=f.id AND e2.status='matriculado' AND e2.academic_year_id=$1) AS "siblingCount"
        FROM secretaria.families f WHERE f.id = ANY($2)`, [yearId, famIds]);
      discountRows = fams
        .filter((f: any) => Number(f.siblingCount) >= 2)
        .map((f: any) => ({ familyId: f.familyId, familyName: f.familyName, monthly: SIBLING_DISCOUNT_EUR * (Number(f.siblingCount) - 1) }))
        .sort((a: any, b: any) => (a.familyName || '').localeCompare(b.familyName || ''));
    }
    return { columns, rows, discountRows };
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

  // Cobro directo de una celda de la matriz: crea el recibo si no existe y lo marca pagado
  // (o exento). Resuelve el importe por tarifa si no se indica. Pensado para cobrar meses
  // por adelantado sin generar pendientes a todo el mundo (no genera falsa morosidad).
  @Post('pay-cell') @Roles('secretaria_admin','secretaria_staff')
  async payCell(@Body() b: PayCellDto) {
    const period = b.concept === 'mensualidad' ? (b.period || null) : null;
    const er = await this.ds.query(
      `SELECT e.status AS "enrStatus", st.family_id AS "familyId"
       FROM secretaria.enrollments e JOIN secretaria.students st ON st.id=e.student_id WHERE e.id=$1`, [b.enrollmentId]);
    if (!er[0]) return { ok: false, error: 'Matrícula no encontrada' };

    // ¿ya existe recibo para esta celda?
    const ex = await this.ds.query(
      `SELECT id, status FROM secretaria.charges
       WHERE enrollment_id=$1 AND concept=$2::secretaria.fee_concept
         AND ((period IS NULL AND $3::text IS NULL) OR period=$3) LIMIT 1`,
      [b.enrollmentId, b.concept, period]);

    // importe: el indicado o el resuelto por tarifa (servicio/programa/grupo)
    let amount = b.amount;
    if (amount == null) {
      if (b.concept === 'mensualidad') {
        const mm = b.mm || (period ? period.slice(5, 7) : null);
        const r = await this.ds.query(`SELECT secretaria.fn_resolve_month_amount($1,$2) AS a`, [b.enrollmentId, mm]);
        amount = Number(r[0]?.a) || 0;
      } else {
        const r = await this.ds.query(`SELECT secretaria.fn_resolve_concept_fee($1,$2) AS a`, [b.enrollmentId, b.concept]);
        amount = Number(r[0]?.a) || 0;
      }
    }

    // crear el recibo si no existía
    let chargeId = ex[0]?.id;
    if (!chargeId) {
      const ins = await this.ds.query(
        `INSERT INTO secretaria.charges(enrollment_id, period, concept, amount_due, status)
         VALUES ($1,$2,$3::secretaria.fee_concept,$4,'pendiente') RETURNING id`,
        [b.enrollmentId, period, b.concept, amount]);
      chargeId = ins[0].id;
    }

    if (b.exempt) {
      await this.ds.query(`UPDATE secretaria.charges SET status='exento' WHERE id=$1`, [chargeId]);
    } else if (ex[0]?.status !== 'pagado') {
      const paidAt = b.paidAt || new Date().toISOString().slice(0, 10);
      const pay = await this.ds.query(
        `INSERT INTO secretaria.payments(family_id, amount, paid_at, method) VALUES ($1,$2,$3,$4) RETURNING id`,
        [er[0].familyId, amount, paidAt, b.method || 'efectivo']);
      await this.ds.query(`INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount) VALUES ($1,$2,$3)`,
        [pay[0].id, chargeId, amount]);
      await this.ds.query(`UPDATE secretaria.charges SET status='pagado' WHERE id=$1`, [chargeId]);
    }

    // Reserva de plaza: al pagar/eximir la MATRÍCULA, un preinscrito pasa a matriculado.
    let promoted = false;
    if (b.concept === 'matricula' && er[0].enrStatus === 'preinscrito') {
      await this.ds.query(
        `UPDATE secretaria.enrollments SET status='matriculado', enrolled_at=now(), status_changed_at=now()
         WHERE id=$1 AND status='preinscrito'`, [b.enrollmentId]);
      promoted = true;
    }
    return { ok: true, chargeId, promoted };
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
    const rows = await this.ds.query(`
      SELECT f.id AS "familyId", f.display_name AS "familyName",
             count(c.id) AS "pendingCount", sum(c.amount_due) AS "totalDue",
             count(DISTINCT c.period) FILTER (WHERE c.concept='mensualidad') AS "pendingMonths",
             (SELECT count(DISTINCT st2.id) FROM secretaria.students st2
                JOIN secretaria.enrollments e2 ON e2.student_id=st2.id
               WHERE st2.family_id=f.id AND e2.status='matriculado' AND e2.academic_year_id=$1) AS "siblingCount",
             (SELECT string_agg(DISTINCT g2.full_name, ', ') FROM secretaria.guardians g2 WHERE g2.family_id=f.id) AS "guardians",
             (SELECT string_agg(DISTINCT g2.phone, ', ') FROM secretaria.guardians g2 WHERE g2.family_id=f.id AND g2.phone IS NOT NULL) AS "phones",
             (SELECT string_agg(DISTINCT g2.email, ', ') FROM secretaria.guardians g2 WHERE g2.family_id=f.id AND g2.email IS NOT NULL) AS "emails"
      FROM secretaria.charges c
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      JOIN secretaria.families f ON f.id=st.family_id
      WHERE e.academic_year_id=$1 AND c.status='pendiente'
        AND e.status='matriculado'  -- preinscrito/lista de espera no son morosidad (no hay pago obligatorio)
      GROUP BY f.id, f.display_name`, [yearId]);
    // Descuento por hermanos (5€ por hermano adicional, por cada mes pendiente). Dinámico.
    return rows.map((r: any) => {
      const siblings = Number(r.siblingCount) || 0;
      const siblingDiscountMonthly = SIBLING_DISCOUNT_EUR * Math.max(0, siblings - 1);
      const pendingMonths = Number(r.pendingMonths) || 0;
      const siblingDiscountTotal = siblingDiscountMonthly * pendingMonths;
      const totalDue = Number(r.totalDue) || 0;
      return { ...r, siblingDiscountMonthly, siblingDiscountTotal, netDue: Math.max(0, totalDue - siblingDiscountTotal) };
    }).sort((a: any, b: any) => b.netDue - a.netDue);
  }
}
