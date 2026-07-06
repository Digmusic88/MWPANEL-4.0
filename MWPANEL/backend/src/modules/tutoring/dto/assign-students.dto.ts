import { IsArray, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignStudentsDto {
  @ApiProperty({ description: 'Array de IDs de estudiantes a asignar', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  studentIds: string[];

  @ApiPropertyOptional({ description: 'Notas sobre la asignación' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RemoveStudentsDto {
  @ApiProperty({ description: 'Array de IDs de estudiantes a remover', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  studentIds: string[];
}