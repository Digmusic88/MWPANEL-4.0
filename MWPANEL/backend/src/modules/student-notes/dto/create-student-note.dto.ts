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
import { ApiProperty } from '@nestjs/swagger';

export enum NoteType {
  TEXT = 'text',
  VOICE = 'voice',
  DRAWING = 'drawing',
  PRESENTATION = 'presentation',
  MIXED = 'mixed',
  MINDMAP = 'mindmap',
}

export class CreateStudentNoteDto {
  @ApiProperty({
    description: 'Título del apunte',
    example: 'Apuntes de Matemáticas - Tema 5',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Contenido del apunte',
    example: 'Las ecuaciones de segundo grado se resuelven...',
  })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({
    description: 'Tipo de apunte',
    enum: NoteType,
    example: NoteType.TEXT,
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
    example: ['matemáticas', 'ecuaciones', 'segundo grado'],
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
    description: 'Metadatos adicionales del apunte',
    example: { duration: 120, originalFileName: 'audio.mp3' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}