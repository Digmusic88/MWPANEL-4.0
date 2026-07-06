import { AREA_VCE } from './valores-civicos.data';
import { validatePrimariaCurriculum } from '../primaria-curriculum.data';

describe('AREA_VCE — Educación en Valores Cívicos y Éticos', () => {
  it('is not null', () => {
    expect(AREA_VCE).not.toBeNull();
  });

  it('passes validatePrimariaCurriculum with no errors', () => {
    expect(validatePrimariaCurriculum([AREA_VCE])).toEqual([]);
  });

  it('has the correct subject code, abbrev and area name', () => {
    expect(AREA_VCE.subjectCode).toBe('VCE-5P');
    expect(AREA_VCE.abbrev).toBe('VCE');
    expect(AREA_VCE.areaName).toBe('Educación en Valores Cívicos y Éticos');
  });

  it('has exactly 4 competencias específicas with codes 1..4', () => {
    const codes = AREA_VCE.competencies.map((c) => c.code);
    expect(codes).toEqual(['1', '2', '3', '4']);
  });

  it('has the correct criteria counts per CE (3, 5, 2, 1)', () => {
    expect(AREA_VCE.competencies[0].criteria).toHaveLength(3);
    expect(AREA_VCE.competencies[1].criteria).toHaveLength(5);
    expect(AREA_VCE.competencies[2].criteria).toHaveLength(2);
    expect(AREA_VCE.competencies[3].criteria).toHaveLength(1);
  });

  it('all criteria are cycle TERCER (single-cycle area)', () => {
    for (const ce of AREA_VCE.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.cycle).toBe('TERCER');
      }
    }
  });

  it('has exactly 3 knowledge blocks: A, B, C', () => {
    const letters = AREA_VCE.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('block A has 9 items, block B has 9 items, block C has 5 items', () => {
    expect(AREA_VCE.knowledgeBlocks[0].items).toHaveLength(9);
    expect(AREA_VCE.knowledgeBlocks[1].items).toHaveLength(9);
    expect(AREA_VCE.knowledgeBlocks[2].items).toHaveLength(5);
  });

  it('all saber items are cycle TERCER (single-cycle area)', () => {
    for (const block of AREA_VCE.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.cycle).toBe('TERCER');
      }
    }
  });

  it('all CE keyCompetencyCodes are from the official 8-code set', () => {
    const valid = new Set(['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC']);
    for (const ce of AREA_VCE.competencies) {
      for (const code of ce.keyCompetencyCodes) {
        expect(valid.has(code)).toBe(true);
      }
    }
  });
});
