import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Competency } from './entities/competency.entity';
import { ExitProfile, ExitProfileType } from './entities/exit-profile.entity';
import { OperativeDescriptor } from './entities/operative-descriptor.entity';
import { SpecificCompetency } from './entities/specific-competency.entity';
import { EvaluationCriterion } from './entities/evaluation-criterion.entity';
import { BasicKnowledge } from './entities/basic-knowledge.entity';
import { CreateSpecificCompetencyDto, UpdateSpecificCompetencyDto } from './dto/specific-competency.dto';
import { CreateEvaluationCriterionDto, UpdateEvaluationCriterionDto } from './dto/evaluation-criterion.dto';
import { CreateBasicKnowledgeDto, UpdateBasicKnowledgeDto } from './dto/basic-knowledge.dto';

@Injectable()
export class CompetenciesService {
  constructor(
    @InjectRepository(Competency)
    private competenciesRepository: Repository<Competency>,
    @InjectRepository(ExitProfile)
    private exitProfileRepository: Repository<ExitProfile>,
    @InjectRepository(OperativeDescriptor)
    private operativeDescriptorRepository: Repository<OperativeDescriptor>,
    @InjectRepository(SpecificCompetency)
    private specificCompetencyRepository: Repository<SpecificCompetency>,
    @InjectRepository(EvaluationCriterion)
    private evaluationCriterionRepository: Repository<EvaluationCriterion>,
    @InjectRepository(BasicKnowledge)
    private basicKnowledgeRepository: Repository<BasicKnowledge>,
  ) {}

  async findAll(): Promise<Competency[]> {
    return this.competenciesRepository.find();
  }

  async findOne(id: string): Promise<Competency> {
    // Simplified query to avoid cross-module dependencies
    return this.competenciesRepository.findOne({
      where: { id },
    });
  }

  // Exit Profile methods - MAIN FUNCTIONALITY FOR THE API ENDPOINT
  async findAllExitProfiles(stage?: string): Promise<ExitProfile[]> {
    try {
      // Use simple find instead of query builder to avoid JOIN issues
      const findOptions: any = {
        order: { type: 'ASC' }
      };

      if (stage) {
        // Map stage to ExitProfileType
        const stageMapping = {
          'PRIMARIA': ExitProfileType.PRIMARY,
          'SECUNDARIA': ExitProfileType.BASIC_EDUCATION,
          // INFANTIL no tiene perfil de salida oficial en LOMLOE
        };

        const profileType = stageMapping[stage as keyof typeof stageMapping];
        if (profileType) {
          findOptions.where = { type: profileType };
        } else if (stage === 'INFANTIL') {
          // Para INFANTIL, retornar array vacío ya que no hay perfil de salida
          return [];
        }
      }

      return this.exitProfileRepository.find(findOptions);
    } catch (error) {
      // Return empty array if there's an error instead of crashing
      return [];
    }
  }

  async findExitProfileByType(type: ExitProfileType): Promise<ExitProfile> {
    const profile = await this.exitProfileRepository.findOne({
      where: { type },
      relations: ['operativeDescriptors', 'operativeDescriptors.competency'],
    });

    if (!profile) {
      throw new NotFoundException(`Exit profile with type ${type} not found`);
    }

    return profile;
  }

  // Operative Descriptors methods
  async findOperativeDescriptorsByCompetency(
    competencyId: string,
    exitProfileType?: ExitProfileType,
  ): Promise<OperativeDescriptor[]> {
    const queryBuilder = this.operativeDescriptorRepository
      .createQueryBuilder('descriptor')
      .leftJoinAndSelect('descriptor.competency', 'competency')
      .leftJoinAndSelect('descriptor.exitProfile', 'exitProfile')
      .where('competency.id = :competencyId', { competencyId });

    if (exitProfileType) {
      queryBuilder.andWhere('exitProfile.type = :exitProfileType', {
        exitProfileType,
      });
    }

    return queryBuilder.orderBy('descriptor.order', 'ASC').getMany();
  }

