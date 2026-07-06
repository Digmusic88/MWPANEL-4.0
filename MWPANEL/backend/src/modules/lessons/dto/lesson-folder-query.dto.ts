import { IsOptional, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LessonFolderQueryDto {
  @ApiProperty({
    description: 'Filter by workspace ID',
    required: false
  })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiProperty({
    description: 'Filter by active status',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiProperty({
    description: 'Include resources in response',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeResources?: boolean;

  @ApiProperty({
    description: 'Include statistics in response',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean;

  @ApiProperty({
    description: 'Sort by field',
    required: false,
    enum: ['name', 'createdAt', 'orderIndex'],
    default: 'orderIndex'
  })
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'orderIndex'])
  sortBy?: 'name' | 'createdAt' | 'orderIndex';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'ASC'
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}