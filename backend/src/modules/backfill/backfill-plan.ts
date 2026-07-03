import { guessGender, genderToRelationship } from '../import/gender';
import { normalizeName } from './backfill-match';

export interface MwGuardianSrc { fullName: string; phone: string | null; email: string | null; isPrimary: boolean }
export interface SecStudentState { birthDate: string | null; address: string | null; notes: string | null }
export interface SecGuardianState { id: string; fullName: string; phone: string | null; email: string | null }
export interface StudentFill { birth_date?: string; address?: string; notes?: string }
export interface StudentFillPlan { fill: StudentFill; wouldFill: string[]; wouldRespect: string[] }

const empty = (v: string | null | undefined) => v === null || v === undefined || String(v).trim() === '';

export function buildStudentFillPlan(
  mw: { birthDate: string | null; address: string | null; enrollmentNumber: string | null },
  sec: SecStudentState | null,
): StudentFillPlan {
  const fill: StudentFill = {};
  const wouldFill: string[] = [];
  const wouldRespect: string[] = [];
  const consider = (label: string, mwVal: string | null, secVal: string | null | undefined, key: keyof StudentFill) => {
    if (empty(mwVal)) return;
    if (sec && !empty(secVal)) { wouldRespect.push(label); return; }
    (fill as any)[key] = mwVal;
    wouldFill.push(label);
  };
  consider('fecha de nacimiento', mw.birthDate, sec?.birthDate, 'birth_date');
  consider('dirección', mw.address, sec?.address, 'address');
  // enrollment → se anexa a notas solo si aporta y no está ya
  if (!empty(mw.enrollmentNumber)) {
    const tag = `Matrícula MW Panel: ${mw.enrollmentNumber}`;
    const existing = sec?.notes || '';
    if (!existing.includes(mw.enrollmentNumber!)) {
      fill.notes = empty(existing) ? tag : `${existing}\n${tag}`;
      wouldFill.push('nº matrícula (notas)');
    }
  }
  return { fill, wouldFill, wouldRespect };
}

export interface GuardianInsert { fullName: string; relationship: 'madre'|'padre'|'tutor'|'otro'; phone: string|null; email: string|null; isPrimary: boolean }
export interface GuardianPlan { toInsert: GuardianInsert[]; toFillPhone: {id:string; phone:string}[]; toFillEmail: {id:string; email:string}[]; addedUnmatched: boolean }

const rel = (fullName: string): 'madre'|'padre'|'tutor'|'otro' => genderToRelationship(guessGender(fullName)) ?? 'tutor';

export function planGuardians(mwGuardians: MwGuardianSrc[], secGuardians: SecGuardianState[] | null): GuardianPlan {
  const plan: GuardianPlan = { toInsert: [], toFillPhone: [], toFillEmail: [], addedUnmatched: false };
  if (secGuardians === null || secGuardians.length === 0) {
    plan.toInsert = mwGuardians.map(g => ({ fullName: g.fullName, relationship: rel(g.fullName), phone: g.phone, email: g.email, isPrimary: g.isPrimary }));
    return plan;
  }
  const secByName = new Map<string, SecGuardianState>();
  for (const s of secGuardians) secByName.set(normalizeName(s.fullName, ''), s);
  for (const g of mwGuardians) {
    const match = secByName.get(normalizeName(g.fullName, ''));
    if (!match) {
      // La familia ya tiene tutores: no añadimos no-casados (serían duplicados casi seguros).
      continue;
    }
    if (empty(match.phone) && !empty(g.phone)) plan.toFillPhone.push({ id: match.id, phone: g.phone! });
    if (empty(match.email) && !empty(g.email)) plan.toFillEmail.push({ id: match.id, email: g.email! });
  }
  return plan;
}

export function computePendingFields(
  finalBirthDate: string | null, finalAddress: string | null,
  guardianCount: number, anyGuardianHasPhone: boolean, addedUnmatched: boolean,
): string[] {
  const out: string[] = [];
  if (empty(finalBirthDate)) out.push('sin fecha de nacimiento');
  if (empty(finalAddress)) out.push('sin dirección');
  if (guardianCount === 0) out.push('sin tutores');
  else if (!anyGuardianHasPhone) out.push('tutor sin teléfono');
  if (addedUnmatched) out.push('tutor añadido, verificar');
  return out;
}
