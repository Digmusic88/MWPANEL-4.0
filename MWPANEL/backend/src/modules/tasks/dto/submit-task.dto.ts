import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitTaskDto {
  @ApiPropertyOptional({
    description: 'Contenido de la entrega (respuesta en texto)',
    example: 'Mi respuesta a la tarea es...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Notas del estudiante al entregar',
    example: 'He incluido las fuentes solicitadas en el archivo adjunto.',
  })
  @IsOptional()
  @IsString()
  submissionNotes?: string;
}

export class ResubmitTaskDto extends SubmitTaskDto {
  @ApiPropertyOptional({
    description: 'Comentarios sobre la revisión realizada',
    example: 'He corregido los errores señalados por el profesor.',
  })
  @IsOptional()
  @IsString()
  revisionComments?: string;
}