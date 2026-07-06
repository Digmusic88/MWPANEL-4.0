import { IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonWorkspaceDto {
  @ApiProperty({
    description: 'ID de la asignación de asignatura (subject_assignment)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  subjectAssignmentId: string;

  @ApiPropertyOptional({
    description: 'ID de la carpeta raíz en Google Drive (se genera automáticamente si no se proporciona)',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  })
  @IsOptional()
  driveFolderId?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del workspace',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}