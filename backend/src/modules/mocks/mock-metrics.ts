export type RawPart = { part: string; score: number | null; status: string };
export type RawCall = { examName: string; examDate: string | null; parts: RawPart[] };

export type SkillPoint = { date: string | null; examName: string; value: number | null; np: boolean };
export type EnrichedPart = RawPart & { kind: 'scored' | 'pending' | 'np' };
export type EnrichedCall = { examName: string; examDate: string | null; overall: number | null; parts: EnrichedPart[] };

export type MockMetrics = {
  kpis: { last: number | null; best: number | null; average: number | null; count: number; trend: 'up' | 'down' | 'flat' | null };
  skills: { name: string; latest: number | null; latestNp: boolean }[];
  evolution: { date: string | null; examName: string; overall: number | null }[];
  skillSeries: Record<string, SkillPoint[]>;
  calls: EnrichedCall[];
};

const NP_STATUS = new Set(['NOT_PRESENTED', 'ABSENT']);

export function classifyPart(p: RawPart): 'scored' | 'pending' | 'np' {
  if (NP_STATUS.has((p.status || '').toUpperCase())) return 'np';
  return p.score == null ? 'pending' : 'scored';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Valor ordenable de una fecha de convocatoria. El SQLite de Mocks puede
 * devolver examDate como string ISO, número epoch o Date — no siempre string.
 * Los nulos/indefinidos van al final.
 */
function dateSortValue(d: unknown): number {
  if (d == null || d === '') return Number.POSITIVE_INFINITY;
  if (typeof d === 'number') return d;
  const t = new Date(d as string | Date).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export function computeMockMetrics(calls: RawCall[]): MockMetrics {
  // Orden cronológico ascendente (las fechas null al final, estable)
  const sorted = [...calls].sort((a, b) => dateSortValue(a.examDate) - dateSortValue(b.examDate));

  const enriched: EnrichedCall[] = sorted.map((c) => {
    const parts: EnrichedPart[] = c.parts.map((p) => ({ ...p, kind: classifyPart(p) }));
    const scored = parts.filter((p) => p.kind === 'scored').map((p) => p.score as number);
    const overall = scored.length ? round1(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
    return { examName: c.examName, examDate: c.examDate, overall, parts };
  });

  const evolution = enriched.map((c) => ({ date: c.examDate, examName: c.examName, overall: c.overall }));

  // KPIs (solo convocatorias con overall != null)
  const withScore = enriched.filter((c) => c.overall != null);
  const overalls = withScore.map((c) => c.overall as number);
  const count = withScore.length;
  const best = count ? Math.max(...overalls) : null;
  const average = count ? round1(overalls.reduce((a, b) => a + b, 0) / count) : null;
  const last = count ? (withScore[withScore.length - 1].overall as number) : null;
  let trend: 'up' | 'down' | 'flat' | null = null;
  if (count >= 2) {
    const prev = withScore[withScore.length - 2].overall as number;
    trend = last! > prev ? 'up' : last! < prev ? 'down' : 'flat';
  }

  // Series por destreza + último valor por destreza
  const skillNames = Array.from(new Set(enriched.flatMap((c) => c.parts.map((p) => p.part))));
  const skillSeries: Record<string, SkillPoint[]> = {};
  const skills = skillNames.map((name) => {
    const series: SkillPoint[] = enriched.map((c) => {
      const p = c.parts.find((x) => x.part === name);
      return {
        date: c.examDate, examName: c.examName,
        value: p && p.kind === 'scored' ? (p.score as number) : null,
        np: p ? p.kind === 'np' : false,
      };
    });
    skillSeries[name] = series;
    // último punto con dato definido (nota o NP), recorriendo de atrás a delante
    let latest: number | null = null;
    let latestNp = false;
    for (let i = series.length - 1; i >= 0; i--) {
      const pt = series[i];
      if (pt.value != null) { latest = pt.value; latestNp = false; break; }
      if (pt.np) { latest = null; latestNp = true; break; }
    }
    return { name, latest, latestNp };
  });

  return { kpis: { last, best, average, count, trend }, skills, evolution, skillSeries, calls: enriched };
}
