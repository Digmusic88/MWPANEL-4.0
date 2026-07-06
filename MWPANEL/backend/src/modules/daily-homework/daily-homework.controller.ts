import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DailyHomeworkService } from './daily-homework.service';
import {
  UpsertDailyHomeworkDto,
  BulkUpsertDailyHomeworkDto,
} from './dto/daily-homework.dto';

@ApiTags('daily-homework')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('daily-homework')
export class DailyHomeworkController {
  constructor(private readonly service: DailyHomeworkService) {}

  // ==================== ENDPOINTS PARA PROFESOR ====================

  @Get('groups')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Grupos del profesor para daily homework' })
  async getMyGroups(@Request() req: any) {
    return this.service.getTeacherClassGroups(req.user.sub || req.user.id);
  }

  @Get('grid')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Tabla grid de actividades diarias para un grupo y rango de fechas' })
  @ApiQuery({ name: 'classGroupId', required: true })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-02-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-02-28' })
  @ApiQuery({ name: 'subjectAssignmentId', required: false })
  async getGrid(
    @Query('classGroupId') classGroupId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('subjectAssignmentId') subjectAssignmentId: string | undefined,
    @Request() req: any,
  ) {
    return this.service.getGrid(
      classGroupId,
      startDate,
      endDate,
      subjectAssignmentId ?? null,
      req.user.sub || req.user.id,
    );
  }

  @Put('record')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear o actualizar un registro de actividad diaria (upsert)' })
  async upsertRecord(
    @Body() dto: UpsertDailyHomeworkDto,
    @Request() req: any,
  ) {
    return this.service.upsertRecord(dto, req.user.sub || req.user.id);
  }

  @Delete('record')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Eliminar un registro de actividad diaria (volver a sin registro)' })
  @ApiQuery({ name: 'recordId', required: true })
  async deleteRecord(
    @Query('recordId') recordId: string,
    @Request() req: any,
  ) {
    return this.service.deleteRecord(recordId, req.user.sub || req.user.id);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Guardado masivo de registros para un grupo/día' })
  async bulkUpsert(
    @Body() dto: BulkUpsertDailyHomeworkDto,
    @Request() req: any,
  ) {
    return this.service.bulkUpsert(dto, req.user.sub || req.user.id);
  }

  // ==================== ENDPOINTS PARA FAMILIAS ====================

  @Get('family/history')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Historial de actividades diarias de un hijo (vista familia)' })
  @ApiQuery({ name: 'studentId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getFamilyHistory(
    @Query('studentId') studentId: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Request() req: any,
  ) {
    return this.service.getFamilyHistory(studentId, req.user.sub || req.user.id, startDate, endDate);
  }
}
