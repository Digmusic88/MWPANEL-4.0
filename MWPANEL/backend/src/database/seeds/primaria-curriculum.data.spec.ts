import { validatePrimariaCurriculum, AreaData, PRIMARIA_AREAS } from './primaria-curriculum.data';

const validArea: AreaData = {
  subjectCode: 'MAT-1P',
  abbrev: 'MAT',
  areaName: 'Matemáticas',
  competencies: [
    {
      code: '1',
      name: 'CE1',
      description: 'desc',
      keyCompetencyCodes: ['STEM'],
      criteria: [{ cycle: 'PRIMER', code: '1.1', description: 'crit' }],
    },
  ],
  knowledgeBlocks: [
    { letter: 'A', title: 'Sentido numérico', items: [{ cycle: 'PRIMER', code: 'A1.1', description: 'saber' }] },
  ],
};

describe('validatePrimariaCurriculum', () => {
  it('returns no errors for a valid area', () => {
    expect(validatePrimariaCurriculum([validArea])).toEqual([]);
  });
  it('flags an invalid key competency code', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], keyCompetencyCodes: ['XXX'] }] };
    expect(validatePrimariaCurriculum([bad]).join(' ')).toContain('XXX');
  });
  it('flags a CE with no criteria', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [] }] };
    expect(validatePrimariaCurriculum([bad]).join(' ')).toContain('sin criterios');
  });
  it('flags a malformed criterion code', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [{ cycle: 'PRIMER', code: '1-1', description: 'x' }] }] };
    expect(validatePrimariaCurriculum([bad]).join(' ')).toContain('1-1');
  });
  it('flags an invalid cycle', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [{ cycle: 'CUARTO' as any, code: '1.1', description: 'x' }] }] };
    expect(validatePrimariaCurriculum([bad]).join(' ')).toContain('ciclo');
  });
  it('flags a malformed knowledge code (acepta A.10 y A1.1; rechaza A-1)', () => {
    const bad: AreaData = { ...validArea, knowledgeBlocks: [{ letter: 'A', title: 'Sentido numérico', items: [{ cycle: 'PRIMER', code: 'A-1', description: 'x' }] }] };
    expect(validatePrimariaCurriculum([bad]).join(' ')).toContain('A-1');
  });
  it('accepts both flat (A.10) and sub-block (A1.1) knowledge code formats', () => {
    const ok: AreaData = { ...validArea, knowledgeBlocks: [{ letter: 'A', title: 'Bloque A', items: [{ cycle: 'PRIMER', code: 'A.10', description: 'x' }, { cycle: 'PRIMER', code: 'A1.1', description: 'y' }] }] };
    expect(validatePrimariaCurriculum([ok])).toEqual([]);
  });
  it('flags a duplicate criterion in the same (CE,cycle)', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [{ cycle: 'PRIMER', code: '1.1', description: 'a' }, { cycle: 'PRIMER', code: '1.1', description: 'b' }] }] };
    expect(validatePrimariaCurriculum([bad]).join(' ')).toContain('duplicad');
  });
  it('allows the same criterion code in different cycles', () => {
    const ok: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [{ cycle: 'PRIMER', code: '1.1', description: 'a' }, { cycle: 'SEGUNDO', code: '1.1', description: 'b' }] }] };
    expect(validatePrimariaCurriculum([ok])).toEqual([]);
  });
  it('flags an unknown subjectCode', () => {
    const bad: AreaData = { ...validArea, subjectCode: 'NOPE-1P' };
    expect(validatePrimariaCurriculum([bad]).join(' ')).toContain('NOPE-1P');
  });
});

describe('PRIMARIA_AREAS · Matemáticas CE1–CE4', () => {
  const mat = PRIMARIA_AREAS.find((x) => x.subjectCode === 'MAT-1P');
  it('exists and validates clean so far', () => {
    expect(mat).toBeDefined();
    expect(validatePrimariaCurriculum(PRIMARIA_AREAS)).toEqual([]);
  });
  it('has CE1–CE4 (subset check)', () => {
    const codes = mat!.competencies.map((c) => c.code);
    expect(codes.slice(0, 4)).toEqual(['1', '2', '3', '4']);
  });
  it('each CE has criteria in all three cycles', () => {
    for (const ce of mat!.competencies) {
      const cyc = new Set(ce.criteria.map((c) => c.cycle));
      expect([...cyc].sort()).toEqual(['PRIMER', 'SEGUNDO', 'TERCER']);
    }
  });
});

describe('PRIMARIA_AREAS · Matemáticas CE5–CE8', () => {
  const mat = PRIMARIA_AREAS.find((x) => x.subjectCode === 'MAT-1P');
  it('has all 8 CE and validates clean', () => {
    expect(mat!.competencies.map((c) => c.code)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(validatePrimariaCurriculum(PRIMARIA_AREAS)).toEqual([]);
  });
  it('has 51 criterios in total (17 codes × 3 cycles)', () => {
    const total = mat!.competencies.reduce((n, c) => n + c.criteria.length, 0);
    expect(total).toBe(51);
  });
});

describe('PRIMARIA_AREAS · Matemáticas saberes A–C', () => {
  const mat = PRIMARIA_AREAS.find((x) => x.subjectCode === 'MAT-1P');
  it('has blocks A, B, C and validates clean', () => {
    expect(mat!.knowledgeBlocks.map((b) => b.letter)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(validatePrimariaCurriculum(PRIMARIA_AREAS)).toEqual([]);
  });
  it('block A is "Sentido numérico" with items', () => {
    const A = mat!.knowledgeBlocks.find((b) => b.letter === 'A')!;
    expect(A.title).toBe('Sentido numérico');
    expect(A.items.length).toBeGreaterThan(0);
  });
});

describe('PRIMARIA_AREAS · Matemáticas completo', () => {
  const mat = PRIMARIA_AREAS.find((x) => x.subjectCode === 'MAT-1P');
  it('has the 6 sentidos A–F and validates clean', () => {
    expect(mat!.knowledgeBlocks.map((b) => b.letter)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(validatePrimariaCurriculum(PRIMARIA_AREAS)).toEqual([]);
  });
  it('every saber code matches the Primaria format <LETRA><sub>.<item>', () => {
    for (const b of mat!.knowledgeBlocks) for (const it of b.items) {
      expect(it.code).toMatch(/^[A-F]\d+\.\d+$/);
      expect(it.code[0]).toBe(b.letter);
    }
  });
});
