/**
 * @archivo: resource-assignments.controller.ts
 * @módulo: Resource Assignments - Simple Assignment System
 * @función: Controller para asignaciones simples de recursos educativos
 * @proyecto: MW Panel 2.0 - Sistema Simple de Asignaciones
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Controller REST para gestionar asignaciones simples de recursos educativos.
 * Permite a los profesores asignar recursos a estudiantes individuales o clases completas.
 */

import { Controller, Post, Get, Delete, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResourceAssignmentsService } from './resource-assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@ApiTags('resource-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resource-assignments')
export class ResourceAssignmentsController {
  constructor(
    private readonly resourceAssignmentsService: ResourceAssignmentsService,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new resource assignment' })
  @ApiResponse({ status: 201, description: 'Assignment created successfully' })
  async createAssignment(@Body() createAssignmentDto: CreateAssignmentDto, @Req() req: any) {
    return this.resourceAssignmentsService.createAssignment(createAssignmentDto, req.user.id);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get assignments for current user' })
  async getAssignments(@Req() req: any, @Query() query: any) {
    return this.resourceAssignmentsService.getAssignments(req.user.id, req.user.role, query);
  }

  @Patch(':id/complete')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Mark assignment as completed' })
  async markCompleted(@Param('id') id: string, @Req() req: any) {
    return this.resourceAssignmentsService.markCompleted(id, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an assignment' })
  async deleteAssignment(@Param('id') id: string, @Req() req: any) {
    return this.resourceAssignmentsService.deleteAssignment(id, req.user.id);
  }
}