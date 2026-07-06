import { validateSecundariaCurriculum, AreaData, SECUNDARIA_AREAS } from './secundaria-curriculum.data';

const validArea: AreaData = {
  subjectCode: 'MAT-1ESO',
  abbrev: 'MAT',
  areaName: 'Matemáticas ESO',
  competencies: [
    {
      code: '1',
      name: 'CE1',
      description: 'desc',
      keyCompetencyCodes: ['STEM'],
      criteria: [{ course: '1ESO', code: '1.1', description: 'crit' }],
    },
  ],
  knowledgeBlocks: [
    { letter: 'A', title: 'Sentido numérico', items: [{ course: '1ESO', code: 'A1.1', description: 'saber' }] },
  ],
};

describe('validateSecundariaCurriculum', () => {
  it('returns no errors for a valid area', () => {
    expect(validateSecundariaCurriculum([validArea])).toEqual([]);
  });

  it('flags an invalid key competency code', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], keyCompetencyCodes: ['XXX'] }] };
    expect(validateSecundariaCurriculum([bad]).join(' ')).toContain('XXX');
  });

  it('flags a CE with no criteria', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [] }] };
    expect(validateSecundariaCurriculum([bad]).join(' ')).toContain('sin criterios');
  });

  it('flags a malformed criterion code', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [{ course: '1ESO', code: '1-1', description: 'x' }] }] };
    expect(validateSecundariaCurriculum([bad]).join(' ')).toContain('1-1');
  });

  it('flags an invalid course', () => {
    const bad: AreaData = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [{ course: '5ESO' as any, code: '1.1', description: 'x' }] }] };
    expect(validateSecundariaCurriculum([bad]).join(' ')).toContain('curso');
  });

  it('flags a malformed knowledge code (acepta A.10 y A1.1; rechaza A-1)', () => {
    const bad: AreaData = { ...validArea, knowledgeBlocks: [{ letter: 'A', title: 'Sentido numérico', items: [{ course: '1ESO', code: 'A-1', description: 'x' }] }] };
    expect(validateSecundariaCurriculum([bad]).join(' ')).toContain('A-1');
  });

  it('flags a duplicate criterion in the same (CE, course)', () => {
    const bad: AreaData = {
      ...validArea,
      competencies: [{
        ...validArea.competencies[0],
        criteria: [
          { course: '1ESO', code: '1.1', description: 'a' },
          { course: '1ESO', code: '1.1', description: 'b' },
        ],
      }],
    };
    expect(validateSecundariaCurriculum([bad]).join(' ')).toContain('duplicad');
  });

  it('allows the same criterion code in different courses', () => {
    const ok: AreaData = {
      ...validArea,
      competencies: [{
        ...validArea.competencies[0],
        criteria: [
          { course: '1ESO', code: '1.1', description: 'a' },
          { course: '2ESO', code: '1.1', description: 'b' },
        ],
      }],
    };
    expect(validateSecundariaCurriculum([ok])).toEqual([]);
  });

  it('flags an unknown subjectCode', () => {
    const bad: AreaData = { ...validArea, subjectCode: 'NOPE-1ESO' };
    expect(validateSecundariaCurriculum([bad]).join(' ')).toContain('NOPE-1ESO');
  });
});

describe('SECUNDARIA_AREAS · Matemáticas CE+criterios', () => {
  const mat = SECUNDARIA_AREAS.find((x) => x.subjectCode === 'MAT-1ESO') as AreaData;
  it('exists and validates clean', () => { expect(mat).toBeDefined(); expect(validateSecundariaCurriculum(SECUNDARIA_AREAS)).toEqual([]); });
  it('has CE1–CE10', () => { expect(mat.competencies.map((c) => c.code)).toEqual(['1','2','3','4','5','6','7','8','9','10']); });
  it('all criterion courses valid', () => { for (const ce of mat.competencies) for (const cr of ce.criteria) expect(['1ESO','2ESO','3ESO']).toContain(cr.course); });
});

describe('SECUNDARIA_AREAS · Matemáticas saberes', () => {
  const mat = SECUNDARIA_AREAS.find((x) => x.subjectCode === 'MAT-1ESO') as AreaData;
  it('has sentidos A–F and validates clean', () => {
    expect(mat.knowledgeBlocks.map((b) => b.letter)).toEqual(['A','B','C','D','E','F']);
    expect(validateSecundariaCurriculum(SECUNDARIA_AREAS)).toEqual([]);
  });
  it('every saber course is valid', () => { for (const b of mat.knowledgeBlocks) for (const it of b.items) expect(['1ESO','2ESO','3ESO']).toContain(it.course); });
});
