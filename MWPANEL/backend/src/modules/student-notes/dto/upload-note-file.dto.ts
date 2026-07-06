import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsBoolean,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NoteType } from './create-student-note.dto';

export class UploadNoteFileDto {
  @ApiProperty({
    description: 'Título del apunte',
    example: 'Grabación de audio - Clase de Historia',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Descripción o contenido del apunte',
    example: 'Grabación de la explicación sobre la Guerra Civil Española',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Tipo de apunte',
    enum: NoteType,
    example: NoteType.VOICE,
  })
  @IsEnum(NoteType)
  type: NoteType;

  @ApiProperty({
    description: 'ID del recurso educativo relacionado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'relatedResourceId must be a valid UUID format' })
  relatedResourceId?: string;

  @ApiProperty({
    description: 'ID de la asignatura relacionada',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'subjectId must be a valid UUID format' })
  subjectId?: string;

  @ApiProperty({
    description: 'Etiquetas del apunte',
    example: ['historia', 'guerra civil', 'audio'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Si el apunte es privado o no',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({
    description: 'Metadatos adicionales del archivo',
    example: { duration: 300, quality: 'high' },
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value; // Si no se puede parsear, devolver el valor original
      }
    }
    return value;
  })
  metadata?: Record<string, any>;
}