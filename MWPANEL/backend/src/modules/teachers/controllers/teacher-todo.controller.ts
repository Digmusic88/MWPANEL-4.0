/**
 * @archivo: teacher-todo.controller.ts
 * @módulo: Teachers (Controlador Dashboard TODO)
 * @función: API endpoints para dashboard de tareas pendientes de profesores
 * @crítico: SÍ - Dashboard principal para productividad del profesor
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { 
  TeacherTodoService, 
  TeacherTodoSummary, 
  TodoFilters 
} from '../services/teacher-todo.service';
import { TaskType } from '../../tasks/entities/task.entity';
import { MarkTasksAsReviewedDto } from '../dto/mark-tasks-reviewed.dto';
import { Teacher } from '../entities/teacher.entity';

@ApiTags('Teacher TODO Dashboard')
@Controller('teachers/todo')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeacherTodoController {
  private readonly logger = new Logger(TeacherTodoController.name);

  constructor(
    private readonly teacherTodoService: TeacherTodoService,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Obtener dashboard TODO del profesor',
    description: 'Devuelve la lista de tareas pendientes por revisar/corregir con filtros'
  })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filtrar por curso' })
  @ApiQuery({ name: 'taskType', required: false, enum: TaskType, description: 'Filtrar por tipo de tarea' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'to_grade', 'graded', 'overdue'], description: 'Filtrar por estado' })
  @ApiQuery({ name: 'priority', required: false, enum: ['urgent', 'high', 'medium', 'low'], description: 'Filtrar por prioridad' })
  @ApiQuery({ name: 'urgentOnly', required: false, type: Boolean, description: 'Solo mostrar urgentes' })
  @ApiQuery({ name: 'impersonate', required: false, description: 'ID del profesor a suplantar (solo admin)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard TODO obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalPending: { type: 'number', example: 15 },
        urgentCount: { type: 'number', example: 3 },
        overdueCount: { type: 'number', example: 1 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              task_id: { type: 'string', example: 'uuid' },
              title: { type: 'string', example: 'Ejercicios de Matemáticas' },
              taskType: { type: 'string', example: 'homework' },
              dueDate: { type: 'string', format: 'date-time' },
              courseId: { type: 'string', example: 'uuid' },
              courseName: { type: 'string', example: '3º ESO A' },
              subjectName: { type: 'string', example: 'Matemáticas' },
              pendingSubmissions: { type: 'number', example: 5 },
              toGradeSubmissions: { type: 'number', example: 3 },
              gradedSubmissions: { type: 'number', example: 15 },
              totalSubmissions: { type: 'number', example: 23 },
              isOverdue: { type: 'boolean', example: false },
              hoursUntilDue: { type: 'number', example: 18 },
              priority: { type: 'string', example: 'high' },
              alertBadge: { type: 'string', example: 'amber' }
            }
          }
        }
      }
    }
  })
  async getTeacherTodo(
    @Request() req,
    @Query('courseId') courseId?: string,
    @Query('taskType') taskType?: TaskType,
    @Query('status') status?: 'pending' | 'to_grade' | 'graded' | 'overdue',
    @Query('priority') priority?: 'urgent' | 'high' | 'medium' | 'low',
    @Query('urgentOnly') urgentOnly?: boolean,
    @Query('impersonate') impersonate?: string,
  ): Promise<TeacherTodoSummary> {
    try {
      // Determinar el teacherId a usar
      let teacherId: string;
      
      if (impersonate && req.user.role === UserRole.ADMIN) {
        teacherId = impersonate;
        this.logger.log(`Admin ${req.user.sub} impersonating teacher ${impersonate}`);
      } else {
        // Buscar el teacherId real usando SQL directo para evitar problemas TypeORM
        const teacherResult = await this.dataSource.query(
          'SELECT id FROM teachers WHERE "userId" = $1 LIMIT 1',
          [req.user.sub]
        );
        
        if (!teacherResult || teacherResult.length === 0) {
          throw new BadRequestException('Usuario no es un profesor válido');
        }
        
        teacherId = teacherResult[0].id;
        this.logger.log(`Found teacherId ${teacherId} for userId ${req.user.sub}`);
      }

      if (!teacherId) {
        throw new BadRequestException('Usuario no es un profesor válido');
      }

      // Construir filtros
      const filters: TodoFilters = {
        courseId,
        taskType,
        status,
        priority,
        showUrgentOnly: urgentOnly || false,
      };

      this.logger.log(`Getting TODO for teacher ${teacherId} with filters:`, filters);
      this.logger.log(`🚀 TESTING FILTER IMPLEMENTATION - SHOULD SEE THIS LOG!`);
      this.logger.log(`🔍 Received filters:`, JSON.stringify(filters, null, 2));

      // DIRECT SQL SOLUTION - BYPASSING PROBLEMATIC SERVICE
      this.logger.log(`🔧 DIRECT SQL SOLUTION: Getting teacher todo data directly`);
      
      // Build dynamic SQL with filters
      let whereConditions = [
        't."teacherId" = $1',
        't."isActive" = true',
        't."isreviewedbyteacher" = false',
        't.status = \'published\''
      ];
      let queryParams = [teacherId];
      let paramIndex = 2;

      // Apply courseId filter
      if (filters.courseId) {
        whereConditions.push(`c.id = $${paramIndex}`);
        queryParams.push(filters.courseId);
        paramIndex++;
      }

      // Apply taskType filter
      if (filters.taskType) {
        whereConditions.push(`t."taskType" = $${paramIndex}`);
        queryParams.push(filters.taskType);
        paramIndex++;
      }

      const tasksQuery = `
        SELECT 
          t.id as task_id,
          t.title,
          t."taskType",
          t."dueDate",
          c.id as "courseId", 
          c.name as "courseName",
          s.name as "subjectName"
        FROM tasks t
        LEFT JOIN subject_assignments sa ON t."subjectAssignmentId" = sa.id
        LEFT JOIN subjects s ON sa."subjectId" = s.id  
        LEFT JOIN courses c ON s."courseId" = c.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY t."dueDate" ASC NULLS LAST
      `;

      this.logger.log(`🔧 Executing SQL for teacher: ${teacherId} with filters:`, filters);
      this.logger.log(`🔧 SQL Query:`, tasksQuery);
      this.logger.log(`🔧 Parameters:`, queryParams);
      const basicTasks = await this.dataSource.query(tasksQuery, queryParams);
      this.logger.log(`🔧 SQL returned ${basicTasks.length} tasks`);
      
      if (basicTasks.length > 0) {
        this.logger.log(`🔧 First task: ${JSON.stringify(basicTasks[0], null, 2)}`);
      }

      // Get submission stats for each task
      const tasksWithStats = await Promise.all(
        basicTasks.map(async (task) => {
          const submissionQuery = `
            SELECT 
              COUNT(*)::int as total,
              COUNT(CASE WHEN "submittedAt" IS NULL THEN 1 END)::int as pending,
              COUNT(CASE WHEN "submittedAt" IS NOT NULL AND "isGraded" = false THEN 1 END)::int as to_grade,
              COUNT(CASE WHEN "isGraded" = true THEN 1 END)::int as graded
            FROM task_submissions 
            WHERE "taskId" = $1
          `;
          
          const submissionResults = await this.dataSource.query(submissionQuery, [task.task_id]);
          const stats = submissionResults[0] || { pending: 0, to_grade: 0, graded: 0, total: 0 };
          
          return { ...task, ...stats };
        })
      );

      // Transform to expected format
      const items = tasksWithStats.map(row => {
        const dueDate = row.dueDate ? new Date(row.dueDate) : null;
        const now = new Date();
        const hoursUntilDue = dueDate ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)) : null;
        const isOverdue = hoursUntilDue !== null && hoursUntilDue < 0;
        
        // Calculate priority based on submissions and due date
        let priority: 'urgent' | 'high' | 'medium' | 'low' = 'low';
        let alertBadge: 'red' | 'amber' | 'none' = 'none';
        
        const pendingCount = (row.pending || 0) + (row.to_grade || 0);
        
        if (isOverdue && pendingCount > 0) {
          priority = 'urgent';
          alertBadge = 'red';
        } else if (hoursUntilDue !== null && hoursUntilDue <= 24 && pendingCount > 0) {
          priority = 'high';
          alertBadge = 'amber';
        } else if (hoursUntilDue !== null && hoursUntilDue <= 48 && pendingCount > 0) {
          priority = 'high';
          alertBadge = 'amber';
        } else if (pendingCount > 0) {
          priority = 'medium';
        }
        
        return {
          task_id: row.task_id,
          title: row.title || 'Sin título',
          taskType: row.taskType || 'assignment',
          dueDate: dueDate,
          courseId: row.courseId || null,
          courseName: row.courseName || 'Sin curso',
          subjectName: row.subjectName || 'Sin asignatura',
          pendingSubmissions: row.pending || 0,
          toGradeSubmissions: row.to_grade || 0,
          gradedSubmissions: row.graded || 0,
          totalSubmissions: row.total || 0,
          isOverdue,
          hoursUntilDue,
          priority,
          alertBadge,
        };
      });

      // Apply post-processing filters
      let filteredItems = items;

      // Apply status filter
      if (filters.status) {
        filteredItems = filteredItems.filter(item => {
          switch (filters.status) {
            case 'pending':
              return item.pendingSubmissions > 0;
            case 'to_grade':
              return item.toGradeSubmissions > 0;
            case 'graded':
              return item.gradedSubmissions > 0 && item.pendingSubmissions === 0 && item.toGradeSubmissions === 0;
            case 'overdue':
              return item.isOverdue;
            default:
              return true;
          }
        });
      }

      // Apply priority filter
      if (filters.priority) {
        filteredItems = filteredItems.filter(item => item.priority === filters.priority);
      }

      // Apply urgentOnly filter
      if (filters.showUrgentOnly) {
        filteredItems = filteredItems.filter(item => item.priority === 'urgent');
      }

      this.logger.log(`🔧 Filtered from ${items.length} to ${filteredItems.length} items`);

      const result = {
        totalPending: items.reduce((sum, item) => sum + item.pendingSubmissions + item.toGradeSubmissions, 0),
        urgentCount: items.filter(item => item.priority === 'urgent').length,
        overdueCount: items.filter(item => item.isOverdue).length,
        items: filteredItems,
      };

      this.logger.log(`🔧 FINAL RESULT: ${result.items.length} items, ${result.totalPending} pending, ${result.urgentCount} urgent`);
      return result;
    } catch (error) {
      this.logger.error('Error getting teacher TODO:', error);
      throw error;
    }
  }

  @Get('quick-stats')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Obtener estadísticas rápidas para el header',
    description: 'Devuelve contadores para mostrar en el header del dashboard'
  })
  @ApiQuery({ name: 'impersonate', required: false, description: 'ID del profesor a suplantar (solo admin)' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalPending: { type: 'number', example: 15 },
        urgentCount: { type: 'number', example: 3 },
        overdueCount: { type: 'number', example: 1 }
      }
    }
  })
  async getQuickStats(
    @Request() req,
    @Query('impersonate') impersonate?: string,
  ): Promise<{ totalPending: number; urgentCount: number; overdueCount: number }> {
    try {
      let teacherId: string;
      
      if (impersonate && req.user.role === UserRole.ADMIN) {
        teacherId = impersonate;
      } else {
        // Buscar el teacherId real usando SQL directo para evitar problemas TypeORM
        const teacherResult = await this.dataSource.query(
          'SELECT id FROM teachers WHERE "userId" = $1 LIMIT 1',
          [req.user.sub]
        );
        
        if (!teacherResult || teacherResult.length === 0) {
          throw new BadRequestException('Usuario no es un profesor válido');
        }
        
        teacherId = teacherResult[0].id;
      }

      if (!teacherId) {
        throw new BadRequestException('Usuario no es un profesor válido');
      }

      return await this.teacherTodoService.getQuickStats(teacherId);
    } catch (error) {
      this.logger.error('Error getting quick stats:', error);
      throw error;
    }
  }

  @Patch('mark-reviewed')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Marcar tareas como revisadas (acción masiva)',
    description: 'Marca múltiples tareas como revisadas automáticamente'
  })
  @ApiResponse({
    status: 200,
    description: 'Tareas marcadas como revisadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', example: 5 },
        message: { type: 'string', example: '5 entregas marcadas como revisadas' }
      }
    }
  })
  async markTasksAsReviewed(
    @Request() req,
    @Body() markTasksDto: MarkTasksAsReviewedDto,
    @Query('impersonate') impersonate?: string,
  ): Promise<{ updated: number; message: string }> {
    try {
      // Debug logging para diagnosticar el problema
      this.logger.log('=== Mark Tasks As Reviewed Debug ===');
      this.logger.log('markTasksDto:', JSON.stringify(markTasksDto));
      this.logger.log('markTasksDto.taskIds exists:', !!markTasksDto.taskIds);
      this.logger.log('markTasksDto.taskIds type:', typeof markTasksDto.taskIds);
      this.logger.log('markTasksDto.taskIds isArray:', Array.isArray(markTasksDto.taskIds));
      this.logger.log('markTasksDto.taskIds length:', markTasksDto.taskIds?.length);
      this.logger.log('markTasksDto.taskIds content:', markTasksDto.taskIds);
      
      if (!markTasksDto.taskIds || !Array.isArray(markTasksDto.taskIds) || markTasksDto.taskIds.length === 0) {
        this.logger.error('Validation failed - taskIds invalid');
        throw new BadRequestException('Se requiere un array de taskIds válido');
      }

      let teacherId: string;
      
      if (impersonate && req.user.role === UserRole.ADMIN) {
        teacherId = impersonate;
      } else {
        // Buscar el teacherId real usando SQL directo para evitar problemas TypeORM
        const teacherResult = await this.dataSource.query(
          'SELECT id FROM teachers WHERE "userId" = $1 LIMIT 1',
          [req.user.sub]
        );
        
        if (!teacherResult || teacherResult.length === 0) {
          throw new BadRequestException('Usuario no es un profesor válido');
        }
        
        teacherId = teacherResult[0].id;
      }

      if (!teacherId) {
        throw new BadRequestException('Usuario no es un profesor válido');
      }

      this.logger.log(`Marking ${markTasksDto.taskIds.length} tasks as reviewed for teacher ${teacherId}`);

      const result = await this.teacherTodoService.markTasksAsReviewed(teacherId, markTasksDto.taskIds);

      return {
        updated: result.updated,
        message: `${result.updated} entregas marcadas como revisadas`,
      };
    } catch (error) {
      this.logger.error('Error marking tasks as reviewed:', error);
      throw error;
    }
  }

  @Get('courses')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Obtener cursos del profesor para filtros',
    description: 'Devuelve la lista de cursos que enseña el profesor para usar en filtros'
  })
  @ApiQuery({ name: 'impersonate', required: false, description: 'ID del profesor a suplantar (solo admin)' })
  @ApiResponse({
    status: 200,
    description: 'Cursos obtenidos exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          name: { type: 'string', example: '3º ESO A' }
        }
      }
    }
  })
  async getTeacherCourses(
    @Request() req,
    @Query('impersonate') impersonate?: string,
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      let teacherId: string;
      
      if (impersonate && req.user.role === UserRole.ADMIN) {
        teacherId = impersonate;
      } else {
        // Buscar el teacherId real usando SQL directo para evitar problemas TypeORM
        const teacherResult = await this.dataSource.query(
          'SELECT id FROM teachers WHERE "userId" = $1 LIMIT 1',
          [req.user.sub]
        );
        
        if (!teacherResult || teacherResult.length === 0) {
          throw new BadRequestException('Usuario no es un profesor válido');
        }
        
        teacherId = teacherResult[0].id;
      }

      if (!teacherId) {
        throw new BadRequestException('Usuario no es un profesor válido');
      }

      return await this.teacherTodoService.getTeacherCourses(teacherId);
    } catch (error) {
      this.logger.error('Error getting teacher courses:', error);
      throw error;
    }
  }
}