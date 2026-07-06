import { AREA_EE } from './economia.data';
import { validateSecundariaCurriculum } from '../secundaria-curriculum.data';

describe('AREA_EE', () => {
  it('should not be null', () => {
    expect(AREA_EE).not.toBeNull();
  });

  it('should have correct subjectCode and abbrev', () => {
    expect(AREA_EE.subjectCode).toBe('EE-4ESO');
    expect(AREA_EE.abbrev).toBe('EE');
    expect(AREA_EE.areaName).toBe('Economía y Emprendimiento');
  });

  it('should have 7 competencias específicas', () => {
    expect(AREA_EE.competencies).toHaveLength(7);
  });

  it('should have CE codes 1 through 7', () => {
    const codes = AREA_EE.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('should have all criteria with course 4ESO', () => {
    for (const ce of AREA_EE.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.course).toBe('4ESO');
      }
    }
  });

  it('should have all knowledge block items with course 4ESO', () => {
    for (const block of AREA_EE.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
      }
    }
  });

  it('should have 4 knowledge blocks (A, B, C, D)', () => {
    expect(AREA_EE.knowledgeBlocks).toHaveLength(4);
    const letters = AREA_EE.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should have correct item counts per knowledge block', () => {
    const blockA = AREA_EE.knowledgeBlocks.find((b) => b.letter === 'A');
    const blockB = AREA_EE.knowledgeBlocks.find((b) => b.letter === 'B');
    const blockC = AREA_EE.knowledgeBlocks.find((b) => b.letter === 'C');
    const blockD = AREA_EE.knowledgeBlocks.find((b) => b.letter === 'D');
    expect(blockA?.items).toHaveLength(4);
    expect(blockB?.items).toHaveLength(7);
    expect(blockC?.items).toHaveLength(3);
    expect(blockD?.items).toHaveLength(9);
  });

  it('should have valid keyCompetencyCodes on all competencies', () => {
    const validCodes = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'];
    for (const ce of AREA_EE.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      for (const code of ce.keyCompetencyCodes) {
        expect(validCodes).toContain(code);
      }
    }
  });

  it('should have non-empty descriptions on all criteria', () => {
    for (const ce of AREA_EE.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have non-empty descriptions on all knowledge items', () => {
    for (const block of AREA_EE.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_EE]);
    expect(errors).toEqual([]);
  });
});
