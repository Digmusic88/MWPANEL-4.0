import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competency } from './entities/competency.entity';
import { SpecificCompetency } from './entities/specific-competency.entity';
import { EvaluationCriterion } from './entities/evaluation-criterion.entity';
import { Area } from './entities/area.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { CacheService } from '../../common/services/cache.service';
import { LoggerService } from '../../common/services/logger.service';

/**
 * Competencies Service with caching for improved performance
 * Competencies change rarely, making them ideal for caching
 */
@Injectable()
export class CompetenciesServiceCached {
  constructor(
    @InjectRepository(Competency)
    private competencyRepository: Repository<Competency>,
    @InjectRepository(SpecificCompetency)
    private specificCompetencyRepository: Repository<SpecificCompetency>,
    @InjectRepository(EvaluationCriterion)
    private evaluationCriterionRepository: Repository<EvaluationCriterion>,
    @InjectRepository(Area)
    private areaRepository: Repository<Area>,
    @InjectRepository(EducationalLevel)
    private educationalLevelRepository: Repository<EducationalLevel>,
    private cacheService: CacheService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('CompetenciesService');
  }

  /**
   * Get all competencies - heavily cached (1 hour)
   */
  async findAll(): Promise<Competency[]> {
    const cacheKey = 'competencies:all';

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const competencies = await this.competencyRepository.find({
          relations: ['specificCompetencies', 'specificCompetencies.evaluationCriteria'],
          order: {
            code: 'ASC',
          },
        });

        this.logger.log(`Loaded ${competencies.length} competencies from database`);
        return competencies;
      },
      { ttl: 3600 }, // Cache for 1 hour
    );
  }

  /**
   * Get competency by ID
   */
  async findOne(id: string): Promise<Competency> {
    const cacheKey = `competency:${id}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const competency = await this.competencyRepository.findOne({
          where: { id },
          relations: ['specificCompetencies', 'specificCompetencies.evaluationCriteria'],
        });

        if (!competency) {
          throw new NotFoundException(`Competencia con ID ${id} no encontrada`);
        }

        return competency;
      },
      { ttl: 3600 }, // Cache for 1 hour
    );
  }

  /**
   * Get competencies by educational level
   */
  async findByEducationalLevel(educationalLevelId: string): Promise<Competency[]> {
    const cacheKey = `competencies:level:${educationalLevelId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const competencies = await this.competencyRepository
          .createQueryBuilder('competency')
          .leftJoinAndSelect('competency.specificCompetencies', 'specific')
          .leftJoinAndSelect('specific.evaluationCriteria', 'criteria')
          .leftJoin('competency.educationalLevels', 'level')
          .where('level.id = :educationalLevelId', { educationalLevelId })
          .orderBy('competency.code', 'ASC')
          .addOrderBy('specific.code', 'ASC')
          .addOrderBy('criteria.code', 'ASC')
          .getMany();

        return competencies;
      },
      { ttl: 3600 }, // Cache for 1 hour
    );
  }

  /**
   * Get competencies by area
   */
  async findByArea(areaId: string): Promise<Competency[]> {
    const cacheKey = `competencies:area:${areaId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const competencies = await this.competencyRepository
          .createQueryBuilder('competency')
          .leftJoinAndSelect('competency.specificCompetencies', 'specific')
          .leftJoinAndSelect('specific.evaluationCriteria', 'criteria')
          .leftJoin('competency.areas', 'area')
          .where('area.id = :areaId', { areaId })
          .orderBy('competency.code', 'ASC')
          .addOrderBy('specific.code', 'ASC')
          .addOrderBy('criteria.code', 'ASC')
          .getMany();

        return competencies;
      },
      { ttl: 3600 }, // Cache for 1 hour
    );
  }

  /**
   * Get all areas - heavily cached
   */
  async findAllAreas(): Promise<Area[]> {
    const cacheKey = 'areas:all';

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const areas = await this.areaRepository.find({
          relations: ['educationalLevels'],
          order: { name: 'ASC' },
        });

        return areas;
      },
      { ttl: 7200 }, // Cache for 2 hours
    );
  }

  /**
   * Get specific competencies for a competency
   */
  async findSpecificCompetencies(competencyId: string): Promise<SpecificCompetency[]> {
    const cacheKey = `specific-competencies:${competencyId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const specificCompetencies = await this.specificCompetencyRepository.find({
          where: { competencyId: competencyId } as any,
          relations: ['evaluationCriteria'],
          order: { code: 'ASC' },
        });

        return specificCompetencies;
      },
      { ttl: 3600 }, // Cache for 1 hour
    );
  }

  /**
   * Get evaluation criteria for a specific competency
   */
  async findEvaluationCriteria(specificCompetencyId: string): Promise<EvaluationCriterion[]> {
    const cacheKey = `evaluation-criteria:${specificCompetencyId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const criteria = await this.evaluationCriterionRepository.find({
          where: { specificCompetency: { id: specificCompetencyId } },
          order: { code: 'ASC' },
        });

        return criteria;
      },
      { ttl: 3600 }, // Cache for 1 hour
    );
  }

  /**
   * Search competencies by text
   */
  async searchCompetencies(searchText: string): Promise<Competency[]> {
    const cacheKey = `competencies:search:${searchText.toLowerCase()}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const competencies = await this.competencyRepository
          .createQueryBuilder('competency')
          .leftJoinAndSelect('competency.specificCompetencies', 'specific')
          .leftJoinAndSelect('specific.evaluationCriteria', 'criteria')
          .where('LOWER(competency.name) LIKE :search', { search: `%${searchText.toLowerCase()}%` })
          .orWhere('LOWER(competency.description) LIKE :search', { search: `%${searchText.toLowerCase()}%` })
          .orWhere('LOWER(specific.name) LIKE :search', { search: `%${searchText.toLowerCase()}%` })
          .orWhere('LOWER(criteria.description) LIKE :search', { search: `%${searchText.toLowerCase()}%` })
          .orderBy('competency.code', 'ASC')
          .getMany();

        return competencies;
      },
      { ttl: 1800 }, // Cache for 30 minutes
    );
  }

  /**
   * Get competency structure for a subject
   */
  async getCompetencyStructureForSubject(
    subjectId: string,
    educationalLevelId: string,
  ): Promise<any> {
    const cacheKey = `competency-structure:${subjectId}:${educationalLevelId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Complex query to get full competency structure
        const structure = await this.competencyRepository
          .createQueryBuilder('competency')
          .leftJoinAndSelect('competency.specificCompetencies', 'specific')
          .leftJoinAndSelect('specific.evaluationCriteria', 'criteria')
          .leftJoin('competency.subjects', 'subject')
          .leftJoin('competency.educationalLevels', 'level')
          .where('subject.id = :subjectId', { subjectId })
          .andWhere('level.id = :educationalLevelId', { educationalLevelId })
          .orderBy('competency.code', 'ASC')
          .addOrderBy('specific.code', 'ASC')
          .addOrderBy('criteria.code', 'ASC')
          .getMany();

        // Transform to hierarchical structure
        return structure.map(comp => ({
          id: comp.id,
          code: comp.code,
          name: comp.name,
          description: comp.description,
          specificCompetencies: (comp as any).specificCompetencies?.map(spec => ({
            id: spec.id,
            code: spec.code,
            name: spec.name,
            description: spec.description,
            evaluationCriteria: spec.evaluationCriteria?.map(crit => ({
              id: crit.id,
              code: crit.code,
              description: crit.description,
            })) || [],
          })) || [],
        }));
      },
      { ttl: 3600 }, // Cache for 1 hour
    );
  }

  /**
   * Warm up cache on application start
   */
  async warmUpCache(): Promise<void> {
    this.logger.log('Warming up competencies cache...');
    
    try {
      // Load all competencies
      await this.findAll();
      
      // Load all areas
      await this.findAllAreas();
      
      // Load educational levels
      const levels = await this.educationalLevelRepository.find();
      
      // Load competencies for each level
      for (const level of levels) {
        await this.findByEducationalLevel(level.id);
      }
      
      this.logger.log('Competencies cache warmed up successfully');
    } catch (error) {
      this.logger.error('Error warming up competencies cache', error);
    }
  }

  /**
   * Clear all competency-related caches
   */
  async clearCache(): Promise<void> {
    await this.cacheService.delByPattern('competencies:*');
    await this.cacheService.delByPattern('competency:*');
    await this.cacheService.delByPattern('specific-competencies:*');
    await this.cacheService.delByPattern('evaluation-criteria:*');
    await this.cacheService.delByPattern('areas:*');
    await this.cacheService.delByPattern('competency-structure:*');
    
    this.logger.warn('All competency caches cleared');
  }
}