import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';

const CRYPTO_KEY = process.env.SECRETARIA_CRYPTO_KEY || '';

// ---- Validación de IBAN (mod-97 ISO 13616) ----
function normalizeIban(raw: string): string { return (raw || '').replace(/\s+/g, '').toUpperCase(); }
function isValidIban(raw: string): boolean {
  const s = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearr = s.slice(4) + s.slice(0, 4);
  const expanded = rearr.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
  let rem = 0;
  for (const ch of expanded) rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  return rem === 1;
}
function xml(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function money(n: any): string { return Number(n).toFixed(2); }

class BankAccountDto {
  @IsString() iban: string;
  @IsOptional() @IsString() holderName?: string;
  @IsOptional() @IsString() mandateRef?: string;
  @IsOptional() @IsDateString() mandateDate?: string;
}
class SettingsDto {
  @IsOptional() @IsString() creditorName?: string;
  @IsOptional() @IsString() creditorIban?: string;
  @IsOptional() @IsString() creditorBic?: string;
  @IsOptional() @IsString() creditorId?: string;
}
class CreateBatchDto {
  @IsDateString() chargeDate: string;
  @IsOptional() @IsString() conceptTemplate?: string;
  @IsOptional() @IsUUID() academicYearId?: string;
  @IsOptional() @IsUUID() serviceId?: string;
}

@Controller('secretaria/sepa')
@UseGuards(SecretariaAuthGuard)
export class SepaController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  private async activeYearId(): Promise<string | undefined> {
    const y = await this.ds.query(`SELECT id FROM secretaria.academic_years WHERE is_active=true LIMIT 1`);
    return y[0]?.id;
  }

  // ---------------- Configuración del acreedor ----------------
  @Get('settings') @Roles('secretaria_admin','secretaria_staff','direccion')
  async getSettings() {
    const rows = await this.ds.query(`SELECT key, value FROM secretaria.org_settings WHERE key LIKE 'creditor_%'`);
    const m: any = {}; for (const r of rows) m[r.key] = r.value;
    return { creditorName: m.creditor_name || '', creditorIban: m.creditor_iban || '', creditorBic: m.creditor_bic || '', creditorId: m.creditor_id || '' };
  }

  @Put('settings') @Roles('secretaria_admin')
  async putSettings(@Body() b: SettingsDto) {
    if (b.creditorIban && !isValidIban(b.creditorIban)) throw new BadRequestException('IBAN del acreedor no válido');
    const map: [string, any][] = [
      ['creditor_name', b.creditorName], ['creditor_iban', b.creditorIban ? normalizeIban(b.creditorIban) : b.creditorIban],
      ['creditor_bic', b.creditorBic], ['creditor_id', b.creditorId],
    ];
    for (const [k, v] of map) {
      if (v === undefined) continue;
      await this.ds.query(`INSERT INTO secretaria.org_settings(key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2`, [k, v]);
    }
    return this.getSettings();
  }

  // ---------------- Cuentas bancarias / mandatos por familia ----------------
  @Get('families/:familyId/bank-accounts') @Roles('secretaria_admin','secretaria_staff','direccion')
  bankAccounts(@Param('familyId') familyId: string) {
    return this.ds.query(`
      SELECT id, holder_name AS "holderName", iban_last4 AS "ibanLast4",
             sepa_mandate_ref AS "mandateRef", sepa_mandate_date AS "mandateDate", is_active AS "isActive", created_at AS "createdAt"
      FROM secretaria.bank_accounts WHERE family_id=$1 ORDER BY created_at DESC`, [familyId]);
  }

  @Post('families/:familyId/bank-accounts') @Roles('secretaria_admin','secretaria_staff')
  async addBankAccount(@Param('familyId') familyId: string, @Body() b: BankAccountDto) {
    if (!CRYPTO_KEY) throw new BadRequestException('Falta SECRETARIA_CRYPTO_KEY en el servidor');
    const iban = normalizeIban(b.iban);
    if (!isValidIban(iban)) throw new BadRequestException('IBAN no válido');
    const last4 = iban.slice(-4);
    const id = await this.ds.transaction(async (m) => {
      await m.query(
        `UPDATE secretaria.bank_accounts SET is_active=false WHERE family_id=$1::uuid AND student_id IS NULL AND is_active`,
        [familyId]);
      const r = await m.query(`
        INSERT INTO secretaria.bank_accounts(family_id, iban_encrypted, iban_last4, holder_name, sepa_mandate_ref, sepa_mandate_date, is_active)
        VALUES ($1::uuid, pgp_sym_encrypt($2,$3), $4, $5,
                COALESCE($6, 'MAND-'||substr(replace($1::text,'-',''),1,8)||'-'||to_char(now(),'YYYYMMDD')),
                COALESCE($7::date, now()::date), true) RETURNING id`,
        [familyId, iban, CRYPTO_KEY, last4, b.holderName || null, b.mandateRef || null, b.mandateDate || null]);
      return r[0].id;
    });
    return { ok: true, id, ibanLast4: last4 };
  }

  @Delete('bank-accounts/:id') @Roles('secretaria_admin','secretaria_staff')
  async deactivateBankAccount(@Param('id') id: string) {
    await this.ds.query(`UPDATE secretaria.bank_accounts SET is_active=false WHERE id=$1`, [id]);
    return { ok: true };
  }

  // ---------------- Remesas SEPA ----------------
  @Get('batches') @Roles('secretaria_admin','secretaria_staff','direccion')
  batches() {
    return this.ds.query(`
      SELECT b.id, b.charge_date AS "chargeDate", b.concept_template AS "conceptTemplate", b.status, b.totals, b.created_at AS "createdAt",
             (SELECT count(*) FROM secretaria.sepa_batch_items i WHERE i.batch_id=b.id) AS "itemCount"
      FROM secretaria.sepa_batches b ORDER BY b.created_at DESC`);
  }

  @Get('batches/:id') @Roles('secretaria_admin','secretaria_staff','direccion')
  async batch(@Param('id') id: string) {
    const b = await this.ds.query(`SELECT id, charge_date AS "chargeDate", concept_template AS "conceptTemplate", status, totals, created_at AS "createdAt" FROM secretaria.sepa_batches WHERE id=$1`, [id]);
    if (!b[0]) throw new BadRequestException('Remesa no encontrada');
    const items = await this.ds.query(`
      SELECT i.id, i.amount, i.end_to_end_ref AS "endToEndRef", i.sequence_type AS "sequenceType", i.status,
             f.display_name AS "familyName", ba.iban_last4 AS "ibanLast4", ba.holder_name AS "holderName"
      FROM secretaria.sepa_batch_items i
      JOIN secretaria.families f ON f.id=i.family_id
      LEFT JOIN secretaria.bank_accounts ba ON ba.id=i.bank_account_id
      WHERE i.batch_id=$1 ORDER BY f.display_name`, [id]);
    return { ...b[0], items };
  }

  // Crea una remesa con los recibos PENDIENTES (sin remesa) de familias con cuenta+mandato.
  @Post('batches') @Roles('secretaria_admin','secretaria_staff')
  async createBatch(@Body() b: CreateBatchDto) {
    const yearId = b.academicYearId || (await this.activeYearId());
    const groups = await this.ds.query(`
      SELECT st.family_id AS "familyId", f.display_name AS "familyName", ba.id AS "bankAccountId",
             sum(c.amount_due) AS amount, array_agg(c.id) AS "chargeIds"
      FROM secretaria.charges c
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      JOIN secretaria.families f ON f.id=st.family_id
      JOIN LATERAL (
        SELECT bk.id FROM secretaria.bank_accounts bk
        WHERE bk.family_id=st.family_id AND bk.is_active AND bk.student_id IS NULL AND bk.sepa_mandate_ref IS NOT NULL
        ORDER BY bk.created_at DESC LIMIT 1
      ) ba ON true
      WHERE e.academic_year_id=$1 AND c.status='pendiente' AND c.sepa_batch_id IS NULL
        AND e.status='matriculado'  -- no domiciliar reservas de preinscritos/lista de espera
        AND ($2::uuid IS NULL OR e.service_id=$2::uuid)
      GROUP BY st.family_id, f.display_name, ba.id`, [yearId, b.serviceId || null]);

    if (!groups.length) return { ok: false, error: 'No hay recibos domiciliables pendientes (¿faltan cuentas bancarias con mandato?)' };

    const batch = await this.ds.query(
      `INSERT INTO secretaria.sepa_batches(charge_date, concept_template, status) VALUES ($1,$2,'borrador') RETURNING id`,
      [b.chargeDate, b.conceptTemplate || null]);
    const batchId = batch[0].id;

    let count = 0; let sum = 0;
    for (const g of groups) {
      const prior = await this.ds.query(`SELECT 1 FROM secretaria.sepa_batch_items WHERE bank_account_id=$1 LIMIT 1`, [g.bankAccountId]);
      const seq = prior.length ? 'RCUR' : 'FRST';
      const e2e = `${batchId.slice(0, 8)}-${g.familyId.slice(0, 8)}`;
      await this.ds.query(
        `INSERT INTO secretaria.sepa_batch_items(batch_id, family_id, bank_account_id, amount, end_to_end_ref, sequence_type, status)
         VALUES ($1,$2,$3,$4,$5,$6,'incluida')`,
        [batchId, g.familyId, g.bankAccountId, g.amount, e2e, seq]);
      await this.ds.query(`UPDATE secretaria.charges SET sepa_batch_id=$1 WHERE id = ANY($2::uuid[])`, [batchId, g.chargeIds]);
      count++; sum += Number(g.amount);
    }
    await this.ds.query(`UPDATE secretaria.sepa_batches SET totals=$2 WHERE id=$1`, [batchId, JSON.stringify({ count, sum: Number(sum.toFixed(2)) })]);
    return { ok: true, batchId, count, sum: Number(sum.toFixed(2)) };
  }

  // Descarga del fichero pain.008.001.02
  @Get('batches/:id/xml') @Roles('secretaria_admin','secretaria_staff','direccion')
  async batchXml(@Param('id') id: string, @Res() res: any) {
    const cfg = await this.getSettings();
    if (!cfg.creditorName || !cfg.creditorIban || !cfg.creditorId) {
      throw new BadRequestException('Configura el acreedor (nombre, IBAN e identificador SEPA) en Configuración antes de generar el fichero');
    }
    const b = await this.ds.query(`SELECT id, charge_date AS "chargeDate", concept_template AS "conceptTemplate", status FROM secretaria.sepa_batches WHERE id=$1`, [id]);
    if (!b[0]) throw new BadRequestException('Remesa no encontrada');
    const items = await this.ds.query(`
      SELECT i.amount, i.end_to_end_ref AS "endToEndRef", i.sequence_type AS "sequenceType",
             ba.sepa_mandate_ref AS "mandateRef", ba.sepa_mandate_date AS "mandateDate", ba.holder_name AS "holderName",
             pgp_sym_decrypt(ba.iban_encrypted, $2) AS iban, f.display_name AS "familyName"
      FROM secretaria.sepa_batch_items i
      JOIN secretaria.bank_accounts ba ON ba.id=i.bank_account_id
      JOIN secretaria.families f ON f.id=i.family_id
      WHERE i.batch_id=$1 ORDER BY i.sequence_type, f.display_name`, [id, CRYPTO_KEY]);
    if (!items.length) throw new BadRequestException('La remesa no tiene apuntes');

    const msgId = `MW-${id.slice(0, 8)}-${Date.now()}`;
    const creDtTm = new Date().toISOString().slice(0, 19);
    const reqDt = String(b[0].chargeDate).slice(0, 10);
    const nbTotal = items.length;
    const ctrlTotal = money(items.reduce((a: number, it: any) => a + Number(it.amount), 0));

    // Agrupar por tipo de secuencia (FRST/RCUR) en bloques PmtInf separados (requisito AEB 19.14)
    const bySeq: Record<string, any[]> = {};
    for (const it of items) { (bySeq[it.sequenceType] = bySeq[it.sequenceType] || []).push(it); }

    const pmtInfBlocks = Object.entries(bySeq).map(([seq, its], idx) => {
      const nb = its.length;
      const ctrl = money(its.reduce((a, it) => a + Number(it.amount), 0));
      const txs = its.map((it: any) => {
        const concept = b[0].conceptTemplate ? `${b[0].conceptTemplate}` : `Cuota ${it.familyName}`;
        return `      <DrctDbtTxInf>
        <PmtId><EndToEndId>${xml(it.endToEndRef)}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${money(it.amount)}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>${xml(it.mandateRef)}</MndtId><DtOfSgntr>${String(it.mandateDate).slice(0, 10)}</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>
        <Dbtr><Nm>${xml(it.holderName || it.familyName)}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${xml(normalizeIban(it.iban))}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${xml(concept)}</Ustrd></RmtInf>
      </DrctDbtTxInf>`;
      }).join('\n');
      return `    <PmtInf>
      <PmtInfId>${xml(msgId)}-${idx}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${nb}</NbOfTxs>
      <CtrlSum>${ctrl}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>${seq}</SeqTp></PmtTpInf>
      <ReqdColltnDt>${reqDt}</ReqdColltnDt>
      <Cdtr><Nm>${xml(cfg.creditorName)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${xml(normalizeIban(cfg.creditorIban))}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId>${cfg.creditorBic ? `<BIC>${xml(cfg.creditorBic)}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}</FinInstnId></CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${xml(cfg.creditorId)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>
${txs}
    </PmtInf>`;
    }).join('\n');

    const doc = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xml(msgId)}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${nbTotal}</NbOfTxs>
      <CtrlSum>${ctrlTotal}</CtrlSum>
      <InitgPty><Nm>${xml(cfg.creditorName)}</Nm></InitgPty>
    </GrpHdr>
${pmtInfBlocks}
  </CstmrDrctDbtInitn>
</Document>
`;
    await this.ds.query(`UPDATE secretaria.sepa_batches SET status='generada' WHERE id=$1 AND status='borrador'`, [id]);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="remesa-${reqDt}-${id.slice(0, 8)}.xml"`);
    res.send(doc);
  }

  // Confirma el cobro de la remesa: marca recibos pagados (método domiciliación) y la remesa como procesada.
  @Post('batches/:id/confirm') @Roles('secretaria_admin','secretaria_staff')
  async confirmBatch(@Param('id') id: string) {
    const charges = await this.ds.query(`
      SELECT c.id, c.amount_due, st.family_id
      FROM secretaria.charges c
      JOIN secretaria.enrollments e ON e.id=c.enrollment_id
      JOIN secretaria.students st ON st.id=e.student_id
      WHERE c.sepa_batch_id=$1 AND c.status='pendiente'`, [id]);
    const b = await this.ds.query(`SELECT charge_date FROM secretaria.sepa_batches WHERE id=$1`, [id]);
    const paidAt = b[0] ? String(b[0].charge_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    let paid = 0;
    for (const c of charges) {
      const pay = await this.ds.query(`INSERT INTO secretaria.payments(family_id, amount, paid_at, method) VALUES ($1,$2,$3,'domiciliacion') RETURNING id`, [c.family_id, c.amount_due, paidAt]);
      await this.ds.query(`INSERT INTO secretaria.payment_allocations(payment_id, charge_id, amount) VALUES ($1,$2,$3)`, [pay[0].id, c.id, c.amount_due]);
      await this.ds.query(`UPDATE secretaria.charges SET status='pagado' WHERE id=$1`, [c.id]);
      paid++;
    }
    await this.ds.query(`UPDATE secretaria.sepa_batches SET status='procesada' WHERE id=$1`, [id]);
    return { ok: true, paid };
  }

  // Elimina una remesa en borrador y libera sus recibos
  @Delete('batches/:id') @Roles('secretaria_admin','secretaria_staff')
  async deleteBatch(@Param('id') id: string) {
    const b = await this.ds.query(`SELECT status FROM secretaria.sepa_batches WHERE id=$1`, [id]);
    if (!b[0]) throw new BadRequestException('Remesa no encontrada');
    if (b[0].status === 'procesada') throw new BadRequestException('No se puede borrar una remesa ya procesada');
    await this.ds.query(`UPDATE secretaria.charges SET sepa_batch_id=NULL WHERE sepa_batch_id=$1`, [id]);
    await this.ds.query(`DELETE FROM secretaria.sepa_batch_items WHERE batch_id=$1`, [id]);
    await this.ds.query(`DELETE FROM secretaria.sepa_batches WHERE id=$1`, [id]);
    return { ok: true };
  }
}
