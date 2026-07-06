import { AREA_EPVA } from './plastica.data';
import { validateSecundariaCurriculum } from '../secundaria-curriculum.data';

describe('AREA_EPVA - Educación Plástica, Visual y Audiovisual', () => {
  it('should not be null', () => {
    expect(AREA_EPVA).not.toBeNull();
  });

  it('should have correct metadata', () => {
    expect(AREA_EPVA.subjectCode).toBe('EPVA-1ESO');
    expect(AREA_EPVA.abbrev).toBe('EPVA');
    expect(AREA_EPVA.areaName).toBe('Educación Plástica, Visual y Audiovisual');
  });

  it('should have 8 competencias específicas', () => {
    expect(AREA_EPVA.competencies).toHaveLength(8);
  });

  it('should have CE codes 1 through 8', () => {
    const codes = AREA_EPVA.competencies.map((c) => c.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('should have all CE descriptions non-empty', () => {
    for (const ce of AREA_EPVA.competencies) {
      expect(ce.description.trim().length).toBeGreaterThan(0);
      expect(ce.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('should have all CE keyCompetencyCodes non-empty and using valid keys', () => {
    const validKeys = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'];
    for (const ce of AREA_EPVA.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      for (const key of ce.keyCompetencyCodes) {
        expect(validKeys).toContain(key);
      }
    }
  });

  it('should have all criteria with courses only in {2ESO, 3ESO}', () => {
    const validCourses = new Set(['2ESO', '3ESO']);
    for (const ce of AREA_EPVA.competencies) {
      expect(ce.criteria.length).toBeGreaterThan(0);
      for (const crit of ce.criteria) {
        expect(validCourses.has(crit.course)).toBe(true);
        expect(crit.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have no duplicate (course, code) pairs within any competencia', () => {
    for (const ce of AREA_EPVA.competencies) {
      const seen = new Set<string>();
      for (const crit of ce.criteria) {
        const key = `${crit.course}|${crit.code}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it('should have 4 knowledge blocks (A, B, C, D)', () => {
    expect(AREA_EPVA.knowledgeBlocks).toHaveLength(4);
    const letters = AREA_EPVA.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should have all knowledge block items with codes starting with their block letter', () => {
    for (const block of AREA_EPVA.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code[0]).toBe(block.letter);
        expect(item.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have all knowledge block item courses in {2ESO, 3ESO}', () => {
    const validCourses = new Set(['2ESO', '3ESO']);
    for (const block of AREA_EPVA.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validCourses.has(item.course)).toBe(true);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_EPVA]);
    expect(errors).toHaveLength(0);
  });
});
