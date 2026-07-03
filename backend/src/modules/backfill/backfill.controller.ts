// backfill.controller.ts
import { Controller, Post, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { BackfillService, Decision } from './backfill.service';

@Controller('secretaria/backfill')
@UseGuards(SecretariaAuthGuard)
export class BackfillController {
  constructor(private readonly svc: BackfillService) {}

  @Post('preview')
  @Roles('secretaria_admin', 'direccion')
  async preview() {
    return this.svc.preview();
  }

  @Post('apply')
  @Roles('secretaria_admin', 'direccion')
  async apply(@Body() body: { decisions: Decision[] }) {
    if (!body?.decisions) throw new BadRequestException('Falta decisions');
    return this.svc.apply(body.decisions);
  }
}
