import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { FormativeObservation } from '../entities/formative-observation.entity';
import { Student } from '../../students/entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { SpecificCompetency } from '../entities/specific-competency.entity';
import { EvaluationCriterion } from '../entities/evaluation-criterion.entity';
import { CreateFormativeObservationDto } from '../dto/create-formative-observation.dto';
import { UpdateFormativeObservationDto } from '../dto/update-formative-observation.dto';

@Injectable()
export class FormativeEvaluationService {
  constructor(
    @InjectRepository(FormativeObservation)
    private observationRepository: Repository<FormativeObservation>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(ClassGroup)
    private classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(SpecificCompetency)
    private competencyRepository: Repository<SpecificCompetency>,
    @InjectRepository(EvaluationCriterion)
    private criterionRepository: Repository<EvaluationCriterion>,
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

  async create(
    createDto: CreateFormativeObservationDto,
    userId: string,
  ): Promise<FormativeObservation> {
    // Validate student exists and teacher has access
    const student = await this.studentRepository.findOne({
      where: { id: createDto.studentId },
      relations: ['classGroups', 'classGroups.tutor', 'classGroups.tutor.user'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if teacher has access to this student (via tutor relationship)
    // Access check uses userId (user.id) — correct, classGroup.tutor.user.id is a user id
    const hasAccess = student.classGroups?.some(classGroup =>
      classGroup.tutor?.user?.id === userId
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this student');
    }

    // Resolve the teacher record to get the FK value (teachers.id, not users.id)
    const teacher = await this.resolveTeacherRecord(userId);

    const observation = this.observationRepository.create({
      ...createDto,
      teacherId: teacher.id,
    });

    return this.observationRepository.save(observation);
  }

  /**
   * Public method called by the controller. The `teacherId` field in filters
   * is a userId (user.id from JWT), not a teachers.id FK value.
   * Resolution from userId → teacher.id is handled internally.
   */
  async findAll(filters: {
    teacherId?: string;   // userId (user.id) — resolved to teachers.id FK internally
    studentId?: string;
    classGroupId?: string;
    specificCompetencyId?: string;
    evaluationCriterionId?: string;
    context?: string;
    observationType?: string;
    progressIndicator?: string;
    startDate?: Date;
    endDate?: Date;
    requiresFollowUp?: boolean;
  }): Promise<FormativeObservation[]> {
    const { teacherId: userId, ...rest } = filters;
    let teacherFkId: string | undefined;
    if (userId) {
      const teacher = await this.resolveTeacherRecord(userId);
      teacherFkId = teacher.id;
    }
    return this.queryObservations({ ...rest, teacherFkId });
  }

  /**
   * Internal query method that accepts a pre-resolved teacher FK id (teachers.id).
   */
  private async queryObservations(filters: {
    teacherFkId?: string;  // teachers.id FK value
    studentId?: string;
    classGroupId?: string;
    specificCompetencyId?: string;
    evaluationCriterionId?: string;
    context?: string;
    observationType?: string;
    progressIndicator?: string;
    startDate?: Date;
    endDate?: Date;
    requiresFollowUp?: boolean;
  }): Promise<FormativeObservation[]> {
    const queryBuilder = this.observationRepository
      .createQueryBuilder('observation')
      .leftJoinAndSelect('observation.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('observation.specificCompetency', 'competency')
      .leftJoinAndSelect('observation.evaluationCriterion', 'criterion');

    if (filters.teacherFkId) {
      queryBuilder.andWhere('observation.teacherId = :teacherFkId', {
        teacherFkId: filters.teacherFkId,
      });
    }

    if (filters.studentId) {
      queryBuilder.andWhere('observation.studentId = :studentId', {
        studentId: filters.studentId,
      });
    }

    if (filters.classGroupId) {
      queryBuilder
        .leftJoin('student.classGroups', 'classGroup')
        .andWhere('classGroup.id = :classGroupId', {
          classGroupId: filters.classGroupId,
        });
    }

    if (filters.specificCompetencyId) {
      queryBuilder.andWhere('observation.specificCompetencyId = :competencyId', {
        competencyId: filters.specificCompetencyId,
      });
    }

    if (filters.evaluationCriterionId) {
      queryBuilder.andWhere('observation.evaluationCriterionId = :criterionId', {
        criterionId: filters.evaluationCriterionId,
      });
    }

    if (filters.context) {
      queryBuilder.andWhere('observation.context = :context', {
        context: filters.context,
      });
    }

    if (filters.observationType) {
      queryBuilder.andWhere('observation.observationType = :type', {
        type: filters.observationType,
      });
    }

    if (filters.progressIndicator) {
      queryBuilder.andWhere('observation.progressIndicator = :indicator', {
        indicator: filters.progressIndicator,
      });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('observation.observationDateTime BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.requiresFollowUp !== undefined) {
      queryBuilder.andWhere('observation.requiresFollowUp = :followUp', {
        followUp: filters.requiresFollowUp,
      });
    }

    return queryBuilder
      .orderBy('observation.observationDateTime', 'DESC')
      .getMany();
  }

  /**
   * Internal helper used by methods that already have a resolved teacher FK id.
   */
  private async findAllByUserId(filters: {
    userId?: string;
    studentId?: string;
    classGroupId?: string;
    specificCompetencyId?: string;
    evaluationCriterionId?: string;
    context?: string;
    observationType?: string;
    progressIndicator?: string;
    startDate?: Date;
    endDate?: Date;
    requiresFollowUp?: boolean;
  }): Promise<FormativeObservation[]> {
    const { userId, ...rest } = filters;
    let teacherFkId: string | undefined;
    if (userId) {
      const teacher = await this.resolveTeacherRecord(userId);
      teacherFkId = teacher.id;
    }
    return this.queryObservations({ ...rest, teacherFkId });
  }

  async findOne(id: string, userId?: string): Promise<FormativeObservation> {
    const queryBuilder = this.observationRepository
      .createQueryBuilder('observation')
      .leftJoinAndSelect('observation.student', 'student')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('observation.specificCompetency', 'competency')
      .leftJoinAndSelect('observation.evaluationCriterion', 'criterion')
      .where('observation.id = :id', { id });

    if (userId) {
      // Resolve teacher FK so we can filter against the FK column (teachers.id)
      const teacher = await this.resolveTeacherRecord(userId);
      queryBuilder.andWhere('observation.teacherId = :teacherRecordId', {
        teacherRecordId: teacher.id,
      });
    }

    const observation = await queryBuilder.getOne();

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    return observation;
  }

  async update(
    id: string,
    updateDto: UpdateFormativeObservationDto,
    userId: string,
  ): Promise<FormativeObservation> {
    const observation = await this.findOne(id, userId);

    Object.assign(observation, updateDto);
    return this.observationRepository.save(observation);
  }

  async remove(id: string, userId: string): Promise<void> {
    const observation = await this.findOne(id, userId);
    await this.observationRepository.remove(observation);
  }

  async getStudentProgress(
    studentId: string,
    filters?: {
      specificCompetencyId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    student: Student;
    observations: FormativeObservation[];
    progressSummary: {
      totalObservations: number;
      byIndicator: Record<string, number>;
      byCompetency: Array<{ competencyId: string; competencyName: string; count: number }>;
      recentTrend: string;
      requiresFollowUp: number;
    };
  }> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: ['user', 'user.profile'],
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const observations = await this.findAll({
      studentId,
      ...filters,
    });

    // Calculate progress indicators distribution
    const byIndicator = observations.reduce((acc, obs) => {
      if (obs.progressIndicator) {
        acc[obs.progressIndicator] = (acc[obs.progressIndicator] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Group by competency
    const competencyMap = new Map();
    observations.forEach(obs => {
      if (obs.specificCompetency) {
        const key = obs.specificCompetency.id;
        if (!competencyMap.has(key)) {
          competencyMap.set(key, {
            competencyId: key,
            competencyName: obs.specificCompetency.name,
            count: 0,
          });
        }
        competencyMap.get(key).count++;
      }
    });

    const byCompetency = Array.from(competencyMap.values());

    // Calculate recent trend (last 5 observations)
    const recentObservations = observations.slice(0, 5);
    const recentTrend = this.calculateTrend(recentObservations);

    const requiresFollowUp = observations.filter(obs => obs.requiresFollowUp).length;

    return {
      student,
      observations,
      progressSummary: {
        totalObservations: observations.length,
        byIndicator,
        byCompetency,
        recentTrend,
        requiresFollowUp,
      },
    };
  }

  async getClassGroupSummary(
    classGroupId: string,
    userId: string,
  ): Promise<{
    totalStudents: number;
    totalObservations: number;
    studentsNeedingFollowUp: number;
    competencyDistribution: Array<{ competencyName: string; observationCount: number }>;
    progressDistribution: Record<string, number>;
    recentActivity: FormativeObservation[];
  }> {
    const observations = await this.findAllByUserId({
      classGroupId,
      userId,
    });

    const studentIds = new Set(observations.map(obs => obs.studentId));
    const totalStudents = studentIds.size;

    const studentsNeedingFollowUp = new Set(
      observations
        .filter(obs => obs.requiresFollowUp)
        .map(obs => obs.studentId)
    ).size;

    // Competency distribution
    const competencyMap = new Map();
    observations.forEach(obs => {
      if (obs.specificCompetency) {
        const name = obs.specificCompetency.name;
        competencyMap.set(name, (competencyMap.get(name) || 0) + 1);
      }
    });

    const competencyDistribution = Array.from(competencyMap.entries())
      .map(([competencyName, observationCount]) => ({
        competencyName,
        observationCount,
      }))
      .sort((a, b) => b.observationCount - a.observationCount);

    // Progress distribution
    const progressDistribution = observations.reduce((acc, obs) => {
      if (obs.progressIndicator) {
        acc[obs.progressIndicator] = (acc[obs.progressIndicator] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Recent activity (last 10 observations)
    const recentActivity = observations.slice(0, 10);

    return {
      totalStudents,
      totalObservations: observations.length,
      studentsNeedingFollowUp,
      competencyDistribution,
      progressDistribution,
      recentActivity,
    };
  }

  async getTeacherDashboard(userId: string): Promise<{
    totalObservations: number;
    observationsThisWeek: number;
    studentsObserved: number;
    pendingFollowUps: number;
    recentObservations: FormativeObservation[];
    competencyFocus: Array<{ competencyName: string; count: number }>;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const allObservations = await this.findAllByUserId({ userId });
    const weekObservations = await this.findAllByUserId({
      userId,
      startDate: oneWeekAgo,
      endDate: new Date(),
    });

    const studentsObserved = new Set(allObservations.map(obs => obs.studentId)).size;
    const pendingFollowUps = allObservations.filter(obs => obs.requiresFollowUp).length;

    // Competency focus analysis
    const competencyMap = new Map();
    allObservations.forEach(obs => {
      if (obs.specificCompetency) {
        const name = obs.specificCompetency.name;
        competencyMap.set(name, (competencyMap.get(name) || 0) + 1);
      }
    });

    const competencyFocus = Array.from(competencyMap.entries())
      .map(([competencyName, count]) => ({ competencyName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalObservations: allObservations.length,
      observationsThisWeek: weekObservations.length,
      studentsObserved,
      pendingFollowUps,
      recentObservations: allObservations.slice(0, 5),
      competencyFocus,
    };
  }

  async bulkCreate(
    observations: CreateFormativeObservationDto[],
    userId: string,
  ): Promise<FormativeObservation[]> {
    const results = [];

    for (const observationDto of observations) {
      const observation = await this.create(observationDto, userId);
      results.push(observation);
    }

    return results;
  }

  async exportObservations(
    filters: {
      teacherId?: string;  // receives userId from controller — resolved internally
      studentId?: string;
      classGroupId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    format: 'json' | 'csv' = 'json',
  ): Promise<any> {
    // teacherId here is actually a userId coming from the controller; use findAllByUserId
    const { teacherId: userId, ...rest } = filters;
    const observations = await this.findAllByUserId({ userId, ...rest });

    if (format === 'csv') {
      return this.convertToCSV(observations);
    }

    return observations;
  }

  private calculateTrend(observations: FormativeObservation[]): string {
    if (observations.length < 2) return 'insufficient_data';

    const indicatorValues = {
      'EMERGING': 1,
      'DEVELOPING': 2,
      'ACHIEVING': 3,
      'EXCEEDING': 4,
    };

    const validObservations = observations
      .filter(obs => obs.progressIndicator)
      .map(obs => indicatorValues[obs.progressIndicator])
      .filter(val => val !== undefined);

    if (validObservations.length < 2) return 'insufficient_data';

    const first = validObservations[validObservations.length - 1];
    const last = validObservations[0];

    if (last > first) return 'improving';
    if (last < first) return 'declining';
    return 'stable';
  }

  private convertToCSV(observations: FormativeObservation[]): string {
    const headers = [
      'ID',
      'Student Name',
      'Teacher',
      'Date',
      'Context',
      'Type',
      'Observation',
      'Progress Indicator',
      'Competency',
      'Requires Follow Up',
    ];

    const rows = observations.map(obs => [
      obs.id,
      obs.student?.user?.profile?.firstName + ' ' + obs.student?.user?.profile?.lastName,
      'Teacher', // Teacher info not included in standard queries
      obs.observationDateTime.toISOString(),
      obs.context,
      obs.observationType,
      obs.observation.replace(/"/g, '""'), // Escape quotes
      obs.progressIndicator || '',
      obs.specificCompetency?.name || '',
      obs.requiresFollowUp ? 'Yes' : 'No',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}