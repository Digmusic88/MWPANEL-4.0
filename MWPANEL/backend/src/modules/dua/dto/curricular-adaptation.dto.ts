import { IsEnum, IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';
import { CurricularAdaptationType } from '../entities/curricular-adaptation.entity';

export class UpsertCurricularAdaptationDto {
  @IsUUID() studentId: string;
  @IsUUID() subjectId: string;
  @IsUUID() academicYearId: string;
  @IsEnum(CurricularAdaptationType) type: CurricularAdaptationType;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateCurricularAdaptationDto {
  @IsOptional() @IsEnum(CurricularAdaptationType) type?: CurricularAdaptationType;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
