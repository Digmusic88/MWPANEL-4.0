import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateStudentProfileDto {
  @ApiProperty({
    description: 'Nueva contraseña del estudiante',
    example: 'nuevaPassword123',
    required: false,
    minLength: 6,
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @ApiProperty({
    description: 'URL del avatar del usuario',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La URL del avatar debe ser una cadena de texto' })
  avatarUrl?: string;
}