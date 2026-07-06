/**
 * @archivo: staff-meetings.controller.ts
 * @modulo: Staff (Claustro)
 * @funcion: Controller para API de reuniones del claustro
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
import { StaffMeetingsService } from '../services/staff-meetings.service';
import { CreateStaffMeetingDto, CreateAgendaItemDto } from '../dto/create-staff-meeting.dto';
import { UpdateStaffMeetingDto, UpdateMeetingNotesDto, UpdateAgendaItemDto, ReorderAgendaDto } from '../dto/update-staff-meeting.dto';
import { StaffMeetingFiltersDto } from '../dto/staff-filters.dto';

@Controller('staff/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class StaffMeetingsController {
  constructor(private readonly meetingsService: StaffMeetingsService) {}

  @Post()
  create(
    @Body() dto: CreateStaffMeetingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() filters: StaffMeetingFiltersDto) {
    return this.meetingsService.findAll(filters);
  }

  @Get('upcoming')
  findUpcoming(@Query('limit') limit?: number) {
    return this.meetingsService.findUpcoming(limit);
  }

  @Get('stats')
  getStats() {
    return this.meetingsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.meetingsService.findOne(id);
  }

  @Get(':id/tasks')
  async getMeetingTasks(@Param('id', ParseUUIDPipe) id: string) {
    const meeting = await this.meetingsService.findOne(id);
    return meeting.tasks;
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffMeetingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.update(id, dto, user.id);
  }

  @Patch(':id/notes')
  updateNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeetingNotesDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.updateNotes(id, dto, user.id);
  }

  @Post(':id/agenda')
  addAgendaItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAgendaItemDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.addAgendaItem(id, dto, user.id);
  }

  @Patch(':id/agenda/reorder')
  reorderAgenda(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderAgendaDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.reorderAgendaItems(id, dto.orderedIds, user.id);
  }

  @Patch(':id/agenda/:agendaId')
  updateAgendaItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('agendaId', ParseUUIDPipe) agendaId: string,
    @Body() dto: UpdateAgendaItemDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.updateAgendaItem(id, agendaId, dto, user.id);
  }

  @Delete(':id/agenda/:agendaId')
  deleteAgendaItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('agendaId', ParseUUIDPipe) agendaId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.deleteAgendaItem(id, agendaId, user.id);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.meetingsService.delete(id, user.id);
  }
}
