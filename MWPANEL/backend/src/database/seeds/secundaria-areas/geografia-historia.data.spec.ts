import { AREA_GH } from './geografia-historia.data';
import {
  validateSecundariaCurriculum,
  VALID_KEY_COMPETENCY_CODES,
  VALID_COURSES,
} from '../secundaria-curriculum.data';

describe('AREA_GH – Geografía e Historia', () => {
  it('should not be null', () => {
    expect(AREA_GH).not.toBeNull();
  });

  it('should have correct subjectCode, abbrev and areaName', () => {
    expect(AREA_GH.subjectCode).toBe('GH-1ESO');
    expect(AREA_GH.abbrev).toBe('GH');
    expect(AREA_GH.areaName).toBe('Geografía e Historia');
  });

  it('should have 9 specific competencies', () => {
    expect(AREA_GH.competencies).toHaveLength(9);
  });

  it('should have CE codes 1 through 9', () => {
    const codes = AREA_GH.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('every CE should have a non-empty name and description', () => {
    for (const ce of AREA_GH.competencies) {
      expect(ce.name.trim().length).toBeGreaterThan(0);
      expect(ce.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('every CE should have only valid keyCompetencyCodes (no duplicates)', () => {
    const valid = VALID_KEY_COMPETENCY_CODES as readonly string[];
    for (const ce of AREA_GH.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      const seen = new Set<string>();
      for (const k of ce.keyCompetencyCodes) {
        expect(valid).toContain(k);
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    }
  });

  it('every CE should have at least one criterion', () => {
    for (const ce of AREA_GH.competencies) {
      expect(ce.criteria.length).toBeGreaterThan(0);
    }
  });

  it('every criterion should have a valid course and a non-empty description', () => {
    const validCourses = VALID_COURSES as readonly string[];
    for (const ce of AREA_GH.competencies) {
      for (const crit of ce.criteria) {
        expect(validCourses).toContain(crit.course);
        expect(crit.description.trim().length).toBeGreaterThan(0);
        expect(crit.code).toMatch(/^\d+\.\d+$/);
      }
    }
  });

  it('should have 3 knowledge blocks (A, B, C)', () => {
    expect(AREA_GH.knowledgeBlocks).toHaveLength(3);
    const letters = AREA_GH.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('knowledge block titles should be verbatim', () => {
    expect(AREA_GH.knowledgeBlocks[0].title).toBe('Retos del mundo actual');
    expect(AREA_GH.knowledgeBlocks[1].title).toBe('Sociedades y territorios');
    expect(AREA_GH.knowledgeBlocks[2].title).toBe('Compromiso cívico local y global');
  });

  it('every knowledge block should have items', () => {
    for (const block of AREA_GH.knowledgeBlocks) {
      expect(block.items.length).toBeGreaterThan(0);
    }
  });

  it('every knowledge item should have a valid course and non-empty description', () => {
    const validCourses = VALID_COURSES as readonly string[];
    for (const block of AREA_GH.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validCourses).toContain(item.course);
        expect(item.description.trim().length).toBeGreaterThan(0);
        expect(item.code.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_GH]);
    expect(errors).toEqual([]);
  });
});
