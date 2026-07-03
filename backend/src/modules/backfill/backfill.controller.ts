// backfill.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { BackfillService } from './backfill.service';

@Controller('secretaria/backfill')
@UseGuards(SecretariaAuthGuard)
export class BackfillController {
  constructor(private readonly svc: BackfillService) {}

  @Post('preview')
  @Roles('secretaria_admin', 'direccion')
  async preview() {
    return this.svc.preview();
  }
}
