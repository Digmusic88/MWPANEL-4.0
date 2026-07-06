import { IsUUID, IsEnum, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { DayOfWeek } from '../../students/entities/schedule-session.entity';

export class UpdateScheduleSessionDto {
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUUID(4, { message: 'subjectAssignmentId must be a valid UUID v4' })
  subjectAssignmentId?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUUID(4, { message: 'classroomId must be a valid UUID v4' })
  classroomId?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUUID(4, { message: 'timeSlotId must be a valid UUID v4' })
  timeSlotId?: string;

  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsUUID(4, { message: 'academicYearId must be a valid UUID v4' })
  academicYearId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}