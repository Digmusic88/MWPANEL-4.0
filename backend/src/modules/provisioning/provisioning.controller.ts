// provisioning.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SecretariaAuthGuard, Roles } from '../../common/secretaria-auth.guard';
import { ProvisioningService, LEVELS } from './provisioning.service';

@Controller('secretaria/provisioning')
@UseGuards(SecretariaAuthGuard)
export class ProvisioningController {
  constructor(private readonly svc: ProvisioningService) {}

  @Get('levels')
  @Roles('secretaria_admin', 'direccion')
  levels() {
    return LEVELS;
  }

  @Post(':studentId')
  @Roles('secretaria_admin', 'direccion')
  async provision(@Param('studentId') studentId: string, @Body() body: { educationalLevelId: string }) {
    if (!body?.educationalLevelId) throw new BadRequestException('Falta educationalLevelId');
    return this.svc.provision(studentId, body.educationalLevelId);
  }
}
