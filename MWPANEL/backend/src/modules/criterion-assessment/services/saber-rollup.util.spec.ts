import { rollUpCriterionState, decideCriterionWrite } from './saber-rollup.util';

describe('rollUpCriterionState', () => {
  it('media redondea hacia arriba en empate y clampa a estado', () => {
    expect(rollUpCriterionState([2, 2, 1])).toBe('ACHIEVED');      // 1.67 -> 2
    expect(rollUpCriterionState([2, 0])).toBe('IN_PROGRESS');      // 1.0 -> 1
    expect(rollUpCriterionState([1, 1, 0])).toBe('IN_PROGRESS');   // 0.67 -> 1
    expect(rollUpCriterionState([1, 2])).toBe('ACHIEVED');         // 1.5 -> 2 (half-up)
    expect(rollUpCriterionState([1, 0])).toBe('IN_PROGRESS');      // 0.5 -> 1 (half-up)
    expect(rollUpCriterionState([0, 0])).toBe('NOT_ACHIEVED');
    expect(rollUpCriterionState([2, 2, 2])).toBe('ACHIEVED');
  });
  it('devuelve null si no hay saberes marcados', () => {
    expect(rollUpCriterionState([])).toBeNull();
  });
});

describe('decideCriterionWrite', () => {
  it('respeta las marcas manuales (skip siempre)', () => {
    expect(decideCriterionWrite({ existingExists: true, existingSource: 'manual', states: [2, 2] }))
      .toEqual({ action: 'skip' });
    expect(decideCriterionWrite({ existingExists: true, existingSource: 'manual', states: [] }))
      .toEqual({ action: 'skip' });
  });
  it('sobrescribe una fila derivada de trabajos (D3b) cuando hay saberes marcados, pero NUNCA la borra', () => {
    expect(decideCriterionWrite({ existingExists: true, existingSource: 'derived', states: [2, 2] }))
      .toEqual({ action: 'upsert', levelValue: 'ACHIEVED', normalizedScore: 100 });
    expect(decideCriterionWrite({ existingExists: true, existingSource: 'derived', states: [] }))
      .toEqual({ action: 'skip' }); // no borra la fila de trabajos
  });
  it('upsert derivado con normalizedScore 0/50/100 (sin fila previa)', () => {
    expect(decideCriterionWrite({ existingExists: false, existingSource: null, states: [2, 2] }))
      .toEqual({ action: 'upsert', levelValue: 'ACHIEVED', normalizedScore: 100 });
    expect(decideCriterionWrite({ existingExists: false, existingSource: null, states: [1, 0] }))
      .toEqual({ action: 'upsert', levelValue: 'IN_PROGRESS', normalizedScore: 50 });
    expect(decideCriterionWrite({ existingExists: false, existingSource: null, states: [0, 0] }))
      .toEqual({ action: 'upsert', levelValue: 'NOT_ACHIEVED', normalizedScore: 0 });
  });
  it('borra SOLO su propia fila derivada de saberes cuando se vacían las marcas', () => {
    expect(decideCriterionWrite({ existingExists: true, existingSource: 'derived_saber', states: [] }))
      .toEqual({ action: 'delete' });
    expect(decideCriterionWrite({ existingExists: true, existingSource: 'derived_saber', states: [1, 2] }))
      .toEqual({ action: 'upsert', levelValue: 'ACHIEVED', normalizedScore: 100 });
  });
  it('no hace nada si no hay marcas ni fila previa', () => {
    expect(decideCriterionWrite({ existingExists: false, existingSource: null, states: [] }))
      .toEqual({ action: 'skip' });
  });
});

import {
  numericToStateValue,
  combineCriterionStateValue,
  NUMERIC_TO_STATE_THRESHOLDS,
} from './saber-rollup.util';

describe('numericToStateValue', () => {
  it('mapea por umbral <50 / 50–79 / ≥80', () => {
    expect(numericToStateValue(0)).toBe(0);
    expect(numericToStateValue(49.99)).toBe(0);
    expect(numericToStateValue(50)).toBe(1);
    expect(numericToStateValue(79.99)).toBe(1);
    expect(numericToStateValue(80)).toBe(2);
    expect(numericToStateValue(100)).toBe(2);
  });
  it('clampa fuera de rango', () => {
    expect(numericToStateValue(-10)).toBe(0);
    expect(numericToStateValue(150)).toBe(2);
  });
  it('expone los umbrales', () => {
    expect(NUMERIC_TO_STATE_THRESHOLDS).toEqual({ inProgress: 50, achieved: 80 });
  });
});

describe('combineCriterionStateValue', () => {
  it('null si no hay ni saberes ni notas', () => {
    expect(combineCriterionStateValue([], [])).toBeNull();
  });
  it('solo saberes: se comporta como rollUpCriterionState', () => {
    expect(combineCriterionStateValue([2, 2], [])).toBe('ACHIEVED');
    expect(combineCriterionStateValue([0, 1], [])).toBe('IN_PROGRESS'); // media 0.5 → round → 1
  });
  it('solo notas: convierte y promedia', () => {
    expect(combineCriterionStateValue([], [90])).toBe('ACHIEVED');       // 90→2
    expect(combineCriterionStateValue([], [40, 60])).toBe('IN_PROGRESS'); // 0 y 1 → media 0.5 → 1
  });
  it('mezcla saberes y notas con peso equitativo por observación', () => {
    // saberes [2,2] (valor 2,2) + nota 40 (valor 0) → media (2+2+0)/3 = 1.33 → round 1
    expect(combineCriterionStateValue([2, 2], [40])).toBe('IN_PROGRESS');
    // saber [2] + nota 80 (valor 2) → media 2 → ACHIEVED
    expect(combineCriterionStateValue([2], [80])).toBe('ACHIEVED');
  });
});
