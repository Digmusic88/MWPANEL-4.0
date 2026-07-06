import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
export class GenerateReportDto {
  @IsString() studentId: string;
  @IsString() academicYearId: string;
  @IsOptional() @IsArray() @IsString({ each: true }) subjectIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) sections?: string[];
  @IsOptional() @IsBoolean() detailed?: boolean;
}
