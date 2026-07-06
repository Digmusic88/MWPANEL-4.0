import { IsOptional, IsString } from 'class-validator';

export class SuggestWorkTaggingDto {
  @IsString() subjectAssignmentId: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() rubricText?: string;
}
