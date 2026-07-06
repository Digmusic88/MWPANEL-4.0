import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsArray,
  IsString,
  IsBoolean,
} from 'class-validator';
import {
  CalendarEventType,
  CalendarEventVisibility,
} from '../entities/calendar-event.entity';

export class CalendarEventQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CalendarEventType)
  type?: CalendarEventType;

  @IsOptional()
  @IsEnum(CalendarEventVisibility)
  visibility?: CalendarEventVisibility;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  classGroupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  subjectIds?: string[];

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  includeRecurrent?: boolean;

  @IsOptional()
  @IsBoolean()
  onlyActive?: boolean;
}