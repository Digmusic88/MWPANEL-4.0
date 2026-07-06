import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Student } from '../entities/student.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Evaluation } from '../../evaluations/entities/evaluation.entity';
import { Task } from '../../tasks/entities/task.entity';
import { RecentActivityItemDto } from '../dto/recent-activity.dto';

@Injectable()
export class RecentActivityService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  async getRecentActivity(limit: number = 20): Promise<RecentActivityItemDto[]> {
    const activities: RecentActivityItemDto[] = [];

    try {
      // 1. Usuarios registrados recientemente (últimos 7 días)
      const recentUsers = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('user.createdAt >= :date', { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .orderBy('user.createdAt', 'DESC')
        .limit(5)
        .getMany();

      for (const user of recentUsers) {
        activities.push({
          type: `${user.role}_created`,
          title: `Nuevo ${this.getRoleDisplayName(user.role)} registrado`,
          description: `${user.profile?.firstName || 'Usuario'} ${user.profile?.lastName || ''} se registró en el sistema`,
          timestamp: user.createdAt,
          icon: this.getIconForRole(user.role),
          color: this.getColorForRole(user.role),
          userId: user.id,
          metadata: { role: user.role, email: user.email }
        });
      }

      // 2. TypeQuest sessions removed (deprecated)

      // 3. Evaluaciones creadas recientemente (últimos 5 días)
      const recentEvaluations = await this.evaluationsRepository
        .createQueryBuilder('evaluation')
        .leftJoinAndSelect('evaluation.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .leftJoinAndSelect('evaluation.student', 'student')
        .leftJoinAndSelect('student.user', 'studentUser')
        .leftJoinAndSelect('studentUser.profile', 'studentProfile')
        .leftJoinAndSelect('evaluation.subject', 'subject')
        .where('evaluation.createdAt >= :date', { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) })
        .orderBy('evaluation.createdAt', 'DESC')
        .limit(5)
        .getMany();

      for (const evaluation of recentEvaluations) {
        activities.push({
          type: 'evaluation_created',
          title: 'Nueva evaluación creada',
          description: `${evaluation.teacher?.user?.profile?.firstName || 'Profesor'} evaluó a ${evaluation.student?.user?.profile?.firstName || 'estudiante'}`,
          timestamp: evaluation.createdAt,
          icon: 'FileTextOutlined',
          color: 'blue',
          userId: evaluation.teacher?.user?.id,
          metadata: { 
            studentId: evaluation.student?.id,
            teacherId: evaluation.teacher?.id,
            subjectName: evaluation.subject?.name
          }
        });
      }

      // 4. Tareas creadas recientemente (últimos 5 días)
      const recentTasks = await this.tasksRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .where('task.createdAt >= :date', { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) })
        .orderBy('task.createdAt', 'DESC')
        .limit(5)
        .getMany();

      for (const task of recentTasks) {
        activities.push({
          type: 'task_created',
          title: 'Nueva tarea asignada',
          description: `${task.teacher?.user?.profile?.firstName || 'Profesor'} creó la tarea "${task.title}"`,
          timestamp: task.createdAt,
          icon: 'BookOutlined',
          color: 'green',
          userId: task.teacher?.user?.id,
          metadata: { 
            taskId: task.id,
            title: task.title,
            teacherId: task.teacher?.id
          }
        });
      }

      // 5. Si no hay actividades recientes, agregar actividad del sistema
      if (activities.length === 0) {
        activities.push({
          type: 'system_status',
          title: 'Sistema operativo',
          description: 'MW Panel funcionando correctamente - No hay actividad reciente registrada',
          timestamp: new Date(),
          icon: 'CheckCircleOutlined',
          color: 'green',
          metadata: { status: 'operational' }
        });
      }

      // Ordenar por timestamp más reciente y limitar
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Fallback en caso de error
      return [{
        type: 'system_error',
        title: 'Error al cargar actividad',
        description: 'No se pudo cargar la actividad reciente del sistema',
        timestamp: new Date(),
        icon: 'ExclamationCircleOutlined',
        color: 'red',
        metadata: { error: error.message }
      }];
    }
  }

  private getRoleDisplayName(role: string): string {
    const roleNames = {
      'admin': 'administrador',
      'teacher': 'profesor',
      'student': 'estudiante',
      'family': 'familiar'
    };
    return roleNames[role] || 'usuario';
  }

  private getIconForRole(role: string): string {
    const roleIcons = {
      'admin': 'CrownOutlined',
      'teacher': 'TeamOutlined',
      'student': 'UserOutlined',
      'family': 'HomeOutlined'
    };
    return roleIcons[role] || 'UserOutlined';
  }

  private getColorForRole(role: string): string {
    const roleColors = {
      'admin': 'red',
      'teacher': 'blue',
      'student': 'green',
      'family': 'orange'
    };
    return roleColors[role] || 'gray';
  }
}