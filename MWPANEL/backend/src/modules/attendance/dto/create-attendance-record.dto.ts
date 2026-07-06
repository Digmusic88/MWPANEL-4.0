import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../entities/attendance-record.entity';

export class CreateAttendanceRecordDto {
  @ApiProperty({ description: 'ID del estudiante' })
  @IsNotEmpty()
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Fecha del registro (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AttendanceStatus, description: 'Estado de asistencia' })
  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Justificación (si aplica)' })
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional({ description: 'Hora de llegada (HH:MM) para retrasos' })
  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @ApiPropertyOptional({ description: 'Hora de salida (HH:MM) para salidas anticipadas' })
  @IsOptional()
  @IsString()
  departureTime?: string;
}