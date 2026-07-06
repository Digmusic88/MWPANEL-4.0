/**
 * @archivo: test-yourself-sections.controller.ts
 * @módulo: Tasks - Controlador de Secciones Test Yourself
 * @función: Endpoints REST para gestión de secciones personalizadas
 * @crítico: SÍ - API para organización libre de Test Yourself
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { TestYourselfSectionsService } from '../services/test-yourself-sections.service';
import {
  CreateTestYourselfSectionDto,
  UpdateTestYourselfSectionDto,
  AssignTaskToSectionDto,
  BulkAssignTasksDto,
  ReorderSectionTasksDto,
} from '../dto/test-yourself-section.dto';

@ApiTags('test-yourself-sections')
@ApiBearerAuth()
@Controller('tasks/test-yourself-sections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TestYourselfSectionsController {
  constructor(private readonly sectionsService: TestYourselfSectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener secciones del profesor con tareas asignadas' })
  @ApiResponse({ status: 200, description: 'Lista de secciones con tareas' })
  async getTeacherSections(@Request() req) {
    return this.sectionsService.getTeacherSections(req.user.sub);
  }

  @Get('unassigned')
  @ApiOperation({ summary: 'Obtener Test Yourself sin asignar a ninguna sección' })
  @ApiResponse({ status: 200, description: 'Lista de Test Yourself sin asignar' })
  async getUnassignedTasks(@Request() req) {
    return this.sectionsService.getUnassignedTasks(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva sección personalizada' })
  @ApiResponse({ status: 201, description: 'Sección creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe una sección con ese nombre' })
  async createSection(@Request() req, @Body() createDto: CreateTestYourselfSectionDto) {
    const section = await this.sectionsService.createSection(req.user.sub, createDto);
    return {
      message: 'Sección creada exitosamente',
      section,
    };
  }

  @Put(':sectionId')
  @ApiOperation({ summary: 'Actualizar sección existente' })
  @ApiResponse({ status: 200, description: 'Sección actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una sección con ese nombre' })
  async updateSection(
    @Request() req,
    @Param('sectionId') sectionId: string,
    @Body() updateDto: UpdateTestYourselfSectionDto,
  ) {
    const section = await this.sectionsService.updateSection(req.user.sub, sectionId, updateDto);
    return {
      message: 'Sección actualizada exitosamente',
      section,
    };
  }

  @Delete(':sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar sección (soft delete)' })
  @ApiResponse({ status: 204, description: 'Sección eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async deleteSection(@Request() req, @Param('sectionId') sectionId: string) {
    await this.sectionsService.deleteSection(req.user.sub, sectionId);
    return {
      message: 'Sección eliminada exitosamente',
    };
  }

  @Post('assign/:taskId')
  @ApiOperation({ summary: 'Asignar Test Yourself a una sección' })
  @ApiResponse({ status: 201, description: 'Test Yourself asignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Test Yourself o sección no encontrada' })
  async assignTaskToSection(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() assignDto: AssignTaskToSectionDto,
  ) {
    const assignment = await this.sectionsService.assignTaskToSection(req.user.sub, taskId, assignDto);
    return {
      message: 'Test Yourself asignado exitosamente',
      assignment,
    };
  }

  @Delete('unassign/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover Test Yourself de su sección actual' })
  @ApiResponse({ status: 204, description: 'Test Yourself removido exitosamente' })
  @ApiResponse({ status: 404, description: 'Test Yourself no encontrado' })
  async removeTaskFromSection(@Request() req, @Param('taskId') taskId: string) {
    await this.sectionsService.removeTaskFromSection(req.user.sub, taskId);
    return {
      message: 'Test Yourself removido de la sección exitosamente',
    };
  }

  @Post('bulk-assign')
  @ApiOperation({ summary: 'Asignación masiva de Test Yourself a una sección' })
  @ApiResponse({ status: 201, description: 'Test Yourself asignados exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección o uno de los Test Yourself no encontrado' })
  async bulkAssignTasks(@Request() req, @Body() bulkDto: BulkAssignTasksDto) {
    const assignments = await this.sectionsService.bulkAssignTasks(req.user.sub, bulkDto);
    return {
      message: `${assignments.length} Test Yourself asignados exitosamente`,
      assignments,
    };
  }

  @Put(':sectionId/reorder')
  @ApiOperation({ summary: 'Reordenar Test Yourself dentro de una sección' })
  @ApiResponse({ status: 200, description: 'Test Yourself reordenados exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada o tareas no asignadas' })
  async reorderSectionTasks(
    @Request() req,
    @Param('sectionId') sectionId: string,
    @Body() reorderDto: ReorderSectionTasksDto,
  ) {
    await this.sectionsService.reorderSectionTasks(req.user.sub, sectionId, reorderDto);
    return {
      message: 'Test Yourself reordenados exitosamente',
    };
  }
}