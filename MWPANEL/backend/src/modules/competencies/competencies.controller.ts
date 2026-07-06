import { Controller, Get, UseGuards, Param, Query, Post, Body, Put, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CompetenciesService } from './competencies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ExitProfileType, SpecificCompetency } from './entities';
import { CreateSpecificCompetencyDto, UpdateSpecificCompetencyDto } from './dto/specific-competency.dto';
import { CreateEvaluationCriterionDto, UpdateEvaluationCriterionDto } from './dto/evaluation-criterion.dto';
import { CreateBasicKnowledgeDto, UpdateBasicKnowledgeDto } from './dto/basic-knowledge.dto';

@ApiTags('Competencias')
@Controller('competencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompetenciesController {
  constructor(private readonly competenciesService: CompetenciesService) {}

  // Base route - must be last among non-parameterized routes
  @Get()
  @ApiOperation({ summary: 'Obtener todas las competencias clave' })
  findAll() {
    return this.competenciesService.findAll();
  }


  // Specific non-parameterized routes
  @Get('operative-descriptors')
  @ApiOperation({ summary: 'Obtener descriptores operativos' })
  @ApiQuery({ name: 'competencyId', required: false })
  @ApiQuery({ name: 'exitProfileType', required: false, enum: ExitProfileType })
  @ApiQuery({ name: 'exitProfileId', required: false })
  async findOperativeDescriptors(
    @Query('competencyId') competencyId?: string,
    @Query('exitProfileType') exitProfileType?: ExitProfileType,
    @Query('exitProfileId') exitProfileId?: string,
  ) {
    // Check combined filters first
    if (competencyId && exitProfileId) {
      const allDescriptors = await this.competenciesService.findDescriptorsByExitProfile(exitProfileId);

      // Filter by competencyId - handle both object and string cases
      return allDescriptors.filter(desc => {
        let descCompetencyId: string | undefined;

        if (typeof desc.competencyId === 'object' && desc.competencyId !== null) {
          // If it's an object (populated relation), get the id
          descCompetencyId = (desc.competencyId as any).id;
        } else if (typeof desc.competencyId === 'string') {
          // If it's a string (just the ID)
          descCompetencyId = desc.competencyId;
        }

        return descCompetencyId === competencyId;
      });
    }
    if (exitProfileId) {
      return this.competenciesService.findDescriptorsByExitProfile(exitProfileId);
    }
    if (competencyId) {
      return this.competenciesService.findOperativeDescriptorsByCompetency(
        competencyId,
        exitProfileType,
      );
    }
    // Return all descriptors if no filters
    return this.competenciesService.findAllOperativeDescriptors();
  }

  @Get('exit-profiles')
  @ApiOperation({ summary: 'Obtener todos los perfiles de salida' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filtrar por etapa educativa' })
  findAllExitProfiles(@Query('stage') stage?: string) {
    return this.competenciesService.findAllExitProfiles(stage);
  }

  // Parameterized routes for exit-profiles
  @Get('exit-profiles/:id/descriptors')
  @ApiOperation({ summary: 'Obtener todos los descriptores operativos de un perfil de salida' })
  @ApiParam({ name: 'id', description: 'ID del perfil de salida' })
  findDescriptorsByExitProfileId(@Param('id') exitProfileId: string) {
    return this.competenciesService.findDescriptorsByExitProfile(exitProfileId);
  }

  @Get('exit-profiles/:type')
  @ApiOperation({ summary: 'Obtener perfil de salida por tipo' })
  @ApiParam({ name: 'type', enum: ExitProfileType })
  findExitProfileByType(@Param('type') type: ExitProfileType) {
    return this.competenciesService.findExitProfileByType(type);
  }

  // Specific competencies routes
  @Get('specific/by-subject/:subjectId')
  @ApiOperation({ summary: 'Obtener competencias específicas por asignatura' })
  @ApiParam({ name: 'subjectId' })
  findSpecificCompetenciesBySubject(@Param('subjectId') subjectId: string) {
    return this.competenciesService.findSpecificCompetenciesBySubject(subjectId);
  }

  @Get('specific/by-area/:areaId')
  @ApiOperation({ summary: 'Obtener competencias específicas por área' })
  @ApiParam({ name: 'areaId' })
  findSpecificCompetenciesByArea(@Param('areaId') areaId: string) {
    return this.competenciesService.findSpecificCompetenciesByArea(areaId);
  }

  @Post('specific')
  @ApiOperation({ summary: 'Crear nueva competencia específica' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  createSpecificCompetency(@Body() data: Partial<SpecificCompetency>) {
    return this.competenciesService.createSpecificCompetency(data);
  }

  // Evaluation criteria routes
  @Get('evaluation-criteria/by-cycle/:cycleId')
  @ApiOperation({ summary: 'Obtener criterios de evaluación por ciclo' })
  @ApiParam({ name: 'cycleId' })
  findEvaluationCriteriaByCycle(@Param('cycleId') cycleId: string) {
    return this.competenciesService.findEvaluationCriteriaByCycle(cycleId);
  }

  @Get('evaluation-criteria/by-course/:courseId')
  @ApiOperation({ summary: 'Obtener criterios de evaluación por curso' })
  @ApiParam({ name: 'courseId' })
  findEvaluationCriteriaByCourse(@Param('courseId') courseId: string) {
    return this.competenciesService.findEvaluationCriteriaByCourse(courseId);
  }

  // Basic knowledge routes
  // NOTE: @Get('basic-knowledge/by-competency/:specificCompetencyId') uses a literal prefix
  // so it is resolved before the parameterized @Get('basic-knowledge/:id') below.
  @Get('basic-knowledge/by-competency/:specificCompetencyId')
  @ApiOperation({ summary: 'Obtener saberes básicos por competencia específica' })
  @ApiParam({ name: 'specificCompetencyId' })
  findBasicKnowledge(@Param('specificCompetencyId') specificCompetencyId: string) {
    return this.competenciesService.findBasicKnowledgeByCompetency(specificCompetencyId);
  }

  // ==================== BASIC KNOWLEDGE CRUD ====================
  // IMPORTANT: All these routes MUST appear before @Get(':id') to avoid
  // NestJS capturing them with the generic /:id wildcard.

  @Post('basic-knowledge')
  @ApiOperation({ summary: 'Crear un nuevo saber básico' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  createBasicKnowledge(@Body() dto: CreateBasicKnowledgeDto) {
    return this.competenciesService.createBasicKnowledge(dto);
  }

  @Get('basic-knowledge/:id')
  @ApiOperation({ summary: 'Obtener un saber básico por ID' })
  @ApiParam({ name: 'id' })
  findBasicKnowledgeById(@Param('id') id: string) {
    return this.competenciesService.findBasicKnowledgeById(id);
  }

  @Put('basic-knowledge/:id')
  @ApiOperation({ summary: 'Actualizar un saber básico' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  updateBasicKnowledge(
    @Param('id') id: string,
    @Body() dto: UpdateBasicKnowledgeDto,
  ) {
    return this.competenciesService.updateBasicKnowledge(id, dto);
  }

  @Delete('basic-knowledge/:id')
  @ApiOperation({ summary: 'Eliminar un saber básico' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBasicKnowledge(@Param('id') id: string) {
    return this.competenciesService.deleteBasicKnowledge(id);
  }

  // ==================== END BASIC KNOWLEDGE CRUD ====================

  // Framework route
  @Get('framework/:educationalLevelId')
  @ApiOperation({ summary: 'Obtener marco completo de competencias por nivel educativo' })
  @ApiParam({ name: 'educationalLevelId' })
  getCompleteCompetencyFramework(@Param('educationalLevelId') educationalLevelId: string) {
    return this.competenciesService.getCompleteCompetencyFramework(educationalLevelId);
  }

  // ==================== SPECIFIC COMPETENCIES CRUD ====================
  // IMPORTANT: These routes MUST appear before @Get(':id') to avoid NestJS
  // capturing them with the generic /:id wildcard.

  @Get('specific-competencies')
  @ApiOperation({ summary: 'Obtener todas las competencias específicas (con filtros opcionales)' })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'educationalLevelId', required: false })
  findAllSpecificCompetencies(
    @Query('subjectId') subjectId?: string,
    @Query('educationalLevelId') educationalLevelId?: string,
  ) {
    return this.competenciesService.findAllSpecificCompetencies({ subjectId, educationalLevelId });
  }

  @Post('specific-competencies')
  @ApiOperation({ summary: 'Crear una nueva competencia específica' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  createSpecificCompetencyV2(@Body() dto: CreateSpecificCompetencyDto) {
    return this.competenciesService.createSpecificCompetency(dto);
  }

  @Get('specific-competencies/:id/criteria')
  @ApiOperation({ summary: 'Obtener criterios de evaluación de una competencia específica' })
  @ApiParam({ name: 'id', description: 'ID de la competencia específica' })
  findCriteriaBySpecificCompetency(@Param('id') id: string) {
    return this.competenciesService.findCriteriaBySpecificCompetency(id);
  }

  @Get('specific-competencies/:id/knowledge')
  @ApiOperation({ summary: 'Obtener saberes básicos de una competencia específica' })
  @ApiParam({ name: 'id', description: 'ID de la competencia específica' })
  findKnowledgeBySpecificCompetency(@Param('id') id: string) {
    return this.competenciesService.findKnowledgeBySpecificCompetency(id);
  }

  @Get('specific-competencies/:id')
  @ApiOperation({ summary: 'Obtener una competencia específica por ID' })
  @ApiParam({ name: 'id' })
  findSpecificCompetencyById(@Param('id') id: string) {
    return this.competenciesService.findSpecificCompetencyById(id);
  }

  @Put('specific-competencies/:id')
  @ApiOperation({ summary: 'Actualizar una competencia específica' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  updateSpecificCompetency(
    @Param('id') id: string,
    @Body() dto: UpdateSpecificCompetencyDto,
  ) {
    return this.competenciesService.updateSpecificCompetency(id, dto);
  }

  @Delete('specific-competencies/:id')
  @ApiOperation({ summary: 'Eliminar una competencia específica' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSpecificCompetency(@Param('id') id: string) {
    return this.competenciesService.deleteSpecificCompetency(id);
  }

  // ==================== END SPECIFIC COMPETENCIES CRUD ====================

  // ==================== EVALUATION CRITERIA CRUD ====================
  // IMPORTANT: @Get('evaluation-criteria/by-cycle/:cycleId') and
  // @Get('evaluation-criteria/by-course/:courseId') are declared above (lines ~113-125)
  // and are therefore matched BEFORE @Get('evaluation-criteria/:id') below.

  @Post('evaluation-criteria')
  @ApiOperation({ summary: 'Crear un nuevo criterio de evaluación' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  createEvaluationCriterion(@Body() dto: CreateEvaluationCriterionDto) {
    return this.competenciesService.createEvaluationCriterion(dto);
  }

  @Get('evaluation-criteria/:id')
  @ApiOperation({ summary: 'Obtener un criterio de evaluación por ID' })
  @ApiParam({ name: 'id' })
  findEvaluationCriterionById(@Param('id') id: string) {
    return this.competenciesService.findEvaluationCriterionById(id);
  }

  @Put('evaluation-criteria/:id')
  @ApiOperation({ summary: 'Actualizar un criterio de evaluación' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  updateEvaluationCriterion(
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationCriterionDto,
  ) {
    return this.competenciesService.updateEvaluationCriterion(id, dto);
  }

  @Delete('evaluation-criteria/:id')
  @ApiOperation({ summary: 'Eliminar un criterio de evaluación' })
  @ApiParam({ name: 'id' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEvaluationCriterion(@Param('id') id: string) {
    return this.competenciesService.deleteEvaluationCriterion(id);
  }

  // ==================== END EVALUATION CRITERIA CRUD ====================

  // Individual competency by ID - This should be the LAST route
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una competencia clave por ID' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.competenciesService.findOne(id);
  }
}