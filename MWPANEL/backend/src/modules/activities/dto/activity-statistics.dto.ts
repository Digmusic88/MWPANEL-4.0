import { ApiProperty } from '@nestjs/swagger';

export class ActivityStatisticsDto {
  @ApiProperty({ description: 'ID de la actividad' })
  activityId: string;

  @ApiProperty({ description: 'Nombre de la actividad' })
  activityName: string;

  @ApiProperty({ description: 'Total de estudiantes' })
  totalStudents: number;

  @ApiProperty({ description: 'Estudiantes valorados' })
  assessedStudents: number;

  @ApiProperty({ description: 'Estudiantes pendientes' })
  pendingStudents: number;

  @ApiProperty({ description: 'Distribución de valoraciones emoji' })
  emojiDistribution?: {
    happy: number;
    neutral: number;
    sad: number;
  };

  @ApiProperty({ description: 'Estadísticas de puntuaciones' })
  scoreStatistics?: {
    average: number;
    min: number;
    max: number;
    maxPossible: number;
  };

  @ApiProperty({ description: 'Porcentaje de completado' })
  completionPercentage: number;
}

export class TeacherActivitySummaryDto {
  @ApiProperty({ description: 'Actividades de hoy' })
  todayActivities: number;

  @ApiProperty({ description: 'Actividades pendientes de valorar' })
  pendingAssessments: number;

  @ApiProperty({ description: 'Total de valoraciones realizadas esta semana' })
  weekAssessments: number;

  @ApiProperty({ description: 'Promedio de valoraciones positivas' })
  positiveRatio: number;
}