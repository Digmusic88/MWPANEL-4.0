import { AREA_FOPP } from './fopp.data';
import { validateSecundariaCurriculum } from '../secundaria-curriculum.data';

describe('AREA_FOPP', () => {
  it('should not be null', () => {
    expect(AREA_FOPP).not.toBeNull();
  });

  it('should have correct subjectCode and abbrev', () => {
    expect(AREA_FOPP.subjectCode).toBe('FOPP-4ESO');
    expect(AREA_FOPP.abbrev).toBe('FOPP');
    expect(AREA_FOPP.areaName).toBe('Formación y Orientación Personal y Profesional');
  });

  it('should have 5 competencias específicas', () => {
    expect(AREA_FOPP.competencies).toHaveLength(5);
  });

  it('should have CE codes 1 through 5', () => {
    const codes = AREA_FOPP.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5']);
  });

  it('should have all criteria with course 4ESO', () => {
    for (const ce of AREA_FOPP.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.course).toBe('4ESO');
      }
    }
  });

  it('should have all knowledge block items with course 4ESO', () => {
    for (const block of AREA_FOPP.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
      }
    }
  });

  it('should have 3 knowledge blocks (A, B, C)', () => {
    expect(AREA_FOPP.knowledgeBlocks).toHaveLength(3);
    const letters = AREA_FOPP.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('should have valid keyCompetencyCodes on all competencies', () => {
    const validCodes = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'];
    for (const ce of AREA_FOPP.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      for (const code of ce.keyCompetencyCodes) {
        expect(validCodes).toContain(code);
      }
    }
  });

  it('should have non-empty descriptions on all criteria', () => {
    for (const ce of AREA_FOPP.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_FOPP]);
    expect(errors).toEqual([]);
  });
});
