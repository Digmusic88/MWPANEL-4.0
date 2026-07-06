import { AREA_VCE } from './valores-civicos.data';
import { validateSecundariaCurriculum } from '../secundaria-curriculum.data';

describe('AREA_VCE', () => {
  it('should not be null', () => {
    expect(AREA_VCE).not.toBeNull();
  });

  it('should have correct subjectCode, abbrev and areaName', () => {
    expect(AREA_VCE.subjectCode).toBe('VCE-3ESO');
    expect(AREA_VCE.abbrev).toBe('VCE');
    expect(AREA_VCE.areaName).toBe('Educación en Valores Cívicos y Éticos');
  });

  it('should have 4 competencias específicas', () => {
    expect(AREA_VCE.competencies).toHaveLength(4);
  });

  it('should have CE codes 1 through 4', () => {
    const codes = AREA_VCE.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4']);
  });

  it('should have all criteria with course 3ESO', () => {
    for (const ce of AREA_VCE.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.course).toBe('3ESO');
      }
    }
  });

  it('should have correct criteria counts per competencia', () => {
    expect(AREA_VCE.competencies[0].criteria).toHaveLength(3); // CE1: 1.1, 1.2, 1.3
    expect(AREA_VCE.competencies[1].criteria).toHaveLength(6); // CE2: 2.1–2.6
    expect(AREA_VCE.competencies[2].criteria).toHaveLength(3); // CE3: 3.1–3.3
    expect(AREA_VCE.competencies[3].criteria).toHaveLength(1); // CE4: 4.1
  });

  it('should have all knowledge block items with course 3ESO', () => {
    for (const block of AREA_VCE.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('3ESO');
      }
    }
  });

  it('should have 3 knowledge blocks (A, B, C)', () => {
    expect(AREA_VCE.knowledgeBlocks).toHaveLength(3);
    const letters = AREA_VCE.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('should have correct item counts per knowledge block', () => {
    const blockA = AREA_VCE.knowledgeBlocks.find((b) => b.letter === 'A');
    const blockB = AREA_VCE.knowledgeBlocks.find((b) => b.letter === 'B');
    const blockC = AREA_VCE.knowledgeBlocks.find((b) => b.letter === 'C');
    expect(blockA?.items).toHaveLength(9);
    expect(blockB?.items).toHaveLength(10);
    expect(blockC?.items).toHaveLength(5);
  });

  it('should have valid keyCompetencyCodes on all competencies', () => {
    const validCodes = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'];
    for (const ce of AREA_VCE.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      for (const code of ce.keyCompetencyCodes) {
        expect(validCodes).toContain(code);
      }
    }
  });

  it('should have non-empty descriptions on all criteria', () => {
    for (const ce of AREA_VCE.competencies) {
      for (const criterion of ce.criteria) {
        expect(criterion.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have non-empty descriptions on all knowledge items', () => {
    for (const block of AREA_VCE.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should pass validateSecundariaCurriculum with no errors', () => {
    const errors = validateSecundariaCurriculum([AREA_VCE]);
    expect(errors).toEqual([]);
  });
});
