import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import * as XLSX from 'xlsx';

const CONCEPT_LABEL: Record<string, string> = {
  matricula: 'Matrícula', mensualidad: 'Mensualidad', material: 'Material', maillot: 'Maillot',
  taper_dia: 'Táper (día)', taper_mes: 'Táper (mes)', otro: 'Otro',
};
const METHOD_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', domiciliacion: 'Domiciliación', bizum: 'Bizum', tpv: 'Tarjeta (TPV)',
};

// Convierte filas (objetos) en CSV con BOM para que Excel respete los acentos.
function toCsv(rows: any[], headers: { key: string; label: string }[]): string {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map(h => esc(h.label)).join(';');
  const body = rows.map(r => headers.map(h => esc(r[h.key])).join(';')).join('\n');
  return '﻿' + head + '\n' + body + '\n';
}

@Controller('secretaria/reports')
@UseGuards(SecretariaAuthGuard)
export class ReportsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }
  private send(res: any, name: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(csv);
  }

  // Todos los recibos (cobros) del curso
  @Get('charges.csv') @Roles('secretaria_admin','secretaria_staff','direccion')
  async charges(@Query('academicYearId') yearId: string, @Res() res: any) {
    const yid = yearId || (await this.activeYearId());
    const rows = await this.ds.query(`
      SELECT COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS alumno,
             f.display_name AS familia, sv.name AS servicio, c.concept AS concepto, c.period AS periodo,
             c.amount_due AS importe, c.status AS estado
      FROM secretaria.charges c
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      JOIN secretaria.families f ON f.id=st.family_id
      JOIN secretaria.services sv ON sv.id=e.service_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE e.academic_year_id=$1
      ORDER BY alumno, c.period`, [yid]);
    this.send(res, 'recibos.csv', toCsv(rows, [
      { key: 'alumno', label: 'Alumno' }, { key: 'familia', label: 'Familia' }, { key: 'servicio', label: 'Servicio' },
      { key: 'concepto', label: 'Concepto' }, { key: 'periodo', label: 'Periodo' }, { key: 'importe', label: 'Importe' }, { key: 'estado', label: 'Estado' },
    ]));
  }

  // Morosidad por familia
  @Get('overdue.csv') @Roles('secretaria_admin','secretaria_staff','direccion')
  async overdue(@Query('academicYearId') yearId: string, @Res() res: any) {
    const yid = yearId || (await this.activeYearId());
    const rows = await this.ds.query(`
      SELECT f.display_name AS familia,
             (SELECT string_agg(DISTINCT g.full_name, ' / ') FROM secretaria.guardians g WHERE g.family_id=f.id) AS tutores,
             (SELECT string_agg(DISTINCT g.phone, ' / ') FROM secretaria.guardians g WHERE g.family_id=f.id AND g.phone IS NOT NULL) AS telefonos,
             count(c.id) AS recibos_pendientes, sum(c.amount_due) AS deuda
      FROM secretaria.charges c
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      JOIN secretaria.families f ON f.id=st.family_id
      WHERE e.academic_year_id=$1 AND c.status='pendiente' AND e.status='matriculado'
      GROUP BY f.id, f.display_name ORDER BY deuda DESC`, [yid]);
    this.send(res, 'morosidad.csv', toCsv(rows, [
      { key: 'familia', label: 'Familia' }, { key: 'tutores', label: 'Tutores' }, { key: 'telefonos', label: 'Teléfonos' },
      { key: 'recibos_pendientes', label: 'Recibos pendientes' }, { key: 'deuda', label: 'Deuda (€)' },
    ]));
  }

  // Alumnos y servicios en los que están matriculados
  @Get('students.csv') @Roles('secretaria_admin','secretaria_staff','direccion')
  async students(@Query('academicYearId') yearId: string, @Res() res: any) {
    const yid = yearId || (await this.activeYearId());
    const rows = await this.ds.query(`
      SELECT COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS alumno,
             f.display_name AS familia,
             string_agg(DISTINCT sv.name, ', ') AS servicios,
             CASE WHEN st.mwpanel_student_id IS NULL THEN 'Academia' ELSE 'Escuela' END AS origen
      FROM secretaria.students st
      JOIN secretaria.families f ON f.id=st.family_id
      LEFT JOIN secretaria.enrollments e ON e.student_id=st.id AND e.academic_year_id=$1 AND e.status='matriculado'
      LEFT JOIN secretaria.services sv ON sv.id=e.service_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE st.is_active=true
      GROUP BY st.id, f.display_name, va.first_name, va.last_name ORDER BY alumno`, [yid]);
    this.send(res, 'alumnos.csv', toCsv(rows, [
      { key: 'alumno', label: 'Alumno' }, { key: 'familia', label: 'Familia' }, { key: 'servicios', label: 'Servicios' }, { key: 'origen', label: 'Origen' },
    ]));
  }

  // Estado de documentación por alumno
  @Get('documents.csv') @Roles('secretaria_admin','secretaria_staff','direccion')
  async documents(@Query('academicYearId') yearId: string, @Res() res: any) {
    const yid = yearId || (await this.activeYearId());
    const rows = await this.ds.query(`
      SELECT COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS alumno,
             dt.name AS documento, sd.status AS estado
      FROM secretaria.student_documents sd
      JOIN secretaria.students st ON st.id=sd.student_id
      JOIN secretaria.document_types dt ON dt.id=sd.document_type_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      WHERE sd.academic_year_id=$1 ORDER BY alumno, documento`, [yid]);
    this.send(res, 'documentacion.csv', toCsv(rows, [
      { key: 'alumno', label: 'Alumno' }, { key: 'documento', label: 'Documento' }, { key: 'estado', label: 'Estado' },
    ]));
  }

  // ===== Informe de COBROS para la gestoría (Excel .xlsx) =====
  // Registro de ingresos del periodo: una fila por cobro + hojas de resumen (mes/concepto/método/servicio).
  @Get('gestoria.xlsx') @Roles('secretaria_admin','direccion')
  async gestoria(@Query('from') from: string, @Query('to') to: string, @Res() res: any) {
    // Por defecto, el mes en curso
    const now = new Date();
    const f = from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const t = to || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const detail = await this.ds.query(`
      SELECT to_char(p.paid_at,'YYYY-MM-DD') AS fecha, p.method::text AS metodo, pa.amount::float AS importe,
             f.display_name AS familia,
             COALESCE(NULLIF(TRIM(COALESCE(st.first_name,'')||' '||COALESCE(st.last_name,'')),''), va.first_name||' '||va.last_name) AS alumno,
             sv.name AS servicio, c.concept::text AS concepto, c.period AS periodo
      FROM secretaria.payments p
      JOIN secretaria.payment_allocations pa ON pa.payment_id=p.id
      JOIN secretaria.charges c ON c.id=pa.charge_id
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      LEFT JOIN secretaria.v_alumnos_escuela va ON va.mwpanel_student_id=st.mwpanel_student_id
      JOIN secretaria.services sv ON sv.id=e.service_id
      JOIN secretaria.families f ON f.id=st.family_id
      WHERE p.voided_at IS NULL AND p.paid_at BETWEEN $1 AND $2
      UNION ALL
      SELECT to_char(p.paid_at,'YYYY-MM-DD'), p.method::text, p.amount::float, f.display_name, '', '', 'otro', NULL
      FROM secretaria.payments p JOIN secretaria.families f ON f.id=p.family_id
      WHERE p.voided_at IS NULL AND p.paid_at BETWEEN $1 AND $2
        AND NOT EXISTS (SELECT 1 FROM secretaria.payment_allocations pa WHERE pa.payment_id=p.id)
      ORDER BY 1, 4`, [f, t]);

    const wb = XLSX.utils.book_new();

    // --- Hoja 1: Cobros (detalle) ---
    const head = ['Fecha', 'Familia', 'Alumno', 'Servicio', 'Concepto', 'Periodo', 'Método', 'Importe (€)'];
    const body = detail.map((r: any) => [r.fecha, r.familia, r.alumno || '', r.servicio || '',
      CONCEPT_LABEL[r.concepto] || r.concepto, r.periodo || '', METHOD_LABEL[r.metodo] || r.metodo, Number(r.importe)]);
    const total = detail.reduce((a: number, r: any) => a + Number(r.importe), 0);
    const aoa = [
      [`Registro de cobros — del ${f} al ${t}`],
      [],
      head,
      ...body,
      [], ['', '', '', '', '', '', 'TOTAL', Number(total.toFixed(2))],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 9 }, { wch: 14 }, { wch: 12 }];
    // Formato € en la columna de importe (col H = índice 7)
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = 3; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: 7 })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00';
    }
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }) };
    XLSX.utils.book_append_sheet(wb, ws, 'Cobros');

    // Descuento por hermanos REALMENTE aplicado en el rango (registros sibling_discounts aplicados).
    const discRow = await this.ds.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
        FROM secretaria.sibling_discounts
       WHERE status='aplicado' AND applied_at BETWEEN $1 AND $2`, [f, t]);
    const discTotal = Number(discRow[0]?.total || 0);

    // --- Hoja 2: Resumen ---
    const sumBy = (keyFn: (r: any) => string) => {
      const m: Record<string, number> = {};
      for (const r of detail) { const k = keyFn(r) || '—'; m[k] = (m[k] || 0) + Number(r.importe); }
      return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
    };
    const block = (title: string, pairs: [string, number][]) =>
      [[title, ''], ...pairs.map(([k, v]) => [k, Number(v.toFixed(2))]), ['Total', Number(pairs.reduce((a, p) => a + p[1], 0).toFixed(2))], []];
    const resumen = [
      [`Resumen de cobros — del ${f} al ${t}`], [],
      ...block('Por mes', sumBy(r => r.fecha?.slice(0, 7))),
      ...block('Por concepto', sumBy(r => CONCEPT_LABEL[r.concepto] || r.concepto)),
      ...block('Por método de pago', sumBy(r => METHOD_LABEL[r.metodo] || r.metodo)),
      ...block('Por servicio', sumBy(r => r.servicio)),
      ['Descuento por hermanos aplicado', ''],
      [`Descuentos aplicados (${f} a ${t})`, -Number(discTotal.toFixed(2))],
      ['Total cobrado (sin descuento)', Number(total.toFixed(2))],
      ['Total neto (con descuento)', Number((total - discTotal).toFixed(2))],
      [],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(resumen);
    ws2['!cols'] = [{ wch: 26 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="cobros-gestoria-${f}_a_${t}.xlsx"`);
    res.send(buf);
  }
}
