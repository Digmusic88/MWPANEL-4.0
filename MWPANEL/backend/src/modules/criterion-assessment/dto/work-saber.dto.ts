import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkSaberMarkDto {
  @IsString() basicKnowledgeId: string;
  @IsIn(['NOT_ACHIEVED', 'IN_PROGRESS', 'ACHIEVED']) levelValue: string;
}
export class BulkWorkSaberDto {
  @IsString() workId: string;
  @IsIn(['activity', 'task', 'test']) workType: string;
  @IsString() studentId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => WorkSaberMarkDto) marks: WorkSaberMarkDto[];
}
