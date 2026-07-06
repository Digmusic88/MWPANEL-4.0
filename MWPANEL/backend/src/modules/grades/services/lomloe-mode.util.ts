import { GradeComponent } from '../entities/grade-configuration.entity';

export type LomloeMode = 'parallel' | 'derive' | 'replace';

/**
 * Aplica el modo LOMLOE al breakdown y decide si la nota final se sustituye.
 * - parallel: excluye el componente CRITERIA (calculateFinalGrade renormaliza sobre los presentes → nota igual que hoy).
 *             Si al quitar CRITERIA los pesos restantes dejan de sumar 100, se renormalizan (M-1, ver abajo).
 * - derive: deja el breakdown intacto (CRITERIA cuenta con su peso configurado).
 * - replace: si hay marcas de criterio, finalGradeOverride = media de normalizedScore (0-100) y el breakdown
 *            persistido pasa a ser un único componente CRITERIA al 100% (M-2, coherente con la nota); si no, null.
 */
export function applyLomloeMode(
  mode: LomloeMode,
  breakdown: any[],
  criteria: Array<{ normalizedScore: number }>,
): { breakdown: any[]; finalGradeOverride: number | null } {
  if (mode === 'replace') {
    const scores = (criteria || []).map((c) => Number(c.normalizedScore)).filter((n) => !isNaN(n));
    if (scores.length > 0) {
      const avg = Math.max(0, Math.min(100, scores.reduce((a, b) => a + b, 0) / scores.length));
      // M-2: en 'sustituir' la nota la determinan SOLO los criterios. El desglose persistido
      // debe reflejarlo: un único componente CRITERIA al 100% (suma de pesos = 100, coherente
      // con finalGrade y con las métricas), en vez de conservar exámenes/tareas que ya no puntúan.
      const criteriaComponent = {
        component: GradeComponent.CRITERIA,
        rawScore: avg,
        normalizedScore: avg,
        weight: 100,
        weightedScore: avg, // = normalizedScore * weight / 100 = avg
        itemCount: scores.length,
        lastUpdate: new Date(),
        sourceIds: [],
        confidence: 1,
      };
      return { breakdown: [criteriaComponent], finalGradeOverride: avg };
    }
    return { breakdown, finalGradeOverride: null };
  }
  if (mode === 'derive') {
    return { breakdown, finalGradeOverride: null };
  }
  // parallel (default): excluye CRITERIA.
  const hadCriteria = breakdown.some((b) => b.component === GradeComponent.CRITERIA);
  const kept = breakdown.filter((b) => b.component !== GradeComponent.CRITERIA);
  // M-1: si había un componente CRITERIA con peso y lo quitamos, los pesos restantes ya no
  // suman 100 → validateDataIntegrity avisaría "los pesos no suman 100%" (aunque la nota es
  // correcta, porque calculateFinalGrade renormaliza por el peso total). Renormalizamos los
  // pesos (y weightedScore, en el mismo factor) para que el desglose sea coherente. Es NEUTRO
  // en la nota: escalar peso y weightedScore por el mismo k no altera el ratio que usa
  // calculateFinalGrade. Solo actúa cuando CRITERIA estaba presente (no toca configs sin criterios).
  if (hadCriteria) {
    const totalWeight = kept.reduce((s, b) => s + (Number(b.weight) || 0), 0);
    if (totalWeight > 0 && Math.abs(totalWeight - 100) > 0.01) {
      const k = 100 / totalWeight;
      const renorm = kept.map((b) => ({
        ...b,
        weight: (Number(b.weight) || 0) * k,
        weightedScore: (Number(b.weightedScore) || 0) * k,
      }));
      return { breakdown: renorm, finalGradeOverride: null };
    }
  }
  return { breakdown: kept, finalGradeOverride: null };
}
