import { AREA_DIG } from './digitalizacion.data';

describe('AREA_DIG - Digitalización 4ESO', () => {
  it('should not be null', () => {
    expect(AREA_DIG).not.toBeNull();
  });

  it('should have correct subject metadata', () => {
    expect(AREA_DIG.subjectCode).toBe('DIG-4ESO');
    expect(AREA_DIG.abbrev).toBe('DIG');
    expect(AREA_DIG.areaName).toBe('Digitalización');
  });

  it('should have 4 competencias específicas', () => {
    expect(AREA_DIG.competencies).toHaveLength(4);
  });

  it('should have competencias with codes 1 through 4', () => {
    const codes = AREA_DIG.competencies.map((c) => c.code);
    expect(codes).toEqual(['1', '2', '3', '4']);
  });

  it('every competencia should have a non-empty description', () => {
    for (const ce of AREA_DIG.competencies) {
      expect(typeof ce.description).toBe('string');
      expect(ce.description.length).toBeGreaterThan(0);
    }
  });

  it('every competencia should have at least one keyCompetencyCode', () => {
    for (const ce of AREA_DIG.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
    }
  });

  it('should have the expected number of criteria per competencia', () => {
    const criteriaCount = AREA_DIG.competencies.map((c) => c.criteria.length);
    expect(criteriaCount).toEqual([3, 4, 3, 4]);
  });

  it('all criteria should have course set to 4ESO', () => {
    for (const ce of AREA_DIG.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.course).toBe('4ESO');
      }
    }
  });

  it('all criteria should have non-empty descriptions', () => {
    for (const ce of AREA_DIG.competencies) {
      for (const criterion of ce.criteria) {
        expect(typeof criterion.description).toBe('string');
        expect(criterion.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('criteria codes should follow n.m pattern', () => {
    const codePattern = /^\d+\.\d+$/;
    for (const ce of AREA_DIG.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.code).toMatch(codePattern);
      }
    }
  });

  it('should have 4 knowledge blocks', () => {
    expect(AREA_DIG.knowledgeBlocks).toHaveLength(4);
  });

  it('knowledge blocks should have correct letters', () => {
    const letters = AREA_DIG.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('knowledge blocks should have non-empty titles', () => {
    for (const block of AREA_DIG.knowledgeBlocks) {
      expect(typeof block.title).toBe('string');
      expect(block.title.length).toBeGreaterThan(0);
    }
  });

  it('all knowledge block items should have course set to 4ESO', () => {
    for (const block of AREA_DIG.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
      }
    }
  });

  it('all knowledge block items should have non-empty descriptions', () => {
    for (const block of AREA_DIG.knowledgeBlocks) {
      for (const item of block.items) {
        expect(typeof item.description).toBe('string');
        expect(item.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('block A should have 4 items (arquitectura, SO, comunicación, IoT)', () => {
    const blockA = AREA_DIG.knowledgeBlocks.find((b) => b.letter === 'A');
    expect(blockA?.items).toHaveLength(4);
  });

  it('block B should have 4 items (búsqueda, edición, comunicación, publicación)', () => {
    const blockB = AREA_DIG.knowledgeBlocks.find((b) => b.letter === 'B');
    expect(blockB?.items).toHaveLength(4);
  });

  it('block C should have 3 items (dispositivos, datos, salud)', () => {
    const blockC = AREA_DIG.knowledgeBlocks.find((b) => b.letter === 'C');
    expect(blockC?.items).toHaveLength(3);
  });

  it('block D should have 5 items (interactividad, mediática, gestiones, comercio, ética)', () => {
    const blockD = AREA_DIG.knowledgeBlocks.find((b) => b.letter === 'D');
    expect(blockD?.items).toHaveLength(5);
  });
});
