import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { CustomTabsService } from '../services/custom-tabs.service';
import { CreateCustomTabDto, UpdateCustomTabDto, AssignTaskToTabDto, BulkAssignTasksDto, ReorderTabsDto } from '../dto/custom-tab.dto';

@ApiTags('custom-tabs')
@ApiBearerAuth()
@Controller('tasks/custom-tabs')
export class CustomTabsController {
  constructor(private readonly customTabsService: CustomTabsService) {}

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todas las pestañas personalizadas del profesor' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pestañas obtenidas exitosamente',
  })
  async findAll(@Request() req) {
    console.log('🎯 CONTROLLER: Getting custom tabs for teacher:', req.user.teacherId);
    
    // Asegurar que existe la pestaña por defecto
    await this.customTabsService.ensureDefaultTab(req.user.teacherId);
    
    return this.customTabsService.findAllByTeacher(req.user.teacherId);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener una pestaña personalizada por ID' })
  @ApiParam({ name: 'id', description: 'ID de la pestaña personalizada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pestaña obtenida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pestaña no encontrada' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req
  ) {
    return this.customTabsService.findOne(id, req.user.teacherId);
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva pestaña personalizada' })
  @ApiResponse({ 
    status: 201, 
    description: 'Pestaña creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() createTabDto: CreateCustomTabDto,
    @Request() req
  ) {
    return this.customTabsService.create(createTabDto, req.user.teacherId);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una pestaña personalizada' })
  @ApiParam({ name: 'id', description: 'ID de la pestaña personalizada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pestaña actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pestaña no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTabDto: UpdateCustomTabDto,
    @Request() req
  ) {
    return this.customTabsService.update(id, updateTabDto, req.user.teacherId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una pestaña personalizada' })
  @ApiParam({ name: 'id', description: 'ID de la pestaña personalizada' })
  @ApiResponse({ 
    status: 204, 
    description: 'Pestaña eliminada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Pestaña no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar la pestaña por defecto' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req
  ) {
    await this.customTabsService.remove(id, req.user.teacherId);
  }

  @Post('assign/:taskId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asignar una tarea a una pestaña personalizada' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tarea asignada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Tarea o pestaña no encontrada' })
  async assignTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() assignDto: AssignTaskToTabDto,
    @Request() req
  ) {
    await this.customTabsService.assignTaskToTab(taskId, assignDto, req.user.teacherId);
    return { message: 'Tarea asignada exitosamente' };
  }

  @Delete('unassign/:taskId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar asignación de tarea de pestaña personalizada' })
  @ApiParam({ name: 'taskId', description: 'ID de la tarea' })
  @ApiResponse({ 
    status: 200, 
    description: 'Asignación removida exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async unassignTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Request() req
  ) {
    await this.customTabsService.unassignTaskFromTab(taskId, req.user.teacherId);
    return { message: 'Asignación removida exitosamente' };
  }

  @Post('bulk-assign')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asignar múltiples tareas a una pestaña personalizada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tareas asignadas exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Algunas tareas no fueron encontradas' })
  async bulkAssignTasks(
    @Body() bulkAssignDto: BulkAssignTasksDto,
    @Request() req
  ) {
    await this.customTabsService.bulkAssignTasks(bulkAssignDto, req.user.teacherId);
    return { message: 'Tareas asignadas exitosamente' };
  }

  @Put('reorder')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reordenar pestañas personalizadas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pestañas reordenadas exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Algunas pestañas no fueron encontradas' })
  async reorderTabs(
    @Body() reorderDto: ReorderTabsDto,
    @Request() req
  ) {
    await this.customTabsService.reorderTabs(reorderDto, req.user.teacherId);
    return { message: 'Pestañas reordenadas exitosamente' };
  }
}