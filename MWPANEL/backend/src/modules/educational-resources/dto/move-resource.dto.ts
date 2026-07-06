import { IsUUID, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveResourceDto {
  @ApiProperty({
    description: 'Resource ID to move',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  resourceId: string;

  @ApiProperty({
    description: 'Target folder ID (null for root/no folder)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true
  })
  @IsOptional()
  @IsUUID()
  targetFolderId?: string | null;

  @ApiProperty({
    description: 'New display order position in target location',
    example: 0,
    required: false
  })
  @IsOptional()
  @IsNumber()
  newDisplayOrder?: number;
}
