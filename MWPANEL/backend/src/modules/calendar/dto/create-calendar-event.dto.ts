import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  Length,
  IsHexColor,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  CalendarEventType,
  CalendarEventVisibility,
  CalendarEventRecurrence,
} from '../entities/calendar-event.entity';

export class CreateCalendarEventDto {
  @IsString()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(CalendarEventType)
  type: CalendarEventType;

  @IsEnum(CalendarEventVisibility)
  visibility: CalendarEventVisibility;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRecurrent?: boolean;

  @IsOptional()
  @IsEnum(CalendarEventRecurrence)
  recurrenceType?: CalendarEventRecurrence;

  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  links?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  notifyBefore?: number;

  @IsOptional()
  @IsBoolean()
  autoNotify?: boolean;

  @IsOptional()
  @IsUUID()
  relatedTaskId?: string;

  @IsOptional()
  @IsUUID()
  relatedEvaluationId?: string;

  // Asignaciones específicas
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  classGroupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  subjectIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  studentIds?: string[];
}