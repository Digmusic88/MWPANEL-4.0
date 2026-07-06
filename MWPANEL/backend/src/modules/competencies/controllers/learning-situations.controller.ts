import { 
  Controller, 
  Get, 
  Post, 
  Put, 
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
import { LearningSituationsService } from '../services/learning-situations.service';
import { CreateLearningSituationDto } from '../dto/create-learning-situation.dto';
import { UpdateLearningSituationDto } from '../dto/update-learning-situation.dto';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { LearningSituationStatus } from '../entities';

@ApiTags('Situaciones de Aprendizaje')
@Controller('learning-situations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LearningSituationsController {
  constructor(
    private readonly learningSituationsService: LearningSituationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva situación de aprendizaje' })
  @ApiResponse({ status: 201, description: 'Situación creada exitosamente' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  create(
    @Body(ValidationPipe) createDto: CreateLearningSituationDto,
    @Request() req,
  ) {
    return this.learningSituationsService.create(createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener situaciones de aprendizaje con filtros' })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'classGroupId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LearningSituationStatus })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'includeShared', required: false, type: Boolean })
  @ApiQuery({ name: 'isTemplate', required: false, type: Boolean })
  findAll(
    @Query('teacherId') teacherId?: string,
    @Query('classGroupId') classGroupId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('status') status?: LearningSituationStatus,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('includeShared') includeShared?: boolean,
    @Query('isTemplate') isTemplate?: boolean,
  ) {
    return this.learningSituationsService.findAll({
      teacherId,
      classGroupId,
      subjectId,
      status,
      startDate,
      endDate,
      includeShared,
      isTemplate,
    });
  }

  @Get('my-situations')
  @ApiOperation({ summary: 'Obtener mis situaciones de aprendizaje' })
  @ApiQuery({ name: 'includeShared', required: false, type: Boolean })
  @Roles(UserRole.TEACHER)
  findMySituations(
    @Request() req,
    @Query('includeShared') includeShared?: boolean,
  ) {
    // Pass user.id; service resolves to teacher FK internally
    return this.learningSituationsService.findMySituations(req.user.id, includeShared);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Obtener plantillas de situaciones de aprendizaje' })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'educationalLevelId', required: false })
  getTemplates(
    @Query('subjectId') subjectId?: string,
    @Query('educationalLevelId') educationalLevelId?: string,
  ) {
    return this.learningSituationsService.getTemplates(subjectId, educationalLevelId);
  }

  @Get('by-competency/:competencyId')
  @ApiOperation({ summary: 'Obtener situaciones por competencia específica' })
  @ApiParam({ name: 'competencyId' })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LearningSituationStatus })
  findByCompetency(
    @Param('competencyId', ParseUUIDPipe) competencyId: string,
    @Query('teacherId') teacherId?: string,
    @Query('status') status?: LearningSituationStatus,
  ) {
    return this.learningSituationsService.findByCompetency(competencyId, {
      teacherId,
      status,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de mis situaciones' })
  @Roles(UserRole.TEACHER)
  getStatistics(@Request() req) {
    return this.learningSituationsService.getStatistics(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una situación de aprendizaje' })
  @ApiParam({ name: 'id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    // Teachers can only see their own or shared situations
    const teacherId = req.user.role === UserRole.TEACHER ? req.user.id : undefined;
    return this.learningSituationsService.findOne(id, teacherId);
  }

  @Get(':id/dua-analysis')
  @ApiOperation({ summary: 'Analizar cobertura DUA de una situación' })
  @ApiParam({ name: 'id' })
  analyzeDUA(@Param('id', ParseUUIDPipe) id: string) {
    return this.learningSituationsService.analyzeDUACoverage(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar situación de aprendizaje' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateLearningSituationDto,
    @Request() req,
  ) {
    return this.learningSituationsService.update(id, updateDto, req.user.id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clonar una situación de aprendizaje' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'targetClassGroupId', required: false })
  @Roles(UserRole.TEACHER)
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('targetClassGroupId') targetClassGroupId: string,
    @Request() req,
  ) {
    return this.learningSituationsService.clone(id, req.user.id, targetClassGroupId);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Compartir situación con otros profesores' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.TEACHER)
  share(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('teacherIds') teacherIds: string[],
    @Request() req,
  ) {
    return this.learningSituationsService.share(id, req.user.id, teacherIds);
  }

  @Post(':id/assessments')
  @ApiOperation({ summary: 'Crear evaluación para un estudiante' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.TEACHER)
  createAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) createDto: CreateAssessmentDto,
    @Request() req,
  ) {
    return this.learningSituationsService.createAssessment(id, createDto, req.user.id);
  }

  @Get(':id/assessments')
  @ApiOperation({ summary: 'Obtener evaluaciones de una situación' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'studentId', required: false })
  getAssessments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.learningSituationsService.getAssessments(id, studentId);
  }
}