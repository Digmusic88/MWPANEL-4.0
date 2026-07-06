import { IsString, IsOptional, IsDateString, IsBoolean, IsEnum, IsArray, IsUUID, MaxLength, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentType } from '../entities/coordination-item.entity';

export class CreateCoordinationItemDto {
  @ApiProperty({ description: 'ID de la hoja de coordinación' })
  @IsString()
  @IsUUID()
  sheet_id: string;

  @ApiProperty({ description: 'Título del acuerdo/compromiso', example: 'Preparar festival de Navidad' })
  @IsString()
  @MaxLength(255)
  item_title: string;

  @ApiProperty({ description: 'Descripción detallada en formato Markdown', required: false })
  @IsOptional()
  @IsString()
  item_description?: string;

  @ApiProperty({ description: 'Fecha límite para completar el item', required: false })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiProperty({ description: 'Tipo de asignación', enum: AssignmentType, default: AssignmentType.ALL })
  @IsOptional()
  @IsEnum(AssignmentType)
  assignment_type?: AssignmentType;

  @ApiProperty({ description: 'Prioridad del item', enum: ['low', 'medium', 'high'], default: 'medium' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @ApiProperty({ description: 'Orden de visualización en la lista', required: false })
  @IsOptional()
  @IsNumber()
  order_index?: number;

  @ApiProperty({ description: 'Tags/etiquetas del item', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Color del item para destacado visual', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Usuarios asignados específicamente (para assignment_type INDIVIDUAL)', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigned_user_ids?: string[];

  @ApiProperty({ description: 'Departamentos asignados (para assignment_type DEPARTMENT)', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigned_departments?: string[];
}