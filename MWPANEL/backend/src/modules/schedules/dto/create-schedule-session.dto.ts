import { IsUUID, IsEnum, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { DayOfWeek } from '../../students/entities/schedule-session.entity';

export class CreateScheduleSessionDto {
  @IsUUID()
  subjectAssignmentId: string;

  @IsUUID()
  classroomId: string;

  @IsUUID()
  timeSlotId: string;

  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsUUID()
  academicYearId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}