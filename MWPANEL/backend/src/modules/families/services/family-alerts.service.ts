/**
 * @archivo: family-alerts.service.ts
 * @módulo: Families (Servicio de Alertas)
 * @función: Detección automática y gestión de avisos importantes familiares
 * @crítico: SÍ - Sistema automático de alertas académicas
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThanOrEqual } from 'typeorm';
import { FamilyAlert, AlertType, AlertPriority } from '../entities/family-alert.entity';
import { Family, FamilyStudent } from '../../users/entities/family.entity';
import { Student } from '../../students/entities/student.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskSubmission } from '../../tasks/entities/task-submission.entity';
import { AttendanceRecord, AttendanceStatus } from '../../attendance/entities/attendance-record.entity';
import { GradesService } from '../../grades/grades.service';

export interface AlertSummaryDto {
  totalAlerts: number;
  unviewedAlerts: number;
  criticalAlerts: number;
  alertsByType: {
    [key in AlertType]: number;
  };
  alerts: FamilyAlertDto[];
}

export interface FamilyAlertDto {
  id: string;
  alertType: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  isViewed: boolean;
  createdAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  metadata?: any;
}

@Injectable()
export class FamilyAlertsService {
  private readonly logger = new Logger(FamilyAlertsService.name);

  constructor(
    @InjectRepository(FamilyAlert)
    private alertsRepository: Repository<FamilyAlert>,
    @InjectRepository(Family)
    private familiesRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentRepository: Repository<FamilyStudent>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(TaskSubmission)
    private taskSubmissionsRepository: Repository<TaskSubmission>,
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    private gradesService: GradesService,
  ) {}

  /**
   * Detecta y genera alertas automáticamente para una familia
   */
  async generateAlertsForFamily(familyId: string): Promise<void> {
    this.logger.log(`Generando alertas para familia ${familyId}`);

    try {
      // Obtener estudiantes de la familia
      const familyStudents = await this.familyStudentRepository.find({
        where: { familyId: familyId },
        relations: ['student', 'student.user', 'student.user.profile'],
      });

      this.logger.error(`DEBUG: Found ${familyStudents.length} students for family ${familyId}`);

      // Limpiar alertas obsoletas
      await this.cleanupObsoleteAlerts(familyId);

      for (const familyStudent of familyStudents) {
        const student = familyStudent.student;
        this.logger.error(`DEBUG: Processing student ${student.id} (${student.user?.profile?.firstName} ${student.user?.profile?.lastName})`);
        
        // 1. Detectar tareas pendientes
        await this.checkPendingTasks(familyId, student);
        
        // 2. Detectar calificaciones bajas por asignatura
        await this.checkLowSubjectGrades(familyId, student);
        
        // 3. Detectar tareas con calificaciones bajas
        await this.checkLowTaskGrades(familyId, student);
        
        // 4. Detectar faltas de asistencia no justificadas
        await this.checkUnjustifiedAbsences(familyId, student);
        
        // 5. Detectar ausencias y tardanzas del día actual
        await this.checkTodayAttendanceIssues(familyId, student);
        
        // 6. Detectar patrones de ausencias y tardanzas
        await this.checkAttendancePatterns(familyId, student);
        
        // 7. Detectar exámenes próximos (Test Yourself)
        await this.checkUpcomingExams(familyId, student);
      }

      this.logger.log(`Alertas generadas exitosamente para familia ${familyId}`);
    } catch (error) {
      this.logger.error(`Error generando alertas para familia ${familyId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene todas las alertas activas para una familia
   */
  async getFamilyAlerts(familyId: string): Promise<AlertSummaryDto> {
    const alerts = await this.alertsRepository.find({
      where: { 
        familyId, 
        isActive: true 
      },
      relations: ['student', 'student.user', 'student.user.profile'],
      order: { 
        priority: 'DESC', 
        createdAt: 'DESC' 
      },
    });

    const alertDtos: FamilyAlertDto[] = alerts.map(alert => ({
      id: alert.id,
      alertType: alert.alertType,
      priority: alert.priority,
      title: alert.title,
      description: alert.description,
      isViewed: alert.isViewed,
      createdAt: alert.createdAt,
      student: {
        id: alert.student.id,
        firstName: alert.student.user.profile.firstName,
        lastName: alert.student.user.profile.lastName,
      },
      metadata: alert.metadata,
    }));

    const alertsByType = Object.values(AlertType).reduce((acc, type) => {
      acc[type] = alerts.filter(a => a.alertType === type).length;
      return acc;
    }, {} as { [key in AlertType]: number });

    return {
      totalAlerts: alerts.length,
      unviewedAlerts: alerts.filter(a => !a.isViewed).length,
      criticalAlerts: alerts.filter(a => a.priority === AlertPriority.CRITICAL).length,
      alertsByType,
      alerts: alertDtos,
    };
  }

  /**
   * Marca una alerta como vista
   */
  async markAlertAsViewed(alertId: string, familyId: string): Promise<void> {
    const alert = await this.alertsRepository.findOne({
      where: { id: alertId, familyId },
    });

    if (!alert) {
      throw new Error(`Alerta ${alertId} no encontrada para familia ${familyId}`);
    }

    alert.isViewed = true;
    alert.viewedAt = new Date();
    await this.alertsRepository.save(alert);

    this.logger.log(`Alerta ${alertId} marcada como vista por familia ${familyId}`);
  }

  /**
   * Marca todas las alertas como vistas
   */
  async markAllAlertsAsViewed(familyId: string): Promise<void> {
    await this.alertsRepository.update(
      { familyId, isViewed: false },
      { 
        isViewed: true, 
        viewedAt: new Date() 
      }
    );

    this.logger.log(`Todas las alertas marcadas como vistas para familia ${familyId}`);
  }

  // ==================== MÉTODOS PRIVADOS DE DETECCIÓN ====================

  private async checkPendingTasks(familyId: string, student: Student): Promise<void> {
    this.logger.log(`Checking pending tasks for student ${student.id} (${student.user?.profile?.firstName})`);

    // Use raw SQL query to avoid any TypeORM relationship issues
    // IMPORTANTE: Excluir Test Yourself (is_test_yourself = true) de tareas pendientes
    const result = await this.taskSubmissionsRepository.query(`
      SELECT COUNT(*) as pending_count
      FROM task_submissions ts
      JOIN tasks t ON ts."taskId" = t.id
      WHERE ts."studentId" = $1
      AND ts."submittedAt" IS NULL
      AND ts."isActive" = true
      AND t."isActive" = true
      AND t."dueDate" < NOW()
      AND t."is_test_yourself" = false
    `, [student.id]);
    
    const pendingTasks = Math.max(0, parseInt(result[0].pending_count) || 0);
    
    this.logger.error(`🔥 RAW SQL QUERY RESULT: ${result[0].pending_count} for student ${student.id}`);
    this.logger.log(`Found ${pendingTasks} pending tasks for student ${student.id}`);

    if (pendingTasks > 0) {
      const existingAlert = await this.findExistingAlert(
        familyId, 
        student.id, 
        AlertType.PENDING_TASKS
      );

      this.logger.log(`Existing alert for pending tasks: ${existingAlert ? 'EXISTS' : 'NOT FOUND'}`);

      if (!existingAlert) {
        this.logger.log(`Creating new alert for ${pendingTasks} pending tasks`);
        await this.createAlert({
          familyId,
          studentId: student.id,
          alertType: AlertType.PENDING_TASKS,
          priority: pendingTasks > 3 ? AlertPriority.HIGH : AlertPriority.MEDIUM,
          title: `${pendingTasks} tarea(s) pendiente(s)`,
          description: `${student.user.profile.firstName} tiene ${pendingTasks} tarea(s) sin entregar que ya han vencido.`,
          metadata: {
            pendingCount: pendingTasks,
          }
        });
      } else {
        this.logger.log(`Alert already exists, skipping creation`);
      }
    } else {
      this.logger.log(`No pending tasks found for student ${student.id}`);
    }
  }

  private async checkLowSubjectGrades(familyId: string, student: Student): Promise<void> {
    try {
      const studentGrades = await this.gradesService.getStudentGrades(
        student.id,
        familyId,
        'FAMILY' as any
      );

      const lowGradeSubjects = studentGrades.subjectGrades.filter(
        subject => typeof subject.averageGrade === 'number' && subject.averageGrade < 60
      );

      for (const subject of lowGradeSubjects) {
        const existingAlert = await this.findExistingAlert(
          familyId,
          student.id,
          AlertType.LOW_SUBJECT_GRADE,
          { subjectId: subject.subjectId }
        );

        if (!existingAlert) {
          await this.createAlert({
            familyId,
            studentId: student.id,
            alertType: AlertType.LOW_SUBJECT_GRADE,
            priority: (typeof subject.averageGrade === 'number' && subject.averageGrade < 40) ? AlertPriority.CRITICAL : AlertPriority.HIGH,
            title: `Calificación baja en ${subject.subjectName}`,
            description: `${student.user.profile.firstName} tiene una nota de ${typeof subject.averageGrade === 'number' ? subject.averageGrade.toFixed(1) : subject.averageGrade}% en ${subject.subjectName}, por debajo del 60% requerido.`,
            metadata: {
              subjectId: subject.subjectId,
              subjectName: subject.subjectName,
              grade: subject.averageGrade,
              threshold: 60,
            }
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Error checking subject grades for student ${student.id}:`, error);
    }
  }

  private async checkLowTaskGrades(familyId: string, student: Student): Promise<void> {
    const lowGradeTasks = await this.taskSubmissionsRepository.find({
      where: {
        student: { id: student.id },
        isGraded: true,
        finalGrade: 6, // Menos de 60% (en escala 0-10)
      },
      relations: ['task'],
      take: 10, // Limitar a las 10 más recientes
      order: { gradedAt: 'DESC' }
    });

    for (const taskSubmission of lowGradeTasks) {
      const grade = (taskSubmission.finalGrade || 0) * 10; // Convertir a porcentaje
      
      if (grade < 60) {
        const existingAlert = await this.findExistingAlert(
          familyId,
          student.id,
          AlertType.LOW_TASK_GRADE,
          { taskId: taskSubmission.task.id }
        );

        if (!existingAlert) {
          await this.createAlert({
            familyId,
            studentId: student.id,
            alertType: AlertType.LOW_TASK_GRADE,
            priority: grade < 40 ? AlertPriority.HIGH : AlertPriority.MEDIUM,
            title: `Calificación baja en tarea`,
            description: `${student.user.profile.firstName} obtuvo ${grade.toFixed(1)}% en la tarea "${taskSubmission.task.title}".`,
            metadata: {
              taskId: taskSubmission.task.id,
              taskName: taskSubmission.task.title,
              grade: grade,
              threshold: 60,
            }
          });
        }
      }
    }
  }

  private async checkUnjustifiedAbsences(familyId: string, student: Student): Promise<void> {
    // Contar ausencias sin justificación
    const unjustifiedAbsences = await this.attendanceRepository.count({
      where: {
        student: { id: student.id },
        status: AttendanceStatus.ABSENT,
        justification: null, // Sin justificación
      }
    });

    if (unjustifiedAbsences > 0) {
      const existingAlert = await this.findExistingAlert(
        familyId,
        student.id,
        AlertType.UNJUSTIFIED_ABSENCE
      );

      if (!existingAlert) {
        await this.createAlert({
          familyId,
          studentId: student.id,
          alertType: AlertType.UNJUSTIFIED_ABSENCE,
          priority: unjustifiedAbsences > 3 ? AlertPriority.CRITICAL : AlertPriority.HIGH,
          title: `${unjustifiedAbsences} falta(s) sin justificar`,
          description: `${student.user.profile.firstName} tiene ${unjustifiedAbsences} falta(s) de asistencia sin justificar.`,
          metadata: {
            absenceCount: unjustifiedAbsences,
          }
        });
      }
    }
  }

  /**
   * Detecta ausencias y tardanzas del día actual para notificación inmediata
   */
  private async checkTodayAttendanceIssues(familyId: string, student: Student): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day
    
    try {
      // Buscar registro de asistencia de hoy
      const todayAttendance = await this.attendanceRepository.findOne({
        where: {
          student: { id: student.id },
          date: today,
        }
      });

      if (todayAttendance) {
        const studentName = student.user?.profile?.firstName || 'Estudiante';
        
        // Crear alerta inmediata para ausencia
        if (todayAttendance.status === AttendanceStatus.ABSENT) {
          const existingAlert = await this.findExistingAlert(
            familyId,
            student.id,
            AlertType.STUDENT_ABSENT,
            today.toISOString().split('T')[0]
          );

          if (!existingAlert) {
            await this.createAlert({
              familyId,
              studentId: student.id,
              alertType: AlertType.STUDENT_ABSENT,
              priority: AlertPriority.HIGH,
              title: `${studentName} faltó hoy`,
              description: `${studentName} ha sido marcado como ausente en la fecha ${new Date().toLocaleDateString('es-ES')}.${todayAttendance.justification ? ` Motivo: ${todayAttendance.justification}` : ''}`,
              metadata: {
                attendanceDate: today.toISOString().split('T')[0],
                status: todayAttendance.status,
                justification: todayAttendance.justification,
                markedAt: todayAttendance.markedAt,
              }
            });
          }
        }
        
        // Crear alerta inmediata para tardanza
        if (todayAttendance.status === AttendanceStatus.LATE) {
          const existingAlert = await this.findExistingAlert(
            familyId,
            student.id,
            AlertType.STUDENT_LATE,
            today.toISOString().split('T')[0]
          );

          if (!existingAlert) {
            const arrivalTime = todayAttendance.arrivalTime || 'No especificada';
            await this.createAlert({
              familyId,
              studentId: student.id,
              alertType: AlertType.STUDENT_LATE,
              priority: AlertPriority.MEDIUM,
              title: `${studentName} llegó tarde hoy`,
              description: `${studentName} ha llegado tarde en la fecha ${new Date().toLocaleDateString('es-ES')}.${arrivalTime !== 'No especificada' ? ` Hora de llegada: ${arrivalTime}` : ''}${todayAttendance.justification ? ` Motivo: ${todayAttendance.justification}` : ''}`,
              metadata: {
                attendanceDate: today.toISOString().split('T')[0],
                status: todayAttendance.status,
                arrivalTime: todayAttendance.arrivalTime,
                justification: todayAttendance.justification,
                markedAt: todayAttendance.markedAt,
              }
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking today's attendance for student ${student.id}:`, error);
    }
  }

  /**
   * Detecta patrones de ausencias y tardanzas recurrentes
   */
  private async checkAttendancePatterns(familyId: string, student: Student): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Set to beginning of day

    try {
      // Contar ausencias en los últimos 30 días
      const recentAbsences = await this.attendanceRepository.count({
        where: {
          student: { id: student.id },
          status: AttendanceStatus.ABSENT,
          date: MoreThanOrEqual(thirtyDaysAgo), // Use proper TypeORM operator for date comparison
        }
      });

      // Contar tardanzas en los últimos 30 días
      const recentLateArrivals = await this.attendanceRepository.count({
        where: {
          student: { id: student.id },
          status: AttendanceStatus.LATE,
          date: MoreThanOrEqual(thirtyDaysAgo),
        }
      });

      const studentName = student.user?.profile?.firstName || 'Estudiante';

      // Alerta por patrón de ausencias (más de 5 en 30 días)
      if (recentAbsences > 5) {
        const existingAlert = await this.findExistingAlert(
          familyId,
          student.id,
          AlertType.PATTERN_ABSENCES
        );

        if (!existingAlert) {
          await this.createAlert({
            familyId,
            studentId: student.id,
            alertType: AlertType.PATTERN_ABSENCES,
            priority: recentAbsences > 10 ? AlertPriority.CRITICAL : AlertPriority.HIGH,
            title: `Patrón de ausencias detectado`,
            description: `${studentName} ha faltado ${recentAbsences} veces en los últimos 30 días. Se recomienda comunicarse con el centro educativo.`,
            metadata: {
              absenceCount: recentAbsences,
              periodDays: 30,
              threshold: 5,
            }
          });
        }
      }

      // Alerta por patrón de tardanzas (más de 8 en 30 días)
      if (recentLateArrivals > 8) {
        const existingAlert = await this.findExistingAlert(
          familyId,
          student.id,
          AlertType.PATTERN_TARDINESS
        );

        if (!existingAlert) {
          await this.createAlert({
            familyId,
            studentId: student.id,
            alertType: AlertType.PATTERN_TARDINESS,
            priority: recentLateArrivals > 15 ? AlertPriority.HIGH : AlertPriority.MEDIUM,
            title: `Patrón de tardanzas detectado`,
            description: `${studentName} ha llegado tarde ${recentLateArrivals} veces en los últimos 30 días. Se recomienda revisar los horarios de llegada.`,
            metadata: {
              lateCount: recentLateArrivals,
              periodDays: 30,
              threshold: 8,
            }
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error checking attendance patterns for student ${student.id}:`, error);
    }
  }

  private async checkUpcomingExams(familyId: string, student: Student): Promise<void> {
    this.logger.log(`Checking upcoming exams for student ${student.id} (${student.user?.profile?.firstName})`);

    try {

    // Buscar exámenes (Test Yourself) próximos - entre hoy y 7 días
    // IMPORTANTE: Solo mostrar los que tienen visible_to_families = true
    const upcomingExams = await this.taskSubmissionsRepository.query(`
      SELECT
        t.id as task_id,
        t.title as task_title,
        t."dueDate" as due_date,
        sa."subjectId" as subject_id,
        s.name as subject_name
      FROM task_submissions ts
      JOIN tasks t ON ts."taskId" = t.id
      JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
      JOIN subjects s ON sa."subjectId" = s.id
      WHERE ts."studentId" = $1
      AND ts."isActive" = true
      AND t."isActive" = true
      AND t."is_test_yourself" = true
      AND t."visible_to_families" = true
      AND t."dueDate" BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      AND ts."submittedAt" IS NULL
      ORDER BY t."dueDate" ASC
    `, [student.id]);
    
    this.logger.log(`Found ${upcomingExams.length} upcoming exams for student ${student.id}`);

    for (const exam of upcomingExams) {
      const examDate = new Date(exam.due_date);
      const daysUntilExam = Math.ceil((examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      const existingAlert = await this.findExistingAlert(
        familyId,
        student.id,
        AlertType.UPCOMING_EXAM,
        { taskId: exam.task_id }
      );

      if (!existingAlert) {
        // Determinar prioridad basada en proximidad del examen
        let priority = AlertPriority.MEDIUM;
        let timeText = '';
        
        if (daysUntilExam <= 0) {
          priority = AlertPriority.HIGH;
          timeText = 'HOY';
        } else if (daysUntilExam === 1) {
          priority = AlertPriority.HIGH;
          timeText = 'MAÑANA';
        } else if (daysUntilExam <= 3) {
          priority = AlertPriority.MEDIUM;
          timeText = `en ${daysUntilExam} días`;
        } else {
          priority = AlertPriority.MEDIUM;
          timeText = `en ${daysUntilExam} días`;
        }

        await this.createAlert({
          familyId,
          studentId: student.id,
          alertType: AlertType.UPCOMING_EXAM,
          priority,
          title: `Test Yourself próximo: ${exam.subject_name}`,
          description: `${student.user.profile.firstName} tiene un Test Yourself de ${exam.subject_name} programado para ${timeText}. Título: "${exam.task_title}".`,
          metadata: {
            taskId: exam.task_id,
            taskName: exam.task_title,
            subjectId: exam.subject_id,
            subjectName: exam.subject_name,
            dueDate: examDate,
            daysUntilExam: daysUntilExam,
          }
        });
        
        this.logger.log(`Created upcoming exam alert for ${exam.task_title} (${timeText})`);
      }
    }
    } catch (error) {
      this.logger.error(`Error checking upcoming exams for student ${student.id}:`, error);
      // Don't throw to avoid breaking the entire alert generation process
      return;
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async findExistingAlert(
    familyId: string,
    studentId: string,
    alertType: AlertType,
    metadataOrDate?: any
  ): Promise<FamilyAlert | null> {
    try {
      // For attendance-related alerts, check by date to avoid duplicates for same day
      if (typeof metadataOrDate === 'string' && (alertType === AlertType.STUDENT_ABSENT || alertType === AlertType.STUDENT_LATE)) {
        const existingAlert = await this.alertsRepository
          .createQueryBuilder('alert')
          .where('alert.familyId = :familyId', { familyId })
          .andWhere('alert.studentId = :studentId', { studentId })
          .andWhere('alert.alertType = :alertType', { alertType })
          .andWhere('alert.isActive = :isActive', { isActive: true })
          .andWhere("alert.metadata->>'attendanceDate' = :attendanceDate", { attendanceDate: metadataOrDate })
          .getOne();
        
        return existingAlert;
      }

      // Set metadata for backward compatibility
      const metadata = typeof metadataOrDate === 'object' ? metadataOrDate : undefined;

      // For upcoming exams, check by taskId to avoid duplicates
      if (metadata?.taskId && alertType === AlertType.UPCOMING_EXAM) {
        const existingAlert = await this.alertsRepository
          .createQueryBuilder('alert')
          .where('alert.familyId = :familyId', { familyId })
          .andWhere('alert.studentId = :studentId', { studentId })
          .andWhere('alert.alertType = :alertType', { alertType })
          .andWhere('alert.isActive = :isActive', { isActive: true })
          .andWhere("alert.metadata->>'taskId' = :taskId", { taskId: metadata.taskId })
          .getOne();
        
        this.logger.log(`Existing upcoming exam alert check: ${existingAlert ? 'FOUND' : 'NOT FOUND'} for task ${metadata.taskId}`);
        return existingAlert;
      }

      // For subject grades, check by subjectId
      if (metadata?.subjectId && alertType === AlertType.LOW_SUBJECT_GRADE) {
        const existingAlert = await this.alertsRepository
          .createQueryBuilder('alert')
          .where('alert.familyId = :familyId', { familyId })
          .andWhere('alert.studentId = :studentId', { studentId })
          .andWhere('alert.alertType = :alertType', { alertType })
          .andWhere('alert.isActive = :isActive', { isActive: true })
          .andWhere("alert.metadata->>'subjectId' = :subjectId", { subjectId: metadata.subjectId })
          .getOne();
        
        return existingAlert;
      }

      // For other alert types (no specific metadata checking)
      const existingAlert = await this.alertsRepository.findOne({
        where: {
          familyId,
          studentId,
          alertType,
          isActive: true,
        }
      });

      this.logger.log(`Existing alert check for ${alertType}: ${existingAlert ? 'FOUND' : 'NOT FOUND'}`);
      return existingAlert;
    } catch (error) {
      this.logger.error(`Error checking existing alert:`, error);
      return null; // If error, assume no existing alert to be safe
    }
  }

  private async createAlert(alertData: {
    familyId: string;
    studentId: string;
    alertType: AlertType;
    priority: AlertPriority;
    title: string;
    description: string;
    metadata?: any;
  }): Promise<FamilyAlert> {
    const alert = this.alertsRepository.create({
      familyId: alertData.familyId,
      studentId: alertData.studentId,
      alertType: alertData.alertType,
      priority: alertData.priority,
      title: alertData.title,
      description: alertData.description,
      metadata: alertData.metadata,
      isViewed: false,
      isActive: true,
    });

    const savedAlert = await this.alertsRepository.save(alert);
    this.logger.log(`Nueva alerta creada: ${alertData.alertType} para estudiante ${alertData.studentId}`);
    
    // 🔥 NUEVA FUNCIONALIDAD: Enviar notificación por email automáticamente
    try {
      await this.sendEmailNotificationForNewAlert(savedAlert.id);
    } catch (error) {
      this.logger.error(`Error enviando notificación email para alerta ${savedAlert.id}:`, error);
      // No fallar la creación de la alerta si el email falla
    }
    
    return savedAlert;
  }

  /**
   * Envía notificación por email cuando se crea una nueva alerta
   */
  private async sendEmailNotificationForNewAlert(alertId: string): Promise<void> {
    // Importar dinámicamente para evitar dependencias circulares
    const { FamilyEmailNotificationsService } = await import('./family-email-notifications.service');
    
    // TODO: Inyectar el servicio correctamente en el constructor
    // Por ahora, crear una instancia temporal
    // En implementación final, debe inyectarse en el constructor
    
    this.logger.debug(`Enviando notificación email para nueva alerta ${alertId}`);
    
    // La implementación completa se hará cuando se integre FamilyEmailNotificationsService
    // await this.emailNotificationsService.sendImmediateAlert(alertId);
  }

  private async cleanupObsoleteAlerts(familyId: string): Promise<void> {
    // Desactivar alertas expiradas
    await this.alertsRepository.update(
      {
        familyId,
        isActive: true,
        expiresAt: LessThan(new Date()), // Menor que ahora
      },
      { isActive: false }
    );

    // Limpiar alertas de tareas que ya fueron entregadas
    const pendingTaskAlerts = await this.alertsRepository.find({
      where: {
        familyId,
        alertType: AlertType.PENDING_TASKS,
        isActive: true,
      }
    });

    for (const alert of pendingTaskAlerts) {
      // Use raw SQL query to avoid any TypeORM relationship issues
      // IMPORTANTE: Excluir Test Yourself de conteo
      const result = await this.taskSubmissionsRepository.query(`
        SELECT COUNT(*) as pending_count
        FROM task_submissions ts
        JOIN tasks t ON ts."taskId" = t.id
        WHERE ts."studentId" = $1
        AND ts."submittedAt" IS NULL
        AND ts."isActive" = true
        AND t."isActive" = true
        AND t."dueDate" < NOW()
        AND t."is_test_yourself" = false
      `, [alert.studentId]);
      
      const hasPendingTasks = Math.max(0, parseInt(result[0].pending_count) || 0);

      if (hasPendingTasks === 0) {
        alert.isActive = false;
        await this.alertsRepository.save(alert);
      }
    }

    // Limpiar alertas de exámenes que ya pasaron
    const upcomingExamAlerts = await this.alertsRepository.find({
      where: {
        familyId,
        alertType: AlertType.UPCOMING_EXAM,
        isActive: true,
      }
    });

    for (const alert of upcomingExamAlerts) {
      if (alert.metadata?.taskId) {
        // Verificar si el examen ya pasó
        const examResult = await this.taskSubmissionsRepository.query(`
          SELECT t."dueDate"
          FROM tasks t 
          WHERE t.id = $1 
          AND t."taskType" = 'exam'
        `, [alert.metadata.taskId]);
        
        if (examResult.length > 0) {
          const examDate = new Date(examResult[0].dueDate);
          const now = new Date();
          
          // Si el examen ya pasó (fecha anterior a hoy), desactivar la alerta
          if (examDate < now) {
            alert.isActive = false;
            await this.alertsRepository.save(alert);
            this.logger.log(`Deactivated past exam alert for task ${alert.metadata.taskId}`);
          }
        }
      }
    }
  }
}