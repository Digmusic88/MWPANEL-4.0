import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CompetencyEvaluationDto {
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

export class CreateEvaluationDto {
  @IsString()
  studentId: string;

  @IsString()
  teacherId: string;

  @IsString()
  subjectId: string;

  @IsString()
  periodId: string;

  @IsOptional()
  @IsString()
  generalObservations?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetencyEvaluationDto)
  competencyEvaluations: CompetencyEvaluationDto[];
}