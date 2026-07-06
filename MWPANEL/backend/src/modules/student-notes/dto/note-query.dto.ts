import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NoteType } from './create-student-note.dto';

export class NoteQueryDto {
  @ApiProperty({
    description: 'Número de página',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Elementos por página',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Tipo de apunte',
    enum: NoteType,
    required: false,
  })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiProperty({
    description: 'ID de la asignatura',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @ApiProperty({
    description: 'Término de búsqueda',
    example: 'ecuaciones',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filtrar solo favoritos',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  favorites?: boolean;

  @ApiProperty({
    description: 'Fecha de inicio para filtrar',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Fecha de fin para filtrar',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Etiquetas para filtrar',
    example: 'matemáticas,ecuaciones',
    required: false,
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({
    description: 'Campo por el que ordenar',
    example: 'createdAt',
    required: false,
    enum: ['createdAt', 'updatedAt', 'title', 'viewCount'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'viewCount' = 'createdAt';

  @ApiProperty({
    description: 'Orden de clasificación',
    example: 'DESC',
    required: false,
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  get tagsArray(): string[] {
    return this.tags ? this.tags.split(',').map((tag) => tag.trim()) : [];
  }
}