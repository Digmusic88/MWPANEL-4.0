import { IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// Helper function to transform string booleans to actual booleans
function transformStringToBoolean({ value }: any) {
  if (value === undefined || value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (typeof value === 'boolean') return value;
  return undefined;
}

export class LessonWorkspaceQueryDto {
  @ApiProperty({
    description: 'Filter by user ID (teacher)',
    required: false
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Filter by active status',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(transformStringToBoolean)
  isActive?: boolean;

  @ApiProperty({
    description: 'Include statistics in response',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(transformStringToBoolean)
  includeStats?: boolean;

  @ApiProperty({
    description: 'Include folders in response',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(transformStringToBoolean)
  includeFolders?: boolean;

  @ApiProperty({
    description: 'Filter by archived status',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(transformStringToBoolean)
  isArchived?: boolean;
}