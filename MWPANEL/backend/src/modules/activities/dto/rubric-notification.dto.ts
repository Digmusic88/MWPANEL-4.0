import { ApiProperty } from '@nestjs/swagger';

export class RubricLevelDto {
  @ApiProperty({ description: 'ID del nivel de rúbrica' })
  id: string;

  @ApiProperty({ description: 'Nombre del nivel' })
  name: string;

  @ApiProperty({ description: 'Descripción del nivel' })
  description: string;

  @ApiProperty({ description: 'Puntuación del nivel' })
  score: number;
}

export class RubricCriterionDto {
  @ApiProperty({ description: 'ID del criterio de rúbrica' })
  id: string;

  @ApiProperty({ description: 'Nombre del criterio' })
  name: string;

  @ApiProperty({ description: 'Descripción del criterio' })
  description?: string;

  @ApiProperty({ description: 'Peso del criterio' })
  weight: number;

  @ApiProperty({ description: 'Niveles del criterio', type: [RubricLevelDto] })
  levels: RubricLevelDto[];
}

export class RubricDto {
  @ApiProperty({ description: 'ID de la rúbrica' })
  id: string;

  @ApiProperty({ description: 'Título de la rúbrica' })
  title: string;

  @ApiProperty({ description: 'Descripción de la rúbrica' })
  description?: string;

  @ApiProperty({ description: 'Criterios de la rúbrica', type: [RubricCriterionDto] })
  criteria: RubricCriterionDto[];
}

export class CriterionAssessmentDto {
  @ApiProperty({ description: 'ID de la valoración del criterio' })
  id: string;

  @ApiProperty({ description: 'Comentarios del criterio' })
  comments?: string;

  @ApiProperty({ description: 'Criterio evaluado', type: RubricCriterionDto })
  criterion: RubricCriterionDto;

  @ApiProperty({ description: 'Nivel seleccionado', type: RubricLevelDto })
  level: RubricLevelDto;
}

export class RubricAssessmentDto {
  @ApiProperty({ description: 'ID de la valoración de rúbrica' })
  id: string;

  @ApiProperty({ description: 'Puntuación total obtenida' })
  totalScore: number;

  @ApiProperty({ description: 'Puntuación máxima posible' })
  maxPossibleScore: number;

  @ApiProperty({ description: 'Porcentaje obtenido' })
  percentage: number;

  @ApiProperty({ description: 'Comentarios generales del profesor' })
  comments?: string;

  @ApiProperty({ description: 'Valoraciones por criterio', type: [CriterionAssessmentDto] })
  criterionAssessments: CriterionAssessmentDto[];
}

export class ActivityWithRubricDto {
  @ApiProperty({ description: 'ID de la actividad' })
  id: string;

  @ApiProperty({ description: 'Nombre de la actividad' })
  name: string;

  @ApiProperty({ description: 'Descripción de la actividad' })
  description?: string;

  @ApiProperty({ description: 'Fecha de asignación' })
  assignedDate: Date;

  @ApiProperty({ description: 'Tipo de valoración' })
  valuationType: string;

  @ApiProperty({ description: 'Puntuación máxima (para tipo score)' })
  maxScore?: number;

  @ApiProperty({ description: 'Rúbrica asociada', type: RubricDto, required: false })
  rubric?: RubricDto;

  @ApiProperty({ description: 'Información del profesor' })
  teacher: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };

  @ApiProperty({ description: 'Información de la asignación de asignatura' })
  subjectAssignment?: {
    subject: {
      name: string;
      code: string;
    };
    classGroup: {
      name: string;
    };
  };
}

export class AssessmentWithRubricDto {
  @ApiProperty({ description: 'ID de la valoración' })
  id: string;

  @ApiProperty({ description: 'Valor de la valoración' })
  value?: string;

  @ApiProperty({ description: 'Comentario del profesor' })
  comment?: string;

  @ApiProperty({ description: 'Si ha sido valorada' })
  isAssessed: boolean;

  @ApiProperty({ description: 'Fecha de valoración' })
  assessedAt?: Date;

  @ApiProperty({ description: 'Fecha de notificación' })
  notifiedAt?: Date;

  @ApiProperty({ description: 'Actividad valorada', type: ActivityWithRubricDto })
  activity: ActivityWithRubricDto;

  @ApiProperty({ description: 'Estudiante valorado' })
  student: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };

  @ApiProperty({ description: 'Valoraciones de rúbrica', type: [RubricAssessmentDto], required: false })
  rubricAssessments?: RubricAssessmentDto[];
}