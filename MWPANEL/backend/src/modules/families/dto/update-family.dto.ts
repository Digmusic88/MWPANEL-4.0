import { IsString, IsArray, IsOptional, IsDateString, ValidateNested, IsEnum, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FamilyRelationship } from '../../users/entities/family.entity';

export class UpdateFamilyContactDto {
  @ApiProperty({ example: 'padre@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Password123!', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Nueva contraseña para el contacto familiar (solo si se quiere cambiar)',
    example: 'NewPassword123',
    required: false,
    minLength: 8,
  })
  @IsOptional()
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword?: string;

  @ApiProperty({ example: 'Juan', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Pérez García', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '1980-05-15', required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: '12345678A', required: false })
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({ example: '+34 600 123 456', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Calle Mayor, 123, Madrid', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Ingeniero', required: false })
  @IsString()
  @IsOptional()
  occupation?: string;
}

export class UpdateFamilyStudentRelationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  studentId: string;

  @ApiProperty({ enum: FamilyRelationship, example: FamilyRelationship.PARENT })
  @IsEnum(FamilyRelationship)
  relationship: FamilyRelationship;
}

export class UpdateFamilyDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ type: UpdateFamilyContactDto, required: false })
  @ValidateNested()
  @Type(() => UpdateFamilyContactDto)
  @IsOptional()
  primaryContact?: UpdateFamilyContactDto;

  @ApiProperty({ type: UpdateFamilyContactDto, required: false })
  @ValidateNested()
  @Type(() => UpdateFamilyContactDto)
  @IsOptional()
  secondaryContact?: UpdateFamilyContactDto;

  @ApiProperty({ type: [UpdateFamilyStudentRelationDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFamilyStudentRelationDto)
  @IsOptional()
  students?: UpdateFamilyStudentRelationDto[];

  @ApiProperty({ example: 'Familia muy colaboradora', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}