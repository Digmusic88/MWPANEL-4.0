/**
 * @archivo: staff-tags.controller.ts
 * @modulo: Staff (Claustro)
 * @funcion: Controller para API de etiquetas del claustro
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { StaffTagsService } from '../services/staff-tags.service';
import { CreateStaffTagDto, UpdateStaffTagDto } from '../dto/staff-tag.dto';

@Controller('staff/tags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class StaffTagsController {
  constructor(private readonly tagsService: StaffTagsService) {}

  @Post()
  create(@Body() dto: CreateStaffTagDto) {
    return this.tagsService.create(dto);
  }

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tagsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffTagDto,
  ) {
    return this.tagsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.tagsService.delete(id);
  }
}
