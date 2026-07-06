import {
  IsUUID,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationalNeedType, SupportLevel } from '../entities/dua-profile.entity';

class RepresentationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visualPreferred?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auditoryPreferred?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  kinestheticPreferred?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsSimplifiedText?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsVisualSupports?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsAudioSupport?: boolean;

  @ApiPropertyOptional({ minimum: 10, maximum: 48 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(48)
  preferredFontSize?: number;

  @ApiPropertyOptional({ enum: ['normal', 'high', 'inverted'] })
  @IsOptional()
  @IsString()
  preferredColorContrast?: 'normal' | 'high' | 'inverted';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsStructuredLayout?: boolean;
}

class ExpressionPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsExtendedTime?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  timeExtensionFactor?: number;

  @ApiPropertyOptional({ enum: ['written', 'oral', 'visual', 'manipulative'] })
  @IsOptional()
  @IsString()
  preferredResponseFormat?: 'written' | 'oral' | 'visual' | 'manipulative';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsAlternativeKeyboard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsSpeechToText?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsCalculator?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsSpellChecker?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  allowedBreaks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(30)
  breakDuration?: number;
}

class EngagementPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsFrequentFeedback?: boolean;

  @ApiPropertyOptional({ enum: ['points', 'badges', 'verbal', 'none'] })
  @IsOptional()
  @IsString()
  preferredRewardSystem?: 'points' | 'badges' | 'verbal' | 'none';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsClearExpectations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsRoutineStructure?: boolean;

  @ApiPropertyOptional({ enum: ['individual', 'pairs', 'small', 'large'] })
  @IsOptional()
  @IsString()
  preferredGroupSize?: 'individual' | 'pairs' | 'small' | 'large';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsMovementBreaks?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anxietyManagement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsQuietSpace?: boolean;
}

class StrengthsAndInterestsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  interests: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  learningStyles: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  motivators: string[];
}

export class CreateDuaProfileDto {
  @ApiProperty({ description: 'ID del estudiante' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({
    description: 'Necesidades educativas identificadas',
    enum: EducationalNeedType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EducationalNeedType, { each: true })
  educationalNeeds?: EducationalNeedType[];

  @ApiPropertyOptional({
    description: 'Nivel de apoyo requerido',
    enum: SupportLevel,
  })
  @IsOptional()
  @IsEnum(SupportLevel)
  supportLevel?: SupportLevel;

  @ApiPropertyOptional({
    description: 'Preferencias de representación (Principio 1 DUA)',
    type: RepresentationPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RepresentationPreferencesDto)
  representationPreferences?: RepresentationPreferencesDto;

  @ApiPropertyOptional({
    description: 'Preferencias de expresión (Principio 2 DUA)',
    type: ExpressionPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ExpressionPreferencesDto)
  expressionPreferences?: ExpressionPreferencesDto;

  @ApiPropertyOptional({
    description: 'Preferencias de implicación (Principio 3 DUA)',
    type: EngagementPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EngagementPreferencesDto)
  engagementPreferences?: EngagementPreferencesDto;

  @ApiProperty({
    description: 'Fortalezas e intereses del estudiante',
    type: StrengthsAndInterestsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => StrengthsAndInterestsDto)
  strengthsAndInterests: StrengthsAndInterestsDto;

  @ApiPropertyOptional({
    description: 'Información clínica relevante',
  })
  @IsOptional()
  @IsObject()
  clinicalInfo?: {
    diagnosis?: string[];
    medications?: string[];
    therapies?: string[];
    specialists?: {
      name: string;
      specialty: string;
      contact: string;
    }[];
    lastEvaluation?: Date;
    nextReview?: Date;
  };

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({
    description: 'Fecha de próxima revisión',
  })
  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;
}