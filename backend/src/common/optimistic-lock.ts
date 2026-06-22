// backend/src/common/optimistic-lock.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class VersionConflictException extends HttpException {
  constructor(current?: any) {
    super({ message: 'Otro usuario cambio este registro', code: 'VERSION_CONFLICT', current }, HttpStatus.CONFLICT);
  }
}

// Construye un UPDATE optimista. El llamador pasa los valores de setCols como
// params $1..$n en el mismo orden; este helper añade id y updated_at al final.
export function buildVersionedUpdate(
  table: string, setCols: string[], id: string, expectedUpdatedAt: string,
): { sql: string; params: any[] } {
  const setClause = setCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const idParam = setCols.length + 1;
  const verParam = setCols.length + 2;
  const sql = `UPDATE secretaria.${table} SET ${setClause} `
    + `WHERE id = $${idParam} AND updated_at = $${verParam} RETURNING updated_at`;
  // params de setCols los aporta el llamador; aqui solo devolvemos id+version
  return { sql, params: [id, expectedUpdatedAt] };
}
