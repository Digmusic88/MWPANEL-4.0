import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Param,
  Query,
  Body,
  Request,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { FormativeEvaluationService } from '../services/formative-evaluation.service';
import { CreateFormativeObservationDto } from '../dto/create-formative-observation.dto';
import { UpdateFormativeObservationDto } from '../dto/update-formative-observation.dto';

@ApiTags('Evaluación Formativa')
@Controller('formative-evaluation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FormativeEvaluationController {
  constructor(
    private readonly formativeEvaluationService: FormativeEvaluationService,
  ) {}

  @Post('observations')
  @ApiOperation({ summary: 'Crear nueva observación formativa' })
  @ApiResponse({ status: 201, description: 'Observación creada exitosamente' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createObservation(
    @Body(ValidationPipe) createDto: CreateFormativeObservationDto,
    @Request() req,
  ) {
    return this.formativeEvaluationService.create(createDto, req.user.id);
  }

  @Post('observations/bulk')
  @ApiOperation({ summary: 'Crear múltiples observaciones' })
  @ApiResponse({ status: 201, description: 'Observaciones creadas exitosamente' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  bulkCreateObservations(
    @Body() observations: CreateFormativeObservationDto[],
    @Request() req,
  ) {
    return this.formativeEvaluationService.bulkCreate(observations, req.user.id);
  }

  @Get('observations')
  @ApiOperation({ summary: 'Obtener observaciones con filtros' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'classGroupId', required: false })
  @ApiQuery({ name: 'specificCompetencyId', required: false })
  @ApiQuery({ name: 'evaluationCriterionId', required: false })
  @ApiQuery({ name: 'context', required: false })
  @ApiQuery({ name: 'observationType', required: false })
  @ApiQuery({ name: 'progressIndicator', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'requiresFollowUp', required: false, type: Boolean })
  findAllObservations(
    @Request() req,
    @Query('studentId') studentId?: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('specificCompetencyId') specificCompetencyId?: string,
    @Query('evaluationCriterionId') evaluationCriterionId?: string,
    @Query('context') context?: string,
    @Query('observationType') observationType?: string,
    @Query('progressIndicator') progressIndicator?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('requiresFollowUp') requiresFollowUp?: boolean,
  ) {
    const teacherId = req.user.role === UserRole.TEACHER ? req.user.id : undefined;
    
    return this.formativeEvaluationService.findAll({
      teacherId,
      studentId,
      classGroupId,
      specificCompetencyId,
      evaluationCriterionId,
      context,
      observationType,
      progressIndicator,
      startDate,
      endDate,
      requiresFollowUp,
    });
  }

  @Get('observations/my-observations')
  @ApiOperation({ summary: 'Obtener mis observaciones como profesor' })
  @Roles(UserRole.TEACHER)
  getMyObservations(@Request() req) {
    return this.formativeEvaluationService.findAll({
      teacherId: req.user.id,
    });
  }

  @Get('observations/:id')
  @ApiOperation({ summary: 'Obtener una observación específica' })
  @ApiParam({ name: 'id' })
  findOneObservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    const teacherId = req.user.role === UserRole.TEACHER ? req.user.id : undefined;
    return this.formativeEvaluationService.findOne(id, teacherId);
  }

  @Put('observations/:id')
  @ApiOperation({ summary: 'Actualizar observación' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  updateObservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateFormativeObservationDto,
    @Request() req,
  ) {
    return this.formativeEvaluationService.update(id, updateDto, req.user.id);
  }

  @Delete('observations/:id')
  @ApiOperation({ summary: 'Eliminar observación' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  removeObservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.formativeEvaluationService.remove(id, req.user.id);
  }

  @Get('students/:studentId/progress')
  @ApiOperation({ summary: 'Obtener progreso formativo de un estudiante' })
  @ApiParam({ name: 'studentId' })
  @ApiQuery({ name: 'specificCompetencyId', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  getStudentProgress(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('specificCompetencyId') specificCompetencyId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.formativeEvaluationService.getStudentProgress(studentId, {
      specificCompetencyId,
      startDate,
      endDate,
    });
  }

  @Get('class-groups/:classGroupId/summary')
  @ApiOperation({ summary: 'Obtener resumen de evaluación formativa de una clase' })
  @ApiParam({ name: 'classGroupId' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getClassGroupSummary(
    @Param('classGroupId', ParseUUIDPipe) classGroupId: string,
    @Request() req,
  ) {
    return this.formativeEvaluationService.getClassGroupSummary(
      classGroupId,
      req.user.id,
    );
  }

  @Get('dashboard/teacher')
  @ApiOperation({ summary: 'Dashboard del profesor para evaluación formativa' })
  @Roles(UserRole.TEACHER)
  getTeacherDashboard(@Request() req) {
    return this.formativeEvaluationService.getTeacherDashboard(req.user.id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar observaciones' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'classGroupId', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  exportObservations(
    @Request() req,
    @Query('studentId') studentId?: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    const teacherId = req.user.role === UserRole.TEACHER ? req.user.id : undefined;
    
    return this.formativeEvaluationService.exportObservations(
      {
        teacherId,
        studentId,
        classGroupId,
        startDate,
        endDate,
      },
      format,
    );
  }
}