import { AREA_ING } from './ingles.data';
import { validateSecundariaCurriculum } from '../secundaria-curriculum.data';

describe('AREA_ING seed data', () => {
  it('should not be null', () => {
    expect(AREA_ING).not.toBeNull();
  });

  it('should pass curriculum validation', () => {
    expect(validateSecundariaCurriculum([AREA_ING])).toEqual([]);
  });

  it('should have correct CE codes 1-6', () => {
    const codes = AREA_ING.competencies.map(ce => ce.code);
    expect(codes).toContain('1');
    expect(codes).toContain('2');
    expect(codes).toContain('3');
    expect(codes).toContain('4');
    expect(codes).toContain('5');
    expect(codes).toContain('6');
    expect(codes).toHaveLength(6);
  });

  it('should only have valid courses in criteria', () => {
    const validCourses = new Set(['1ESO', '2ESO', '3ESO', '4ESO']);
    for (const ce of AREA_ING.competencies) {
      for (const c of ce.criteria) {
        expect(validCourses.has(c.course)).toBe(true);
      }
    }
  });

  it('should only have valid courses in knowledgeBlocks', () => {
    const validCourses = new Set(['1ESO', '2ESO', '3ESO', '4ESO']);
    for (const block of AREA_ING.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validCourses.has(item.course)).toBe(true);
      }
    }
  });

  it('should have 3 knowledge blocks: A, B, C', () => {
    const letters = AREA_ING.knowledgeBlocks.map(b => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('should have correct block titles', () => {
    expect(AREA_ING.knowledgeBlocks[0].title).toBe('Comunicación');
    expect(AREA_ING.knowledgeBlocks[1].title).toBe('Plurilingüismo');
    expect(AREA_ING.knowledgeBlocks[2].title).toBe('Interculturalidad');
  });
});
