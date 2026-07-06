import { IsArray, IsUUID, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FolderOrderItem {
  @ApiProperty({
    description: 'Folder ID',
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

export class ReorderFoldersDto {
  @ApiProperty({
    description: 'Array of folders with their new order',
    type: [FolderOrderItem]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FolderOrderItem)
  folders: FolderOrderItem[];

  @ApiProperty({
    description: 'Optional subject ID to reorder folders within',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsUUID()
  subjectId?: string;
}
