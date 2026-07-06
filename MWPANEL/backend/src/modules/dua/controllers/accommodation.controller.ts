/**
 * @controller: AccommodationController
 * @module: DUA
 * @description: Controlador para gestión de acomodaciones DUA
 * @features: CRUD acomodaciones, flujo de aprobación, efectividad
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AccommodationService } from '../services/accommodation.service';
import { DuaAccommodation } from '../entities/dua-accommodation.entity';

@ApiTags('DUA - Acomodaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dua/accommodations')
export class AccommodationController {
  constructor(private readonly accommodationService: AccommodationService) {}

  /**
   * Crear nueva acomodación
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva acomodación DUA' })
  @ApiResponse({ status: 201, description: 'Acomodación creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Perfil DUA no encontrado' })
  async createAccommodation(
    @Body() createAccommodationDto: any,
    @Request() req: any,
  ): Promise<DuaAccommodation> {
    return await this.accommodationService.createAccommodation(
      createAccommodationDto,
      req.user.id,
    );
  }

  /**
   * Obtener todas las acomodaciones
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener todas las acomodaciones DUA' })
  @ApiResponse({ status: 200, description: 'Lista de acomodaciones obtenida exitosamente' })
  @ApiQuery({ name: 'duaProfileId', required: false, description: 'ID del perfil DUA' })
  @ApiQuery({ name: 'status', required: false, description: 'Estado de la acomodación' })
  @ApiQuery({ name: 'type', required: false, description: 'Tipo de acomodación' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  async findAllAccommodations(
    @Query() filters: any,
  ): Promise<{
    data: DuaAccommodation[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.accommodationService.findAllAccommodations(filters);
  }

  /**
   * Obtener plantillas de acomodaciones (endpoint alternativo)
   */
  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener plantillas de acomodaciones DUA' })
  @ApiResponse({ status: 200, description: 'Plantillas obtenidas exitosamente' })
  async getAccommodationTemplates(): Promise<any> {
    return await this.accommodationService.getAccommodationTemplates();
  }

  /**
   * Obtener plantillas de acomodaciones
   */
  @Get('templates/list')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener plantillas de acomodaciones DUA (lista)' })
  @ApiResponse({ status: 200, description: 'Plantillas obtenidas exitosamente' })
  async getAccommodationTemplatesList(): Promise<any> {
    return await this.accommodationService.getAccommodationTemplates();
  }

  /**
   * Obtener lista de registros de efectividad
   */
  @Get('effectiveness/list')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener lista de registros de efectividad' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Fecha de inicio' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Fecha de fin' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite de resultados' })
  @ApiResponse({ status: 200, description: 'Lista de efectividad obtenida exitosamente' })
  async getEffectivenessRecords(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    const filters: any = {};
    
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = Math.min(100, Math.max(1, Number(limit)));

    return await this.accommodationService.getEffectivenessRecords(filters);
  }

  /**
   * Obtener analytics overview de acomodaciones
   */
  @Get('analytics/overview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener analytics overview de acomodaciones' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Fecha de inicio' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Fecha de fin' })
  @ApiResponse({ status: 200, description: 'Analytics obtenidos exitosamente' })
  async getAccommodationAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const filters: any = {};
    
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return await this.accommodationService.getAccommodationAnalytics(filters);
  }

  /**
   * Obtener acomodación por ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener acomodación DUA por ID' })
  @ApiResponse({ status: 200, description: 'Acomodación obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Acomodación no encontrada' })
  async findOneAccommodation(@Param('id') id: string): Promise<DuaAccommodation> {
    return await this.accommodationService.findOneAccommodation(id);
  }

  /**
   * Actualizar acomodación
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualizar acomodación DUA' })
  @ApiResponse({ status: 200, description: 'Acomodación actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Acomodación no encontrada' })
  async updateAccommodation(
    @Param('id') id: string,
    @Body() updateAccommodationDto: any,
    @Request() req: any,
  ): Promise<DuaAccommodation> {
    return await this.accommodationService.updateAccommodation(
      id,
      updateAccommodationDto,
      req.user.id,
    );
  }

  /**
   * Eliminar acomodación
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar acomodación DUA' })
  @ApiResponse({ status: 204, description: 'Acomodación eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Acomodación no encontrada' })
  async removeAccommodation(@Param('id') id: string): Promise<void> {
    return await this.accommodationService.removeAccommodation(id);
  }

  /**
   * Cambiar estado de acomodación
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Cambiar estado de acomodación DUA' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Acomodación no encontrada' })
  async changeAccommodationStatus(
    @Param('id') id: string,
    @Body() statusDto: { status: string; comments?: string },
    @Request() req: any,
  ): Promise<DuaAccommodation> {
    return await this.accommodationService.changeAccommodationStatus(
      id,
      statusDto.status as any,
      req.user.id,
      statusDto.comments,
    );
  }

  /**
   * Obtener acomodaciones por perfil DUA
   */
  @Get('profile/:duaProfileId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener acomodaciones por perfil DUA' })
  @ApiResponse({ status: 200, description: 'Acomodaciones obtenidas exitosamente' })
  async findAccommodationsByProfile(
    @Param('duaProfileId') duaProfileId: string,
  ): Promise<DuaAccommodation[]> {
    return await this.accommodationService.findAccommodationsByProfile(duaProfileId);
  }

  /**
   * Obtener estadísticas de acomodaciones
   */
  @Get('statistics/overview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener estadísticas de acomodaciones DUA' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  async getAccommodationStatistics(@Query() filters: any): Promise<any> {
    return await this.accommodationService.getAccommodationStatistics(filters);
  }

  /**
   * Crear registro de efectividad general
   */
  @Post('effectiveness')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear registro de efectividad general' })
  @ApiResponse({ status: 201, description: 'Registro de efectividad creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createEffectivenessRecord(
    @Body() effectivenessData: any,
    @Request() req: any,
  ): Promise<any> {
    return await this.accommodationService.createEffectivenessRecord(
      effectivenessData,
      req.user.id,
    );
  }

  /**
   * Crear evaluación de efectividad para acomodación específica
   */
  @Post(':id/effectiveness')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear evaluación de efectividad para acomodación específica' })
  @ApiResponse({ status: 201, description: 'Evaluación creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Acomodación no encontrada' })
  async createEffectivenessEvaluation(
    @Param('id') accommodationId: string,
    @Body() evaluationData: any,
    @Request() req: any,
  ): Promise<any> {
    return await this.accommodationService.createEffectivenessEvaluation(
      accommodationId,
      evaluationData,
      req.user.id,
    );
  }

  /**
   * Obtener evaluaciones de efectividad
   */
  @Get(':id/effectiveness')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener evaluaciones de efectividad' })
  @ApiResponse({ status: 200, description: 'Evaluaciones obtenidas exitosamente' })
  async getEffectivenessEvaluations(@Param('id') accommodationId: string): Promise<any[]> {
    return await this.accommodationService.getEffectivenessEvaluations(accommodationId);
  }

  /**
   * Obtener promedio de efectividad
   */
  @Get(':id/effectiveness/average')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener promedio de efectividad' })
  @ApiResponse({ status: 200, description: 'Promedio obtenido exitosamente' })
  async getAverageEffectiveness(@Param('id') accommodationId: string): Promise<{ average: number }> {
    const average = await this.accommodationService.getAverageEffectiveness(accommodationId);
    return { average };
  }

}