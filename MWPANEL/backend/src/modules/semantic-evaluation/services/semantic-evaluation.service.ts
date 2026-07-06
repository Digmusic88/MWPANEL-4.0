import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoActivityEvaluation, DescriptorType, EducationalStage } from '../entities/auto-activity-evaluation.entity';
import { SuggestCompetenciesDto } from '../dto/suggest-competencies.dto';
import { CompetencySuggestionDto } from '../dto/competency-suggestion.dto';
import { SaveEvaluationDto } from '../dto/save-evaluation.dto';
import { NlpService } from './nlp.service';

// Importar entidades existentes para obtener los descriptores
import { Competency } from '../../competencies/entities/competency.entity';
import { OperativeDescriptor } from '../../competencies/entities/operative-descriptor.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../../competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../../competencies/entities/basic-knowledge.entity';
import { ExitProfileType } from '../../competencies/entities/exit-profile.entity';

@Injectable()
export class SemanticEvaluationService {
  private readonly logger = new Logger(SemanticEvaluationService.name);

  constructor(
    @InjectRepository(AutoActivityEvaluation)
    private readonly autoActivityEvaluationRepository: Repository<AutoActivityEvaluation>,
    @InjectRepository(Competency)
    private readonly competencyRepository: Repository<Competency>,
    @InjectRepository(OperativeDescriptor)
    private readonly operativeDescriptorRepository: Repository<OperativeDescriptor>,
    @InjectRepository(SpecificCompetency)
    private readonly specificCompetencyRepository: Repository<SpecificCompetency>,
    @InjectRepository(EvaluationCriterion)
    private readonly evaluationCriterionRepository: Repository<EvaluationCriterion>,
    @InjectRepository(BasicKnowledge)
    private readonly basicKnowledgeRepository: Repository<BasicKnowledge>,
    private readonly nlpService: NlpService,
  ) {}

