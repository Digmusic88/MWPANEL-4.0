import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { CriterionKnowledgeStatus } from '../entities/criterion-basic-knowledge.entity';

export class MapQueryDto {
  @IsString() subjectName: string;
  @IsIn(['cycle', 'course']) scopeType: 'cycle' | 'course';
  @IsUUID() scopeId: string;
}

export class SuggestDto {
  @IsString() subjectName: string;
  @IsIn(['cycle', 'course']) scopeType: 'cycle' | 'course';
  @IsUUID() scopeId: string;
}

export class UpdateLinkDto {
  @IsEnum(CriterionKnowledgeStatus) status: CriterionKnowledgeStatus;
}

export class CreateLinkDto {
  @IsUUID() evaluationCriterionId: string;
  @IsUUID() basicKnowledgeId: string;
}
