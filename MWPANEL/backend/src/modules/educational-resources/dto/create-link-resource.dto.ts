import { IsString, IsUrl, IsUUID, IsOptional, IsBoolean, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateLinkResourceDto {
  @IsString()
  title: string;

  @Transform(({ value }) => {
    if (typeof value === 'string' && !value.startsWith('http')) {
      return `https://${value}`;
    }
    return value;
  })
  @IsUrl({}, { message: 'externalUrl debe ser una URL válida' })
  externalUrl: string;

  @Matches(UUID_RE, { message: 'subjectId must be a valid UUID' })
  subjectId: string;

  @Matches(UUID_RE, { message: 'educationalLevelId must be a valid UUID' })
  educationalLevelId: string;

  @IsString()
  gradeLevel: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  previewTitle?: string;

  @IsOptional()
  @IsString()
  previewDescription?: string;

  @IsOptional()
  @IsString()
  previewImage?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @Matches(UUID_RE, { message: 'folderId must be a valid UUID' })
  folderId?: string;

  @IsOptional()
  @Matches(UUID_RE, { message: 'authorId must be a valid UUID' })
  authorId?: string;
}
