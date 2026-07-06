import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ description: 'Nombre de la asignatura', example: 'Matemáticas' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Código único de la asignatura', example: 'MAT' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Horas semanales por defecto', example: 5 })
  @IsInt()
  @Min(0)
  weeklyHours: number;

  @ApiProperty({ description: 'Descripción de la asignatura', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID del curso al que pertenece' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { 
    message: 'courseId must be a valid UUID format' 
  })
  @IsNotEmpty()
  courseId: string;
}