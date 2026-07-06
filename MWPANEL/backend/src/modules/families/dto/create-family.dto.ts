import { IsString, IsArray, IsOptional, IsDateString, IsNotEmpty, ValidateNested, IsEnum, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FamilyRelationship } from '../../users/entities/family.entity';

export class FamilyContactDto {
  @ApiProperty({ example: 'padre@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', required: false, description: 'Si no se proporciona, se generará automáticamente una contraseña segura' })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

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
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Calle Mayor, 123, Madrid' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Ingeniero' })
  @IsString()
  @IsOptional()
  occupation?: string;
}

export class FamilyStudentRelationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: FamilyRelationship, example: FamilyRelationship.PARENT })
  @IsEnum(FamilyRelationship)
  relationship: FamilyRelationship;
}

export class CreateFamilyDto {
  @ApiProperty({ type: FamilyContactDto })
  @ValidateNested()
  @Type(() => FamilyContactDto)
  primaryContact: FamilyContactDto;

  @ApiProperty({ type: FamilyContactDto, required: false })
  @ValidateNested()
  @Type(() => FamilyContactDto)
  @IsOptional()
  secondaryContact?: FamilyContactDto;

  @ApiProperty({ type: [FamilyStudentRelationDto], required: false, default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FamilyStudentRelationDto)
  @IsOptional()
  students?: FamilyStudentRelationDto[];

  @ApiProperty({ example: 'Familia muy colaboradora' })
  @IsString()
  @IsOptional()
  notes?: string;
}