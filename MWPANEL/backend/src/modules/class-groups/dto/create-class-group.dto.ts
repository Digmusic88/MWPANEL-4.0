import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassGroupDto {
  @ApiProperty({ description: 'Nombre del grupo de clase', example: '3º A Primaria' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Sección del grupo', example: 'A', required: false })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({ description: 'ID del año académico' })
  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'Lista de IDs de cursos', type: [String] })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  courseIds: string[];

  @ApiProperty({ description: 'ID del profesor tutor', required: false })
  @IsUUID()
  @IsOptional()
  tutorId?: string;

  @ApiProperty({ description: 'Lista de IDs de estudiantes', required: false })
  @IsUUID('4', { each: true })
  @IsOptional()
  studentIds?: string[];
}