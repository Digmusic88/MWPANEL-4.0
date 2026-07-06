import { IsNotEmpty, IsUUID, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkMarkPresentDto {
  @ApiProperty({ description: 'ID del grupo de clase' })
  @IsNotEmpty()
  @IsUUID()
  classGroupId: string;

  @ApiProperty({ description: 'Fecha del registro (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ 
    description: 'IDs de estudiantes a excluir (opcional)', 
    type: [String],
    required: false 
  })
  @IsArray()
  @IsUUID('4', { each: true })
  excludeStudentIds?: string[];
}