import { AREA_ING } from './ingles.data';
import { validatePrimariaCurriculum } from '../primaria-curriculum.data';

describe('AREA_ING — Lengua Extranjera (Inglés)', () => {
  it('is not null', () => {
    expect(AREA_ING).not.toBeNull();
  });

  it('passes validatePrimariaCurriculum with no errors', () => {
    expect(validatePrimariaCurriculum([AREA_ING])).toEqual([]);
  });

  it('has exactly 6 competencias específicas', () => {
    expect(AREA_ING.competencies).toHaveLength(6);
  });

  it('has CE codes 1 through 6', () => {
    const codes = AREA_ING.competencies.map((ce) => ce.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('all criteria have valid cycles', () => {
    const validCycles = ['PRIMER', 'SEGUNDO', 'TERCER'];
    for (const ce of AREA_ING.competencies) {
      for (const crit of ce.criteria) {
        expect(validCycles).toContain(crit.cycle);
      }
    }
  });

  it('has exactly 3 knowledge blocks (A, B, C)', () => {
    const letters = AREA_ING.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C']);
  });

  it('block titles match expected labels', () => {
    expect(AREA_ING.knowledgeBlocks[0].title).toBe('Comunicación');
    expect(AREA_ING.knowledgeBlocks[1].title).toBe('Plurilingüismo');
    expect(AREA_ING.knowledgeBlocks[2].title).toBe('Interculturalidad');
  });

  it('knowledge codes use flat A.n format (e.g. A.1, A.10)', () => {
    const flatCodeRe = /^[A-C]\.\d+$/;
    for (const block of AREA_ING.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code).toMatch(flatCodeRe);
      }
    }
  });

  it('all knowledge items have valid cycles', () => {
    const validCycles = ['PRIMER', 'SEGUNDO', 'TERCER'];
    for (const block of AREA_ING.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validCycles).toContain(item.cycle);
      }
    }
  });

  it('block A (Comunicación) has items up to A.13', () => {
    const blockA = AREA_ING.knowledgeBlocks.find((b) => b.letter === 'A')!;
    const codes = blockA.items.map((i) => i.code);
    expect(codes).toContain('A.10');
    expect(codes).toContain('A.13');
  });

  it('has correct subjectCode and abbrev', () => {
    expect(AREA_ING.subjectCode).toBe('ING-1P');
    expect(AREA_ING.abbrev).toBe('ING');
  });
});
