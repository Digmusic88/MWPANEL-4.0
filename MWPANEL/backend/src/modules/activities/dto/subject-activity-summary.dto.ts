import { ApiProperty } from '@nestjs/swagger';

export class SubjectActivitySummaryDto {
  @ApiProperty({ description: 'ID de la asignación de asignatura' })
  subjectAssignmentId: string;

  @ApiProperty({ description: 'Nombre de la asignatura' })
  subjectName: string;

  @ApiProperty({ description: 'Código de la asignatura' })
  subjectCode: string;

  @ApiProperty({ description: 'Nombre del grupo de clase' })
  classGroupName: string;

  @ApiProperty({ description: 'Total de actividades' })
  totalActivities: number;

  @ApiProperty({ description: 'Actividades activas' })
  activeActivities: number;

  @ApiProperty({ description: 'Actividades archivadas' })
  archivedActivities: number;

  @ApiProperty({ description: 'Plantillas disponibles' })
  templatesCount: number;

  @ApiProperty({ description: 'Valoraciones pendientes' })
  pendingAssessments: number;

  @ApiProperty({ description: 'Valoraciones completadas esta semana' })
  weekCompletedAssessments: number;

  @ApiProperty({ description: 'Porcentaje de valoraciones positivas' })
  positiveRatio: number;

  @ApiProperty({ description: 'Última actividad creada' })
  lastActivityDate?: Date;
}