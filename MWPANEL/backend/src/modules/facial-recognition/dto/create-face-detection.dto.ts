import { IsUUID, IsObject, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FaceCoordinates } from '../entities/face-detection.entity';

export class CreateFaceDetectionDto {
  @ApiProperty({ description: 'ID de la foto grupal' })
  @IsUUID()
  groupPhotoId: string;

  @ApiProperty({ description: 'Coordenadas del rostro en la imagen' })
  @IsObject()
  faceCoordinates: FaceCoordinates;

  @ApiProperty({ description: 'URL del thumbnail del rostro', required: false })
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Puntuación de confianza de la detección (0.0-1.0)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiProperty({ description: 'Embedding facial para matching', required: false })
  @IsOptional()
  @IsObject()
  facialEmbedding?: any;
}