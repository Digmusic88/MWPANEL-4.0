export function normalizeName(first: string, last: string): string {
  return `${first || ''} ${last || ''}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export interface MatchCandidate { secretariaId: string; birthDateMismatch: boolean }
export interface MwLite { mwStudentId: string; firstName: string; lastName: string; birthDate: string | null }
export interface SecLite { id: string; firstName: string; lastName: string; birthDate: string | null }
export interface MatchResult {
  mwStudentId: string;
  category: 'reliable' | 'dubious' | 'new';
  target?: MatchCandidate;
  candidates?: MatchCandidate[];
}

function mismatch(a: string | null, b: string | null): boolean {
  return !!a && !!b && a !== b;
}

export function classifyStudents(mw: MwLite[], sec: SecLite[]): MatchResult[] {
  // índice Secretaría: nombre normalizado → lista de SecLite
  const secByName = new Map<string, SecLite[]>();
  for (const s of sec) {
    const k = normalizeName(s.firstName, s.lastName);
    (secByName.get(k) || secByName.set(k, []).get(k)!).push(s);
  }
  // homónimos dentro de MW Panel
  const mwNameCount = new Map<string, number>();
  for (const m of mw) {
    const k = normalizeName(m.firstName, m.lastName);
    mwNameCount.set(k, (mwNameCount.get(k) || 0) + 1);
  }

  return mw.map((m) => {
    const k = normalizeName(m.firstName, m.lastName);
    const secMatches = secByName.get(k) || [];
    const toCand = (s: SecLite): MatchCandidate => ({ secretariaId: s.id, birthDateMismatch: mismatch(m.birthDate, s.birthDate) });

    if ((mwNameCount.get(k) || 0) > 1) {
      return { mwStudentId: m.mwStudentId, category: 'dubious', candidates: secMatches.map(toCand) };
    }
    if (secMatches.length === 0) return { mwStudentId: m.mwStudentId, category: 'new' };
    if (secMatches.length === 1) return { mwStudentId: m.mwStudentId, category: 'reliable', target: toCand(secMatches[0]) };
    return { mwStudentId: m.mwStudentId, category: 'dubious', candidates: secMatches.map(toCand) };
  });
}
