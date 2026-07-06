import { PartialType } from '@nestjs/swagger';
import { CreateDuaAccommodationDto } from './create-dua-accommodation.dto';
import { IsEnum, IsOptional, IsObject, IsBoolean, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccommodationStatus } from '../entities/dua-accommodation.entity';

export class UpdateDuaAccommodationDto extends PartialType(CreateDuaAccommodationDto) {
  @ApiPropertyOptional({
    description: 'Estado de la acomodación',
    enum: AccommodationStatus,
  })
  @IsOptional()
  @IsEnum(AccommodationStatus)
  status?: AccommodationStatus;

  @ApiPropertyOptional({
    description: 'Datos de efectividad',
  })
  @IsOptional()
  @IsObject()
  effectivenessData?: {
    isEffective?: boolean;
    lastReviewDate?: Date;
    reviewNotes?: string;
    metrics?: {
      academicImprovement?: number;
      studentSatisfaction?: number;
      teacherFeedback?: string;
      parentFeedback?: string;
    };
  };

  @ApiPropertyOptional({ description: 'ID del usuario que aprobó' })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Fecha de aprobación' })
  @IsOptional()
  @IsDateString()
  approvedAt?: string;
}