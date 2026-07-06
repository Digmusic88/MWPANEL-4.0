import { PartialType } from '@nestjs/swagger';
import { CreateCoordinationItemDto } from './create-coordination-item.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCoordinationItemDto extends PartialType(CreateCoordinationItemDto) {
  @ApiProperty({ description: 'Si el item está completado', required: false })
  @IsOptional()
  @IsBoolean()
  is_completed?: boolean;
}