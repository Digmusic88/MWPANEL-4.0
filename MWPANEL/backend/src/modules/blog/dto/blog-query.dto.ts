import { IsOptional, IsString, IsEnum, IsBoolean, IsUUID, IsArray, IsNumberString, IsIn, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BlogPostStatus, BlogPostVisibility } from '../entities';

export class BlogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : 1)
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : 10)
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BlogPostStatus })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @ApiPropertyOptional({ enum: BlogPostVisibility, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(BlogPostVisibility, { each: true })
  @Transform(({ value }) => {
    // Handle array (visibility[], visibility[0], etc.)
    if (Array.isArray(value)) return value;
    
    // Handle comma-separated string (visibility=families_only,public)
    if (typeof value === 'string') {
      if (value.includes(',')) {
        return value.split(',').map(v => v.trim());
      }
      return [value.trim()];
    }
    
    // Handle single value or undefined
    return value ? [value] : undefined;
  })
  visibility?: BlogPostVisibility[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  featured?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  classGroups?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  educationalLevels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    // Map frontend field names to database column names
    const fieldMap: { [key: string]: string } = {
      'publishedAt': 'publishDate',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt',
      'title': 'title',
      'views': 'views',
      'likes': 'likes'
    };
    return fieldMap[value] || 'createdAt';
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }) => {
    // Ensure only valid sort orders are accepted
    return value && value.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAuthor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCategory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeMedia?: boolean;
}