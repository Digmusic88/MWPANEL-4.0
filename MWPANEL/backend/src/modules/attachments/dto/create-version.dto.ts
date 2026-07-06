import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersionDto {
  @ApiPropertyOptional({
    description: 'Descripción de los cambios en esta versión',
    example: 'Corrección de errores en la página 3',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeDescription?: string;
}