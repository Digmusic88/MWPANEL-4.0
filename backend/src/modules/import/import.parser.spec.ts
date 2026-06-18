import { similarity, norm } from './import.parser';

describe('similarity', () => {
  it('strings idénticos → 1', () => {
    expect(similarity('juan garcia', 'juan garcia')).toBe(1);
  });

  it('palabras en orden distinto → 1 (word-set match)', () => {
    expect(similarity('garcia juan', 'juan garcia')).toBe(1);
  });

  it('un solo carácter de diferencia → score ≥ 0.88 (auto-match)', () => {
    // 'garcia lopez' vs 'garcia lopes' → levenshtein=1, maxLen=12 → 1-1/12 ≈ 0.917
    expect(similarity('garcia lopez', 'garcia lopes')).toBeGreaterThanOrEqual(0.88);
  });

  it('tilde residual eliminada por norm → score ≥ 0.88', () => {
    // norm ya elimina tildes; este test verifica que funcione con el resultado de norm
    const a = norm('Ana Martínez');   // 'ana martinez'
    const b = norm('Ana Martinez');  // 'ana martinez'
    expect(similarity(a, b)).toBe(1);
  });

  it('abreviatura de apellido → score entre 0.45 y 0.88 (revisión manual)', () => {
    // 'ana mtnez' (9) vs 'ana martinez' (12) → levenshtein=3, maxLen=12 → 1-3/12=0.75
    const s = similarity(norm('Ana Mtnez'), norm('Ana Martínez'));
    expect(s).toBeGreaterThanOrEqual(0.45);
    expect(s).toBeLessThan(0.88);
  });

  it('nombres completamente distintos → score < 0.45', () => {
    expect(similarity('pedro sanchez', 'maria fernandez')).toBeLessThan(0.45);
  });
});
