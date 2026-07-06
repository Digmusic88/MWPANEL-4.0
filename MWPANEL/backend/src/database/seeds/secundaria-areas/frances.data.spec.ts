import { AREA_FRA } from './frances.data';
import { VALID_KEY_COMPETENCY_CODES, VALID_COURSES } from '../secundaria-curriculum.data';

describe('AREA_FRA – Segunda Lengua Extranjera (Francés) 4ESO seed data', () => {
  it('should not be null', () => {
    expect(AREA_FRA).not.toBeNull();
  });

  it('should have correct subjectCode, abbrev and areaName', () => {
    expect(AREA_FRA.subjectCode).toBe('FRA-4ESO');
    expect(AREA_FRA.abbrev).toBe('FRA');
    expect(AREA_FRA.areaName).toBe('Segunda Lengua Extranjera (Francés)');
  });

  it('should have exactly 6 competencias específicas', () => {
    expect(AREA_FRA.competencies).toHaveLength(6);
  });

  it('every CE should have a non-empty code, name, description and criteria array', () => {
    for (const ce of AREA_FRA.competencies) {
      expect(ce.code).toBeTruthy();
      expect(ce.name).toBeTruthy();
      expect(ce.description).toBeTruthy();
      expect(Array.isArray(ce.criteria)).toBe(true);
      expect(ce.criteria.length).toBeGreaterThan(0);
    }
  });

  it('CE codes should be "1" through "6"', () => {
    const codes = AREA_FRA.competencies.map((c) => c.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('every CE criterion code should match pattern n.m', () => {
    const re = /^\d+\.\d+$/;
    for (const ce of AREA_FRA.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.code).toMatch(re);
      }
    }
  });

  it('all criteria should have course "4ESO"', () => {
    for (const ce of AREA_FRA.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.course).toBe('4ESO');
        expect(VALID_COURSES).toContain(criterion.course);
      }
    }
  });

  it('all keyCompetencyCodes should be valid 8-clave codes', () => {
    for (const ce of AREA_FRA.competencies) {
      for (const code of ce.keyCompetencyCodes) {
        expect(VALID_KEY_COMPETENCY_CODES).toContain(code as any);
      }
    }
  });

  it('should have exactly 3 knowledge blocks', () => {
    expect(AREA_FRA.knowledgeBlocks).toHaveLength(3);
  });

  it('knowledge block letters should be A, B, C', () => {
    const letters = AREA_FRA.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('every knowledge block should have a non-empty title and at least one item', () => {
    for (const block of AREA_FRA.knowledgeBlocks) {
      expect(block.title).toBeTruthy();
      expect(block.items.length).toBeGreaterThan(0);
    }
  });

  it('all knowledge block items should have course "4ESO"', () => {
    for (const block of AREA_FRA.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
        expect(VALID_COURSES).toContain(item.course);
      }
    }
  });

  it('all knowledge block item codes should be non-empty strings', () => {
    for (const block of AREA_FRA.knowledgeBlocks) {
      for (const item of block.items) {
        expect(typeof item.code).toBe('string');
        expect(item.code.length).toBeGreaterThan(0);
        expect(item.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('block A (Comunicación) should have 13 items', () => {
    const blockA = AREA_FRA.knowledgeBlocks.find((b) => b.letter === 'A');
    expect(blockA).toBeDefined();
    expect(blockA!.items).toHaveLength(13);
  });

  it('block B (Plurilingüismo) should have 5 items', () => {
    const blockB = AREA_FRA.knowledgeBlocks.find((b) => b.letter === 'B');
    expect(blockB).toBeDefined();
    expect(blockB!.items).toHaveLength(5);
  });

  it('block C (Interculturalidad) should have 5 items', () => {
    const blockC = AREA_FRA.knowledgeBlocks.find((b) => b.letter === 'C');
    expect(blockC).toBeDefined();
    expect(blockC!.items).toHaveLength(5);
  });
});
