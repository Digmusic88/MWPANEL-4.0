import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { BirthdayAutomationService } from '../services/birthday-automation.service';
import { EmailService } from '../services/email.service';

@ApiTags('Communications - Cron Test')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/cron-test')
export class CronTestController {
  constructor(
    private readonly birthdayAutomationService: BirthdayAutomationService,
    private readonly emailService: EmailService,
  ) {}

  @Post('birthday-manual')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ejecutar manualmente la automatización de cumpleaños' })
  @ApiResponse({ status: 200, description: 'Automatización ejecutada correctamente' })
  async runBirthdayManual() {
    console.log('🎂 Manual birthday automation triggered via controller');
    await this.birthdayAutomationService.checkBirthdayAutomations();
    return { 
      success: true, 
      message: 'Birthday automation executed manually',
      timestamp: new Date().toISOString()
    };
  }

  @Post('process-birthday-emails')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Procesar emails de cumpleaños directamente' })
  @ApiResponse({ status: 200, description: 'Emails procesados correctamente' })
  async processBirthdayEmails() {
    console.log('📧 Processing birthday emails directly via controller');
    await this.emailService.processBirthdayAutomations();
    return { 
      success: true, 
      message: 'Birthday emails processed',
      timestamp: new Date().toISOString()
    };
  }

  @Get('status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verificar estado de los servicios de cron' })
  @ApiResponse({ status: 200, description: 'Estado de los servicios' })
  async getCronStatus() {
    return {
      birthdayAutomationService: !!this.birthdayAutomationService,
      emailService: !!this.emailService,
      currentTime: new Date().toISOString(),
      serverTime: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
    };
  }
}