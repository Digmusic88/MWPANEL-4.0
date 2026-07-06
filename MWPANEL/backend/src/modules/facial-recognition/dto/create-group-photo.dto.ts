import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupPhotoDto {
  @ApiProperty({ description: 'ID del usuario que sube la foto' })
  @IsUUID()
  uploadedById: string;

  @ApiProperty({ description: 'ID del grupo de clase (opcional)', required: false })
  @IsOptional()
  @IsUUID()
  classGroupId?: string;

  @ApiProperty({ description: 'Metadata adicional de la imagen', required: false })
  @IsOptional()
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: number;
    mimeType?: string;
    [key: string]: any;
  };
}