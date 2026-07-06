import { AREA_TEC } from './tecnologia.data';

describe('AREA_TEC seed data', () => {
  it('should not be null', () => {
    expect(AREA_TEC).not.toBeNull();
  });

  it('should have correct metadata', () => {
    expect(AREA_TEC.subjectCode).toBe('TEC-1ESO');
    expect(AREA_TEC.abbrev).toBe('TEC');
    expect(AREA_TEC.areaName).toBe('Tecnología y Digitalización');
  });

  it('should have competencias específicas', () => {
    expect(AREA_TEC.competencies.length).toBeGreaterThan(0);
  });

  it('should have valid CE codes', () => {
    for (const ce of AREA_TEC.competencies) {
      expect(ce.code).toMatch(/^\d+$/);
    }
  });

  it('should have criteria with valid courses', () => {
    const validCourses = new Set(['1ESO', '2ESO', '3ESO']);
    for (const ce of AREA_TEC.competencies) {
      for (const c of ce.criteria) {
        expect(validCourses.has(c.course)).toBe(true);
      }
    }
  });

  it('should have knowledge blocks', () => {
    expect(AREA_TEC.knowledgeBlocks.length).toBeGreaterThan(0);
  });

  it('should have knowledge block items with valid courses', () => {
    const validCourses = new Set(['1ESO', '2ESO', '3ESO']);
    for (const block of AREA_TEC.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validCourses.has(item.course)).toBe(true);
      }
    }
  });
});
