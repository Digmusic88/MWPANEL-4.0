// backfill.service.ts
import { Injectable } from '@nestjs/common';
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
}
