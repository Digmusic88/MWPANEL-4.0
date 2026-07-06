import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloneWorkspaceDto {
  @ApiProperty({
    description: 'ID del año académico de destino',
    example: 'uuid'
  })
  @IsUUID()
  newAcademicYearId: string;

  @ApiProperty({
    description: 'Nombre personalizado para el workspace clonado (opcional)',
    required: false,
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customName?: string;

  @ApiProperty({
    description: 'Descripción del proceso de clonación (opcional)',
    required: false,
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}