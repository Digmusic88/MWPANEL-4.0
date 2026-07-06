import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { StaffTaskStatus, StaffTaskPriority } from '../entities/staff-task.entity';

export class UpdateStaffTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(StaffTaskStatus)
  status?: StaffTaskStatus;

  @IsOptional()
  @IsEnum(StaffTaskPriority)
  priority?: StaffTaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  meetingId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignedToIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class UpdateStaffTaskStatusDto {
  @IsEnum(StaffTaskStatus)
  status: StaffTaskStatus;
}
