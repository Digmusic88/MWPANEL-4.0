import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { ScheduledMessagesService } from '../services/scheduled-messages.service';
import { ScheduledTargetType } from '../entities/scheduled-message.entity';

@ApiTags('scheduled-messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/scheduled-messages')
export class ScheduledMessagesController {
  constructor(private readonly scheduledMessagesService: ScheduledMessagesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Programar un envío de mensaje para una fecha/hora futura' })
  create(
    @Request() req: any,
    @Body() body: {
      subject?: string;
      content: string;
      contentType?: string;
      priority?: string;
      targetType: ScheduledTargetType;
      recipientId?: string;
      classGroupIds?: string[];
      scheduledFor: string;
    },
  ) {
    return this.scheduledMessagesService.create(req.user.id, req.user.role, body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Listar mis envíos programados' })
  list(@Request() req: any) {
    return this.scheduledMessagesService.listForUser(req.user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Editar un envío programado pendiente (incluye mensajes masivos)' })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: {
      subject?: string;
      content?: string;
      contentType?: string;
      priority?: string;
      targetType?: ScheduledTargetType;
      recipientId?: string;
      classGroupIds?: string[];
      scheduledFor?: string;
    },
  ) {
    return this.scheduledMessagesService.update(id, req.user.id, req.user.role, body);
  }

  @Delete(':id/permanent')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar definitivamente un envío programado cancelado/enviado/con error' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.scheduledMessagesService.remove(id, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Cancelar un envío programado pendiente' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.scheduledMessagesService.cancel(id, req.user.id, req.user.role);
  }
}
