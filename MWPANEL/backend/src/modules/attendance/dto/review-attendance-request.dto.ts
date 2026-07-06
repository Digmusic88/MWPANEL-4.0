import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceRequestStatus } from '../entities/attendance-request.entity';

export class ReviewAttendanceRequestDto {
  @ApiProperty({ 
    enum: [AttendanceRequestStatus.APPROVED, AttendanceRequestStatus.REJECTED],
    description: 'Estado de la revisión (solo approved o rejected)' 
  })
  @IsNotEmpty()
  @IsEnum([AttendanceRequestStatus.APPROVED, AttendanceRequestStatus.REJECTED])
  status: AttendanceRequestStatus.APPROVED | AttendanceRequestStatus.REJECTED;

  @ApiPropertyOptional({ description: 'Nota del profesor al revisar' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}