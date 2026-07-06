/**
 * @controller: DuaController
 * @module: DUA
 * @description: Controller simplificado para gestión de perfiles DUA
 * @endpoints: /api/dua
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { DuaService } from '../services/dua.service';
import { CreateDuaProfileDto, UpdateDuaProfileDto } from '../dto/dua-profile.dto';

@ApiTags('DUA Profiles')
@ApiSecurity('jwt')
@Controller('dua')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DuaController {
  constructor(private readonly duaService: DuaService) {}

  /**
   * Test endpoint para verificar que el módulo funciona
   */
  @Get('test')
  @ApiOperation({ summary: 'Test endpoint para DUA module' })
  @ApiResponse({ status: 200, description: 'DUA module funcionando' })
  async testEndpoint() {
    return {
      success: true,
      message: 'Módulo DUA funcionando correctamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Crear un nuevo perfil DUA
   */
  @Post('profiles')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear perfil DUA para un estudiante' })
  @ApiResponse({ status: 201, description: 'Perfil DUA creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para crear perfil DUA' })
  async createProfile(
    @Body() createDuaProfileDto: CreateDuaProfileDto,
    @Request() req: any,
  ) {
    try {
      const profile = await this.duaService.createProfile(
        createDuaProfileDto,
        req.user.userId,
      );

      return {
        success: true,
        message: 'Perfil DUA creado exitosamente',
        data: profile,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener todos los perfiles DUA (con filtros)
   */
  @Get('profiles')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener lista de perfiles DUA' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'evaluatedBy', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  async findAllProfiles(
    @Query('studentId') studentId?: string,
    @Query('evaluatedBy') evaluatedBy?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Request() req?: any,
  ) {
    const filters: any = {
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
    };

    if (studentId) filters.studentId = studentId;
    if (evaluatedBy) filters.evaluatedBy = evaluatedBy;
    if (isActive !== undefined) filters.isActive = isActive === true;

    // Filtrar por usuario si no es admin
    if (req.user.role !== UserRole.ADMIN) {
      filters.evaluatedBy = req.user.userId;
    }

    try {
      return await this.duaService.findAllProfiles(filters);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener un perfil DUA por ID
   */
  @Get('profiles/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener perfil DUA por ID' })
  @ApiResponse({ status: 200, description: 'Perfil DUA encontrado' })
  @ApiResponse({ status: 404, description: 'Perfil DUA no encontrado' })
  async findOneProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    try {
      const profile = await this.duaService.findOneProfile(id);

      // Verificar permisos de acceso
      if (req.user.role !== UserRole.ADMIN && profile.evaluatedBy !== req.user.userId) {
        throw new ForbiddenException('No tiene permisos para acceder a este perfil DUA');
      }

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener perfil DUA por estudiante
   */
  @Get('profiles/student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener perfil DUA de un estudiante específico' })
  @ApiResponse({ status: 200, description: 'Perfil DUA del estudiante' })
  @ApiResponse({ status: 404, description: 'Perfil DUA no encontrado para este estudiante' })
  async findProfileByStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Request() req: any,
  ) {
    try {
      const profile = await this.duaService.findProfileByStudent(studentId);

      if (!profile) {
        return {
          success: false,
          message: 'No se encontró perfil DUA para este estudiante',
          data: null,
        };
      }

      // Verificar permisos de acceso
      if (req.user.role !== UserRole.ADMIN && profile.evaluatedBy !== req.user.userId) {
        throw new ForbiddenException('No tiene permisos para acceder a este perfil DUA');
      }

      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Actualizar un perfil DUA
   */
  @Patch('profiles/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar perfil DUA' })
  @ApiResponse({ status: 200, description: 'Perfil DUA actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Perfil DUA no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para actualizar perfil DUA' })
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDuaProfileDto: UpdateDuaProfileDto,
    @Request() req: any,
  ) {
    try {
      const existingProfile = await this.duaService.findOneProfile(id);

      // Verificar permisos de edición
      if (req.user.role !== UserRole.ADMIN && existingProfile.evaluatedBy !== req.user.userId) {
        throw new ForbiddenException('No tiene permisos para editar este perfil DUA');
      }

      const profile = await this.duaService.updateProfile(id, updateDuaProfileDto);

      return {
        success: true,
        message: 'Perfil DUA actualizado exitosamente',
        data: profile,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Actualizar un perfil DUA (PUT endpoint para compatibilidad con frontend)
   */
  @Put('profiles/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar perfil DUA (PUT)' })
  @ApiResponse({ status: 200, description: 'Perfil DUA actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Perfil DUA no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para actualizar perfil DUA' })
  async updateProfilePut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDuaProfileDto: UpdateDuaProfileDto,
    @Request() req: any,
  ) {
    // Reutilizar la misma lógica que el endpoint PATCH
    return this.updateProfile(id, updateDuaProfileDto, req);
  }

  /**
   * Eliminar un perfil DUA
   */
  @Delete('profiles/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar perfil DUA' })
  @ApiResponse({ status: 200, description: 'Perfil DUA eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Perfil DUA no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar perfil DUA' })
  async removeProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    try {
      const existingProfile = await this.duaService.findOneProfile(id);

      // Verificar permisos de eliminación
      if (req.user.role !== UserRole.ADMIN && existingProfile.evaluatedBy !== req.user.userId) {
        throw new ForbiddenException('No tiene permisos para eliminar este perfil DUA');
      }

      await this.duaService.removeProfile(id);

      return {
        success: true,
        message: 'Perfil DUA eliminado exitosamente',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener estadísticas DUA
   */
  @Get('statistics')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas del sistema DUA' })
  @ApiResponse({ status: 200, description: 'Estadísticas DUA obtenidas' })
  async getStatistics(@Request() req: any) {
    try {
      const filters: any = {};

      // Filtrar por usuario si no es admin
      if (req.user.role !== UserRole.ADMIN) {
        filters.evaluatedBy = req.user.userId;
      }

      const statistics = await this.duaService.getStatistics(filters);

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener dashboard DUA general
   */
  @Get('dashboard')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener datos del dashboard DUA' })
  @ApiResponse({ status: 200, description: 'Dashboard DUA obtenido' })
  async getDashboard(@Request() req: any) {
    try {
      const filters: any = {};

      // Filtrar por usuario si no es admin
      if (req.user.role !== UserRole.ADMIN) {
        filters.evaluatedBy = req.user.userId;
      }

      const dashboard = await this.duaService.getDashboardData(filters);

      return {
        success: true,
        data: dashboard,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener dashboard overview
   */
  @Get('dashboard/overview')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener resumen del dashboard DUA' })
  @ApiResponse({ status: 200, description: 'Overview del dashboard DUA' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getDashboardOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (req.user.role !== UserRole.ADMIN) {
      filters.evaluatedBy = req.user.userId;
    }
    const overview = await this.duaService.getDashboardOverview(filters);
    return { success: true, data: overview };
  }

  /**
   * Obtener dashboard específico para profesor
   */
  @Get('dashboard/teacher')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener dashboard específico para profesor' })
  @ApiResponse({ status: 200, description: 'Dashboard del profesor' })
  async getTeacherDashboard(@Request() req: any) {
    const filters: any = {};
    if (req.user.role !== UserRole.ADMIN) {
      filters.evaluatedBy = req.user.userId;
    }
    const teacherDashboard = await this.duaService.getTeacherDashboard(filters);
    return { success: true, data: teacherDashboard };
  }

  /**
   * Exportar datos del dashboard DUA
   */
  @Get('export/dashboard')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Exportar datos del dashboard DUA' })
  @ApiQuery({ name: 'format', required: false, enum: ['excel', 'pdf'], description: 'Formato de exportación' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'includeCharts', required: false, type: Boolean })
  @ApiQuery({ name: 'includeProfiles', required: false, type: Boolean })
  @ApiQuery({ name: 'includeAccommodations', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Datos de exportación preparados' })
  async exportDashboard(
    @Query('format') format: 'excel' | 'pdf' = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeCharts') includeCharts?: boolean,
    @Query('includeProfiles') includeProfiles?: boolean,
    @Query('includeAccommodations') includeAccommodations?: boolean,
    @Request() req?: any,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (req.user.role !== UserRole.ADMIN) {
        filters.evaluatedBy = req.user.userId;
      }

      const exportOptions = {
        format,
        includeCharts: includeCharts !== false, // Por defecto true
        includeProfiles: includeProfiles !== false, // Por defecto true
        includeAccommodations: includeAccommodations !== false, // Por defecto true
      };

      const exportData = await this.duaService.exportDashboard(filters, exportOptions);

      return {
        success: true,
        data: exportData,
        message: 'Datos de exportación preparados exitosamente',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Exportar perfil DUA específico
   */
  @Get('export/profile/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Exportar perfil DUA específico' })
  @ApiResponse({ status: 200, description: 'Perfil DUA exportado' })
  async exportProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    try {
      const profile = await this.duaService.findOneProfile(id);

      // Verificar permisos de acceso
      if (req.user.role !== UserRole.ADMIN && profile.evaluatedBy !== req.user.userId) {
        throw new ForbiddenException('No tiene permisos para exportar este perfil DUA');
      }

      const exportData = await this.duaService.exportProfile(id);

      return {
        success: true,
        data: exportData,
        message: 'Perfil DUA exportado exitosamente',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener configuración DUA del sistema
   */
  @Get('config')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración DUA del sistema' })
  @ApiResponse({ status: 200, description: 'Configuración DUA obtenida' })
  async getConfig(@Request() req: any) {
    try {
      const config = await this.duaService.getConfiguration(req.user.userId, req.user.role);
      return {
        success: true,
        data: config,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Actualizar configuración DUA del usuario
   */
  @Post('config')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración DUA' })
  @ApiResponse({ status: 200, description: 'Configuración DUA actualizada' })
  async updateConfig(
    @Body() configData: any,
    @Request() req: any,
  ) {
    try {
      const updatedConfig = await this.duaService.updateConfiguration(
        req.user.userId, 
        req.user.role,
        configData
      );
      return {
        success: true,
        message: 'Configuración DUA actualizada exitosamente',
        data: updatedConfig,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener plantillas predefinidas de configuración
   */
  @Get('config/templates')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener plantillas de configuración DUA' })
  @ApiResponse({ status: 200, description: 'Plantillas de configuración obtenidas' })
  async getConfigTemplates() {
    try {
      const templates = await this.duaService.getConfigurationTemplates();
      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Restablecer configuración a valores por defecto
   */
  @Post('config/reset')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Restablecer configuración DUA a valores por defecto' })
  @ApiResponse({ status: 200, description: 'Configuración restablecida' })
  async resetConfig(@Request() req: any) {
    try {
      const defaultConfig = await this.duaService.resetConfiguration(req.user.userId);
      return {
        success: true,
        message: 'Configuración restablecida a valores por defecto',
        data: defaultConfig,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener estudiantes disponibles para crear perfiles DUA
   */
  @Get('students/available')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estudiantes disponibles para crear perfiles DUA' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes disponibles' })
  async getAvailableStudents(@Request() req: any) {
    try {
      const students = await this.duaService.getAvailableStudents(req.user.userId);
      return {
        success: true,
        data: students,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener plantillas de perfiles DUA
   */
  @Get('templates/profiles')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener plantillas de perfiles DUA' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas de perfiles' })
  async getProfileTemplates() {
    try {
      const templates = await this.duaService.getProfileTemplates();
      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Generar informe de dashboard DUA
   */
  @Get('reports/dashboard')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Generar informe de dashboard DUA' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Informe de dashboard generado' })
  async generateDashboardReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: any,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (req.user.role !== UserRole.ADMIN) {
        filters.evaluatedBy = req.user.userId;
      }

      const report = await this.duaService.generateDashboardReport(filters);
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener evaluaciones de efectividad DUA
   */
  @Get('evaluations/effectiveness')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener evaluaciones de efectividad DUA' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Evaluaciones de efectividad obtenidas' })
  async getEffectivenessEvaluations(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (limit) filters.limit = parseInt(limit, 10);
      if (req.user.role !== UserRole.ADMIN) {
        filters.evaluatedBy = req.user.userId;
      }

      const evaluations = await this.duaService.getEffectivenessEvaluations(filters);
      return {
        success: true,
        data: evaluations,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener detalles específicos para acomodaciones
   */
  @Get('accommodations/details')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener detalles específicos para acomodaciones' })
  @ApiResponse({ status: 200, description: 'Detalles de acomodaciones obtenidos' })
  async getAccommodationDetails() {
    try {
      const details = await this.duaService.getAccommodationDetails();
      return {
        success: true,
        data: details,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}