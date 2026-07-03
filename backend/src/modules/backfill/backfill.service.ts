// backfill.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { readActiveMwStudents, readUnlinkedSecretariaStudents, MwStudentSrc } from './mwpanel-source';
import { classifyStudents, MatchResult } from './backfill-match';
import { buildStudentFillPlan, planGuardians, computePendingFields, SecStudentState, SecGuardianState } from './backfill-plan';

export interface PreviewRow {
  mwStudentId: string; firstName: string; lastName: string; birthDate: string | null;
  category: 'reliable' | 'dubious' | 'new';
  targetSecretariaId?: string; birthDateMismatch?: boolean;
  candidates?: { secretariaId: string; birthDateMismatch: boolean }[];
  wouldFill: string[]; wouldRespect: string[]; pendingAfter: string[];
}

export interface Decision { mwStudentId: string; action: 'link' | 'create' | 'skip'; targetSecretariaId?: string }

@Injectable()
export class BackfillService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async secStateFor(studentId: string): Promise<{ student: SecStudentState; guardians: SecGuardianState[] }> {
    const s = (await this.ds.query(
      `SELECT to_char(birth_date,'YYYY-MM-DD') AS "birthDate", NULLIF(address,'') AS address, notes, family_id
       FROM secretaria.students WHERE id=$1`, [studentId]))[0];
    const guardians = s?.family_id ? await this.ds.query(
      `SELECT id, full_name AS "fullName", NULLIF(phone,'') AS phone, email FROM secretaria.guardians WHERE family_id=$1`, [s.family_id]) : [];
    return { student: { birthDate: s?.birthDate ?? null, address: s?.address ?? null, notes: s?.notes ?? null }, guardians };
  }

  private async buildRow(mw: MwStudentSrc, mr: MatchResult): Promise<PreviewRow> {
    const base: PreviewRow = {
      mwStudentId: mw.mwStudentId, firstName: mw.firstName, lastName: mw.lastName, birthDate: mw.birthDate,
      category: mr.category, wouldFill: [], wouldRespect: [], pendingAfter: [],
    };
    if (mr.category === 'dubious') { base.candidates = mr.candidates; return base; }

    const linkedId = mr.category === 'reliable' ? mr.target!.secretariaId : null;
    base.targetSecretariaId = linkedId ?? undefined;
    base.birthDateMismatch = mr.category === 'reliable' ? mr.target!.birthDateMismatch : undefined;

    const secState = linkedId ? await this.secStateFor(linkedId) : null;
    const sp = buildStudentFillPlan(mw, secState ? secState.student : null);
    const gp = planGuardians(mw.guardians, secState ? secState.guardians : null);
    base.wouldFill = [...sp.wouldFill, ...(gp.toInsert.length ? [`${gp.toInsert.length} tutor(es)`] : []), ...(gp.toFillPhone.length ? ['teléfono de tutor'] : [])];
    base.wouldRespect = sp.wouldRespect;

    const finalBirth = secState && secState.student.birthDate ? secState.student.birthDate : (sp.fill.birth_date ?? null);
    const finalAddr = secState && secState.student.address ? secState.student.address : (sp.fill.address ?? null);
    const guardiansPhoneAfter = [...(secState?.guardians || []).map(g => g.phone), ...gp.toInsert.map(g => g.phone), ...gp.toFillPhone.map(() => 'x')];
    const guardianCount = (secState?.guardians.length || 0) + gp.toInsert.length;
    base.pendingAfter = computePendingFields(finalBirth, finalAddr, guardianCount, guardiansPhoneAfter.some(p => !!p && String(p).trim() !== ''), gp.addedUnmatched);
    return base;
  }

  async preview() {
    const [mwStudents, secStudents] = await Promise.all([readActiveMwStudents(this.ds), readUnlinkedSecretariaStudents(this.ds)]);
    const results = classifyStudents(
      mwStudents.map(m => ({ mwStudentId: m.mwStudentId, firstName: m.firstName, lastName: m.lastName, birthDate: m.birthDate })),
      secStudents.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate })),
    );
    const byId = new Map(mwStudents.map(m => [m.mwStudentId, m]));
    const rows = await Promise.all(results.map(mr => this.buildRow(byId.get(mr.mwStudentId)!, mr)));
    const reliable = rows.filter(r => r.category === 'reliable');
    const dubious = rows.filter(r => r.category === 'dubious');
    const neu = rows.filter(r => r.category === 'new');
    return { reliable, dubious, new: neu, counts: { reliable: reliable.length, dubious: dubious.length, new: neu.length } };
  }

  async apply(decisions: Decision[]): Promise<{ linked: number; created: number; pending: number; errors: {mwStudentId:string; message:string}[] }> {
    if (!Array.isArray(decisions)) throw new BadRequestException('decisions debe ser un array');
    const mwStudents = await readActiveMwStudents(this.ds);
    const byId = new Map(mwStudents.map(m => [m.mwStudentId, m]));
    let linked = 0, created = 0, pending = 0;
    const errors: {mwStudentId:string; message:string}[] = [];

    for (const d of decisions) {
      if (d.action === 'skip') continue;
      const mw = byId.get(d.mwStudentId);
      if (!mw) { errors.push({ mwStudentId: d.mwStudentId, message: 'Alumno MW Panel no encontrado o inactivo' }); continue; }
      try {
        const res = await this.ds.transaction(async (m) => {
          if (d.action === 'link') {
            if (!d.targetSecretariaId) throw new Error('Falta targetSecretariaId para vincular');
            return this.applyLink(m, mw, d.targetSecretariaId);
          }
          return this.applyCreate(m, mw);
        });
        if (res.created) created++; else linked++;
        if (res.pending) pending++;
      } catch (e: any) {
        errors.push({ mwStudentId: d.mwStudentId, message: e?.message || 'Error al aplicar' });
      }
    }
    return { linked, created, pending, errors };
  }

  private async applyLink(m: any, mw: MwStudentSrc, targetId: string): Promise<{ created: boolean; pending: boolean }> {
    const secState = await this.secStateForTx(m, targetId);
    const sp = buildStudentFillPlan(mw, secState.student);
    // 1) rellenar campos de alumno solo-si-vacío + fijar enlace
    await m.query(
      `UPDATE secretaria.students SET
         birth_date = COALESCE(birth_date, $2::date),
         address    = COALESCE(NULLIF(address,''), $3),
         notes      = COALESCE($4, notes),
         mwpanel_student_id = $5
       WHERE id = $1`,
      [targetId, sp.fill.birth_date ?? null, sp.fill.address ?? null, sp.fill.notes ?? null, mw.mwStudentId],
    );
    // 2) tutores: rellenar huecos + insertar no casados
    const familyId = (await m.query(`SELECT family_id FROM secretaria.students WHERE id=$1`, [targetId]))[0]?.family_id;
    const gp = planGuardians(mw.guardians, secState.guardians);
    if (familyId) {
      for (const f of gp.toFillPhone) await m.query(`UPDATE secretaria.guardians SET phone=$2 WHERE id=$1 AND NULLIF(phone,'') IS NULL`, [f.id, f.phone]);
      for (const f of gp.toFillEmail) await m.query(`UPDATE secretaria.guardians SET email=$2 WHERE id=$1 AND NULLIF(email,'') IS NULL`, [f.id, f.email]);
      for (const g of gp.toInsert) await m.query(
        `INSERT INTO secretaria.guardians(family_id, full_name, relationship, phone, email, is_primary_contact)
         VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6)`,
        [familyId, g.fullName, g.relationship, g.phone, g.email, g.isPrimary]);
    }
    // 3) recomputar estado final para pendientes
    const pend = await this.markPending(m, targetId, familyId, gp.addedUnmatched);
    return { created: false, pending: pend };
  }

  private async applyCreate(m: any, mw: MwStudentSrc): Promise<{ created: boolean; pending: boolean }> {
    // familia
    const familyId = (await m.query(
      `INSERT INTO secretaria.families(display_name, mwpanel_family_id) VALUES ($1, NULL) RETURNING id`,
      [mw.lastName || 'Familia'],
    ))[0].id;
    const gp = planGuardians(mw.guardians, null);
    for (const g of gp.toInsert) await m.query(
      `INSERT INTO secretaria.guardians(family_id, full_name, relationship, phone, email, is_primary_contact)
       VALUES ($1,$2,$3::secretaria.guardian_relationship,$4,$5,$6)`,
      [familyId, g.fullName, g.relationship, g.phone, g.email, g.isPrimary]);
    const sp = buildStudentFillPlan(mw, null);
    const studentId = (await m.query(
      `INSERT INTO secretaria.students(family_id, first_name, last_name, birth_date, address, notes, is_active, mwpanel_student_id)
       VALUES ($1,$2,$3,$4::date,$5,$6,true,$7) RETURNING id`,
      [familyId, mw.firstName, mw.lastName, sp.fill.birth_date ?? null, sp.fill.address ?? null, sp.fill.notes ?? null, mw.mwStudentId],
    ))[0].id;
    const pend = await this.markPending(m, studentId, familyId, false);
    return { created: true, pending: pend };
  }

  private async secStateForTx(m: any, studentId: string): Promise<{ student: SecStudentState; guardians: SecGuardianState[] }> {
    const s = (await m.query(
      `SELECT to_char(birth_date,'YYYY-MM-DD') AS "birthDate", NULLIF(address,'') AS address, notes, family_id
       FROM secretaria.students WHERE id=$1`, [studentId]))[0];
    const guardians = s?.family_id ? await m.query(
      `SELECT id, full_name AS "fullName", NULLIF(phone,'') AS phone, email FROM secretaria.guardians WHERE family_id=$1`, [s.family_id]) : [];
    return { student: { birthDate: s?.birthDate ?? null, address: s?.address ?? null, notes: s?.notes ?? null }, guardians };
  }

  private async markPending(m: any, studentId: string, familyId: string | null, addedUnmatched: boolean): Promise<boolean> {
    const s = (await m.query(`SELECT to_char(birth_date,'YYYY-MM-DD') AS b, NULLIF(address,'') AS a FROM secretaria.students WHERE id=$1`, [studentId]))[0];
    const g = familyId ? await m.query(`SELECT count(*)::int AS n, count(NULLIF(phone,''))::int AS withphone FROM secretaria.guardians WHERE family_id=$1`, [familyId]) : [{ n: 0, withphone: 0 }];
    const fields = computePendingFields(s?.b ?? null, s?.a ?? null, g[0].n, g[0].withphone > 0, addedUnmatched);
    await m.query(`UPDATE secretaria.students SET import_pending=$2, import_pending_fields=$3 WHERE id=$1`,
      [studentId, fields.length > 0, fields.length ? fields.join('; ') : null]);
    return fields.length > 0;
  }
}
