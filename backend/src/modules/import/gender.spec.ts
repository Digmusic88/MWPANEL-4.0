import { guessGender, genderToRelationship } from './gender';

describe('guessGender', () => {
  it('nombres femeninos del diccionario', () => {
    for (const n of ['Ana', 'María García', 'Laura', 'Patricia López', 'Esther', 'Mª Jesús', 'Arantxa'])
      expect(guessGender(n)).toBe('f');
  });

  it('nombres masculinos del diccionario', () => {
    for (const n of ['David', 'Javier Pérez', 'Miguel', 'Jorge', 'Iñaki', 'José Antonio', 'Fco. Javier'])
      expect(guessGender(n)).toBe('m');
  });

  it('compuestos por el primer token', () => {
    expect(guessGender('María José')).toBe('f');
    expect(guessGender('José María')).toBe('m');
    expect(guessGender('Juan Carlos')).toBe('m');
  });

  it('respaldo por terminación', () => {
    expect(guessGender('Romina')).toBe('f'); // -a
    expect(guessGender('Eduardo')).toBe('m'); // del dict, pero también -o
    expect(guessGender('Rolando')).toBe('m'); // -o
  });

  it('inciertos → null', () => {
    expect(guessGender('Yerai')).toBe(null);
    expect(guessGender('')).toBe(null);
    expect(guessGender('Abib')).toBe('m'); // dict
  });
});

describe('genderToRelationship', () => {
  it('mapea género a relación', () => {
    expect(genderToRelationship('f')).toBe('madre');
    expect(genderToRelationship('m')).toBe('padre');
    expect(genderToRelationship(null)).toBe(null);
  });
});
