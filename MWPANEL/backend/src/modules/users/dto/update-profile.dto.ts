import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Carlos',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  firstName?: string;

  @ApiProperty({
    description: 'Apellidos del usuario',
    example: 'Pérez García',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Los apellidos deben ser una cadena de texto' })
  lastName?: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'usuario@mwpanel.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  email?: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+34 600 123 456',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  phone?: string;

  @ApiProperty({
    description: 'Dirección del usuario',
    example: 'Calle Mayor 123, 28001 Madrid',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  address?: string;

  @ApiProperty({
    description: 'Documento de identidad del usuario',
    example: '12345678A',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El documento de identidad debe ser una cadena de texto' })
  documentNumber?: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del usuario',
    example: '1990-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento debe tener un formato válido' })
  dateOfBirth?: string;

  @ApiProperty({
    description: 'URL del avatar del usuario',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La URL del avatar debe ser una cadena de texto' })
  avatarUrl?: string;
}