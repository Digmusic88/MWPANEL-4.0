import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FaceDetectionInput {
  @ApiProperty({ description: 'Coordenada X del rostro' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Coordenada Y del rostro' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Ancho del rostro' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Alto del rostro' })
  @IsNumber()
  height: number;

  @ApiProperty({ description: 'Confianza de la detección (0.0-1.0)', required: false })
  @IsOptional()
  @IsNumber()
  confidence?: number;
}

export class ProcessFacesDto {
  @ApiProperty({ description: 'Array de detecciones faciales desde el cliente', type: [FaceDetectionInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaceDetectionInput)
  faces: FaceDetectionInput[];
}