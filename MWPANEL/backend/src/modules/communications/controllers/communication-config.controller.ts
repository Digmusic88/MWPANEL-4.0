import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { CommunicationConfigService } from '../services/communication-config.service';
import {
  CreateCommunicationConfigDto,
  UpdateCommunicationConfigDto,
  BulkCommunicationConfigDto,
  CommunicationConfigResponseDto,
} from '../dto/communication-config.dto';

@ApiTags('communications-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communications/config')
export class CommunicationConfigController {
  private readonly logger = new Logger(CommunicationConfigController.name);

  constructor(
    private readonly communicationConfigService: CommunicationConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva configuración de comunicación' })
  @ApiResponse({
    status: 201,
    description: 'Configuración creada exitosamente',
    type: CommunicationConfigResponseDto,
  })
  @Roles(UserRole.ADMIN)
  async createConfig(
    @Request() req: any,
    @Body() createDto: CreateCommunicationConfigDto,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    this.logger.log(`Admin ${userId} creating communication config`);

    return this.communicationConfigService.createConfig(createDto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar configuración de comunicación' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente',
    type: CommunicationConfigResponseDto,
  })
  @Roles(UserRole.ADMIN)
  async updateConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateCommunicationConfigDto,
  ) {
    this.logger.log(`Updating communication config ${id}`);
    return this.communicationConfigService.updateConfig(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar configuración de comunicación' })
  @ApiResponse({ status: 200, description: 'Configuración eliminada exitosamente' })
  @Roles(UserRole.ADMIN)
  async deleteConfig(@Param('id') id: string) {
    this.logger.log(`Deleting communication config ${id}`);
    return this.communicationConfigService.deleteConfig(id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener configuraciones de comunicación' })
  @ApiResponse({
    status: 200,
    description: 'Lista de configuraciones obtenida exitosamente',
    type: [CommunicationConfigResponseDto],
  })
  @Roles(UserRole.ADMIN)
  async getConfigs(@Query('teacherId') teacherId?: string) {
    this.logger.log(`Getting communication configs for teacher: ${teacherId || 'all'}`);
    return this.communicationConfigService.getConfigs(teacherId);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Crear configuraciones masivas por grupos de clase' })
  @ApiResponse({
    status: 201,
    description: 'Configuraciones creadas exitosamente',
    type: [CommunicationConfigResponseDto],
  })
  @Roles(UserRole.ADMIN)
  async bulkCreateConfigs(
    @Request() req: any,
    @Body() bulkDto: BulkCommunicationConfigDto,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    this.logger.log(`Admin ${userId} bulk creating communication configs`);

    return this.communicationConfigService.bulkCreateConfigs(bulkDto, userId);
  }

  @Get('teachers/:teacherId/families')
  @ApiOperation({ summary: 'Obtener familias que puede contactar un profesor' })
  @ApiResponse({ status: 200, description: 'Lista de IDs de familias' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getFamiliesForTeacher(@Param('teacherId') teacherId: string) {
    this.logger.log(`Getting families for teacher ${teacherId}`);
    return this.communicationConfigService.getFamiliesForTeacher(teacherId);
  }

  @Get('check/:teacherId/:familyId')
  @ApiOperation({ summary: 'Verificar si un profesor puede comunicarse con una familia' })
  @ApiResponse({ status: 200, description: 'Resultado de la verificación' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async checkCommunication(
    @Param('teacherId') teacherId: string,
    @Param('familyId') familyId: string,
  ) {
    this.logger.log(`Checking communication between teacher ${teacherId} and family ${familyId}`);
    const canCommunicate = await this.communicationConfigService.canTeacherCommunicateWithFamily(
      teacherId,
      familyId,
    );
    return { canCommunicate };
  }

  @Post('setup-tutors')
  @ApiOperation({ summary: 'Configurar automáticamente permisos de comunicación para todos los tutores' })
  @ApiResponse({ status: 200, description: 'Configuraciones de tutores creadas exitosamente' })
  @Roles(UserRole.ADMIN)
  async setupTutorConfigs(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    this.logger.log(`Admin ${userId} setting up tutor communication configs`);

    await this.communicationConfigService.setupTutorCommunicationConfigs(userId);
    return {
      message: 'Configuraciones de tutores configuradas exitosamente',
      timestamp: new Date().toISOString()
    };
  }

  @Get('tutors/summary')
  @ApiOperation({ summary: 'Obtener resumen de configuraciones de tutores' })
  @ApiResponse({ status: 200, description: 'Resumen de configuraciones de tutores' })
  @Roles(UserRole.ADMIN)
  async getTutorConfigsSummary() {
    this.logger.log('Getting tutor configurations summary');
    const summary = await this.communicationConfigService.getTutorConfigsSummary();
    return {
      summary,
      total: summary.length,
      timestamp: new Date().toISOString()
    };
  }
}