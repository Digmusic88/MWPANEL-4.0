import { mapFichaResponse } from './secretaria-ficha.service';

describe('mapFichaResponse', () => {
  it('200 → ok con la ficha', () => {
    const ficha = { student: { firstName: 'X' } };
    expect(mapFichaResponse(200, ficha)).toEqual({ kind: 'ok', ficha });
  });
  it('404 → none (se traducirá a 204)', () => {
    expect(mapFichaResponse(404, { message: 'Sin ficha en Secretaría' })).toEqual({ kind: 'none' });
  });
  it('500/otros → error', () => {
    expect(mapFichaResponse(500, null)).toEqual({ kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' });
    expect(mapFichaResponse(403, null)).toEqual({ kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' });
  });
});
