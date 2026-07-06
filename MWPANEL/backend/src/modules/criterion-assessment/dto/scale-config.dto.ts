import { IsEnum, IsInt, IsObject, IsOptional } from 'class-validator';
import { CriterionScaleType } from '../entities/criterion-assessment.entity';

export class ScaleConfigDto {
  @IsOptional() @IsEnum(CriterionScaleType) scaleType?: CriterionScaleType;
  @IsOptional() @IsInt() numericMax?: number;
  @IsOptional() @IsObject() levelMapping?: Record<string, number>;
}
