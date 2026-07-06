import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID } from 'class-validator';

export enum ImportFormat {
  MARKDOWN = 'markdown',
  CSV = 'csv',
}

export class ImportRubricDto {
  @ApiProperty({ description: 'Nombre de la rúbrica', example: 'Rúbrica de redacción' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción de la rúbrica', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Formato de importación', enum: ImportFormat })
  @IsEnum(ImportFormat)
  format: ImportFormat;

  @ApiProperty({ 
    description: 'Datos de la tabla en formato markdown o CSV',
    example: `| Criterio | Insuficiente | Aceptable | Bueno | Excelente |
|----------|--------------|-----------|-------|-----------|
| Coherencia | No coherente | Algo claro | Claro | Muy claro |
| Ortografía | Muchos fallos | Algunos fallos | Bien | Sin errores |`
  })
  @IsString()
  data: string;

  @ApiProperty({ description: 'Si es plantilla reutilizable', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiProperty({ description: 'Si es visible para familias', default: false })
  @IsOptional()
  @IsBoolean()
  isVisibleToFamilies?: boolean;

  @ApiProperty({ description: 'ID de la asignación de asignatura', required: false })
  @IsOptional()
  @IsUUID()
  subjectAssignmentId?: string;
}