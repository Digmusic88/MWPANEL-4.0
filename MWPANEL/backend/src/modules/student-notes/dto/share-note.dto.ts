import { IsUUID, IsOptional, IsString, IsArray, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { SharedNoteType } from '../entities/shared-note.entity';

/**
 * DTO para compartir un apunte
 */
export class ShareNoteDto {
  @IsArray()
  @IsUUID('4', { each: true })
  recipientIds: string[]; // IDs de los destinatarios

  @IsEnum(SharedNoteType)
  sharedWithType: SharedNoteType; // Tipo de destinatario

  @IsOptional()
  @IsString()
  message?: string; // Mensaje opcional

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // Fecha de expiración opcional

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean; // Permitir comentarios

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean; // Permitir descarga
}

/**
 * DTO para obtener apuntes compartidos
 */
export class SharedNotesQueryDto {
  @IsOptional()
  @IsEnum(SharedNoteType)
  sharedWithType?: SharedNoteType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'sharedAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO para actualizar permisos de apunte compartido
 */
export class UpdateSharedNoteDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;
}

/**
 * Response DTO para compañeros de clase
 */
export class ClassmateDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  classGroups: {
    id: string;
    name: string;
    section?: string;
  }[];
}

/**
 * Response DTO para profesores del estudiante
 */
export class StudentTeacherDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  subjects: {
    id: string;
    name: string;
    classGroup: {
      id: string;
      name: string;
      section?: string;
    };
  }[];
}

/**
 * Response DTO para apunte compartido
 */
export class SharedNoteResponseDto {
  id: string;
  noteId: string;
  note: {
    id: string;
    title: string;
    type: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: number;
    metadata?: any;
    tags?: string;
    createdAt: Date;
    subject?: {
      id: string;
      name: string;
    };
  };
  sharedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sharedWith: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sharedWithType: SharedNoteType;
  status: string;
  message?: string;
  permissions: any;
  expiresAt?: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  sharedAt: Date;
  isExpired: boolean;
  isViewable: boolean;
}