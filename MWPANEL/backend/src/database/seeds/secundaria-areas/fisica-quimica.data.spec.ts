import { AREA_FQ } from './fisica-quimica.data';
import {
  validateSecundariaCurriculum,
  VALID_COURSES,
} from '../secundaria-curriculum.data';

describe('AREA_FQ – Física y Química', () => {
  it('should not be null', () => {
    expect(AREA_FQ).not.toBeNull();
  });

  it('should have the correct subjectCode and abbrev', () => {
    expect(AREA_FQ.subjectCode).toBe('FQ-1ESO');
    expect(AREA_FQ.abbrev).toBe('FQ');
    expect(AREA_FQ.areaName).toBe('Física y Química');
  });

  it('should have 6 competencias específicas', () => {
    expect(AREA_FQ.competencies).toHaveLength(6);
  });

  it('should have CE codes 1 through 6', () => {
    const codes = AREA_FQ.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('should only have criteria for valid courses', () => {
    const validSet = new Set<string>(VALID_COURSES);
    for (const ce of AREA_FQ.competencies) {
      for (const crit of ce.criteria) {
        expect(validSet.has(crit.course)).toBe(true);
      }
    }
  });

  it('should only use courses 2ESO, 3ESO and 4ESO (FQ starts at 2ESO)', () => {
    const coursesUsed = new Set<string>();
    for (const ce of AREA_FQ.competencies) {
      for (const crit of ce.criteria) {
        coursesUsed.add(crit.course);
      }
    }
    expect(coursesUsed.has('1ESO')).toBe(false);
    expect(coursesUsed.has('2ESO')).toBe(true);
    expect(coursesUsed.has('3ESO')).toBe(true);
    expect(coursesUsed.has('4ESO')).toBe(true);
  });

  it('should have no empty criterion descriptions', () => {
    for (const ce of AREA_FQ.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have no empty knowledge block item descriptions', () => {
    for (const block of AREA_FQ.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have 5 knowledge blocks (A through E)', () => {
    expect(AREA_FQ.knowledgeBlocks).toHaveLength(5);
    const letters = AREA_FQ.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('should only use valid courses in knowledge blocks', () => {
    const validSet = new Set<string>(VALID_COURSES);
    for (const block of AREA_FQ.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validSet.has(item.course)).toBe(true);
      }
    }
  });

  it('should pass the shared curriculum validator with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_FQ]);
    expect(errors).toEqual([]);
  });

  it('each CE should have at least one key competency code', () => {
    for (const ce of AREA_FQ.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
    }
  });
});
