import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, IsNull, Not } from 'typeorm';
import {
  LearningSituation,
  LearningSituationStatus,
  LearningSituationAssessment,
  SpecificCompetency,
} from '../entities';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { CreateLearningSituationDto } from '../dto/create-learning-situation.dto';
import { UpdateLearningSituationDto } from '../dto/update-learning-situation.dto';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';

@Injectable()
export class LearningSituationsService {
  constructor(
    @InjectRepository(LearningSituation)
    private learningSituationRepository: Repository<LearningSituation>,
    @InjectRepository(LearningSituationAssessment)
    private assessmentRepository: Repository<LearningSituationAssessment>,
    @InjectRepository(SpecificCompetency)
    private specificCompetencyRepository: Repository<SpecificCompetency>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
  ) {}

  private async resolveTeacherRecord(userId: string): Promise<Teacher> {
    const teacher = await this.teacherRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!teacher) {
      throw new ForbiddenException('Teacher profile not found');
    }
    return teacher;
  }

  // Create a new learning situation
  async create(
    createDto: CreateLearningSituationDto,
    userId: string,
  ): Promise<LearningSituation> {
    // Resolve user.id → teachers.id FK before inserting
    const teacher = await this.resolveTeacherRecord(userId);

    // Validate competencies exist
    if (createDto.specificCompetencyIds?.length > 0) {
      const competencies = await this.specificCompetencyRepository.findBy({
        id: In(createDto.specificCompetencyIds),
      });

      if (competencies.length !== createDto.specificCompetencyIds.length) {
        throw new NotFoundException('Some specific competencies were not found');
      }
    }

    const learningSituation = this.learningSituationRepository.create({
      ...createDto,
      teacherId: teacher.id,
      specificCompetencies: createDto.specificCompetencyIds?.map(id => ({ id } as SpecificCompetency)),
    });

    return this.learningSituationRepository.save(learningSituation);
  }

  // Find all learning situations with filters
  async findAll(filters: {
    teacherId?: string;
    classGroupId?: string;
    subjectId?: string;
    status?: LearningSituationStatus;
    startDate?: Date;
    endDate?: Date;
    includeShared?: boolean;
    isTemplate?: boolean;
  }): Promise<LearningSituation[]> {
    const queryBuilder = this.learningSituationRepository
      .createQueryBuilder('ls')
      .leftJoinAndSelect('ls.teacher', 'teacher')
      .leftJoinAndSelect('ls.classGroup', 'classGroup')
      .leftJoinAndSelect('ls.subject', 'subject')
      .leftJoinAndSelect('ls.specificCompetencies', 'competencies')
      .leftJoinAndSelect('competencies.keyCompetencies', 'keyCompetencies');

    // Apply filters
    if (filters.teacherId) {
      if (filters.includeShared) {
        // sharedWith es text[]; teacherId es uuid → castear a text para el ANY (evita "operator does not exist: uuid = text")
        queryBuilder.andWhere(
          '(ls.teacherId = :teacherId OR CAST(:teacherId AS text) = ANY(ls."sharedWith"))',
          { teacherId: filters.teacherId }
        );
      } else {
        queryBuilder.andWhere('ls.teacherId = :teacherId', { 
          teacherId: filters.teacherId 
        });
      }
    }

    if (filters.classGroupId) {
      queryBuilder.andWhere('ls.classGroupId = :classGroupId', { 
        classGroupId: filters.classGroupId 
      });
    }

    if (filters.subjectId) {
      queryBuilder.andWhere('ls.subjectId = :subjectId', { 
        subjectId: filters.subjectId 
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('ls.status = :status', { status: filters.status });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('ls.startDate BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.isTemplate !== undefined) {
      queryBuilder.andWhere('ls.isTemplate = :isTemplate', { 
        isTemplate: filters.isTemplate 
      });
    }

    return queryBuilder
      .orderBy('ls.startDate', 'DESC')
      .addOrderBy('ls.createdAt', 'DESC')
      .getMany();
  }

  // Find learning situations belonging to the authenticated teacher (userId = user.id from JWT)
  async findMySituations(
    userId: string,
    includeShared?: boolean,
  ): Promise<LearningSituation[]> {
    // Resolve user.id → teachers.id FK before filtering
    const teacher = await this.resolveTeacherRecord(userId);
    return this.findAll({ teacherId: teacher.id, includeShared: includeShared ?? true });
  }

  // Find one learning situation
  // userId (user.id from JWT) is passed when access must be restricted to teacher's own/shared
  async findOne(id: string, userId?: string): Promise<LearningSituation> {
    // Resolve user.id → teachers.id FK for the access-restriction filter
    let teacherFkId: string | undefined;
    if (userId) {
      const teacher = await this.resolveTeacherRecord(userId);
      teacherFkId = teacher.id;
    }

    const queryBuilder = this.learningSituationRepository
      .createQueryBuilder('ls')
      .leftJoinAndSelect('ls.teacher', 'teacher')
      .leftJoinAndSelect('ls.classGroup', 'classGroup')
      .leftJoinAndSelect('ls.subject', 'subject')
      .leftJoinAndSelect('ls.specificCompetencies', 'competencies')
      .leftJoinAndSelect('competencies.keyCompetencies', 'keyCompetencies')
      .leftJoinAndSelect('competencies.evaluationCriteria', 'criteria')
      .leftJoinAndSelect('ls.assessments', 'assessments')
      .leftJoinAndSelect('assessments.student', 'student')
      .where('ls.id = :id', { id });

    if (teacherFkId) {
      // sharedWith es text[]; teacherFkId es uuid → castear a text para el ANY
      queryBuilder.andWhere(
        '(ls.teacherId = :teacherFkId OR CAST(:teacherFkId AS text) = ANY(ls."sharedWith"))',
        { teacherFkId }
      );
    }

    const learningSituation = await queryBuilder.getOne();

    if (!learningSituation) {
      throw new NotFoundException(`Learning situation with ID ${id} not found`);
    }

    return learningSituation;
  }

  // Update learning situation
  async update(
    id: string,
    updateDto: UpdateLearningSituationDto,
    userId: string,
  ): Promise<LearningSituation> {
    // Resolve user.id → teachers.id FK for permission check
    const teacher = await this.resolveTeacherRecord(userId);
    const learningSituation = await this.findOne(id);

    // Check permissions using teachers.id FK (not user.id)
    if (learningSituation.teacherId !== teacher.id &&
        !learningSituation.sharedWith?.includes(teacher.id)) {
      throw new ForbiddenException('You do not have permission to update this learning situation');
    }

    // Handle competencies update
    if (updateDto.specificCompetencyIds) {
      const competencies = await this.specificCompetencyRepository.findBy({
        id: In(updateDto.specificCompetencyIds),
      });
      learningSituation.specificCompetencies = competencies;
    }

    // Update other fields
    Object.assign(learningSituation, updateDto);

    return this.learningSituationRepository.save(learningSituation);
  }

  // Clone a learning situation
  async clone(
    id: string,
    userId: string,
    targetClassGroupId?: string,
  ): Promise<LearningSituation> {
    // Resolve user.id → teachers.id FK for the cloned entity's owner
    const teacher = await this.resolveTeacherRecord(userId);
    const original = await this.findOne(id);

    const cloned = this.learningSituationRepository.create({
      ...original,
      id: undefined,
      teacherId: teacher.id,
      classGroupId: targetClassGroupId || original.classGroupId,
      status: LearningSituationStatus.DRAFT,
      title: `${original.title} (Copia)`,
      createdAt: undefined,
      updatedAt: undefined,
      assessments: undefined,
      sharedWith: [],
    });

    return this.learningSituationRepository.save(cloned);
  }

  // Share learning situation with other teachers
  async share(
    id: string,
    userId: string,
    targetTeacherIds: string[],
  ): Promise<LearningSituation> {
    // Resolve user.id → teachers.id FK for ownership check
    const teacher = await this.resolveTeacherRecord(userId);
    const learningSituation = await this.findOne(id);

    if (learningSituation.teacherId !== teacher.id) {
      throw new ForbiddenException('Only the owner can share this learning situation');
    }

    // Add unique teacher IDs
    const currentShared = learningSituation.sharedWith || [];
    const newShared = [...new Set([...currentShared, ...targetTeacherIds])];

    learningSituation.sharedWith = newShared;
    return this.learningSituationRepository.save(learningSituation);
  }

  // Create assessment for a student
  async createAssessment(
    learningSituationId: string,
    createDto: CreateAssessmentDto,
    evaluatorId: string,
  ): Promise<any> {
    const learningSituation = await this.findOne(learningSituationId);

    // Since the actual LearningSituationAssessment entity has a different structure,
    // we'll need to adapt our approach or create a different assessment structure
    // For now, return a placeholder indicating the method needs to be updated
    return {
      message: 'Assessment creation needs to be updated to match entity structure',
      learningSituationId,
      studentId: createDto.studentId,
      evaluatorId,
    };
  }

  // Get assessments for a learning situation
  async getAssessments(
    learningSituationId: string,
    studentId?: string,
  ): Promise<LearningSituationAssessment[]> {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.student', 'student')
      .leftJoinAndSelect('assessment.specificCompetency', 'competency')
      .where('assessment.learningSituationId = :learningSituationId', { 
        learningSituationId 
      });
    
    if (studentId) {
      queryBuilder.andWhere('assessment.studentId = :studentId', { studentId });
    }

    return queryBuilder
      .orderBy('assessment.assessmentDate', 'DESC')
      .getMany();
  }

  // Get learning situations by competency
  async findByCompetency(
    specificCompetencyId: string,
    filters?: {
      teacherId?: string;
      status?: LearningSituationStatus;
    },
  ): Promise<LearningSituation[]> {
    const queryBuilder = this.learningSituationRepository
      .createQueryBuilder('ls')
      .leftJoinAndSelect('ls.teacher', 'teacher')
      .leftJoinAndSelect('ls.classGroup', 'classGroup')
      .leftJoinAndSelect('ls.subject', 'subject')
      .leftJoinAndSelect('ls.specificCompetencies', 'competencies')
      .where('competencies.id = :competencyId', { competencyId: specificCompetencyId });

    if (filters?.teacherId) {
      queryBuilder.andWhere('ls.teacherId = :teacherId', { 
        teacherId: filters.teacherId 
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('ls.status = :status', { status: filters.status });
    }

    return queryBuilder.orderBy('ls.startDate', 'DESC').getMany();
  }

  // Get templates
  async getTemplates(
    subjectId?: string,
    educationalLevelId?: string,
  ): Promise<LearningSituation[]> {
    const queryBuilder = this.learningSituationRepository
      .createQueryBuilder('ls')
      .leftJoinAndSelect('ls.subject', 'subject')
      .leftJoinAndSelect('ls.specificCompetencies', 'competencies')
      .where('ls.isTemplate = true')
      .andWhere('ls.status = :status', { status: LearningSituationStatus.ACTIVE });

    if (subjectId) {
      queryBuilder.andWhere('ls.subjectId = :subjectId', { subjectId });
    }

    if (educationalLevelId) {
      queryBuilder
        .leftJoin('subject.course', 'course')
        .leftJoin('course.cycle', 'cycle')
        .andWhere('cycle.educationalLevelId = :educationalLevelId', { 
          educationalLevelId 
        });
    }

    return queryBuilder.orderBy('ls.title', 'ASC').getMany();
  }

  // Analyze DUA coverage
  async analyzeDUACoverage(learningSituationId: string): Promise<{
    hasMultipleRepresentations: boolean;
    hasMultipleActions: boolean;
    hasMultipleEngagements: boolean;
    duaScore: number;
    recommendations: string[];
  }> {
    const ls = await this.findOne(learningSituationId);
    const dua = ls.duaAdaptations || { 
      multipleRepresentations: [], 
      multipleActions: [], 
      multipleEngagements: [] 
    };

    const hasMultipleRepresentations = dua.multipleRepresentations.length > 0;
    const hasMultipleActions = dua.multipleActions.length > 0;
    const hasMultipleEngagements = dua.multipleEngagements.length > 0;

    // Calculate DUA score (0-100)
    const representationScore = Math.min(dua.multipleRepresentations.length * 10, 30);
    const actionScore = Math.min(dua.multipleActions.length * 10, 35);
    const engagementScore = Math.min(dua.multipleEngagements.length * 10, 35);
    const duaScore = representationScore + actionScore + engagementScore;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (!hasMultipleRepresentations) {
      recommendations.push('Añadir formas diversas de presentar la información (visual, auditiva, táctil)');
    }
    if (!hasMultipleActions) {
      recommendations.push('Incluir diferentes formas de expresión y demostración del aprendizaje');
    }
    if (!hasMultipleEngagements) {
      recommendations.push('Incorporar estrategias variadas de motivación e implicación');
    }

    if (dua.multipleRepresentations.length < 3) {
      recommendations.push('Considerar añadir más opciones de representación de la información');
    }
    if (dua.multipleActions.length < 3) {
      recommendations.push('Ampliar las opciones de acción y expresión del alumnado');
    }
    if (dua.multipleEngagements.length < 3) {
      recommendations.push('Diversificar las estrategias de implicación y motivación');
    }

    return {
      hasMultipleRepresentations,
      hasMultipleActions,
      hasMultipleEngagements,
      duaScore,
      recommendations,
    };
  }

  // Get statistics
  async getStatistics(userId: string): Promise<{
    total: number;
    byStatus: Record<LearningSituationStatus, number>;
    bySubject: Array<{ subjectId: string; subjectName: string; count: number }>;
    averageDUAScore: number;
    competenciesCoverage: Array<{ competencyId: string; competencyName: string; count: number }>;
  }> {
    // Resolve user.id → teachers.id FK before filtering
    const teacher = await this.resolveTeacherRecord(userId);
    const situations = await this.findAll({ teacherId: teacher.id, includeShared: true });
    
    // Status statistics
    const byStatus = situations.reduce((acc, ls) => {
      acc[ls.status] = (acc[ls.status] || 0) + 1;
      return acc;
    }, {} as Record<LearningSituationStatus, number>);

    // Subject statistics
    const subjectMap = new Map<string, { name: string; count: number }>();
    situations.forEach(ls => {
      if (ls.subject) {
        const current = subjectMap.get(ls.subject.id) || { 
          name: ls.subject.name, 
          count: 0 
        };
        current.count++;
        subjectMap.set(ls.subject.id, current);
      }
    });

    const bySubject = Array.from(subjectMap.entries()).map(([id, data]) => ({
      subjectId: id,
      subjectName: data.name,
      count: data.count,
    }));

    // DUA average score
    let totalDUAScore = 0;
    for (const ls of situations) {
      const analysis = await this.analyzeDUACoverage(ls.id);
      totalDUAScore += analysis.duaScore;
    }
    const averageDUAScore = situations.length > 0 ? totalDUAScore / situations.length : 0;

    // Competencies coverage
    const competencyMap = new Map<string, { name: string; count: number }>();
    situations.forEach(ls => {
      ls.specificCompetencies?.forEach(comp => {
        const current = competencyMap.get(comp.id) || { 
          name: comp.name, 
          count: 0 
        };
        current.count++;
        competencyMap.set(comp.id, current);
      });
    });

    const competenciesCoverage = Array.from(competencyMap.entries()).map(([id, data]) => ({
      competencyId: id,
      competencyName: data.name,
      count: data.count,
    })).sort((a, b) => b.count - a.count);

    return {
      total: situations.length,
      byStatus,
      bySubject,
      averageDUAScore,
      competenciesCoverage,
    };
  }
}