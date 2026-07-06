import {
  validateInfantilCurriculum,
  AreaData,
  INFANTIL_AREAS,
} from './infantil-curriculum.data';

const validArea: AreaData = {
  subjectCode: 'ARMO-1I',
  abbrev: 'CA',
  areaName: 'Crecimiento en Armonía',
  competencies: [
    {
      code: '1',
      name: 'CE1',
      description: 'desc',
      keyCompetencyCodes: ['CPSAA'],
      criteria: [{ code: '1.1', description: 'crit' }],
    },
  ],
  knowledgeBlocks: [
    { letter: 'A', title: 'Bloque A', items: [{ code: 'A.1', description: 'saber' }] },
  ],
};

describe('validateInfantilCurriculum', () => {
  it('returns no errors for a structurally valid area', () => {
    expect(validateInfantilCurriculum([validArea])).toEqual([]);
  });

  it('flags an invalid key competency code', () => {
    const bad = { ...validArea, competencies: [{ ...validArea.competencies[0], keyCompetencyCodes: ['XXX'] }] };
    expect(validateInfantilCurriculum([bad]).join(' ')).toContain('XXX');
  });

  it('flags a CE with no criteria', () => {
    const bad = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [] }] };
    expect(validateInfantilCurriculum([bad]).join(' ')).toContain('sin criterios');
  });

  it('flags a malformed criterion code', () => {
    const bad = { ...validArea, competencies: [{ ...validArea.competencies[0], criteria: [{ code: '1-1', description: 'x' }] }] };
    expect(validateInfantilCurriculum([bad]).join(' ')).toContain('1-1');
  });

  it('flags a duplicate knowledge code within a block', () => {
    const bad = { ...validArea, knowledgeBlocks: [{ letter: 'A', title: 'Bloque A', items: [{ code: 'A.1', description: 'x' }, { code: 'A.1', description: 'y' }] }] };
    expect(validateInfantilCurriculum([bad]).join(' ')).toContain('duplicad');
  });

  it('flags an unknown subjectCode', () => {
    const bad = { ...validArea, subjectCode: 'NOPE-1I' };
    expect(validateInfantilCurriculum([bad]).join(' ')).toContain('NOPE-1I');
  });
});

describe('INFANTIL_AREAS · Área 1 (Crecimiento en Armonía)', () => {
  const area = INFANTIL_AREAS.find((a) => a.subjectCode === 'ARMO-1I');

  it('exists and is structurally valid', () => {
    expect(area).toBeDefined();
    expect(validateInfantilCurriculum(INFANTIL_AREAS)).toEqual([]);
  });

  it('has 4 competencias específicas (CE1–CE4)', () => {
    expect(area!.competencies.map((c) => c.code)).toEqual(['1', '2', '3', '4']);
  });

  it('has 14 criterios de Segundo Ciclo', () => {
    const total = area!.competencies.reduce((n, c) => n + c.criteria.length, 0);
    expect(total).toBe(14);
  });

  it('has 30 saberes de Segundo Ciclo en bloques A–D', () => {
    expect(area!.knowledgeBlocks.map((b) => b.letter)).toEqual(['A', 'B', 'C', 'D']);
    const total = area!.knowledgeBlocks.reduce((n, b) => n + b.items.length, 0);
    expect(total).toBe(30);
  });
});

describe('INFANTIL_AREAS · Área 2 (Descubrimiento y Exploración del Entorno)', () => {
  const area = INFANTIL_AREAS.find((a) => a.subjectCode === 'DENT-1I');
  it('exists and the whole dataset stays valid', () => {
    expect(area).toBeDefined();
    expect(validateInfantilCurriculum(INFANTIL_AREAS)).toEqual([]);
  });
  it('has 3 competencias específicas', () => {
    expect(area!.competencies.map((c) => c.code)).toEqual(['1', '2', '3']);
  });
  it('CE2 includes the source-anomaly criterion 2.2b', () => {
    const ce2 = area!.competencies.find((c) => c.code === '2')!;
    expect(ce2.criteria.map((x) => x.code)).toContain('2.2b');
  });
  it('has blocks A–C', () => {
    expect(area!.knowledgeBlocks.map((b) => b.letter)).toEqual(['A', 'B', 'C']);
  });
});

describe('INFANTIL_AREAS · Área 3 (Comunicación y Representación de la Realidad)', () => {
  const area = INFANTIL_AREAS.find((a) => a.subjectCode === 'COMR-1I');
  it('exists and the whole dataset stays valid', () => {
    expect(area).toBeDefined();
    expect(validateInfantilCurriculum(INFANTIL_AREAS)).toEqual([]);
  });
  it('has 5 competencias específicas (CE1–CE5)', () => {
    expect(area!.competencies.map((c) => c.code)).toEqual(['1', '2', '3', '4', '5']);
  });
  it('has 9 bloques de saberes A–I', () => {
    expect(area!.knowledgeBlocks.map((b) => b.letter)).toEqual(['A','B','C','D','E','F','G','H','I']);
  });
});

describe('INFANTIL_AREAS · conjunto completo', () => {
  it('has the 3 áreas', () => {
    expect(INFANTIL_AREAS.map((a) => a.subjectCode)).toEqual(['ARMO-1I', 'DENT-1I', 'COMR-1I']);
  });
  it('has 12 competencias específicas en total', () => {
    const total = INFANTIL_AREAS.reduce((n, a) => n + a.competencies.length, 0);
    expect(total).toBe(12);
  });
});

describe('Mapeo CE↔clave', () => {
  it('every CE maps to at least one valid key competency', () => {
    for (const area of INFANTIL_AREAS) {
      for (const ce of area.competencies) {
        expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      }
    }
    expect(validateInfantilCurriculum(INFANTIL_AREAS)).toEqual([]);
  });
});
