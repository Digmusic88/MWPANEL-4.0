import { validateSecundariaCurriculum, AreaData } from '../secundaria-curriculum.data';
import { AREA_BG } from './biologia-geologia.data';

describe('AREA_BG', () => {
  const a = AREA_BG as AreaData;

  it('valid', () => {
    expect(AREA_BG).not.toBeNull();
    expect(validateSecundariaCurriculum([a])).toEqual([]);
  });

  it('CE codes', () => {
    expect(a.competencies.map(c => c.code)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('courses valid', () => {
    for (const ce of a.competencies) {
      for (const cr of ce.criteria) {
        expect(['1ESO', '2ESO', '3ESO', '4ESO']).toContain(cr.course);
      }
    }
  });
});
