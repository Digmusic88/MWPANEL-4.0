/**
 * @archivo: tasks.service.ts
 * @módulo: Tasks (Servicio de Gestión de Tareas Estudiantiles)
 * @función: Lógica de negocio para tareas, entregas y calificaciones
 * @crítico: SÍ - Sistema completo de deberes con entregas, archivos y evaluaciones
 * @dependencias: Task, TaskSubmission, Student, Teacher, Family entities
 * @no_modificar: Estados de SubmissionStatus sin verificar impacto en frontend
 * @relacionado_con: tasks.controller.ts, task.entity.ts, task-submission.entity.ts
 */

/**
 * SERVICIO: TasksService
 * UBICACIÓN: /backend/src/modules/tasks/tasks.service.ts
 * FUNCIÓN: Core business logic para el sistema completo de tareas estudiantiles
 * NO USAR PARA: Evaluaciones inmediatas diarias (usar activities.service.ts)
 * MÉTODOS CRÍTICOS:
 *   - create(): Crear tareas con archivos adjuntos y asignación automática
 *   - submitTask(): Entregas de estudiantes con validaciones de tiempo
 *   - gradeSubmission(): Calificación por profesores con feedback
 *   - getStudentTasks(): Vista de tareas para estudiantes con filtros
 *   - getFamilyTasks(): Vista familiar para seguimiento de múltiples hijos
 * 
 * TIPOS DE TAREAS SOPORTADOS:
 * - ASSIGNMENT: Tareas regulares con entrega de archivos
 * - PROJECT: Proyectos grandes con múltiples archivos
 * - EXAM: Recordatorios de examen (sin entrega digital)
 * - RESEARCH: Investigaciones con documentación extensa
 * 
 * ESTADOS DE ENTREGA (SubmissionStatus):
 * - NOT_SUBMITTED: Sin entregar (estudiante puede enviar)
 * - SUBMITTED: Entregada a tiempo (pendiente calificación)
 * - LATE: Entregada tarde (aplica penalización)
 * - GRADED: Calificada por profesor (proceso completo)
 * - RETURNED: Devuelta para corrección (necesita revisión)
 * 
 * FUNCIONALIDADES IMPLEMENTADAS:
 * - Subida de archivos adjuntos (profesores y estudiantes)
 * - Validación de tipos MIME y tamaños de archivo
 * - Sistema de calificaciones con penalizaciones por retraso
 * - Entregas tardías condicionales por configuración
 * - Estadísticas avanzadas para profesores y estudiantes
 * - Notificaciones automáticas para exámenes tipo EXAM
 * - Sistema de permisos multi-rol (teacher/student/family)
 * - Analytics de rendimiento por asignatura y estudiante
 * - Recordatorios masivos automáticos
 * 
 * INTEGRACIÓN CON OTRAS ENTIDADES:
 * - SubjectAssignment: Tareas asignadas por materia y grupo
 * - ClassGroup: Distribución automática a estudiantes de clase
 * - Family: Acceso de padres a tareas de múltiples hijos
 * - Teacher: Control completo de tareas propias
 * - Student: Vista personalizada de tareas asignadas
 * 
 * SEGURIDAD Y VALIDACIONES:
 * - Verificación de ownership (profesor propietario de tarea)
 * - Validación de acceso familiar (padres solo ven sus hijos)
 * - Prevención de entregas duplicadas
 * - Validación de fechas de entrega
 * - Control de archivos permitidos y tamaños
 * 
 * ESTADO ACTUAL: ✅ SISTEMA COMPLETO Y FUNCIONAL
 * - Todas las funcionalidades implementadas y probadas
 * - Sistema de archivos adjuntos operativo
 * - Estadísticas avanzadas para dashboards
 * - Integración completa con frontend por roles
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Like, DataSource, MoreThan, Brackets } from 'typeorm';
import {
  Task,
  TaskSubmission,
  TaskAttachment,
  TaskSubmissionAttachment,
  TaskStatus,
  TaskType,
  SubmissionStatus,
  AttachmentType,
  SubmissionAttachmentType,
  SubmissionAttachmentStatus,
  ExamGrade,
  TaskSubjectAssignment,
} from './entities';
import {
  CreateTaskDto,
  UpdateTaskDto,
  SubmitTaskDto,
  GradeTaskDto,
  GradeWithRubricDto,
  RubricGradeResponseDto,
  SelectedRubricCellDto,
  TaskQueryDto,
  StudentTaskQueryDto,
  FamilyTaskQueryDto,
  TaskStatisticsDto,
  StudentTaskStatisticsDto,
  SubjectTaskSummaryDto,
  AttachStudentNoteDto,
} from './dto';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Family, FamilyStudent } from '../users/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { GoogleDriveService } from '../educational-resources/services/google-drive.service';
import { EmailService } from '../communications/services/email.service';
import { NotificationService } from '../communications/services/notification.service';
import { Rubric } from '../activities/entities/rubric.entity';
import { RubricCriterion } from '../activities/entities/rubric-criterion.entity';
import { RubricLevel } from '../activities/entities/rubric-level.entity';
import { RubricCell } from '../activities/entities/rubric-cell.entity';
import { TaskRubricAssessment, TaskRubricAssessmentCriterion } from './entities';
import { StudentNote } from '../student-notes/entities/student-note.entity';
import { CentralizedGradesService } from '../grades/services/centralized-grades.service';
import { GradePeriod } from '../grades/entities/centralized-grade.entity';
import { EvaluationCriterion } from '../competencies/entities/evaluation-criterion.entity';
import { CriterionRollupService } from '../criterion-assessment/services/criterion-rollup.service';
import { CurrentAcademicYearService } from '../academic-years/current-academic-year.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(TaskSubmission)
    private submissionsRepository: Repository<TaskSubmission>,
    @InjectRepository(TaskAttachment)
    private attachmentsRepository: Repository<TaskAttachment>,
    @InjectRepository(TaskSubmissionAttachment)
    private submissionAttachmentsRepository: Repository<TaskSubmissionAttachment>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentsRepository: Repository<SubjectAssignment>,
    @InjectRepository(ClassGroup)
    private classGroupsRepository: Repository<ClassGroup>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentsRepository: Repository<FamilyStudent>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(StudentNote)
    private studentNoteRepository: Repository<StudentNote>,
    @InjectRepository(Rubric)
    private rubricsRepository: Repository<Rubric>,
    @InjectRepository(RubricCriterion)
    private rubricCriteriaRepository: Repository<RubricCriterion>,
    @InjectRepository(RubricLevel)
    private rubricLevelsRepository: Repository<RubricLevel>,
    @InjectRepository(RubricCell)
    private rubricCellsRepository: Repository<RubricCell>,
    @InjectRepository(TaskRubricAssessment)
    private taskRubricAssessmentsRepository: Repository<TaskRubricAssessment>,
    @InjectRepository(TaskRubricAssessmentCriterion)
    private taskRubricAssessmentCriteriaRepository: Repository<TaskRubricAssessmentCriterion>,
    @InjectRepository(ExamGrade)
    private examGradesRepository: Repository<ExamGrade>,
    @InjectRepository(TaskSubjectAssignment)
    private taskSubjectAssignmentsRepository: Repository<TaskSubjectAssignment>,
    @InjectRepository(EvaluationCriterion)
    private readonly evaluationCriterionRepository: Repository<EvaluationCriterion>,
    private dataSource: DataSource,
    private googleDriveService: GoogleDriveService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => CentralizedGradesService))
    private readonly centralizedGradesService: CentralizedGradesService,
    @Inject(forwardRef(() => CriterionRollupService))
    private readonly criterionRollupService: CriterionRollupService,
    private readonly currentAcademicYearService: CurrentAcademicYearService,
  ) {}

  /**
   * Recalcula la nota centralizada del alumno tras calificar. SÍNCRONO + FAIL-SOFT:
   * nunca relanza para no romper el guardado de la nota. Periodo fijo CONTINUOUS
   * (ver decisión de diseño SP-D2a).
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

  /**
   * Resuelve subjectAssignmentId desde taskId y recalcula la nota centralizada.
   * FAIL-SOFT en todo (resolución y recálculo). Usado por los grade de examen
   * (Test Yourself), que trabajan con SQL crudo sin entidad Task en scope.
   */
  private async recalcExamGradeByTaskSafe(taskId: string, studentId: string): Promise<void> {
    try {
      const task = await this.tasksRepository.findOne({ where: { id: taskId } });
      if (!task?.subjectAssignmentId) return;
      await this.recalcCentralizedGradeSafe(studentId, task.subjectAssignmentId);
    } catch (e) {
      this.logger.warn(
        `Recálculo de examen falló (task=${taskId}, student=${studentId}): ${e?.message}`,
      );
    }
  }

  // SP-B2 Fase 2: recalcula (roll-up saberes+nota) los criterios LOMLOE atados a una tarea para un alumno (fail-soft)
  private async deriveTaskCriteriaSafe(taskId: string, studentId: string): Promise<void> {
    try {
      const task = await this.tasksRepository.findOne({ where: { id: taskId }, relations: ['evaluationCriteria'] });
      if (!task) return;
      const criterionIds = (task.evaluationCriteria || []).map((c) => c.id);
      if (criterionIds.length === 0) return;
      await this.criterionRollupService.rollupForWork({
        studentId,
        subjectAssignmentId: task.subjectAssignmentId,
        criterionIds,
        referenceDate: task.assignedDate || task.dueDate || new Date(),
      });
    } catch (e) {
      this.logger.warn(`Derivación de criterios (task=${taskId}, student=${studentId}) falló: ${e?.message}`);
    }
  }

  // SP-D3a: sincroniza los criterios LOMLOE de una tarea (reemplazo total).
  // criterionIds undefined => no toca; [] => limpia; ids inexistentes se ignoran.
  private async syncTaskCriteria(taskId: string, criterionIds?: string[]): Promise<void> {
    if (criterionIds === undefined) return;
    const valid = criterionIds.length
      ? await this.evaluationCriterionRepository.find({ where: { id: In(criterionIds) } })
      : [];
    const qb = this.tasksRepository
      .createQueryBuilder()
      .relation(Task, 'evaluationCriteria')
      .of(taskId);
    const current = await qb.loadMany();
    await qb.addAndRemove(valid, current);
  }

  // ==================== CRUD TAREAS (PROFESORES) ====================

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // SP-D3a: extraer criterionIds para que no contamine el objeto de entidad
    const { criterionIds, ...taskData } = createTaskDto;

    // Verificar que el profesor tiene acceso a la asignación de asignatura
    await this.verifyTeacherSubjectAssignmentAccess(teacher.id, createTaskDto.subjectAssignmentId);

    // Validar fechas
    const assignedDate = new Date(createTaskDto.assignedDate);
    const dueDate = new Date(createTaskDto.dueDate);
    
    if (dueDate <= assignedDate) {
      throw new BadRequestException('La fecha de entrega debe ser posterior a la fecha de asignación');
    }

    // Auto-correct maxPoints for rubric-based tasks
    let correctedMaxPoints = createTaskDto.maxPoints;
    if (createTaskDto.rubricId && (!createTaskDto.maxPoints || createTaskDto.maxPoints <= 0)) {
      // Get rubric to use its maxScore
      const rubric = await this.rubricsRepository.findOne({
        where: { id: createTaskDto.rubricId }
      });
      if (rubric && rubric.maxScore) {
        correctedMaxPoints = rubric.maxScore;
        console.log(`[RUBRIC FIX] Auto-corrected maxPoints from ${createTaskDto.maxPoints} to ${correctedMaxPoints} based on rubric maxScore`);
      }
    }

    // DEBUG: Log más visible del valuationType recibido
    console.log('🚨🚨🚨 SERVICE CREATE CALLED 🚨🚨🚨');
    console.log('🔍 SERVICE valuationType:', createTaskDto.valuationType);
    console.log('🔍 SERVICE taskType:', createTaskDto.taskType);
    console.log('🔍 SERVICE title:', createTaskDto.title);
    
    // Crear la tarea
    const task = this.tasksRepository.create({
      ...taskData,
      maxPoints: correctedMaxPoints,
      teacherId: teacher.id,
      assignedDate,
      dueDate,
      allowedFileTypes: createTaskDto.allowedFileTypes ? JSON.stringify(createTaskDto.allowedFileTypes) : null,
      maxFileSize: createTaskDto.maxFileSizeMB ? createTaskDto.maxFileSizeMB * 1024 * 1024 : null, // Convertir MB a bytes
      status: TaskStatus.DRAFT, // Siempre empieza como borrador
    });
    
    // DEBUG: Log del task object creado
    console.log('🔍 SERVICE task.valuationType after create:', task.valuationType);
    console.log('🔍 SERVICE task keys:', Object.keys(task));

    const savedTask = await this.tasksRepository.save(task);

    // Guardar asignaturas adicionales (para Test Yourself multi-grupo)
    if (createTaskDto.additionalSubjectAssignmentIds && createTaskDto.additionalSubjectAssignmentIds.length > 0) {
      console.log('🔵 Guardando asignaturas adicionales:', createTaskDto.additionalSubjectAssignmentIds);

      for (const additionalId of createTaskDto.additionalSubjectAssignmentIds) {
        // Verificar que el profesor tiene acceso a cada asignatura adicional
        await this.verifyTeacherSubjectAssignmentAccess(teacher.id, additionalId);

        const taskSubjectAssignment = this.taskSubjectAssignmentsRepository.create({
          taskId: savedTask.id,
          subjectAssignmentId: additionalId,
        });
        await this.taskSubjectAssignmentsRepository.save(taskSubjectAssignment);
      }
    }

    // Para Test Yourself (exámenes/evaluaciones), crear notificaciones en lugar de registros de entrega
    // Los Test Yourself NO deben tener task_submissions, solo exam_grades
    if (savedTask.isTestYourself || savedTask.taskType === TaskType.EXAM) {
      // Crear notificaciones para la asignatura principal
      await this.createNotificationsForExamTask(savedTask.id, createTaskDto.subjectAssignmentId, createTaskDto.targetStudentIds);

      // Crear notificaciones para asignaturas adicionales
      if (createTaskDto.additionalSubjectAssignmentIds && createTaskDto.additionalSubjectAssignmentIds.length > 0) {
        for (const additionalId of createTaskDto.additionalSubjectAssignmentIds) {
          await this.createNotificationsForExamTask(savedTask.id, additionalId, createTaskDto.targetStudentIds);
        }
      }
    } else {
      // Crear registros de entrega solo para tareas regulares (NO Test Yourself)
      // Crear submissions para la asignatura principal
      await this.createSubmissionRecordsForTask(savedTask.id, createTaskDto.subjectAssignmentId, createTaskDto.targetStudentIds);

      // También crear submissions para asignaturas adicionales (multi-grupo)
      if (createTaskDto.additionalSubjectAssignmentIds && createTaskDto.additionalSubjectAssignmentIds.length > 0) {
        console.log('🔵 Creando submissions para asignaturas adicionales:', createTaskDto.additionalSubjectAssignmentIds);
        for (const additionalId of createTaskDto.additionalSubjectAssignmentIds) {
          await this.createSubmissionRecordsForTask(savedTask.id, additionalId, createTaskDto.targetStudentIds);
        }
      }
    }

    await this.syncTaskCriteria(savedTask.id, criterionIds);

    return this.findOne(savedTask.id);
  }

  async findAllByTeacher(userId: string, query: TaskQueryDto): Promise<{ tasks: Task[]; total: number }> {
    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const offset = (page - 1) * limit;

    const queryBuilder = this.tasksRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .leftJoinAndSelect('subjectAssignment.classGroup', 'classGroup')
      .leftJoinAndSelect('task.submissions', 'submissions')
      .leftJoinAndSelect('submissions.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('task.attachments', 'attachments')
      .where('task.teacherId = :teacherId', { teacherId: teacher.id })
      .andWhere('task.isActive = :isActive', { isActive: true });

    // Aplicar filtros
    if (query.classGroupId) {
      queryBuilder.andWhere('subjectAssignment.classGroupId = :classGroupId', { classGroupId: query.classGroupId });
    }

    if (query.subjectAssignmentId) {
      queryBuilder.andWhere('task.subjectAssignmentId = :subjectAssignmentId', { subjectAssignmentId: query.subjectAssignmentId });
    }

    if (query.taskType) {
      queryBuilder.andWhere('task.taskType = :taskType', { taskType: query.taskType });
    }

    if (query.status) {
      queryBuilder.andWhere('task.status = :status', { status: query.status });
    }

    if (query.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: query.priority });
    }

    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('task.assignedDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    if (query.onlyOverdue) {
      queryBuilder.andWhere('task.dueDate < :now', { now: new Date() })
        .andWhere('task.status = :publishedStatus', { publishedStatus: TaskStatus.PUBLISHED });
    }

    if (query.search) {
      queryBuilder.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.academicYearId) {
      queryBuilder.andWhere('task.academicYearId = :academicYearId', { academicYearId: query.academicYearId });
    }

    queryBuilder.orderBy('task.createdAt', 'DESC');

    const [tasks, total] = await queryBuilder
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { tasks, total };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id, isActive: true },
      relations: [
        'subjectAssignment',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup',
        'teacher',
        'teacher.user',
        'teacher.user.profile',
        'submissions',
        'submissions.student',
        'submissions.student.user',
        'submissions.student.user.profile',
        'submissions.attachments',
        'attachments',
        'additionalSubjectAssignments',
        'additionalSubjectAssignments.subjectAssignment',
        'additionalSubjectAssignments.subjectAssignment.subject',
        'additionalSubjectAssignments.subjectAssignment.classGroup',
        'evaluationCriteria', // SP-D3a: criterios LOMLOE atados
      ],
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    return task;
  }

  /**
   * Obtener IDs de estudiantes asignados a una tarea
   * Usado por el frontend para pre-cargar la selección al editar
   */
  async getAssignedStudentIds(taskId: string): Promise<string[]> {
    const submissions = await this.submissionsRepository.find({
      where: { taskId },
      select: ['studentId'],
    });

    return submissions.map(sub => sub.studentId);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    console.log('🔧 [SERVICE UPDATE] Starting update process');
    console.log('🔧 [SERVICE UPDATE] Task ID:', id);
    console.log('🔧 [SERVICE UPDATE] User ID:', userId);
    console.log('🔧 [SERVICE UPDATE] Update DTO:', JSON.stringify(updateTaskDto, null, 2));

    const task = await this.findOne(id);
    console.log('🔧 [SERVICE UPDATE] Task found:', task.id, task.title);
    console.log('🔧 [SERVICE UPDATE] Task type:', task.taskType, 'isTestYourself:', task.isTestYourself);

    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      console.error('❌ [SERVICE UPDATE] Profesor no encontrado para userId:', userId);
      throw new NotFoundException('Profesor no encontrado');
    }

    console.log('🔧 [SERVICE UPDATE] Teacher found:', teacher.id);
    console.log('🔧 [SERVICE UPDATE] Task teacherId:', task.teacherId, 'vs Teacher id:', teacher.id);

    // Verificar que el profesor es el propietario
    if (task.teacherId !== teacher.id) {
      console.error('❌ [SERVICE UPDATE] Profesor no es propietario de la tarea');
      throw new ForbiddenException('No tienes permisos para editar esta tarea');
    }

    console.log('✅ [SERVICE UPDATE] Permission check passed');

    // Si se está publicando, validar que tenga contenido mínimo
    if (updateTaskDto.status === TaskStatus.PUBLISHED) {
      if (!task.title || !task.dueDate) {
        console.error('❌ [SERVICE UPDATE] No se puede publicar sin título o fecha');
        throw new BadRequestException('Para publicar una tarea debe tener al menos título y fecha de entrega');
      }
      updateTaskDto.publishedAt = new Date();
      console.log('🔧 [SERVICE UPDATE] Setting publishedAt:', updateTaskDto.publishedAt);
    }

    // Si se está cerrando
    if (updateTaskDto.status === TaskStatus.CLOSED) {
      updateTaskDto.closedAt = new Date();
      console.log('🔧 [SERVICE UPDATE] Setting closedAt:', updateTaskDto.closedAt);
    }

    // Procesar campos especiales
    const updateData: any = { ...updateTaskDto };

    if (updateData.allowedFileTypes) {
      updateData.allowedFileTypes = JSON.stringify(updateData.allowedFileTypes);
      console.log('🔧 [SERVICE UPDATE] Processed allowedFileTypes');
    }

    if (updateData.maxFileSizeMB) {
      updateData.maxFileSize = updateData.maxFileSizeMB * 1024 * 1024;
      delete updateData.maxFileSizeMB;
      console.log('🔧 [SERVICE UPDATE] Processed maxFileSize:', updateData.maxFileSize);
    }

    // Remover campos que no son parte de la entidad Task
    // targetStudentIds se usa para crear/actualizar submissions, no es un campo de Task
    const targetStudentIds = updateData.targetStudentIds;
    if (updateData.targetStudentIds) {
      console.log('🔧 [SERVICE UPDATE] targetStudentIds detected, will update submissions after task update');
      delete updateData.targetStudentIds;
    }

    // Extraer y eliminar additionalSubjectAssignmentIds del updateData
    const additionalSubjectAssignmentIds = updateData.additionalSubjectAssignmentIds;
    if (updateData.additionalSubjectAssignmentIds) {
      console.log('🔧 [SERVICE UPDATE] additionalSubjectAssignmentIds detected:', additionalSubjectAssignmentIds);
      delete updateData.additionalSubjectAssignmentIds;
    }

    delete updateData.criterionIds; // SP-D3a: la relación se sincroniza aparte (syncTaskCriteria)

    console.log('🔧 [SERVICE UPDATE] Final update data:', JSON.stringify(updateData, null, 2));
    console.log('🔧 [SERVICE UPDATE] Executing update...');

    try {
      await this.tasksRepository.update(id, updateData);
      console.log('✅ [SERVICE UPDATE] Database update successful');

      console.log('🟢 [SERVICE UPDATE] Checking targetStudentIds:', {
        hasTargetStudentIds: !!targetStudentIds,
        targetStudentIds: targetStudentIds,
        taskSubjectAssignmentId: task.subjectAssignmentId,
        taskIsTestYourself: task.isTestYourself,
        taskType: task.taskType
      });

      // Si se proporcionaron targetStudentIds, actualizar los submissions
      if (targetStudentIds) {
        console.log('🔄 [SERVICE UPDATE] Updating task submissions for selected students');
        console.log('🔄 [SERVICE UPDATE] Calling updateSubmissionsForTask with:', {
          taskId: id,
          subjectAssignmentId: task.subjectAssignmentId,
          targetStudentIds: targetStudentIds,
          isExamTask: task.isTestYourself || task.taskType === TaskType.EXAM
        });

        await this.updateSubmissionsForTask(
          id,
          task.subjectAssignmentId,
          targetStudentIds,
          task.isTestYourself || task.taskType === TaskType.EXAM
        );

        console.log('✅ [SERVICE UPDATE] updateSubmissionsForTask completed successfully');
      } else {
        console.log('⚠️ [SERVICE UPDATE] targetStudentIds is falsy, skipping submissions update');
      }

      // Manejar adicionalSubjectAssignmentIds si se proporcionaron
      if (additionalSubjectAssignmentIds !== undefined) {
        console.log('🔧 [SERVICE UPDATE] Updating additional subject assignments...');

        // Eliminar asignaciones adicionales existentes
        await this.taskSubjectAssignmentsRepository.delete({ taskId: id });
        console.log('🔧 [SERVICE UPDATE] Deleted existing additional subject assignments');

        // Crear nuevas asignaciones adicionales si hay IDs
        if (additionalSubjectAssignmentIds && additionalSubjectAssignmentIds.length > 0) {
          for (const subjectAssignmentId of additionalSubjectAssignmentIds) {
            const taskSubjectAssignment = this.taskSubjectAssignmentsRepository.create({
              taskId: id,
              subjectAssignmentId,
            });
            await this.taskSubjectAssignmentsRepository.save(taskSubjectAssignment);
            console.log('🔧 [SERVICE UPDATE] Created additional subject assignment:', subjectAssignmentId);
          }
          console.log('✅ [SERVICE UPDATE] Additional subject assignments updated:', additionalSubjectAssignmentIds.length);
        } else {
          console.log('🔧 [SERVICE UPDATE] No additional subject assignments to create');
        }
      }

      await this.syncTaskCriteria(id, updateTaskDto.criterionIds);

      const updatedTask = await this.findOne(id);
      console.log('✅ [SERVICE UPDATE] Updated task retrieved:', updatedTask.id);
      return updatedTask;
    } catch (error) {
      console.error('❌ [SERVICE UPDATE] Database update failed:', error.message);
      console.error('❌ [SERVICE UPDATE] Error stack:', error.stack);
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    // Buscar tarea sin filtro de isActive para poder eliminar tareas ya inactivas
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: [
        'subjectAssignment',
        'teacher',
        'submissions',
        'submissions.attachments',
        'attachments',
      ],
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    if (task.teacherId !== teacher.id) {
      throw new ForbiddenException('No tienes permisos para eliminar esta tarea');
    }

    console.log(`🗑️ REMOVE - Iniciando eliminación PERMANENTE de tarea: ${id} (${task.title})`);

    // Si es una tarea tipo EXAM (Test Yourself), eliminar datos relacionados
    if (task.taskType === TaskType.EXAM || task.isTestYourself) {
      console.log(`🗑️ REMOVE - Es Test Yourself, eliminando datos relacionados`);

      // Eliminar calificaciones
      await this.examGradesRepository.delete({ taskId: id });
      console.log(`✅ REMOVE - Exam grades deleted successfully`);

      // Eliminar asignaciones a secciones personalizadas
      await this.dataSource.query(`
        DELETE FROM test_yourself_section_assignments
        WHERE task_id = $1
      `, [id]);
      console.log(`✅ REMOVE - Section assignments deleted successfully`);
    }

    // HARD DELETE: Eliminar todos los datos relacionados permanentemente

    // 1. Eliminar attachments de submissions
    await this.dataSource.query(`
      DELETE FROM task_submission_attachments
      WHERE "submissionId" IN (
        SELECT id FROM task_submissions WHERE "taskId" = $1
      )
    `, [id]);
    console.log(`✅ REMOVE - Submission attachments deleted`);

    // 2. Eliminar submissions
    await this.submissionsRepository.delete({ taskId: id });
    console.log(`✅ REMOVE - Task submissions deleted`);

    // 3. Eliminar attachments de la tarea
    await this.attachmentsRepository.delete({ taskId: id });
    console.log(`✅ REMOVE - Task attachments deleted`);

    // 4. Eliminar la tarea completamente (HARD DELETE)
    await this.tasksRepository.delete(id);
    console.log(`✅ REMOVE - Tarea eliminada PERMANENTEMENTE: ${id}`);
  }

  // ==================== HELPER METHODS ====================

  async getStudentByUserId(userId: string): Promise<Student | null> {
    console.log(`[DEBUG] getStudentByUserId called with userId: ${userId}`);
    
    // SECURITY FIX: Reject undefined/null userIds immediately
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.log(`[ERROR] Invalid userId provided: ${userId}`);
      return null;
    }
    
    const result = await this.studentsRepository.findOne({
      where: { user: { id: userId } },
    });
    console.log(`[DEBUG] getStudentByUserId result:`, result ? `found student ${result.id}` : 'no student found');
    return result;
  }

  async getTeacherByUserId(userId: string): Promise<Teacher | null> {
    console.log(`[DEBUG] getTeacherByUserId called with userId: ${userId}`);
    
    // SECURITY FIX: Reject undefined/null userIds immediately
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.log(`[ERROR] Invalid userId provided: ${userId}`);
      return null;
    }
    
    const result = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    console.log(`[DEBUG] getTeacherByUserId result:`, result ? `found teacher ${result.id}` : 'no teacher found');
    return result;
  }

  // ==================== ENTREGAS (ESTUDIANTES) ====================

  async submitTask(taskId: string, submitDto: SubmitTaskDto, userId: string): Promise<TaskSubmission> {
    console.log(`[DEBUG] submitTask called - taskId: ${taskId}, userId: ${userId}`);
    
    // Obtener el studentId a partir del userId
    const student = await this.getStudentByUserId(userId);
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado para este usuario');
    }
    
    const studentId = student.id;
    console.log(`[DEBUG] Student found - studentId: ${studentId}, enrollmentNumber: ${student.enrollmentNumber}`);
    
    const task = await this.findOne(taskId);
    
    // Verificar que la tarea está publicada
    if (task.status !== TaskStatus.PUBLISHED) {
      throw new BadRequestException('No se puede entregar una tarea que no está publicada');
    }

    // Verificar que no es una tarea tipo EXAM (Test Yourself)
    if (task.taskType === TaskType.EXAM) {
      throw new BadRequestException('Las tareas de tipo "Test Yourself" no requieren entrega digital. Son recordatorios de examen.');
    }

    // Verificar que el estudiante está asignado a esta tarea
    console.log(`[DEBUG] Looking for submission with taskId: ${taskId}, studentId: ${studentId}`);
    const submission = await this.submissionsRepository.findOne({
      where: { taskId, studentId },
      relations: ['attachments'],
    });

    console.log(`[DEBUG] Submission found: ${submission ? 'YES' : 'NO'}, status: ${submission?.status}, needsRevision: ${submission?.needsRevision}`);
    if (submission) {
      console.log(`[DEBUG] Submission details - id: ${submission.id}, submittedAt: ${submission.submittedAt}`);
    }

    if (!submission) {
      throw new NotFoundException('No tienes esta tarea asignada');
    }

    // Verificar si ya fue entregada y no permite reenvíos
    if (submission.status === SubmissionStatus.SUBMITTED && !submission.needsRevision) {
      console.log(`[DEBUG] Task already submitted by student ${studentId} - blocking resubmission`);
      throw new BadRequestException('Esta tarea ya fue entregada');
    }

    // Verificar si requiere archivo y no hay adjuntos
    if (task.requiresFile && (!submission.attachments || submission.attachments.length === 0)) {
      throw new BadRequestException('Esta tarea requiere un archivo adjunto');
    }

    const now = new Date();
    const isLate = now > task.dueDate;

    // Verificar entregas tardías
    if (isLate && !task.allowLateSubmission) {
      throw new BadRequestException('Ya no se aceptan entregas para esta tarea');
    }

    // Actualizar la entrega
    const updateData: Partial<TaskSubmission> = {
      content: submitDto.content,
      submissionNotes: submitDto.submissionNotes,
      submittedAt: now,
      isLate,
      status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
      needsRevision: false,
    };

    // Si es la primera entrega
    if (!submission.firstSubmittedAt) {
      updateData.firstSubmittedAt = now;
      updateData.attemptNumber = 1;
    } else {
      updateData.attemptNumber = submission.attemptNumber + 1;
    }

    await this.submissionsRepository.update(submission.id, updateData);

    return this.submissionsRepository.findOne({
      where: { id: submission.id },
      relations: ['task', 'student', 'student.user', 'student.user.profile', 'attachments'],
    });
  }

  private async resolveStudentIdFromUserId(userId: string): Promise<string> {
    console.log('🔍 resolveStudentIdFromUserId - Input userId:', userId);
    
    try {
      const student = await this.studentsRepository.findOne({
        where: { user: { id: userId } },
      });
      
      console.log('🔍 resolveStudentIdFromUserId - Found student:', student);
      
      if (!student) {
        console.log('❌ resolveStudentIdFromUserId - No student found for userId:', userId);
        throw new NotFoundException('Estudiante no encontrado');
      }
      
      console.log('✅ resolveStudentIdFromUserId - Returning studentId:', student.id);
      return student.id;
    } catch (error) {
      console.log('❌ resolveStudentIdFromUserId - Error:', error);
      throw error;
    }
  }

  async getStudentTasks(userId: string, query: StudentTaskQueryDto): Promise<{ tasks: Task[]; total: number }> {
    console.log('🔍 getStudentTasks - Starting with userId:', userId, 'query:', query);
    
    try {
      // Resolver userId a studentId
      const studentId = await this.resolveStudentIdFromUserId(userId);
      console.log('🔍 getStudentTasks - Got studentId:', studentId);
      
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '10');
      const offset = (page - 1) * limit;
      
      console.log('🔍 getStudentTasks - Pagination:', { page, limit, offset });

      // Primero obtener los class groups del estudiante
      const classGroupsQuery = await this.dataSource.query(`
        SELECT cs."classId" as id
        FROM class_students cs
        WHERE cs."studentId" = $1
      `, [studentId]);
      
      console.log('🔍 getStudentTasks - Student class groups:', classGroupsQuery);
      
      if (!classGroupsQuery || classGroupsQuery.length === 0) {
        console.log('❌ getStudentTasks - Student has no class groups');
        return { tasks: [], total: 0 };
      }
      
      const classGroupIds = classGroupsQuery.map(cg => cg.id);
      console.log('🔍 getStudentTasks - Student belongs to class groups:', classGroupIds);

      // CRÍTICO: Usamos INNER JOIN para submissions para asegurar que el estudiante
      // SOLO vea tareas para las cuales tiene un registro de submission.
      // Cuando el profesor asigna una tarea a estudiantes específicos (targetStudentIds),
      // solo esos estudiantes tienen un registro de TaskSubmission creado.
      // Sin esta verificación, todos los estudiantes del grupo veían todas las tareas.
      // FIX: Bug reportado - "Recuperación Tema 1" aparecía a estudiantes no asignados como Aritz
      const queryBuilder = this.tasksRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .leftJoinAndSelect('subjectAssignment.classGroup', 'classGroup')
      .leftJoinAndSelect('task.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      // INNER JOIN: Solo tareas donde existe una submission para este estudiante
      .innerJoinAndSelect('task.submissions', 'submissions', 'submissions.studentId = :studentId AND submissions.isActive = true')
      .leftJoinAndSelect('submissions.attachments', 'submissionAttachments')
      .leftJoinAndSelect('task.attachments', 'taskAttachments')
      .where('task.status = :publishedStatus', { publishedStatus: TaskStatus.PUBLISHED })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('subjectAssignment.classGroupId IN (:...classGroupIds)', { classGroupIds })
      // EXCLUIR Test Yourself: Solo aparecen como eventos de calendario, no en listados de tareas
      .andWhere('task.isTestYourself = :notTestYourself', { notTestYourself: false })
      .setParameter('studentId', studentId);

      // Aplicar filtros
      if (query.submissionStatus) {
        queryBuilder.andWhere('submissions.status = :submissionStatus', { submissionStatus: query.submissionStatus });
      }

      // Apply filters only when explicitly requested
      // Con INNER JOIN ya no necesitamos verificar IS NULL, siempre existe submission
      if (query.onlyPending) {
        queryBuilder.andWhere('submissions.status IN (:...pendingStatuses)', {
          pendingStatuses: [SubmissionStatus.NOT_SUBMITTED, SubmissionStatus.RETURNED],
        });
      }

      if (query.onlyGraded) {
        queryBuilder.andWhere('submissions.isGraded = :isGraded', { isGraded: true });
      }

      if (query.subjectId) {
        queryBuilder.andWhere('subjectAssignment.subjectId = :subjectId', { subjectId: query.subjectId });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('task.assignedDate BETWEEN :startDate AND :endDate', {
          startDate: new Date(query.startDate),
          endDate: new Date(query.endDate),
        });
      }

      const ayId = query.academicYearId || (await this.currentAcademicYearService.getCurrentId());
      if (ayId) {
        queryBuilder.andWhere('task.academicYearId = :ayId', { ayId });
      }

      queryBuilder.orderBy('task.dueDate', 'ASC');

      console.log('🔍 getStudentTasks - Executing query...');
      const [tasks, total] = await queryBuilder
        .take(limit)
        .skip(offset)
        .getManyAndCount();

      console.log('🔍 getStudentTasks - Query result:', { tasksCount: tasks.length, total });
      return { tasks, total };
      
    } catch (error) {
      console.log('❌ getStudentTasks - Error occurred:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas pendientes para el widget del dashboard de estudiantes
   * Incluye: tareas sin submission (nunca iniciadas) + tareas con submission no completada
   */
  async getStudentPendingTasksWidget(userId: string): Promise<Task[]> {
    try {
      console.log('🔍🔍🔍 PENDING WIDGET CALLED - userId:', userId);
      
      // Resolver userId a studentId
      const studentId = await this.resolveStudentIdFromUserId(userId);
      console.log('🔍🔍🔍 PENDING WIDGET - Got studentId:', studentId);
      
      if (!studentId) {
        console.log('❌ PENDING WIDGET - No studentId found for userId:', userId);
        return [];
      }
      
      // Obtener class groups del estudiante usando query directo 
      const classGroupsQuery = await this.dataSource.query(`
        SELECT cs."classId" as id
        FROM class_students cs
        WHERE cs."studentId" = $1
      `, [studentId]);
      
      console.log('🔍 PENDING WIDGET - Raw class groups query result:', classGroupsQuery);
      
      if (!classGroupsQuery || classGroupsQuery.length === 0) {
        console.log('❌ PENDING WIDGET - Student has no class groups');
        return [];
      }
      
      const classGroupIds = classGroupsQuery.map(cg => cg.id);
      console.log('🔍 PENDING WIDGET - Student class groups:', classGroupIds);

      // CRÍTICO: Usamos INNER JOIN para asegurar que el estudiante SOLO vea tareas
      // para las cuales tiene un registro de submission.
      // FIX: Bug reportado - tareas asignadas a estudiantes específicos aparecían a todos
      const queryBuilder = this.tasksRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
        .leftJoinAndSelect('subjectAssignment.subject', 'subject')
        // INNER JOIN: Solo tareas donde existe una submission para este estudiante
        .innerJoinAndSelect('task.submissions', 'submissions', 'submissions.studentId = :studentId AND submissions.isActive = true')
        .where('task.status = :status', { status: TaskStatus.PUBLISHED })
        .andWhere('task.isActive = :isActive', { isActive: true })
        .andWhere('subjectAssignment.classGroupId IN (:...classGroupIds)', { classGroupIds })
        // EXCLUIR Test Yourself: Solo aparecen como eventos de calendario, no en dashboard de tareas pendientes
        .andWhere('task.isTestYourself = :notTestYourself', { notTestYourself: false })
        .setParameter('studentId', studentId);

      // Tareas pendientes: con submission no completada (ya no necesitamos IS NULL porque usamos INNER JOIN)
      queryBuilder.andWhere(
        'submissions.status IN (:...pendingStatuses)',
        { pendingStatuses: [SubmissionStatus.NOT_SUBMITTED, SubmissionStatus.RETURNED] }
      );

      // FILTRO CRÍTICO: Excluir Test Yourself (EXAM) que ya pasaron su fecha límite
      // Los Test Yourself son recordatorios de examen, no tareas de entrega
      // Una vez pasada la fecha del examen, se consideran completados automáticamente
      const now = new Date();
      queryBuilder.andWhere(
        '(task.taskType != :examType OR task.dueDate >= :currentDate)',
        { 
          examType: TaskType.EXAM,
          currentDate: now
        }
      );

      // Ordenar por fecha de entrega (más urgentes primero)
      queryBuilder.orderBy('task.dueDate', 'ASC');
      queryBuilder.limit(10);

      console.log('🔍 PENDING WIDGET - SQL Query:', queryBuilder.getSql());
      console.log('🔍 PENDING WIDGET - Query parameters:', queryBuilder.getParameters());

      const tasks = await queryBuilder.getMany();
      console.log('🔍 getStudentPendingTasksWidget - Found tasks:', tasks.length);
      
      if (tasks.length > 0) {
        console.log('✅ PENDING WIDGET - Tasks:', tasks.map(t => ({ 
          id: t.id, 
          title: t.title, 
          dueDate: t.dueDate,
          hasSubmission: t.submissions && t.submissions.length > 0,
          submissionStatus: t.submissions?.[0]?.status || 'NO_SUBMISSION'
        })));
      } else {
        console.log('❌ PENDING WIDGET - No tasks found');
      }
      
      return tasks;
      
    } catch (error) {
      console.error('❌ PENDING WIDGET ERROR:', error);
      return [];
    }
  }

  // ==================== CALIFICACIÓN (PROFESORES) ====================

  async getSubmission(submissionId: string, userId: string): Promise<TaskSubmission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: [
        'task',
        'task.subjectAssignment',
        'task.subjectAssignment.subject',
        'task.subjectAssignment.classGroup',
        'task.rubricEntity',
        'task.rubricEntity.criteria',
        'task.rubricEntity.levels',
        'task.rubricEntity.cells',
        'student',
        'student.user',
        'student.user.profile',
        'attachments',
      ],
    });

    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Verificar permisos según el rol del usuario
    let hasAccess = false;

    // Verificar si es profesor propietario de la tarea
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (teacher && submission.task.teacherId === teacher.id) {
      hasAccess = true;
    }

    // Verificar si es el estudiante propietario de la entrega
    const student = await this.studentsRepository.findOne({
      where: { user: { id: userId } },
    });

    if (student && submission.studentId === student.id) {
      hasAccess = true;
    }

    // Verificar si es familia con acceso al estudiante
    if (!hasAccess) {
      // Buscar familia donde el usuario es primaryContact o secondaryContact
      const families = await this.familiesRepository.find({
        where: [
          { primaryContact: { id: userId } },
          { secondaryContact: { id: userId } },
        ],
      });

      if (families.length > 0) {
        for (const family of families) {
          const familyStudents = await this.familyStudentsRepository.find({
            where: { familyId: family.id },
          });

          const studentIds = familyStudents.map(fs => fs.studentId);
          if (studentIds.includes(submission.studentId)) {
            hasAccess = true;
            break;
          }
        }
      }
    }

    if (!hasAccess) {
      throw new ForbiddenException('No tienes permisos para ver esta entrega');
    }

    return submission;
  }

  async gradeSubmission(submissionId: string, gradeDto: GradeTaskDto, userId: string): Promise<TaskSubmission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['task', 'student', 'student.user', 'student.user.profile'],
    });

    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Verificar que el profesor es propietario de la tarea
    if (submission.task.teacherId !== teacher.id) {
      throw new ForbiddenException('No tienes permisos para calificar esta entrega');
    }

    // Verificar que la entrega fue realizada
    if (submission.status === SubmissionStatus.NOT_SUBMITTED) {
      throw new BadRequestException('No se puede calificar una entrega no realizada');
    }

    // Calcular nota final aplicando penalizaciones
    let finalGrade = gradeDto.grade;
    if (submission.isLate && submission.task.latePenalty > 0) {
      finalGrade = gradeDto.grade * (1 - submission.task.latePenalty);
    }

    const updateData: Partial<TaskSubmission> = {
      grade: gradeDto.grade,
      finalGrade,
      teacherFeedback: gradeDto.teacherFeedback,
      privateNotes: gradeDto.privateNotes,
      needsRevision: gradeDto.needsRevision || false,
      isGraded: true,
      gradedAt: new Date(),
      status: gradeDto.needsRevision ? SubmissionStatus.RETURNED : SubmissionStatus.GRADED,
    };

    await this.submissionsRepository.update(submissionId, updateData);

    const result = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['task', 'student', 'student.user', 'student.user.profile', 'attachments'],
    });

    // SP-D2a: recálculo síncrono fail-soft de la nota ponderada centralizada.
    await this.recalcCentralizedGradeSafe(submission.studentId, submission.task.subjectAssignmentId);
    await this.deriveTaskCriteriaSafe(submission.task.id, submission.studentId);

    return result;
  }

  async gradeSubmissionWithRubric(
    submissionId: string, 
    gradeRubricDto: GradeWithRubricDto, 
    userId: string
  ): Promise<RubricGradeResponseDto> {
    console.log('[DEBUG SERVICE] =================================');
    console.log('[DEBUG SERVICE] gradeSubmissionWithRubric called');
    console.log('[DEBUG SERVICE] submissionId:', submissionId);
    console.log('[DEBUG SERVICE] userId:', userId);
    console.log('[DEBUG SERVICE] gradeRubricDto:', JSON.stringify(gradeRubricDto, null, 2));
    console.log('[DEBUG SERVICE] gradeRubricDto type:', typeof gradeRubricDto);
    console.log('[DEBUG SERVICE] gradeRubricDto.selectedCells:', gradeRubricDto.selectedCells);
    console.log('[DEBUG SERVICE] selectedCells type:', typeof gradeRubricDto.selectedCells);
    console.log('[DEBUG SERVICE] =================================');

    // 1. Obtener submission y validar acceso
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['task', 'task.rubricEntity', 'student', 'student.user', 'student.user.profile'],
    });

    if (!submission) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Verificar que el profesor es propietario de la tarea
    if (submission.task.teacherId !== teacher.id) {
      throw new ForbiddenException('No tienes permisos para calificar esta entrega');
    }

    // Verificar que la entrega fue realizada
    if (submission.status === SubmissionStatus.NOT_SUBMITTED) {
      throw new BadRequestException('No se puede calificar una entrega no realizada');
    }

    // 2. Obtener rúbrica asociada a la tarea
    if (!submission.task.rubricId) {
      throw new BadRequestException('Esta tarea no tiene una rúbrica asociada');
    }

    const rubric = await this.rubricsRepository.findOne({
      where: { id: submission.task.rubricId },
      relations: ['criteria', 'levels', 'cells'],
    });

    if (!rubric) {
      throw new NotFoundException('Rúbrica no encontrada');
    }

    // 3. Validar que se han seleccionado celdas para todos los criterios
    console.log('[DEBUG RUBRIC VALIDATION] Rubric loaded:', {
      id: rubric.id,
      name: rubric.name,
      maxScore: rubric.maxScore,
      maxScoreType: typeof rubric.maxScore,
      criteriaCount: rubric.criteria ? rubric.criteria.length : 'NO CRITERIA',
      levelsCount: rubric.levels ? rubric.levels.length : 'NO LEVELS',
      cellsCount: rubric.cells ? rubric.cells.length : 'NO CELLS'
    });
    
    if (!rubric.criteria || rubric.criteria.length === 0) {
      throw new BadRequestException('La rúbrica no tiene criterios definidos');
    }
    
    console.log('[DEBUG RUBRIC VALIDATION] Available criteria:', rubric.criteria.map(c => ({ id: c.id, name: c.name })));
    console.log('[DEBUG RUBRIC VALIDATION] Available levels:', rubric.levels.map(l => ({ id: l.id, name: l.name })));
    console.log('[DEBUG RUBRIC VALIDATION] Received selected cells:', gradeRubricDto.selectedCells);
    
    const criteriaIds = rubric.criteria.map(c => c.id);
    const selectedCriteriaIds = gradeRubricDto.selectedCells.map(sc => sc.criterionId);
    
    console.log('[DEBUG RUBRIC VALIDATION] Criteria IDs expected:', criteriaIds);
    console.log('[DEBUG RUBRIC VALIDATION] Criteria IDs received:', selectedCriteriaIds);
    
    const missingCriteria = criteriaIds.filter(id => !selectedCriteriaIds.includes(id));
    console.log('[DEBUG RUBRIC VALIDATION] Missing criteria:', missingCriteria);
    
    if (missingCriteria.length > 0) {
      throw new BadRequestException('Debe evaluar todos los criterios de la rúbrica');
    }

    // 4. Calcular nota final basada en celdas seleccionadas
    const finalGrade = await this.calculateRubricGrade(rubric, gradeRubricDto.selectedCells);

    // 5. Crear o actualizar assessment de rúbrica
    const maxScore = rubric.maxScore || 100; // Use rubric's configured maxScore, not weighted calculation
    const maxPossibleWeightedScore = await this.calculateMaxRubricScore(rubric); // For assessment record
    const basePercentage = (finalGrade / maxScore) * 100;
    
    console.log('[DEBUG SCORE CALC] Score calculation values:', {
      rubricMaxScore: rubric.maxScore,
      maxScore: maxScore,
      finalGrade: finalGrade,
      basePercentage: basePercentage,
      maxPossibleWeightedScore: maxPossibleWeightedScore
    });
    
    // Check if an assessment already exists
    console.log('[DEBUG] Checking for existing assessment with:');
    console.log('[DEBUG] - taskSubmissionId:', submissionId);
    console.log('[DEBUG] - rubricId:', rubric.id);
    console.log('[DEBUG] - studentId:', submission.student.id);
    console.log('[DEBUG] - Student object:', submission.student ? 'exists' : 'null');
    
    let existingAssessment = await this.taskRubricAssessmentsRepository.findOne({
      where: {
        taskSubmissionId: submissionId,
        rubricId: rubric.id,
        studentId: submission.student.id,
      },
    });
    
    console.log('[DEBUG] Existing assessment found:', existingAssessment ? existingAssessment.id : 'none');
    console.log('[DEBUG] Query used for finding assessment:', {
      taskSubmissionId: submissionId,
      rubricId: rubric.id,
      studentId: submission.student.id,
    });

    let savedAssessment;
    if (existingAssessment) {
      console.log('[DEBUG] Updating existing rubric assessment:', existingAssessment.id);
      // Update existing assessment
      await this.taskRubricAssessmentsRepository.update(existingAssessment.id, {
        teacherId: teacher.id,
        totalScore: finalGrade,
        maxPossibleScore: maxScore, // Now using rubric.maxScore (100) instead of weighted score (4)
        percentage: basePercentage,
        feedback: gradeRubricDto.teacherFeedback,
        isComplete: true,
        updatedAt: new Date(),
      });
      savedAssessment = await this.taskRubricAssessmentsRepository.findOne({
        where: { id: existingAssessment.id },
      });
      
      // Delete existing criteria assessments to recreate them
      await this.taskRubricAssessmentCriteriaRepository.delete({
        taskRubricAssessmentId: existingAssessment.id,
      });
    } else {
      console.log('[DEBUG] Creating new rubric assessment');
      // Create new assessment
      const rubricAssessment = this.taskRubricAssessmentsRepository.create({
        taskSubmissionId: submissionId,
        rubricId: rubric.id,
        studentId: submission.student.id,
        teacherId: teacher.id,
        totalScore: finalGrade,
        maxPossibleScore: maxScore, // Now using rubric.maxScore (100) instead of weighted score (4)
        percentage: basePercentage,
        feedback: gradeRubricDto.teacherFeedback,
        isComplete: true,
      });
      savedAssessment = await this.taskRubricAssessmentsRepository.save(rubricAssessment);
    }

    // 6. Crear criterios de assessment
    for (const selectedCell of gradeRubricDto.selectedCells) {
      const criterion = rubric.criteria.find(c => c.id === selectedCell.criterionId);
      const level = rubric.levels.find(l => l.id === selectedCell.levelId);
      
      if (criterion && level) {
        const assessmentCriterion = this.taskRubricAssessmentCriteriaRepository.create({
          taskRubricAssessmentId: savedAssessment.id,
          criterionId: selectedCell.criterionId,
          levelId: selectedCell.levelId,
          score: level.scoreValue,
          weightedScore: level.scoreValue * criterion.weight,
          comments: '',
        });
        
        await this.taskRubricAssessmentCriteriaRepository.save(assessmentCriterion);
      }
    }

    // 7. Actualizar submission con nota calculada
    let adjustedFinalGrade = finalGrade;
    if (submission.isLate && submission.task.latePenalty > 0) {
      adjustedFinalGrade = finalGrade * (1 - submission.task.latePenalty);
    }

    const updateData: Partial<TaskSubmission> = {
      grade: finalGrade,
      finalGrade: adjustedFinalGrade,
      teacherFeedback: gradeRubricDto.teacherFeedback,
      privateNotes: gradeRubricDto.privateNotes,
      isGraded: true,
      gradedAt: new Date(),
      status: SubmissionStatus.GRADED,
    };

    await this.submissionsRepository.update(submissionId, updateData);

    // 8. ✅ CRITICAL FIX: Actualizar tabla exam_grades para que el trigger funcione
    const currentTime = new Date();
    
    // Verificar si ya existe una calificación en exam_grades
    const existingExamGrade = await this.dataSource.query(`
      SELECT id FROM exam_grades 
      WHERE task_id = $1 AND student_id = $2
    `, [submission.task.id, submission.student.id]);

    // Preparar datos para exam_grades (normalizar a escala 100)
    const normalizedGrade = Math.round(adjustedFinalGrade); // adjustedFinalGrade ya está en escala 100

    if (existingExamGrade.length > 0) {
      // UPDATE existing record
      await this.dataSource.query(`
        UPDATE exam_grades 
        SET 
          rubric_scores = $1,
          numeric_grade = $2,
          emoji_grade = NULL,
          letter_grade = $3,
          grade_scale = '100',
          comments = $4,
          attendance_status = $5,
          graded_at = $6,
          updated_at = $6
        WHERE task_id = $7 AND student_id = $8
      `, [
        JSON.stringify(gradeRubricDto.selectedCells || []),
        normalizedGrade,
        null, // letter_grade
        gradeRubricDto.teacherFeedback || null,
        'present', // attendance_status
        currentTime,
        submission.task.id,
        submission.student.id
      ]);
    } else {
      // INSERT new record  
      await this.dataSource.query(`
        INSERT INTO exam_grades (
          id, task_id, student_id, graded_by_teacher_id,
          rubric_scores, numeric_grade, emoji_grade, letter_grade, grade_scale,
          comments, attendance_status, graded_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, NULL, $6, '100', $7, $8, $9, $9, $9
        )
      `, [
        submission.task.id,
        submission.student.id,
        teacher.id,
        JSON.stringify(gradeRubricDto.selectedCells || []),
        normalizedGrade,
        null, // letter_grade
        gradeRubricDto.teacherFeedback || null,
        'present', // attendance_status
        currentTime
      ]);
    }

    // 9. Calcular porcentaje final (considerando penalizaciones si aplican)
    const finalPercentage = (adjustedFinalGrade / maxScore) * 100;

    // 10. Enviar notificación a familia si está configurado
    if (submission.task.notifyFamilies) {
      await this.notifyFamilyOfRubricGrade(submission, rubric, gradeRubricDto, adjustedFinalGrade, finalPercentage);
    }

    // SP-D2a: recálculo síncrono fail-soft de la nota ponderada centralizada.
    await this.recalcCentralizedGradeSafe(submission.studentId, submission.task.subjectAssignmentId);
    await this.deriveTaskCriteriaSafe(submission.task.id, submission.studentId);

    // 11. Devolver respuesta
    return {
      finalGrade: adjustedFinalGrade,
      percentage: Math.round(finalPercentage * 100) / 100,
      selectedCells: gradeRubricDto.selectedCells,
      teacherFeedback: gradeRubricDto.teacherFeedback,
      rubricAssessmentId: savedAssessment.id,
    };
  }

  private async calculateRubricGrade(rubric: Rubric, selectedCells: SelectedRubricCellDto[]): Promise<number> {
    console.log('[DEBUG RUBRIC CALC] Starting CORRECTED grade calculation');
    console.log('[DEBUG RUBRIC CALC] Rubric maxScore:', rubric.maxScore);
    console.log('[DEBUG RUBRIC CALC] Selected cells:', selectedCells.length);
    
    console.log('[DEBUG RUBRIC CALC] Available criteria:', rubric.criteria.map(c => `${c.name} (weight: ${c.weight})`));
    console.log('[DEBUG RUBRIC CALC] Available levels:', rubric.levels.map(l => `${l.name} (score: ${l.scoreValue})`));
    
    let totalPoints = 0;
    
    for (const selectedCell of selectedCells) {
      const criterion = rubric.criteria.find(c => c.id === selectedCell.criterionId);
      const level = rubric.levels.find(l => l.id === selectedCell.levelId);
      
      console.log('[DEBUG RUBRIC CALC] Processing cell:', {
        criterionId: selectedCell.criterionId,
        levelId: selectedCell.levelId,
        criterionFound: criterion ? criterion.name : 'NOT FOUND',
        levelFound: level ? level.name : 'NOT FOUND'
      });
      
      if (criterion && level) {
        // Convert values to numbers safely
        const levelScore = Number(level.scoreValue);
        const criterionWeight = Number(criterion.weight);
        
        if (isNaN(levelScore) || isNaN(criterionWeight)) {
          console.log('[DEBUG RUBRIC CALC] WARNING: Invalid numeric values:', {
            scoreValue: level.scoreValue,
            weight: criterion.weight,
            levelScore,
            criterionWeight
          });
          continue; // Skip this invalid cell
        }
        
        // CORRECT CALCULATION (FIXED): 
        // Si criterio peso es 25% (0.25) y nivel es "Excelente" (10), 
        // entonces puntos = 10 * 0.25 * 10 = 25 puntos (escala base 100)
        // El factor 10 es para escalar a base 100 (como especificó el usuario)
        const earnedPoints = levelScore * criterionWeight * 10;
        
        totalPoints += earnedPoints;
        
        console.log('[DEBUG RUBRIC CALC] CORRECTED calculation:', {
          criterion: criterion.name,
          level: level.name,
          levelScore: levelScore,
          criterionWeight: criterionWeight,
          formula: `${levelScore} * ${criterionWeight} * 10`,
          earnedPoints: earnedPoints,
          runningTotal: totalPoints
        });
      } else {
        console.log('[DEBUG RUBRIC CALC] SKIPPING cell - criterion or level not found');
      }
    }
    
    console.log('[DEBUG RUBRIC CALC] FINAL RESULT:', {
      totalPoints: totalPoints,
      explanation: 'This should be close to 100 if all criteria are "Excelente"'
    });
    
    // Return the total points directly (already scaled to 100-point system)
    const finalGrade = Math.round(totalPoints * 100) / 100;
    console.log('[DEBUG RUBRIC CALC] Final grade calculated:', finalGrade);
    return finalGrade;
  }

  private async calculateMaxRubricScore(rubric: any): Promise<number> {
    // Calculate maximum possible score by summing max level values weighted by criteria
    let maxScore = 0;
    
    // Get max level score safely
    const levelScores = rubric.levels.map(l => {
      const score = Number(l.scoreValue);
      return isNaN(score) ? 0 : score;
    }).filter(score => score > 0);
    
    const maxLevel = levelScores.length > 0 ? Math.max(...levelScores) : 1;
    
    for (const criterion of rubric.criteria) {
      const criterionWeight = Number(criterion.weight);
      if (!isNaN(criterionWeight)) {
        maxScore += maxLevel * criterionWeight;
      }
    }
    return maxScore;
  }

  /**
   * Envía notificación a la familia cuando se corrige una tarea con rúbrica
   */
  private async notifyFamilyOfRubricGrade(
    submission: TaskSubmission,
    rubric: Rubric,
    gradeData: GradeWithRubricDto,
    finalGrade: number,
    percentage: number,
  ): Promise<void> {
    try {
      // 1. Buscar familias del estudiante
      const familyStudents = await this.familyStudentsRepository.find({
        where: { studentId: submission.student.id },
        relations: ['family', 'family.primaryContact', 'family.primaryContact.profile'],
      });

      if (familyStudents.length === 0) {
        console.log(`No families found for student ${submission.student.id}`);
        return;
      }

      // 2. Obtener información del teacher
      const teacher = await this.teachersRepository.findOne({
        where: { id: submission.task.teacherId },
        relations: ['user', 'user.profile'],
      });

      if (!teacher) {
        console.log(`Teacher not found for task ${submission.task.id}`);
        return;
      }

      // 3. Construir datos de la rúbrica con celdas seleccionadas
      const rubricData = {
        name: rubric.name,
        description: rubric.description,
        maxScore: rubric.maxScore,
        finalGrade,
        percentage,
        criteria: rubric.criteria.map(criterion => {
          const selectedCell = gradeData.selectedCells.find(cell => cell.criterionId === criterion.id);
          const selectedLevel = selectedCell ? rubric.levels.find(level => level.id === selectedCell.levelId) : null;
          const cellDescription = selectedCell ? rubric.cells.find(cell => 
            cell.criterionId === criterion.id && cell.levelId === selectedCell.levelId
          )?.content : null;

          return {
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            selectedLevel: selectedLevel ? {
              name: selectedLevel.name,
              description: selectedLevel.description,
              scoreValue: selectedLevel.scoreValue,
              color: selectedLevel.color,
            } : null,
            cellDescription: cellDescription || '',
          };
        }),
      };

      // 4. Preparar datos del template
      const templateData = {
        studentName: `${submission.student.user.profile.firstName} ${submission.student.user.profile.lastName}`,
        taskTitle: submission.task.title,
        teacherName: `${teacher.user.profile.firstName} ${teacher.user.profile.lastName}`,
        finalGrade,
        maxGrade: rubric.maxScore,
        percentage: Math.round(percentage * 100) / 100,
        rubricName: rubric.name,
        rubricDescription: rubric.description,
        criteria: rubricData.criteria,
        teacherFeedback: gradeData.teacherFeedback || '',
        submissionDate: submission.submittedAt,
        gradedDate: new Date(),
        taskDescription: submission.task.description || '',
        platformUrl: 'https://plataforma.mundoworld.school',
      };

      // 5. Enviar email a cada familia
      for (const familyStudent of familyStudents) {
        const family = familyStudent.family;
        
        await this.emailService.sendEmail({
          to: family.primaryContact.email,
          subject: `📝 Tarea corregida con rúbrica - ${submission.task.title} - ${templateData.studentName}`,
          templateType: 'task_graded_rubric' as any, // Se creará este template si no existe
          templateData,
          priority: 'medium' as any,
          userId: family.primaryContact.id,
          triggeredBy: teacher.user.id,
          triggerEvent: 'task_graded_with_rubric',
          triggerResourceId: submission.id,
          triggerResourceType: 'task_submission',
        });

        // 6. Crear notificación en plataforma
        await this.notificationService.processEvent({
          type: 'grade_created',
          triggeredById: teacher.user.id,
          recipientIds: [family.primaryContact.id],
          data: {
            type: 'rubric_grade',
            taskTitle: submission.task.title,
            studentName: templateData.studentName,
            teacherName: templateData.teacherName,
            finalGrade,
            maxGrade: rubric.maxScore,
            percentage,
            submissionId: submission.id,
            taskId: submission.task.id,
            rubricName: rubric.name,
          },
          priority: 'medium' as any,
          immediate: false,
        });

        console.log(`✅ Rubric grade notification sent to family: ${family.primaryContact.email} for student: ${templateData.studentName}`);
      }

    } catch (error) {
      console.error('❌ Error sending rubric grade notification to families:', error);
      // No throw error to avoid breaking the grading process
    }
  }

  /**
   * Obtiene la evaluación de rúbrica de una submission de tarea
   */
  async getTaskRubricAssessment(submissionId: string): Promise<any> {
    try {
      console.log('[DEBUG] Starting getTaskRubricAssessment for submission:', submissionId);
      console.log('[DEBUG] Repository available:', !!this.taskRubricAssessmentsRepository);
      
      // Verify the submission exists first
      const submission = await this.submissionsRepository.findOne({
        where: { id: submissionId },
      });
      
      console.log('[DEBUG] Submission exists:', !!submission);
      
      if (!submission) {
        console.log('[DEBUG] Submission not found');
        throw new NotFoundException('Submission not found');
      }
      
      // Try to find assessment with criteria assessments relation
      console.log('[DEBUG] Searching for assessment...');
      const assessment = await this.taskRubricAssessmentsRepository.findOne({
        where: { taskSubmissionId: submissionId },
        relations: ['criterionAssessments'],
      });

      console.log('[DEBUG] Assessment found:', !!assessment);

      if (!assessment) {
        console.log('[DEBUG] No assessment found - returning null for new evaluation');
        return null; // Return null instead of throwing error - this is normal for new evaluations
      }

      console.log('[DEBUG] Assessment object keys:', Object.keys(assessment));
      console.log('[DEBUG] criterionAssessments:', assessment.criterionAssessments);
      console.log('[DEBUG] Assessment basic data:', { 
        id: assessment.id, 
        totalScore: assessment.totalScore,
        percentage: assessment.percentage,
        criterionAssessmentsCount: assessment.criterionAssessments?.length || 0
      });

      return {
        finalGrade: assessment.totalScore,
        percentage: assessment.percentage,
        selectedCells: assessment.criterionAssessments?.map(criterion => ({
          criterionId: criterion.criterionId,
          levelId: criterion.levelId,
        })) || [],
        teacherFeedback: assessment.feedback,
        rubricAssessmentId: assessment.id,
      };
    } catch (error) {
      console.error('[DEBUG] Error in getTaskRubricAssessment:', error);
      throw error;
    }
  }

  /**
   * Obtiene los detalles completos de evaluación de rúbrica para estudiante
   * Incluye la rúbrica completa, la evaluación y los criterios detallados
   */
  async getStudentRubricDetails(submissionId: string, userId: string): Promise<any> {
    try {
      console.log('🎯 [PABLO DEBUG] ===============================================');
      console.log('🎯 [PABLO DEBUG] Getting student rubric details for submission:', submissionId, 'user:', userId);
      console.log('🎯 [PABLO DEBUG] ===============================================');
      
      // 1. Verificar la submission y obtener datos básicos
      const submission = await this.submissionsRepository.findOne({
        where: { id: submissionId },
        relations: [
          'task',
          'student',
          'student.user',
        ],
      });

      if (!submission) {
        throw new NotFoundException('Submission not found');
      }

      // 2. Verificar permisos: el estudiante solo puede ver sus propias submissions
      if (submission.student.user.id !== userId) {
        // Verificar si es familia (puede ver submissions de sus hijos)
        const familyRelation = await this.familyStudentsRepository.findOne({
          where: {
            studentId: submission.student.id,
            family: {
              primaryContact: { id: userId }
            }
          },
          relations: ['family', 'family.primaryContact']
        });
        
        if (!familyRelation) {
          throw new ForbiddenException('No tienes permisos para ver esta evaluación');
        }
      }

      // 3. Verificar que la tarea tiene rúbrica
      if (!submission.task.rubricId) {
        return { 
          hasRubric: false,
          message: 'Esta tarea no tiene una rúbrica asociada' 
        };
      }

      // 4. Obtener la rúbrica completa con criterios y niveles
      const rubric = await this.rubricsRepository.findOne({
        where: { id: submission.task.rubricId },
        relations: ['criteria', 'levels', 'cells'],
      });

      if (!rubric) {
        throw new NotFoundException('Rúbrica no encontrada');
      }

      // 5. Obtener la evaluación si existe
      const assessment = await this.taskRubricAssessmentsRepository.findOne({
        where: { taskSubmissionId: submissionId },
        relations: ['criterionAssessments'],
      });

      if (!assessment) {
        return {
          hasRubric: true,
          rubric: {
            id: rubric.id,
            name: rubric.name,
            description: rubric.description,
            maxScore: rubric.maxScore,
            criteria: rubric.criteria,
            levels: rubric.levels,
          },
          isEvaluated: false,
          message: 'Esta tarea aún no ha sido evaluada'
        };
      }

      // 6. Construir respuesta completa con evaluación
      const evaluationDetails = rubric.criteria.map(criterion => {
        const criterionAssessment = assessment.criterionAssessments?.find(
          ca => ca.criterionId === criterion.id
        );
        
        let selectedLevel = null;
        let selectedCell = null;
        
        if (criterionAssessment) {
          selectedLevel = rubric.levels.find(level => level.id === criterionAssessment.levelId);
          
          // Buscar la celda específica que contiene el texto descriptivo
          console.log(`🔍 [PABLO DEBUG] Looking for cell with criterionId: ${criterion.id}, levelId: ${criterionAssessment.levelId}`);
          selectedCell = rubric.cells?.find(cell => 
            cell.criterionId === criterion.id && cell.levelId === criterionAssessment.levelId
          );
          console.log(`🔍 [PABLO DEBUG] Available cells:`, rubric.cells?.map(c => `criterionId: ${c.criterionId}, levelId: ${c.levelId}, content: ${c.content?.substring(0, 50)}...`));
          console.log(`🔍 [PABLO DEBUG] Selected cell:`, selectedCell);
          
          console.log(`[DEBUG] Criterion: ${criterion.name}`);
          console.log(`[DEBUG] Selected Level: ${selectedLevel?.name}`);
          console.log(`[DEBUG] Cell Content: ${selectedCell?.content}`);
          console.log(`[DEBUG] Cell exists: ${selectedCell ? 'YES' : 'NO'}`);
          console.log(`[DEBUG] Rubric cells total: ${rubric.cells?.length || 0}`);
        }

        return {
          criterion: {
            id: criterion.id,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
          },
          selectedLevel: selectedLevel ? {
            id: selectedLevel.id,
            name: selectedLevel.name,
            description: selectedLevel.description,
            scoreValue: selectedLevel.scoreValue,
            // Agregar el contenido específico de la celda
            cellContent: selectedCell?.content || null,
          } : null,
          score: criterionAssessment?.score || 0,
          weightedScore: criterionAssessment?.weightedScore || 0,
        };
      });

      return {
        hasRubric: true,
        isEvaluated: true,
        rubric: {
          id: rubric.id,
          name: rubric.name,
          description: rubric.description,
          maxScore: rubric.maxScore,
          criteria: rubric.criteria,
          levels: rubric.levels,
        },
        assessment: {
          id: assessment.id,
          totalScore: assessment.totalScore,
          maxPossibleScore: assessment.maxPossibleScore,
          percentage: assessment.percentage,
          teacherFeedback: assessment.feedback,
          isComplete: assessment.isComplete,
        },
        evaluationDetails,
        taskInfo: {
          id: submission.task.id,
          title: submission.task.title,
          maxPoints: submission.task.maxPoints,
        },
        submissionInfo: {
          id: submission.id,
          finalGrade: submission.finalGrade,
          isGraded: submission.isGraded,
          gradedAt: submission.gradedAt,
        }
      };

    } catch (error) {
      console.error('[DEBUG] Error in getStudentRubricDetails:', error);
      throw error;
    }
  }

  // ==================== ESTADÍSTICAS ====================

  async getTeacherStatistics(userId: string): Promise<TaskStatisticsDto> {
    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // IMPORTANTE: Excluir Test Yourself de las estadísticas
    // Test Yourself son evaluaciones presenciales sin sistema de entregas
    const tasks = await this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.submissions', 'submissions')
      .where('task.teacherId = :teacherId', { teacherId: teacher.id })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.isTestYourself = :isTestYourself', { isTestYourself: false })
      .getMany();

    const totalTasks = tasks.length;
    const publishedTasks = tasks.filter(t => t.status === TaskStatus.PUBLISHED).length;
    const draftTasks = tasks.filter(t => t.status === TaskStatus.DRAFT).length;
    const closedTasks = tasks.filter(t => t.status === TaskStatus.CLOSED).length;
    const overdueTasks = tasks.filter(t => t.isOverdue).length;

    const allSubmissions = tasks.flatMap(t => t.submissions);
    const totalSubmissions = allSubmissions.length;
    const gradedSubmissions = allSubmissions.filter(s => s.isGraded).length;
    const pendingSubmissions = allSubmissions.filter(s => s.status === SubmissionStatus.NOT_SUBMITTED).length;
    const lateSubmissions = allSubmissions.filter(s => s.isLate).length;

    const gradesSubmissions = allSubmissions.filter(s => s.finalGrade !== null && s.finalGrade !== undefined);
    const averageGrade = gradesSubmissions.length > 0 
      ? gradesSubmissions.reduce((sum, s) => sum + s.finalGrade, 0) / gradesSubmissions.length 
      : 0;

    const submissionRate = totalSubmissions > 0 
      ? Math.round((((totalSubmissions - pendingSubmissions) / totalSubmissions) * 100) * 10) / 10
      : 0;

    return {
      totalTasks,
      publishedTasks,
      draftTasks,
      closedTasks,
      overdueTasks,
      totalSubmissions,
      gradedSubmissions,
      pendingSubmissions,
      lateSubmissions,
      averageGrade: Math.round(averageGrade * 10) / 10,
      submissionRate,
    };
  }

  async getStudentStatistics(userId: string): Promise<StudentTaskStatisticsDto> {
    // Resolver userId a studentId
    const studentId = await this.resolveStudentIdFromUserId(userId);
    const submissions = await this.submissionsRepository.find({
      where: { studentId },
      relations: ['task'],
    });

    const totalAssigned = submissions.length;
    const submitted = submissions.filter(s => s.status !== SubmissionStatus.NOT_SUBMITTED).length;
    const pending = submissions.filter(s => s.status === SubmissionStatus.NOT_SUBMITTED).length;
    const graded = submissions.filter(s => s.isGraded).length;
    const lateSubmissions = submissions.filter(s => s.isLate).length;

    const gradesSubmissions = submissions.filter(s => s.finalGrade !== null && s.finalGrade !== undefined);
    const averageGrade = gradesSubmissions.length > 0 
      ? gradesSubmissions.reduce((sum, s) => sum + s.finalGrade, 0) / gradesSubmissions.length 
      : 0;

    const submissionRate = totalAssigned > 0 ? Math.round(((submitted / totalAssigned) * 100) * 10) / 10 : 0;

    // Próxima fecha de entrega
    const pendingTasks = submissions
      .filter(s => s.status === SubmissionStatus.NOT_SUBMITTED)
      .map(s => s.task)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const nextDueDate = pendingTasks.length > 0 ? pendingTasks[0].dueDate : null;

    return {
      totalAssigned,
      submitted,
      pending,
      graded,
      lateSubmissions,
      averageGrade: Math.round(averageGrade * 10) / 10,
      submissionRate,
      nextDueDate,
    };
  }

  /**
   * Obtiene una tarea específica para un estudiante con el estado de su entrega
   * Incluye información sobre si puede seguir subiendo archivos
   */
  async getStudentTask(userId: string, taskId: string): Promise<Task> {
    console.log('🔍 getStudentTask - Starting with userId:', userId, 'taskId:', taskId);
    
    try {
      // Resolver userId a studentId
      const studentId = await this.resolveStudentIdFromUserId(userId);
      console.log('🔍 getStudentTask - Got studentId:', studentId);
      
      // Obtener la tarea con todas sus relaciones
      const task = await this.tasksRepository.findOne({
        where: { id: taskId, isActive: true },
        relations: [
          'subjectAssignment',
          'subjectAssignment.subject',
          'subjectAssignment.classGroup',
          'teacher',
          'teacher.user',
          'teacher.user.profile',
          'submissions',
          'submissions.student',
          'submissions.attachments',
          'attachments',
        ],
      });

      if (!task) {
        throw new NotFoundException('Tarea no encontrada');
      }

      console.log('🔍 getStudentTask - Task found:', task.title);
      console.log('🔍 getStudentTask - Task status:', task.status);

      // Verificar que la tarea está publicada
      if (task.status !== TaskStatus.PUBLISHED) {
        throw new ForbiddenException('Esta tarea no está disponible');
      }

      // Verificar que el estudiante tiene acceso a esta tarea (a través de sus class groups)
      const classGroupsQuery = await this.dataSource.query(`
        SELECT cs."classId" as id
        FROM class_students cs
        WHERE cs."studentId" = $1
      `, [studentId]);
      
      const classGroupIds = classGroupsQuery.map(cg => cg.id);
      console.log('🔍 getStudentTask - Student belongs to class groups:', classGroupIds);
      
      if (!classGroupIds.includes(task.subjectAssignment.classGroupId)) {
        throw new ForbiddenException('No tienes acceso a esta tarea');
      }

      // Filtrar submissions para incluir solo la del estudiante actual
      task.submissions = task.submissions.filter(
        submission => submission.studentId === studentId
      );

      console.log('🔍 getStudentTask - Student submissions found:', task.submissions.length);
      
      // Agregar información adicional sobre el estado de entrega
      if (task.submissions.length > 0) {
        const submission = task.submissions[0];
        console.log('🔍 getStudentTask - Submission status:', submission.status);
        
        // Agregar una propiedad personalizada para indicar si puede seguir subiendo archivos
        (task as any).canUploadFiles = submission.status === SubmissionStatus.NOT_SUBMITTED || 
                                      submission.status === SubmissionStatus.RETURNED;
        (task as any).submissionStatus = submission.status;
        (task as any).submissionDate = submission.submittedAt;
        (task as any).isLate = submission.isLate;
        (task as any).grade = submission.finalGrade;
        (task as any).teacherFeedback = submission.teacherFeedback;
      } else {
        // No hay submission, por lo que puede subir archivos
        (task as any).canUploadFiles = true;
        (task as any).submissionStatus = SubmissionStatus.NOT_SUBMITTED;
        (task as any).submissionDate = null;
        (task as any).isLate = false;
        (task as any).grade = null;
        (task as any).teacherFeedback = null;
      }

      console.log('🔍 getStudentTask - Can upload files:', (task as any).canUploadFiles);
      
      return task;
      
    } catch (error) {
      console.log('❌ getStudentTask - Error occurred:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async verifyTeacherSubjectAssignmentAccess(teacherId: string, subjectAssignmentId: string): Promise<void> {
    const subjectAssignment = await this.subjectAssignmentsRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['teacher'],
    });

    if (!subjectAssignment) {
      throw new NotFoundException('Asignación de asignatura no encontrada');
    }

    if (subjectAssignment.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permisos para asignar tareas en esta asignatura');
    }
  }

  private async createSubmissionRecordsForTask(taskId: string, subjectAssignmentId: string, targetStudentIds?: string[]): Promise<void> {
    const subjectAssignment = await this.subjectAssignmentsRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['classGroup', 'classGroup.students', 'classGroup.students.user'],
    });

    if (!subjectAssignment) {
      throw new NotFoundException('Asignación de asignatura no encontrada');
    }

    // Filtrar solo estudiantes activos
    let students = subjectAssignment.classGroup.students.filter(student => student.user?.isActive === true);

    // Si se especificaron estudiantes objetivo, filtrar
    if (targetStudentIds && targetStudentIds.length > 0) {
      students = students.filter(student => targetStudentIds.includes(student.id));
    }

    const submissions = students.map(student => 
      this.submissionsRepository.create({
        taskId,
        studentId: student.id,
        status: SubmissionStatus.NOT_SUBMITTED,
      })
    );

    await this.submissionsRepository.save(submissions);
  }

  private async createNotificationsForExamTask(taskId: string, subjectAssignmentId: string, targetStudentIds?: string[]): Promise<void> {
    const subjectAssignment = await this.subjectAssignmentsRepository.findOne({
      where: { id: subjectAssignmentId },
      relations: ['classGroup', 'classGroup.students', 'classGroup.students.user', 'classGroup.students.user.profile'],
    });

    if (!subjectAssignment) {
      throw new NotFoundException('Asignación de asignatura no encontrada');
    }

    // Filtrar solo estudiantes activos
    let students = subjectAssignment.classGroup.students.filter(student => student.user?.isActive === true);

    // Si se especificaron estudiantes objetivo, filtrar
    if (targetStudentIds && targetStudentIds.length > 0) {
      students = students.filter(student => targetStudentIds.includes(student.id));
    }

    // Crear registros especiales para exámenes que no requieren entrega
    // pero sí permiten seguimiento para calendario futuro
    const examRecords = students.map(student => 
      this.submissionsRepository.create({
        taskId,
        studentId: student.id,
        status: SubmissionStatus.NOT_SUBMITTED,
        isExamNotification: true, // Campo especial para distinguir notificaciones de examen
        content: 'Recordatorio de examen - No requiere entrega digital',
      })
    );

    await this.submissionsRepository.save(examRecords);

    // TODO: Aquí se implementarían las notificaciones reales
    // - Notificaciones push a padres
    // - Recordatorios en calendario para estudiantes
    // - Integración con sistema de notificaciones existente
  }

  /**
   * Actualizar submissions cuando se edita una tarea y se cambian los estudiantes seleccionados
   */
  private async updateSubmissionsForTask(
    taskId: string,
    subjectAssignmentId: string,
    targetStudentIds: string[],
    isExamTask: boolean
  ): Promise<void> {
    console.log('🔵🔵🔵 ====== ENTRANDO A updateSubmissionsForTask ======');
    console.log('🔵 Task ID:', taskId);
    console.log('🔵 Subject Assignment ID:', subjectAssignmentId);
    console.log('🔵 Target Student IDs:', targetStudentIds);
    console.log('🔵 Is Exam Task:', isExamTask);

    try {
      // Obtener submissions actuales
      console.log('🔵 [STEP 1] Buscando submissions existentes...');
      const existingSubmissions = await this.submissionsRepository.find({
        where: { taskId },
        relations: ['student'],
      });
      console.log('🔵 Submissions existentes encontradas:', existingSubmissions.length);

      const existingStudentIds = existingSubmissions.map(sub => sub.studentId);
      console.log('🔵 IDs de estudiantes existentes:', existingStudentIds);

      // Identificar estudiantes a eliminar (están en existing pero no en target)
      const studentsToRemove = existingStudentIds.filter(id => !targetStudentIds.includes(id));
      console.log('🔵 Estudiantes a ELIMINAR:', studentsToRemove);

      // Identificar estudiantes a añadir (están en target pero no en existing)
      const studentsToAdd = targetStudentIds.filter(id => !existingStudentIds.includes(id));
      console.log('🔵 Estudiantes a AÑADIR:', studentsToAdd);

      console.log(`🔄 Updating submissions: ${studentsToRemove.length} to remove, ${studentsToAdd.length} to add`);

      // Eliminar submissions de estudiantes que ya no están seleccionados
      if (studentsToRemove.length > 0) {
        console.log('🔵 [STEP 2] Eliminando submissions...');
        await this.submissionsRepository.delete({
          taskId,
          studentId: In(studentsToRemove),
        });
        console.log(`✅ Removed ${studentsToRemove.length} submissions`);
      } else {
        console.log('🔵 [STEP 2] No hay submissions para eliminar');
      }

      // Añadir submissions para nuevos estudiantes seleccionados
      if (studentsToAdd.length > 0) {
        console.log('🔵 [STEP 3] Añadiendo nuevas submissions...');
        console.log('🔵 Buscando subject assignment:', subjectAssignmentId);

        const subjectAssignment = await this.subjectAssignmentsRepository.findOne({
          where: { id: subjectAssignmentId },
          relations: ['classGroup', 'classGroup.students', 'classGroup.students.user'],
        });

        if (!subjectAssignment) {
          console.error('❌ Subject assignment no encontrado');
          throw new NotFoundException('Asignación de asignatura no encontrada');
        }

        console.log('🔵 Subject assignment encontrado:', subjectAssignment.id);
        console.log('🔵 Total estudiantes en la clase:', subjectAssignment.classGroup.students.length);
        console.log('🔵 IDs que buscamos añadir:', studentsToAdd);
        console.log('🔵 Array length:', studentsToAdd.length);

        // FIX ALTERNATIVO: Usar createQueryBuilder para más control
        // Esto nos permite ver exactamente qué query se ejecuta
        console.log('🔵 Ejecutando query con QueryBuilder...');
        const students = await this.studentsRepository
          .createQueryBuilder('student')
          .leftJoinAndSelect('student.user', 'user')
          .whereInIds(studentsToAdd)
          .getMany();

        console.log('🔵 QueryBuilder completado, resultados:', students.length);
        console.log('🔵 IDs encontrados:', students.map(s => s.id));

        console.log('🔵 Estudiantes encontrados para añadir:', students.length);
        console.log('🔵 IDs de estudiantes que se crearán:', students.map(s => s.id));

        const newSubmissions = students.map(student =>
          this.submissionsRepository.create({
            taskId,
            studentId: student.id,
            status: SubmissionStatus.NOT_SUBMITTED,
            isExamNotification: isExamTask,
            content: isExamTask ? 'Recordatorio de examen - No requiere entrega digital' : undefined,
          })
        );

        console.log('🔵 Submissions creadas en memoria:', newSubmissions.length);
        console.log('🔵 Guardando en base de datos...');

        await this.submissionsRepository.save(newSubmissions);
        console.log(`✅ Added ${newSubmissions.length} new submissions`);
      } else {
        console.log('🔵 [STEP 3] No hay estudiantes nuevos para añadir');
      }

      console.log('🔵🔵🔵 ====== FINALIZANDO updateSubmissionsForTask EXITOSAMENTE ======');
    } catch (error) {
      console.error('❌❌❌ ERROR EN updateSubmissionsForTask:', error.message);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  // ==================== MÉTODOS PARA FAMILIAS ====================

  async getFamilyTasks(userId: string, query: FamilyTaskQueryDto): Promise<{ tasks: Task[]; total: number }> {
    // Verificar acceso familiar
    const studentIds = await this.getFamilyStudentIds(userId);
    
    if (studentIds.length === 0) {
      throw new NotFoundException('No se encontraron estudiantes asociados a esta familia');
    }

    // Si se especifica un estudiante, verificar que pertenece a la familia
    let targetStudentIds = studentIds;
    if (query.studentId) {
      if (!studentIds.includes(query.studentId)) {
        throw new ForbiddenException('No tienes acceso a los datos de este estudiante');
      }
      targetStudentIds = [query.studentId];
    }

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const offset = (page - 1) * limit;

    // Query completa con todas las relaciones necesarias
    // CRÍTICO: Solo mostrar tareas donde:
    // 1. El profesor marcó "notificar a familias" (notifyFamilies = true)
    // 2. Existe una submission para el estudiante O es un Test Yourself asignado al grupo
    // FIX: Bug reportado - tareas sin notifyFamilies aparecían a familias
    const queryBuilder = this.tasksRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'teacherUser')
      .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
      .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .leftJoinAndSelect('subjectAssignment.classGroup', 'classGroup')
      // LEFT JOIN para submissions - puede no haber para Test Yourself
      .leftJoinAndSelect('task.submissions', 'submissions', 'submissions.studentId IN (:...targetStudentIds) AND submissions.isActive = true')
      .leftJoinAndSelect('submissions.student', 'submissionStudent')
      .leftJoinAndSelect('submissionStudent.user', 'submissionStudentUser')
      .leftJoinAndSelect('submissionStudentUser.profile', 'submissionStudentProfile')
      .leftJoinAndSelect('submissions.attachments', 'submissionAttachments')
      .leftJoinAndSelect('task.attachments', 'attachments')
      .where('task.status = :publishedStatus', { publishedStatus: TaskStatus.PUBLISHED })
      .andWhere('task.isActive = :isActive', { isActive: true })
      // CRÍTICO: Solo mostrar tareas donde el profesor marcó notificar a familias
      .andWhere('task.notifyFamilies = :notifyFamilies', { notifyFamilies: true })
      // IMPORTANTE: Excluir Test Yourself de la vista de familias
      .andWhere('(task.is_test_yourself = false OR task.is_test_yourself IS NULL)')
      .setParameter('targetStudentIds', targetStudentIds)
      // Filtrar: tareas asignadas al grupo del estudiante
      .andWhere('subjectAssignment.classGroupId IN (SELECT cs."classId" FROM class_students cs WHERE cs."studentId" IN (:...targetStudentIds2))')
      .setParameter('targetStudentIds2', targetStudentIds)
      .orderBy('task.dueDate', 'ASC');

    const ayId = query.academicYearId || (await this.currentAcademicYearService.getCurrentId());
    if (ayId) {
      queryBuilder.andWhere('task.academicYearId = :ayId', { ayId });
    }

    const [tasks, total] = await queryBuilder
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { tasks, total };
  }

  async getFamilyPendingTasksBadge(userId: string): Promise<{
    overdueCount: number;
    returnedCount: number;
    totalCount: number;
  }> {
    const studentIds = await this.getFamilyStudentIds(userId);

    if (studentIds.length === 0) {
      return { overdueCount: 0, returnedCount: 0, totalCount: 0 };
    }

    const now = new Date();

    // Tareas vencidas: NOT_SUBMITTED cuya fecha de entrega ya pasó
    const overdueCount = await this.submissionsRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.task', 'task')
      .where('submission.studentId IN (:...studentIds)', { studentIds })
      .andWhere('submission.status = :status', { status: SubmissionStatus.NOT_SUBMITTED })
      .andWhere('task.dueDate < :now', { now })
      .andWhere('task.notifyFamilies = :notifyFamilies', { notifyFamilies: true })
      .andWhere('(task.is_test_yourself = false OR task.is_test_yourself IS NULL)')
      .andWhere('task.status = :publishedStatus', { publishedStatus: TaskStatus.PUBLISHED })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('submission.isActive = :submissionActive', { submissionActive: true })
      .getCount();

    // Tareas devueltas para revisión
    const returnedCount = await this.submissionsRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.task', 'task')
      .where('submission.studentId IN (:...studentIds)', { studentIds })
      .andWhere('submission.status = :status', { status: SubmissionStatus.RETURNED })
      .andWhere('task.notifyFamilies = :notifyFamilies', { notifyFamilies: true })
      .andWhere('(task.is_test_yourself = false OR task.is_test_yourself IS NULL)')
      .andWhere('task.status = :publishedStatus', { publishedStatus: TaskStatus.PUBLISHED })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('submission.isActive = :submissionActive', { submissionActive: true })
      .getCount();

    return {
      overdueCount,
      returnedCount,
      totalCount: overdueCount + returnedCount,
    };
  }

  private async getFamilyStudentIds(userId: string): Promise<string[]> {
    const familyStudents = await this.familyStudentsRepository
      .createQueryBuilder('fs')
      .innerJoin('fs.family', 'family')
      .innerJoin('family.primaryContact', 'primaryContact')
      .leftJoin('family.secondaryContact', 'secondaryContact')
      .where('primaryContact.id = :userId OR secondaryContact.id = :userId', { userId })
      .getMany();

    return familyStudents.map(fs => fs.studentId);
  }

  async getFamilyStudentStatistics(familyUserId: string, studentId: string): Promise<StudentTaskStatisticsDto> {
    // Verificar que el estudiante pertenece a la familia
    const familyStudentIds = await this.getFamilyStudentIds(familyUserId);
    
    if (!familyStudentIds.includes(studentId)) {
      throw new ForbiddenException('No tienes acceso a los datos de este estudiante');
    }

    // Obtener estadísticas del estudiante (excluyendo Test Yourself, SOLO tareas visibles a familias)
    // SOLO entregas que realmente se hayan enviado (excluir status 'not_submitted')
    const submissions = await this.submissionsRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.task', 'task')
      .where('submission.studentId = :studentId', { studentId })
      // FILTRO STATUS: Solo incluir entregas realmente enviadas (no 'not_submitted')
      .andWhere('submission.status != :notSubmitted', { notSubmitted: SubmissionStatus.NOT_SUBMITTED })
      // FILTRO TEST YOURSELF: Solo incluir entregas de tareas regulares
      .andWhere('task.isTestYourself = :isFalse', { isFalse: false })
      // FILTRO FAMILIAS: Solo incluir tareas donde se notificó a familias
      .andWhere('task.notifyFamilies = :notifyFamilies', { notifyFamilies: true })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere('task.status = :status', { status: TaskStatus.PUBLISHED })
      .getMany();

    const totalTasks = await this.tasksRepository.count({
      where: {
        status: TaskStatus.PUBLISHED,
        isActive: true,
        // FILTRO TEST YOURSELF: Solo contar tareas regulares
        isTestYourself: false,
        // FILTRO FAMILIAS: Solo contar tareas visibles a familias
        notifyFamilies: true,
        subjectAssignmentId: In(
          await this.getSubjectAssignmentIdsForStudent(studentId)
        )
      },
    });

    const submittedTasks = submissions.length;
    const gradedTasks = submissions.filter(s => s.isGraded).length;
    const pendingTasks = totalTasks - submittedTasks;

    const grades = submissions
      .filter(s => s.grade !== null)
      .map(s => Number(s.grade));

    const averageGrade = grades.length > 0 
      ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length 
      : 0;

    const submissionRate = totalTasks > 0 ? Math.round(((submittedTasks / totalTasks) * 100) * 10) / 10 : 0;

    // Count late submissions
    const lateTasks = submissions.filter(s => s.status === SubmissionStatus.LATE).length;

    return {
      totalAssigned: totalTasks,
      submitted: submittedTasks,
      graded: gradedTasks,
      pending: pendingTasks,
      lateSubmissions: lateTasks,
      averageGrade: Math.round(averageGrade * 10) / 10,
      submissionRate,
    };
  }

  private async getSubjectAssignmentIdsForStudent(studentId: string): Promise<string[]> {
    const assignments = await this.subjectAssignmentsRepository
      .createQueryBuilder('sa')
      .innerJoin('class_students', 'cs', 'cs."classId" = sa."classGroupId"')
      .where('cs."studentId" = :studentId', { studentId })
      .getMany();

    return assignments.map(sa => sa.id);
  }

  // ==================== GESTIÓN DE ARCHIVOS ADJUNTOS ====================

  // Helper para generar año académico en formato correcto (ej: "2025-2026")
  private generateAcademicYear(): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Si estamos en enero-agosto, el año académico empezó el año anterior
    // Si estamos en septiembre-diciembre, el año académico empezó este año
    if (currentMonth >= 9) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  async uploadTaskAttachments(taskId: string, files: Express.Multer.File[], userId: string, descriptions?: string[], attachmentType?: string): Promise<void> {
    // Obtener la tarea con relaciones necesarias para Google Drive
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: [
        'subjectAssignment',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup',
        'subjectAssignment.classGroup.courses',
        'subjectAssignment.classGroup.courses.cycle',
        'subjectAssignment.classGroup.courses.cycle.educationalLevel',
        'subjectAssignment.classGroup.academicYear'
      ]
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    
    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }
    
    if (task.teacherId !== teacher.id) {
      throw new ForbiddenException('No tienes permisos para subir archivos a esta tarea');
    }

    console.log('🔍 SERVICE DEBUG - attachmentType received:', attachmentType);
    
    // Procesar archivos con Google Drive
    const attachmentPromises = files.map(async (file, index) => {
      try {
        // Convert string attachmentType to enum, or use mime-type detection
        const finalType = attachmentType ? 
          this.stringToAttachmentType(attachmentType) : 
          this.getFileTypeFromMimeType(file.mimetype);
        console.log(`🔍 SERVICE DEBUG - File ${file.originalname} -> type: ${finalType}`);

        // Preparar datos para Google Drive
        const taskData = {
          academicYear: task.subjectAssignment?.classGroup?.academicYear?.name || this.generateAcademicYear(),
          courseName: task.subjectAssignment?.classGroup?.courses?.[0]?.name,
          subject: task.subjectAssignment?.subject?.name || 'Sin Asignatura',
          taskTitle: task.title
        };

        console.log('📁 Google Drive upload data:', taskData);

        // Leer el archivo como buffer
        const fs = require('fs');
        const fileBuffer = fs.readFileSync(file.path);

        // Subir a Google Drive usando el método probado de recursos educativos
        const driveResult = await this.googleDriveService.uploadFile(
          fileBuffer,
          file.originalname,
          file.mimetype,
          taskData.academicYear,
          'Task Attachments', // Educational level equivalente
          taskData.subject,
          `${taskData.taskTitle}_${finalType}` // Subject equivalente con tipo
        );

        console.log('☁️ Google Drive upload result:', { 
          fileId: driveResult.fileId, 
          folderId: driveResult.folderId,
          webViewLink: driveResult.webViewLink
        });

        // Crear el attachment con información de Google Drive
        return this.attachmentsRepository.create({
          taskId,
          filename: file.filename, // Mantener el filename temporal para referencia
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: null, // No path local ya que está en Google Drive
          type: finalType,
          description: descriptions?.[index] || `Archivo adjunto: ${file.originalname}`,
          downloadCount: 0,
          // Campos de Google Drive
          driveFileId: driveResult.fileId,
          driveFolderId: driveResult.folderId,
          driveWebViewLink: driveResult.webViewLink,
          driveDownloadLink: driveResult.downloadLink,
          driveFolderPath: JSON.stringify([taskData.academicYear, 'Task Attachments', taskData.subject, `${taskData.taskTitle}_${finalType}`]),
        });

      } catch (error) {
        console.error(`❌ Error uploading file ${file.originalname} to Google Drive:`, error);
        throw new BadRequestException(`Error al subir archivo ${file.originalname} a Google Drive: ${error.message}`);
      }
    });

    // Esperar que todos los archivos se suban a Google Drive
    const attachments = await Promise.all(attachmentPromises);

    // Guardar los attachments en la base de datos
    await this.attachmentsRepository.save(attachments);

    console.log(`✅ Successfully uploaded ${attachments.length} files to Google Drive and saved to database`);
  }

  async getTaskAttachments(taskId: string, userId: string): Promise<any[]> {
    console.log('🔍🔍🔍 GET TASK ATTACHMENTS CALLED!!!');
    console.log('🔍 TaskId:', taskId);
    console.log('🔍 UserId:', userId);
    
    try {
      // Get the task first to verify access
      const task = await this.tasksRepository.findOne({
        where: { id: taskId },
        relations: ["attachments", "subjectAssignment", "subjectAssignment.teacher"],
      });

      console.log('🔍 Task found:', task ? `${task.title} (${task.attachments?.length || 0} attachments)` : 'NOT FOUND');

      if (!task) {
        throw new NotFoundException("Tarea no encontrada");
      }

      console.log('🔍 Task attachments from DB:', task.attachments?.map(a => ({ id: a.id, type: a.type, filename: a.filename })) || []);

      // Optimized permission checking - single query with joins
      console.log('🔍 Checking permissions...');
      const hasAccess = await this.checkUserTaskPermissionOptimized(userId, taskId);

      console.log('🔍 Permission check result:', hasAccess);

      if (!hasAccess) {
        throw new ForbiddenException("No tienes permisos para ver los archivos adjuntos de esta tarea");
      }

      console.log('🔍 Returning attachments:', task.attachments?.length || 0);
      return task.attachments || [];
    } catch (error) {
      console.error('🚨 ERROR in getTaskAttachments:', error);
      throw error;
    }
  }


  async uploadSubmissionAttachments(submissionId: string, files: Express.Multer.File[], userId: string, descriptions?: string[]): Promise<void> {
    try {
      // Validate input parameters
      if (!submissionId) {
        throw new BadRequestException('ID de entrega requerido');
      }

      if (!files || files.length === 0) {
        throw new BadRequestException('No se proporcionaron archivos para subir');
      }

      if (!userId) {
        throw new BadRequestException('ID de usuario requerido');
      }

      // Validate files
      for (const file of files) {
        if (!file.filename || !file.originalname || !file.path) {
          throw new BadRequestException(`Archivo inválido: falta información requerida (filename: ${file.filename}, originalname: ${file.originalname}, path: ${file.path})`);
        }
        if (file.size === 0) {
          throw new BadRequestException(`El archivo ${file.originalname} está vacío`);
        }
      }

      const submission = await this.submissionsRepository.findOne({
        where: { id: submissionId },
        relations: ['task'],
      });

      if (!submission) {
        throw new NotFoundException(`Entrega no encontrada con ID: ${submissionId}`);
      }

      // Look up student entity from userId
      const student = await this.studentsRepository.findOne({
        where: { user: { id: userId } }
      });

      if (!student) {
        throw new ForbiddenException(`Estudiante no encontrado con ID de usuario: ${userId}`);
      }

      if (submission.studentId !== student.id) {
        throw new ForbiddenException(`No tienes permisos para subir archivos a esta entrega. Tu ID de estudiante: ${student.id}, ID de estudiante de la entrega: ${submission.studentId}`);
      }

      // Verificar si la tarea aún acepta entregas
      if (submission.task.status === TaskStatus.CLOSED) {
        throw new BadRequestException('Esta tarea ya está cerrada y no acepta más archivos');
      }

      // Obtener el número de versión más alto existente con mejor manejo de errores
      let maxVersion = 0;
      try {
        const result = await this.submissionAttachmentsRepository.maximum('version', { submissionId });
        maxVersion = result || 0;
      } catch (error) {
        console.error('Error al obtener versión máxima:', error);
        // Continuar con versión 0 si hay error
        maxVersion = 0;
      }

      // Crear entidades de archivos adjuntos con validación adicional
      const attachments = files.map((file, index) => {
        try {
          return this.submissionAttachmentsRepository.create({
            submissionId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size,
            path: file.path,
            status: SubmissionAttachmentStatus.UPLOADED,
            description: descriptions?.[index] || `Archivo de entrega: ${file.originalname}`,
            isMainSubmission: index === 0 && !descriptions,
            version: maxVersion + 1,
          });
        } catch (error) {
          throw new BadRequestException(`Error al procesar archivo ${file.originalname}: ${error.message}`);
        }
      });

      // Guardar en base de datos con manejo de errores mejorado
      try {
        await this.submissionAttachmentsRepository.save(attachments);
        console.log(`✅ Successfully uploaded ${attachments.length} attachments for submission ${submissionId}`);
      } catch (error) {
        console.error('Error al guardar archivos adjuntos en base de datos:', error);
        throw new BadRequestException(`Error al guardar archivos en base de datos: ${error.message}`);
      }

    } catch (error) {
      console.error('Error en uploadSubmissionAttachments:', error);
      
      // Re-throw known exceptions
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof BadRequestException) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new BadRequestException(`Error interno al subir archivos: ${error.message}`);
    }
  }

  async downloadAttachment(attachmentId: string, type: 'task' | 'submission' = 'task'): Promise<{ filePath: string; originalName: string; isGoogleDrive?: boolean; driveFileId?: string; driveWebViewLink?: string }> {
    let attachment: any;
    
    if (type === 'task') {
      attachment = await this.attachmentsRepository.findOne({ where: { id: attachmentId } });
      if (attachment) {
        // Incrementar contador de descargas
        await this.attachmentsRepository.update(attachmentId, { 
          downloadCount: attachment.downloadCount + 1 
        });
      }
    } else {
      attachment = await this.submissionAttachmentsRepository.findOne({ where: { id: attachmentId } });
    }

    if (!attachment) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Si el archivo está en Google Drive (nueva implementación)
    if (attachment.driveFileId && attachment.driveWebViewLink) {
      return {
        filePath: null, // No tiene path local
        originalName: attachment.originalName,
        isGoogleDrive: true,
        driveFileId: attachment.driveFileId,
        driveWebViewLink: attachment.driveWebViewLink,
      };
    }

    // Si el archivo está almacenado localmente (implementación anterior)
    if (!attachment.path) {
      throw new NotFoundException('Archivo no disponible - ni local ni en Google Drive');
    }

    return {
      filePath: attachment.path,
      originalName: attachment.originalName,
      isGoogleDrive: false,
    };
  }

  async deleteTaskAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['task'],
    });

    if (!attachment) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Obtener el teacher ID a partir del user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    if (attachment.task.teacherId !== teacher.id) {
      throw new ForbiddenException('No tienes permisos para eliminar este archivo');
    }

    await this.attachmentsRepository.remove(attachment);
  }

  async deleteSubmissionAttachment(attachmentId: string, studentId: string): Promise<void> {
    const attachment = await this.submissionAttachmentsRepository.findOne({
      where: { id: attachmentId },
      relations: ['submission'],
    });

    if (!attachment) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (attachment.submission.studentId !== studentId) {
      throw new ForbiddenException('No tienes permisos para eliminar este archivo');
    }

    await this.submissionAttachmentsRepository.remove(attachment);
  }

  // ==================== NUEVOS MÉTODOS AVANZADOS ====================

  async getSystemStatistics() {
    const [totalTasks, totalSubmissions, pendingGrading, overdueTasks] = await Promise.all([
      this.tasksRepository.count({
        where: { isActive: true },
      }),
      this.submissionsRepository.count({
        where: { status: In([SubmissionStatus.SUBMITTED, SubmissionStatus.LATE, SubmissionStatus.GRADED]) },
      }),
      this.submissionsRepository.count({
        where: { 
          status: In([SubmissionStatus.SUBMITTED, SubmissionStatus.LATE]),
          isGraded: false,
        },
      }),
      this.tasksRepository.count({
        where: {
          dueDate: Between(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
          status: TaskStatus.PUBLISHED,
        },
      }),
    ]);

    const submissionRate = totalTasks > 0 ? Math.round(((totalSubmissions / totalTasks) * 100) * 10) / 10 : 0;
    const averageGradingTime = await this.calculateAverageGradingTime();

    return {
      totalTasks,
      totalSubmissions,
      pendingGrading,
      overdueTasks,
      submissionRate: Math.round(submissionRate),
      averageGradingTime,
      lastUpdated: new Date(),
    };
  }

  async getAdvancedTeacherStatistics(userId: string) {
    // Obtener el teacher a partir del userId
    const teacher = await this.getTeacherByUserId(userId);
    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado para este usuario');
    }
    
    const teacherId = teacher.id;

    const [tasks, submissions, pendingGrading] = await Promise.all([
      this.tasksRepository.find({
        where: { teacherId, isActive: true },
        relations: ['submissions', 'attachments', 'subjectAssignment', 'subjectAssignment.subject'],
      }),
      this.submissionsRepository.find({
        where: { task: { teacherId } },
        relations: ['task', 'student', 'student.user', 'student.user.profile'],
      }),
      this.submissionsRepository.find({
        where: {
          task: { teacherId },
          status: In([SubmissionStatus.SUBMITTED, SubmissionStatus.LATE]),
          isGraded: false,
        },
        relations: ['task', 'student', 'student.user', 'student.user.profile'],
      }),
    ]);

    // Estadísticas por asignatura
    const subjectStats = this.calculateSubjectStatistics(tasks);
    
    // Estadísticas de rendimiento por estudiante
    const studentPerformance = this.calculateStudentPerformance(submissions);
    
    // Tendencias temporales
    const timeAnalytics = this.calculateTimeAnalytics(tasks, submissions);
    
    // Métricas de engagement
    const engagementMetrics = this.calculateEngagementMetrics(tasks, submissions);

    // Calcular la tasa de finalización correctamente (entregas calificadas vs entregas realizadas)
    const submittedSubmissions = submissions.filter(s => 
      s.status !== SubmissionStatus.NOT_SUBMITTED
    );
    const gradedSubmissions = submittedSubmissions.filter(s => s.isGraded);
    const completionRate = submittedSubmissions.length > 0 
      ? Math.min(Math.round((gradedSubmissions.length / submittedSubmissions.length) * 100), 100)
      : 0;

    return {
      overview: {
        totalTasks: tasks.length,
        totalSubmissions: submissions.length,
        pendingGrading: pendingGrading.length,
        completionRate,
      },
      subjectStats,
      studentPerformance: studentPerformance.slice(0, 10), // Top 10
      timeAnalytics,
      engagementMetrics,
      pendingGrading: pendingGrading.slice(0, 5), // Próximas 5
    };
  }

  async getTaskSubmissionAnalytics(taskId: string, teacherId: string) {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, teacherId },
      relations: [
        'submissions',
        'submissions.student',
        'submissions.student.user',
        'submissions.student.user.profile',
        'submissions.attachments',
        'subjectAssignment',
        'subjectAssignment.classGroup',
        'subjectAssignment.classGroup.students',
      ],
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const totalStudents = task.subjectAssignment?.classGroup?.students?.length || 0;
    const submissions = task.submissions || [];

    // Análisis de entregas
    const submissionAnalysis = {
      total: submissions.length,
      onTime: submissions.filter(s => !s.isLate).length,
      late: submissions.filter(s => s.isLate).length,
      graded: submissions.filter(s => s.isGraded).length,
      pending: submissions.filter(s => !s.isGraded).length,
      notSubmitted: totalStudents - submissions.length,
    };

    // Análisis de calificaciones
    const gradedSubmissions = submissions.filter(s => s.isGraded && s.finalGrade !== null);
    const gradeAnalysis = {
      average: gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((acc, s) => acc + s.finalGrade!, 0) / gradedSubmissions.length 
        : 0,
      highest: gradedSubmissions.length > 0 
        ? Math.max(...gradedSubmissions.map(s => s.finalGrade!)) 
        : 0,
      lowest: gradedSubmissions.length > 0 
        ? Math.min(...gradedSubmissions.map(s => s.finalGrade!)) 
        : 0,
      distribution: this.calculateGradeDistribution(gradedSubmissions),
    };

    // Cronología de entregas
    const submissionTimeline = submissions
      .filter(s => s.submittedAt)
      .map(s => ({
        date: s.submittedAt!.toISOString().split('T')[0],
        count: 1,
      }))
      .reduce((acc: any[], curr) => {
        const existing = acc.find(item => item.date === curr.date);
        if (existing) {
          existing.count++;
        } else {
          acc.push(curr);
        }
        return acc;
      }, [])
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      taskInfo: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        status: task.status,
        totalStudents,
      },
      submissionAnalysis,
      gradeAnalysis,
      submissionTimeline,
      recentSubmissions: submissions
        .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())
        .slice(0, 10),
    };
  }

  async getPendingGrading(userId: string) {
    // First, get the teacher entity from user ID
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    const pendingSubmissions = await this.submissionsRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.task', 'task')
      .leftJoinAndSelect('submission.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('submission.attachments', 'attachments')
      .where('task.teacherId = :teacherId', { teacherId: teacher.id })
      .andWhere('submission.status IN (:...statuses)', { 
        statuses: [SubmissionStatus.SUBMITTED, SubmissionStatus.LATE] 
      })
      .andWhere('submission.isGraded = :isGraded', { isGraded: false })
      .orderBy('submission.submittedAt', 'ASC')
      .getMany();

    return pendingSubmissions.map(submission => ({
      id: submission.id,
      taskTitle: submission.task.title,
      taskId: submission.task.id,
      studentName: `${submission.student.user.profile.firstName} ${submission.student.user.profile.lastName}`,
      studentId: submission.student.id,
      submittedAt: submission.submittedAt,
      daysPending: Math.ceil((new Date().getTime() - new Date(submission.submittedAt!).getTime()) / (1000 * 60 * 60 * 24)),
      hasAttachments: submission.attachments?.length > 0,
      isLate: submission.isLate,
    }));
  }

  async getOverdueTasks(teacherId: string) {
    const now = new Date();
    const overdueTasks = await this.tasksRepository.find({
      where: {
        teacherId,
        dueDate: Between(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), now),
        status: TaskStatus.PUBLISHED,
      },
      relations: [
        'submissions',
        'subjectAssignment',
        'subjectAssignment.classGroup',
        'subjectAssignment.classGroup.students',
        'subjectAssignment.subject',
      ],
    });

    return overdueTasks.map(task => {
      const totalStudents = task.subjectAssignment?.classGroup?.students?.length || 0;
      const submittedCount = task.submissions?.length || 0;
      const missingSubmissions = totalStudents - submittedCount;

      return {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        subjectName: task.subjectAssignment?.subject?.name,
        totalStudents,
        submittedCount,
        missingSubmissions,
        completionRate: Math.round((submittedCount / Math.max(totalStudents, 1)) * 100),
        daysOverdue: Math.ceil((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });
  }

  async sendBulkReminders(taskIds: string[], teacherId: string, customMessage?: string) {
    const tasks = await this.tasksRepository.find({
      where: {
        id: In(taskIds),
        teacherId,
      },
      relations: [
        'subjectAssignment',
        'subjectAssignment.classGroup',
        'subjectAssignment.classGroup.students',
        'subjectAssignment.classGroup.students.user',
        'submissions',
      ],
    });

    if (tasks.length === 0) {
      throw new NotFoundException('No se encontraron tareas válidas');
    }

    let totalReminders = 0;

    for (const task of tasks) {
      const studentsToRemind = task.subjectAssignment?.classGroup?.students?.filter(student => {
        // Solo enviar recordatorio si no ha entregado la tarea
        return !task.submissions?.some(submission => submission.studentId === student.id);
      }) || [];

      totalReminders += studentsToRemind.length;

      // Aquí se integraría con el sistema de notificaciones
      // Por ahora solo registramos la acción
      console.log(`Enviando recordatorio de tarea "${task.title}" a ${studentsToRemind.length} estudiantes`);
    }

    return {
      message: `Recordatorios enviados exitosamente`,
      taskCount: tasks.length,
      reminderCount: totalReminders,
      sentAt: new Date(),
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private calculateSubjectStatistics(tasks: Task[]) {
    const subjectMap = new Map();

    tasks.forEach(task => {
      const subjectName = task.subjectAssignment?.subject?.name || 'Sin asignatura';
      const submissionCount = task.submissions?.length || 0;
      const gradedCount = task.submissions?.filter(s => s.isGraded).length || 0;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, {
          name: subjectName,
          taskCount: 0,
          submissionCount: 0,
          gradedCount: 0,
          averageGrade: 0,
        });
      }

      const stats = subjectMap.get(subjectName);
      stats.taskCount++;
      stats.submissionCount += submissionCount;
      stats.gradedCount += gradedCount;
    });

    return Array.from(subjectMap.values());
  }

  private calculateStudentPerformance(submissions: TaskSubmission[]) {
    const studentMap = new Map();

    submissions.forEach(submission => {
      const studentKey = submission.student.id;
      const studentName = `${submission.student.user.profile.firstName} ${submission.student.user.profile.lastName}`;

      if (!studentMap.has(studentKey)) {
        studentMap.set(studentKey, {
          studentId: studentKey,
          studentName,
          submissionCount: 0,
          averageGrade: 0,
          onTimeRate: 0,
          grades: [],
        });
      }

      const stats = studentMap.get(studentKey);
      stats.submissionCount++;
      
      if (submission.finalGrade !== null) {
        stats.grades.push(submission.finalGrade);
      }
    });

    // Calcular promedios
    Array.from(studentMap.values()).forEach(stats => {
      if (stats.grades.length > 0) {
        stats.averageGrade = stats.grades.reduce((a: number, b: number) => a + b, 0) / stats.grades.length;
      }
    });

    return Array.from(studentMap.values()).sort((a, b) => b.averageGrade - a.averageGrade);
  }

  private calculateTimeAnalytics(tasks: Task[], submissions: TaskSubmission[]) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentTasks = tasks.filter(t => t.createdAt >= thirtyDaysAgo);
    const recentSubmissions = submissions.filter(s => s.submittedAt && s.submittedAt >= thirtyDaysAgo);

    return {
      tasksCreatedLast30Days: recentTasks.length,
      submissionsLast30Days: recentSubmissions.length,
      averageSubmissionsPerTask: recentTasks.length > 0 ? recentSubmissions.length / recentTasks.length : 0,
    };
  }

  private calculateEngagementMetrics(tasks: Task[], submissions: TaskSubmission[]) {
    const totalPossibleSubmissions = tasks.reduce((acc, task) => {
      return acc + (task.subjectAssignment?.classGroup?.students?.length || 0);
    }, 0);

    // Filtrar solo entregas válidas (no duplicadas ni not_submitted)
    const validSubmissions = submissions.filter(s => 
      s.status !== SubmissionStatus.NOT_SUBMITTED
    );

    const submissionRate = totalPossibleSubmissions > 0 ? 
      Math.min(Math.round(((validSubmissions.length / totalPossibleSubmissions) * 100) * 10) / 10, 100) : 0;
    
    const onTimeRate = validSubmissions.length > 0 ? 
      Math.round(((validSubmissions.filter(s => !s.isLate).length / validSubmissions.length) * 100) * 10) / 10 : 0;

    return {
      submissionRate,
      onTimeRate,
      averageAttachmentsPerSubmission: validSubmissions.length > 0 
        ? validSubmissions.reduce((acc, s) => acc + (s.attachments?.length || 0), 0) / validSubmissions.length 
        : 0,
    };
  }

  private calculateGradeDistribution(submissions: TaskSubmission[]) {
    const ranges = [
      { label: '90-100%', min: 90, max: 100, count: 0 },
      { label: '80-89%', min: 80, max: 89, count: 0 },
      { label: '70-79%', min: 70, max: 79, count: 0 },
      { label: '60-69%', min: 60, max: 69, count: 0 },
      { label: '0-59%', min: 0, max: 59, count: 0 },
    ];

    submissions.forEach(submission => {
      if (submission.finalGrade !== null && submission.task?.maxPoints) {
        const percentage = Math.round(((submission.finalGrade / submission.task.maxPoints) * 100) * 10) / 10;
        const range = ranges.find(r => percentage >= r.min && percentage <= r.max);
        if (range) range.count++;
      }
    });

    return ranges;
  }

  private async calculateAverageGradingTime() {
    const gradedSubmissions = await this.submissionsRepository.find({
      where: { isGraded: true },
      select: ['submittedAt', 'gradedAt'],
    });

    if (gradedSubmissions.length === 0) return 0;

    const totalTime = gradedSubmissions.reduce((acc, submission) => {
      if (submission.submittedAt && submission.gradedAt) {
        return acc + (submission.gradedAt.getTime() - submission.submittedAt.getTime());
      }
      return acc;
    }, 0);

    return Math.round(totalTime / gradedSubmissions.length / (1000 * 60 * 60 * 24)); // Días
  }

  private getFileTypeFromMimeType(mimeType: string): AttachmentType {
    // Map MIME types to general purpose attachment types
    if (mimeType.startsWith('image/')) {
      return AttachmentType.EXAMPLE; // Images typically serve as examples
    }
    
    if (mimeType === 'application/pdf' || 
        mimeType.includes('document') || 
        mimeType === 'text/plain') {
      return AttachmentType.INSTRUCTION; // Documents are typically instructions
    }
    
    if (mimeType.includes('spreadsheet') || 
        mimeType.includes('excel')) {
      return AttachmentType.TEMPLATE; // Spreadsheets are often templates
    }
    
    if (mimeType.includes('presentation') || 
        mimeType.includes('powerpoint')) {
      return AttachmentType.REFERENCE; // Presentations are often reference material
    }
    
    // Default to resource for other types
    return AttachmentType.RESOURCE;
  }

  private stringToAttachmentType(typeString: string): AttachmentType {
    // Convert string from frontend to AttachmentType enum
    switch (typeString.toLowerCase()) {
      case 'instruction':
        return AttachmentType.INSTRUCTION;
      case 'template':
        return AttachmentType.TEMPLATE;
      case 'reference':
        return AttachmentType.REFERENCE;
      case 'example':
        return AttachmentType.EXAMPLE;
      case 'resource':
        return AttachmentType.RESOURCE;
      default:
        console.log(`🔍 SERVICE DEBUG - Unknown attachment type: ${typeString}, defaulting to INSTRUCTION`);
        return AttachmentType.INSTRUCTION;
    }
  }

  async getUpcomingDeadlines(teacherId: string) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Próximos 30 días

    const tasks = await this.tasksRepository.find({
      where: {
        teacherId,
        dueDate: Between(startDate, endDate),
      },
      relations: [
        'subjectAssignment',
        'subjectAssignment.subject',
        'subjectAssignment.classGroup',
        'submissions',
        'submissions.student',
        'submissions.student.user',
        'submissions.student.user.profile',
      ],
      order: {
        dueDate: 'ASC',
      },
    });

    const now = new Date();

    return tasks.map(task => {
      const totalStudents = task.subjectAssignment?.classGroup?.students?.length || 0;
      const submissionCount = task.submissions?.filter(s => s.status === 'submitted' || s.status === 'late').length || 0;
      const isOverdue = task.dueDate < now;
      const isDueToday = task.dueDate.toDateString() === now.toDateString();

      let status: 'upcoming' | 'due_today' | 'overdue' = 'upcoming';
      if (isOverdue) status = 'overdue';
      else if (isDueToday) status = 'due_today';

      return {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate.toISOString(),
        subject: task.subjectAssignment?.subject?.name || 'Sin asignatura',
        classGroup: task.subjectAssignment?.classGroup?.name || 'Sin grupo',
        submissionCount,
        totalStudents,
        status,
      };
    });
  }

  /**
   * Optimized permission checking for task attachments
   * Uses single query with joins instead of multiple queries
   */
  private async checkUserTaskPermissionOptimized(userId: string, taskId: string): Promise<boolean> {
    console.log('🔍 PERMISSION CHECK START - userId:', userId, 'taskId:', taskId);
    
    const query = `
      SELECT 
        CASE 
          WHEN t.id IS NOT NULL THEN true
          WHEN s.id IS NOT NULL THEN true
          WHEN f.id IS NOT NULL THEN true
          ELSE false
        END as has_access
      FROM tasks task
      LEFT JOIN subject_assignments sa ON task."subjectAssignmentId" = sa.id
      LEFT JOIN teachers t ON sa."teacherId" = t.id AND t."userId" = $1
      LEFT JOIN task_submissions sub ON task.id = sub."taskId"
      LEFT JOIN students s ON sub."studentId" = s.id AND s."userId" = $1
      LEFT JOIN students fs ON sub."studentId" = fs.id
      LEFT JOIN family_students fams ON fs.id = fams."studentId"
      LEFT JOIN families f ON fams."familyId" = f.id AND (f."primaryContactId" = $1 OR f."secondaryContactId" = $1)
      WHERE task.id = $2
      AND (t.id IS NOT NULL OR s.id IS NOT NULL OR f.id IS NOT NULL)
      LIMIT 1
    `;

    console.log('🔍 PERMISSION QUERY:', query);
    console.log('🔍 PERMISSION PARAMS:', [userId, taskId]);

    try {
      const result = await this.dataSource.query(query, [userId, taskId]);
      console.log('🔍 PERMISSION QUERY RESULT:', result);
      
      const hasAccess = result.length > 0 && result[0].has_access;
      console.log('🔍 PERMISSION FINAL RESULT:', hasAccess);
      
      return hasAccess;
    } catch (error) {
      console.error('🚨 PERMISSION QUERY ERROR:', error);
      throw error;
    }
  }

  // ==================== ARCHIVING SYSTEM ====================

  /**
   * Archive a completed task submission for a student
   * Uses soft delete by setting isActive = false
   */
  async archiveTaskSubmission(taskId: string, userId: string): Promise<{ success: boolean; message: string }> {
    console.log('🗄️ ARCHIVE TASK - taskId:', taskId, 'userId:', userId);
    
    try {
      // Get student ID from user ID
      const student = await this.getStudentByUserId(userId);
      if (!student) {
        throw new NotFoundException('Estudiante no encontrado para este usuario');
      }
      
      // Find the submission
      const submission = await this.submissionsRepository.findOne({
        where: { 
          taskId, 
          studentId: student.id,
          isActive: true // Only archive active submissions
        },
        relations: ['task'],
      });

      if (!submission) {
        throw new NotFoundException('No se encontró la entrega de esta tarea o ya está archivada');
      }

      // Only allow archiving completed/graded tasks
      if (submission.status !== SubmissionStatus.GRADED) {
        throw new BadRequestException('Solo se pueden archivar tareas completadas y calificadas');
      }

      // Archive the submission (soft delete)
      await this.submissionsRepository.update(submission.id, {
        isActive: false,
        updatedAt: new Date(),
      });

      console.log('✅ TASK ARCHIVED SUCCESSFULLY - submissionId:', submission.id);
      
      return {
        success: true,
        message: `Tarea "${submission.task.title}" archivada correctamente`,
      };
    } catch (error) {
      console.error('❌ ARCHIVE TASK ERROR:', error);
      throw error;
    }
  }

  /**
   * Unarchive a task submission for a student
   * Sets isActive = true to restore visibility
   */
  async unarchiveTaskSubmission(taskId: string, userId: string): Promise<{ success: boolean; message: string }> {
    console.log('📂 UNARCHIVE TASK - taskId:', taskId, 'userId:', userId);
    
    try {
      // Get student ID from user ID
      const student = await this.getStudentByUserId(userId);
      if (!student) {
        throw new NotFoundException('Estudiante no encontrado para este usuario');
      }
      
      // Find the archived submission
      const submission = await this.submissionsRepository.findOne({
        where: { 
          taskId, 
          studentId: student.id,
          isActive: false // Only unarchive inactive submissions
        },
        relations: ['task'],
      });

      if (!submission) {
        throw new NotFoundException('No se encontró la entrega archivada de esta tarea');
      }

      // Restore the submission
      await this.submissionsRepository.update(submission.id, {
        isActive: true,
        updatedAt: new Date(),
      });

      console.log('✅ TASK UNARCHIVED SUCCESSFULLY - submissionId:', submission.id);
      
      return {
        success: true,
        message: `Tarea "${submission.task.title}" restaurada correctamente`,
      };
    } catch (error) {
      console.error('❌ UNARCHIVE TASK ERROR:', error);
      throw error;
    }
  }

  /**
   * Limpiar Test Yourself vencidos para un estudiante específico
   * Cambia el estado de 'published' a 'closed' solo para Test Yourself que ya pasaron su fecha
   */
  async cleanExpiredTestYourselfForStudent(userId: string): Promise<{ cleaned: number; message: string }> {
    console.log('🧹 CLEAN EXPIRED TEST YOURSELF - userId:', userId);
    
    try {
      // Obtener studentId desde userId
      const student = await this.getStudentByUserId(userId);
      if (!student) {
        throw new NotFoundException('Estudiante no encontrado para este usuario');
      }

      console.log('🔍 CLEAN - Student found:', student.id);

      // Obtener grupos de clase del estudiante
      const classGroupsQuery = await this.dataSource.query(`
        SELECT cs."classId" as id
        FROM class_students cs
        WHERE cs."studentId" = $1
      `, [student.id]);

      if (!classGroupsQuery || classGroupsQuery.length === 0) {
        return { cleaned: 0, message: 'No tienes clases asignadas' };
      }

      const classGroupIds = classGroupsQuery.map(cg => cg.id);
      console.log('🔍 CLEAN - Student class groups:', classGroupIds);

      // Buscar Test Yourself vencidos para este estudiante
      const now = new Date();
      const expiredTestYourself = await this.tasksRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
        .where('task.taskType = :taskType', { taskType: TaskType.EXAM })
        .andWhere('task.status = :status', { status: TaskStatus.PUBLISHED })
        .andWhere('task.dueDate < :now', { now })
        .andWhere('subjectAssignment.classGroupId IN (:...classGroupIds)', { classGroupIds })
        .getMany();

      console.log('🔍 CLEAN - Found expired Test Yourself:', expiredTestYourself.length);

      if (expiredTestYourself.length === 0) {
        return { cleaned: 0, message: 'No hay Test Yourself vencidos para limpiar' };
      }

      // Cerrar los Test Yourself vencidos
      const taskIds = expiredTestYourself.map(task => task.id);
      await this.tasksRepository.update(
        taskIds,
        {
          status: TaskStatus.CLOSED,
          closedAt: new Date(),
        }
      );

      console.log('✅ CLEAN - Test Yourself closed:', taskIds);

      return {
        cleaned: expiredTestYourself.length,
        message: `Se han limpiado ${expiredTestYourself.length} Test Yourself vencidos de tu panel`,
      };

    } catch (error) {
      console.error('❌ CLEAN EXPIRED TEST YOURSELF ERROR:', error);
      throw error;
    }
  }

  /**
   * Get archived tasks for a student
   * Returns tasks where submission.isActive = false
   */
  async getArchivedTasks(userId: string, query: StudentTaskQueryDto): Promise<{ tasks: Task[]; total: number }> {
    console.log('🗄️ GET ARCHIVED TASKS - userId:', userId, 'query:', query);
    
    try {
      // Get student ID from user ID
      const student = await this.getStudentByUserId(userId);
      if (!student) {
        throw new NotFoundException('Estudiante no encontrado para este usuario');
      }
      
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '10');
      const offset = (page - 1) * limit;
      
      // Get student's class groups
      const classGroupsQuery = await this.dataSource.query(`
        SELECT cs."classId" as id
        FROM class_students cs
        WHERE cs."studentId" = $1
      `, [student.id]);
      
      if (!classGroupsQuery || classGroupsQuery.length === 0) {
        return { tasks: [], total: 0 };
      }
      
      const classGroupIds = classGroupsQuery.map(cg => cg.id);
      
      const queryBuilder = this.tasksRepository.createQueryBuilder('task')
        .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
        .leftJoinAndSelect('subjectAssignment.subject', 'subject')
        .leftJoinAndSelect('subjectAssignment.classGroup', 'classGroup')
        .leftJoinAndSelect('task.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .leftJoinAndSelect('task.submissions', 'submissions', 'submissions.studentId = :studentId AND submissions.isActive = false')
        .leftJoinAndSelect('submissions.attachments', 'submissionAttachments')
        .leftJoinAndSelect('task.attachments', 'taskAttachments')
        .where('task.status = :publishedStatus', { publishedStatus: TaskStatus.PUBLISHED })
        .andWhere('task.isActive = :isActive', { isActive: true })
        .andWhere('subjectAssignment.classGroupId IN (:...classGroupIds)', { classGroupIds })
        .andWhere('submissions.id IS NOT NULL') // Only tasks with archived submissions
        .setParameter('studentId', student.id);

      // Apply additional filters
      if (query.subjectId) {
        queryBuilder.andWhere('subjectAssignment.subjectId = :subjectId', { subjectId: query.subjectId });
      }
      
      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('task.assignedDate BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      queryBuilder.orderBy('submissions.updatedAt', 'DESC'); // Most recently archived first

      const [tasks, total] = await queryBuilder
        .take(limit)
        .skip(offset)
        .getManyAndCount();

      console.log('🗄️ ARCHIVED TASKS RESULT - count:', tasks.length, 'total:', total);
      
      return { tasks, total };
    } catch (error) {
      console.error('❌ GET ARCHIVED TASKS ERROR:', error);
      throw error;
    }
  }

  // ==================== TEST YOURSELF (EXAM GRADES) METHODS ====================

  /**
   * Obtener detalles completos de una tarea Test Yourself con estudiantes y calificaciones
   */
  async getExamTaskDetails(taskId: string, teacherId: string) {
    try {
      console.log(`🔍 GET EXAM TASK DETAILS - Task: ${taskId}, Teacher: ${teacherId}`);

      // STEP 1: Get task with class group info
      console.log(`🔍 About to execute SQL query...`);
      console.log(`🔍 Parameters: taskId=${taskId}, teacherId=${teacherId}`);
      
      let taskResult;
      try {
        taskResult = await this.dataSource.query(`
          SELECT
            t.id, t.title, t.description, t."taskType", t."subjectAssignmentId", t."rubricId",
            t."value_type" as "valuationType",
            t."maxPoints",
            sa."classGroupId", sa."subjectId", sa."teacherId" as assignment_teacher_id,
            s.name as subject_name,
            cg.name as class_group_name
          FROM tasks t
          LEFT JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
          LEFT JOIN subjects s ON sa."subjectId" = s.id
          LEFT JOIN class_groups cg ON sa."classGroupId" = cg.id
          WHERE t.id = $1 AND t."taskType" = 'exam' AND sa."teacherId" = $2
        `, [taskId, teacherId]);
        
        console.log(`🔍 Query executed successfully, result length: ${taskResult.length}`);
      } catch (error) {
        console.log(`❌ SQL QUERY ERROR:`, error);
        throw error;
      }

      if (taskResult.length === 0) {
        console.log(`❌ No task found with provided parameters`);
        throw new NotFoundException('Tarea Test Yourself no encontrada o sin permisos');
      }

      const task = taskResult[0];
      console.log(`✅ EXAM TASK DETAILS - Task found: ${task.title}`);
      console.log(`🔍 TASK OBJECT KEYS:`, Object.keys(task));
      console.log(`🔍 TASK OBJECT FULL:`, JSON.stringify(task, null, 2));
      console.log(`🔍 Checking classGroupId: "${task.classGroupId}"`);
      console.log(`🔍 classGroupId type:`, typeof task.classGroupId);
      console.log(`📊 maxPoints from DB: task.maxPoints=${task.maxPoints}, task.maxpoints=${task.maxpoints}`);
      
      if (!task.classGroupId) {
        console.log(`❌ ERROR: No classGroupId found in task`);
        throw new Error('Task does not have a valid class group assignment');
      }

      // STEP 2: Get students for this Test Yourself
      // Students can be identified by:
      // 1. task_submissions records (with isExamNotification = true) - new Test Yourself
      // 2. exam_grades records - already graded students (fallback for legacy data)
      console.log(`🔍 Loading students for Test Yourself: ${taskId}`);

      const studentsResult = await this.dataSource.query(`
        SELECT DISTINCT
          s.id, s."enrollmentNumber", s."birthDate", s."photoUrl",
          u.id as user_id, u.email,
          p."firstName", p."lastName", p."avatarUrl"
        FROM students s
        INNER JOIN users u ON s."userId" = u.id
        LEFT JOIN user_profiles p ON u.id = p."userId"
        WHERE s.id IN (
          -- Students with task_submissions (isExamNotification = true)
          SELECT ts."studentId" FROM task_submissions ts
          WHERE ts."taskId" = $1 AND ts."isExamNotification" = true
          UNION
          -- Students with exam_grades (already graded)
          SELECT eg.student_id FROM exam_grades eg
          WHERE eg.task_id = $1
        )
        ORDER BY p."lastName", p."firstName"
      `, [taskId]);

      console.log(`📚 STUDENTS LOADED: Found ${studentsResult.length} students`);

      // Obtener calificaciones existentes
      const gradesResult = await this.dataSource.query(`
        SELECT
          eg.id, eg.task_id, eg.student_id, eg.numeric_grade,
          eg.letter_grade, eg.grade_scale, eg.comments,
          eg.attendance_status, eg.graded_at,
          eg.emoji_grade, eg.rubric_scores, eg.metadata,
          s."enrollmentNumber",
          p."firstName", p."lastName"
        FROM exam_grades eg
        INNER JOIN students s ON eg.student_id = s.id
        INNER JOIN users u ON s."userId" = u.id
        LEFT JOIN user_profiles p ON u.id = p."userId"
        WHERE eg.task_id = $1
      `, [taskId]);

      // Obtener información de la rúbrica si existe
      let rubric = null;
      if (task.rubricId) {
        const rubricResult = await this.dataSource.query(`
          SELECT 
            r.id, r.name as title, r.description, r."maxScore" as "maxPoints",
            rc.id as criterion_id, rc.name as criterion_title, 
            rc.description as criterion_description, rc.weight
          FROM rubrics r
          LEFT JOIN rubric_criteria rc ON r.id = rc."rubricId"
          WHERE r.id = $1
          ORDER BY rc."order"
        `, [task.rubricId]);

        if (rubricResult.length > 0) {
          rubric = {
            id: rubricResult[0].id,
            title: rubricResult[0].title,
            description: rubricResult[0].description,
            maxPoints: rubricResult[0].maxPoints,
            criteria: rubricResult.map(row => ({
              id: row.criterion_id,
              title: row.criterion_title,
              description: row.criterion_description,
              weight: row.weight
            })).filter(c => c.id !== null)
          };
        }
      }

      const gradedCount = gradesResult.length;
      const pendingCount = studentsResult.length - gradedCount;

      console.log(`📊 Grading status - Total: ${studentsResult.length}, Graded: ${gradedCount}, Pending: ${pendingCount}`);

      // PostgreSQL puede devolver el campo como maxPoints o maxpoints dependiendo del driver
      const taskMaxPoints = task.maxPoints || task.maxpoints || 100;
      console.log(`📊 Final maxPoints being returned: ${taskMaxPoints}`);

      return {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          taskType: task.taskType,
          subjectName: task.subject_name,
          classGroupName: task.class_group_name,
          rubricId: task.rubricId,
          valuationType: task.valuationType || 'score', // Default fallback
          maxPoints: taskMaxPoints // Incluir maxPoints para mostrar X/maxPoints
        },
        rubric,
        students: studentsResult.map(student => ({
          id: student.id,
          enrollmentNumber: student.enrollmentNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          avatarUrl: student.avatarUrl || student.photoUrl,
          // Buscar si ya tiene calificación
          grade: gradesResult.find(g => g.student_id === student.id) || null
        })),
        grades: gradesResult,
        gradedCount,
        pendingCount,
        // Información del tipo de evaluación para el frontend
        evaluationType: task.valuationType || 'score',
        evaluationOptions: task.valuationType === 'emoji'
          ? ['😊', '😐', '😞']
          : task.valuationType === 'rubric'
            ? rubric?.criteria || []
            : { min: 0, max: taskMaxPoints }
      };
    } catch (error) {
      console.error('❌ GET EXAM TASK DETAILS ERROR:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de una tarea Test Yourself
   */
  async getExamTaskStats(taskId: string, teacherId: string) {
    try {
      console.log(`📊 GET EXAM TASK STATS - Task: ${taskId}, Teacher: ${teacherId}`);

      // Verificar task usando SQL directo
      const taskResult = await this.dataSource.query(`
        SELECT id, title 
        FROM tasks 
        WHERE id = $1 AND "taskType" = 'exam' AND "teacherId" = $2
      `, [taskId, teacherId]);

      if (taskResult.length === 0) {
        throw new NotFoundException('Tarea Test Yourself no encontrada o sin permisos');
      }

      console.log(`📊 EXAM STATS - Task found: ${taskResult[0].title}`);

      // Obtener estadísticas usando SQL directo
      const statsResult = await this.dataSource.query(`
        SELECT
          COUNT(*) as total_grades,
          AVG(numeric_grade) as average_grade,
          MAX(numeric_grade) as highest_grade,
          MIN(numeric_grade) as lowest_grade,
          COUNT(CASE WHEN numeric_grade >= 60 THEN 1 END) as passing_count,
          COUNT(CASE WHEN attendance_status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN numeric_grade >= 90 THEN 1 END) as excellent_count,
          COUNT(CASE WHEN numeric_grade >= 70 AND numeric_grade < 90 THEN 1 END) as good_count,
          COUNT(CASE WHEN numeric_grade >= 60 AND numeric_grade < 70 THEN 1 END) as fair_count,
          COUNT(CASE WHEN numeric_grade < 60 THEN 1 END) as poor_count
        FROM exam_grades
        WHERE task_id = $1
      `, [taskId]);

      const stats = statsResult[0];
      const totalGrades = parseInt(stats.total_grades || '0');
      const averageGrade = parseFloat(stats.average_grade || '0');
      const passingRate = totalGrades > 0 ? (parseInt(stats.passing_count || '0') / totalGrades) * 100 : 0;

      return {
        totalGrades,
        averageGrade: Math.round(averageGrade * 100) / 100,
        highestGrade: parseFloat(stats.highest_grade || '0'),
        lowestGrade: parseFloat(stats.lowest_grade || '0'),
        passingRate: Math.round(passingRate * 100) / 100,
        studentsPresent: parseInt(stats.present_count || '0'),
        studentsAbsent: parseInt(stats.absent_count || '0'),
        gradeDistribution: {
          excellent: parseInt(stats.excellent_count || '0'),
          good: parseInt(stats.good_count || '0'),
          fair: parseInt(stats.fair_count || '0'),
          poor: parseInt(stats.poor_count || '0')
        }
      };
    } catch (error) {
      console.error('❌ GET EXAM TASK STATS ERROR:', error);
      throw error;
    }
  }

  /**
   * Crear o actualizar calificación de un estudiante en Test Yourself
   * IMPORTANTE: Todas las calificaciones se normalizan a escala 0-100 para la base de datos
   */
  async gradeExamStudent(taskId: string, studentId: string, gradeData: any, teacherId: string) {
    try {
      console.log('🚨🚨🚨 === GRADE EXAM STUDENT SERVICE CALLED ===');
      console.log('🚨🚨🚨 taskId:', taskId);
      console.log('🚨🚨🚨 studentId:', studentId);
      console.log('🚨🚨🚨 teacherId:', teacherId);
      // console.log('🚨🚨🚨 gradeData FULL:', JSON.stringify(gradeData, null, 2));
      console.error('PABLO DEBUG: gradeExamStudent CALLED');
      // console.error('PABLO DEBUG: gradeData:', gradeData);
      // console.error('PABLO DEBUG: rubricScores:', gradeData.rubricScores);

      // Obtener información de la tarea incluyendo el tipo de evaluación y maxPoints
      const taskCheck = await this.dataSource.query(`
        SELECT t.id, t."valuationType", t."maxPoints"
        FROM tasks t
        INNER JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
        WHERE t.id = $1 AND t."taskType" = 'exam' AND sa."teacherId" = $2
      `, [taskId, teacherId]);

      if (taskCheck.length === 0) {
        throw new NotFoundException('Tarea no encontrada o sin permisos');
      }

      const task = taskCheck[0];
      const evaluationType = task.valuationType || 'score';
      const taskMaxPoints = task.maxPoints || 100; // Obtener maxPoints de la tarea
      console.log(`📊 Task maxPoints from database: ${taskMaxPoints}`);

      console.log('🚨🚨🚨 TASK CHECK RESULT:', JSON.stringify(task, null, 2));
      console.log(`🚨🚨🚨 DETERMINED EVALUATION TYPE: "${evaluationType}"`);
      console.log(`🚨🚨🚨 Is evaluationType === 'rubric'?`, evaluationType === 'rubric');
      console.log(`🎯 Evaluation Type: ${evaluationType}`);

      // Verificar que el estudiante existe
      const studentCheck = await this.dataSource.query(`
        SELECT id FROM students WHERE id = $1
      `, [studentId]);

      if (studentCheck.length === 0) {
        throw new NotFoundException('Estudiante no encontrado');
      }

      // Verificar si ya existe una calificación
      const existingGrade = await this.dataSource.query(`
        SELECT id FROM exam_grades 
        WHERE task_id = $1 AND student_id = $2
      `, [taskId, studentId]);

      const currentTime = new Date().toISOString();

      // FUNCIÓN DE NORMALIZACIÓN A ESCALA 0-100
      const normalizeToScale100 = (value: number, originalScale: string = '1-10'): number => {
        console.log(`🔍 NORMALIZE DEBUG: Input value=${value}, scale=${originalScale}`);
        
        if (value === null || value === undefined) {
          console.log(`🔍 NORMALIZE DEBUG: Value is null/undefined, returning null`);
          return null;
        }
        
        // Normalizar según la escala original (quitamos la lógica problemática de 0-100)
        let normalized: number;
        switch (originalScale) {
          case '1-4':
            normalized = Math.round((value / 4) * 100);
            break;
          case '1-5':
            normalized = Math.round((value / 5) * 100);
            break;
          case '1-10':
            normalized = Math.round((value / 10) * 100);
            break;
          case '0-10':
            normalized = Math.round((value / 10) * 100);
            break;
          case '0-20':
            normalized = Math.round((value / 20) * 100);
            break;
          case '1-20':
            normalized = Math.round((value / 20) * 100);
            break;
          default:
            // Si no reconocemos la escala, asumir 1-10
            normalized = Math.round((value / 10) * 100);
        }
        
        console.log(`🔍 NORMALIZE DEBUG: ${value}/${originalScale} = ${normalized}/100`);
        return normalized;
      };

      // Preparar datos según el tipo de evaluación
      let updateParams = [];
      let insertParams = [];
      let updateQuery = '';
      let insertQuery = '';
      let normalizedGrade = null;

      if (evaluationType === 'emoji') {
        // Evaluación por emoji - convertir a escala numérica 0-100
        console.log(`😊 Processing emoji evaluation: ${gradeData.emojiGrade}`);
        
        // Convertir emoji a valor numérico normalizado
        const emojiToNumeric = {
          'sad': 33,      // 33/100 (Suspenso)
          'neutral': 66,  // 66/100 (Aprobado)
          'happy': 90     // 90/100 (Excelente)
        };
        
        normalizedGrade = emojiToNumeric[gradeData.emojiGrade] || 50;
        console.log(`🔢 Emoji ${gradeData.emojiGrade} normalized to: ${normalizedGrade}/100`);
        
        updateQuery = `
          UPDATE exam_grades 
          SET 
            emoji_grade = $1,
            numeric_grade = $2,
            rubric_scores = NULL,
            letter_grade = $3,
            grade_scale = '100',
            comments = $4,
            attendance_status = $5,
            graded_at = $6,
            updated_at = $6
          WHERE task_id = $7 AND student_id = $8
        `;
        updateParams = [
          gradeData.emojiGrade,
          normalizedGrade,
          gradeData.letterGrade || null,
          gradeData.comments || null,
          gradeData.attendanceStatus || 'present',
          currentTime,
          taskId,
          studentId
        ];

        insertQuery = `
          INSERT INTO exam_grades (
            id, task_id, student_id, graded_by_teacher_id,
            emoji_grade, numeric_grade, rubric_scores, letter_grade, grade_scale, 
            comments, attendance_status, graded_at, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, NULL, $6, '100', $7, $8, $9, $9, $9
          )
        `;
        insertParams = [
          taskId,
          studentId,
          teacherId,
          gradeData.emojiGrade,
          normalizedGrade,
          gradeData.letterGrade || null,
          gradeData.comments || null,
          gradeData.attendanceStatus || 'present',
          currentTime
        ];

      } else if (evaluationType === 'rubric') {
        // Evaluación por rúbrica - USAR CÁLCULO CORREGIDO
        console.log(`📋 Processing rubric evaluation`);
        // console.log(`📋 Rubric Scores Data:`, JSON.stringify(gradeData.rubricScores, null, 2));
        
        // IMPLEMENTAR EL MISMO CÁLCULO CORRECTO QUE EN calculateRubricGrade
        // ADAPTAR PARA EL FORMATO QUE ENVÍA EL FRONTEND: [{"points": 10}] o gradeData.rubricScores
        const rubricScoresArray = Array.isArray(gradeData) ? gradeData : gradeData.rubricScores;
        
        console.log(`🔍🔍🔍 DEBUG RUBRIC SCORES DETECTION:`);
        console.log(`🔍🔍🔍 gradeData type:`, typeof gradeData);
        console.log(`🔍🔍🔍 Array.isArray(gradeData):`, Array.isArray(gradeData));
        console.log(`🔍🔍🔍 gradeData.rubricScores:`, gradeData.rubricScores);
        console.log(`🔍🔍🔍 rubricScoresArray:`, rubricScoresArray);
        console.log(`🔍🔍🔍 Array.isArray(rubricScoresArray):`, Array.isArray(rubricScoresArray));
        
        if (rubricScoresArray && Array.isArray(rubricScoresArray)) {
          console.log(`🚨🚨🚨 RUBRIC SCORES FORMAT DEBUG:`);
          console.log(`🚨🚨🚨 Received rubricScores:`, JSON.stringify(rubricScoresArray, null, 2));
          // console.log(`🚨🚨🚨 Original gradeData:`, JSON.stringify(gradeData, null, 2));
          
          // OBTENER LOS PESOS REALES DE LA RÚBRICA DESDE LA BASE DE DATOS
          console.log(`🚨🚨🚨 FETCHING ACTUAL RUBRIC WEIGHTS FROM DATABASE FOR TASK: ${taskId}`);
          
          const rubricData = await this.dataSource.query(`
            SELECT 
              rc.id as criterion_id,
              rc.name as criterion_name,
              rc.weight as criterion_weight,
              rl.id as level_id,
              rl."scoreValue" as level_score_value
            FROM tasks t
            INNER JOIN rubrics r ON t."rubricId" = r.id
            INNER JOIN rubric_criteria rc ON r.id = rc."rubricId"
            INNER JOIN rubric_levels rl ON r.id = rl."rubricId"
            WHERE t.id = $1
            ORDER BY rc."order", rl."order"
          `, [taskId]);
          
          console.log(`🚨🚨🚨 RUBRIC DATA FROM DATABASE:`, JSON.stringify(rubricData, null, 2));
          
          // Crear mapa de criterios con sus pesos reales
          const criteriaWeights = {};
          const maxLevelScore = Math.max(...rubricData.map(row => row.level_score_value));
          
          rubricData.forEach(row => {
            if (!criteriaWeights[row.criterion_id]) {
              criteriaWeights[row.criterion_id] = {
                weight: parseFloat(row.criterion_weight),
                name: row.criterion_name
              };
            }
          });
          
          console.log(`🚨🚨🚨 CRITERIA WEIGHTS MAP:`, JSON.stringify(criteriaWeights, null, 2));
          console.log(`🚨🚨🚨 MAX LEVEL SCORE VALUE:`, maxLevelScore);
          
          let totalWeightedScore = 0;
          const criteriaIds = Object.keys(criteriaWeights);
          
          for (let i = 0; i < rubricScoresArray.length && i < criteriaIds.length; i++) {
            const score = rubricScoresArray[i];
            const criterionId = criteriaIds[i];
            const criterionData = criteriaWeights[criterionId];
            
            console.log(`🚨🚨🚨 Processing criterion ${i}:`, {
              criterionId,
              criterionName: criterionData.name,
              criterionWeight: criterionData.weight,
              scoreData: score
            });
            
            // ADAPTARSE AL FORMATO QUE LLEGA DESDE EL FRONTEND
            let levelScore, weight;
            
            if (score.points !== undefined) {
              // Formato del frontend: { points: 10 }
              levelScore = score.points;
              weight = criterionData.weight; // USAR EL PESO REAL DE LA RÚBRICA
              console.log(`🚨🚨🚨 Frontend format: points=${levelScore}, REAL weight=${weight} (${criterionData.name})`);
            } else if (score.levelScore !== undefined && score.weight !== undefined) {
              // Formato esperado: { levelScore: 10, weight: 0.2 }
              levelScore = score.levelScore;
              weight = score.weight;
              console.log(`🚨🚨🚨 Expected format: levelScore=${levelScore}, weight=${weight}`);
            } else {
              console.log(`🚨🚨🚨 Unknown format, using defaults`);
              levelScore = 0;
              weight = criterionData.weight;
            }
            
            // USAR LA FÓRMULA CORREGIDA: levelScore * weight * 10 
            const earnedPoints = levelScore * weight * 10;
            totalWeightedScore += earnedPoints;
            console.log(`🚨🚨🚨 CALCULATION FOR ${criterionData.name}: ${levelScore} * ${weight} * 10 = ${earnedPoints}`);
          }
          
          normalizedGrade = Math.round(totalWeightedScore);
          console.log(`🚨🚨🚨 FINAL RUBRIC CALCULATION WITH REAL WEIGHTS: ${totalWeightedScore} rounded to ${normalizedGrade}/100`);
        } else {
          // Fallback al método anterior si no hay rubricScores
          console.log(`❌❌❌ RUBRIC ARRAY CHECK FAILED - Falling back to basic calculation`);
          console.log(`❌❌❌ rubricScoresArray:`, rubricScoresArray);
          console.log(`❌❌❌ rubricScoresArray type:`, typeof rubricScoresArray);
          
          const originalPoints = gradeData.totalPoints || gradeData.numericGrade || 0;
          const maxPoints = gradeData.maxPoints || 100;
          normalizedGrade = Math.round((originalPoints / maxPoints) * 100);
          console.log(`🔢 Fallback Rubric ${originalPoints}/${maxPoints} normalized to: ${normalizedGrade}/100`);
        }
        
        updateQuery = `
          UPDATE exam_grades 
          SET 
            rubric_scores = $1,
            numeric_grade = $2,
            emoji_grade = NULL,
            letter_grade = $3,
            grade_scale = '100',
            comments = $4,
            attendance_status = $5,
            graded_at = $6,
            updated_at = $6
          WHERE task_id = $7 AND student_id = $8
        `;
        updateParams = [
          JSON.stringify(rubricScoresArray || []),
          normalizedGrade,
          gradeData.letterGrade || null,
          gradeData.comments || null,
          gradeData.attendanceStatus || 'present',
          currentTime,
          taskId,
          studentId
        ];
        
        console.log('🚨🚨🚨 DATABASE UPDATE PARAMS BEFORE SAVE:');
        console.log('🚨🚨🚨 normalizedGrade (param $2):', normalizedGrade);
        console.log('🚨🚨🚨 normalizedGrade type:', typeof normalizedGrade);
        console.log('🚨🚨🚨 All updateParams:', updateParams);

        insertQuery = `
          INSERT INTO exam_grades (
            id, task_id, student_id, graded_by_teacher_id,
            rubric_scores, numeric_grade, emoji_grade, letter_grade, grade_scale,
            comments, attendance_status, graded_at, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, NULL, $6, '100', $7, $8, $9, $9, $9
          )
        `;
        insertParams = [
          taskId,
          studentId,
          teacherId,
          JSON.stringify(rubricScoresArray || []),
          normalizedGrade,
          gradeData.letterGrade || null,
          gradeData.comments || null,
          gradeData.attendanceStatus || 'present',
          currentTime
        ];
        
        console.log('🚨🚨🚨 DATABASE INSERT PARAMS BEFORE SAVE:');
        console.log('🚨🚨🚨 normalizedGrade (param $5):', normalizedGrade);
        console.log('🚨🚨🚨 normalizedGrade type:', typeof normalizedGrade);
        console.log('🚨🚨🚨 All insertParams:', insertParams);

      } else {
        // Evaluación numérica (score) - Guardar nota ORIGINAL, no normalizada
        console.log(`🔢 Processing numeric evaluation: ${gradeData.numericGrade}`);

        const originalGrade = gradeData.numericGrade;

        // GUARDAR LA NOTA ORIGINAL tal cual la puso el profesor
        // El frontend mostrará "35/47" usando originalGrade y taskMaxPoints
        normalizedGrade = originalGrade; // Guardar la nota original, NO normalizada

        // Guardar metadata con la información original para visualización
        const gradeMetadata = JSON.stringify({
          originalGrade: originalGrade,
          maxPoints: taskMaxPoints,
          percentage: Math.round((originalGrade / taskMaxPoints) * 100)
        });

        console.log(`🔢 Saving original grade: ${originalGrade}/${taskMaxPoints} (${Math.round((originalGrade / taskMaxPoints) * 100)}%)`);

        updateQuery = `
          UPDATE exam_grades
          SET
            numeric_grade = $1,
            emoji_grade = NULL,
            rubric_scores = NULL,
            letter_grade = $2,
            grade_scale = $3,
            comments = $4,
            attendance_status = $5,
            metadata = $6,
            graded_at = $7,
            updated_at = $7
          WHERE task_id = $8 AND student_id = $9
        `;
        updateParams = [
          normalizedGrade,
          gradeData.letterGrade || null,
          String(taskMaxPoints), // Guardar maxPoints como grade_scale para referencia
          gradeData.comments || null,
          gradeData.attendanceStatus || 'present',
          gradeMetadata,
          currentTime,
          taskId,
          studentId
        ];

        insertQuery = `
          INSERT INTO exam_grades (
            id, task_id, student_id, graded_by_teacher_id,
            numeric_grade, emoji_grade, rubric_scores, letter_grade, grade_scale,
            comments, attendance_status, metadata, graded_at, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NULL, NULL, $5, $6, $7, $8, $9, $10, $10, $10
          )
        `;
        insertParams = [
          taskId,
          studentId,
          teacherId,
          normalizedGrade,
          gradeData.letterGrade || null,
          String(taskMaxPoints), // Guardar maxPoints como grade_scale
          gradeData.comments || null,
          gradeData.attendanceStatus || 'present',
          gradeMetadata,
          currentTime
        ];
      }

      console.log(`💾 NORMALIZED GRADE BEING SAVED: ${normalizedGrade}/100`);

      // Ejecutar la consulta correspondiente
      if (existingGrade.length > 0) {
        await this.dataSource.query(updateQuery, updateParams);
        console.log(`✅ Updated existing ${evaluationType} grade for student ${studentId} with normalized grade: ${normalizedGrade}/100`);
      } else {
        await this.dataSource.query(insertQuery, insertParams);
        console.log(`✅ Created new ${evaluationType} grade for student ${studentId} with normalized grade: ${normalizedGrade}/100`);
      }
      
      // VERIFICACIÓN POST-GUARDADO: Leer lo que realmente se guardó en la base de datos
      const savedGrade = await this.dataSource.query(`
        SELECT numeric_grade, rubric_scores FROM exam_grades
        WHERE task_id = $1 AND student_id = $2
      `, [taskId, studentId]);

      console.log('🚨🚨🚨 VERIFICATION: What was actually saved in database:');
      console.log('🚨🚨🚨 Saved numeric_grade:', savedGrade[0]?.numeric_grade);
      console.log('🚨🚨🚨 Saved rubric_scores:', savedGrade[0]?.rubric_scores);

      // AUTO-PUBLICAR: Cuando se califica un Test Yourself, automáticamente publicarlo
      // Esto permite que las calificaciones aparezcan inmediatamente en "Mis Calificaciones" del estudiante
      const taskStatusCheck = await this.dataSource.query(`
        SELECT status FROM tasks WHERE id = $1
      `, [taskId]);

      if (taskStatusCheck.length > 0 && taskStatusCheck[0].status !== 'published' && taskStatusCheck[0].status !== 'closed') {
        await this.dataSource.query(`
          UPDATE tasks SET status = 'published', "updatedAt" = NOW() WHERE id = $1
        `, [taskId]);
        console.log(`📢 [AUTO-PUBLISH] Tarea ${taskId} publicada automáticamente al calificar`);
      }

      // AUTO-ASIGNACIÓN: Crear task_submission automáticamente si no existe
      // Esto asegura que el estudiante esté "asignado" a la tarea cuando se le califica
      const existingSubmission = await this.dataSource.query(`
        SELECT id FROM task_submissions WHERE "taskId" = $1 AND "studentId" = $2
      `, [taskId, studentId]);

      if (existingSubmission.length === 0) {
        await this.dataSource.query(`
          INSERT INTO task_submissions (id, "taskId", "studentId", status, "isExamNotification", content, "submittedAt", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, 'not_submitted', true, 'Asignado automáticamente al calificar', NOW(), NOW(), NOW())
        `, [taskId, studentId]);
        console.log(`📋 [AUTO-ASSIGN] Estudiante ${studentId} asignado automáticamente a tarea ${taskId}`);
      }

      // SP-D2a: recálculo síncrono fail-soft (resuelve subjectAssignmentId por taskId).
      await this.recalcExamGradeByTaskSafe(taskId, studentId);
      await this.deriveTaskCriteriaSafe(taskId, studentId);

      return {
        success: true,
        message: `Calificación ${evaluationType} guardada correctamente (${normalizedGrade}/100)`,
        evaluationType,
        normalizedGrade,
        originalGrade: gradeData.numericGrade || gradeData.emojiGrade || 'rubric'
      };
    } catch (error) {
      console.error('❌ GRADE EXAM STUDENT ERROR:', error);
      throw error;
    }
  }

  /**
   * Calificar estudiante en Test Yourself con rúbrica completa
   */
  async gradeExamStudentWithRubric(taskId: string, studentId: string, gradeData: any, teacherId: string) {
    try {
      console.log('🔴🔴🔴 ===================================================');
      console.log('🔴🔴🔴 SERVICE METHOD REACHED - gradeExamStudentWithRubric');
      console.log('🔴🔴🔴 ===================================================');
      console.log('🎯 [TEST YOURSELF RUBRIC] Service called: gradeExamStudentWithRubric');
      console.log('🎯 [TEST YOURSELF RUBRIC] taskId:', taskId);
      console.log('🎯 [TEST YOURSELF RUBRIC] studentId:', studentId);
      console.log('🎯 [TEST YOURSELF RUBRIC] teacherId:', teacherId);
      console.log('🎯 [TEST YOURSELF RUBRIC] gradeData:', JSON.stringify(gradeData));
      console.log('🎯 [TEST YOURSELF RUBRIC] About to start task validation...');

      // Verificar que la tarea existe y es de tipo exam con rubric
      console.log('🎯 [DEBUG SQL] About to execute query...');
      console.log('🎯 [DEBUG SQL] Params - taskId:', taskId, 'teacherId:', teacherId);
      console.log('🎯 [DEBUG SQL] Starting dataSource.query...');
      const taskCheck = await this.dataSource.query(`
        SELECT t.id, t."valuationType", t."rubricId", t."taskType", r.id as rubric_exists
        FROM tasks t
        INNER JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
        LEFT JOIN rubrics r ON t."rubricId" = r.id
        WHERE t.id = $1 AND t."taskType" = 'exam' AND sa."teacherId" = $2
      `, [taskId, teacherId]);

      console.log('🎯 [DEBUG SQL] Query result:', JSON.stringify(taskCheck, null, 2));

      if (taskCheck.length === 0) {
        console.log('🎯 [DEBUG SQL] No task found - checking without teacher filter');
        const taskCheckNoTeacher = await this.dataSource.query(`
          SELECT t.id, t."valuationType", t."rubricId", t."taskType", r.id as rubric_exists, sa."teacherId"
          FROM tasks t
          INNER JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
          LEFT JOIN rubrics r ON t."rubricId" = r.id
          WHERE t.id = $1
        `, [taskId]);
        console.log('🎯 [DEBUG SQL] Task without teacher filter:', JSON.stringify(taskCheckNoTeacher, null, 2));
        throw new NotFoundException('Tarea no encontrada o sin permisos');
      }

      const task = taskCheck[0];
      console.log('🎯 [DEBUG VALIDATION] Task validation details:', {
        valuationType: task.valuationType,
        rubric_exists: task.rubric_exists,
        taskType: task.taskType,
        rubricId: task.rubricId
      });

      // FIXED: Solo verificar que exista rubricId, permitir cualquier valuationType
      // Esto permite usar rúbricas incluso si la tarea fue configurada inicialmente con "score"
      if (!task.rubric_exists) {
        console.log('🎯 [DEBUG VALIDATION] Validation failed: No rubric assigned');
        throw new BadRequestException('Esta tarea no tiene una rúbrica asignada');
      }

      console.log('🎯 [TEST YOURSELF RUBRIC] Task validated:', task);

      // Verificar que el estudiante existe
      const studentCheck = await this.dataSource.query(`
        SELECT id FROM students WHERE id = $1
      `, [studentId]);

      if (studentCheck.length === 0) {
        throw new NotFoundException('Estudiante no encontrado');
      }

      // Calcular nota final usando la misma lógica que tareas regulares
      console.log('🎯 [TEST YOURSELF RUBRIC] About to calculate grade with data:', {
        rubricId: task.rubricId,
        selectedCellsCount: gradeData.selectedCells?.length,
        selectedCells: gradeData.selectedCells
      });
      
      const finalGrade = await this.calculateRubricGradeForTestYourself(
        task.rubricId, 
        gradeData.selectedCells
      );

      console.log('🎯 [TEST YOURSELF RUBRIC] Final grade calculated:', finalGrade);

      // Preparar datos para almacenar en exam_grades
      const currentTime = new Date().toISOString();
      const normalizedGrade = Math.round(finalGrade * 100) / 100; // Redondear a 2 decimales

      // Verificar si ya existe una calificación
      const existingGrade = await this.dataSource.query(`
        SELECT id FROM exam_grades 
        WHERE task_id = $1 AND student_id = $2
      `, [taskId, studentId]);

      let gradeId: string;

      if (existingGrade.length > 0) {
        // Actualizar calificación existente
        console.log('🎯 [TEST YOURSELF RUBRIC] Updating existing grade');
        
        await this.dataSource.query(`
          UPDATE exam_grades 
          SET 
            numeric_grade = $3,
            comments = $4,
            attendance_status = $5,
            graded_at = $6,
            updated_at = $7
          WHERE task_id = $1 AND student_id = $2
        `, [
          taskId, 
          studentId, 
          normalizedGrade,
          gradeData.teacherFeedback || gradeData.privateNotes || '',
          gradeData.attendanceStatus || 'present',
          gradeData.gradedAt || currentTime,
          currentTime
        ]);
        
        gradeId = existingGrade[0].id;
      } else {
        // Crear nueva calificación
        console.log('🎯 [TEST YOURSELF RUBRIC] Creating new grade');
        
        const newGradeResult = await this.dataSource.query(`
          INSERT INTO exam_grades (
            task_id, student_id, graded_by_teacher_id, numeric_grade, 
            comments, attendance_status, graded_at,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          taskId, 
          studentId, 
          teacherId,
          normalizedGrade,
          gradeData.teacherFeedback || gradeData.privateNotes || '',
          gradeData.attendanceStatus || 'present',
          gradeData.gradedAt || currentTime,
          currentTime,
          currentTime
        ]);
        
        gradeId = newGradeResult[0].id;
      }

      // Limpiar scores de rúbrica existentes para esta calificación
      await this.dataSource.query(`
        DELETE FROM exam_grade_rubric_scores 
        WHERE exam_grade_id = $1
      `, [gradeId]);

      // Insertar nuevos scores de rúbrica
      if (gradeData.selectedCells && gradeData.selectedCells.length > 0) {
        console.log('🎯 [TEST YOURSELF RUBRIC] Inserting rubric scores:', gradeData.selectedCells.length);
        
        for (const cell of gradeData.selectedCells) {
          let levelId = cell.levelId;
          
          // Si tenemos levelIndex, convertir a levelId
          if (cell.levelIndex !== undefined && !levelId) {
            const levels = await this.dataSource.query(`
              SELECT rl.id FROM rubric_levels rl
              WHERE rl."rubricId" = (SELECT "rubricId" FROM rubric_criteria WHERE id = $1)
              ORDER BY rl."scoreValue" ASC
            `, [cell.criterionId]);
            
            if (cell.levelIndex < levels.length) {
              levelId = levels[cell.levelIndex].id;
            }
          }
          
          // Obtener información del criterio y nivel
          const cellInfo = await this.dataSource.query(`
            SELECT 
              rc.id as criterion_id,
              rc.name as criterion_name,
              rc.weight as criterion_weight,
              rl.id as level_id,
              rl.name as level_name,
              rl."scoreValue" as level_score
            FROM rubric_criteria rc
            INNER JOIN rubric_levels rl ON rl."rubricId" = rc."rubricId"
            WHERE rc.id = $1 AND rl.id = $2
          `, [cell.criterionId, levelId]);

          if (cellInfo.length > 0) {
            const info = cellInfo[0];
            await this.dataSource.query(`
              INSERT INTO exam_grade_rubric_scores (
                exam_grade_id, criterion_id, criterion_name, level_id, 
                level_name, points, weight, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              gradeId,
              info.criterion_id,
              info.criterion_name,
              info.level_id,
              info.level_name,
              info.level_score,
              info.criterion_weight,
              currentTime
            ]);
          }
        }
      }

      console.log('🎯 [TEST YOURSELF RUBRIC] Grade saved successfully');

      // AUTO-PUBLICAR: Cuando se califica un Test Yourself con rúbrica, automáticamente publicarlo
      // Esto permite que las calificaciones aparezcan inmediatamente en "Mis Calificaciones" del estudiante
      const taskStatusCheck = await this.dataSource.query(`
        SELECT status FROM tasks WHERE id = $1
      `, [taskId]);

      if (taskStatusCheck.length > 0 && taskStatusCheck[0].status !== 'published' && taskStatusCheck[0].status !== 'closed') {
        await this.dataSource.query(`
          UPDATE tasks SET status = 'published', "updatedAt" = NOW() WHERE id = $1
        `, [taskId]);
        console.log(`📢 [AUTO-PUBLISH] Tarea ${taskId} publicada automáticamente al calificar con rúbrica`);
      }

      // AUTO-ASIGNACIÓN: Crear task_submission automáticamente si no existe
      // Esto asegura que el estudiante esté "asignado" a la tarea cuando se le califica con rúbrica
      const existingSubmission = await this.dataSource.query(`
        SELECT id FROM task_submissions WHERE "taskId" = $1 AND "studentId" = $2
      `, [taskId, studentId]);

      if (existingSubmission.length === 0) {
        await this.dataSource.query(`
          INSERT INTO task_submissions (id, "taskId", "studentId", status, "isExamNotification", content, "submittedAt", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, 'not_submitted', true, 'Asignado automáticamente al calificar con rúbrica', NOW(), NOW(), NOW())
        `, [taskId, studentId]);
        console.log(`📋 [AUTO-ASSIGN RUBRIC] Estudiante ${studentId} asignado automáticamente a tarea ${taskId}`);
      }

      // SP-D2a: recálculo síncrono fail-soft (resuelve subjectAssignmentId por taskId).
      await this.recalcExamGradeByTaskSafe(taskId, studentId);
      await this.deriveTaskCriteriaSafe(taskId, studentId);

      return {
        success: true,
        gradeId,
        finalGrade: normalizedGrade,
        percentage: normalizedGrade,
        message: 'Calificación con rúbrica guardada exitosamente'
      };

    } catch (error) {
      console.error('🎯 [TEST YOURSELF RUBRIC] Error in gradeExamStudentWithRubric:', error);
      throw error;
    }
  }

  /**
   * Calcular nota final de rúbrica para Test Yourself (maneja levelIndex)
   */
  private async calculateRubricGradeForTestYourself(
    rubricId: string, 
    selectedCells: Array<{criterionId: string, levelIndex?: number, levelId?: string, score?: number}>
  ): Promise<number> {
    try {
      console.log('🗺️ [RUBRIC CALC] Calculating grade for rubric:', rubricId);
      console.log('🗺️ [RUBRIC CALC] Selected cells:', selectedCells);
      console.log('🗺️ [RUBRIC CALC] Selected cells length:', selectedCells?.length);
      console.log('🗺️ [RUBRIC CALC] About to query levels...');

      // Obtener todos los niveles de la rúbrica ordenados por scoreValue
      const levels = await this.dataSource.query(`
        SELECT rl.id, rl."scoreValue"
        FROM rubric_levels rl
        WHERE rl."rubricId" = $1
        ORDER BY rl."scoreValue" ASC
      `, [rubricId]);

      console.log('🗺️ [RUBRIC CALC] Available levels:', levels);
      console.log('🗺️ [RUBRIC CALC] About to enter cell processing loop...');

      let totalPoints = 0;

      // Calcular puntos usando la misma fórmula que tareas regulares
      console.log('🗺️ [RUBRIC CALC] Starting loop with selectedCells:', selectedCells);
      for (const cell of selectedCells) {
        console.log(`🗺️ [RUBRIC CALC] === PROCESSING CELL START ===`);
        console.log(`🗺️ [RUBRIC CALC] Processing cell:`, {
          criterionId: cell.criterionId,
          levelIndex: cell.levelIndex,
          levelId: cell.levelId,
          score: cell.score
        });
        
        // SIEMPRE usar score directo si está disponible (frontend envía score: 10)
        if (cell.score !== undefined) {
          const criterionData = await this.dataSource.query(`
            SELECT rc.weight as criterion_weight
            FROM rubric_criteria rc
            WHERE rc.id = $1 AND rc."rubricId" = $2
          `, [cell.criterionId, rubricId]);

          console.log(`🗺️ [RUBRIC CALC] Criterion query result:`, criterionData);

          if (criterionData.length > 0) {
            const { criterion_weight } = criterionData[0];
            const earnedPoints = cell.score * criterion_weight;
            totalPoints += earnedPoints;
            
            console.log(`🗺️ [RUBRIC CALC] SUCCESS - Criterion: ${cell.criterionId}`);
            console.log(`🗺️ [RUBRIC CALC] - Direct score: ${cell.score}`);
            console.log(`🗺️ [RUBRIC CALC] - Weight: ${criterion_weight}`);
            console.log(`🗺️ [RUBRIC CALC] - Earned points: ${earnedPoints}`);
            console.log(`🗺️ [RUBRIC CALC] - Running total: ${totalPoints}`);
          } else {
            console.error(`🗺️ [RUBRIC CALC] ERROR - No criterion data found for ${cell.criterionId}`);
          }
        } else {
          // Fallback: convertir levelIndex a levelId si es necesario
          let levelId = cell.levelId;
          
          if (cell.levelIndex !== undefined && !levelId) {
            if (cell.levelIndex < levels.length) {
              levelId = levels[cell.levelIndex].id;
              console.log(`🗺️ [RUBRIC CALC] Converted levelIndex ${cell.levelIndex} to levelId ${levelId}`);
            } else {
              console.warn(`🗺️ [RUBRIC CALC] Invalid levelIndex ${cell.levelIndex}, max is ${levels.length - 1}`);
              continue;
            }
          }

          if (levelId) {
            // Usar levelId para obtener la información
            const cellData = await this.dataSource.query(`
              SELECT 
                rc.weight as criterion_weight,
                rl."scoreValue" as level_score
              FROM rubric_criteria rc
              INNER JOIN rubric_levels rl ON rl."rubricId" = rc."rubricId"
              WHERE rc.id = $1 AND rl.id = $2
            `, [cell.criterionId, levelId]);

            if (cellData.length > 0) {
              const { criterion_weight, level_score } = cellData[0];
              
              // Fórmula corregida: levelScore * criterionWeight * 10
              const earnedPoints = level_score * criterion_weight * 10;
              totalPoints += earnedPoints;
              
              console.log(`🗺️ [RUBRIC CALC] SUCCESS - Criterion: ${cell.criterionId}`);
              console.log(`🗺️ [RUBRIC CALC] - Level score: ${level_score}`);
              console.log(`🗺️ [RUBRIC CALC] - Weight: ${criterion_weight}`);
              console.log(`🗺️ [RUBRIC CALC] - Earned points: ${earnedPoints}`);
              console.log(`🗺️ [RUBRIC CALC] - Running total: ${totalPoints}`);
            } else {
              console.error(`🗺️ [RUBRIC CALC] ERROR - No level data found for criterion ${cell.criterionId} and level ${levelId}`);
            }
          } else {
            console.error(`🗺️ [RUBRIC CALC] ERROR - No levelId or valid levelIndex for ${cell.criterionId}`);
          }
        }
      }

      console.log('🗺️ [RUBRIC CALC] Total points calculated:', totalPoints);
      return Math.round(totalPoints * 100) / 100; // Round to 2 decimal places
      
    } catch (error) {
      console.error('🗺️ [RUBRIC CALC] Error calculating rubric grade:', error);
      throw error;
    }
  }

  /**
   * Obtener calificaciones Test Yourself de un estudiante (LEGACY)
   */
  async getStudentExamGradesLegacy(studentId: string) {
    try {
      console.log('🎓 [STUDENT EXAM GRADES] Service - studentId:', studentId);
      
      // Obtener todas las calificaciones del estudiante con información de la tarea
      const examGrades = await this.dataSource.query(`
        SELECT 
          eg.id,
          eg.numeric_grade,
          eg.letter_grade,
          eg.comments,
          eg.attendance_status,
          eg.graded_at,
          eg.created_at,
          t.id as task_id,
          t.title as task_title,
          t.description as task_description,
          t."valuationType" as evaluation_type,
          s.name as subject_name,
          s.code as subject_code,
          cg.name as class_group_name,
          -- Información del profesor
          up."firstName" as teacher_first_name,
          up."lastName" as teacher_last_name
        FROM exam_grades eg
        INNER JOIN tasks t ON eg.task_id = t.id
        INNER JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
        INNER JOIN subjects s ON sa."subjectId" = s.id
        INNER JOIN class_groups cg ON sa."classGroupId" = cg.id
        INNER JOIN teachers te ON sa."teacherId" = te.id
        INNER JOIN users u ON te."userId" = u.id
        INNER JOIN user_profiles up ON u.id = up."userId"
        WHERE eg.student_id = $1
        AND t."taskType" = 'exam'
        ORDER BY eg.graded_at DESC
      `, [studentId]);
      
      console.log(`🎓 [STUDENT EXAM GRADES] Found ${examGrades.length} exam grades`);
      
      // Para cada calificación, obtener los scores de rúbrica si existen
      const gradesWithRubricScores = await Promise.all(
        examGrades.map(async (grade) => {
          let rubricScores = [];
          
          if (grade.evaluation_type === 'rubric') {
            const scores = await this.dataSource.query(`
              SELECT 
                egrs.criterion_id,
                egrs.criterion_name,
                egrs.level_id,
                egrs.level_name,
                egrs.points,
                egrs.weight
              FROM exam_grade_rubric_scores egrs
              WHERE egrs.exam_grade_id = $1
              ORDER BY egrs.criterion_name
            `, [grade.id]);
            
            rubricScores = scores;
          }
          
          return {
            id: grade.id,
            numericGrade: grade.numeric_grade,
            letterGrade: grade.letter_grade,
            comments: grade.comments,
            attendanceStatus: grade.attendance_status,
            gradedAt: grade.graded_at,
            createdAt: grade.created_at,
            evaluationType: grade.evaluation_type,
            rubricScores,
            task: {
              id: grade.task_id,
              title: grade.task_title,
              description: grade.task_description,
              subject: {
                name: grade.subject_name,
                code: grade.subject_code
              },
              classGroup: {
                name: grade.class_group_name
              },
              teacher: {
                firstName: grade.teacher_first_name,
                lastName: grade.teacher_last_name
              }
            }
          };
        })
      );
      
      console.log('🎓 [STUDENT EXAM GRADES] Returning processed grades:', gradesWithRubricScores.length);
      return gradesWithRubricScores;
      
    } catch (error) {
      console.error('🎓 [STUDENT EXAM GRADES] Error:', error);
      throw error;
    }
  }

  /**
   * Eliminar calificación de un estudiante
   */
  async deleteExamGrade(taskId: string, studentId: string, teacherId: string) {
    try {
      console.log(`🗑️ DELETE EXAM GRADE - Task: ${taskId}, Student: ${studentId}`);

      // Verificar permisos
      const taskCheck = await this.dataSource.query(`
        SELECT t.id 
        FROM tasks t
        INNER JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
        WHERE t.id = $1 AND t."taskType" = 'exam' AND sa."teacherId" = $2
      `, [taskId, teacherId]);

      if (taskCheck.length === 0) {
        throw new NotFoundException('Tarea no encontrada o sin permisos');
      }

      // Eliminar calificación
      const result = await this.dataSource.query(`
        DELETE FROM exam_grades 
        WHERE task_id = $1 AND student_id = $2
      `, [taskId, studentId]);

      console.log(`✅ Deleted grade for student ${studentId}`);
      return { success: true, message: 'Calificación eliminada correctamente' };
    } catch (error) {
      console.error('❌ DELETE EXAM GRADE ERROR:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de calificaciones de un estudiante
   */
  async getExamGradeHistory(taskId: string, studentId: string, teacherId: string) {
    try {
      console.log(`📜 GET EXAM GRADE HISTORY - Task: ${taskId}, Student: ${studentId}`);

      // Verificar permisos
      const taskCheck = await this.dataSource.query(`
        SELECT t.id 
        FROM tasks t
        INNER JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
        WHERE t.id = $1 AND t."taskType" = 'exam' AND sa."teacherId" = $2
      `, [taskId, teacherId]);

      if (taskCheck.length === 0) {
        throw new NotFoundException('Tarea no encontrada o sin permisos');
      }

      // Obtener historial completo de calificaciones
      const history = await this.dataSource.query(`
        SELECT 
          egh.id,
          egh.numeric_grade,
          egh.letter_grade,
          egh.grade_scale,
          egh.comments,
          egh.attendance_status,
          egh.emoji_grade,
          egh.rubric_scores,
          egh.action_type,
          egh.graded_at,
          egh.created_at,
          t.title as task_title,
          p."firstName" as teacher_first_name,
          p."lastName" as teacher_last_name,
          sp."firstName" as student_first_name,
          sp."lastName" as student_last_name
        FROM exam_grade_history egh
        INNER JOIN tasks t ON egh.task_id = t.id
        INNER JOIN teachers teach ON egh.graded_by_teacher_id = teach.id
        INNER JOIN users u ON teach."userId" = u.id
        INNER JOIN user_profiles p ON u.id = p."userId"
        INNER JOIN students s ON egh.student_id = s.id
        INNER JOIN users su ON s."userId" = su.id
        INNER JOIN user_profiles sp ON su.id = sp."userId"
        WHERE egh.task_id = $1 AND egh.student_id = $2
        ORDER BY egh.created_at DESC
      `, [taskId, studentId]);

      console.log(`📜 Found ${history.length} history entries`);

      return {
        taskId,
        studentId,
        totalEntries: history.length,
        history: history.map(entry => ({
          id: entry.id,
          numericGrade: entry.numeric_grade,
          letterGrade: entry.letter_grade,
          gradeScale: entry.grade_scale,
          comments: entry.comments,
          attendanceStatus: entry.attendance_status,
          emojiGrade: entry.emoji_grade,
          rubricScores: entry.rubric_scores,
          actionType: entry.action_type,
          gradedAt: entry.graded_at,
          createdAt: entry.created_at,
          taskTitle: entry.task_title,
          teacherName: `${entry.teacher_first_name} ${entry.teacher_last_name}`,
          studentName: `${entry.student_first_name} ${entry.student_last_name}`
        }))
      };
    } catch (error) {
      console.error('❌ GET EXAM GRADE HISTORY ERROR:', error);
      throw error;
    }
  }

  /**
   * Get all exam grades for a student (for student's own "Mis Test Yourself" page)
   */
  async getStudentExamGrades(userId: string): Promise<any[]> {
    console.log('🎓🎓🎓 *** MÉTODO CELL_CONTENT EJECUTÁNDOSE *** GET STUDENT EXAM GRADES SERVICE - UserId:', userId);
    console.log('🎓 SERVICE - UserId type:', typeof userId);
    console.log('🎓 SERVICE - UserId length:', userId?.length);

    try {
      // First, find the student by user ID
      console.log('🔍 SERVICE - Buscando estudiante por userId:', userId);
      const student = await this.studentsRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user']
      });

      if (!student) {
        console.log('❌ SERVICE - Student not found for user:', userId);
        return [];
      }

      console.log('👤 SERVICE - Found student:', student.id, student.enrollmentNumber);

      // Get all exam grades for this student with full relations - using QueryBuilder for better control
      const examGrades = await this.examGradesRepository
        .createQueryBuilder('examGrade')
        .leftJoinAndSelect('examGrade.task', 'task')
        .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
        .leftJoinAndSelect('subjectAssignment.subject', 'subject')
        .leftJoinAndSelect('examGrade.gradedByTeacher', 'gradedByTeacher')
        .leftJoinAndSelect('gradedByTeacher.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('examGrade.studentId = :studentId', { studentId: student.id })
        .orderBy('examGrade.gradedAt', 'DESC')
        .getMany();

      console.log(`📊 Found ${examGrades.length} exam grades for student ${student.id}`);
      
      // Debug: Log the first grade's task valuationType
      if (examGrades.length > 0) {
        console.log('🔍 DEBUG - First grade task valuationType:', examGrades[0].task.valuationType);
        console.log('🔍 DEBUG - First grade task ID:', examGrades[0].task.id);
        
        // Let's also do a direct query to verify the valuationType
        const directTask = await this.dataSource.query(`
          SELECT id, title, value_type 
          FROM tasks 
          WHERE id = $1
        `, [examGrades[0].task.id]);
        console.log('🔍 DEBUG - Direct SQL result:', directTask);
      }

      // Para cada calificación, obtener los scores de rúbrica si existen
      const gradesWithRubricScores = await Promise.all(
        examGrades.map(async (grade) => {
          let rubricScores = [];
          
          // Get the correct valuationType from direct SQL query first
          const taskData = await this.dataSource.query(`
            SELECT value_type 
            FROM tasks 
            WHERE id = $1
          `, [grade.task.id]);
          
          const correctValueType = taskData[0]?.value_type || grade.task.valuationType;
          
          // Verificar si hay rubric scores en la tabla separada
          console.log('🔍 [TEST YOURSELF DEBUG] Checking rubric condition. ValueType:', correctValueType, 'GradeID:', grade.id);
          if (correctValueType === 'rubric') {
            // Consulta mejorada que incluye el contenido real de las celdas de la rúbrica
            // NOTA: rubric_cells usa camelCase (criterionId, levelId) mientras que exam_grade_rubric_scores usa snake_case
            const scores = await this.dataSource.query(`
              SELECT
                egrs.criterion_id,
                egrs.criterion_name,
                egrs.level_id,
                egrs.level_name,
                egrs.points,
                egrs.weight,
                rc.content as cell_content
              FROM exam_grade_rubric_scores egrs
              LEFT JOIN rubric_cells rc ON rc."criterionId"::text = egrs.criterion_id::text
                AND rc."levelId"::text = egrs.level_id::text
              WHERE egrs.exam_grade_id = $1
              ORDER BY egrs.criterion_name
            `, [grade.id]);

            // Generar contenido si no existe en la base de datos
            console.log('🔍 [TEST YOURSELF DEBUG] Processing rubric scores with cell_content:', scores.length);
            const scoresWithContent = scores.map(score => {
              // Si ya tiene contenido de la celda real, usarlo
              if (score.cell_content) {
                console.log(`✅ [CELL CONTENT] Found real cell content for ${score.criterion_name}: "${score.cell_content.substring(0, 50)}..."`);
                return score;
              }

              // Si no tiene contenido real, generar uno educativo
              let cellContent = '';
              const levelName = score.level_name.toLowerCase();
              const criterionName = score.criterion_name.toLowerCase();

              if (levelName.includes('excelente')) {
                cellContent = `El estudiante demuestra un dominio excepcional en ${criterionName}, superando las expectativas del nivel.`;
              } else if (levelName.includes('bueno')) {
                cellContent = `El estudiante muestra un buen desempeño en ${criterionName}, cumpliendo satisfactoriamente con los objetivos.`;
              } else if (levelName.includes('suficiente')) {
                cellContent = `El estudiante alcanza un nivel suficiente en ${criterionName}, cumpliendo con los requisitos mínimos.`;
              } else if (levelName.includes('mejorable')) {
                cellContent = `El estudiante presenta dificultades en ${criterionName} y necesita refuerzo adicional.`;
              } else if (levelName.includes('insuficiente')) {
                cellContent = `El estudiante no alcanza el nivel esperado en ${criterionName} y requiere apoyo significativo.`;
              } else if (levelName.includes('nulo')) {
                cellContent = `El estudiante no demuestra evidencia de logro en ${criterionName}.`;
              } else {
                cellContent = `Nivel ${score.level_name} alcanzado en ${criterionName}.`;
              }

              console.log(`🔧 [CELL CONTENT] Generated content for ${score.criterion_name}: "${cellContent.substring(0, 50)}..."`);
              return {
                ...score,
                cell_content: cellContent
              };
            });

            rubricScores = scoresWithContent;
          }

          // correctValueType was already calculated above

          // Obtener información completa de la rúbrica (todos los niveles disponibles)
          let rubricInfo = null;
          if (correctValueType === 'rubric') {
            // Obtener el rubric_id de la tarea
            const taskRubricData = await this.dataSource.query(`
              SELECT t."rubricId", r.name as rubric_name
              FROM tasks t
              LEFT JOIN rubrics r ON r.id = t."rubricId"
              WHERE t.id = $1
            `, [grade.task.id]);

            if (taskRubricData[0]?.rubricId) {
              const rubricId = taskRubricData[0].rubricId;

              // Obtener todos los niveles de la rúbrica (únicos por scoreValue)
              const allLevels = await this.dataSource.query(`
                SELECT DISTINCT ON (rl."scoreValue")
                  rl.id,
                  rl.name,
                  rl."scoreValue"
                FROM rubric_levels rl
                WHERE rl."rubricId" = $1
                ORDER BY rl."scoreValue" DESC
              `, [rubricId]);

              rubricInfo = {
                id: rubricId,
                name: taskRubricData[0].rubric_name,
                allLevels: allLevels.map(l => ({
                  id: l.id,
                  name: l.name,
                  scoreValue: parseFloat(l.scoreValue)
                }))
              };

              console.log(`📊 [RUBRIC INFO] Rubric ${rubricInfo.name} has ${allLevels.length} unique levels`);
            }
          }

          return {
            id: grade.id,
            task: {
              id: grade.task.id,
              title: grade.task.title,
              valuationType: correctValueType, // Use the correct value from direct query
              rubric: rubricInfo, // Añadir información de la rúbrica completa
              subjectAssignment: {
                subject: {
                  id: grade.task.subjectAssignment.subject.id,
                  name: grade.task.subjectAssignment.subject.name,
                  code: grade.task.subjectAssignment.subject.code,
                }
              }
            },
            numericGrade: grade.numericGrade,
            letterGrade: grade.letterGrade,
            emojiGrade: grade.emojiGrade,
            rubricScores,
            comments: grade.comments,
            gradedAt: grade.gradedAt,
            gradedByTeacher: {
              id: grade.gradedByTeacher.id,
              user: {
                profile: {
                  firstName: grade.gradedByTeacher.user.profile.firstName,
                  lastName: grade.gradedByTeacher.user.profile.lastName,
                }
              }
            }
          };
        })
      );

      return gradesWithRubricScores;

    } catch (error) {
      console.error('❌ ERROR in getStudentExamGrades:', error);
      throw new Error('Error al obtener calificaciones Test Yourself del estudiante');
    }
  }

  /**
   * Get all exam grades for a specific student by student ID (for admin use)
   */
  async getStudentExamGradesByStudentId(studentId: string): Promise<any[]> {
    console.log('👑 GET STUDENT EXAM GRADES BY STUDENT ID - StudentId:', studentId);

    try {
      // Get all exam grades for this student with full relations
      const examGrades = await this.examGradesRepository.find({
        where: { studentId: studentId },
        relations: [
          'task',
          'task.subjectAssignment',
          'task.subjectAssignment.subject',
          'gradedByTeacher',
          'gradedByTeacher.user',
          'gradedByTeacher.user.profile'
        ],
        order: { gradedAt: 'DESC' }
      });

      console.log(`📊 Found ${examGrades.length} exam grades for student ${studentId}`);

      // Return the exam grades with full information
      return examGrades.map(grade => ({
        id: grade.id,
        task: {
          id: grade.task.id,
          title: grade.task.title,
          subjectAssignment: {
            subject: {
              id: grade.task.subjectAssignment.subject.id,
              name: grade.task.subjectAssignment.subject.name,
              code: grade.task.subjectAssignment.subject.code,
            }
          }
        },
        numericGrade: grade.numericGrade,
        letterGrade: grade.letterGrade,
        emojiGrade: grade.emojiGrade,
        rubricScores: grade.rubricScores,
        gradeScale: grade.gradeScale,
        comments: grade.comments,
        gradedAt: grade.gradedAt,
        gradedByTeacher: {
          id: grade.gradedByTeacher.id,
          user: {
            profile: {
              firstName: grade.gradedByTeacher.user.profile.firstName,
              lastName: grade.gradedByTeacher.user.profile.lastName,
            }
          }
        }
      }));

    } catch (error) {
      console.error('❌ ERROR in getStudentExamGradesByStudentId:', error);
      throw new Error('Error al obtener calificaciones Test Yourself del estudiante');
    }
  }

  /**
   * Obtiene los detalles completos de evaluación de rúbrica para Test Yourself
   * Similar a getStudentRubricDetails pero para exam_grades
   */
  async getTestYourselfRubricDetails(examGradeId: string, userId: string): Promise<any> {
    try {
      console.log('🎯 [TEST YOURSELF RUBRIC] ===============================================');
      console.log('🎯 [TEST YOURSELF RUBRIC] Getting rubric details for exam grade:', examGradeId, 'user:', userId);
      console.log('🎯 [TEST YOURSELF RUBRIC] ===============================================');
      
      // 1. Verificar la exam grade y obtener datos básicos
      const examGrade = await this.dataSource.query(`
        SELECT 
          eg.id,
          eg.numeric_grade,
          eg.graded_at,
          eg.comments,
          t.id as task_id,
          t.title as task_title,
          t.max_points,
          t.rubric_id,
          s.id as student_id,
          u.id as user_id,
          up.first_name,
          up.last_name,
          sub.id as subject_id,
          sub.name as subject_name,
          sub.code as subject_code
        FROM exam_grades eg
        INNER JOIN tasks t ON eg.task_id = t.id
        INNER JOIN students s ON eg.student_id = s.id
        INNER JOIN users u ON s.user_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        INNER JOIN subject_assignments sa ON t.subject_assignment_id = sa.id
        INNER JOIN subjects sub ON sa.subject_id = sub.id
        WHERE eg.id = $1
      `, [examGradeId]);

      if (!examGrade || examGrade.length === 0) {
        throw new NotFoundException('Calificación Test Yourself no encontrada');
      }

      const grade = examGrade[0];

      // 2. Verificar permisos: el estudiante solo puede ver sus propias calificaciones
      if (grade.user_id !== userId) {
        // Verificar si es familia (puede ver calificaciones de sus hijos)
        const familyRelation = await this.dataSource.query(`
          SELECT fs.id 
          FROM family_students fs
          INNER JOIN families f ON fs.family_id = f.id
          WHERE fs.student_id = $1 AND f.primary_contact_id = $2
        `, [grade.student_id, userId]);
        
        if (!familyRelation || familyRelation.length === 0) {
          throw new ForbiddenException('No tienes permisos para ver esta evaluación');
        }
      }

      // 3. Verificar que el test tiene rúbrica
      if (!grade.rubric_id) {
        return { 
          hasRubric: false,
          message: 'Este Test Yourself no tiene una rúbrica asociada' 
        };
      }

      // 4. Obtener la rúbrica completa con criterios y niveles
      const rubric = await this.rubricsRepository.findOne({
        where: { id: grade.rubric_id },
        relations: ['criteria', 'levels', 'cells'],
      });

      if (!rubric) {
        throw new NotFoundException('Rúbrica no encontrada');
      }

      // 5. Obtener los detalles de evaluación de exam_grade_rubric_scores
      const rubricScores = await this.dataSource.query(`
        SELECT 
          egrs.criterion_id,
          egrs.criterion_name,
          egrs.level_id,
          egrs.level_name,
          egrs.points,
          egrs.weight
        FROM exam_grade_rubric_scores egrs
        WHERE egrs.exam_grade_id = $1
        ORDER BY egrs.criterion_name
      `, [examGradeId]);

      if (!rubricScores || rubricScores.length === 0) {
        return {
          hasRubric: true,
          rubric: {
            id: rubric.id,
            name: rubric.name,
            description: rubric.description,
            maxScore: rubric.maxScore,
            criteria: rubric.criteria,
            levels: rubric.levels,
          },
          isEvaluated: false,
          message: 'Este Test Yourself aún no ha sido evaluado'
        };
      }

      // 6. Construir respuesta completa con evaluación
      const evaluationDetails = rubric.criteria.map(criterion => {
        const scoreDetail = rubricScores.find(
          rs => rs.criterion_id === criterion.id
        );
        
        let selectedLevel = null;
        let selectedCell = null;
        
        if (scoreDetail) {
          selectedLevel = rubric.levels.find(level => level.id === scoreDetail.level_id);
          
          // Buscar la celda específica que contiene el texto descriptivo
          console.log(`🔍 [TEST YOURSELF RUBRIC] Looking for cell with criterionId: ${criterion.id}, levelId: ${scoreDetail.level_id}`);
          selectedCell = rubric.cells?.find(cell => 
            cell.criterionId === criterion.id && cell.levelId === scoreDetail.level_id
          );
          console.log(`🔍 [TEST YOURSELF RUBRIC] Selected cell:`, selectedCell);
        }

        return {
          criterion: {
            id: criterion.id,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
          },
          selectedLevel: selectedLevel ? {
            id: selectedLevel.id,
            name: selectedLevel.name,
            description: selectedLevel.description,
            scoreValue: selectedLevel.scoreValue,
            // Agregar el contenido específico de la celda
            cellContent: selectedCell?.content || null,
          } : null,
          score: scoreDetail?.points || 0,
          weightedScore: (scoreDetail?.points || 0) * (scoreDetail?.weight || 1),
        };
      });

      // 7. Calcular datos de evaluación
      const totalScore = rubricScores.reduce((sum, rs) => sum + (parseFloat(rs.points) || 0), 0);
      const maxPossibleScore = rubric.criteria.reduce((sum, c) => sum + (rubric.levels?.length ? Math.max(...rubric.levels.map(l => l.scoreValue)) : 4), 0);
      const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

      return {
        hasRubric: true,
        isEvaluated: true,
        rubric: {
          id: rubric.id,
          name: rubric.name,
          description: rubric.description,
          maxScore: rubric.maxScore,
          criteria: rubric.criteria,
          levels: rubric.levels,
        },
        assessment: {
          id: examGradeId,
          totalScore: totalScore,
          maxPossibleScore: maxPossibleScore,
          percentage: percentage,
          teacherFeedback: grade.comments,
          isComplete: true,
        },
        evaluationDetails,
        taskInfo: {
          id: grade.task_id,
          title: grade.task_title,
          maxPoints: grade.max_points,
        },
        submissionInfo: {
          id: examGradeId,
          finalGrade: grade.numeric_grade,
          isGraded: true,
          gradedAt: grade.graded_at,
        }
      };

    } catch (error) {
      console.error('[TEST YOURSELF RUBRIC] Error:', error);
      throw error;
    }
  }

  async attachStudentNotesToSubmission(
    submissionId: string, 
    studentNotes: AttachStudentNoteDto[], 
    userId: string
  ): Promise<{ message: string; attachedNotes: any[] }> {
    try {
      // Validate input parameters
      if (!submissionId) {
        throw new BadRequestException('ID de entrega requerido');
      }
      if (!studentNotes || studentNotes.length === 0) {
        throw new BadRequestException('No se proporcionaron apuntes para adjuntar');
      }
      if (!userId) {
        throw new BadRequestException('ID de usuario requerido');
      }

      // Find and validate submission ownership
      const submission = await this.submissionsRepository.findOne({
        where: { id: submissionId },
        relations: ['student', 'student.user', 'task'],
      });

      if (!submission) {
        throw new NotFoundException('Entrega de tarea no encontrada');
      }

      if (submission.student.user.id !== userId) {
        throw new ForbiddenException('No tienes permisos para modificar esta entrega');
      }

      // Validate that all student notes exist and belong to the user
      const noteIds = studentNotes.map(note => note.studentNoteId);
      const studentNotesEntities = await this.studentNoteRepository.find({
        where: { 
          id: In(noteIds),
          authorId: userId 
        }
      });

      if (studentNotesEntities.length !== noteIds.length) {
        throw new BadRequestException(
          'Algunos apuntes no existen o no te pertenecen'
        );
      }

      // Create attachment records for each student note
      const attachmentPromises = studentNotes.map(async (noteDto) => {
        const studentNote = studentNotesEntities.find(note => note.id === noteDto.studentNoteId);
        
        const attachment = this.submissionAttachmentsRepository.create({
          type: SubmissionAttachmentType.STUDENT_NOTE,
          submissionId: submissionId,
          studentNoteId: noteDto.studentNoteId,
          description: noteDto.description,
          status: SubmissionAttachmentStatus.VALIDATED, // Los apuntes se consideran automáticamente validados
          isActive: true,
          uploadedAt: new Date(),
          validatedAt: new Date(),
        });

        const savedAttachment = await this.submissionAttachmentsRepository.save(attachment);
        
        return {
          id: savedAttachment.id,
          type: savedAttachment.type,
          studentNote: {
            id: studentNote.id,
            title: studentNote.title,
            type: studentNote.type,
          },
          description: savedAttachment.description,
          attachedAt: savedAttachment.uploadedAt,
        };
      });

      const attachedNotes = await Promise.all(attachmentPromises);

      return {
        message: `Se adjuntaron ${attachedNotes.length} apunte${attachedNotes.length > 1 ? 's' : ''} exitosamente`,
        attachedNotes,
      };

    } catch (error) {
      console.error('[ATTACH STUDENT NOTES] Error:', error);
      
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new BadRequestException('Error al adjuntar los apuntes a la entrega');
    }
  }

}
