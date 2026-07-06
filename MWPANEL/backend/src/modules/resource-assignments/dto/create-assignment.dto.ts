/**
 * @archivo: create-assignment.dto.ts
 * @módulo: Resource Assignments DTO
 * @función: DTO para creación de asignaciones simples
 * @proyecto: MW Panel 2.0
 */

import { IsString, IsUUID, IsOptional, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'ID del recurso educativo' })
  @IsUUID()
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Tipo de asignación', enum: ['individual', 'class'] })
  @IsEnum(['individual', 'class'])
  assignmentType: 'individual' | 'class';

  @ApiProperty({ description: 'ID del objetivo (estudiante o clase)' })
  @IsUUID()
  @IsString()
  targetId: string;

  @ApiProperty({ description: 'Fecha límite (opcional)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Instrucciones adicionales (opcional)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}