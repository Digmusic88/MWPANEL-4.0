import { IsString, IsEnum, IsOptional, IsNumber, IsUUID, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType, MediaProvider } from '../entities';

export class CreateBlogMediaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  originalName: string;

  @ApiProperty({ enum: MediaType })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiPropertyOptional({ enum: MediaProvider })
  @IsEnum(MediaProvider)
  @IsOptional()
  provider?: MediaProvider = MediaProvider.LOCAL;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  dimensions?: {
    width?: number;
    height?: number;
    duration?: number;
  };

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  alt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sortOrder?: number = 0;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: {
    exif?: any;
    googleDriveId?: string;
    videoId?: string;
    embedCode?: string;
    galleryItems?: string[];
    customProperties?: Record<string, any>;
  };

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  postId?: string;
}