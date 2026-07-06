import { LEVELS3_DEFAULT_MAPPING } from '../entities/criterion-assessment.entity';

export type ThreeState = 'NOT_ACHIEVED' | 'IN_PROGRESS' | 'ACHIEVED';

export const STATE_TO_VALUE: Record<ThreeState, number> = { NOT_ACHIEVED: 0, IN_PROGRESS: 1, ACHIEVED: 2 };
const VALUE_TO_STATE: ThreeState[] = ['NOT_ACHIEVED', 'IN_PROGRESS', 'ACHIEVED'];

/** Media redondeada (half-up) de los estados marcados (0/1/2). null si no hay ninguno. */
export function rollUpCriterionState(states: number[]): ThreeState | null {
  if (!states || states.length === 0) return null;
  const mean = states.reduce((a, b) => a + b, 0) / states.length;
  const idx = Math.max(0, Math.min(2, Math.round(mean)));
  return VALUE_TO_STATE[idx];
}

export type CriterionWriteDecision =
  | { action: 'skip' }
  | { action: 'delete' }
  | { action: 'upsert'; levelValue: ThreeState; normalizedScore: number };

/** Decide qué hacer con la fila de criterio derivada, respetando lo manual. */
export function decideCriterionWrite(input: {
  existingExists: boolean;
  existingSource: 'manual' | 'derived' | 'derived_saber' | null;
  states: number[];
}): CriterionWriteDecision {
  // Manual (marcado a mano por el profe) SIEMPRE manda: nunca se pisa ni se borra.
  if (input.existingExists && input.existingSource === 'manual') return { action: 'skip' };

  const state = rollUpCriterionState(input.states);

  // Fila derivada de TRABAJOS (D3b, source='derived'): la capa de saberes puede SOBRESCRIBIRLA
  // cuando hay saberes marcados (el saber manda sobre la nota de trabajo), pero NUNCA la borra.
  if (input.existingExists && input.existingSource === 'derived') {
    return state === null
      ? { action: 'skip' }
      : { action: 'upsert', levelValue: state, normalizedScore: LEVELS3_DEFAULT_MAPPING[state] };
  }

  // Fila propia ('derived_saber') o inexistente: upsert si hay marcas, borrar la propia si se vació.
  if (state === null) return input.existingExists ? { action: 'delete' } : { action: 'skip' };
  return { action: 'upsert', levelValue: state, normalizedScore: LEVELS3_DEFAULT_MAPPING[state] };
}

/** Umbrales nota(0–100)→estado (Q6b). Configurable en fase futura. */
export const NUMERIC_TO_STATE_THRESHOLDS = { inProgress: 50, achieved: 80 };

/** Convierte una nota normalizada 0–100 a valor de estado 0/1/2. */
export function numericToStateValue(score0to100: number): number {
  const s = Math.max(0, Math.min(100, score0to100));
  if (s >= NUMERIC_TO_STATE_THRESHOLDS.achieved) return 2;
  if (s >= NUMERIC_TO_STATE_THRESHOLDS.inProgress) return 1;
  return 0;
}

/**
 * Capa B (Q6b): estado del criterio = media redondeada de las observaciones,
 * donde cada saber aporta su valor de estado efectivo y cada trabajo con nota
 * aporta su nota convertida a estado. Peso equitativo por observación.
 */
export function combineCriterionStateValue(
  saberStateValues: number[],
  numericScores0to100: number[],
): ThreeState | null {
  const all = [...saberStateValues, ...numericScores0to100.map(numericToStateValue)];
  return rollUpCriterionState(all);
}
