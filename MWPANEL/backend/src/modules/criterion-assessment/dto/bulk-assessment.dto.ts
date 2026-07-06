import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssessmentItemDto {
  @IsString() studentId: string;
  @IsString() evaluationCriterionId: string;
  @IsOptional()
  @IsIn(['EMERGING', 'DEVELOPING', 'ACHIEVING', 'EXCEEDING', 'NOT_ACHIEVED', 'IN_PROGRESS', 'ACHIEVED'])
  levelValue?: string;
  @IsOptional() @IsNumber() numericValue?: number;
  @IsOptional() @IsString() observations?: string;
}

export class BulkAssessmentDto {
  @IsString() subjectAssignmentId: string;
  @IsOptional() @IsString() evaluationPeriodId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => AssessmentItemDto) items: AssessmentItemDto[];
}
