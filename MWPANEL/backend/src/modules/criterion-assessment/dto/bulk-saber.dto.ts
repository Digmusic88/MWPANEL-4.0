import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaberItemDto {
  @IsString() studentId: string;
  @IsString() basicKnowledgeId: string;
  @IsIn(['NOT_ACHIEVED', 'IN_PROGRESS', 'ACHIEVED']) levelValue: string;
}

export class BulkSaberDto {
  @IsString() subjectAssignmentId: string;
  @IsString() evaluationPeriodId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SaberItemDto) items: SaberItemDto[];
}
