import { AREA_LCL } from './lengua-castellana.data';
import {
  validateSecundariaCurriculum,
  VALID_COURSES,
  VALID_KEY_COMPETENCY_CODES,
} from '../secundaria-curriculum.data';

describe('AREA_LCL – Lengua Castellana y Literatura', () => {
  it('should not be null', () => {
    expect(AREA_LCL).not.toBeNull();
  });

  it('should have correct metadata', () => {
    expect(AREA_LCL.subjectCode).toBe('LCL-1ESO');
    expect(AREA_LCL.abbrev).toBe('LCL');
    expect(AREA_LCL.areaName).toBe('Lengua Castellana y Literatura');
  });

  it('should have 10 specific competencies', () => {
    expect(AREA_LCL.competencies).toHaveLength(10);
  });

  it('should have competency codes 1 through 10', () => {
    const codes = AREA_LCL.competencies.map((ce) => ce.code);
    for (let i = 1; i <= 10; i++) {
      expect(codes).toContain(String(i));
    }
  });

  it('every competency should have a non-empty name and description', () => {
    for (const ce of AREA_LCL.competencies) {
      expect(ce.name.trim().length).toBeGreaterThan(0);
      expect(ce.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('every keyCompetencyCode should be from the valid set', () => {
    const valid = VALID_KEY_COMPETENCY_CODES as readonly string[];
    for (const ce of AREA_LCL.competencies) {
      for (const kc of ce.keyCompetencyCodes) {
        expect(valid).toContain(kc);
      }
    }
  });

  it('every criterion code should match pattern n.m', () => {
    const re = /^\d+\.\d+$/;
    for (const ce of AREA_LCL.competencies) {
      for (const cr of ce.criteria) {
        expect(cr.code).toMatch(re);
      }
    }
  });

  it('every criterion course should be valid', () => {
    const valid = VALID_COURSES as readonly string[];
    for (const ce of AREA_LCL.competencies) {
      for (const cr of ce.criteria) {
        expect(valid).toContain(cr.course);
      }
    }
  });

  it('every criterion should have a non-empty description', () => {
    for (const ce of AREA_LCL.competencies) {
      for (const cr of ce.criteria) {
        expect(cr.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have 4 knowledge blocks (A, B, C, D)', () => {
    expect(AREA_LCL.knowledgeBlocks).toHaveLength(4);
    const letters = AREA_LCL.knowledgeBlocks.map((kb) => kb.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('every knowledge block should have a non-empty title and items', () => {
    for (const kb of AREA_LCL.knowledgeBlocks) {
      expect(kb.title.trim().length).toBeGreaterThan(0);
      expect(kb.items.length).toBeGreaterThan(0);
    }
  });

  it('every knowledge item course should be valid', () => {
    const valid = VALID_COURSES as readonly string[];
    for (const kb of AREA_LCL.knowledgeBlocks) {
      for (const item of kb.items) {
        expect(valid).toContain(item.course);
      }
    }
  });

  it('every knowledge item should have a non-empty code and description', () => {
    for (const kb of AREA_LCL.knowledgeBlocks) {
      for (const item of kb.items) {
        expect(item.code.trim().length).toBeGreaterThan(0);
        expect(item.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_LCL]);
    expect(errors).toEqual([]);
  });
});
