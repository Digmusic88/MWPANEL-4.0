// Helpers puros (sin DB) para el cobro masivo de celdas. Testeables con node:test.
export interface BulkCellTarget {
  enrollmentId: string;
  concept: string;
  period?: string | null;
  mm?: string | null;
}

// Clave única de una celda: alumno + concepto + periodo (los conceptos sin periodo usan '').
export function cellKey(c: BulkCellTarget): string {
  return `${c.enrollmentId}|${c.concept}|${c.period ?? ''}`;
}

// Quita duplicados (defensa: el frontend ya deduplica) conservando el orden de aparición.
export function dedupeCells(cells: BulkCellTarget[]): BulkCellTarget[] {
  const seen = new Set<string>();
  const out: BulkCellTarget[] = [];
  for (const c of cells) {
    const k = cellKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

// Resumen de resultados del bucle: 'notfound' se agrupa con 'skipped'.
export function summarizeBulkOutcomes(outcomes: string[]): { paid: number; exempted: number; skipped: number } {
  return {
    paid: outcomes.filter(o => o === 'paid').length,
    exempted: outcomes.filter(o => o === 'exempted').length,
    skipped: outcomes.filter(o => o === 'skipped' || o === 'notfound').length,
  };
}