  async findDescriptorsByExitProfile(exitProfileId: string): Promise<OperativeDescriptor[]> {
    try {
      return this.operativeDescriptorRepository.find({
        where: { exitProfile: { id: exitProfileId } },
        relations: ['competency', 'exitProfile'],
        order: { order: 'ASC' },
      });
    } catch (error) {
      return [];
    }
  }

  async findAllOperativeDescriptors(): Promise<OperativeDescriptor[]> {
    try {
      return this.operativeDescriptorRepository.find({
        relations: ['competency', 'exitProfile'],
        order: { order: 'ASC' },
      });
    } catch (error) {
      return [];
    }
  }

  async findSpecificCompetenciesBySubject(subjectId: string): Promise<SpecificCompetency[]> {
    return this.specificCompetencyRepository.find({
      where: { subjectId },
      order: { order: 'ASC' },
    });
  }

  async findSpecificCompetenciesByArea(_areaId: string): Promise<SpecificCompetency[]> {
    // TODO(2b): SpecificCompetency no tiene relación con Area en el modelo actual.
    // La entidad SpecificCompetency sólo se relaciona con Subject (subjectId) y
    // EducationalLevel (educationalLevelId); Area no tiene FK ni inversa hacia
    // SpecificCompetency ni hacia Subject.  Cuando se defina esa relación en Fase 2b,
    // implementar el join/filtro correspondiente aquí.
    return [];
  }

  async createSpecificCompetency(data: CreateSpecificCompetencyDto | Partial<SpecificCompetency>): Promise<SpecificCompetency> {
    const { keyCompetencyIds, ...rest } = data as CreateSpecificCompetencyDto;
    const entity = this.specificCompetencyRepository.create(rest as Partial<SpecificCompetency>);

    if (keyCompetencyIds && keyCompetencyIds.length > 0) {
      entity.keyCompetencies = await this.competenciesRepository.findBy({
        id: In(keyCompetencyIds),
      });
    } else {
      entity.keyCompetencies = [];
    }

    return this.specificCompetencyRepository.save(entity);
  }

  async findAllSpecificCompetencies(filters: {
    subjectId?: string;
    educationalLevelId?: string;
  }): Promise<SpecificCompetency[]> {
    const where: any = {};
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.educationalLevelId) where.educationalLevelId = filters.educationalLevelId;

