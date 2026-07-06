import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMultipleAssignmentDto {
  @ApiProperty({ description: 'ID del profesor' })
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'IDs de las asignaturas', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  subjectIds: string[];

  @ApiProperty({ description: 'IDs de los grupos de clase', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  classGroupIds: string[];

  @ApiProperty({ 
    description: 'Estudiantes específicos por grupo. Objeto donde la clave es el classGroupId y el valor es array de studentIds',
    example: { 'group-uuid-1': ['student-uuid-1', 'student-uuid-2'], 'group-uuid-2': ['student-uuid-3'] }
  })
  @IsOptional()
  selectedStudentsByGroup?: Record<string, string[]>;

  @ApiProperty({ description: 'ID del año académico' })
  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'Horas semanales para esta asignación', example: 4 })
  @IsInt()
  @Min(0)
  weeklyHours: number;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}