import { AREA_LCL } from './lengua-castellana.data';
import { validatePrimariaCurriculum } from '../primaria-curriculum.data';

describe('AREA_LCL — Lengua Castellana y Literatura', () => {
  it('is not null', () => {
    expect(AREA_LCL).not.toBeNull();
  });

  it('passes validatePrimariaCurriculum with no errors', () => {
    expect(validatePrimariaCurriculum([AREA_LCL])).toEqual([]);
  });

  it('has the correct subject code, abbrev and area name', () => {
    expect(AREA_LCL.subjectCode).toBe('LCL-1P');
    expect(AREA_LCL.abbrev).toBe('LCL');
    expect(AREA_LCL.areaName).toBe('Lengua Castellana y Literatura');
  });

  it('has exactly 10 competencias específicas with codes 1..10', () => {
    const codes = AREA_LCL.competencies.map((c) => c.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  it('CE1 has 6 criteria (3 cycles × 2 criteria)', () => {
    expect(AREA_LCL.competencies[0].criteria).toHaveLength(6);
  });

  it('CE2 has 3 criteria (one per cycle)', () => {
    expect(AREA_LCL.competencies[1].criteria).toHaveLength(3);
  });

  it('CE3 has 6 criteria (3 cycles × 2 criteria)', () => {
    expect(AREA_LCL.competencies[2].criteria).toHaveLength(6);
  });

  it('CE4 has 6 criteria (3 cycles × 2 criteria)', () => {
    expect(AREA_LCL.competencies[3].criteria).toHaveLength(6);
  });

  it('CE5 has 3 criteria (one per cycle)', () => {
    expect(AREA_LCL.competencies[4].criteria).toHaveLength(3);
  });

  it('CE6 has 9 criteria (3 cycles × 3 criteria)', () => {
    expect(AREA_LCL.competencies[5].criteria).toHaveLength(9);
  });

  it('CE7 has 6 criteria (3 cycles × 2 criteria)', () => {
    expect(AREA_LCL.competencies[6].criteria).toHaveLength(6);
  });

  it('CE8 has 6 criteria (3 cycles × 2 criteria)', () => {
    expect(AREA_LCL.competencies[7].criteria).toHaveLength(6);
  });

  it('CE9 has 6 criteria (3 cycles × 2 criteria)', () => {
    expect(AREA_LCL.competencies[8].criteria).toHaveLength(6);
  });

  it('CE10 has 6 criteria (3 cycles × 2 criteria)', () => {
    expect(AREA_LCL.competencies[9].criteria).toHaveLength(6);
  });

  it('all criteria cycles are valid Cycle values', () => {
    const valid = new Set(['PRIMER', 'SEGUNDO', 'TERCER']);
    for (const ce of AREA_LCL.competencies) {
      for (const crit of ce.criteria) {
        expect(valid.has(crit.cycle)).toBe(true);
      }
    }
  });

  it('has exactly 4 knowledge blocks: A, B, C, D', () => {
    const letters = AREA_LCL.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
  });

  it('block A (Las lenguas y sus hablantes) has 12 items', () => {
    expect(AREA_LCL.knowledgeBlocks[0].items).toHaveLength(12);
  });

  it('block B (Comunicación) has 30 items', () => {
    expect(AREA_LCL.knowledgeBlocks[1].items).toHaveLength(30);
  });

  it('block C (Educación literaria) has 27 items', () => {
    expect(AREA_LCL.knowledgeBlocks[2].items).toHaveLength(27);
  });

  it('block D (Reflexión sobre la lengua) has 21 items', () => {
    expect(AREA_LCL.knowledgeBlocks[3].items).toHaveLength(21);
  });

  it('all saber items have valid cycle values', () => {
    const valid = new Set(['PRIMER', 'SEGUNDO', 'TERCER']);
    for (const block of AREA_LCL.knowledgeBlocks) {
      for (const item of block.items) {
        expect(valid.has(item.cycle)).toBe(true);
      }
    }
  });

  it('all CE keyCompetencyCodes are from the official 8-code set', () => {
    const valid = new Set(['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC']);
    for (const ce of AREA_LCL.competencies) {
      for (const code of ce.keyCompetencyCodes) {
        expect(valid.has(code)).toBe(true);
      }
    }
  });
});
