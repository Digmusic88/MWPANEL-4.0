import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Activity, ActivityValuationType } from './entities/activity.entity';
import { ActivityAssessment, EmojiValue } from './entities/activity-assessment.entity';
import { ActivityNotification } from './entities/activity-notification.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { AssessActivityDto, BulkAssessActivityDto } from './dto/assess-activity.dto';
import { ActivityStatisticsDto, TeacherActivitySummaryDto } from './dto/activity-statistics.dto';
import { SubjectAssignmentWithStudentsDto } from './dto/subject-assignment-with-students.dto';
import { CreateFromTemplateDto } from './dto/activity-template.dto';
import { DuplicateActivityDto } from './dto/duplicate-activity.dto';
import { SubjectActivitySummaryDto } from './dto/subject-activity-summary.dto';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Student } from '../students/entities/student.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { User } from '../users/entities/user.entity';
import { CentralizedGradesService } from '../grades/services/centralized-grades.service';
import { GradePeriod } from '../grades/entities/centralized-grade.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { CriterionRollupService } from '../criterion-assessment/services/criterion-rollup.service';
import { CurrentAcademicYearService } from '../academic-years/current-academic-year.service';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
    @InjectRepository(ActivityAssessment)
    private assessmentsRepository: Repository<ActivityAssessment>,
    @InjectRepository(ActivityNotification)
    private notificationsRepository: Repository<ActivityNotification>,
    @InjectRepository(ClassGroup)
    private classGroupsRepository: Repository<ClassGroup>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentsRepository: Repository<FamilyStudent>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentsRepository: Repository<SubjectAssignment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(EvaluationCriterion)
    private readonly evaluationCriterionRepository: Repository<EvaluationCriterion>,
    @Inject(forwardRef(() => CentralizedGradesService))
    private readonly centralizedGradesService: CentralizedGradesService,
    @Inject(forwardRef(() => CriterionRollupService))
    private readonly criterionRollupService: CriterionRollupService,
    private readonly currentAcademicYearService: CurrentAcademicYearService,
  ) {}

  /**
   * Recalcula la nota centralizada del alumno tras valorar. SÍNCRONO + FAIL-SOFT.
   * Periodo fijo CONTINUOUS (ver decisión de diseño SP-D2a).
   */
  private async recalcCentralizedGradeSafe(
    studentId: string,
    subjectAssignmentId: string,
  ): Promise<void> {
    try {
      await this.centralizedGradesService.calculateCentralizedGrade({
        studentId,
        subjectAssignmentId,
        period: GradePeriod.CONTINUOUS,
        forceRecalculation: true,
      });
    } catch (e) {
      this.logger.warn(
        `Recálculo de nota centralizada falló (student=${studentId}, subjectAssignment=${subjectAssignmentId}): ${e?.message}`,
      );
    }
  }

  // SP-D3a: sincroniza los criterios LOMLOE de una actividad (reemplazo total).
  private async syncActivityCriteria(activityId: string, criterionIds?: string[]): Promise<void> {
    if (criterionIds === undefined) return;
    const valid = criterionIds.length
      ? await this.evaluationCriterionRepository.find({ where: { id: In(criterionIds) } })
      : [];
    const qb = this.activitiesRepository
      .createQueryBuilder()
      .relation(Activity, 'evaluationCriteria')
      .of(activityId);
    const current = await qb.loadMany();
    await qb.addAndRemove(valid, current);
  }

  // ==================== CRUD ACTIVIDADES ====================

  async create(createActivityDto: CreateActivityDto, teacherId: string): Promise<Activity> {
    // Verificar que el profesor tiene acceso a la asignación de asignatura
    await this.verifyTeacherSubjectAssignmentAccess(teacherId, createActivityDto.subjectAssignmentId);

    // Validar datos específicos del tipo de valoración
    if (createActivityDto.valuationType === ActivityValuationType.SCORE && !createActivityDto.maxScore) {
      throw new BadRequestException('maxScore es requerido para actividades de tipo score');
    }

    // SP-D3a: extraer criterionIds para que no contamine el objeto de entidad
    const { criterionIds, ...activityData } = createActivityDto;

    // Crear la actividad
    const activity = this.activitiesRepository.create({
      ...activityData,
      teacherId,
      assignedDate: new Date(createActivityDto.assignedDate),
      reviewDate: createActivityDto.reviewDate ? new Date(createActivityDto.reviewDate) : null,
      // Configurar valores por defecto para notificaciones si no se especifican
      notifyOnHappy: createActivityDto.notifyOnHappy ?? false,
      notifyOnNeutral: createActivityDto.notifyOnNeutral ?? true,
      notifyOnSad: createActivityDto.notifyOnSad ?? true,
      // Nuevos campos
      isTemplate: createActivityDto.isTemplate ?? false,
      isArchived: false,
    });

    const savedActivity = await this.activitiesRepository.save(activity);

    // Crear registros de valoración para estudiantes específicos o todo el grupo
    const targetStudentIds = createActivityDto.targetStudentIds;
    await this.createAssessmentRecordsForActivity(savedActivity.id, createActivityDto.subjectAssignmentId, targetStudentIds);

    await this.syncActivityCriteria(savedActivity.id, criterionIds);

    return this.findOne(savedActivity.id);
  }

  async duplicate(activityId: string, duplicateDto: DuplicateActivityDto, teacherId: string): Promise<Activity> {
    // Obtener la actividad original
    const originalActivity = await this.findOne(activityId);

    // Verificar que el profesor es el propietario o tiene permisos
    if (originalActivity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para duplicar esta actividad');
    }

    // Verificar acceso a la nueva asignación de asignatura si se especifica
    const targetSubjectAssignmentId = duplicateDto.subjectAssignmentId || originalActivity.subjectAssignmentId;
    await this.verifyTeacherSubjectAssignmentAccess(teacherId, targetSubjectAssignmentId);

    // Crear datos para la nueva actividad combinando original + modificaciones
    const duplicatedActivityData: CreateActivityDto = {
      name: duplicateDto.name,
      description: duplicateDto.description || originalActivity.description,
      assignedDate: duplicateDto.assignedDate,
      reviewDate: duplicateDto.reviewDate || (originalActivity.reviewDate instanceof Date ? originalActivity.reviewDate.toISOString() : originalActivity.reviewDate),
      classGroupId: duplicateDto.classGroupId || originalActivity.classGroupId,
      subjectAssignmentId: targetSubjectAssignmentId,
      valuationType: duplicateDto.valuationType || originalActivity.valuationType,
      maxScore: duplicateDto.maxScore || originalActivity.maxScore,
      notifyFamilies: duplicateDto.notifyFamilies ?? originalActivity.notifyFamilies,
      notifyOnHappy: duplicateDto.notifyOnHappy ?? originalActivity.notifyOnHappy,
      notifyOnNeutral: duplicateDto.notifyOnNeutral ?? originalActivity.notifyOnNeutral,
      notifyOnSad: duplicateDto.notifyOnSad ?? originalActivity.notifyOnSad,
      targetStudentIds: duplicateDto.targetStudentIds,
      isTemplate: duplicateDto.isTemplate ?? false,
    };

    // Crear la nueva actividad usando el método existente
    return this.create(duplicatedActivityData, teacherId);
  }

  async findAll(
    teacherId: string,
    classGroupId?: string,
    startDate?: string,
    endDate?: string,
    academicYearId?: string,
  ): Promise<Activity[]> {
    const query = this.activitiesRepository.createQueryBuilder('activity')
      .leftJoinAndSelect('activity.classGroup', 'classGroup')
      .leftJoinAndSelect('activity.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'saSubject')
      .leftJoinAndSelect('activity.teacher', 'teacher')
      .leftJoinAndSelect('activity.assessments', 'assessments')
      .leftJoinAndSelect('assessments.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('activity.teacherId = :teacherId', { teacherId })
      .andWhere('activity.isActive = :isActive', { isActive: true });

    if (classGroupId) {
      query.andWhere('activity.classGroupId = :classGroupId', { classGroupId });
    }

    if (startDate && endDate) {
      query.andWhere('activity.assignedDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    if (academicYearId) {
      query.andWhere('activity.academicYearId = :academicYearId', { academicYearId });
    }

    return query
      .orderBy('activity.assignedDate', 'DESC')
      .addOrderBy('activity.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'classGroup',
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'assessments',
        'assessments.student',
        'assessments.student.user',
        'assessments.student.user.profile',
        'evaluationCriteria', // SP-D3a: criterios LOMLOE atados
      ],
    });

    if (!activity) {
      throw new NotFoundException(`Actividad con ID ${id} no encontrada`);
    }

    return activity;
  }

  async update(id: string, updateActivityDto: UpdateActivityDto, teacherId: string): Promise<Activity> {
    const activity = await this.findOne(id);

    // Verificar que el profesor es el propietario
    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para editar esta actividad');
    }

    // Validar cambios en tipo de valoración
    if (updateActivityDto.valuationType === ActivityValuationType.SCORE && !updateActivityDto.maxScore) {
      throw new BadRequestException('maxScore es requerido para actividades de tipo score');
    }

    const updateData: any = { ...updateActivityDto };
    if (updateActivityDto.assignedDate) {
      updateData.assignedDate = new Date(updateActivityDto.assignedDate);
    }
    if (updateActivityDto.reviewDate) {
      updateData.reviewDate = new Date(updateActivityDto.reviewDate);
    }

    delete updateData.criterionIds; // SP-D3a: la relación se sincroniza aparte (syncActivityCriteria)

    await this.activitiesRepository.update(id, updateData);

    await this.syncActivityCriteria(id, updateActivityDto.criterionIds);

    return this.findOne(id);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const activity = await this.findOne(id);

    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para eliminar esta actividad');
    }

    // Soft delete
    await this.activitiesRepository.update(id, { isActive: false });
  }

  // ==================== VALORACIONES ====================

  async assessStudent(
    activityId: string,
    studentId: string,
    assessDto: AssessActivityDto,
    teacherId: string,
    userId?: string,
  ): Promise<ActivityAssessment> {
    // Verificar que la actividad existe y el profesor tiene acceso
    const activity = await this.findOne(activityId);
    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para valorar esta actividad');
    }

    // Validar el valor según el tipo de actividad
    this.validateAssessmentValue(activity.valuationType, assessDto.value, activity.maxScore);

    // Buscar o crear el registro de valoración
    let assessment = await this.assessmentsRepository.findOne({
      where: { activityId, studentId },
    });

    if (!assessment) {
      throw new NotFoundException('Registro de valoración no encontrado');
    }

    // SOLUCION DEFINITIVA: Si no tenemos userId, buscar el userId del teacher
    let finalUserId = userId;
    if (!finalUserId) {
      const teacher = await this.teachersRepository.findOne({
        where: { id: teacherId },
        relations: ['user'],
        select: { id: true, user: { id: true } }
      });
      if (teacher?.user?.id) {
        finalUserId = teacher.user.id;
      } else {
        throw new BadRequestException('No se pudo encontrar el usuario asociado al profesor');
      }
    }

    // Actualizar la valoración
    assessment.value = assessDto.value;
    assessment.comment = assessDto.comment || null;
    assessment.weight = assessDto.weight ?? null;
    assessment.assessedAt = new Date();
    assessment.assessedById = finalUserId; // Siempre usar un userId válido
    assessment.isAssessed = true;

    const savedAssessment = await this.assessmentsRepository.save(assessment);

    // Si la actividad tiene notificación habilitada, verificar si se debe notificar según el tipo de emoji
    if (activity.notifyFamilies && this.shouldNotifyFamily(activity, assessDto.value)) {
      await this.createFamilyNotification(savedAssessment.id, studentId);
    }

    return savedAssessment;
  }

  async bulkAssess(
    activityId: string,
    bulkAssessDto: BulkAssessActivityDto,
    teacherId: string,
    userId?: string,
  ): Promise<ActivityAssessment[]> {
    const activity = await this.findOne(activityId);
    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para valorar esta actividad');
    }

    this.validateAssessmentValue(activity.valuationType, bulkAssessDto.value, activity.maxScore);

    // SOLUCION DEFINITIVA: Si no tenemos userId, buscar el userId del teacher
    let finalUserId = userId;
    if (!finalUserId) {
      const teacher = await this.teachersRepository.findOne({
        where: { id: teacherId },
        relations: ['user'],
        select: { id: true, user: { id: true } }
      });
      if (teacher?.user?.id) {
        finalUserId = teacher.user.id;
      } else {
        throw new BadRequestException('No se pudo encontrar el usuario asociado al profesor');
      }
    }

    // Obtener estudiantes objetivo
    let targetStudentIds: string[];
    if (bulkAssessDto.studentIds && bulkAssessDto.studentIds.length > 0) {
      targetStudentIds = bulkAssessDto.studentIds;
    } else {
      // Obtener todos los estudiantes del grupo
      const classGroup = await this.classGroupsRepository.findOne({
        where: { id: activity.classGroupId },
        relations: ['students', 'students.user'],
      });
      // Filtrar solo estudiantes activos
      const activeStudents = classGroup.students.filter(student => student.user?.isActive === true);
      targetStudentIds = activeStudents.map(student => student.id);
    }

    // Actualizar valoraciones masivamente
    const assessments = await this.assessmentsRepository.find({
      where: {
        activityId,
        studentId: In(targetStudentIds),
      },
    });

    const updatedAssessments: ActivityAssessment[] = [];

    for (const assessment of assessments) {
      assessment.value = bulkAssessDto.value;
      assessment.comment = bulkAssessDto.comment || null;
      assessment.assessedAt = new Date();
      assessment.assessedById = finalUserId; // Siempre usar un userId válido
      assessment.isAssessed = true;

      const saved = await this.assessmentsRepository.save(assessment);
      updatedAssessments.push(saved);

      // Crear notificación si corresponde según configuración de emoji
      if (activity.notifyFamilies && this.shouldNotifyFamily(activity, bulkAssessDto.value)) {
        await this.createFamilyNotification(saved.id, assessment.studentId);
      }
    }

    return updatedAssessments;
  }

  // ==================== ESTADÍSTICAS ====================

  async getActivityStatistics(activityId: string, teacherId: string): Promise<ActivityStatisticsDto> {
    const activity = await this.findOne(activityId);
    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para ver estas estadísticas');
    }

    const assessments = activity.assessments;
    const totalStudents = assessments.length;
    const assessedStudents = assessments.filter(a => a.isAssessed).length;
    const pendingStudents = totalStudents - assessedStudents;

    const statistics: ActivityStatisticsDto = {
      activityId: activity.id,
      activityName: activity.name,
      totalStudents,
      assessedStudents,
      pendingStudents,
      completionPercentage: totalStudents > 0 ? Math.round((assessedStudents / totalStudents) * 100) : 0,
    };

    if (activity.valuationType === ActivityValuationType.EMOJI) {
      const emojiCounts = {
        happy: assessments.filter(a => a.value === EmojiValue.HAPPY).length,
        neutral: assessments.filter(a => a.value === EmojiValue.NEUTRAL).length,
        sad: assessments.filter(a => a.value === EmojiValue.SAD).length,
      };
      statistics.emojiDistribution = emojiCounts;
    } else if (activity.valuationType === ActivityValuationType.SCORE) {
      const scores = assessments
        .filter(a => a.isAssessed && a.value)
        .map(a => parseFloat(a.value))
        .filter(score => !isNaN(score));

      if (scores.length > 0) {
        statistics.scoreStatistics = {
          average: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10,
          min: Math.min(...scores),
          max: Math.max(...scores),
          maxPossible: activity.maxScore || 10,
        };
      }
    }

    return statistics;
  }

  async getTeacherSummary(teacherId: string): Promise<TeacherActivitySummaryDto> {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

    // Actividades de hoy
    const todayActivities = await this.activitiesRepository.count({
      where: {
        teacherId,
        isActive: true,
        assignedDate: new Date().toISOString().split('T')[0] as any,
      },
    });

    // Valoraciones pendientes
    const pendingAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.teacherId = :teacherId', { teacherId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: false })
      .getCount();

    // Valoraciones de esta semana
    const weekAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.teacherId = :teacherId', { teacherId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .andWhere('assessment.assessedAt BETWEEN :startOfWeek AND :endOfWeek', {
        startOfWeek,
        endOfWeek,
      })
      .getCount();

    // Ratio de valoraciones positivas
    const positiveAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.teacherId = :teacherId', { teacherId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .andWhere('assessment.value = :value', { value: EmojiValue.HAPPY })
      .getCount();

    const totalAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.teacherId = :teacherId', { teacherId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .getCount();

    return {
      todayActivities,
      pendingAssessments,
      weekAssessments,
      positiveRatio: totalAssessments > 0 ? Math.round((positiveAssessments / totalAssessments) * 100) : 0,
    };
  }

  // ==================== MÉTODOS PARA FAMILIAS ====================

  async getFamilyActivities(familyUserId: string, studentId?: string, limit = 10, academicYearId?: string): Promise<ActivityAssessment[]> {
    // Verificar acceso de la familia al estudiante
    if (studentId) {
      await this.verifyFamilyStudentAccess(familyUserId, studentId);
    }

    const query = this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .innerJoin('assessment.student', 'student')
      .innerJoin('student.user', 'user')
      .innerJoin('user.profile', 'profile')
      .leftJoin('activity.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('teacherUser.profile', 'teacherProfile')
      .leftJoin('activity.subjectAssignment', 'subjectAssignment')
      .leftJoin('subjectAssignment.subject', 'subject')
      .leftJoin('subjectAssignment.classGroup', 'classGroup')
      // Agregar relaciones para rúbricas
      .leftJoin('activity.rubric', 'rubric')
      .leftJoin('rubric.criteria', 'rubricCriteria')
      .leftJoin('rubric.levels', 'rubricLevels')
      .leftJoin('assessment.rubricAssessments', 'rubricAssessment')
      .leftJoin('rubricAssessment.criterionAssessments', 'criterionAssessments')
      .leftJoin('criterionAssessments.criterion', 'criterion')
      .leftJoin('criterionAssessments.selectedLevel', 'level')
      .where('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .andWhere('assessment.notifiedAt IS NOT NULL')
      .andWhere('activity.isActive = :isActive', { isActive: true })
      // Solo notas publicadas por el profesor son visibles para la familia
      .andWhere('activity.visibleToFamilies = :visibleToFamilies', { visibleToFamilies: true });

    if (studentId) {
      query.andWhere('assessment.studentId = :studentId', { studentId });
    } else {
      // Obtener todos los estudiantes de la familia
      const familyStudents = await this.getFamilyStudentIds(familyUserId);
      query.andWhere('assessment.studentId IN (:...studentIds)', { studentIds: familyStudents });
    }

    const ayId = academicYearId || (await this.currentAcademicYearService.getCurrentId());
    if (ayId) {
      query.andWhere('activity.academicYearId = :ayId', { ayId });
    }

    return query
      .select([
        'assessment',
        'activity.id',
        'activity.name',
        'activity.description',
        'activity.assignedDate',
        'activity.valuationType',
        'activity.maxScore',
        'student.id',
        'user.id',
        'profile.firstName',
        'profile.lastName',
        'teacher.id',
        'teacherUser.id',
        'teacherProfile.firstName',
        'teacherProfile.lastName',
        'subjectAssignment.id',
        'subject.id',
        'subject.name',
        'subject.code',
        'classGroup.id',
        'classGroup.name',
        // Campos de rúbrica
        'rubric.id',
        'rubric.name',
        'rubric.description',
        'rubricCriteria.id',
        'rubricCriteria.name',
        'rubricCriteria.description',
        'rubricCriteria.weight',
        'rubricLevels.id',
        'rubricLevels.name',
        'rubricLevels.description',
        'rubricLevels.scoreValue',
        'rubricAssessment.id',
        'rubricAssessment.totalScore',
        'rubricAssessment.maxPossibleScore',
        'rubricAssessment.percentage',
        'rubricAssessment.comments',
        'criterionAssessments.id',
        'criterionAssessments.comments',
        'criterion.id',
        'criterion.name',
        'level.id',
        'level.name',
        'level.scoreValue',
      ])
      .orderBy('assessment.assessedAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getFamilyRubricNotifications(familyUserId: string, studentId?: string, limit = 20): Promise<ActivityAssessment[]> {
    // Verificar acceso de la familia al estudiante
    if (studentId) {
      await this.verifyFamilyStudentAccess(familyUserId, studentId);
    }

    const query = this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .innerJoin('assessment.student', 'student')
      .innerJoin('student.user', 'user')
      .innerJoin('user.profile', 'profile')
      .leftJoin('activity.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('teacherUser.profile', 'teacherProfile')
      .leftJoin('activity.subjectAssignment', 'subjectAssignment')
      .leftJoin('subjectAssignment.subject', 'subject')
      .leftJoin('subjectAssignment.classGroup', 'classGroup')
      // Relaciones para rúbricas - REQUERIDAS para este endpoint
      .innerJoin('activity.rubric', 'rubric')
      .leftJoin('rubric.criteria', 'rubricCriteria')
      .leftJoin('rubricCriteria.levels', 'rubricLevels')
      .innerJoin('assessment.rubricAssessments', 'rubricAssessment')
      .leftJoin('rubricAssessment.criterionAssessments', 'criterionAssessments')
      .leftJoin('criterionAssessments.criterion', 'criterion')
      .leftJoin('criterionAssessments.selectedLevel', 'level')
      .where('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .andWhere('assessment.notifiedAt IS NOT NULL')
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('rubric.id IS NOT NULL') // Solo actividades con rúbrica
      .andWhere('rubricAssessment.id IS NOT NULL'); // Solo con valoración de rúbrica

    if (studentId) {
      query.andWhere('assessment.studentId = :studentId', { studentId });
    } else {
      // Obtener todos los estudiantes de la familia
      const familyStudents = await this.getFamilyStudentIds(familyUserId);
      query.andWhere('assessment.studentId IN (:...studentIds)', { studentIds: familyStudents });
    }

    return query
      .select([
        'assessment',
        'activity.id',
        'activity.name',
        'activity.description',
        'activity.assignedDate',
        'activity.valuationType',
        'activity.maxScore',
        'student.id',
        'user.id',
        'profile.firstName',
        'profile.lastName',
        'teacher.id',
        'teacherUser.id',
        'teacherProfile.firstName',
        'teacherProfile.lastName',
        'subjectAssignment.id',
        'subject.id',
        'subject.name',
        'subject.code',
        'classGroup.id',
        'classGroup.name',
        // Campos de rúbrica completos
        'rubric.id',
        'rubric.name',
        'rubric.description',
        'rubricCriteria.id',
        'rubricCriteria.name',
        'rubricCriteria.description',
        'rubricCriteria.weight',
        'rubricLevels.id',
        'rubricLevels.name',
        'rubricLevels.description',
        'rubricLevels.scoreValue',
        'rubricAssessment.id',
        'rubricAssessment.totalScore',
        'rubricAssessment.maxPossibleScore',
        'rubricAssessment.percentage',
        'rubricAssessment.comments',
        'criterionAssessments.id',
        'criterionAssessments.comments',
        'criterion.id',
        'criterion.name',
        'level.id',
        'level.name',
        'level.scoreValue',
      ])
      .orderBy('assessment.assessedAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async createAssessmentRecords(activityId: string, classGroupId: string): Promise<void> {
    const classGroup = await this.classGroupsRepository.findOne({
      where: { id: classGroupId },
      relations: ['students'],
    });

    if (!classGroup) {
      throw new NotFoundException(`Grupo de clase con ID ${classGroupId} no encontrado`);
    }

    // Filtrar solo estudiantes activos
    const activeStudents = classGroup.students.filter(student => student.user?.isActive === true);

    const assessmentRecords = activeStudents.map(student =>
      this.assessmentsRepository.create({
        activityId,
        studentId: student.id,
        isAssessed: false,
      })
    );

    await this.assessmentsRepository.save(assessmentRecords);
  }

  private validateAssessmentValue(valuationType: ActivityValuationType, value: string, maxScore?: number): void {
    if (valuationType === ActivityValuationType.EMOJI) {
      if (!Object.values(EmojiValue).includes(value as EmojiValue)) {
        throw new BadRequestException(`Valor de emoji inválido: ${value}. Valores permitidos: ${Object.values(EmojiValue).join(', ')}`);
      }
    } else if (valuationType === ActivityValuationType.SCORE) {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue < 0 || (maxScore && numericValue > maxScore)) {
        throw new BadRequestException(`Valor de puntuación inválido: ${value}. Debe ser un número entre 0 y ${maxScore}`);
      }
    }
  }

  private async verifyTeacherAccess(teacherId: string, classGroupId: string): Promise<void> {
    // Verificar si es tutor del grupo
    const tutoredClasses = await this.classGroupsRepository.find({
      where: { tutor: { id: teacherId } },
      select: ['id'],
    });

    const isTutor = tutoredClasses.some(cls => cls.id === classGroupId);
    
    if (isTutor) {
      return; // Tiene acceso como tutor
    }

    // Verificar si tiene asignaturas en el grupo
    const assignmentQuery = await this.classGroupsRepository
      .createQueryBuilder('classGroup')
      .innerJoin('subject_assignments', 'sa', 'sa.classGroupId = classGroup.id')
      .where('sa.teacherId = :teacherId', { teacherId })
      .andWhere('classGroup.id = :classGroupId', { classGroupId })
      .getCount();

    if (assignmentQuery === 0) {
      throw new ForbiddenException('No tienes acceso a este grupo de clase');
    }
  }

  private async createFamilyNotification(assessmentId: string, studentId: string): Promise<void> {
    try {
      // Obtener familias relacionadas con el estudiante
      const familyRelations = await this.familyStudentsRepository.find({
        where: { student: { id: studentId } },
        relations: ['family'],
      });

      for (const relation of familyRelations) {
        // Verificar si ya existe notificación
        const existingNotification = await this.notificationsRepository.findOne({
          where: {
            assessmentId,
            familyId: relation.family.id,
          },
        });

        if (!existingNotification) {
          const notification = this.notificationsRepository.create({
            assessmentId,
            familyId: relation.family.id,
          });
          await this.notificationsRepository.save(notification);
        }
      }

      // Marcar la valoración como notificada
      await this.assessmentsRepository.update(assessmentId, {
        notifiedAt: new Date(),
      });
    } catch (error) {
      console.error('Error creating family notification:', error);
      // No fallar la valoración por errores de notificación
    }
  }

  private async verifyFamilyStudentAccess(familyUserId: string, studentId: string): Promise<void> {
    const familyRelation = await this.familyStudentsRepository.findOne({
      where: [
        { family: { primaryContact: { id: familyUserId } }, student: { id: studentId } },
        { family: { secondaryContact: { id: familyUserId } }, student: { id: studentId } },
      ],
    });

    if (!familyRelation) {
      throw new ForbiddenException('No tienes acceso a las actividades de este estudiante');
    }
  }

  private async getFamilyStudentIds(familyUserId: string): Promise<string[]> {
    const familyRelations = await this.familyStudentsRepository.find({
      where: [
        { family: { primaryContact: { id: familyUserId } } },
        { family: { secondaryContact: { id: familyUserId } } },
      ],
      relations: ['student'],
    });

    return familyRelations.map(relation => relation.student.id);
  }

  private shouldNotifyFamily(activity: Activity, assessmentValue: string): boolean {
    // Para actividades de score, siempre notificar si está habilitado
    if (activity.valuationType === ActivityValuationType.SCORE) {
      return true;
    }

    // Para actividades de emoji, verificar configuración específica
    if (activity.valuationType === ActivityValuationType.EMOJI) {
      switch (assessmentValue) {
        case EmojiValue.HAPPY:
          return activity.notifyOnHappy;
        case EmojiValue.NEUTRAL:
          return activity.notifyOnNeutral;
        case EmojiValue.SAD:
          return activity.notifyOnSad;
        default:
          return false;
      }
    }

    return false;
  }

  private async getTeacherIdFromUserId(userId: string): Promise<string> {
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      select: ['id'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado para este usuario');
    }

    return teacher.id;
  }

  // Wrapper methods that convert userId to teacherId
  async createByUserId(createActivityDto: CreateActivityDto, userId: string): Promise<Activity> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.create(createActivityDto, teacherId);
  }

  async duplicateByUserId(activityId: string, duplicateDto: DuplicateActivityDto, userId: string): Promise<Activity> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.duplicate(activityId, duplicateDto, teacherId);
  }

  async findAllByUserId(userId: string, classGroupId?: string, startDate?: string, endDate?: string, academicYearId?: string): Promise<Activity[]> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.findAll(teacherId, classGroupId, startDate, endDate, academicYearId);
  }

  async updateByUserId(id: string, updateActivityDto: UpdateActivityDto, userId: string): Promise<Activity> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.update(id, updateActivityDto, teacherId);
  }

  async removeByUserId(id: string, userId: string): Promise<void> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.remove(id, teacherId);
  }

  async assessStudentByUserId(activityId: string, studentId: string, assessDto: AssessActivityDto, userId: string): Promise<ActivityAssessment> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    const result = await this.assessStudent(activityId, studentId, assessDto, teacherId, userId);

    // SP-D2a: recálculo síncrono fail-soft de la nota ponderada centralizada.
    await this.recalcActivityGradeSafe(activityId, studentId);
    await this.deriveActivityCriteriaSafe(activityId, studentId);

    return result;
  }

  /**
   * Resuelve subjectAssignmentId desde activityId y recalcula la nota centralizada.
   * FAIL-SOFT en todo. (El wrapper no recibe la Activity cargada.)
   */
  private async recalcActivityGradeSafe(activityId: string, studentId: string): Promise<void> {
    try {
      const activity = await this.activitiesRepository.findOne({ where: { id: activityId } });
      if (!activity?.subjectAssignmentId) return;
      await this.recalcCentralizedGradeSafe(studentId, activity.subjectAssignmentId);
    } catch (e) {
      this.logger.warn(
        `Recálculo de actividad falló (activity=${activityId}, student=${studentId}): ${e?.message}`,
      );
    }
  }

  // SP-B2 Fase 2: recalcula (roll-up saberes+nota) los criterios LOMLOE atados a una actividad para un alumno (fail-soft)
  private async deriveActivityCriteriaSafe(activityId: string, studentId: string): Promise<void> {
    try {
      const activity = await this.activitiesRepository.findOne({ where: { id: activityId }, relations: ['evaluationCriteria'] });
      if (!activity) return;
      const criterionIds = (activity.evaluationCriteria || []).map((c) => c.id);
      if (criterionIds.length === 0) return;
      await this.criterionRollupService.rollupForWork({
        studentId,
        subjectAssignmentId: activity.subjectAssignmentId,
        criterionIds,
        referenceDate: activity.assignedDate || new Date(),
      });
    } catch (e) {
      this.logger.warn(`Derivación de criterios (activity=${activityId}, student=${studentId}) falló: ${e?.message}`);
    }
  }

  async bulkAssessByUserId(activityId: string, bulkAssessDto: BulkAssessActivityDto, userId: string): Promise<ActivityAssessment[]> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.bulkAssess(activityId, bulkAssessDto, teacherId, userId);
  }

  async getActivityStatisticsByUserId(activityId: string, userId: string): Promise<ActivityStatisticsDto> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.getActivityStatistics(activityId, teacherId);
  }

  async getTeacherSummaryByUserId(userId: string): Promise<TeacherActivitySummaryDto> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.getTeacherSummary(teacherId);
  }

  // ==================== MÉTODOS POR ASIGNATURA ====================

  async getTeacherSubjectAssignments(teacherId: string): Promise<SubjectAssignmentWithStudentsDto[]> {
    const assignments = await this.subjectAssignmentsRepository.find({
      where: { teacher: { id: teacherId } },
      relations: [
        'subject',
        'classGroup',
        'classGroup.students',
        'classGroup.students.user',
        'classGroup.students.user.profile',
        'academicYear'
      ],
    });

    return assignments.map(assignment => {
      // Filtrar solo estudiantes activos
      const activeStudents = assignment.classGroup.students.filter(student => student.user?.isActive === true);

      return {
        id: assignment.id,
        subject: {
          id: assignment.subject.id,
          name: assignment.subject.name,
          code: assignment.subject.code,
        },
        classGroup: {
          id: assignment.classGroup.id,
          name: assignment.classGroup.name,
        },
        academicYear: {
          id: assignment.academicYear.id,
          name: assignment.academicYear.name,
        },
        weeklyHours: assignment.weeklyHours,
        students: activeStudents.map(student => ({
        id: student.id,
        enrollmentNumber: student.enrollmentNumber,
        user: {
          profile: {
            firstName: student.user.profile.firstName,
            lastName: student.user.profile.lastName,
          }
        }
      })),
      };
    });
  }

  async getTeacherSubjectAssignmentsByUserId(userId: string): Promise<SubjectAssignmentWithStudentsDto[]> {
    // Check if user is admin
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === 'admin') {
      // Admin can see all subject assignments
      const assignments = await this.subjectAssignmentsRepository.find({
        relations: [
          'subject',
          'classGroup',
          'classGroup.students',
          'classGroup.students.user',
          'classGroup.students.user.profile',
          'academicYear',
          'teacher',
          'teacher.user',
          'teacher.user.profile'
        ],
        order: { subject: { name: 'ASC' } }
      });

      return assignments.map(assignment => {
        // Filtrar solo estudiantes activos
        const activeStudents = (assignment.classGroup.students || []).filter(student => student.user?.isActive === true);

        return {
          id: assignment.id,
          subject: {
            id: assignment.subject.id,
            name: assignment.subject.name,
            code: assignment.subject.code
          },
          classGroup: {
            id: assignment.classGroup.id,
            name: assignment.classGroup.name
          },
          academicYear: {
            id: assignment.academicYear.id,
            name: assignment.academicYear.name
          },
          weeklyHours: assignment.weeklyHours || 3, // Default weekly hours
          students: activeStudents.map(student => ({
          id: student.id,
          enrollmentNumber: student.enrollmentNumber || 'N/A',
          user: {
            profile: {
              firstName: student.user.profile?.firstName || 'Sin nombre',
              lastName: student.user.profile?.lastName || 'Sin apellido'
            }
          }
        })),
        };
      });
    } else {
      // Regular teacher flow
      const teacherId = await this.getTeacherIdFromUserId(userId);
      return this.getTeacherSubjectAssignments(teacherId);
    }
  }

  async findActivitiesBySubjectAssignmentUserId(
    subjectAssignmentId: string,
    userId: string,
    includeArchived: boolean = false,
  ): Promise<Activity[]> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.findActivitiesBySubjectAssignment(subjectAssignmentId, teacherId, includeArchived);
  }

  async getSubjectActivitySummaryByUserId(
    subjectAssignmentId: string,
    userId: string,
  ): Promise<SubjectActivitySummaryDto> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.getSubjectActivitySummary(subjectAssignmentId, teacherId);
  }

  async getTeacherTemplatesByUserId(userId: string): Promise<Activity[]> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.findTemplatesByTeacher(teacherId);
  }

  async createFromTemplateByUserId(
    createFromTemplateDto: CreateFromTemplateDto,
    userId: string,
  ): Promise<Activity> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    return this.createFromTemplate(createFromTemplateDto, teacherId);
  }

  async toggleArchiveByUserId(activityId: string, userId: string): Promise<Activity> {
    const teacherId = await this.getTeacherIdFromUserId(userId);
    const activity = await this.findOne(activityId);
    
    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para modificar esta actividad');
    }

    const newArchivedState = !activity.isArchived;
    await this.activitiesRepository.update(activityId, { isArchived: newArchivedState });
    
    return this.findOne(activityId);
  }

  async findActivitiesBySubjectAssignment(
    subjectAssignmentId: string,
    teacherId: string,
    includeArchived: boolean = false,
    includeTemplates: boolean = false
  ): Promise<Activity[]> {
    await this.verifyTeacherSubjectAssignmentAccess(teacherId, subjectAssignmentId);

    const query = this.activitiesRepository.createQueryBuilder('activity')
      .leftJoinAndSelect('activity.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .leftJoinAndSelect('activity.classGroup', 'classGroup')
      .leftJoinAndSelect('activity.teacher', 'teacher')
      .leftJoinAndSelect('activity.assessments', 'assessments')
      .leftJoinAndSelect('assessments.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('activity.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId })
      .andWhere('activity.isActive = :isActive', { isActive: true });

    if (!includeArchived) {
      query.andWhere('activity.isArchived = :isArchived', { isArchived: false });
    }

    if (!includeTemplates) {
      query.andWhere('activity.isTemplate = :isTemplate', { isTemplate: false });
    }

    return query
      .orderBy('activity.assignedDate', 'DESC')
      .addOrderBy('activity.createdAt', 'DESC')
      .getMany();
  }

  async findTemplatesByTeacher(teacherId: string): Promise<Activity[]> {
    const query = this.activitiesRepository.createQueryBuilder('activity')
      .leftJoinAndSelect('activity.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .leftJoinAndSelect('activity.classGroup', 'classGroup')
      .where('activity.teacherId = :teacherId', { teacherId })
      .andWhere('activity.isTemplate = :isTemplate', { isTemplate: true })
      .andWhere('activity.isActive = :isActive', { isActive: true });

    return query
      .orderBy('activity.createdAt', 'DESC')
      .getMany();
  }

  async createFromTemplate(createFromTemplateDto: CreateFromTemplateDto, teacherId: string): Promise<Activity> {
    const template = await this.activitiesRepository.findOne({
      where: { id: createFromTemplateDto.templateId, isTemplate: true },
      relations: ['subjectAssignment'],
    });

    if (!template) {
      throw new NotFoundException('Plantilla de actividad no encontrada');
    }

    if (template.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para usar esta plantilla');
    }

    // Crear actividad desde plantilla
    const newActivity = this.activitiesRepository.create({
      name: template.name,
      description: template.description,
      assignedDate: new Date(createFromTemplateDto.assignedDate),
      reviewDate: createFromTemplateDto.reviewDate ? new Date(createFromTemplateDto.reviewDate) : null,
      valuationType: template.valuationType,
      maxScore: template.maxScore,
      notifyFamilies: template.notifyFamilies,
      notifyOnHappy: template.notifyOnHappy,
      notifyOnNeutral: template.notifyOnNeutral,
      notifyOnSad: template.notifyOnSad,
      classGroupId: template.classGroupId,
      teacherId: template.teacherId,
      subjectAssignmentId: template.subjectAssignmentId,
      isTemplate: false,
      isArchived: false,
    });

    const savedActivity = await this.activitiesRepository.save(newActivity);

    // Crear registros de valoración
    const targetStudentIds = createFromTemplateDto.targetStudentIds;
    await this.createAssessmentRecordsForActivity(savedActivity.id, template.subjectAssignmentId, targetStudentIds);

    return this.findOne(savedActivity.id);
  }

  async archiveActivity(activityId: string, teacherId: string): Promise<void> {
    const activity = await this.findOne(activityId);

    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para archivar esta actividad');
    }

    await this.activitiesRepository.update(activityId, { isArchived: true });
  }

  async unarchiveActivity(activityId: string, teacherId: string): Promise<void> {
    const activity = await this.findOne(activityId);

    if (activity.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para desarchivar esta actividad');
    }

    await this.activitiesRepository.update(activityId, { isArchived: false });
  }

  async getSubjectActivitySummary(subjectAssignmentId: string, teacherId: string): Promise<SubjectActivitySummaryDto> {
    await this.verifyTeacherSubjectAssignmentAccess(teacherId, subjectAssignmentId);

    const subjectAssignment = await this.subjectAssignmentsRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['subject', 'classGroup'],
    });

    if (!subjectAssignment) {
      throw new NotFoundException('Asignación de asignatura no encontrada');
    }

    // Contar actividades
    const totalActivities = await this.activitiesRepository.count({
      where: { subjectAssignmentId, isActive: true },
    });

    const activeActivities = await this.activitiesRepository.count({
      where: { subjectAssignmentId, isActive: true, isArchived: false, isTemplate: false },
    });

    const archivedActivities = await this.activitiesRepository.count({
      where: { subjectAssignmentId, isActive: true, isArchived: true },
    });

    const templatesCount = await this.activitiesRepository.count({
      where: { subjectAssignmentId, isActive: true, isTemplate: true },
    });

    // Valoraciones pendientes
    const pendingAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('activity.isArchived = :isArchived', { isArchived: false })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: false })
      .getCount();

    // Valoraciones de esta semana
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() - endOfWeek.getDay() + 6);

    const weekCompletedAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .andWhere('assessment.assessedAt BETWEEN :startOfWeek AND :endOfWeek', {
        startOfWeek,
        endOfWeek,
      })
      .getCount();

    // Ratio positivo
    const positiveAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .andWhere('assessment.value = :value', { value: 'happy' })
      .getCount();

    const totalAssessments = await this.assessmentsRepository
      .createQueryBuilder('assessment')
      .innerJoin('assessment.activity', 'activity')
      .where('activity.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .andWhere('assessment.isAssessed = :isAssessed', { isAssessed: true })
      .getCount();

    // Última actividad
    const lastActivity = await this.activitiesRepository.findOne({
      where: { subjectAssignmentId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    return {
      subjectAssignmentId,
      subjectName: subjectAssignment.subject.name,
      subjectCode: subjectAssignment.subject.code,
      classGroupName: subjectAssignment.classGroup.name,
      totalActivities,
      activeActivities,
      archivedActivities,
      templatesCount,
      pendingAssessments,
      weekCompletedAssessments,
      positiveRatio: totalAssessments > 0 ? Math.round((positiveAssessments / totalAssessments) * 100) : 0,
      lastActivityDate: lastActivity?.createdAt,
    };
  }

  // ==================== ACTIVIDAD RECIENTE DEL SISTEMA ====================

  async getRecentSystemActivity(limit: number = 10): Promise<any[]> {
    const recentActivity = [];

    try {
      // 1. Actividades recientes creadas
      const recentActivities = await this.activitiesRepository
        .createQueryBuilder('activity')
        .leftJoinAndSelect('activity.subjectAssignment', 'subjectAssignment')
        .leftJoinAndSelect('subjectAssignment.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .leftJoinAndSelect('subjectAssignment.subject', 'subject')
        .leftJoinAndSelect('subjectAssignment.classGroup', 'classGroup')
        .where('activity.isActive = :isActive', { isActive: true })
        .orderBy('activity.createdAt', 'DESC')
        .limit(Math.floor(limit / 2))
        .getMany();

      // 2. Evaluaciones recientes completadas
      const recentAssessments = await this.assessmentsRepository
        .createQueryBuilder('assessment')
        .leftJoinAndSelect('assessment.activity', 'activity')
        .leftJoinAndSelect('activity.subjectAssignment', 'subjectAssignment')
        .leftJoinAndSelect('subjectAssignment.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .leftJoinAndSelect('subjectAssignment.subject', 'subject')
        .leftJoinAndSelect('subjectAssignment.classGroup', 'classGroup')
        .leftJoinAndSelect('assessment.student', 'student')
        .leftJoinAndSelect('student.user', 'studentUser')
        .leftJoinAndSelect('studentUser.profile', 'studentProfile')
        .where('assessment.isAssessed = :isAssessed', { isAssessed: true })
        .andWhere('assessment.assessedAt IS NOT NULL')
        .orderBy('assessment.assessedAt', 'DESC')
        .limit(Math.floor(limit / 2))
        .getMany();

      // Formatear actividades recientes
      for (const activity of recentActivities) {
        const teacherName = activity.subjectAssignment?.teacher?.user?.profile 
          ? `${activity.subjectAssignment.teacher.user.profile.firstName} ${activity.subjectAssignment.teacher.user.profile.lastName}`
          : 'Profesor no especificado';

        recentActivity.push({
          type: 'activity_created',
          title: 'Nueva actividad creada',
          description: `${teacherName} creó "${activity.name}" para ${activity.subjectAssignment?.subject?.name || 'materia'} - ${activity.subjectAssignment?.classGroup?.name || 'grupo'}`,
          timestamp: activity.createdAt,
          icon: 'FileTextOutlined',
          color: 'blue',
        });
      }

      // Formatear evaluaciones recientes
      for (const assessment of recentAssessments) {
        const teacherName = assessment.activity?.subjectAssignment?.teacher?.user?.profile 
          ? `${assessment.activity.subjectAssignment.teacher.user.profile.firstName} ${assessment.activity.subjectAssignment.teacher.user.profile.lastName}`
          : 'Profesor no especificado';

        const studentName = assessment.student?.user?.profile
          ? `${assessment.student.user.profile.firstName} ${assessment.student.user.profile.lastName}`
          : 'Estudiante no especificado';

        recentActivity.push({
          type: 'evaluation_completed',
          title: 'Evaluación completada',
          description: `${teacherName} evaluó a ${studentName} en "${assessment.activity?.name || 'actividad'}"`,
          timestamp: assessment.assessedAt,
          icon: 'CheckCircleOutlined',
          color: 'green',
        });
      }

      // Ordenar por timestamp más reciente y limitar
      return recentActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent system activity:', error);
      // En caso de error, devolver algunos datos mock para que no falle completamente
      return [
        {
          type: 'system_info',
          title: 'Sistema activo',
          description: 'MW Panel está funcionando correctamente',
          timestamp: new Date(),
          icon: 'CheckCircleOutlined',
          color: 'green',
        }
      ];
    }
  }

  // ==================== MÉTODOS AUXILIARES EXTENDIDOS ====================

  private async verifyTeacherSubjectAssignmentAccess(teacherId: string, subjectAssignmentId: string): Promise<void> {
    const assignment = await this.subjectAssignmentsRepository.findOne({
      where: { id: subjectAssignmentId, teacher: { id: teacherId } },
    });

    if (!assignment) {
      throw new ForbiddenException('No tienes acceso a esta asignación de asignatura');
    }
  }

  private async createAssessmentRecordsForActivity(
    activityId: string,
    subjectAssignmentId: string,
    targetStudentIds?: string[]
  ): Promise<void> {
    const subjectAssignment = await this.subjectAssignmentsRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['classGroup', 'classGroup.students', 'classGroup.students.user'],
    });

    if (!subjectAssignment) {
      throw new NotFoundException('Asignación de asignatura no encontrada');
    }

    // Filtrar solo estudiantes activos
    let studentsToAssess = subjectAssignment.classGroup.students.filter(student => student.user?.isActive === true);

    // Si se especificaron estudiantes específicos, filtrar
    if (targetStudentIds && targetStudentIds.length > 0) {
      studentsToAssess = studentsToAssess.filter(student =>
        targetStudentIds.includes(student.id)
      );
    }

    const assessmentRecords = studentsToAssess.map(student => 
      this.assessmentsRepository.create({
        activityId,
        studentId: student.id,
        isAssessed: false,
      })
    );

    await this.assessmentsRepository.save(assessmentRecords);
  }
}