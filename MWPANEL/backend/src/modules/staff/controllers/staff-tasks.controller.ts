/**
 * @archivo: staff-tasks.controller.ts
 * @modulo: Staff (Claustro)
 * @funcion: Controller para API de tareas del claustro
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { StaffTasksService } from '../services/staff-tasks.service';
import { CreateStaffTaskDto } from '../dto/create-staff-task.dto';
import { UpdateStaffTaskDto, UpdateStaffTaskStatusDto } from '../dto/update-staff-task.dto';
import { StaffTaskFiltersDto, StaffArchiveFiltersDto } from '../dto/staff-filters.dto';
import { CreateStaffTaskCommentDto } from '../dto/staff-comment.dto';

@Controller('staff/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class StaffTasksController {
  constructor(private readonly tasksService: StaffTasksService) {}

  // ============================================
  // RUTAS ESPECÍFICAS (DEBEN IR ANTES DE :id)
  // ============================================

  @Get('my-counts')
  getMyTaskCounts(@CurrentUser() user: { id: string }) {
    return this.tasksService.getMyTaskCounts(user.id);
  }

  @Get('my-tasks')
  findMyTasks(
    @Query() filters: StaffTaskFiltersDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.findMyTasks(filters, user.id);
  }

  @Get('my-created')
  findMyCreatedTasks(
    @Query() filters: StaffTaskFiltersDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.findMyCreatedTasks(filters, user.id);
  }

  @Get('stats')
  getStats(@CurrentUser() user: { id: string; role: UserRole }) {
    // Admin sees global stats, teachers see their own
    const userId = user.role === UserRole.ADMIN ? undefined : user.id;
    return this.tasksService.getStats(userId);
  }

  @Get('stats/by-user')
  @Roles(UserRole.ADMIN)
  getStatsByUser() {
    return this.tasksService.getStatsByUser();
  }

  @Get('archived')
  findArchived(
    @Query() filters: StaffArchiveFiltersDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.tasksService.findArchived(filters, user.id, user.role);
  }

  @Get('archived/stats')
  getArchiveStats(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.tasksService.getArchiveStats(user.id, user.role);
  }

  // ============================================
  // RUTAS BASE (GET / POST sin parámetros)
  // ============================================

  @Post()
  create(
    @Body() dto: CreateStaffTaskDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.tasksService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query() filters: StaffTaskFiltersDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.tasksService.findAll(filters, user.id, user.role);
  }

  // ============================================
  // RUTAS CON PARÁMETROS DINÁMICOS :id (AL FINAL)
  // ============================================

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.tasksService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffTaskDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffTaskStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.updateStatus(id, dto, user.id);
  }

  @Patch(':id/accept')
  acceptTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.acceptTask(id, user.id);
  }

  @Patch(':id/reactivate')
  reactivateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.reactivateTask(id, user.id);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.delete(id, user.id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStaffTaskCommentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.addComment(id, dto, user.id);
  }
}
