// Parser del Excel "Datos y Pagos 25-26 OFICIAL". Solo transforma; no toca BD.
import * as XLSX from 'xlsx';

const clean = (v: any) => (v === undefined || v === null ? '' : String(v).trim());
export const norm = (s: any) => clean(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const serialToDate = (n: any): string | null => {
  // Serial Excel plausible (≈1920–2120). Evita teléfonos u otros números grandes.
  if (typeof n !== 'number' || n <= 7000 || n > 80000) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const isName = (s: string) => !!s && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(s) && s.split(' ').length >= 2 && !/fecha|nombre|edad|colegio|^ap\b/i.test(s);

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const wa = a.split(' ').filter(Boolean).sort();
  const wb = b.split(' ').filter(Boolean).sort();
  if (wa.join(' ') === wb.join(' ')) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ---- Config por hoja de roster ----
const ROSTERS: any[] = [
  { svc: 'INGLES', sheet: 'INGLES 25-26', grouped: true, marker: 2, groupCol: 0, name: 1, birth: 2, school: 4, grade: 5, mother: 6, father: 7, addr: 8, postal: 9, ph1: 10, ph2: 11, fotos: 12, salida: 13, bajaStart: 'Dario Gonzales Montori' },
  { svc: 'APOYO', sheet: 'APOYO', grouped: true, marker: 2, groupCol: 1, name: 1, birth: 2, school: 4, grade: 5, mother: 6, father: 7, addr: 8, postal: 9, ph1: 10, ph2: 11, fotos: 12, salida: 13, bajaStart: 'Azman Chiaa Mansur' },
  { svc: 'DANZA', sheet: 'DANZA 25-26', grouped: false, marker: 4, name: 3, birth: 4, school: 6, grade: 7, mother: 8, father: 9, addr: 10, postal: null, ph1: 12, ph2: null, bajaStart: 'Sofía Chueca Rubio' },
  { svc: 'ESCUELA', sheet: 'ESC.ALT.', grouped: false, marker: 4, name: 1, birth: 4, school: null, grade: 6, mother: 7, father: 8, addr: 9, postal: 10, ph1: 11, ph2: 12, fotos: 2, email: 13, bajaStart: 'Lorea Mariñelarena Pérez' },
];

// ---- Config por hoja de pagos: columnas → {concept, period} ----
const PAYS: any = {
  INGLES: { sheet: 'P I 25-26', name: 1, cells: [[2, 'matricula', null], [3, 'mensualidad', '2025-09'], [4, 'mensualidad', '2025-10'], [5, 'mensualidad', '2025-11'], [6, 'mensualidad', '2025-12'], [7, 'mensualidad', '2026-01'], [8, 'mensualidad', '2026-02'], [9, 'mensualidad', '2026-03'], [10, 'mensualidad', '2026-04'], [11, 'mensualidad', '2026-05'], [12, 'mensualidad', '2026-06']] },
  APOYO: { sheet: 'PA25-26', name: 1, cells: [[2, 'matricula', null], [3, 'mensualidad', '2025-09'], [4, 'mensualidad', '2025-10'], [5, 'mensualidad', '2025-11'], [6, 'mensualidad', '2025-12'], [7, 'mensualidad', '2026-01'], [8, 'mensualidad', '2026-02'], [9, 'mensualidad', '2026-03'], [10, 'mensualidad', '2026-04'], [11, 'mensualidad', '2026-05'], [12, 'mensualidad', '2026-06']] },
  DANZA: { sheet: 'PD25-26', name: 2, cells: [[3, 'matricula', null], [4, 'mensualidad', '2025-09'], [5, 'mensualidad', '2025-10'], [6, 'mensualidad', '2025-11'], [7, 'mensualidad', '2025-12'], [8, 'mensualidad', '2026-01'], [9, 'mensualidad', '2026-02'], [10, 'mensualidad', '2026-03'], [11, 'mensualidad', '2026-04'], [12, 'mensualidad', '2026-05'], [13, 'mensualidad', '2026-06']] },
  ESCUELA: { sheet: 'PEs25-26', name: 1, cells: [[2, 'matricula', null], [3, 'material', null], [4, 'mensualidad', '2025-08'], [5, 'mensualidad', '2025-09'], [6, 'mensualidad', '2025-10'], [7, 'mensualidad', '2025-11'], [8, 'mensualidad', '2025-12'], [9, 'mensualidad', '2026-01'], [10, 'mensualidad', '2026-02'], [11, 'mensualidad', '2026-03'], [12, 'mensualidad', '2026-04'], [13, 'mensualidad', '2026-05']] },
};

export interface FuzzyMatch {
  svc: string;
  paymentName: string;
  rosterName: string;
  similarity: number;
}

export interface ReviewItem {
  svc: string;
  paymentName: string;
  candidates: { name: string; similarity: number }[];
}

export interface ParsedStudent {
  svc: string; name: string; birth: string | null; school: string; grade: string;
  mother: string; father: string; phone1: string; phone2: string; email: string;
  photo: boolean; exit: boolean; group: string | null; isBaja: boolean;
  payments: { concept: string; period: string | null; paidAt: string | null; exento: boolean }[];
}

export function parseWorkbook(
  buf: Buffer,
  mappings?: Record<string, Record<string, string>>,
): { students: ParsedStudent[]; warnings: string[]; fuzzyMatched: FuzzyMatch[]; needsReview: ReviewItem[] } {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const warnings: string[] = [];
  const all: ParsedStudent[] = [];
  const fuzzyMatched: FuzzyMatch[] = [];
  const needsReview: ReviewItem[] = [];

  for (const c of ROSTERS) {
    const ws = wb.Sheets[c.sheet];
    if (!ws) { warnings.push(`Falta la hoja de listado "${c.sheet}" (${c.svc})`); continue; }
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    let group: string | null = c.grouped ? null : null;
    let baja = false;
    const bajaNorm = norm(c.bajaStart);
    const byName: Record<string, ParsedStudent> = {};
    let foundBaja = false;
    for (const r of rows) {
      // Una cabecera de grupo actualiza el grupo actual, pero NO reactiva: por debajo del
      // marcador de bajas, todo son bajas aunque aparezca una cabecera de grupo (estuvieron
      // en ese grupo pero siguen de baja).
      if (clean(r[c.marker]).toLowerCase().startsWith('fecha nac')) { if (c.grouped && !baja) group = clean(r[c.groupCol]) || group; continue; }
      const name = clean(r[c.name]);
      if (!isName(name)) continue;
      if (!baja && norm(name) === bajaNorm) { baja = true; foundBaja = true; }
      const st: ParsedStudent = {
        svc: c.svc, name, birth: serialToDate(r[c.birth]),
        school: c.school != null ? clean(r[c.school]) : '', grade: clean(r[c.grade]),
        mother: clean(r[c.mother]), father: clean(r[c.father]),
        phone1: clean(r[c.ph1]), phone2: c.ph2 != null ? clean(r[c.ph2]) : '',
        email: c.email != null ? clean(r[c.email]) : '',
        photo: c.fotos != null ? /^s/i.test(clean(r[c.fotos])) : false,
        exit: c.salida != null ? /^s/i.test(clean(r[c.salida])) : false,
        group: baja ? null : group, isBaja: baja, payments: [],
      };
      // Evita filas-basura de las zonas de baja: exige fecha de nacimiento o teléfono real.
      const hasPhone = /\d{6,}/.test(st.phone1) || /\d{6,}/.test(st.phone2);
      if (!st.birth && !hasPhone) continue;
      all.push(st);
      byName[norm(name)] = st;
    }
    if (!foundBaja) warnings.push(`${c.svc}: no encontré el alumno de inicio de bajas "${c.bajaStart}" (todos quedan como matriculados)`);

    // Pagos de este servicio
    const pc = PAYS[c.svc];
    const pw = pc && wb.Sheets[pc.sheet];
    if (!pw) { warnings.push(`Falta la hoja de pagos "${pc?.sheet}" (${c.svc})`); continue; }
    const prows: any[][] = XLSX.utils.sheet_to_json(pw, { header: 1, blankrows: false, defval: '' });

    // Inyectar mappings manuales: norm(paymentName) → ParsedStudent
    const svcMappings: Record<string, string> = mappings?.[c.svc] ?? {};
    const skipSet = new Set<string>();
    for (const [normKey, rosterName] of Object.entries(svcMappings)) {
      if (!rosterName) {
        skipSet.add(normKey);
      } else {
        const target = byName[norm(rosterName)];
        if (target) byName[normKey] = target;
      }
    }

    let unresolvedCount = 0;
    for (const r of prows) {
      const nm = clean(r[pc.name]);
      if (!isName(nm)) continue;
      const normNm = norm(nm);
      let st = byName[normNm];

      if (!st) {
        if (skipSet.has(normNm)) {
          continue;
        }
        // Puntuar todos los alumnos del roster por similitud
        const scored = Object.entries(byName)
          .map(([k, s]) => ({ key: k, student: s, score: similarity(normNm, k) }))
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0 && scored[0].score >= 0.88) {
          st = scored[0].student;
          fuzzyMatched.push({ svc: c.svc, paymentName: nm, rosterName: st.name, similarity: scored[0].score });
        } else {
          const candidates = scored
            .filter(x => x.score >= 0.45)
            .slice(0, 3)
            .map(x => ({ name: x.student.name, similarity: x.score }));
          needsReview.push({ svc: c.svc, paymentName: nm, candidates });
          unresolvedCount++;
          continue;
        }
      }

      for (const [col, concept, period] of pc.cells) {
        const v = r[col];
        const d = serialToDate(v);
        if (d) st.payments.push({ concept, period, paidAt: d, exento: false });
        else if (clean(v).toLowerCase() === 'x') st.payments.push({ concept, period, paidAt: null, exento: true });
      }
    }
    if (unresolvedCount > 0)
      warnings.push(`${c.svc}: ${unresolvedCount} fila(s) de pagos sin resolver (ver sección "Requieren revisión manual").`);
  }
  return { students: all, warnings, fuzzyMatched, needsReview };
}

export function summarize(parsed: ReturnType<typeof parseWorkbook>) {
  const bySvc: any = {};
  for (const s of parsed.students) {
    const k = s.svc;
    bySvc[k] = bySvc[k] || { servicio: k, total: 0, matriculados: 0, bajas: 0, recibosPagados: 0, recibosExentos: 0 };
    bySvc[k].total++;
    if (s.isBaja) bySvc[k].bajas++; else bySvc[k].matriculados++;
    bySvc[k].recibosPagados += s.payments.filter(p => p.paidAt).length;
    bySvc[k].recibosExentos += s.payments.filter(p => p.exento).length;
  }
  return {
    porServicio: Object.values(bySvc),
    warnings: parsed.warnings,
    fuzzyMatched: parsed.fuzzyMatched,
    needsReview: parsed.needsReview,
    totales: {
      alumnos: parsed.students.length,
      matriculados: parsed.students.filter(s => !s.isBaja).length,
      bajas: parsed.students.filter(s => s.isBaja).length,
    },
  };
}
