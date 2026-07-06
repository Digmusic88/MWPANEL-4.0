import { IsOptional, IsString, IsUUID, IsDateString, IsArray } from 'class-validator';

export class AssignResourceDto {
  @IsOptional()
  @IsUUID()
  classGroupId?: string;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}