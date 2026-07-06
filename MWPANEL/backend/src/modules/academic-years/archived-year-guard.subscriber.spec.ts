import { ForbiddenException } from '@nestjs/common';
import { assertNotArchived } from './archived-year-guard.subscriber';

describe('assertNotArchived', () => {
  const archived = new Set(['old']);

  it('lanza si la fila pertenece a un año archivado', () => {
    expect(() => assertNotArchived('old', archived)).toThrow(ForbiddenException);
  });

  it('no lanza si el año no está archivado', () => {
    expect(() => assertNotArchived('current', archived)).not.toThrow();
  });

  it('no lanza si no se puede resolver el año (fail-open ante fallo de infra)', () => {
    expect(() => assertNotArchived(null, archived)).not.toThrow();
    expect(() => assertNotArchived(undefined, archived)).not.toThrow();
  });
});
