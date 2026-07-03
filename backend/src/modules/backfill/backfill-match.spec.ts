import { normalizeName, classifyStudents, MwLite, SecLite } from './backfill-match';

describe('normalizeName', () => {
  it('quita tildes, mayúsculas y colapsa espacios', () => {
    expect(normalizeName('  José  ', 'Ñíguez  Díaz')).toBe('jose niguez diaz');
    expect(normalizeName('ANA', 'Gómez')).toBe('ana gomez');
  });
});

describe('classifyStudents', () => {
  const sec: SecLite[] = [
    { id: 'S1', firstName: 'Asier', lastName: 'Perez', birthDate: '2018-03-05' },
    { id: 'S2', firstName: 'Luis', lastName: 'Gomez', birthDate: '2017-01-01' },
    { id: 'S3', firstName: 'Luis', lastName: 'Gomez', birthDate: '2019-01-01' },
  ];

  it('1 match de nombre → reliable con target', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M1', firstName: 'Asier', lastName: 'Pérez', birthDate: '2018-03-05' }];
    const r = classifyStudents(mw, sec);
    expect(r[0].category).toBe('reliable');
    expect(r[0].target!.secretariaId).toBe('S1');
    expect(r[0].target!.birthDateMismatch).toBe(false);
  });

  it('reliable con fecha distinta marca birthDateMismatch', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M1', firstName: 'Asier', lastName: 'Perez', birthDate: '2010-01-01' }];
    expect(classifyStudents(mw, sec)[0].target!.birthDateMismatch).toBe(true);
  });

  it('≥2 matches de nombre → dubious con candidatos', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M2', firstName: 'Luis', lastName: 'Gomez', birthDate: '2017-01-01' }];
    const r = classifyStudents(mw, sec);
    expect(r[0].category).toBe('dubious');
    expect(r[0].candidates!.map(c => c.secretariaId).sort()).toEqual(['S2', 'S3']);
  });

  it('0 matches → new', () => {
    const mw: MwLite[] = [{ mwStudentId: 'M3', firstName: 'Nadie', lastName: 'Existe', birthDate: null }];
    expect(classifyStudents(mw, sec)[0].category).toBe('new');
  });

  it('homónimos dentro de MW Panel → ambos dubious aunque haya 1 match', () => {
    const mw: MwLite[] = [
      { mwStudentId: 'M4', firstName: 'Asier', lastName: 'Perez', birthDate: '2018-03-05' },
      { mwStudentId: 'M5', firstName: 'Asier', lastName: 'Pérez', birthDate: '2015-01-01' },
    ];
    const r = classifyStudents(mw, sec);
    expect(r.find(x => x.mwStudentId === 'M4')!.category).toBe('dubious');
    expect(r.find(x => x.mwStudentId === 'M5')!.category).toBe('dubious');
  });
});
