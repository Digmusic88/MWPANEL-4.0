import { IsString, IsArray, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty({ 
    example: 'EMP-2025-0001',
    description: 'Número de empleado. Si no se proporciona, se genera automáticamente con formato EMP-YYYY-NNNN',
    required: false 
  })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiProperty({ example: ['Matemáticas', 'Física'] })
  @IsArray()
  @IsOptional()
  specialties?: string[];

  // User information
  @ApiProperty({ example: 'teacher@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Teacher123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: true })
  @IsOptional()
  isActive?: boolean;

  // Profile information
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Pérez García' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '1980-05-15' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: '12345678A' })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({ example: '+34 600 123 456' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Calle Mayor, 123, Madrid' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Licenciado en Matemáticas' })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiProperty({ example: '2010-09-01' })
  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @ApiProperty({ example: 'Departamento de Ciencias' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: 'Profesor Titular' })
  @IsString()
  @IsOptional()
  position?: string;
}