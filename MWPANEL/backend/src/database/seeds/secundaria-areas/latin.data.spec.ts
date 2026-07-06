import { AREA_LAT } from './latin.data';
import { validateSecundariaCurriculum, VALID_COURSES, VALID_KEY_COMPETENCY_CODES } from '../secundaria-curriculum.data';

describe('AREA_LAT (Latín 4ESO)', () => {
  it('should not be null', () => {
    expect(AREA_LAT).not.toBeNull();
    expect(AREA_LAT).toBeDefined();
  });

  it('should have correct metadata', () => {
    expect(AREA_LAT.subjectCode).toBe('LAT-4ESO');
    expect(AREA_LAT.abbrev).toBe('LAT');
    expect(AREA_LAT.areaName).toBe('Latín');
  });

  it('should have 5 competencias específicas', () => {
    expect(AREA_LAT.competencies).toHaveLength(5);
  });

  it('all CE codes should be numeric strings 1..5', () => {
    const codes = AREA_LAT.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5']);
  });

  it('all CE codes should be unique', () => {
    const codes = AREA_LAT.competencies.map((ce) => ce.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('all criteria should have course 4ESO', () => {
    for (const ce of AREA_LAT.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.course).toBe('4ESO');
      }
    }
  });

  it('all criteria codes should match pattern d.d', () => {
    const re = /^\d+\.\d+$/;
    for (const ce of AREA_LAT.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.code).toMatch(re);
      }
    }
  });

  it('all criteria descriptions should be non-empty', () => {
    for (const ce of AREA_LAT.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('all keyCompetencyCodes should be from the valid set', () => {
    const validSet = new Set(VALID_KEY_COMPETENCY_CODES as readonly string[]);
    for (const ce of AREA_LAT.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      for (const k of ce.keyCompetencyCodes) {
        expect(validSet.has(k)).toBe(true);
      }
    }
  });

  it('should have 4 knowledge blocks (A, B, C, D)', () => {
    expect(AREA_LAT.knowledgeBlocks).toHaveLength(4);
    const letters = AREA_LAT.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('all knowledge block items should have course 4ESO', () => {
    for (const block of AREA_LAT.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
      }
    }
  });

  it('all knowledge item codes should start with block letter', () => {
    for (const block of AREA_LAT.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code[0]).toBe(block.letter);
      }
    }
  });

  it('all knowledge item codes should match pattern Letter.number', () => {
    const re = /^[A-Z]\d*\.\d+$/;
    for (const block of AREA_LAT.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code).toMatch(re);
      }
    }
  });

  it('all knowledge item descriptions should be non-empty', () => {
    for (const block of AREA_LAT.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with zero errors', () => {
    const errors = validateSecundariaCurriculum([AREA_LAT]);
    expect(errors).toEqual([]);
  });

  it('all criterion and knowledge item courses should be valid VALID_COURSES values', () => {
    const validSet = new Set(VALID_COURSES as readonly string[]);
    for (const ce of AREA_LAT.competencies) {
      for (const crit of ce.criteria) {
        expect(validSet.has(crit.course)).toBe(true);
      }
    }
    for (const block of AREA_LAT.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validSet.has(item.course)).toBe(true);
      }
    }
  });
});
