import { Controller, Get, Param, UseGuards, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { FichaService } from './ficha.service';

@Controller('secretaria/ficha')
@UseGuards(SecretariaAuthGuard)
export class FichaController {
  constructor(private readonly svc: FichaService) {}

  @Get('by-mwpanel/:mwStudentId')
  @Roles('secretaria_admin', 'direccion')
  async byMwpanel(@Param('mwStudentId', new ParseUUIDPipe()) mwStudentId: string) {
    const ficha = await this.svc.buildFicha(mwStudentId);
    if (!ficha) throw new NotFoundException('Sin ficha en Secretaría');
    return ficha;
  }
}
