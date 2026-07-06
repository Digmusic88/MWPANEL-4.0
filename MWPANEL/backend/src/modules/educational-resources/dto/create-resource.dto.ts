import { IsString, IsEnum, IsOptional, IsBoolean, IsBooleanString, IsUUID, IsArray, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ResourceType } from '../entities/educational-resource.entity';

export class CreateResourceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ResourceType)
  type: ResourceType;

  @IsString()
  gradeLevel: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @Transform(({ value }) => {
    // ✅ FIX: Parse JSON string to array when coming from multipart/form-data
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'subjectId must be a valid UUID format'
  })
  subjectId: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'educationalLevelId must be a valid UUID format'
  })
  educationalLevelId: string;

  @IsOptional()
  @Transform(({ value }) => {
    // ✅ FIX: Accept both string and boolean from FormData, convert to boolean
    if (value === undefined || value === null) {
      return false;
    }
    // Handle string values from FormData
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    // Handle boolean values (already converted)
    if (typeof value === 'boolean') {
      return value;
    }
    // Default conversion
    return Boolean(value);
  })
  isPublic?: boolean;

  @IsOptional()
  @IsUUID()
  folderId?: string; // Carpeta personalizada dentro de la asignatura

  @IsOptional()
  @IsUUID()
  authorId?: string; // Solo para administradores
}