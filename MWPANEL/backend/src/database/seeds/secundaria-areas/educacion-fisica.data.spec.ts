import { AREA_EF } from './educacion-fisica.data';
import { Course } from '../secundaria-curriculum.data';

const VALID_COURSES: Course[] = ['1ESO', '2ESO', '3ESO', '4ESO'];
const VALID_COURSES_SET = new Set<Course>(VALID_COURSES);

describe('AREA_EF – Educación Física ESO seed data', () => {
  it('should not be null', () => {
    expect(AREA_EF).not.toBeNull();
  });

  it('should have correct metadata', () => {
    expect(AREA_EF.subjectCode).toBe('EF-1ESO');
    expect(AREA_EF.abbrev).toBe('EF');
    expect(AREA_EF.areaName).toBe('Educación Física');
  });

  it('should have 5 competencies', () => {
    expect(AREA_EF.competencies).toHaveLength(5);
  });

  it('each competency should have a non-empty code, name, description and keyCompetencyCodes', () => {
    for (const ce of AREA_EF.competencies) {
      expect(ce.code).toBeTruthy();
      expect(ce.name).toBeTruthy();
      expect(ce.description).toBeTruthy();
      expect(Array.isArray(ce.keyCompetencyCodes)).toBe(true);
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
    }
  });

  it('competency codes should be unique', () => {
    const codes = AREA_EF.competencies.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('competency codes should be 1..5', () => {
    const codes = AREA_EF.competencies.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(['1', '2', '3', '4', '5']));
  });

  it('all criteria course values should be in {1ESO, 2ESO, 3ESO, 4ESO}', () => {
    for (const ce of AREA_EF.competencies) {
      for (const cr of ce.criteria) {
        expect(VALID_COURSES_SET.has(cr.course)).toBe(true);
        expect(cr.code).toBeTruthy();
        expect(cr.description).toBeTruthy();
      }
    }
  });

  it('criteria codes should follow pattern <ceCode>.<n>', () => {
    for (const ce of AREA_EF.competencies) {
      for (const cr of ce.criteria) {
        expect(cr.code).toMatch(new RegExp(`^${ce.code}\\.\\d+$`));
      }
    }
  });

  it('each competency should have criteria for all 4 courses', () => {
    for (const ce of AREA_EF.competencies) {
      const courses = new Set<Course>(ce.criteria.map((c) => c.course));
      for (const course of VALID_COURSES) {
        expect(courses.has(course)).toBe(true);
      }
    }
  });

  it('should have 6 knowledge blocks', () => {
    expect(AREA_EF.knowledgeBlocks).toHaveLength(6);
  });

  it('knowledge block letters should be A..F', () => {
    const letters = AREA_EF.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('each knowledge block should have a title and items', () => {
    for (const block of AREA_EF.knowledgeBlocks) {
      expect(block.title).toBeTruthy();
      expect(Array.isArray(block.items)).toBe(true);
      expect(block.items.length).toBeGreaterThan(0);
    }
  });

  it('all knowledge block item course values should be in {1ESO, 2ESO, 3ESO, 4ESO}', () => {
    for (const block of AREA_EF.knowledgeBlocks) {
      for (const item of block.items) {
        expect(VALID_COURSES_SET.has(item.course)).toBe(true);
        expect(item.code).toBeTruthy();
        expect(item.description).toBeTruthy();
      }
    }
  });

  it('knowledge block item codes should start with the block letter', () => {
    for (const block of AREA_EF.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code.startsWith(block.letter)).toBe(true);
      }
    }
  });
});
