import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { TimezoneService, TimezoneConfig } from '../services/timezone.service';

class UpdateTimezoneConfigDto {
  timezone?: string;
  displayFormat?: string;
  autoDST?: boolean;
}

@ApiTags('settings/timezone')
@Controller('settings/timezone')
export class TimezoneController {
  constructor(private readonly timezoneService: TimezoneService) {}

  @Get('public-config')
  @Public()
  @ApiOperation({ summary: 'Obtener configuración pública de timezone del sistema' })
  @ApiResponse({
    status: 200,
    description: 'Configuración pública obtenida exitosamente',
  })
  async getPublicTimezoneConfig() {
    const config = await this.timezoneService.getTimezoneConfig();
    return {
      success: true,
      data: {
        timezone: config.timezone,
        displayFormat: config.displayFormat,
        autoDST: config.autoDST,
      },
    };
  }

  @Get('config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener configuración de timezone del sistema (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Configuración obtenida exitosamente',
  })
  async getTimezoneConfig() {
    const config = await this.timezoneService.getTimezoneConfig();
    return {
      success: true,
      data: config,
    };
  }

  @Post('config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Actualizar configuración de timezone del sistema' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente',
  })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async updateTimezoneConfig(@Body() updateDto: UpdateTimezoneConfigDto) {
    const config = await this.timezoneService.updateTimezoneConfig(updateDto);
    return {
      success: true,
      message: 'Configuración de timezone actualizada exitosamente. El sistema aplicará los cambios en unos momentos.',
      data: config,
    };
  }

  @Post('invalidate-cache')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Invalidar cache de timezone y forzar recarga' })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidado exitosamente',
  })
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  async invalidateTimezoneCache() {
    this.timezoneService.invalidateCache();
    return {
      success: true,
      message: 'Cache de timezone invalidado. Los clientes deberán refrescar para ver los cambios.',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('current-time')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener hora actual del sistema' })
  @ApiResponse({
    status: 200,
    description: 'Hora actual obtenida exitosamente',
  })
  async getCurrentTime() {
    const config = await this.timezoneService.getTimezoneConfig();
    const now = new Date();

    return {
      success: true,
      data: {
        currentTime: now.toISOString(),
        timezone: config.timezone,
        formatted: await this.timezoneService.formatDateWithTimezone(now),
      },
    };
  }

  @Get('available')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener zonas horarias disponibles' })
  @ApiResponse({
    status: 200,
    description: 'Lista de zonas horarias disponibles',
  })
  getAvailableTimezones() {
    return {
      success: true,
      data: this.timezoneService.getAvailableTimezones(),
    };
  }
}