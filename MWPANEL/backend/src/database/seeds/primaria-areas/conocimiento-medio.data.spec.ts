import { validatePrimariaCurriculum, AreaData } from '../primaria-curriculum.data';
import { AREA_CMN } from './conocimiento-medio.data';

describe('AREA_CMN (Conocimiento del Medio)', () => {
  const a = AREA_CMN as AreaData;

  it('is structurally valid', () => {
    expect(AREA_CMN).not.toBeNull();
    expect(validatePrimariaCurriculum([a])).toEqual([]);
  });

  it('has CE codes in order', () => {
    expect(a.competencies.map((c) => c.code)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('all criterion cycles valid', () => {
    for (const ce of a.competencies)
      for (const cr of ce.criteria)
        expect(['PRIMER', 'SEGUNDO', 'TERCER']).toContain(cr.cycle);
  });
});
