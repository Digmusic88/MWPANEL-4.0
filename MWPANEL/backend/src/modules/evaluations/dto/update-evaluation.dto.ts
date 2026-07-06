import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EvaluationStatus } from '../entities/evaluation.entity';

export class UpdateCompetencyEvaluationDto {
  @IsString()
  competencyId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEvaluationDto {
  @IsOptional()
  @IsString()
  generalObservations?: string;

  @IsOptional()
  @IsEnum(EvaluationStatus)
  status?: EvaluationStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCompetencyEvaluationDto)
  competencyEvaluations?: UpdateCompetencyEvaluationDto[];
}
