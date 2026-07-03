import { buildStudentFillPlan, planGuardians, computePendingFields } from './backfill-plan';

describe('buildStudentFillPlan', () => {
  it('rellena solo lo vacío en Secretaría (Secretaría prevalece)', () => {
    const mw = { birthDate: '2018-03-05', address: 'Calle 1', enrollmentNumber: 'A-100' };
    const sec = { birthDate: '2018-03-05', address: null, notes: null }; // fecha ya existe → respeta
    const p = buildStudentFillPlan(mw, sec);
    expect(p.fill.birth_date).toBeUndefined();       // no sobrescribe
    expect(p.fill.address).toBe('Calle 1');          // rellena hueco
    expect(p.fill.notes).toContain('A-100');         // enrollment → notas
    expect(p.wouldRespect).toContain('fecha de nacimiento');
  });

  it('alumno nuevo (sec=null) rellena todo lo que trae MW Panel', () => {
    const p = buildStudentFillPlan({ birthDate: '2018-03-05', address: null, enrollmentNumber: null }, null);
    expect(p.fill.birth_date).toBe('2018-03-05');
    expect(p.fill.address).toBeUndefined();
  });
});

describe('planGuardians', () => {
  const mw = [
    { fullName: 'Maria Gomez', phone: '600111222', email: 'm@x.com', isPrimary: true },
    { fullName: 'Juan Perez', phone: '600333444', email: 'j@x.com', isPrimary: false },
  ];
  it('familia nueva (sec=null) inserta todos con relación por género', () => {
    const p = planGuardians(mw, null);
    expect(p.toInsert.map(g => g.relationship)).toEqual(['madre', 'padre']);
    expect(p.addedUnmatched).toBe(false);
  });
  it('familia existente: casa por nombre y rellena solo huecos', () => {
    const sec = [{ id: 'G1', fullName: 'María Gómez', phone: null, email: 'm@x.com' }];
    const p = planGuardians(mw, sec);
    expect(p.toFillPhone).toEqual([{ id: 'G1', phone: '600111222' }]); // hueco de teléfono
    expect(p.toFillEmail).toEqual([]);                                  // email ya estaba
    expect(p.toInsert.map(g => g.fullName)).toEqual(['Juan Perez']);    // el no casado se añade
    expect(p.addedUnmatched).toBe(true);
  });
});

describe('computePendingFields', () => {
  it('lista lo que falta', () => {
    expect(computePendingFields(null, null, 1, false, false))
      .toEqual(['sin fecha de nacimiento', 'sin dirección', 'tutor sin teléfono']);
  });
  it('sin tutores', () => {
    expect(computePendingFields('2018-03-05', 'Calle 1', 0, false, false)).toEqual(['sin tutores']);
  });
  it('tutor añadido a verificar', () => {
    expect(computePendingFields('2018-03-05', 'Calle 1', 2, true, true)).toEqual(['tutor añadido, verificar']);
  });
  it('completo → vacío', () => {
    expect(computePendingFields('2018-03-05', 'Calle 1', 1, true, false)).toEqual([]);
  });
});