    return this.specificCompetencyRepository.find({
      where,
      relations: ['keyCompetencies'],
      order: { order: 'ASC' },
    });
  }

  async findSpecificCompetencyById(id: string): Promise<SpecificCompetency> {
    const entity = await this.specificCompetencyRepository.findOne({
      where: { id },
      relations: ['keyCompetencies'],
    });
    if (!entity) {
      throw new NotFoundException(`Competencia específica con id ${id} no encontrada`);
    }
    return entity;
  }

  async updateSpecificCompetency(
    id: string,
    data: UpdateSpecificCompetencyDto,
  ): Promise<SpecificCompetency> {
    const entity = await this.findSpecificCompetencyById(id);

    const { keyCompetencyIds, ...rest } = data;
    Object.assign(entity, rest);

    if (keyCompetencyIds !== undefined) {
      if (keyCompetencyIds.length > 0) {
        entity.keyCompetencies = await this.competenciesRepository.findBy({
          id: In(keyCompetencyIds),
        });
      } else {
        entity.keyCompetencies = [];
      }
    }

    return this.specificCompetencyRepository.save(entity);
  }

  async deleteSpecificCompetency(id: string): Promise<void> {
    const entity = await this.findSpecificCompetencyById(id);
    await this.specificCompetencyRepository.remove(entity);
  }

  async findCriteriaBySpecificCompetency(specificCompetencyId: string): Promise<EvaluationCriterion[]> {
    return this.evaluationCriterionRepository.find({
      where: { specificCompetencyId },
      order: { order: 'ASC' },
    });
  }

  async findKnowledgeBySpecificCompetency(specificCompetencyId: string): Promise<BasicKnowledge[]> {
    return this.basicKnowledgeRepository.find({
      where: { specificCompetencyId },
      order: { order: 'ASC' },
    });
  }

  async findEvaluationCriteriaByCycle(cycleId: string): Promise<EvaluationCriterion[]> {
    return this.evaluationCriterionRepository.find({
      where: { cycleId },
      order: { order: 'ASC' },
    });
  }

  async findEvaluationCriteriaByCourse(courseId: string): Promise<EvaluationCriterion[]> {
    return this.evaluationCriterionRepository.find({
      where: { courseId },
      order: { order: 'ASC' },
    });
  }

  async createEvaluationCriterion(data: CreateEvaluationCriterionDto): Promise<EvaluationCriterion> {
    const entity = this.evaluationCriterionRepository.create(data);
    return this.evaluationCriterionRepository.save(entity);
  }

  async findEvaluationCriterionById(id: string): Promise<EvaluationCriterion> {
    const entity = await this.evaluationCriterionRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Criterio de evaluación con id ${id} no encontrado`);
    }
    return entity;
  }

  async updateEvaluationCriterion(id: string, data: UpdateEvaluationCriterionDto): Promise<EvaluationCriterion> {
    const entity = await this.findEvaluationCriterionById(id);
    Object.assign(entity, data);
    return this.evaluationCriterionRepository.save(entity);
  }

  async deleteEvaluationCriterion(id: string): Promise<void> {
    const entity = await this.findEvaluationCriterionById(id);
    await this.evaluationCriterionRepository.remove(entity);
  }

  async findBasicKnowledgeByCompetency(specificCompetencyId: string): Promise<BasicKnowledge[]> {
    return this.basicKnowledgeRepository.find({
      where: { specificCompetencyId },
      order: { order: 'ASC' },
    });
  }

  async createBasicKnowledge(data: CreateBasicKnowledgeDto): Promise<BasicKnowledge> {
    const entity = this.basicKnowledgeRepository.create(data);
    return this.basicKnowledgeRepository.save(entity);
  }

  async findBasicKnowledgeById(id: string): Promise<BasicKnowledge> {
    const entity = await this.basicKnowledgeRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Saber básico con id ${id} no encontrado`);
    }
    return entity;
  }

  async updateBasicKnowledge(id: string, data: UpdateBasicKnowledgeDto): Promise<BasicKnowledge> {
    const entity = await this.findBasicKnowledgeById(id);
    Object.assign(entity, data);
    return this.basicKnowledgeRepository.save(entity);
  }

  async deleteBasicKnowledge(id: string): Promise<void> {
    const entity = await this.findBasicKnowledgeById(id);
    await this.basicKnowledgeRepository.remove(entity);
  }

  async getCompleteCompetencyFramework(educationalLevelId: string): Promise<any> {
    const competencies = await this.competenciesRepository.find();

    // ExitProfile is keyed by ExitProfileType enum (PRIMARY / BASIC_EDUCATION),
    // not by educationalLevelId UUID. Fetch all profiles; callers can filter by type.
    const exitProfiles = await this.exitProfileRepository.find({
      relations: ['operativeDescriptors', 'operativeDescriptors.competency'],
    });
    const exitProfile = exitProfiles.length > 0 ? exitProfiles : null;

    const specificCompetencies = await this.specificCompetencyRepository.find({
      where: { educationalLevelId },
      order: { order: 'ASC' },
    });

    const specificCompetencyIds = specificCompetencies.map((sc) => sc.id);

    let evaluationCriteria: EvaluationCriterion[] = [];
    let basicKnowledge: BasicKnowledge[] = [];

    if (specificCompetencyIds.length > 0) {
      evaluationCriteria = await this.evaluationCriterionRepository
        .createQueryBuilder('ec')
        .where('ec.specificCompetencyId IN (:...ids)', { ids: specificCompetencyIds })
        .orderBy('ec.order', 'ASC')
        .getMany();

      basicKnowledge = await this.basicKnowledgeRepository
        .createQueryBuilder('bk')
        .where('bk.specificCompetencyId IN (:...ids)', { ids: specificCompetencyIds })
        .orderBy('bk.order', 'ASC')
        .getMany();
    }

    return {
      competencies,
      exitProfile: exitProfile ?? null,
      specificCompetencies,
      evaluationCriteria,
      basicKnowledge,
    };
  }
}