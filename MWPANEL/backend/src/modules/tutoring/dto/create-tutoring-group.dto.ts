import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTutoringGroupDto {
  @ApiProperty({ description: 'Nombre del grupo de tutoría' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del grupo de tutoría' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID del profesor tutor' })
  @IsUUID()
  tutorId: string;

  @ApiProperty({ description: 'ID del año académico' })
  @IsUUID()
  academicYearId: string;

  @ApiPropertyOptional({ description: 'ID del nivel educativo' })
  @IsOptional()
  @IsUUID()
  educationalLevelId?: string;

  @ApiPropertyOptional({ description: 'Estado activo del grupo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}