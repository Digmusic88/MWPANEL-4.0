import { slug, studentEmail, buildEnrollmentDto, MapGuardian } from './enrollment-map';

const OPTS = { educationalLevelId: 'LVL', enrollmentNumber: 'MW-2026-ABC', studentPassword: 'Pass1234', primaryPassword: 'Prim1234', secondaryPassword: 'Seco1234' };

describe('slug / studentEmail', () => {
  it('slug quita tildes y no alfanumérico', () => {
    expect(slug('José Ñú')).toBe('josenu');
    expect(slug('  Díaz-Pérez ')).toBe('diazperez');
  });
  it('studentEmail compone @mw.com y aplica sufijo', () => {
    expect(studentEmail('José', 'Pérez')).toBe('jose.perez@mw.com');
    expect(studentEmail('José', 'Pérez', 2)).toBe('jose.perez2@mw.com');
  });
});

describe('buildEnrollmentDto', () => {
  const guardians: MapGuardian[] = [
    { fullName: 'Maria Gomez', email: 'maria@x.com', phone: '600111222', isPrimary: true },
    { fullName: 'Juan Perez Ruiz', email: 'juan@x.com', phone: null, isPrimary: false },
  ];
  it('mapea alumno + primario + secundario', () => {
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, guardians, OPTS);
    expect(blockers).toEqual([]);
    expect(dto!.student).toEqual({ firstName: 'Ana', lastName: 'Gomez', email: 'ana.gomez@mw.com', password: 'Pass1234', birthDate: '2018-03-05', enrollmentNumber: 'MW-2026-ABC', educationalLevelId: 'LVL' });
    expect(dto!.family.primaryContact).toEqual({ firstName: 'Maria', lastName: 'Gomez', email: 'maria@x.com', password: 'Prim1234', phone: '600111222' });
    expect(dto!.family.secondaryContact).toEqual({ firstName: 'Juan', lastName: 'Perez Ruiz', email: 'juan@x.com', password: 'Seco1234', phone: '000000000' });
    expect(dto!.family.relationship).toBe('parent');
  });
  it('aplica emailSuffix al alumno', () => {
    const { dto } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, guardians, { ...OPTS, emailSuffix: 3 });
    expect(dto!.student.email).toBe('ana.gomez3@mw.com');
  });
  it('bloquea sin fecha de nacimiento', () => {
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: null }, guardians, OPTS);
    expect(dto).toBeNull();
    expect(blockers).toContain('Falta la fecha de nacimiento del alumno');
  });
  it('bloquea sin tutor con email', () => {
    const noEmail: MapGuardian[] = [{ fullName: 'Maria Gomez', email: null, phone: '600', isPrimary: true }];
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, noEmail, OPTS);
    expect(dto).toBeNull();
    expect(blockers).toContain('Ningún tutor tiene email; añádelo antes de crear la cuenta');
  });
  it('bloquea sin nivel educativo', () => {
    const { dto, blockers } = buildEnrollmentDto({ firstName: 'Ana', lastName: 'Gomez', birthDate: '2018-03-05' }, guardians, { ...OPTS, educationalLevelId: '' });
    expect(dto).toBeNull();
    expect(blockers).toContain('Elige el nivel educativo');
  });
});
