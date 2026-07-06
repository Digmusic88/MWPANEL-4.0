import { ApiProperty } from '@nestjs/swagger';

export class TaskStatisticsDto {
  @ApiProperty({
    description: 'Total de tareas',
    example: 25,
  })
  totalTasks: number;

  @ApiProperty({
    description: 'Tareas publicadas',
    example: 20,
  })
  publishedTasks: number;

  @ApiProperty({
    description: 'Tareas en borrador',
    example: 3,
  })
  draftTasks: number;

  @ApiProperty({
    description: 'Tareas cerradas',
    example: 2,
  })
  closedTasks: number;

  @ApiProperty({
    description: 'Tareas vencidas',
    example: 1,
  })
  overdueTasks: number;

  @ApiProperty({
    description: 'Total de entregas',
    example: 150,
  })
  totalSubmissions: number;

  @ApiProperty({
    description: 'Entregas calificadas',
    example: 120,
  })
  gradedSubmissions: number;

  @ApiProperty({
    description: 'Entregas pendientes',
    example: 25,
  })
  pendingSubmissions: number;

  @ApiProperty({
    description: 'Entregas tardías',
    example: 5,
  })
  lateSubmissions: number;

  @ApiProperty({
    description: 'Promedio de calificaciones',
    example: 7.8,
  })
  averageGrade: number;

  @ApiProperty({
    description: 'Tasa de entrega (%)',
    example: 85.5,
  })
  submissionRate: number;
}

export class StudentTaskStatisticsDto {
  @ApiProperty({
    description: 'Total de tareas asignadas',
    example: 15,
  })
  totalAssigned: number;

  @ApiProperty({
    description: 'Tareas entregadas',
    example: 12,
  })
  submitted: number;

  @ApiProperty({
    description: 'Tareas pendientes',
    example: 3,
  })
  pending: number;

  @ApiProperty({
    description: 'Tareas calificadas',
    example: 10,
  })
  graded: number;

  @ApiProperty({
    description: 'Entregas tardías',
    example: 1,
  })
  lateSubmissions: number;

  @ApiProperty({
    description: 'Promedio de calificaciones',
    example: 8.2,
  })
  averageGrade: number;

  @ApiProperty({
    description: 'Tasa de entrega (%)',
    example: 80.0,
  })
  submissionRate: number;

  @ApiProperty({
    description: 'Próxima fecha de entrega',
    example: '2025-07-01T23:59:00Z',
  })
  nextDueDate?: Date;
}

export class SubjectTaskSummaryDto {
  @ApiProperty({
    description: 'ID de la asignatura',
    example: 'uuid-string',
  })
  subjectId: string;

  @ApiProperty({
    description: 'Nombre de la asignatura',
    example: 'Matemáticas',
  })
  subjectName: string;

  @ApiProperty({
    description: 'Código de la asignatura',
    example: 'MAT-01',
  })
  subjectCode: string;

  @ApiProperty({
    description: 'Total de tareas',
    example: 8,
  })
  totalTasks: number;

  @ApiProperty({
    description: 'Tareas pendientes',
    example: 2,
  })
  pendingTasks: number;

  @ApiProperty({
    description: 'Tareas completadas',
    example: 6,
  })
  completedTasks: number;

  @ApiProperty({
    description: 'Promedio de calificaciones',
    example: 7.5,
  })
  averageGrade: number;

  @ApiProperty({
    description: 'Última tarea asignada',
    example: '2025-06-20T10:00:00Z',
  })
  lastTaskDate?: Date;

  @ApiProperty({
    description: 'Próxima fecha límite',
    example: '2025-07-01T23:59:00Z',
  })
  nextDueDate?: Date;
}