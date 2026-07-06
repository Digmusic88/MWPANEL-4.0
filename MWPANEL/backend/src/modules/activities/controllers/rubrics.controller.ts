import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RubricsService } from '../services/rubrics.service';
import { CreateRubricDto } from '../dto/create-rubric.dto';
import { UpdateRubricDto } from '../dto/update-rubric.dto';
import { ImportRubricDto } from '../dto/import-rubric.dto';
import { ImportRubricWithCompetenciesDto } from '../dto/import-rubric-with-competencies.dto';
import { CreateRubricAssessmentDto, UpdateRubricAssessmentDto, RubricAssessmentResponseDto } from '../dto/rubric-assessment.dto';
import { ShareRubricDto, UnshareRubricDto } from '../dto/share-rubric.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { Rubric } from '../entities/rubric.entity';
import { RubricAssessment } from '../entities/rubric-assessment.entity';

@ApiTags('rubrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rubrics')
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {
    console.log('[DEBUG] RubricsController initialized with endpoints:', [
      'POST /rubrics',
      'GET /rubrics',
      'POST /rubrics/import-with-competencies',
      'POST /rubrics/preview-import-with-competencies'
    ]);
  }

  // ==================== CRUD RÚBRICAS ====================

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nueva rúbrica' })
  @ApiResponse({ status: 201, description: 'Rúbrica creada exitosamente', type: Rubric })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Sin permisos para crear rúbricas' })
  async create(
    @Body() createRubricDto: CreateRubricDto,
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.create(createRubricDto, userId);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener rúbricas del profesor' })
  @ApiQuery({ name: 'includeTemplates', required: false, description: 'Incluir plantillas', type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de rúbricas del profesor', type: [Rubric] })
  async findAll(
    @Request() req: any,
    @Query('includeTemplates') includeTemplates?: boolean,
  ): Promise<Rubric[]> {
    const userId = req.user.sub || req.user.id;
    console.log('[DEBUG] RubricsController findAll - userId:', userId, 'userRole:', req.user.role, 'includeTemplates:', includeTemplates);
    console.log('[DEBUG] RubricsController findAll - full user object:', JSON.stringify(req.user, null, 2));
    return this.rubricsService.findAll(userId, includeTemplates === true);
  }

  @Get('shared-with-me')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener rúbricas compartidas conmigo' })
  @ApiResponse({ status: 200, description: 'Lista de rúbricas compartidas conmigo', type: [Rubric] })
  async getSharedWithMe(@Request() req: any): Promise<Rubric[]> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.getSharedWithMe(userId);
  }

  @Get('colleagues')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener lista de profesores colegas para compartir' })
  @ApiResponse({ status: 200, description: 'Lista de profesores', type: Array })
  async getColleagues(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.getColleagues(userId);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.FAMILY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener rúbrica por ID' })
  @ApiResponse({ status: 200, description: 'Rúbrica encontrada', type: Rubric })
  @ApiResponse({ status: 404, description: 'Rúbrica no encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Rubric> {
    return this.rubricsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar rúbrica' })
  @ApiResponse({ status: 200, description: 'Rúbrica actualizada exitosamente', type: Rubric })
  @ApiResponse({ status: 403, description: 'Sin permisos para editar esta rúbrica' })
  @ApiResponse({ status: 404, description: 'Rúbrica no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRubricDto: UpdateRubricDto,
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.update(id, updateRubricDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar rúbrica (soft delete)' })
  @ApiResponse({ status: 200, description: 'Rúbrica eliminada exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos para eliminar esta rúbrica' })
  @ApiResponse({ status: 404, description: 'Rúbrica no encontrada' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.sub || req.user.id;
    await this.rubricsService.remove(id, userId);
    return { message: 'Rúbrica eliminada exitosamente' };
  }

  // ==================== ENDPOINTS DE UTILIDADES ====================

  @Get('recalculate-all-max-scores')
  @Public()
  @ApiOperation({ summary: 'Recalcular puntuación máxima de todas las rúbricas (TEMPORAL)' })
  @ApiResponse({ status: 200, description: 'Todas las puntuaciones máximas recalculadas correctamente' })
  async recalculateAllMaxScores() {
    const result = await this.rubricsService.recalculateAllMaxScores();
    return {
      message: `${result.updated} rúbricas actualizadas exitosamente`,
      ...result
    };
  }

  @Patch(':id/publish')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publicar rúbrica (cambiar estado a activo)' })
  @ApiResponse({ status: 200, description: 'Rúbrica publicada exitosamente', type: Rubric })
  @ApiResponse({ status: 403, description: 'Sin permisos para publicar esta rúbrica' })
  @ApiResponse({ status: 404, description: 'Rúbrica no encontrada' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.publish(id, userId);
  }

  // ==================== IMPORTACIÓN DESDE CHATGPT ====================

  @Post('preview-import')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Vista previa de rúbrica desde ChatGPT (Markdown o CSV)' })
  @ApiResponse({ status: 200, description: 'Vista previa generada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en el formato de importación' })
  async previewImportFromChatGPT(
    @Body() previewDto: { format: string; data: string },
  ): Promise<any> {
    return this.rubricsService.previewImportFromChatGPT(previewDto.format, previewDto.data);
  }

  @Post('import')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Importar rúbrica desde ChatGPT (Markdown o CSV)' })
  @ApiResponse({ status: 201, description: 'Rúbrica importada exitosamente', type: Rubric })
  @ApiResponse({ status: 400, description: 'Error en el formato de importación' })
  async importFromChatGPT(
    @Body() importDto: ImportRubricDto,
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.importFromChatGPT(importDto, userId);
  }

  // ==================== IMPORTACIÓN CON COMPETENCIAS ====================

  @Post('competencies/suggestions')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener sugerencias de competencias para criterios de evaluación' })
  @ApiResponse({ status: 200, description: 'Sugerencias de competencias generadas' })
  async getCompetencySuggestions(
    @Body() body: { criteria: string[] },
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.getCompetencySuggestions(body.criteria, userId);
  }

  @Post('preview-import-with-competencies')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Vista previa de rúbrica con competencias desde ChatGPT' })
  @ApiResponse({ status: 200, description: 'Vista previa con competencias generada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en el formato de importación o mapeo de competencias' })
  async previewImportWithCompetencies(
    @Body() previewDto: ImportRubricWithCompetenciesDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.previewImportWithCompetencies(previewDto, userId);
  }

  @Post('import-with-competencies')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Importar rúbrica con competencias asociadas desde ChatGPT' })
  @ApiResponse({ status: 201, description: 'Rúbrica con competencias importada exitosamente', type: Rubric })
  @ApiResponse({ status: 400, description: 'Error en el formato de importación o competencias' })
  async importWithCompetencies(
    @Body() importDto: any, // Temporarily remove strict validation to debug
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    
    // DEBUG: Log incoming data to identify 400 errors
    console.log('[DEBUG] import-with-competencies endpoint called');
    console.log('[DEBUG] userId:', userId);
    console.log('[DEBUG] user role:', req.user.role);
    console.log('[DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('[DEBUG] importDto:', JSON.stringify(importDto, null, 2));
    console.log('[DEBUG] importDto.subjectAssignmentId:', importDto.subjectAssignmentId);
    console.log('[DEBUG] importDto.subjectAssignmentId type:', typeof importDto.subjectAssignmentId);
    
    // FIX: Remove invalid subjectAssignmentId if present
    if (importDto.subjectAssignmentId && (
      importDto.subjectAssignmentId === 'undefined' || 
      importDto.subjectAssignmentId === 'null' ||
      typeof importDto.subjectAssignmentId !== 'string' ||
      importDto.subjectAssignmentId.length !== 36
    )) {
      console.log('[DEBUG] Removing invalid subjectAssignmentId:', importDto.subjectAssignmentId);
      importDto.subjectAssignmentId = null;
    }
    
    try {
      console.log('[DEBUG] About to call rubricsService.importWithCompetencies');
      const result = await this.rubricsService.importWithCompetencies(importDto, userId);
      console.log('[DEBUG] import-with-competencies SUCCESS - Rubric ID:', result.id);
      console.log('[DEBUG] Returning rubric with', result.criteria?.length, 'criteria and', result.levels?.length, 'levels');
      return result;
    } catch (error) {
      console.error('[ERROR] import-with-competencies failed:', error.message);
      console.error('[ERROR] Stack:', error.stack);
      console.error('[ERROR] Error type:', error.constructor.name);
      console.error('[ERROR] Error status:', error.status);
      throw error;
    }
  }

  // ==================== EVALUACIONES CON RÚBRICAS ====================

  @Post('assessments')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crear evaluación con rúbrica' })
  @ApiResponse({ status: 201, description: 'Evaluación creada exitosamente', type: RubricAssessmentResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de evaluación inválidos' })
  async createAssessment(
    @Body() createDto: CreateRubricAssessmentDto,
  ): Promise<RubricAssessment> {
    return this.rubricsService.createAssessment(createDto);
  }

  @Get('assessments/:id')
  @Roles(UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener evaluación con rúbrica por ID' })
  @ApiResponse({ status: 200, description: 'Evaluación encontrada', type: RubricAssessmentResponseDto })
  @ApiResponse({ status: 404, description: 'Evaluación no encontrada' })
  async getAssessment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RubricAssessment> {
    return this.rubricsService.getAssessment(id);
  }

  // ==================== ENDPOINTS DE TESTING (TEMPORALES) ====================

  @Get('test/colors/:count')
  @Public()
  @ApiOperation({ summary: 'TEST: Generar colores automáticos para niveles' })
  async testGenerateColors(@Param('count') count: number) {
    // Para testing del sistema de colores
    return {
      count,
      colors: [], // Se implementaría llamando al servicio de utilidades
    };
  }

  @Post(':id/recalculate-max-score')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Recalcular puntuación máxima de una rúbrica' })
  @ApiResponse({ status: 200, description: 'Puntuación máxima recalculada correctamente' })
  async recalculateMaxScore(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const updatedRubric = await this.rubricsService.recalculateMaxScore(id);
    return {
      message: 'Puntuación máxima recalculada correctamente',
      rubricId: id,
      previousMaxScore: 0, // No tenemos el valor anterior
      newMaxScore: updatedRubric.maxScore,
      criteria: updatedRubric.criteriaCount,
      levels: updatedRubric.levelsCount,
    };
  }


  @Post('test/parse-markdown')
  @Public()
  @ApiOperation({ summary: 'TEST: Parsear tabla Markdown' })
  async testParseMarkdown(@Body() body: { data: string }) {
    // Para testing del parser de Markdown
    return {
      message: 'Parser implementado en RubricUtilsService',
      input: body.data,
    };
  }

  @Post('test/parse-csv')
  @Public()
  @ApiOperation({ summary: 'TEST: Parsear tabla CSV' })
  async testParseCSV(@Body() body: { data: string }) {
    // Para testing del parser de CSV
    return {
      message: 'Parser implementado en RubricUtilsService',
      input: body.data,
    };
  }

  // ==================== COMPARTIR RÚBRICAS ====================

  @Post(':id/share')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Compartir rúbrica con otros profesores' })
  @ApiResponse({ status: 200, description: 'Rúbrica compartida exitosamente', type: Rubric })
  @ApiResponse({ status: 403, description: 'Sin permisos para compartir esta rúbrica' })
  @ApiResponse({ status: 404, description: 'Rúbrica no encontrada' })
  async shareRubric(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() shareDto: ShareRubricDto,
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.shareRubric(id, shareDto.teacherIds, userId);
  }

  @Post(':id/unshare')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Retirar acceso de rúbrica compartida' })
  @ApiResponse({ status: 200, description: 'Acceso retirado exitosamente', type: Rubric })
  @ApiResponse({ status: 403, description: 'Sin permisos para modificar esta rúbrica' })
  @ApiResponse({ status: 404, description: 'Rúbrica no encontrada' })
  async unshareRubric(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() unshareDto: UnshareRubricDto,
    @Request() req: any,
  ): Promise<Rubric> {
    const userId = req.user.sub || req.user.id;
    return this.rubricsService.unshareRubric(id, unshareDto.teacherIds, userId);
  }
}