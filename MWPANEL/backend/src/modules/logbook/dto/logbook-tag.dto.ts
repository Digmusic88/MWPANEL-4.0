import { IsString, IsNotEmpty, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateLogbookTagDto {
  @ApiProperty({
    description: 'Nombre de la etiqueta',
    example: 'Matemáticas',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50, { message: 'El nombre debe tener entre 1 y 50 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Color hexadecimal de la etiqueta',
    example: '#FF5722',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hexadecimal válido (ej: #FF5722)',
  })
  colorHex: string;
}

export class UpdateLogbookTagDto extends PartialType(CreateLogbookTagDto) {
  @ApiProperty({
    description: 'Nombre de la etiqueta',
    example: 'Matemáticas Avanzadas',
    minLength: 1,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'El nombre debe tener entre 1 y 50 caracteres' })
  name?: string;

  @ApiProperty({
    description: 'Color hexadecimal de la etiqueta',
    example: '#4CAF50',
    pattern: '^#[0-9A-Fa-f]{6}$',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hexadecimal válido (ej: #FF5722)',
  })
  colorHex?: string;
}

export class LogbookTagResponseDto {
  @ApiProperty({ description: 'ID único de la etiqueta' })
  id: string;

  @ApiProperty({ description: 'ID del usuario propietario' })
  ownerUserId: string;

  @ApiProperty({ description: 'Nombre de la etiqueta' })
  name: string;

  @ApiProperty({ description: 'Color hexadecimal de la etiqueta' })
  colorHex: string;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;
}

export class TagUsageStatsDto {
  @ApiProperty({ description: 'ID de la etiqueta' })
  tagId: string;

  @ApiProperty({ description: 'Nombre de la etiqueta' })
  tagName: string;

  @ApiProperty({ description: 'Número de entradas que usan esta etiqueta' })
  entryCount: number;
}

export class PopularColorDto {
  @ApiProperty({ description: 'Color hexadecimal' })
  colorHex: string;

  @ApiProperty({ description: 'Número de etiquetas que usan este color' })
  usage: number;
}