// backend/src/common/optimistic-lock.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class VersionConflictException extends HttpException {
  constructor(current?: any) {
    super({ message: 'Otro usuario cambio este registro', code: 'VERSION_CONFLICT', current }, HttpStatus.CONFLICT);
  }
}
