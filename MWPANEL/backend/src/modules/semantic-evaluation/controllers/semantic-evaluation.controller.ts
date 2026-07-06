import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { SemanticEvaluationService } from '../services/semantic-evaluation.service';
import { SuggestCompetenciesDto } from '../dto/suggest-competencies.dto';
import { CompetencySuggestionDto } from '../dto/competency-suggestion.dto';
import { SaveEvaluationDto } from '../dto/save-evaluation.dto';
import { AutoActivityEvaluation } from '../entities/auto-activity-evaluation.entity';
import { NlpService } from '../services/nlp.service';

@ApiTags('Evaluación Semántica')
@Controller('semantic-evaluation')
export class SemanticEvaluationController {
  constructor(
    private readonly semanticEvaluationService: SemanticEvaluationService,
    private readonly nlpService: NlpService,
  ) {}

  @Post('suggest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Sugerir competencias para una actividad',
    description: 'Utiliza IA para sugerir competencias específicas, saberes básicos y criterios de evaluación relevantes para una actividad educativa'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sugerencias generadas exitosamente',
    type: [CompetencySuggestionDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado - Solo profesores',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async suggestCompetencies(
    @Body() suggestDto: SuggestCompetenciesDto,
    @Request() req: any,
  ): Promise<CompetencySuggestionDto[]> {
    return this.semanticEvaluationService.suggestCompetencies(
      suggestDto,
      req.user.id,
    );
  }

  @Post('save')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Guardar evaluación automática',
    description: 'Guarda las selecciones del docente sobre las sugerencias de competencias'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Evaluación guardada exitosamente',
    type: [AutoActivityEvaluation],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async saveEvaluation(
    @Body() saveDto: SaveEvaluationDto,
    @Request() req: any,
  ): Promise<AutoActivityEvaluation[]> {
    return this.semanticEvaluationService.saveEvaluation(
      saveDto,
      req.user.id,
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener historial de evaluaciones',
    description: 'Recupera el historial de evaluaciones automáticas del docente'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Historial recuperado exitosamente',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getEvaluationHistory(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ data: AutoActivityEvaluation[]; total: number }> {
    return this.semanticEvaluationService.getEvaluationHistory(
      req.user.id,
      page,
      limit,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener estadísticas de uso',
    description: 'Recupera estadísticas sobre el uso de la funcionalidad de evaluación automática'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas recuperadas exitosamente',
  })
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getUsageStats(
    @Request() req: any,
  ): Promise<any> {
    return this.semanticEvaluationService.getUsageStats(req.user.id);
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Verificar estado del servicio NLP',
    description: 'Verifica si el modelo de IA está cargado y listo para usar'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estado del servicio',
  })
  async checkHealth(): Promise<{ status: string; modelReady: boolean; modelInfo: any }> {
    return {
      status: 'OK',
      modelReady: this.nlpService.isReady(),
      modelInfo: this.nlpService.getModelInfo(),
    };
  }
}