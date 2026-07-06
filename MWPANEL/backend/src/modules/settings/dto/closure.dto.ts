import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class EnableClosureDto {
  @ApiProperty({ description: 'Secciones permitidas por rol', example: { teacher: ['blog'], student: ['blog'], family: ['blog'] } })
  @IsObject()
  allowedSectionsByRole: Record<string, string[]>;

  @ApiPropertyOptional({ description: 'Mensaje mostrado a usuarios afectados' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateClosureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  allowedSectionsByRole?: Record<string, string[]>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