  /**
   * Sugiere competencias, criterios y saberes básicos relevantes para una actividad
   */
  async suggestCompetencies(
    dto: SuggestCompetenciesDto,
    userId: string,
  ): Promise<CompetencySuggestionDto[]> {
    try {
      this.logger.log(`Generating suggestions for activity: "${dto.title}" by user: ${userId}`);

      // Generar embedding de la actividad
      const activityText = `${dto.title}. ${dto.description}`;
      const activityEmbedding = await this.nlpService.generateEmbedding(activityText);

      // Obtener todos los descriptores candidatos según la etapa y asignatura
      const candidateDescriptors = await this.getCandidateDescriptors(dto);

      // Calcular similitudes
      const suggestions: CompetencySuggestionDto[] = [];

      for (const descriptor of candidateDescriptors) {
        try {
          // Generar embedding del descriptor si no existe
          const descriptorEmbedding = await this.nlpService.generateEmbedding(descriptor.text);
          
          // Calcular similitud coseno
          const similarity = this.nlpService.calculateCosineSimilarity(
            activityEmbedding,
            descriptorEmbedding
          );

          // Filtrar por puntuación mínima
          if (similarity >= (dto.minScore || 0.5)) {
            suggestions.push({
              id: descriptor.id,
              type: descriptor.type,
              text: descriptor.text,
              code: descriptor.code,
              score: similarity,
              percentage: Math.round(similarity * 100),
              confidence: this.getConfidenceLevel(similarity),
              competencyCode: descriptor.competencyCode,
              competencyName: descriptor.competencyName,
              subjectArea: descriptor.subjectArea,
            });
          }
        } catch (error) {
          this.logger.warn(`Error processing descriptor ${descriptor.id}: ${error.message}`);
        }
      }

      // Ordenar por similitud descendente y limitar resultados
      suggestions.sort((a, b) => b.score - a.score);
      const limitedSuggestions = suggestions.slice(0, dto.maxSuggestions || 10);

      this.logger.log(`Generated ${limitedSuggestions.length} suggestions for activity: "${dto.title}"`);
      return limitedSuggestions;

    } catch (error) {
      this.logger.error(`Error generating suggestions: ${error.message}`, error.stack);
      throw new HttpException(
        'Error generating competency suggestions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Guarda las evaluaciones seleccionadas por el docente
   */
  async saveEvaluation(
    dto: SaveEvaluationDto,
    userId: string,
  ): Promise<AutoActivityEvaluation[]> {
    try {
      this.logger.log(`Saving evaluation for activity: "${dto.title}" by user: ${userId}`);

      const evaluations: AutoActivityEvaluation[] = [];

      for (const selection of dto.selections) {
        const evaluation = this.autoActivityEvaluationRepository.create({
          teacherId: userId,
          activityTitle: dto.title,
          activityDescription: dto.description,
          stage: dto.stage,
          subjectId: dto.subjectId,
          descriptorId: selection.descriptorId,
          descriptorType: selection.descriptorType,
          similarityScore: selection.similarityScore,
          weight: selection.weight,
          accepted: selection.accepted,
        });

        evaluations.push(evaluation);
      }

      const savedEvaluations = await this.autoActivityEvaluationRepository.save(evaluations);
      this.logger.log(`Saved ${savedEvaluations.length} evaluations for activity: "${dto.title}"`);

      return savedEvaluations;

    } catch (error) {
      this.logger.error(`Error saving evaluation: ${error.message}`, error.stack);
      throw new HttpException(
        'Error saving evaluation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene el historial de evaluaciones automáticas del docente
   */
  async getEvaluationHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: AutoActivityEvaluation[]; total: number }> {
    try {
      const [data, total] = await this.autoActivityEvaluationRepository.findAndCount({
        where: { teacherId: userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { data, total };
    } catch (error) {
      this.logger.error(`Error fetching evaluation history: ${error.message}`, error.stack);
      throw new HttpException(
        'Error fetching evaluation history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene estadísticas de uso de la funcionalidad
   */
  async getUsageStats(userId: string): Promise<any> {
    try {
      const stats = await this.autoActivityEvaluationRepository
        .createQueryBuilder('evaluation')
        .select([
          'COUNT(*) as total_evaluations',
          'AVG(CASE WHEN accepted = true THEN 1 ELSE 0 END) as acceptance_rate',
          'AVG(similarity_score) as avg_similarity',
          'COUNT(DISTINCT activity_title) as unique_activities',
        ])
        .where('teacher_id = :userId', { userId })
        .getRawOne();

      return {
        totalEvaluations: parseInt(stats.total_evaluations) || 0,
        acceptanceRate: parseFloat(stats.acceptance_rate) || 0,
        avgSimilarity: parseFloat(stats.avg_similarity) || 0,
        uniqueActivities: parseInt(stats.unique_activities) || 0,
      };
    } catch (error) {
      this.logger.error(`Error fetching usage stats: ${error.message}`, error.stack);
      throw new HttpException(
        'Error fetching usage statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene descriptores candidatos según la etapa y asignatura
   */
  private async getCandidateDescriptors(dto: SuggestCompetenciesDto): Promise<any[]> {
    const candidates = [];

    // Obtener descriptores operativos
    const operativeDescriptors = await this.operativeDescriptorRepository.find({
      relations: ['competency', 'exitProfile'],
      where: dto.stage === EducationalStage.INFANTIL ? {} : {
        exitProfile: {
          type: dto.stage === EducationalStage.PRIMARIA ? ExitProfileType.PRIMARY : ExitProfileType.BASIC_EDUCATION
        }
      }
    });

    for (const descriptor of operativeDescriptors) {
      candidates.push({
        id: descriptor.id,
        type: DescriptorType.OPERATIVE,
        text: descriptor.description,
        code: descriptor.code,
        competencyCode: descriptor.competency?.code,
        competencyName: descriptor.competency?.name,
        subjectArea: null,
      });
    }

    // Obtener competencias específicas si hay asignatura
    if (dto.subjectId) {
      const specificCompetencies = await this.specificCompetencyRepository.find({
        where: { subjectId: dto.subjectId },
        relations: ['subject'],
      });

      for (const competency of specificCompetencies) {
        candidates.push({
          id: competency.id,
          type: DescriptorType.SPECIFIC,
          text: competency.description,
          code: competency.code,
          competencyCode: null,
          competencyName: null,
          subjectArea: competency.subject?.name,
        });
      }

      // Obtener criterios de evaluación
      const evaluationCriteria = await this.evaluationCriterionRepository.find({
        where: { specificCompetency: { subjectId: dto.subjectId } },
        relations: ['specificCompetency', 'specificCompetency.subject'],
      });

      for (const criterion of evaluationCriteria) {
        candidates.push({
          id: criterion.id,
          type: DescriptorType.CRITERIA,
          text: criterion.description,
          code: criterion.code,
          competencyCode: null,
          competencyName: null,
          subjectArea: criterion.specificCompetency?.subject?.name,
        });
      }

      // Obtener saberes básicos
      const basicKnowledge = await this.basicKnowledgeRepository.find({
        where: { specificCompetency: { subjectId: dto.subjectId } },
        relations: ['specificCompetency', 'specificCompetency.subject'],
      });

      for (const knowledge of basicKnowledge) {
        candidates.push({
          id: knowledge.id,
          type: DescriptorType.KNOWLEDGE,
          text: knowledge.description,
          code: knowledge.code,
          competencyCode: null,
          competencyName: null,
          subjectArea: knowledge.specificCompetency?.subject?.name,
        });
      }
    }

    this.logger.log(`Found ${candidates.length} candidate descriptors for stage: ${dto.stage}`);
    return candidates;
  }

  /**
   * Determina el nivel de confianza basado en la puntuación
   */
  private getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }
}