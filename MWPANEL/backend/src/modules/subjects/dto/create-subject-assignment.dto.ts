import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, IsArray, ArrayMinSize, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectAssignmentDto {
  @ApiProperty({ description: 'ID del profesor' })
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'ID de la asignatura' })
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ description: 'ID del grupo de clase (legacy, usar classGroupIds)', required: false })
  @ValidateIf(o => !o.classGroupIds || o.classGroupIds.length === 0)
  @IsUUID()
  @IsOptional()
  classGroupId?: string;

  @ApiProperty({ description: 'IDs de los grupos de clase (nuevo)', required: false, type: [String] })
  @ValidateIf(o => !o.classGroupId)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  @IsOptional()
  classGroupIds?: string[];

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