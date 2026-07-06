import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsDateString, IsUUID, ValidateNested, MaxLength, MinLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlogPostStatus, BlogPostVisibility } from '../entities';

class VisibilitySettingsDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  classGroups?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  educationalLevels?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  subjects?: string[];
}

class SeoDataDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  keywords?: string[];
}

export class CreateBlogPostDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  slug?: string;

  @ApiPropertyOptional({ enum: BlogPostStatus })
  @IsEnum(BlogPostStatus)
  @IsOptional()
  status?: BlogPostStatus;

  @ApiPropertyOptional({ enum: BlogPostVisibility })
  @IsEnum(BlogPostVisibility)
  @IsOptional()
  visibility?: BlogPostVisibility;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @ApiPropertyOptional({ type: VisibilitySettingsDto })
  @ValidateNested()
  @Type(() => VisibilitySettingsDto)
  @IsOptional()
  visibilitySettings?: VisibilitySettingsDto;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  featuredImage?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  commentsEnabled?: boolean;

  @ApiPropertyOptional({ type: SeoDataDto })
  @ValidateNested()
  @Type(() => SeoDataDto)
  @IsOptional()
  seoData?: SeoDataDto;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  mediaIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Class group IDs for class-specific visibility' })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  classGroupIds?: string[];
}