import { validateSecundariaCurriculum, AreaData } from '../secundaria-curriculum.data';
import { AREA_MATA } from './matematicas-a.data';

describe('AREA_MATA (Matemáticas A 4ESO)', () => {
  const a = AREA_MATA as AreaData;

  it('valid', () => {
    expect(AREA_MATA).not.toBeNull();
    expect(validateSecundariaCurriculum([a])).toEqual([]);
  });

  it('CE codes', () => {
    expect(a.competencies.map(c => c.code)).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    ]);
  });

  it('all courses 4ESO', () => {
    for (const ce of a.competencies) {
      for (const cr of ce.criteria) {
        expect(cr.course).toBe('4ESO');
      }
    }
    for (const block of a.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
      }
    }
  });
});
