import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DailyHomeworkStatus } from '../entities/daily-homework-record.entity';

// DTO para upsert de un único registro
export class UpsertDailyHomeworkDto {
  @ApiProperty({ example: 'uuid-student' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 'uuid-class-group' })
  @IsUUID()
  classGroupId: string;

  @ApiPropertyOptional({ example: 'uuid-subject-assignment' })
  @IsOptional()
  @IsUUID()
  subjectAssignmentId?: string;

  @ApiProperty({ example: '2026-02-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: DailyHomeworkStatus })
  @IsEnum(DailyHomeworkStatus)
  status: DailyHomeworkStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para guardar múltiples registros de un mismo día/grupo en un solo request
export class BulkUpsertDailyHomeworkDto {
  @ApiProperty({ example: 'uuid-class-group' })
  @IsUUID()
  classGroupId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subjectAssignmentId?: string;

  @ApiProperty({ example: '2026-02-25' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  records: Array<{
    studentId: string;
    status: DailyHomeworkStatus;
    notes?: string;
  }>;
}

// DTO para query del grid (profesor)
export class GridQueryDto {
  @ApiProperty({ example: 'uuid-class-group' })
  @IsUUID()
  classGroupId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subjectAssignmentId?: string;

  @ApiProperty({ example: '2026-02-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-02-28' })
  @IsDateString()
  endDate: string;
}

// DTO para query familiar
export class FamilyHistoryQueryDto {
  @ApiProperty({ example: 'uuid-student' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-28' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Respuesta del grid
export interface GridCellDto {
  studentId: string;
  status: DailyHomeworkStatus | null; // null = sin registro para ese día
  recordId: string | null;
  notes: string | null;
}

export interface GridRowDto {
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  cells: { [dateStr: string]: GridCellDto };
}

export interface GridResponseDto {
  dates: string[]; // ['2026-02-01', '2026-02-02', ...]
  rows: GridRowDto[];
  classGroupId: string;
  subjectAssignmentId: string | null;
}

// Respuesta histórica para familias
export interface FamilyRecordDto {
  id: string;
  date: string;
  status: DailyHomeworkStatus;
  notes: string | null;
  subjectName: string | null;
  classGroupName: string;
  teacherName: string;
}

export interface FamilyHistoryResponseDto {
  studentId: string;
  studentName: string;
  records: FamilyRecordDto[];
  summary: {
    totalDays: number;
    completed: number;
    partial: number;
    notDone: number;
  };
}
