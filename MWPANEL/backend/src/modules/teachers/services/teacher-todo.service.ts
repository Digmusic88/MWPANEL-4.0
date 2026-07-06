/**
 * @archivo: teacher-todo.service.ts
 * @módulo: Teachers (Servicio Dashboard TODO)
 * @función: Dashboard de tareas pendientes para profesores
 * @características:
 *   - Lista de tareas por revisar/corregir
 *   - Filtros por curso, tipo, estado
 *   - Acciones masivas para marcar como revisadas
 *   - Alertas por fechas límite
 *   - Contadores y estadísticas
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { Task, TaskType, TaskStatus } from '../../tasks/entities/task.entity';
import { TaskSubmission, SubmissionStatus } from '../../tasks/entities/task-submission.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';

// DTOs para el dashboard TODO
export interface TeacherTodoItem {
  task_id: string;
  title: string;
  taskType: TaskType;
  dueDate: Date;
  courseId: string;
  courseName: string;
  subjectName: string;
  pendingSubmissions: number;
  toGradeSubmissions: number;
  gradedSubmissions: number;
  totalSubmissions: number;
  isOverdue: boolean;
  hoursUntilDue: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  alertBadge: 'red' | 'amber' | 'none';
}

export interface TeacherTodoSummary {
  totalPending: number;
  urgentCount: number;
  overdueCount: number;
  items: TeacherTodoItem[];
}

export interface TodoFilters {
  courseId?: string;
  taskType?: TaskType;
  status?: 'pending' | 'to_grade' | 'graded' | 'overdue';
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  showUrgentOnly?: boolean;
}

export enum TodoStatus {
  PENDING = 'pending',        // Tareas con entregas sin calificar
  IN_REVIEW = 'in_review',    // En proceso de revisión
  DONE = 'done',             // Todas las entregas calificadas
  OVERDUE = 'overdue',       // Fecha límite vencida
}

@Injectable()
export class TeacherTodoService {
  private readonly logger = new Logger(TeacherTodoService.name);

  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(TaskSubmission)
    private submissionsRepository: Repository<TaskSubmission>,
    @InjectRepository(SubjectAssignment)
    private subjectAssignmentRepository: Repository<SubjectAssignment>,
  ) {}

  /**
   * Obtiene el dashboard TODO completo para un profesor
   */
  async getTeacherTodo(teacherId: string, filters: TodoFilters = {}): Promise<TeacherTodoSummary> {
    this.logger.log(`=== STARTING TODO DASHBOARD FOR TEACHER ${teacherId} ===`);

    // TEMPORARY SIMPLIFIED VERSION FOR DEBUGGING
    try {
      // Simple query without JOINs first to test
      const simpleQuery = `
        SELECT 
          t.id as task_id,
          t.title,
          t."taskType",
          t."dueDate"
        FROM tasks t
        WHERE t."teacherId" = $1
          AND t."isActive" = true
          AND t."isreviewedbyteacher" = false
          AND t.status = 'published'
        ORDER BY t."dueDate" ASC NULLS LAST
        LIMIT 3
      `;

      const simpleTasks = await this.tasksRepository.query(simpleQuery, [teacherId]);
      this.logger.log(`🔧 SIMPLE QUERY returned ${simpleTasks.length} tasks`);
      
      if (simpleTasks.length > 0) {
        this.logger.log(`🔧 SIMPLE first task: ${JSON.stringify(simpleTasks[0])}`);
      }

      // Return simplified response for now
      const items: TeacherTodoItem[] = simpleTasks.map(row => ({
        task_id: row.task_id,
        title: row.title || 'No title found',
        taskType: row.taskType || 'assignment',
        dueDate: row.dueDate || new Date(),
        courseId: 'temp-course-id',
        courseName: 'Temp Course',
        subjectName: 'Temp Subject',
        pendingSubmissions: 0,
        toGradeSubmissions: 0,
        gradedSubmissions: 0,
        totalSubmissions: 0,
        isOverdue: false,
        hoursUntilDue: 24,
        priority: 'medium' as const,
        alertBadge: 'none' as const,
      }));

      return {
        totalPending: 0,
        urgentCount: 0,
        overdueCount: 0,
        items,
      };
    } catch (error) {
      this.logger.error('=== ERROR IN SIMPLE TODO DASHBOARD ===', error);
      this.logger.error('Error details:', error.message);
      throw error;
    }
  }


  /**
   * Marca múltiples tareas como revisadas (acción masiva)
   */
  async markTasksAsReviewed(teacherId: string, taskIds: string[]): Promise<{ updated: number }> {
    this.logger.log(`Marking ${taskIds.length} tasks as reviewed for teacher ${teacherId}`);

    // Marcar las tareas como revisadas por el profesor (las oculta del TODO)
    // Solo actualizar las que pertenezcan al profesor para seguridad
    const result = await this.tasksRepository.query(
      `UPDATE tasks SET isreviewedbyteacher = true WHERE id = ANY($1) AND "teacherId" = $2 AND "isActive" = true`,
      [taskIds, teacherId]
    );

    this.logger.log(`Updated ${result[1] || 0} tasks as reviewed`);
    return { updated: result[1] || 0 };
  }

  /**
   * Obtiene estadísticas rápidas para el header
   */
  async getQuickStats(teacherId: string): Promise<{
    totalPending: number;
    urgentCount: number;
    overdueCount: number;
  }> {
    const summary = await this.getTeacherTodo(teacherId, { showUrgentOnly: false });
    
    return {
      totalPending: summary.totalPending,
      urgentCount: summary.urgentCount,
      overdueCount: summary.overdueCount,
    };
  }

  /**
   * Actualiza el estado de overdue para tareas vencidas (cron job)
   */
  async updateOverdueTasks(): Promise<{ updated: number }> {
    this.logger.log('Updating overdue tasks status');

    // Esta función se puede llamar desde un cron job para actualizar estados
    // Por ahora solo loggea, pero se puede extender para crear notificaciones
    const overdueTasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.dueDate < NOW()')
      .andWhere('task.status = :status', { status: TaskStatus.PUBLISHED })
      .andWhere('task.isActive = true')
      .getCount();

    this.logger.log(`Found ${overdueTasks} overdue tasks`);

    return { updated: overdueTasks };
  }

  /**
   * Obtiene cursos disponibles para un profesor (para filtros)
   */
  async getTeacherCourses(teacherId: string): Promise<Array<{ id: string; name: string }>> {
    const courses = await this.subjectAssignmentRepository
      .createQueryBuilder('sa')
      .leftJoin('sa.subject', 'subject')
      .leftJoin('subject.course', 'course')
      .select(['course.id', 'course.name'])
      .where('sa.teacherId = :teacherId', { teacherId })
      .distinctOn(['course.id'])
      .getRawMany();

    return courses.map(c => ({ id: c.course_id, name: c.course_name }));
  }
}