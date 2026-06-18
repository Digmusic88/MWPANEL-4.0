import { splitName, stripAnnotations } from './name-splitter';

describe('stripAnnotations', () => {
  it('elimina paréntesis, asteriscos y dobles guiones', () => {
    expect(stripAnnotations('Ainhara Valente Otero (L-J-V)')).toBe('Ainhara Valente Otero');
    expect(stripAnnotations('Alicia Esquerro García*')).toBe('Alicia Esquerro García');
    expect(stripAnnotations('Anahí Sofía Carmona Vivanco--')).toBe('Anahí Sofía Carmona Vivanco');
    expect(stripAnnotations('Erika Ubano Oses (martes)')).toBe('Erika Ubano Oses');
  });
});

describe('splitName — caso estándar (1 nombre + 2 apellidos)', () => {
  it('separa nombre simple y dos apellidos', () => {
    expect(splitName('Abigail Tamayo Choco')).toMatchObject({
      firstName: 'Abigail',
      lastName: 'Tamayo Choco',
    });
  });

  it('dos palabras → nombre + un apellido', () => {
    expect(splitName('Aghiles Kennouche')).toMatchObject({
      firstName: 'Aghiles',
      lastName: 'Kennouche',
      flagged: false,
    });
  });
});

describe('splitName — nombres compuestos', () => {
  it('mantiene el nombre compuesto sin partícula', () => {
    expect(splitName('Alex Anthony Fajardo Lach')).toMatchObject({
      firstName: 'Alex Anthony',
      lastName: 'Fajardo Lach',
    });
  });

  it('María José + dos apellidos', () => {
    expect(splitName('María José Aular Bastos')).toMatchObject({
      firstName: 'María José',
      lastName: 'Aular Bastos',
    });
  });

  it('Miguel Ángel + dos apellidos', () => {
    expect(splitName('Miguel Ángel Espinoza Restrepo')).toMatchObject({
      firstName: 'Miguel Ángel',
      lastName: 'Espinoza Restrepo',
    });
  });
});

describe('splitName — apellidos con partícula inicial', () => {
  it('del Haya como primer apellido', () => {
    expect(splitName('Gonzalo del Haya López')).toMatchObject({
      firstName: 'Gonzalo',
      lastName: 'del Haya López',
    });
  });

  it('del Cerro como segundo apellido', () => {
    expect(splitName('David Alvarez del Cerro')).toMatchObject({
      firstName: 'David',
      lastName: 'Alvarez del Cerro',
    });
  });

  it('de la Paz', () => {
    expect(splitName('Hodei de la Paz Cueva')).toMatchObject({
      firstName: 'Hodei',
      lastName: 'de la Paz Cueva',
    });
  });

  it('San Miguel', () => {
    expect(splitName('Ibai San Miguel Fraile')).toMatchObject({
      firstName: 'Ibai',
      lastName: 'San Miguel Fraile',
    });
  });
});

describe('splitName — anotaciones', () => {
  it('elimina anotación y marca la fila', () => {
    const r = splitName('Erika Ubano Oses (martes)');
    expect(r.firstName).toBe('Erika');
    expect(r.lastName).toBe('Ubano Oses');
    expect(r.flagged).toBe(true);
    expect(r.reason).toContain('anotación eliminada');
  });
});

describe('splitName — casos marcados para revisión', () => {
  it('partícula nobiliaria intermedia queda marcada', () => {
    const r = splitName('Adriana Monreal Sanchez de Muniain');
    // 'de Muniain' se cuenta como bloque aparte → queda una palabra de más en nombre
    expect(r.firstName).toBe('Adriana Monreal');
    expect(r.flagged).toBe(true);
  });

  it('token en minúscula se marca', () => {
    const r = splitName('Angela Chen jin xin');
    expect(r.flagged).toBe(true);
    expect(r.reason).toContain('minúscula');
  });
});
