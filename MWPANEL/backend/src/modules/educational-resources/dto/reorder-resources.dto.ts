import { IsArray, IsUUID, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResourceOrderItem {
  @ApiProperty({
    description: 'Resource ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Display order position',
    example: 0
  })
  @IsNumber()
  displayOrder: number;
}

export class ReorderResourcesDto {
  @ApiProperty({
    description: 'Array of resources with their new order',
    type: [ResourceOrderItem]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceOrderItem)
  resources: ResourceOrderItem[];

  @ApiProperty({
    description: 'Optional folder ID to reorder resources within',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsUUID()
  folderId?: string;

  @ApiProperty({
    description: 'Optional subject ID to reorder resources within',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsUUID()
  subjectId?: string;
}
