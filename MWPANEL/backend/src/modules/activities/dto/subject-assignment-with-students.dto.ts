import { ApiProperty } from '@nestjs/swagger';

export class SubjectAssignmentWithStudentsDto {
  @ApiProperty({ description: 'ID de la asignación de asignatura' })
  id: string;

  @ApiProperty({ description: 'Información de la asignatura' })
  subject: {
    id: string;
    name: string;
    code: string;
  };

  @ApiProperty({ description: 'Información del grupo de clase' })
  classGroup: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Información del año académico' })
  academicYear: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Horas semanales' })
  weeklyHours: number;

  @ApiProperty({ description: 'Estudiantes del grupo en esta asignatura' })
  students: Array<{
    id: string;
    enrollmentNumber: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}