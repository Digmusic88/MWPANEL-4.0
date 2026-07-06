/**
 * @dto: CreateAccommodationDto
 * @module: DUA
 * @description: DTO para crear acomodaciones DUA
 * @validation: class-validator decorators
 */

import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  IsDateString,
  IsObject,
  ValidateNested,
  MaxLength,
  MinLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccommodationType, AccommodationStatus, AccommodationDetails } from '../entities/dua-accommodation.entity';

class PresentationDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  largeFont?: boolean;

  @ApiPropertyOptional({ minimum: 12, maximum: 32 })
  @IsOptional()
  @IsNumber()
  @Min(12)
  @Max(32)
  fontSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  highContrast?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorOverlay?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  audioSupport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visualSupports?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  simplifiedText?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pictograms?: boolean;
}

class ResponseDetailsDto {
  @ApiPropertyOptional({ enum: ['oral', 'written', 'digital', 'manipulative'] })
  @IsOptional()
  @IsEnum(['oral', 'written', 'digital', 'manipulative'])
  alternativeFormat?: 'oral' | 'written' | 'digital' | 'manipulative';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  extraTime?: boolean;

  @ApiPropertyOptional({ minimum: 1.25, maximum: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1.25)
  @Max(3)
  timeFactor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reducedOptions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  calculator?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  spellChecker?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  voiceRecording?: boolean;
}

class SettingDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preferentialSeating?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reducedDistractors?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  separateRoom?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smallGroup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  oneOnOne?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  quietEnvironment?: boolean;
}

class TimingDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  extendedTime?: boolean;

  @ApiPropertyOptional({ minimum: 1.25, maximum: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1.25)
  @Max(3)
  timeMultiplier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  frequentBreaks?: boolean;

  @ApiPropertyOptional({ minimum: 5, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(30)
  breakDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flexibleSchedule?: boolean;
}

class AccommodationDetailsDto {
  @ApiPropertyOptional({ type: PresentationDetailsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PresentationDetailsDto)
  presentation?: PresentationDetailsDto;

  @ApiPropertyOptional({ type: ResponseDetailsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ResponseDetailsDto)
  response?: ResponseDetailsDto;

  @ApiPropertyOptional({ type: SettingDetailsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SettingDetailsDto)
  setting?: SettingDetailsDto;

  @ApiPropertyOptional({ type: TimingDetailsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TimingDetailsDto)
  timing?: TimingDetailsDto;
}

export class CreateAccommodationDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty({ enum: AccommodationType })
  @IsEnum(AccommodationType)
  type: AccommodationType;

  @ApiProperty({ type: AccommodationDetailsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => AccommodationDetailsDto)
  details: AccommodationDetailsDto;

  @ApiProperty()
  @IsUUID()
  duaProfileId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableSubjects?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableActivities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(50)
  justification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedOutcomes?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresFamilyConsent?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: AccommodationStatus, default: AccommodationStatus.PENDING })
  @IsOptional()
  @IsEnum(AccommodationStatus)
  status?: AccommodationStatus;
}

export class UpdateAccommodationDto extends CreateAccommodationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  familyConsentReceived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  familyConsentDate?: string;
}

export class ApproveAccommodationDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  comments: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}

export class RejectAccommodationDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestions?: string[];
}