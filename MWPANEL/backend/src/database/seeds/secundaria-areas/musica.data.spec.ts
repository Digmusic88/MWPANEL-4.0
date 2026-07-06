import { validateSecundariaCurriculum, AreaData } from '../secundaria-curriculum.data';
import { AREA_MUS } from './musica.data';

describe('AREA_MUS (Música ESO)', () => {
  const a = AREA_MUS as AreaData;

  it('not null', () => {
    expect(AREA_MUS).not.toBeNull();
  });

  it('validate clean', () => {
    expect(validateSecundariaCurriculum([a])).toEqual([]);
  });

  it('CE codes 1-4', () => {
    expect(a.competencies.map(c => c.code)).toEqual(['1', '2', '3', '4']);
  });

  it('all criteria courses valid (1ESO, 3ESO, 4ESO only)', () => {
    const validCourses = new Set(['1ESO', '3ESO', '4ESO']);
    for (const ce of a.competencies) {
      for (const cr of ce.criteria) {
        expect(validCourses.has(cr.course)).toBe(true);
      }
    }
  });

  it('all knowledge block courses valid (1ESO, 3ESO, 4ESO only)', () => {
    const validCourses = new Set(['1ESO', '3ESO', '4ESO']);
    for (const block of a.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validCourses.has(item.course)).toBe(true);
      }
    }
  });

  it('has 3 knowledge block letters (A, B, C present)', () => {
    const letters = a.knowledgeBlocks.map(b => b.letter);
    expect(letters).toContain('A');
    expect(letters).toContain('B');
    expect(letters).toContain('C');
  });

  it('subjectCode and abbrev match', () => {
    expect(a.subjectCode).toBe('MUS-1ESO');
    expect(a.abbrev).toBe('MUS');
  });
});
