import { AREA_EXART } from './expresion-artistica.data';
import { validateSecundariaCurriculum, VALID_KEY_COMPETENCY_CODES } from '../secundaria-curriculum.data';

describe('AREA_EXART – Expresión Artística 4ESO', () => {
  it('should not be null', () => {
    expect(AREA_EXART).not.toBeNull();
  });

  it('should have correct metadata', () => {
    expect(AREA_EXART.subjectCode).toBe('EXART-4ESO');
    expect(AREA_EXART.abbrev).toBe('EXART');
    expect(AREA_EXART.areaName).toBe('Expresión Artística');
  });

  it('should have 4 competencias específicas', () => {
    expect(AREA_EXART.competencies).toHaveLength(4);
  });

  it('should have CE codes "1" through "4"', () => {
    const codes = AREA_EXART.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4']);
  });

  it('should have 3 knowledge blocks (A, B, C)', () => {
    expect(AREA_EXART.knowledgeBlocks).toHaveLength(3);
    const letters = AREA_EXART.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('should have correct number of saberes per block', () => {
    const blockA = AREA_EXART.knowledgeBlocks.find((b) => b.letter === 'A')!;
    const blockB = AREA_EXART.knowledgeBlocks.find((b) => b.letter === 'B')!;
    const blockC = AREA_EXART.knowledgeBlocks.find((b) => b.letter === 'C')!;
    expect(blockA.items).toHaveLength(9);
    expect(blockB.items).toHaveLength(11);
    expect(blockC.items).toHaveLength(7);
  });

  it('should tag all criteria with course 4ESO', () => {
    for (const ce of AREA_EXART.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.course).toBe('4ESO');
      }
    }
  });

  it('should tag all saberes with course 4ESO', () => {
    for (const block of AREA_EXART.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
      }
    }
  });

  it('should use only valid key competency codes', () => {
    const valid = VALID_KEY_COMPETENCY_CODES as readonly string[];
    for (const ce of AREA_EXART.competencies) {
      for (const k of ce.keyCompetencyCodes) {
        expect(valid).toContain(k);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_EXART]);
    expect(errors).toEqual([]);
  });
});
